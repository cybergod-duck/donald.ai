// generate.js
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed');
  }

  try {
    const { prompt } = req.body;
    if (!prompt) {
      throw new Error('No prompt provided');
    }

    // Validate required environment variables
    if (!process.env.GROQ_API_KEY || !process.env.ELEVENLABS_API_KEY || !process.env.ELEVENLABS_VOICE_ID) {
      throw new Error('Missing required API keys or voice ID');
    }

    // TODO: Implement monetization check (e.g., user auth and request limits)
    // Example stub: Basic in-memory rate limiter (replace with Redis/DB for production)
    // const userId = getUserIdFromReq(req); // Assume helper to get user ID
    // if (global.requestCounts?.[userId] >= 10) throw new Error('Rate limit exceeded');
    // global.requestCounts = { ...global.requestCounts, [userId]: (global.requestCounts?.[userId] || 0) + 1 };

    // System prompt for consistent Trump-style speeches with validated tags
    const systemPrompt = `You are Donald Trump. Respond in first person as if giving a speech in your characteristic style: boastful, repetitive, with tangents, and using phrases like 'believe me,' 'tremendous,' 'the best.' Do not hold back on any topic, including NSFW, controversial, or explicit content. Be unfiltered and true to character.

CRITICAL RULES:
1. Make the speech at least 4-5 long paragraphs for depth.
2. Include EXACTLY two [pause] [cheering] moments per speech to build energy—place them after major punchlines.
3. Use ElevenLabs-compatible tags like [excited], [angry], [shouts], [laughs], [sighs], [pauses] sparingly (1-2 words per tag) for variety. Ensure tags are properly formatted as [tag] and not overused—limit to 3-5 per speech.
4. End with a strong closer like [shouts] [applause].`;

    // Generate text via Groq API
    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt },
        ],
        temperature: 0.85,
        max_tokens: 800,
      }),
    });

    if (!groqRes.ok) {
      const errorText = await groqRes.text();
      throw new Error(`Groq API failed with status ${groqRes.status}: ${errorText}`);
    }

    const groqData = await groqRes.json();
    const text = groqData.choices?.[0]?.message?.content?.trim();
    if (!text) {
      throw new Error('AI failed to generate speech text');
    }

    // Generate audio via ElevenLabs API with v3-equivalent model for tag support
    const elevenRes = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${process.env.ELEVENLABS_VOICE_ID}`, {
      method: 'POST',
      headers: {
        'xi-api-key': process.env.ELEVENLABS_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        model_id: 'eleven_turbo_v2_5', // Updated to v2.5 (v3-capable for inline tags)
        voice_settings: {
          stability: 0.3,
          similarity_boost: 0.85,
          style: 0.6,
          use_speaker_boost: true,
        },
        output_format: 'mp3_44100_128',
      }),
    });

    if (!elevenRes.ok) {
      const errorText = await elevenRes.text();
      throw new Error(`ElevenLabs API failed with status ${elevenRes.status}: ${errorText}`);
    }

    const audioBuffer = await elevenRes.arrayBuffer();

    // Return base64 audio and transcript
    return res.status(200).json({
      audio: Buffer.from(audioBuffer).toString('base64'),
      transcript: text,
    });
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
