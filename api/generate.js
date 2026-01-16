export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).send('Method Not Allowed');
    }

    try {
        const { prompt, fullPrompt } = req.body;

        if (!prompt || typeof prompt !== 'string' || prompt.trim().length < 5) {
            return res.status(400).json({ error: 'Prompt required - at least 5 chars!' });
        }

        // Step 1: Generate text with Groq using the full prompt from frontend
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
                    content: fullPrompt || `You are Donald Trump. Respond in first person as if giving a speech in your characteristic style. Be boastful and true to character.`
                }]
            })
        });

        if (!groqRes.ok) throw new Error(`Groq API error: ${groqRes.status}`);
        
        const gData = await groqRes.json();
        const text = gData?.choices?.[0]?.message?.content;

        if (!text) throw new Error('No content from Groq');

        // Step 2: Generate audio with ElevenLabs
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
            })
        });

        if (!elevenRes.ok) throw new Error(`ElevenLabs error: ${elevenRes.status}`);

        const audioBuffer = await elevenRes.arrayBuffer();

        // Return audio
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Access-Control-Allow-Origin', '*');
        
        return res.status(200).json({
            audio: Buffer.from(audioBuffer).toString('base64'),
            visemes: []
        });

    } catch (e) {
        console.error('Generate error:', e);
        return res.status(500).json({ error: e.message });
    }
}
