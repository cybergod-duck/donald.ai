document.addEventListener('DOMContentLoaded', () => {
    // --- CONFIGURATION ---
    const ASSETS = {
        video: {
            idle: '/assets/media/video/special/idle.webm',
            end: '/assets/media/video/special/end.webm',
            // Shapes for random lip sync
            shapes: [
                'mouth-shapes/9.webm', 'mouth-shapes/10.webm', 'mouth-shapes/11.webm', // Open
                'mouth-shapes/wide1.webm', 'mouth-shapes/wide2.webm', // Wide
                'mouth-shapes/express1.webm', 'mouth-shapes/express2.webm' // Express
            ]
        },
        audio: {
            click: '/assets/media/audio/click.mp3',
            drone: '/assets/media/audio/Drone.mp3'
        }
    };

    // --- ELEMENTS ---
    const video = document.getElementById('trump-video');
    const input = document.getElementById('cmd');
    const status = document.getElementById('status-overlay');
    const audioDrone = document.getElementById('ambient-audio');

    // --- STATE ---
    let isSpeaking = false;
    let speechAudio = null;
    let syncInterval = null;

    // --- INITIALIZATION ---
    function init() {
        console.log("Donald.AI Core Online");
        video.src = ASSETS.video.idle;
        video.loop = true;

        // Try to verify asset paths in background? No, keep it simple.

        // Inputs
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') handleCommand();
        });

        // Click interaction to unlock audio
        document.body.addEventListener('click', () => {
            audioDrone.play().catch(e => console.log("Audio unlock failed yet"));
        }, { once: true });
    }

    // --- CORE LOGIC ---
    async function handleCommand() {
        const text = input.value.trim();
        if (!text) return;

        input.disabled = true;
        setInputStatus("THINKING...");

        try {
            // 1. Call API
            const response = await fetch('/api/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt: text })
            });

            if (!response.ok) throw new Error("API Error");
            const data = await response.json();

            // 2. Play Result
            if (data.audios && data.audios.length > 0) {
                await playSpeechSequence(data.audios);
            } else {
                throw new Error("No audio returned");
            }

        } catch (e) {
            console.error(e);
            setInputStatus("ERROR: " + e.message);
            setTimeout(resetState, 2000);
        }
    }

    async function playSpeechSequence(audioBase64List) {
        setInputStatus("SPEAKING | LIVE");
        isSpeaking = true;

        // Combine all audio chunks (simplification for "one speech")
        // In a real robust app we might queue them, but let's try to blob them all 
        // or play sequentially. Sequential is safer for browser memory.

        for (const chunk of audioBase64List) {
            await playAudioChunk(chunk);
        }

        // Done
        resetState();
    }

    function playAudioChunk(base64) {
        return new Promise((resolve) => {
            const blob = b64toBlob(base64, 'audio/mpeg');
            const url = URL.createObjectURL(blob);
            speechAudio = new Audio(url);

            speechAudio.onplay = () => startLipSync();
            speechAudio.onended = () => {
                stopLipSync();
                resolve();
            };

            speechAudio.play().catch(e => {
                console.error("Audio playback failed", e);
                resolve(); // Skip if fails
            });
        });
    }

    // --- LIP SYNC (RANDOMIZED) ---
    // User requested "keep videos", so we randomly swap mouth shapes while audio plays
    // This creates the illusion of speech without complex FFT analysis flaws
    function startLipSync() {
        if (syncInterval) clearInterval(syncInterval);

        // Swap video every 100-200ms
        syncInterval = setInterval(() => {
            const randomShape = ASSETS.video.shapes[Math.floor(Math.random() * ASSETS.video.shapes.length)];
            switchVideo(randomShape);
        }, 150);
    }

    function stopLipSync() {
        if (syncInterval) clearInterval(syncInterval);
        video.src = ASSETS.video.idle;
        video.loop = true;
        video.play();
    }

    function switchVideo(partialPath) {
        const fullPath = `/assets/media/video/${partialPath}`;
        if (video.src.includes(fullPath)) return; // Don't reload same

        video.src = fullPath;
        video.loop = true; // Loop short clips so they don't freeze
        video.play().catch(e => { });
    }

    // --- UTILS ---
    function setInputStatus(msg) {
        status.innerText = msg;
        input.placeholder = msg;
        input.value = "";
    }

    function resetState() {
        isSpeaking = false;
        input.disabled = false;
        input.placeholder = "Type a topic...";
        input.focus();
        status.innerText = "IDLE";
        video.src = ASSETS.video.idle;
        video.loop = true;
        video.play();

        // Play end video briefly? User didn't strictly ask, but it's nice polish.
        // Let's stick to strict requirements: "Simple". Idle is safest.
    }

    function b64toBlob(b64Data, contentType = '', sliceSize = 512) {
        const byteCharacters = atob(b64Data);
        const byteArrays = [];
        for (let offset = 0; offset < byteCharacters.length; offset += sliceSize) {
            const slice = byteCharacters.slice(offset, offset + sliceSize);
            const byteNumbers = new Array(slice.length);
            for (let i = 0; i < slice.length; i++) {
                byteNumbers[i] = slice.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            byteArrays.push(byteArray);
        }
        return new Blob(byteArrays, { type: contentType });
    }

    // Start
    init();
});
