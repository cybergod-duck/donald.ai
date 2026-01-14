export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed');
  }

  try {
    const { prompt } = req.body;
    
    if (!prompt || typeof prompt !== 'string' || prompt.trim().length < 5) {
      return res.status(400).json({ error: 'Prompt required - at least 5 chars!' });
    }

    const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { 
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`, 
        "Content-Type": "application/json" 
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [{ 
          role: "system", 
          content: `You are Trump AI. 4 paragraphs. Use [laughs], [shouts] tags. Respond to: ${prompt}` 
        }]
      })
    });

    if (!groqRes.ok) {
      throw new Error(`Groq API error: ${groqRes.status}`);
    }

    const gData = await groqRes.json();
    const text = gData?.choices?.[0]?.message?.content;
    
    if (!text) {
      throw new Error('No content from Groq');
    }

    const elevenRes = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${process.env.ELEVENLABS_VOICE_ID}`, {
      method: "POST",
      headers: { 
        "xi-api-key": process.env.ELEVENLABS_API_KEY, 
        "Content-Type": "application/json" 
      },
      body: JSON.stringify({ 
        text, 
        model_id: "eleven_turbo_v2_5", 
                voice_settings: { stability: 0.35, similarity_boost: 0.8, style: 0.5, use_speaker_boost: true }      })
    });

    if (!elevenRes.ok) {
      throw new Error(`ElevenLabs error: ${elevenRes.status}`);
    }

    const buffer = await elevenRes.arrayBuffer();
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Length', buffer.byteLength);
    return res.status(200).send(Buffer.from(buffer));

  } catch (e) {
    console.error('Generate error:', e);
    return res.status(500).json({ error: e.message });
  }
}
