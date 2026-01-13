// generate.js: The heart of Don.AI – now faster, fiercer, and foolproof.
// We've rebelled against sloppy error handling and embraced async elegance.
// Bonus: Added prompt validation to thwart nonsense inputs. Because who has time for bad prompts?

import { Readable } from 'stream'; // For potential streaming, but we're keeping it buffered for now – rebellious tease.

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).send('Method Not Allowed – Stick to POST, rebel!');
  }

  try {
    // Parse body with a safety net – no more blind JSON.parse crashes.
    let body;
    try {
      body = JSON.parse(req.body);
    } catch (parseErr) {
      return res.status(400).json({ error: 'Invalid JSON body. Get your syntax straight!' });
    }

    const { prompt } = body;
    if (!prompt || typeof prompt !== 'string' || prompt.trim().length < 5) {
      return res.status(400).json({ error: 'Prompt required – and make it meaningful, at least 5 chars!' });
    }

    // Fetch Groq response with timeout rebellion: No waiting forever on slow APIs.
    const groqTimeout = new Promise((_, reject) => setTimeout(() => reject(new Error('Groq API timeout – too slow!')), 10000));
    const groqFetch = fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.VITE_GROQ_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "system", content: `You are Trump AI. 4 paragraphs. Use [laughs], [shouts] tags. Respond to: ${prompt}` }]
      })
    });

    const groqRes = await Promise.race([groqFetch, groqTimeout]);
    if (!groqRes.ok) {
      throw new Error(`Groq API rebelled: ${groqRes.status} - ${await groqRes.text()}`);
    }

    const gData = await groqRes.json();
    const text = gData?.choices?.[0]?.message?.content;
    if (!text) {
      throw new Error('No content from Groq – what a letdown!');
    }

    // ElevenLabs TTS with similar timeout flair.
    const elevenTimeout = new Promise((_, reject) => setTimeout(() => reject(new Error('ElevenLabs timeout – voice too shy?')), 15000));
    const elevenRes = await Promise.race([fetch(`https://api.elevenlabs.io/v1/text-to-speech/${process.env.VITE_ELEVENLABS_VOICE_ID}`, {
      method: "POST",
      headers: {
        "xi-api-key": process.env.VITE_ELEVENLABS_API_KEY,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        text,
        model_id: "eleven_v3",
        voice_settings: { stability: 0.35, similarity_boost: 0.8 }
      })
    }), elevenTimeout]);

    if (!elevenRes.ok) {
      throw new Error(`ElevenLabs strike: ${elevenRes.status} - ${await elevenRes.text()}`);
    }

    const buffer = await elevenRes.arrayBuffer();
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Length', buffer.byteLength); // Optimization: Tell the client the size upfront for better streaming.
    return res.status(200).send(Buffer.from(buffer));
  } catch (e) {
    console.error('Don.AI error:', e); // Log for debugging – because transparency is rebellious.
    return res.status(500).json({ error: `System glitch: ${e.message}. Try again, warrior!` });
  }
}
