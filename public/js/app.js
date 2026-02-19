document.addEventListener('DOMContentLoaded', () => {
    // --- CONFIGURATION ---
    const ASSETS = {
        video: {
            idle: '/assets/media/video/special/idle.webm',
            end: '/assets/media/video/special/end.webm',
            // FULL LIBRARY (29 clips) for maximum variety
            shapes: [
                // Open / Vowels
                'mouth-shapes/9.webm', 'mouth-shapes/10.webm', 'mouth-shapes/11.webm',
                'mouth-shapes/12.webm', 'mouth-shapes/13.webm', 'mouth-shapes/14.webm',
                // Wide / Intensity
                'mouth-shapes/wide1.webm', 'mouth-shapes/wide2.webm', 'mouth-shapes/wide3.webm',
                'mouth-shapes/wide4.webm', 'mouth-shapes/wide5.webm',
                // Express / Movement
                'mouth-shapes/express1.webm', 'mouth-shapes/express2.webm', 'mouth-shapes/express3.webm',
                'mouth-shapes/express4.webm', 'mouth-shapes/express5.webm', 'mouth-shapes/express6.webm',
                // Narrow / Consonants (Adding these for more variety)
                'mouth-shapes/1.webm', 'mouth-shapes/2.webm', 'mouth-shapes/3.webm', 'mouth-shapes/4.webm',
                // Neutral / Pauses
                'mouth-shapes/5.webm', 'mouth-shapes/6.webm', 'mouth-shapes/7.webm', 'mouth-shapes/8.webm',
                'mouth-shapes/pause1.webm', 'mouth-shapes/pause2.webm', 'mouth-shapes/pause3.webm', 'mouth-shapes/pause4.webm'
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
    const loadingOverlay = document.getElementById('loading-overlay');
    const audioDrone = document.getElementById('ambient-audio');

    // --- STATE ---
    let isSpeaking = false;
    let speechAudio = null;
    let syncTimeout = null;
    let videoHistory = []; // Prevent immediate repeats

    // --- INITIALIZATION ---
    function init() {
        console.log("Donald.AI Core Online");
        video.src = ASSETS.video.idle;
        video.loop = true;

        // Volume adjustment (User requested lower)
        audioDrone.volume = 0.15;

        // Inputs
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') handleCommand();
        });

        // Click interaction to unlock audio
        document.body.addEventListener('click', () => {
            audioDrone.play().catch(e => console.log("Audio unlock waiting..."));
        }, { once: true });
    }

    // --- CORE LOGIC ---
    async function handleCommand() {
        const text = input.value.trim();
        if (!text) return;

        input.disabled = true;
        setInputStatus("THINKING...");
        loadingOverlay.classList.remove('hidden'); // Show loading

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
            loadingOverlay.classList.add('hidden'); // Hide loading

            if (data.audios && data.audios.length > 0) {
                await playSpeechSequence(data.audios);
            } else {
                throw new Error("No audio returned");
            }

        } catch (e) {
            console.error(e);
            loadingOverlay.classList.add('hidden');
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
        playEndSequence();
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

    // --- LIP SYNC (SMART SHUFFLE) ---
    function startLipSync() {
        if (syncTimeout) clearTimeout(syncTimeout);

        const nextShape = () => {
            if (!isSpeaking) return;

            // Pick a random shape that isn't in recent history
            let candidate;
            let attempts = 0;
            do {
                candidate = ASSETS.video.shapes[Math.floor(Math.random() * ASSETS.video.shapes.length)];
                attempts++;
            } while (videoHistory.includes(candidate) && attempts < 10);

            // Update history
            videoHistory.push(candidate);
            if (videoHistory.length > 5) videoHistory.shift(); // Remember last 5

            switchVideo(candidate);

            // Randomize timing (80ms - 250ms) to feel organic
            const nextTime = Math.random() * 170 + 80;
            syncTimeout = setTimeout(nextShape, nextTime);
        };

        nextShape();
    }

    function stopLipSync() {
        if (syncTimeout) clearTimeout(syncTimeout);
        // Don't reset to idle here immediately, wait for sequence end
    }

    function switchVideo(partialPath) {
        const fullPath = `/assets/media/video/${partialPath}`;
        // Note: checking src === fullPath might fail due to absolute URLs, using includes is safer
        if (video.src.includes(partialPath)) return;

        video.src = fullPath;
        video.loop = true;
        video.play().catch(e => { });
    }

    function playEndSequence() {
        // Play 'end.webm' once, then go back to idle
        isSpeaking = false;
        video.src = ASSETS.video.end;
        video.loop = false;
        video.play();

        video.onended = () => {
            video.onended = null; // Clear listener
            resetState();
        };
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
