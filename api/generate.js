export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed');
  }

  try {
    const { prompt } = req.body;
    
    if (!prompt || typeof prompt !== 'string' || prompt.trim().length < 5) {
      return res.status(400).json({ error: 'Prompt required - at least 5 chars!' });
    }

    // Get Trump speech from Groq
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
          content: `You are Trump AI. 4 paragraphs. Keep it natural and conversational. Respond to: ${prompt}` 
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

    // Generate audio from ElevenLabs
    const elevenRes = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${process.env.ELEVENLABS_VOICE_ID}?output_format=mp3_44100_128`, {
      method: "POST",
      headers: { 
        "xi-api-key": process.env.ELEVENLABS_API_KEY, 
        "Content-Type": "application/json" 
      },
      body: JSON.stringify({ 
        text, 
        model_id: "eleven_monolingual_v1",
        voice_settings: { 
          stability: 0.75, 
          similarity_boost: 0.85
        }
      })
    });

    if (!elevenRes.ok) {
      throw new Error(`ElevenLabs error: ${elevenRes.status}`);
    }

    const audioBuffer = await elevenRes.arrayBuffer();

    // Get viseme data from Azure Speech Service
    let visemeData = [];
    try {
      const azureRes = await fetch(`${process.env.AZURE_SPEECH_ENDPOINT}cognitiveservices/v1?visualizationFormat=json`, {
        method: "POST",
        headers: {
          "Ocp-Apim-Subscription-Key": process.env.AZURE_SPEECH_KEY,
          "Content-Type": "application/ssml+xml"
        },
        body: `<speak version='1.0' xml:lang='en-US'><voice name='en-US-GuyNeural'>${text}</voice></speak>`
      });

      if (azureRes.ok) {
        const azureData = await azureRes.json();
        if (azureData.Visemes) {
          visemeData = azureData.Visemes.map(v => ({
            viseme: v.VisemeId,
            time: v.AudioOffset / 10000000 // Convert to seconds
          }));
        }
      }
    } catch (e) {
      console.warn('Viseme extraction failed, continuing without:', e.message);
      // Continue without visemes - audio will still work
    }

    // Return audio + viseme data
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    return res.status(200).json({
      audio: Buffer.from(audioBuffer).toString('base64'),
      visemes: visemeData
    });

  } catch (e) {
    console.error('Generate error:', e);
    return res.status(500).json({ error: e.message });
  }
}
