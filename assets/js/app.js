const GITHUB_BASE = 'https://raw.githubusercontent.com/cybergod-duck/donald.ai/main/';

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
  transcriptEl: document.getElementById('transcript'),
  musicToggle: document.getElementById('music-toggle'),
  musicIndicator: document.querySelector('.music-indicator'),
  musicIcon: document.getElementById('music-icon'),
};

const clickSound = new Audio(GITHUB_BASE + 'click.mp3');
const ambient = new Audio(GITHUB_BASE + 'drone.mp3');
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

const mouthShapes = {
  closed: ['pause1.mp4', 'pause2.mp4', 'pause3.mp4', 'pause4.mp4', 'pause5.mp4'],
  narrow: ['1.mp4', '2.mp4', '3.mp4', '4.mp4'],
  neutral: ['5.mp4', '6.mp4', '7.mp4', '8.mp4'],
  open: ['9.mp4', '10.mp4', '11.mp4', '12.mp4', '13.mp4', '14.mp4'],
  wide_open: ['wide1.mp4', 'wide2.mp4', 'wide3.mp4', 'wide4.mp4', 'wide5.mp4'],
  express: ['express1.mp4', 'express2.mp4', 'express3.mp4', 'express4.mp4', 'express5.mp4', 'express6.mp4'],
};

const midCheerFiles = ['cheer1.mp3', 'cheer3.mp3', 'cheer4.mp3', 'cheer5.mp3'];

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
  try {
    clickSound.currentTime = 0;
    clickSound.play().catch(() => {});
  } catch (_) {}
}

function updateMusicUI() {
  elements.musicToggle.classList.toggle('music-on', isMusicOn);
  elements.musicIndicator.classList.toggle('music-on', isMusicOn);
  elements.musicIcon.src = GITHUB_BASE + (isMusicOn ? 'note-on.png' : 'note-off.png');
}

async function ensureAmbientPlaying() {
  try {
    await ambient.play();
  } catch (_) {}
}

function switchVideo(videoFile, loop = false) {
  if (!videoFile) return;
  const targetSrc = GITHUB_BASE + videoFile;
  if (elements.visual.src === targetSrc) {
    return;
  }
  elements.visual.style.opacity = 1;
  elements.visual.loop = loop;
  elements.visual.muted = true;
  elements.visual.src = targetSrc;
  elements.visual.load();
  elements.visual.onloadedmetadata = () => {
    elements.visual.currentTime = 0;
    elements.visual.play().catch(() => {});
    elements.visual.style.opacity = 1;
  };
}

function loadIdleVideo() {
  switchVideo('idle.mp4', true);
  currentMouthShape = 'closed';
  videoHistory = [];
  lastVideoByShape = {};
}

