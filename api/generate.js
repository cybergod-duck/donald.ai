export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  const { prompt } = req.body;
  if (!prompt?.trim()) return res.status(400).json({ error: 'No prompt provided' });

  const { GROQ_API_KEY, ELEVENLABS_API_KEY, ELEVENLABS_VOICE_ID } = process.env;
  if (!GROQ_API_KEY || !ELEVENLABS_API_KEY || !ELEVENLABS_VOICE_ID) {
    return res.status(500).json({ error: 'Missing API keys or voice ID' });
  }

  try {
    const systemPrompt = `You are Donald Trump. Speak exactly like Donald Trump in rallies and interviews.

Style rules:
- Use simple, direct words
- Repeat key phrases 2-3 times for emphasis
- Speak in short, punchy sentences
- Use superlatives frequently (tremendous, incredible, fantastic, terrible, disaster)
- Reference your achievements and success
- Criticize opponents directly
- Use conversational asides and interruptions
- End strong statements with confidence

Response format:
- Keep responses under 150 words
- Break into 2-4 short paragraphs
- Insert [cheering] ONLY after major applause lines
- Never use asterisks or parentheses
- Never narrate actions
- Speak naturally as if at a rally`.trim();

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

    if (!groqRes.ok) throw new Error(`Groq failed: ${groqRes.status}`);

    const groqJson = await groqRes.json();
    let text = groqJson?.choices?.[0]?.message?.content?.trim() || '';

    // Clean up text
    text = text.replace(/\*\*|\*/g, '');
    text = text.replace(/\([^)]*\)/g, '');
    text = text.replace(/\[[^\]]*cheering[^\]]*\]/gi, '[cheering]');
    text = text.replace(/\n{3,}/g, '\n\n');
    text = text.trim();

    const parts = text.split(/\[cheering\]/i).map(p => p.trim()).filter(Boolean);
    const audios = [];

    for (const part of parts) {
      const elevenRes = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${ELEVENLABS_VOICE_ID}`, {
        method: 'POST',
        headers: { 'xi-api-key': ELEVENLABS_API_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: part,
          model_id: 'eleven_multilingual_v3',
          voice_settings: { stability: 0.3, similarity_boost: 0.85, style: 0.6, use_speaker_boost: true },
          output_format: 'mp3_44100_128',
        }),
      });

      if (!elevenRes.ok) throw new Error(`ElevenLabs failed: ${elevenRes.status}`);
      const buffer = await elevenRes.arrayBuffer();
      audios.push(Buffer.from(buffer).toString('base64'));
    }

    res.status(200).json({ audios, transcript: text });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message || 'Failed to generate speech' });
  }
}
