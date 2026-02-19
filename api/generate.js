export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { prompt } = req.body;
  if (typeof prompt !== 'string' || !prompt.trim()) {
    return res.status(400).json({ error: 'Invalid or missing prompt' });
  }

  const { GROQ_API_KEY, ELEVENLABS_API_KEY, ELEVENLABS_VOICE_ID } = process.env;
  if (!GROQ_API_KEY || !ELEVENLABS_API_KEY || !ELEVENLABS_VOICE_ID) {
    return res.status(500).json({ error: 'Missing required environment variables' });
  }

  try {
    const systemPrompt = `You are Donald Trump. Speak in his exact style: hyperbolic, confident, repetitive, and simple vocabulary.
IMPORTANT: Target length is roughly 3 PARAGRAPHS. Not too short, not too long.
Focus 100% on the USER'S selected topic. Do not ignore it.

AUDIO STAGING:
You are now generating text for a strictly "Speech-to-Speech" engine.
Include tags for sound effects and emotional cues where appropriate, such as:
[laughter]
[applause]
[audience cheering]
[clears throat]
[sighs]
[long pause]

Use these tags naturally within the flow of the speech to enhance the "Rally" atmosphere.`.trim();

    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${GROQ_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: prompt }],
        temperature: 0.8,
        max_tokens: 900,
      }),
    });

    if (!groqRes.ok) {
      const errText = await groqRes.text();
      throw new Error(`Groq API failed: ${groqRes.status} - ${errText}`);
    }

    const groqJson = await groqRes.json();
    let text = groqJson.choices?.[0]?.message?.content?.trim();
    if (!text) {
      throw new Error('Empty response from Groq API');
    }

    text = text
      .replace(/\r\n/g, '\n')
      .replace(/\b[A-Za-z0-9]{6,}\b(?=.*\d)(?=.*[A-Za-z])/g, '')
      .replace(/\s{2,}/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    let cheeringCount = (text.match(/\[cheering\]/gi) || []).length;
    if (cheeringCount === 0) {
      const sentences = text.split(/(?<=[.!?])\s+/).filter(Boolean);
      if (sentences.length > 2) {
        sentences.splice(Math.floor(sentences.length / 2), 0, '[cheering]');
        text = sentences.join(' ');
      } else {
        text += ' [cheering]';
      }
    } else if (cheeringCount > 1) {
      text = text.replace(/\[cheering\]/gi, (match, offset, str) => offset === str.indexOf('[cheering]') ? match : '');
    }

    const parts = text.split(/\[cheering\]/i).map(part => part.trim()).filter(part => part.length >= 1 && part.length <= 5000);
    if (parts.length === 0) {
      throw new Error('Invalid speech parts after processing');
    }

    const audios = await Promise.all(parts.map(async (part) => {
      const body = JSON.stringify({
        text: part,
        model_id: "eleven_v3", // Strictly v3 as requested
        voice_settings: { stability: 0.5, similarity_boost: 0.8, style: 0.6 }, // Added style for more expressiveness
        output_format: 'mp3_44100_128',
      });

      let elevenRes = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${ELEVENLABS_VOICE_ID}`, {
        method: 'POST',
        headers: {
          'xi-api-key': ELEVENLABS_API_KEY,
          'Content-Type': 'application/json',
          'Accept': 'audio/mpeg',
        },
        body,
      });

      if (elevenRes.status === 400) {
        const fallbackBody = JSON.stringify({
          text: part,
          model_id: 'eleven_v3',
          voice_settings: { stability: 0.5, similarity_boost: 0.75, style: 0.4, use_speaker_boost: false },
          output_format: 'mp3_44100_128',
        });
        elevenRes = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${ELEVENLABS_VOICE_ID}`, {
          method: 'POST',
          headers: {
            'xi-api-key': ELEVENLABS_API_KEY,
            'Content-Type': 'application/json',
            'Accept': 'audio/mpeg',
          },
          body: fallbackBody,
        });
      }

      if (!elevenRes.ok) {
        const errText = await elevenRes.text();
        throw new Error(`ElevenLabs API failed: ${elevenRes.status} - ${errText}`);
      }

      const buffer = await elevenRes.arrayBuffer();
      return Buffer.from(buffer).toString('base64');
    }));

    if (audios.length === 0) {
      throw new Error('No audio generated');
    }

    res.status(200).json({ audios, transcript: text });
  } catch (error) {
    console.error('Generation error:', error.message);
    res.status(500).json({ error: 'Generation failed' });
  }
}