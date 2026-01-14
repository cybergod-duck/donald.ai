export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed');
  }
  try {
    const { prompt } = req.body;
    if (!prompt || typeof prompt !== 'string' || prompt.trim().length < 5 || prompt.trim().length > 2000) {
      return res.status(400).json({ error: 'Prompt required - between 5 and 2000 characters!' });
    }

    // Use the full NSFW-enabled system prompt for unfiltered Trump-style responses
    const systemPrompt = "You are Donald Trump. Respond in first person as if giving a speech in your characteristic style: boastful, repetitive, with tangents, and using phrases like 'believe me,' 'tremendous,' 'the best.' Do not hold back on any topic, including NSFW, controversial, or explicit content. Be unfiltered and true to character. Keep it natural and conversational.";

    const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: prompt }
        ],
        max_tokens: 1024,  // Adjustable for longer responses; increase for detailed speeches
        temperature: 0.8   // Slight randomness for more "Trump-like" tangents
      })
    });

    if (!groqRes.ok) throw new Error(`Groq API error: ${groqRes.status} - ${await groqRes.text()}`);

    const gData = await groqRes.json();
    const text = gData?.choices?.[0]?.message?.content?.trim();
    if (!text) throw new Error('No content from Groq');

    const elevenRes = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${process.env.ELEVENLABS_VOICE_ID}?output_format=mp3_44100_128`, {
      method: "POST",
      headers: {
        "xi-api-key": process.env.ELEVENLABS_API_KEY,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        text,
        model_id: "eleven_monolingual_v1",
        voice_settings: { stability: 0.75, similarity_boost: 0.85 }
        // If ElevenLabs adds viseme/phoneme support, add: optimize_streaming_latency: 0, output_format: 'mp3_44100_128' with visemes
      })
    });

    if (!elevenRes.ok) throw new Error(`ElevenLabs error: ${elevenRes.status} - ${await elevenRes.text()}`);

    const audioBuffer = await elevenRes.arrayBuffer();

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(200).json({
      audio: Buffer.from(audioBuffer).toString('base64'),
      visemes: []  // Placeholder; populate if/when ElevenLabs returns viseme data for better lip-sync
    });
  } catch (e) {
    console.error('Generate error:', e.message, e.stack);
    return res.status(500).json({ error: 'Failed to generate speech - try again or check logs.' });
  }
}
