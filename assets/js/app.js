document.addEventListener('DOMContentLoaded', () => {
  const ASSET_BASE = '/assets/';

  // Safe element lookup with logging
  const getEl = id => document.getElementById(id) || console.warn(`Missing element: #${id}`);

  const elements = {
    input: getEl('cmd'),
    visual: getEl('visual'),
    loadBar: getEl('load-bar'),
    loadProgress: getEl('load-progress'),
    loadText: getEl('load-text'),
    pauseBtn: getEl('pause-btn'),
    muteBtn: getEl('mute-btn'),
    lightningBtn: getEl('lightning-btn'),
    diceBtn: getEl('dice-btn'),
    stopBtn: getEl('stop-btn'),
    transcript: getEl('transcript'),
    musicToggle: getEl('music-toggle'),
    musicIndicator: document.querySelector('.music-indicator'),
    musicIcon: getEl('music-icon'),
  };

  // Preload critical media
  const clickSound = new Audio(`${ASSET_BASE}audio/click.mp3`);
  clickSound.preload = 'auto';
  const ambient = new Audio(`${ASSET_BASE}audio/drone.mp3`);
  ambient.preload = 'auto';
  ambient.loop = true;
  ambient.volume = 0.3;

  let currentSpeechAudio = null;
  let cheerAudio = null;
  let isMuted = false;
  let isMusicOn = true;
  let isIdle = true;
  let isCheering = false;
  let animationFrameId = null;
  let lastLowVolumeTime = 0;
  let lastSwitchTime = 0;
  let currentMouthShape = 'closed';
  let lastVideoByShape = {};
  let videoHistory = [];
  let speechAudios = [];
  let currentIndex = 0;
  let hasUserInteracted = false;

  // Unlock media on first gesture (required for unmuted playback)
  const unlockMedia = () => {
    if (!hasUserInteracted) {
      hasUserInteracted = true;
      console.log('User gesture detected - unlocking media');
      ambient.play().catch(() => {});
      if (elements.visual && elements.visual.paused) {
        elements.visual.play().catch(() => {});
      }
    }
  };

  document.addEventListener('click', unlockMedia, { once: true });
  document.addEventListener('keydown', unlockMedia, { once: true });

  const mouthShapes = {
    closed: ['mouth-shapes/pause1.mp4', 'mouth-shapes/pause2.mp4', 'mouth-shapes/pause3.mp4', 'mouth-shapes/pause4.mp4', 'mouth-shapes/pause5.mp4'],
    narrow: ['mouth-shapes/1.mp4', 'mouth-shapes/2.mp4', 'mouth-shapes/3.mp4', 'mouth-shapes/4.mp4'],
    neutral: ['mouth-shapes/5.mp4', 'mouth-shapes/6.mp4', 'mouth-shapes/7.mp4', 'mouth-shapes/8.mp4'],
    open: ['mouth-shapes/9.mp4', 'mouth-shapes/10.mp4', 'mouth-shapes/11.mp4', 'mouth-shapes/12.mp4', 'mouth-shapes/13.mp4', 'mouth-shapes/14.mp4'],
    wide_open: ['mouth-shapes/wide1.mp4', 'mouth-shapes/wide2.mp4', 'mouth-shapes/wide3.mp4', 'mouth-shapes/wide4.mp4', 'mouth-shapes/wide5.mp4'],
    express: ['mouth-shapes/express1.mp4', 'mouth-shapes/express2.mp4', 'mouth-shapes/express3.mp4', 'mouth-shapes/express4.mp4', 'mouth-shapes/express5.mp4', 'mouth-shapes/express6.mp4'],
  };

  const midCheerFiles = ['audio/cheers/cheer1.mp3', 'audio/cheers/cheer3.mp3', 'audio/cheers/cheer4.mp3', 'audio/cheers/cheer5.mp3'];

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
    clickSound.play().catch(e => console.warn('Click blocked:', e.message));
  }

  function updateMusicUI() {
    elements.musicToggle?.classList.toggle('music-on', isMusicOn);
    elements.musicIndicator?.classList.toggle('music-on', isMusicOn);
    elements.musicIcon && (elements.musicIcon.src = `${ASSET_BASE}images/${isMusicOn ? 'note-on.png' : 'note-off.png'}`);
  }

  function ensureAmbientPlaying() {
    ambient.play().catch(e => console.warn('Ambient blocked:', e.message));
  }

  function switchVideo(videoFile, loop = false) {
    if (!videoFile || !elements.visual) return console.warn('No visual for video switch');
    const fullPath = `${ASSET_BASE}videos/${videoFile}`;
    if (elements.visual.src === fullPath) return;
    console.log('Switching video to:', fullPath);
    elements.visual.style.opacity = 1;
    elements.visual.loop = loop;
    elements.visual.muted = true;
    elements.visual.src = fullPath;
    elements.visual.load();
    elements.visual.onloadedmetadata = () => {
      elements.visual.currentTime = 0;
      elements.visual.play().catch(e => console.warn('Video play blocked:', e.message));
      elements.visual.style.opacity = 1;
    };
    elements.visual.onerror = e => console.error('Video load error:', e);
  }

  function loadIdleVideo() {
    switchVideo('special/idle.mp4', true);
    currentMouthShape = 'closed';
    videoHistory = [];
    lastVideoByShape = {};
  }

  function loadEndVideo() {
    switchVideo('special/end.mp4', false);
    if (!elements.visual) return;
    elements.visual.onloadedmetadata = () => {
      const duration = elements.visual.duration || 0;
      if (duration > 4) {
        setTimeout(() => {
          cheerAudio = new Audio(`${ASSET_BASE}audio/cheers/cheer2.mp3`);
          cheerAudio.volume = isMuted ? 0 : 0.7;
          cheerAudio.play().catch(() => {});
        }, Math.max(0, (duration - 4) * 1000));
      }
      elements.visual.currentTime = 0;
      elements.visual.play().catch(() => {});
    };
    elements.visual.onended = () => {
      loadIdleVideo();
      ambient.volume = isMusicOn ? 0.3 : 0;
    };
  }

  function resetTranscriptPlaceholder() {
    elements.transcript && (elements.transcript.innerHTML = '<span class="transcript-placeholder">Your speech text will appear here.</span>');
  }

  function setTranscript(rawText) {
    if (!elements.transcript) return;
    elements.transcript.innerHTML = '';
    if (!rawText?.trim()) return resetTranscriptPlaceholder();

    const cleaned = rawText
      .replace(/\r\n/g, '\n')
      .replace(/\[(applause|cheering|pause|pauses?|(excited|angry|shouts?|laughs?|sighs?|whispers?|calm))\]/gi, '')
      .replace(/\[[^\]]+]/g, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim()
      .replace(/\s+\n|\n\s+/g, '\n');

    if (!cleaned) return resetTranscriptPlaceholder();

    const textFlat = cleaned.replace(/\n+/g, ' ');
    const sentences = textFlat.split(/(?<=[.!?])\s+(?=[A-Z])/).map(s => s.trim()).filter(Boolean);

    if (!sentences.length) {
      elements.transcript.innerHTML = `<p>${cleaned}</p>`;
      return;
    }

    const paragraphs = [];
    const maxPerPara = 3;
    for (let i = 0; i < sentences.length; i += maxPerPara) {
      paragraphs.push(sentences.slice(i, i + maxPerPara).join(' '));
    }
    elements.transcript.innerHTML = paragraphs.map(para => `<p>${para}</p>`).join('');
  }

  function getRandomVideo(shape) {
    const videos = mouthShapes[shape];
    if (!videos?.length) return null;
    let pool = videos.slice();
    const lastUsed = lastVideoByShape[shape];
    if (lastUsed && pool.length > 1) pool = pool.filter(v => v !== lastUsed);
    const candidate = pool[Math.floor(Math.random() * pool.length)];
    lastVideoByShape[shape] = candidate;
    videoHistory.push(candidate);
    if (videoHistory.length > 20) videoHistory.shift();
    return candidate;
  }

  function getSmartMouthShape(freqData, timeData) {
    const volume = timeData.reduce((sum, val) => sum + Math.abs(val - 128), 0) / timeData.length;
    const lowFreq = freqData.slice(0, 8).reduce((a, b) => a + b, 0) / 8;
    const midFreq = freqData.slice(8, 32).reduce((a, b) => a + b, 0) / 24;
    const highFreq = freqData.slice(32, 64).reduce((a, b) => a + b, 0) / 32;
    if (volume < 3) return 'closed';
    if (volume < 8) return highFreq > 45 ? 'narrow' : 'neutral';
    if (volume < 14) return midFreq > 55 ? 'open' : 'neutral';
    if (volume < 20) return midFreq > 65 ? 'open' : (Math.random() < 0.4 ? 'express' : 'wide_open');
    return Math.random() < 0.6 ? 'wide_open' : 'express';
  }

  function syncLipSync(analyser, frequencyData, timeData) {
    if (!currentSpeechAudio || currentSpeechAudio.paused || isCheering) return;
    analyser.getByteFrequencyData(frequencyData);
    analyser.getByteTimeDomainData(timeData);
    const now = Date.now();
    const volumeAvg = frequencyData.reduce((a, b) => a + b, 0) / frequencyData.length;
    let mouthShape = getSmartMouthShape(frequencyData, timeData);
    if (volumeAvg < 1.5) {
      lastLowVolumeTime ||= now;
      if (now - lastLowVolumeTime > 700) mouthShape = 'closed';
    } else {
      lastLowVolumeTime = 0;
    }
    const minSwitchInterval = 110;
    if (now - lastSwitchTime >= minSwitchInterval && mouthShape !== currentMouthShape) {
      const candidate = getRandomVideo(mouthShape);
      if (candidate) {
        switchVideo(`mouth-shapes/${candidate}`, false);
        currentMouthShape = mouthShape;
        lastSwitchTime = now;
      }
    }
    animationFrameId = requestAnimationFrame(() => syncLipSync(analyser, frequencyData, timeData));
  }

  function setupLipSync(audio) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return null;
    const audioCtx = new AudioContextClass();
    const source = audioCtx.createMediaElementSource(audio);
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 256;
    source.connect(analyser);
    analyser.connect(audioCtx.destination);
    const frequencyData = new Uint8Array(analyser.frequencyBinCount);
    const timeData = new Uint8Array(analyser.fftSize);
    audio.onplay = () => {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = requestAnimationFrame(() => syncLipSync(analyser, frequencyData, timeData));
    };
    audio.onpause = audio.onended = () => cancelAnimationFrame(animationFrameId);
    return analyser;
  }

  function playMidCheer(callback) {
    cancelAnimationFrame(animationFrameId);
    isCheering = true;
    const cheerFile = midCheerFiles[Math.floor(Math.random() * midCheerFiles.length)];
    cheerAudio = new Audio(`${ASSET_BASE}${cheerFile}`);
    cheerAudio.volume = isMuted ? 0 : 0.7;
    cheerAudio.play().catch(e => console.warn('Cheer blocked:', e.message));
    setTimeout(() => cheerAudio?.pause(), 6000);
    const pauseVideo = getRandomVideo('closed');
    if (pauseVideo) switchVideo(`mouth-shapes/${pauseVideo}`, false);
    setTimeout(() => {
      isCheering = false;
      callback();
    }, 6000);
  }

  function endSequence() {
    loadEndVideo();
    isIdle = true;
    elements.input && (elements.input.disabled = false);
    elements.input && (elements.input.value = '');
    resetTranscriptPlaceholder();
  }

  function playNext() {
    if (currentIndex >= speechAudios.length) return endSequence();
    currentSpeechAudio = speechAudios[currentIndex];
    if (!currentSpeechAudio) return console.error('No current speech audio');
    currentSpeechAudio.volume = isMuted ? 0 : 1;
    setupLipSync(currentSpeechAudio);
    currentSpeechAudio.play().catch(e => console.warn('Speech play blocked:', e.message));
    currentSpeechAudio.onended = () => {
      currentIndex++;
      if (currentIndex < speechAudios.length) {
        playMidCheer(playNext);
      } else {
        endSequence();
      }
    };
  }

  async function generateSpeech() {
    const prompt = elements.input?.value?.trim();
    if (!prompt || !isIdle) return;
    isIdle = false;
    elements.input && (elements.input.disabled = true);
    playClick();
    elements.loadBar?.classList.add('active');
    elements.loadText?.classList.add('active');
    elements.transcript && (elements.transcript.innerHTML = '<span class="transcript-placeholder">Generating speech…</span>');

    let progress = 0;
    const progressInterval = setInterval(() => {
      progress = Math.min(100, progress + 7);
      elements.loadProgress && (elements.loadProgress.style.width = `${progress}%`);
    }, 260);

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });
      if (!res.ok) {
        const err = await res.text();
        throw new Error(`API error ${res.status}: ${err}`);
      }
      const { audios, transcript } = await res.json();
      if (!audios?.length) throw new Error('No audio chunks returned from API');

      setTranscript(transcript || 'Speech generated (no transcript returned)');
      speechAudios = audios.map(b64 => {
        const a = new Audio(`data:audio/mp3;base64,${b64}`);
        a.preload = 'auto';
        return a;
      });
      currentIndex = 0;
      ambient.volume = isMusicOn ? 0.1 : 0;
      playNext();
    } catch (error) {
      console.error('Generate speech failed:', error.message);
      setTranscript(`Error: ${error.message || 'Could not generate speech'}`);
      loadIdleVideo();
    } finally {
      elements.loadBar?.classList.remove('active');
      elements.loadText?.classList.remove('active');
      clearInterval(progressInterval);
      elements.loadProgress && (elements.loadProgress.style.width = '0%');
      isIdle = true;
      elements.input && (elements.input.disabled = false);
    }
  }

  // Initial setup
  updateMusicUI();
  ensureAmbientPlaying();
  loadIdleVideo();
  resetTranscriptPlaceholder();

  // Event listeners
  elements.pauseBtn?.addEventListener('click', () => {
    playClick();
    unlockMedia();
    if (isCheering && cheerAudio) {
      cheerAudio.paused ? cheerAudio.play().catch(() => {}) : cheerAudio.pause();
    } else if (currentSpeechAudio) {
      currentSpeechAudio.paused ? currentSpeechAudio.play().catch(() => {}) : currentSpeechAudio.pause();
    }
  });

  elements.muteBtn?.addEventListener('click', () => {
    playClick();
    isMuted = !isMuted;
    currentSpeechAudio && (currentSpeechAudio.volume = isMuted ? 0 : 1);
    cheerAudio && (cheerAudio.volume = isMuted ? 0 : 0.7);
  });

  elements.musicToggle?.addEventListener('click', () => {
    playClick();
    isMusicOn = !isMusicOn;
    ambient.volume = isMusicOn ? 0.3 : 0;
    updateMusicUI();
    if (isMusicOn) ensureAmbientPlaying();
  });

  elements.lightningBtn?.addEventListener('click', () => {
    playClick();
    elements.visual?.classList.add('flash-transition');
    setTimeout(() => elements.visual?.classList.remove('flash-transition'), 400);
  });

  elements.diceBtn?.addEventListener('click', () => {
    playClick();
    const topic = randomTopics[Math.floor(Math.random() * randomTopics.length)];
    elements.input && (elements.input.value = `Give a presidential speech about ${topic}.`);
    generateSpeech();
  });

  elements.stopBtn?.addEventListener('click', () => {
    playClick();
    currentSpeechAudio?.pause();
    currentSpeechAudio && (currentSpeechAudio.currentTime = 0);
    cheerAudio?.pause();
    cheerAudio && (cheerAudio.currentTime = 0);
    cancelAnimationFrame(animationFrameId);
    loadIdleVideo();
    ambient.volume = isMusicOn ? 0.3 : 0;
    isCheering = false;
    isIdle = true;
    elements.input && (elements.input.disabled = false);
    currentIndex = speechAudios.length;
    resetTranscriptPlaceholder();
  });

  elements.input?.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      generateSpeech();
      unlockMedia();
    }
  });

  // Realistic loading bar animation (non-linear, more natural feel)
  const fakeLoadPulse = () => {
    if (elements.loadBar?.classList.contains('active')) {
      let p = 0;
      const int = setInterval(() => {
        p += Math.random() * 10 + 4; // Random increment for realism
        if (p > 98) p = 98;
        elements.loadProgress.style.width = `${p}%`;
        if (p >= 98) clearInterval(int);
      }, 220);
    }
  };

  // Hook into load bar activation
  const origAdd = elements.loadBar?.classList.add;
  if (origAdd) {
    elements.loadBar.classList.add = function(...args) {
      origAdd.apply(this, args);
      if (args.includes('active')) fakeLoadPulse();
    };
  }
});
