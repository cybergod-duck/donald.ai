// OPTIMIZED APP.JS - Donald.AI Client
// Performance: Modular functions, cached DOM, reduced globals
// Readability: ES6 patterns, descriptive naming, utility extraction
// Robustness: Error handling, media unlocking, validation

document.addEventListener('DOMContentLoaded', () => {
    const ASSET_BASE = '/assets/media/';

      // Audio Elements
  const clickSound = new Audio(`${ASSET_BASE}audio/click.mp3`);
  const ambient = new Audio(`${ASSET_BASE}audio/Drone.mp3`);
  ambient.loop = true;
  
  // Cache all DOM elements upfront
  const elements = {
    input: document.getElementById('cmd'),
    visual: document.getElementById('visual'),
    loadBar: document.getElementById('load-bar'),
    loadProgress: document.getElementById('load-progress'),
    loadText: document.getElementById('load-text'),
    pauseBtn: document.getElementById('pause-btn'),
    muteBtn: document.getElementById('mute-btn'),
    lightningBtn: document.getElementById('lightning-btn'),
    diceBtn: document.getElementById('dice-btn'),
    stopBtn: document.getElementById('stop-btn'),
    transcript: document.getElementById('transcript'),
    musicToggle: document.getElementById('music-toggle'),
    musicIndicator: document.querySelector('.music-indicator'),
    musicIcon: document.getElementById('music-icon'),
    matrixCanvas: document.getElementById('matrix')
  };

  // Audio initialization
  const clickSound = new Audio(`${ASSET_BASE}audio/click.mp3`);
  const ambient = new Audio(`${ASSET_BASE}audio/Drone.mp3`);
  ambient.loop = true;
  ambient.volume = 0.3;

  // State management
  let currentSpeechAudio = null;
  let cheerAudio = null;
  let isMuted = false;
  let isMusicOn = true;
  let isIdle = true;
  let isCheering = false;
  let animationFrameId = null;
  let hasUserInteracted = false;

  // Asset arrays
  const mouthShapes = {
    closed: ['pause1.webm', 'pause2.webm', 'pause3.webm', 'pause4.webm', 'pause5.webm'],
    narrow: ['1.webm', '2.webm', '3.webm', '4.webm'],
    neutral: ['5.webm', '6.webm', '7.webm', '8.webm'],
    open: ['9.webm', '10.webm', '11.webm', '12.webm', '13.webm', '14.webm'],
    wideopen: ['wide1.webm', 'wide2.webm', 'wide3.webm', 'wide4.webm', 'wide5.webm'],
    express: ['express1.webm', 'express2.webm', 'express3.webm', 'express4.webm', 'express5.webm', 'express6.webm']
  };

  const midCheerFiles = [
    'media/audio/cheers/cheer1.mp3',
    'media/audio/cheers/cheer3.mp3',
    'media/audio/cheers/cheer4.mp3',
    'media/audio/cheers/cheer5.mp3'
  ];

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
    'education, school choice, and parents rights',
    'the national debt and government spending',
    'crime, policing, and public safety',


    'infrastructure, roads, and beautiful new airports'
  ];

  // Utility Functions
  function playClick() {
    if (hasUserInteracted && !isMuted) {
      clickSound.play().catch(() => {});
    }
  }

  function updateMusicUI() {
    elements.musicIcon.src = isMusicOn 
      ? /assets/images/note-on.png` 
      : /assets/images/note-off.png`;
    elements.musicIndicator.classList.toggle('active', isMusicOn);
  }

  function unlockMedia() {
    hasUserInteracted = true;
    ambient.play().catch(() => {});
    document.removeEventListener('click', unlockMedia);
    document.removeEventListener('keydown', unlockMedia);
  }

  function loadIdleVideo() {
    elements.visual.src = `${ASSET_BASE}video/special/idle.webm`;
    elements.visual.play().catch(() => {});
    isIdle = true;
  }

  function endSequence() {
    elements.visual.src = `${ASSET_BASE}video/special/end.webm`;
    elements.visual.play().catch(() => {});
    elements.input.disabled = false;
    elements.loadBar.classList.remove('active');
    elements.loadText.classList.remove('active');
    elements.loadProgress.style.width = '0%';
  }

  function resetTranscriptPlaceholder() {
    setTranscript('<span class="transcript-placeholder">Your speech text will appear here.</span>');
  }

  function setTranscript(content) {
    elements.transcript.innerHTML = content;
  }

  async function playSpeech(audios, transcript) {
    // Simplified placeholder - expand with full lip-sync logic
    for (const audioBase64 of audios) {
      currentSpeechAudio = new Audio(`data:audio/mp3;base64,${audioBase64}`);
      currentSpeechAudio.volume = isMuted ? 0 : 1;
      await currentSpeechAudio.play();
    }
    endSequence();
  }

  function initMatrixAnimation() {
    const ctx = elements.matrixCanvas.getContext('2d');
    elements.matrixCanvas.width = window.innerWidth;
    elements.matrixCanvas.height = window.innerHeight;
    
    const columns = Math.floor(elements.matrixCanvas.width / 14);
    const drops = Array(columns).fill(1);
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'.split('');

    function draw() {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
      ctx.fillRect(0, 0, elements.matrixCanvas.width, elements.matrixCanvas.height);
      ctx.fillStyle = '#0F0';
      ctx.font = '14px monospace';
      
      drops.forEach((y, i) => {
        const text = letters[Math.floor(Math.random() * letters.length)];
        ctx.fillText(text, i * 14, y * 14);
        if (y * 14 > elements.matrixCanvas.height && Math.random() > 0.975) {
          drops[i] = 0;
        }
        drops[i]++;
      });
    }
    
    setInterval(draw, 35);
  }

  async function generateSpeech() {
    const prompt = elements.input.value.trim();
    if (!prompt) return;

    elements.input.disabled = true;
    elements.loadBar.classList.add('active');
    elements.loadText.classList.add('active');
    setTranscript('<span class="transcript-placeholder">Generating speech...</span>');

    let progress = 0;
    const interval = setInterval(() => {
      progress = Math.min(100, progress + Math.random() * 10 + 4);
      elements.loadProgress.style.width = `${progress}%`;
    }, 220);

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt })
      });

      if (!res.ok) throw new Error(await res.text() || 'API request failed');
      
      const { audios, transcript } = await res.json();
      if (!audios?.length) throw new Error('No audio generated');

      setTranscript(transcript);
      ambient.volume = isMusicOn ? 0.1 : 0;
      await playSpeech(audios, transcript);
    } catch (e) {
      console.error('Speech generation error:', e);
      setTranscript(`Error: ${e.message}`);
      endSequence();
    } finally {
      clearInterval(interval);
    }
  }

  // Event Listeners
  document.addEventListener('click', unlockMedia, { once: true });
  document.addEventListener('keydown', unlockMedia, { once: true });

  // Initialize
  updateMusicUI();
  ambient.play().catch(() => {});
  loadIdleVideo();
  resetTranscriptPlaceholder();
  initMatrixAnimation();

  // Button Controls
  elements.pauseBtn.addEventListener('click', () => {
    playClick();
    const audio = isCheering ? cheerAudio : currentSpeechAudio;
    if (audio) {
      audio.paused ? audio.play().catch(() => {}) : audio.pause();
    }
  });

  elements.muteBtn.addEventListener('click', () => {
    playClick();
    isMuted = !isMuted;
    if (currentSpeechAudio) currentSpeechAudio.volume = isMuted ? 0 : 1;
    if (cheerAudio) cheerAudio.volume = isMuted ? 0 : 0.7;
  });

  elements.musicToggle.addEventListener('click', () => {
    playClick();
    isMusicOn = !isMusicOn;
    ambient.volume = isMusicOn ? 0.3 : 0;
    updateMusicUI();
  });

  elements.lightningBtn.addEventListener('click', () => {
    playClick();
    elements.visual.classList.add('flash-transition');
    setTimeout(() => elements.visual.classList.remove('flash-transition'), 400);
  });

  elements.diceBtn.addEventListener('click', () => {
    playClick();
    const topic = randomTopics[Math.floor(Math.random() * randomTopics.length)];
    elements.input.value = `Give a presidential speech about ${topic}.`;
    generateSpeech();
  });

  elements.stopBtn.addEventListener('click', () => {
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
    elements.input.disabled = false;
    resetTranscriptPlaceholder();
    elements.loadBar.classList.remove('active');
    elements.loadText.classList.remove('active');
    elements.loadProgress.style.width = '0%';
  });

  elements.input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      generateSpeech();
    }
  });
});
ASSET_BASE