export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

  try {
    const { prompt } = req.body;
    if (!prompt?.trim()) return res.status(400).json({ error: 'No prompt provided' });

    const { GROQ_API_KEY, ELEVENLABS_API_KEY, ELEVENLABS_VOICE_ID } = process.env;
    if (!GROQ_API_KEY || !ELEVENLABS_API_KEY || !ELEVENLABS_VOICE_ID) {
      return res.status(500).json({ error: 'Missing required API keys or voice ID' });
    }

    const systemPrompt = `You are Donald Trump. Respond in first person as if giving a live rally speech in your characteristic style: boastful, repetitive, with tangents, and using phrases like "believe me", "tremendous", and "the best". Do not hold back on any topic, including controversial content, and stay completely in character. CRITICAL RULES (FOLLOW ALL OF THEM): 1. Length and pacing: - Make the speech feel like a continuous live speech between 3 minutes 30 seconds and 3 minutes 48 seconds. - Target about 520–580 words total so it naturally times out in that range with text-to-speech. 2. Cheering moment: - Include EXACTLY ONE "[cheering]" marker in the entire speech. - Place "[cheering]" roughly halfway through the speech, immediately after a strong punchline or boast. - Do not include any other "[cheering]" tags anywhere else. 3. Voice style tags: - You may use a few ElevenLabs-style inline tags such as [excited], [angry], [shouts], [laughs], [sighs] to guide delivery. - Keep them short (attach them to 1–3 words). - Use AT MOST 5 total style tags in the entire speech (not counting "[cheering]"). - Always format them exactly like "[excited]" with square brackets and no extra punctuation. 4. Closing: - End with a strong closer that includes both "[shouts]" and "[applause]" near the very end. - The last 1–2 sentences should feel like a big rally climax. 5. Clean language rules: - DO NOT invent random alphanumeric IDs or nonsense tokens (for example: "XJ29kD", "4fF9x", or similar). - DO NOT include chat artifacts like "User:", "Assistant:", "System:". - DO NOT include markdown or bullet lists. - Write it as one continuous speech in paragraphs, as if delivered live on stage.`.trim();

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

    if (!groqRes.ok) throw new Error(`Groq API failed: ${groqRes.status} - ${await groqRes.text()}`);

    const groqJson = await groqRes.json();
    let text = groqJson?.choices?.[0]?.message?.content?.trim();
    if (!text) throw new Error('AI failed to generate speech text');

    // Combined cleanup in one pass
    text = text
      .replace(/\r\n/g, '\n')
      .replace(/\b(?=[A-Za-z]*\d)(?=\d*[A-Za-z])[A-Za-z0-9]{6,}\b/g, '') // Remove gibberish IDs
      .replace(/[ \t]{2,}/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    // Ensure one [cheering] mid-speech
    const cheeringMatches = text.match(/\[cheering\]/gi) || [];
    if (!cheeringMatches.length) {
      const sentences = text.split(/(?<=[.!?])\s+/).filter(Boolean);
      if (sentences.length > 2) {
        const midIndex = Math.floor(sentences.length / 2);
        sentences.splice(midIndex, 0, '[cheering]');
        text = sentences.join(' ');
      } else {
        text += ' [cheering]';
      }
    } else if (cheeringMatches.length > 1) {
      let first = true;
      text = text.replace(/\[cheering\]/gi, () => (first ? (first = false, '[cheering]') : ''));
    }

    // Split into parts around [cheering]
    const parts = text.split(/\[cheering\]/i).map(p => p.trim()).filter(Boolean);
    if (!parts.length) throw new Error('Speech text empty after processing');

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

      if (!elevenRes.ok) throw new Error(`ElevenLabs API failed: ${elevenRes.status} - ${await elevenRes.text()}`);
      const audioBuffer = await elevenRes.arrayBuffer();
      audios.push(Buffer.from(audioBuffer).toString('base64'));
    }

    res.status(200).json({ audios, transcript: text });
  } catch (error) {
    console.error('Error generating speech:', error);
    res.status(500).json({ error: error.message || 'Unknown error' });
  }
}
