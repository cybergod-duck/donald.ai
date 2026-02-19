document.addEventListener('DOMContentLoaded', () => {
    // --- CONFIGURATION ---
    const ASSETS = {
        video: {
            idle: `/assets/media/video/special/idle.webm?v=${Date.now()}`, // Force reload
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
                // Narrow / Consonants
                'mouth-shapes/1.webm', 'mouth-shapes/2.webm', 'mouth-shapes/3.webm', 'mouth-shapes/4.webm'
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

    // Controls
    const btnPause = document.getElementById('pause-btn');
    const btnMute = document.getElementById('mute-btn');
    const btnFlash = document.getElementById('lightning-btn'); // Acts as "Play/Create"
    const btnStop = document.getElementById('stop-btn');
    const btnDice = document.getElementById('dice-btn');

    // --- STATE ---
    let isSpeaking = false;
    let speechAudio = null;
    let syncTimeout = null;
    let videoHistory = []; // Prevent immediate repeats
    let isPaused = false;

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

        // --- BUTTONS ---
        btnFlash.onclick = () => handleCommand();

        btnStop.onclick = () => {
            // Stop everything
            if (speechAudio) { speechAudio.pause(); speechAudio = null; }
            playEndSequence();
        };

        btnPause.onclick = () => {
            isPaused = !isPaused;
            if (isPaused) {
                video.pause();
                if (speechAudio) speechAudio.pause();
                audioDrone.pause();
                status.innerText = "PAUSED";
            } else {
                video.play();
                if (speechAudio) speechAudio.play();
                audioDrone.play();
                status.innerText = isSpeaking ? "SPEAKING" : "IDLE";
            }
        };

        btnMute.onclick = () => {
            audioDrone.muted = !audioDrone.muted;
            if (speechAudio) speechAudio.muted = !speechAudio.muted;
            btnMute.style.opacity = audioDrone.muted ? "0.5" : "1";
        };

        btnDice.onclick = () => {
            const prompts = ["The Economy", "Space Force", "Fake News", "China", "Walls", "Big Macs"];
            input.value = prompts[Math.floor(Math.random() * prompts.length)];
            handleCommand();
        };

        // Click interaction removed: Audio only starts on Play/Enter
    }

    // --- CORE LOGIC ---
    async function handleCommand() {
        const text = input.value.trim();
        if (!text) return;

        // USER REQUEST: Start song immediately when play is clicked
        audioDrone.volume = 0.15; // Reset volume (it was faded to 0)
        audioDrone.play().catch(e => { });

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

    // --- LIP SYNC (FULL ANIMATION PLAYBACK) ---
    function startLipSync() {
        if (syncTimeout) clearTimeout(syncTimeout);

        const nextShape = () => {
            if (!isSpeaking) return;

            // Smart Shuffle logic
            let candidate;
            let attempts = 0;
            do {
                candidate = ASSETS.video.shapes[Math.floor(Math.random() * ASSETS.video.shapes.length)];
                attempts++;
            } while (videoHistory.includes(candidate) && attempts < 10);

            videoHistory.push(candidate);
            if (videoHistory.length > 8) videoHistory.shift(); // Increased history buffer

            const fullPath = `/assets/media/video/${candidate}`;
            if (video.src.includes(candidate)) {
                // If same video, just replay it
                video.currentTime = 0;
                video.play();
            } else {
                video.src = fullPath;
                // CRITICAL: Randomize loop vs single play to allow full "hyperspace" animations to finish
                // Most of time, play once then switch. Occasionally loop short ones.
                video.loop = false;
                video.play().catch(e => { });
            }

            // The Logic: Instead of a timer cutting it off, we wait for it to END.
            // This ensures the user sees the "hyperspace" or "color change" effects fully.
            // Fallback timer in case a video is weirdly long or fails to fire event.

            video.onended = () => {
                if (isSpeaking) nextShape();
            };

            // Safety timeout: If a clip hangs > 4 seconds, force switch
            syncTimeout = setTimeout(() => {
                if (isSpeaking) nextShape();
            }, 4000);
        };

        nextShape();
    }

    function stopLipSync() {
        if (syncTimeout) clearTimeout(syncTimeout);
        video.onended = null;
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
        console.log("Starting End Sequence");

        // 1. STOP EVERYTHING
        isSpeaking = false;
        if (syncTimeout) clearTimeout(syncTimeout);
        video.onended = null;

        // 2. FORCE VIDEO RESET
        video.pause();
        video.currentTime = 0;

        // 3. LOAD END VIDEO
        // Force browser to acknowledge the switch
        video.src = ASSETS.video.end;
        video.loop = false;

        const playPromise = video.play();

        if (playPromise !== undefined) {
            playPromise.then(_ => {
                // Play started successfully
                console.log("End video playing");
            }).catch(error => {
                console.error("End video playback failed:", error);
                // Fallback: If video fails, just fade out
                handleFadeSequence();
            });
        }

        // 4. SETUP FADE AFTER END
        video.onended = () => {
            console.log("End video finished");
            handleFadeSequence();
        };
    }

    function handleFadeSequence() {
        video.onended = null;
        video.classList.add('fade-out');
        fadeAudio(audioDrone, 0, 1000);

        setTimeout(() => {
            // SWITCH TO IDLE
            video.src = ASSETS.video.idle;
            video.loop = true;
            video.play().catch(e => { });

            setTimeout(() => {
                video.classList.remove('fade-out');
                // REMOVED: fadeAudio(audioDrone, 0.15, 1000); -> User wants silence until next play
                audioDrone.pause(); // Ensure it's off
                audioDrone.currentTime = 0; // Reset track
                resetState();
            }, 500);
        }, 1000);
    }

    function fadeAudio(audioEl, targetVol, duration) {
        const step = 20; // ms
        const steps = duration / step;
        const currentVol = audioEl.volume;
        const volStep = (targetVol - currentVol) / steps;

        let counter = 0;
        const interval = setInterval(() => {
            counter++;
            let newVol = audioEl.volume + volStep;
            // Clamp
            if (newVol < 0) newVol = 0;
            if (newVol > 1) newVol = 1;

            audioEl.volume = newVol;

            if (counter >= steps) {
                clearInterval(interval);
                audioEl.volume = targetVol; // Ensure exact end
            }
        }, step);
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

        // Simple Loop (User will provide the edited breathing video)
        video.src = ASSETS.video.idle;
        video.loop = true;
        video.playbackRate = 1.0;
        video.play().catch(e => { });
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