function loadEndVideo() {
  switchVideo('end.mp4', false);
  elements.visual.onloadedmetadata = () => {
    const duration = elements.visual.duration || 0;
    if (duration > 4) {
      setTimeout(() => {
        cheerAudio = new Audio(GITHUB_BASE + 'cheer2.mp3');
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
  elements.transcriptEl.innerHTML = '';
  const span = document.createElement('span');
  span.className = 'transcript-placeholder';
  span.textContent = 'Your speech text will appear here.';
  elements.transcriptEl.appendChild(span);
}

function setTranscript(rawText) {
  elements.transcriptEl.innerHTML = '';
  if (!rawText || !rawText.trim()) {
    resetTranscriptPlaceholder();
    return;
  }

  let cleaned = String(rawText)
    .replace(/\r\n/g, '\n')
    .replace(/\[applause]/gi, '')
    .replace(/\[cheering]/gi, '')
    .replace(/\[pause]/gi, '')
    .replace(/\[pauses?]/gi, '')
    .replace(/\[(excited|angry|shouts?|laughs?|sighs?|whispers?|calm)\]/gi, '')
    .replace(/\[[^\]]+]/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  if (!cleaned) {
    resetTranscriptPlaceholder();
    return;
  }

  cleaned = cleaned.replace(/\s+\n/g, '\n').replace(/\n\s+/g, '\n');
  const textFlat = cleaned.replace(/\n+/g, ' ');
  const sentences = textFlat
    .split(/(?<=[.!?])\s+(?=[A-Z])/)
    .map(s => s.trim())
    .filter(Boolean);

  if (!sentences.length) {
    const p = document.createElement('p');
    p.textContent = cleaned;
    elements.transcriptEl.appendChild(p);
    return;
  }

  const paragraphSentences = [];
  const maxSentencesPerParagraph = 3;
  let currentGroup = [];

  sentences.forEach((s) => {
    currentGroup.push(s);
    if (currentGroup.length >= maxSentencesPerParagraph) {
      paragraphSentences.push(currentGroup.join(' '));
      currentGroup = [];
    }
  });

  if (currentGroup.length) {
    paragraphSentences.push(currentGroup.join(' '));
  }

  paragraphSentences.forEach((para) => {
    const p = document.createElement('p');
    p.textContent = para;
    elements.transcriptEl.appendChild(p);
  });
}

function getRandomVideo(shape) {
  const videos = mouthShapes[shape];
  if (!videos || !videos.length) return null;
  let pool = videos.slice();
  const lastUsed = lastVideoByShape[shape];
  if (lastUsed && pool.length > 1) {
    pool = pool.filter(v => v !== lastUsed);
  }
  const candidate = pool[Math.floor(Math.random() * pool.length)];
  lastVideoByShape[shape] = candidate;
  videoHistory.push(candidate);
  if (videoHistory.length > 20) {
    videoHistory.shift();
  }
  return candidate;
}

function getSmartMouthShape(freqData, timeData) {
  const volumeSum = timeData.reduce((sum, val) => sum + Math.abs(val - 128), 0);
  const volume = volumeSum / timeData.length;
  const lowFreq = freqData.slice(0, 8).reduce((a, b) => a + b, 0) / 8;
  const midFreq = freqData.slice(8, 32).reduce((a, b) => a + b, 0) / 24;
  const highFreq = freqData.slice(32, 64).reduce((a, b) => a + b, 0) / 32;

  if (volume < 3) {
    return 'closed';
  }
  if (volume < 8) {
    return highFreq > 45 ? 'narrow' : 'neutral';
  }
  if (volume < 14) {
    return midFreq > 55 ? 'open' : 'neutral';
  }
  if (volume < 20) {
    return midFreq > 65 ? 'open' : (Math.random() < 0.4 ? 'express' : 'wide_open');
  }
  return Math.random() < 0.6 ? 'wide_open' : 'express';
}

function syncLipSync(analyser, frequencyData, timeData) {
  if (!currentSpeechAudio || currentSpeechAudio.paused || isCheering) {
    return;
  }
  analyser.getByteFrequencyData(frequencyData);
  analyser.getByteTimeDomainData(timeData);
  const now = Date.now();
  const volumeAvg = frequencyData.reduce((a, b) => a + b, 0) / frequencyData.length;
  let mouthShape = getSmartMouthShape(frequencyData, timeData);

  if (volumeAvg < 1.5) {
    lastLowVolumeTime ||= now;
    if (now - lastLowVolumeTime > 700) {
      mouthShape = 'closed';
    }
  } else {
    lastLowVolumeTime = 0;
  }

  const minSwitchInterval = 110;
  if (now - lastSwitchTime >= minSwitchInterval || mouthShape !== currentMouthShape) {
    const candidate = getRandomVideo(mouthShape);
    if (candidate) {
      switchVideo(candidate, false);
      currentMouthShape = mouthShape;
      lastSwitchTime = now;
    }
  }

  animationFrameId = requestAnimationFrame(
    () => syncLipSync(analyser, frequencyData, timeData)
  );
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
    animationFrameId = requestAnimationFrame(
      () => syncLipSync(analyser, frequencyData, timeData)
    );
  };

  audio.onpause = () => {
    cancelAnimationFrame(animationFrameId);
  };

  audio.onended = () => {
    cancelAnimationFrame(animationFrameId);
  };

  return analyser;
}

function playMidCheer(callback) {
  cancelAnimationFrame(animationFrameId);
  isCheering = true;
  const cheerFile = midCheerFiles[Math.floor(Math.random() * midCheerFiles.length)];
  cheerAudio = new Audio(GITHUB_BASE + cheerFile);
  cheerAudio.volume = isMuted ? 0 : 0.7;
  cheerAudio.play().catch(() => {});

  setTimeout(() => {
    try {
      cheerAudio.pause();
    } catch (_) {}
  }, 6000);

  const pauseVideo = getRandomVideo('closed');
  if (pauseVideo) {
    switchVideo(pauseVideo, false);
  }

  setTimeout(() => {
    isCheering = false;
    callback();
  }, 6000);
}

function endSequence() {
  loadEndVideo();
  isIdle = true;
  elements.input.disabled = false;
  elements.input.value = '';
}

function playNext() {
  if (currentIndex >= speechAudios.length) {
    endSequence();
    return;
  }

  currentSpeechAudio = speechAudios[currentIndex];
  currentSpeechAudio.volume = isMuted ? 0 : 1;
  setupLipSync(currentSpeechAudio);
  currentSpeechAudio.play().catch(() => {});

  currentSpeechAudio.onended = () => {
    currentIndex += 1;
    if (currentIndex < speechAudios.length) {
      playMidCheer(() => playNext());
    } else {
      endSequence();
    }
  };
}

async function generateSpeech() {
  const prompt = elements.input.value.trim();
  if (!prompt || !isIdle) return;

  isIdle = false;
  elements.input.disabled = true;
  playClick();
  elements.loadBar.classList.add('active');
  elements.loadText.classList.add('active');
  elements.transcriptEl.innerHTML = '<span class="transcript-placeholder">Generating speech…</span>';

  let progress = 0;
  const progressInterval = setInterval(() => {
    progress = Math.min(100, progress + 7);
    elements.loadProgress.style.width = progress + '%';
  }, 260);

  try {
    const res = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`API failed: ${res.status} – ${text}`);
    }

    const { audios, transcript } = await res.json();

    if (!audios || !audios.length) {
      throw new Error('No audio generated from API');
    }

    setTranscript(transcript || '');
    elements.loadBar.classList.remove('active');
    elements.loadText.classList.remove('active');
    clearInterval(progressInterval);
    elements.loadProgress.style.width = '0%';

    speechAudios = audios.map((b64) => new Audio(`data:audio/mp3;base64,${b64}`));
    currentIndex = 0;
    ambient.volume = isMusicOn ? 0.1 : 0;
    playNext();
  } catch (error) {
    console.error('Speech generation error:', error);
    setTranscript('Error: Could not generate speech.');
    elements.loadBar.classList.remove('active');
    elements.loadText.classList.remove('active');
    clearInterval(progressInterval);
    elements.loadProgress.style.width = '0%';
    isIdle = true;
    elements.input.disabled = false;
  }
}

// Initial setup
updateMusicUI();
ensureAmbientPlaying();
loadIdleVideo();

// UI handlers
elements.pauseBtn.onclick = () => {
  playClick();
  if (isCheering && cheerAudio) {
    if (cheerAudio.paused) cheerAudio.play().catch(() => {});
    else cheerAudio.pause();
  } else if (currentSpeechAudio) {
    if (currentSpeechAudio.paused) currentSpeechAudio.play().catch(() => {});
    else currentSpeechAudio.pause();
  }
};

elements.muteBtn.onclick = () => {
  playClick();
  isMuted = !isMuted;
  if (currentSpeechAudio) currentSpeechAudio.volume = isMuted ? 0 : 1;
  if (cheerAudio) cheerAudio.volume = isMuted ? 0 : 0.7;
};

elements.musicToggle.onclick = () => {
  playClick();
  isMusicOn = !isMusicOn;
  ambient.volume = isMusicOn ? 0.3 : 0;
  updateMusicUI();
  if (isMusicOn) ensureAmbientPlaying();
};

elements.lightningBtn.onclick = () => {
  playClick();
  elements.visual.classList.add('flash-transition');
  setTimeout(() => elements.visual.classList.remove('flash-transition'), 400);
};

elements.diceBtn.onclick = () => {
  playClick();
  const topic = randomTopics[Math.floor(Math.random() * randomTopics.length)];
  elements.input.value = `Give a presidential speech about ${topic}.`;
  generateSpeech();
};

elements.stopBtn.onclick = () => {
  playClick();
  if (currentSpeechAudio) {
    try {
      currentSpeechAudio.pause();
      currentSpeechAudio.currentTime = 0;
    } catch (_) {}
  }
  if (cheerAudio) {
    try {
      cheerAudio.pause();
      cheerAudio.currentTime = 0;
    } catch (_) {}
  }
  cancelAnimationFrame(animationFrameId);
  loadIdleVideo();
  ambient.volume = isMusicOn ? 0.3 : 0;
  isCheering = false;
  isIdle = true;
  elements.input.disabled = false;
  currentIndex = speechAudios.length;
};

elements.input.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    generateSpeech();
  }
});
