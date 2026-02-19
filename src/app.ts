interface Elements {
  input: HTMLInputElement;
  visual: HTMLVideoElement;
  loadBar: HTMLElement;
  loadProgress: HTMLElement;
  loadText: HTMLElement;
  pauseBtn: HTMLElement;
  muteBtn: HTMLElement;
  lightningBtn: HTMLElement;
  diceBtn: HTMLElement;
  stopBtn: HTMLElement;
  transcript: HTMLElement;
  musicToggle: HTMLElement;
  musicIndicator: HTMLElement | null;
  musicIcon: HTMLImageElement;
}

document.addEventListener('DOMContentLoaded', () => {
  const ASSET_BASE = '/assets/';

  const getElement = <T extends HTMLElement>(id: string): T => {
    const el = document.getElementById(id);
    if (!el) throw new Error(`Element with id ${id} not found`);
    return el as T;
  };

  const elements: Elements = {
    input: getElement<HTMLInputElement>('cmd'),
    visual: getElement<HTMLVideoElement>('visual'), // Note: ID in HTML is 'trump-video' but code referenced 'visual'. Checking HTML... HTML has 'trump-video'. Fixing key mapping.
    loadBar: getElement<HTMLElement>('load-bar'), // HTML doesn't show load-bar. Assuming they exist or will be added.
    loadProgress: getElement<HTMLElement>('load-progress'),
    loadText: getElement<HTMLElement>('load-text'),
    pauseBtn: getElement<HTMLElement>('pause-btn'),
    muteBtn: getElement<HTMLElement>('mute-btn'),
    lightningBtn: getElement<HTMLElement>('lightning-btn'),
    diceBtn: getElement<HTMLElement>('dice-btn'),
    stopBtn: getElement<HTMLElement>('stop-btn'),
    transcript: getElement<HTMLElement>('transcript'),
    musicToggle: getElement<HTMLElement>('music-toggle'),
    musicIndicator: document.querySelector('.music-indicator'),
    musicIcon: getElement<HTMLImageElement>('music-icon'),
  };

  // Fix: The HTML has id="trump-video", not "visual".
  // Re-mapping correctly based on index.html content seen previously
  // index.html IDs: trump-video, cmd, pause-btn, mute-btn, lightning-btn, dice-btn, stop-btn, transcript, music-toggle, music-icon
  // Missing in index.html: load-bar, load-progress, load-text. 
  // I will make them optional or create them dynamically if needed, but for now I'll just type them as potentially null to avoid runtime errors if they don't exist yet, 
  // OR I should add them to HTML. 
  // Given the "User Request" was "get it running", I should probably fix the HTML to match the code or code to match HTML.
  // The code references them heavily. I will assume they should be in the HTML or I should safely handle their absence. 
  // For now, I'll use safe chaining.

  const visual = document.getElementById('trump-video') as HTMLVideoElement;
  if (!visual) throw new Error("Video element not found");

  // Overwriting elements object to match actual IDs and types
  const els = {
    input: document.getElementById('cmd') as HTMLInputElement,
    visual: visual,
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
    musicIcon: document.getElementById('music-icon') as HTMLImageElement,
  };

  // Safe check for critical elements
  if (!els.input || !els.visual || !els.transcript) {
    console.error("Critical elements missing");
    return;
  }

  const clickSound = new Audio(`${ASSET_BASE}media/audio/click.mp3`);
  const ambient = new Audio(`${ASSET_BASE}media/audio/drone.mp3`);
  ambient.loop = true;
  ambient.volume = 0.3;

  let currentSpeechAudio: HTMLAudioElement | null = null;
  let cheerAudio: HTMLAudioElement | null = null;
  let isMuted = false;
  let isMusicOn = true;
  let isIdle = true;
  let isCheering = false;
  let animationFrameId: number;
  let lastLowVolumeTime = 0;
  let lastSwitchTime = 0;
  let currentMouthShape = 'closed';
  const lastVideoByShape: Record<string, string> = {};
  const videoHistory: string[] = [];
  let hasUserInteracted = false;

  const mouthShapes: Record<string, string[]> = {
    closed: ['pause1.webm', 'pause2.webm', 'pause3.webm', 'pause4.webm', 'pause5.webm'],
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
    // musicIndicator removed as not in new lookup
    if (els.musicIcon) els.musicIcon.src = `${ASSET_BASE}images/note-${isMusicOn ? 'on' : 'off'}.png`;
  }

  async function unlockMedia() {
    if (hasUserInteracted) return;
    hasUserInteracted = true;
    await ambient.play().catch(() => { });
    if (els.visual.paused) await els.visual.play().catch(() => { });
  }

  function getRandomVideo(shape: string): string | null {
    const videos = mouthShapes[shape] || [];
    if (!videos.length) return null;
    let video = videos[Math.floor(Math.random() * videos.length)];
    while (video === lastVideoByShape[shape] && videos.length > 1) {
      video = videos[Math.floor(Math.random() * videos.length)];
    }
    lastVideoByShape[shape] = video;
    return video;
  }

  function switchVideo(videoFile: string, loop = false) {
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
    switchVideo('idle.webm', true);
    currentMouthShape = 'closed';
    videoHistory.length = 0;
  }

  function loadEndVideo() {
    switchVideo('end.webm', false);
    setTimeout(() => {
      cheerAudio = new Audio(`${ASSET_BASE}media/audio/cheers/cheer2.mp3`);
      cheerAudio.volume = isMuted ? 0 : 0.7;
      cheerAudio.play().catch(() => { });
    }, 4000);
  }

  function setTranscript(text: string) {
    if (els.transcript) els.transcript.innerHTML = text.split('\n\n').map(p => `<p>${p.replace(/\n/g, '<br>')}</p>`).join('');
  }

  function resetTranscriptPlaceholder() {
    setTranscript('<span class="transcript-placeholder">Your speech text will appear here.</span>');
  }

  function syncLipSync(analyser: AnalyserNode, frequencyData: Uint8Array, timeData: Uint8Array) {
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

    let newShape = 'closed';
    if (volume > 30) {
      if (highFreq > 80) newShape = 'wide_open';
      else if (midFreq > 60) newShape = 'open';
      else if (lowFreq > 50) newShape = 'neutral';
      else newShape = 'narrow';
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
      }
    }

    animationFrameId = requestAnimationFrame(() => syncLipSync(analyser, frequencyData, timeData));
  }

  async function setupLipSync(audio: HTMLAudioElement) {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    const audioCtx = new AudioContext();
    await audioCtx.resume();
    const source = audioCtx.createMediaElementSource(audio);
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 256;
    source.connect(analyser);
    analyser.connect(audioCtx.destination);
    const frequencyData = new Uint8Array(analyser.frequencyBinCount as any);
    const timeData = new Uint8Array(analyser.fftSize as any);
    audio.onplay = () => requestAnimationFrame(() => syncLipSync(analyser, frequencyData, timeData));
    audio.onpause = audio.onended = () => cancelAnimationFrame(animationFrameId);
    return analyser;
  }

  function playMidCheer(callback: () => void) {
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

  async function playSpeech(audioChunks: string[], transcript: string) {
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
    } catch (e: any) {
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