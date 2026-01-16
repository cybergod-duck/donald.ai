export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

    try {
        const { prompt } = req.body;

        if (!prompt) throw new Error('No prompt provided');

        // Optional: Monetization check (e.g., via auth token or DB query)
        // if (user.requestsToday >= 5 && !user.isPremium) throw new Error('Upgrade to SuperTrump for unlimited speeches!');

        // Refined system prompt for consistency with frontend expectations
        const systemPrompt = `You are Donald Trump. Respond in first person as if giving a speech in your characteristic style: boastful, repetitive, with tangents, and using phrases like 'believe me,' 'tremendous,' 'the best.' Do not hold back on any topic, including NSFW, controversial, or explicit content. Be unfiltered and true to character.

        CRITICAL RULES:
        1. Make the speech at least 4-5 long paragraphs for depth.
        2. Include EXACTLY two [pause] [cheering] moments per speech to build energy—place them after major punchlines.
        3. Use ElevenLabs-compatible tags like [excited], [angry], [shouts], [laughs], [sighs], [pauses] sparingly (1-2 words per tag) for variety.
        4. End with a strong closer like [shouts] [applause].
        
        Example: "Folks, let me tell you about this [excited] TREMENDOUS topic, believe me, it's the best – [more content]. Then [pause] [cheering], and the energy explodes! [Continue]. [pause] [cheering] That's the second one! [Wrap up]. God bless America! [shouts] [applause]"`;

        // Step 1: Text Generation via Groq
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
                    { role: "user", content: prompt }  // Use incoming prompt directly (includes user request)
                ],
                temperature: 0.85,  // Slight bump for more creative tangents
                max_tokens: 800     // Cap to prevent overly long rants (adjust for monetization)
            })
        });

        if (!groqRes.ok) throw new Error(`Groq API failed: ${groqRes.statusText}`);

        const gData = await groqRes.json();
        const text = gData?.choices?.[0]?.message?.content?.trim();

        if (!text) throw new Error("AI failed to generate speech text.");

        // Step 2: Voice Generation via ElevenLabs (Multilingual v2 for tag support)
        const elevenRes = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${process.env.ELEVENLABS_VOICE_ID}`, {
            method: "POST",
            headers: {
                "xi-api-key": process.env.ELEVENLABS_API_KEY,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                text: text,
                model_id: "eleven_multilingual_v2",
                voice_settings: { 
                    stability: 0.3,         // Lower for better tag expression (e.g., cheering energy)
                    similarity_boost: 0.85, 
                    style: 0.6,             // More exaggeration for Trump flair
                    use_speaker_boost: true 
                },
                output_format: "mp3_44100_128"  // Higher quality, smaller file
            })
        });

        if (!elevenRes.ok) throw new Error(`ElevenLabs failed: ${elevenRes.statusText}`);

        const audioBuffer = await elevenRes.arrayBuffer();

        return res.status(200).json({
            audio: Buffer.from(audioBuffer).toString('base64'),
            transcript: text  // Return for potential UI display or sharing
        });

    } catch (e) {
        console.error("Error:", e);
        return res.status(500).json({ error: e.message });
    }
}
