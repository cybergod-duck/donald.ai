export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

    try {
        const { prompt, fullPrompt } = req.body;

        // 1. Text Generation
        const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: "llama-3.3-70b-versatile",
                messages: [
                    { role: "system", content: fullPrompt },
                    { role: "user", content: prompt }
                ]
            })
        });

        const gData = await groqRes.json();
        const text = gData?.choices?.[0]?.message?.content;

        // 2. Audio Generation
        const elevenRes = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${process.env.ELEVENLABS_VOICE_ID}`, {
            method: "POST",
            headers: {
                "xi-api-key": process.env.ELEVENLABS_API_KEY,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                text,
                model_id: "eleven_monolingual_v1",
                voice_settings: { stability: 0.4, similarity_boost: 0.8 } 
            })
        });

        const audioBuffer = await elevenRes.arrayBuffer();

        return res.status(200).json({
            audio: Buffer.from(audioBuffer).toString('base64')
        });

    } catch (e) {
        return res.status(500).json({ error: e.message });
    }
}
