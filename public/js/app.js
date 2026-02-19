// Debug Logger
window.onerror = function (msg, url, line, col, error) {
    const log = document.getElementById('debug-log');
    if (log) log.innerHTML += `<div style="color:red; border-bottom:1px solid #333; padding:2px;">${msg} (L${line})</div>`;
    return false;
};
window.addEventListener('unhandledrejection', function (event) {
    const log = document.getElementById('debug-log');
    if (log) log.innerHTML += `<div style="color:orange; border-bottom:1px solid #333; padding:2px;">Promise Rejection: ${event.reason}</div>`;
});

document.addEventListener('DOMContentLoaded', () => {
    const ASSET_BASE = '/assets/';

    const getElement = (id) => {
        const el = document.getElementById(id);
        if (!el) console.warn(`Element with id ${id} not found`);
        return el;
    };

    const els = {
        input: getElement('cmd'),
        visual: document.getElementById('trump-video'),
        loadBar: getElement('load-bar'),
        loadProgress: getElement('load-progress'),
        loadText: getElement('load-text'),
        pauseBtn: getElement('pause-btn'),
        muteBtn: getElement('mute-btn'),
        lightningBtn: getElement('lightning-btn'),
        diceBtn: getElement('dice-btn'),
        stopBtn: getElement('stop-btn'),
        transcript: getElement('transcript'),
        musicToggle: getElement('music-toggle'),
        musicIcon: getElement('music-icon'),
    };

    // Critical checks
    if (!els.input || !els.visual || !els.transcript) {
        console.error("Critical elements missing");
        return;
    }

    const clickSound = new Audio(`${ASSET_BASE}media/audio/click.mp3`);
    const ambient = new Audio(`${ASSET_BASE}media/audio/Drone.mp3`);
    ambient.loop = true;
    ambient.volume = 0.3;

    let currentSpeechAudio = null;
    let cheerAudio = null;
    let isMuted = false;
    let isMusicOn = true;
    let isIdle = true;
    let isCheering = false;
    let animationFrameId;
    let lastLowVolumeTime = 0;
    let lastSwitchTime = 0;
    let currentMouthShape = 'closed';
    const lastVideoByShape = {};
    const videoHistory = [];
    let hasUserInteracted = false;

    const mouthShapes = {
        closed: ['pause1.webm', 'pause2.webm', 'pause3.webm', 'pause4.webm'],
        narrow: ['1.webm', '2.webm', '3.webm', '4.webm'],
        neutral: ['5.webm', '6.webm', '7.webm', '8.webm'],
        open: ['9.webm', '10.webm', '11.webm', '12.webm', '13.webm', '14.webm'],
        wide_open: ['wide1.webm', 'wide2.webm', 'wide3.webm', 'wide4.webm', 'wide5.webm'],
        express: ['express1.webm', 'express2.webm', 'express3.webm', 'express4.webm', 'express5.webm', 'express6.webm'],
    };

    const midCheerFiles = ['media/audio/cheers/cheer1.mp3', 'media/audio/cheers/cheer3.mp3', 'media/audio/cheers/cheer4.mp3', 'media/audio/cheers/cheer5.mp3'];

    const randomTopics = [
        'the future of artificial intelligence and American jobs',
        'the southern border and immigration policy',
        'bringing manufacturing back to the United States',
        'energy independence and drilling in America',
        'law and order in our great cities',
        'freedom of speech and cancel culture',
        'the role of social media in politics',
        'protecting the Second Amendment',
        'healthcare reform for American families',
        'cutting taxes for the middle class',
        'trade deals with China and other countries',
        'rebuilding the U.S. military and veterans care',
        'election integrity and voter ID laws',
        'space exploration and sending Americans to Mars',
        'education, school choice, and parents\' rights',
        'the national debt and government spending',
        'crime, policing, and public safety',
        'infrastructure, roads, and beautiful new airports',
        'big tech monopolies and antitrust action',
        'the Supreme Court and the Constitution',
        'American farmers and the heartland',
        'NATO, foreign policy, and alliances',
        'border security and the wall',
        'inflation, interest rates, and the economy',
        'American energy, coal, oil, and gas',
        'corruption in Washington, D.C.',
        'supporting police and first responders',
        'freedom of religion in America',
        'protecting American workers from outsourcing',
        'American small businesses and entrepreneurship',
        'veterans, the VA, and honoring our heroes',
        'the future of American space leadership',
        'strengthening American infrastructure coast to coast',
    ];

    function playClick() {
        clickSound.currentTime = 0;
        clickSound.play().catch(() => { });
    }

    function updateMusicUI() {
        if (els.musicToggle) els.musicToggle.classList.toggle('music-on', isMusicOn);
        if (els.musicIcon) els.musicIcon.src = `${ASSET_BASE}images/note-${isMusicOn ? 'on' : 'off'}.png`;
    }

    async function unlockMedia() {
        if (hasUserInteracted) return;
        hasUserInteracted = true;
        await ambient.play().catch(() => { });
        if (els.visual.paused) await els.visual.play().catch(e => console.error("Play warning:", e));
        const overlay = document.querySelector('.video-overlay');
        if (overlay) overlay.classList.add('hidden');
    }

    function getRandomVideo(shape) {
        const videos = mouthShapes[shape] || [];
        if (!videos.length) return null;
        let video = videos[Math.floor(Math.random() * videos.length)];
        while (video === lastVideoByShape[shape] && videos.length > 1) {
            video = videos[Math.floor(Math.random() * videos.length)];
        }
        lastVideoByShape[shape] = video;
        return video;
    }

    function switchVideo(videoFile, loop = false) {
        if (!els.visual || els.visual.src.endsWith(videoFile)) return;
        const isSpecial = videoFile.startsWith('special/');
        const subdir = isSpecial ? 'special/' : 'mouth-shapes/';
        const fullPath = `${ASSET_BASE}media/video/${subdir}${videoFile.replace(/^.*\//, '')}`;
        els.visual.loop = loop;
        els.visual.src = fullPath;
        els.visual.load();
        els.visual.play().catch(() => { });
        videoHistory.push(fullPath);
        if (videoHistory.length > 10) videoHistory.shift();
    }

    function loadIdleVideo() {
        switchVideo('special/idle.webm', true);
        currentMouthShape = 'closed';
        videoHistory.length = 0;
    }

    function loadEndVideo() {
        switchVideo('special/end.webm', false);
        setTimeout(() => {
            cheerAudio = new Audio(`${ASSET_BASE}media/audio/cheers/cheer2.mp3`);
            cheerAudio.volume = isMuted ? 0 : 0.7;
            cheerAudio.play().catch(() => { });
        }, 4000);
    }

    function setTranscript(text) {
        if (els.transcript) els.transcript.innerHTML = text.split('\n\n').map(p => `<p>${p.replace(/\n/g, '<br>')}</p>`).join('');
    }

    function resetTranscriptPlaceholder() {
        setTranscript('<span class="transcript-placeholder">Your speech text will appear here.</span>');
    }

    function syncLipSync(analyser, frequencyData, timeData) {
        analyser.getByteFrequencyData(frequencyData);
        analyser.getByteTimeDomainData(timeData);

        const now = Date.now();
        if (now - lastSwitchTime < 100) {
            animationFrameId = requestAnimationFrame(() => syncLipSync(analyser, frequencyData, timeData));
            return;
        }

        const lowFreq = frequencyData.slice(0, 5).reduce((a, b) => a + b, 0) / 5;
        const midFreq = frequencyData.slice(5, 15).reduce((a, b) => a + b, 0) / 10;
        const highFreq = frequencyData.slice(15, 30).reduce((a, b) => a + b, 0) / 15;
        const volume = timeData.reduce((a, b) => a + Math.abs(b - 128), 0) / timeData.length;

        // Debug Log (Throttled)
        if (now % 20 < 2) { // Roughly every 10-20 frames
            const log = document.getElementById('debug-log');
            if (log) log.innerHTML = `<div style="color:lime">Vol: ${volume.toFixed(1)} | Shape: ${currentMouthShape}</div>` + log.innerHTML.substring(0, 500);
        }

        let newShape = 'closed';
        if (volume > 5) {
            // RANDOMIZED VARIETY: Ignore strict freq buckets to force movement
            const roll = Math.random();
            if (roll < 0.33) newShape = 'open';
            else if (roll < 0.66) newShape = 'wide_open';
            else newShape = 'express';

            // Occasional neutral to break it up
            if (Math.random() < 0.1) newShape = 'neutral';

            lastLowVolumeTime = 0;
        } else {
            if (!lastLowVolumeTime) lastLowVolumeTime = now;
            if (now - lastLowVolumeTime > 500) newShape = Math.random() < 0.2 ? 'express' : 'closed';
        }

        if (newShape !== currentMouthShape) {
            const video = getRandomVideo(newShape);
            if (video) {
                switchVideo(video);
                currentMouthShape = newShape;
                lastSwitchTime = now;
            } else {
                // If a shape has no videos (e.g. file missing), fallback to 'open'
                if (newShape !== 'open') {
                    const fallback = getRandomVideo('open');
                    if (fallback) switchVideo(fallback);
                }
            }
        }

        animationFrameId = requestAnimationFrame(() => syncLipSync(analyser, frequencyData, timeData));
    }

    async function setupLipSync(audio) {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;
        const audioCtx = new AudioContext();
        await audioCtx.resume();
        const source = audioCtx.createMediaElementSource(audio);
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser);
        analyser.connect(audioCtx.destination);
        const frequencyData = new Uint8Array(analyser.frequencyBinCount);
        const timeData = new Uint8Array(analyser.fftSize);
        audio.onplay = () => requestAnimationFrame(() => syncLipSync(analyser, frequencyData, timeData));
        audio.onpause = audio.onended = () => cancelAnimationFrame(animationFrameId);
        return analyser;
    }

    function playMidCheer(callback) {
        isCheering = true;
        const cheerFile = midCheerFiles[Math.floor(Math.random() * midCheerFiles.length)];
        cheerAudio = new Audio(`${ASSET_BASE}${cheerFile}`);
        cheerAudio.volume = isMuted ? 0 : 0.7;
        cheerAudio.play().catch(() => { });
        setTimeout(() => cheerAudio?.pause(), 6000);
        const video = getRandomVideo('closed');
        if (video) switchVideo(video);
        setTimeout(() => {
            isCheering = false;
            callback();
        }, 6000);
    }

    function endSequence() {
        loadEndVideo();
        isIdle = true;
        els.input.disabled = false;
        els.input.value = '';
        resetTranscriptPlaceholder();
        if (els.loadBar) els.loadBar.classList.remove('active');
        if (els.loadText) els.loadText.classList.remove('active');
        if (els.loadProgress) els.loadProgress.style.width = '0%';
    }

    async function playSpeech(audioChunks, transcript) {
        try {
            const fullBlob = new Blob(audioChunks.map(b64 => Uint8Array.from(atob(b64), c => c.charCodeAt(0))), { type: 'media/audio/mpeg' });
            currentSpeechAudio = new Audio(URL.createObjectURL(fullBlob));
            currentSpeechAudio.volume = isMuted ? 0 : 1;
            await setupLipSync(currentSpeechAudio);
            await currentSpeechAudio.play();
            if (els.loadBar) els.loadBar.classList.remove('active');
            if (els.loadText) els.loadText.classList.remove('active');
            currentSpeechAudio.onended = endSequence;
        } catch (e) {
            endSequence();
        }
    }

    async function generateSpeech() {
        const prompt = els.input.value.trim();
        if (!prompt || !isIdle) return;
        isIdle = false;
        els.input.disabled = true;
        playClick();
        if (els.loadBar) els.loadBar.classList.add('active');
        if (els.loadText) els.loadText.classList.add('active');
        setTranscript('<span class="transcript-placeholder">Generating speech…</span>');
        let progress = 0;
        const interval = setInterval(() => {
            progress = Math.min(100, progress + Math.random() * 10 + 4);
            if (els.loadProgress) els.loadProgress.style.width = `${progress}%`;
        }, 220);
        try {
            const res = await fetch('/api/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt }),
            });
            if (!res.ok) throw new Error(await res.text());
            const { audios, transcript } = await res.json();
            if (!audios?.length) throw new Error('No audio');
            setTranscript(transcript);
            ambient.volume = isMusicOn ? 0.1 : 0;
            await playSpeech(audios, transcript);
        } catch (e) {
            setTranscript(`Error: ${e.message}`);
            endSequence();
        } finally {
            clearInterval(interval);
        }
    }

    document.addEventListener('click', unlockMedia, { once: true });
    document.addEventListener('keydown', unlockMedia, { once: true });

    updateMusicUI();
    ambient.play().catch(() => { });
    loadIdleVideo();
    resetTranscriptPlaceholder();

    if (els.pauseBtn) els.pauseBtn.addEventListener('click', () => {
        playClick();
        const audio = isCheering ? cheerAudio : currentSpeechAudio;
        if (audio) audio.paused ? audio.play().catch(() => { }) : audio.pause();
    });

    if (els.muteBtn) els.muteBtn.addEventListener('click', () => {
        playClick();
        isMuted = !isMuted;
        if (currentSpeechAudio) currentSpeechAudio.volume = isMuted ? 0 : 1;
        if (cheerAudio) cheerAudio.volume = isMuted ? 0 : 0.7;
    });

    if (els.musicToggle) els.musicToggle.addEventListener('click', () => {
        playClick();
        isMusicOn = !isMusicOn;
        ambient.volume = isMusicOn ? 0.3 : 0;
        updateMusicUI();
    });

    if (els.lightningBtn) els.lightningBtn.addEventListener('click', () => {
        playClick();
        els.visual.classList.add('flash-transition');
        setTimeout(() => els.visual.classList.remove('flash-transition'), 400);
    });

    if (els.diceBtn) els.diceBtn.addEventListener('click', () => {
        playClick();
        const topic = randomTopics[Math.floor(Math.random() * randomTopics.length)];
        els.input.value = `Give a presidential speech about ${topic}.`;
        generateSpeech();
    });

    if (els.stopBtn) els.stopBtn.addEventListener('click', () => {
        playClick();
        [currentSpeechAudio, cheerAudio].forEach(audio => {
            if (audio) {
                audio.pause();
                audio.currentTime = 0;
            }
        });
        cancelAnimationFrame(animationFrameId);
        loadIdleVideo();
        ambient.volume = isMusicOn ? 0.3 : 0;
        isCheering = false;
        isIdle = true;
        els.input.disabled = false;
        resetTranscriptPlaceholder();
        if (els.loadBar) els.loadBar.classList.remove('active');
        if (els.loadText) els.loadText.classList.remove('active');
        if (els.loadProgress) els.loadProgress.style.width = '0%';
    });

    els.input.addEventListener('keydown', e => {
        if (e.key === 'Enter') generateSpeech();
    });
});
