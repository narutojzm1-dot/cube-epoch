import { ERA_MUSIC } from "./data.js";
import { rand, rnd, state } from "./core.js";
import { btnMute } from "./ui.js";

export let audioCtx = null;

export let musicOn = true;
export let sfxOn = true;
export let musicGain = null;
export let musicPad = null;
export let musicPadGain = null;

export function ensureMusicPad() {
  try {
  if (!audioCtx || !musicGain || musicPad) return;
  const filter = audioCtx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 480;
  musicPad = audioCtx.createOscillator();
  musicPadGain = audioCtx.createGain();
  musicPad.type = "sine";
  musicPad.frequency.value = 131;
  musicPadGain.gain.value = musicOn ? 0.05 : 0;
  musicPad.connect(filter);
  filter.connect(musicPadGain);
  musicPadGain.connect(musicGain);
  musicPad.start();
  } catch (_) { /* No audio device: keep gameplay running silently. */ }
}

export function setMusicLevel() {
  if (musicGain) musicGain.gain.value = musicOn ? 0.26 : 0;
  if (musicPadGain) musicPadGain.gain.value = musicOn ? 0.05 : 0;
}

export function ensureAudio() {
  try {
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!audioCtx) audioCtx = new AC();
  if (audioCtx.state === "suspended") audioCtx.resume();
  if (!musicGain) {
    musicGain = audioCtx.createGain();
    musicGain.gain.value = musicOn ? 0.26 : 0;
    musicGain.connect(audioCtx.destination);
  }
  ensureMusicPad();
  } catch (_) { /* No audio device: keep gameplay running silently. */ }
}

export function beep(freq, dur, type, vol) {
  try {
  if (!audioCtx || !sfxOn) return;
  const o = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  o.type = type || "square";
  o.frequency.value = freq;
  g.gain.value = vol || 0.04;
  g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + dur);
  o.connect(g);
  g.connect(audioCtx.destination);
  o.start();
  o.stop(audioCtx.currentTime + dur);
  } catch (_) { /* No audio device: keep gameplay running silently. */ }
}

export function noise(dur, vol, freq) {
  try {
  if (!audioCtx || !sfxOn) return;
  const n = Math.max(1, Math.floor(audioCtx.sampleRate * dur));
  const buf = audioCtx.createBuffer(1, n, audioCtx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < n; i++) data[i] = (rnd("fx") * 2 - 1) * (1 - i / n);
  const src = audioCtx.createBufferSource();
  src.buffer = buf;
  const f = audioCtx.createBiquadFilter();
  f.type = "lowpass";
  f.frequency.value = freq || 900;
  const g = audioCtx.createGain();
  g.gain.value = vol || 0.08;
  src.connect(f);
  f.connect(g);
  g.connect(audioCtx.destination);
  src.start();
  } catch (_) { /* No audio device: keep gameplay running silently. */ }
}

export function footstep() {
  noise(0.05, 0.045, 500);
  beep(90 + rand("fx", 30), 0.04, "square", 0.02);
}

export function chopSound() {
  noise(0.08, 0.1, 1400);
  beep(180, 0.06, "sawtooth", 0.05);
  beep(320, 0.08, "triangle", 0.04);
}

export function hitSound() {
  noise(0.05, 0.07, 1800);
  beep(140, 0.05, "square", 0.045);
}

export function playMusicPulse() {
  try {
  if (!audioCtx || !musicOn || !state || state.paused || state.over) return;
  ensureMusicPad();
  const day = [262, 330, 392, 330, 392, 523, 494, 392];
  const night = [196, 233, 262, 247, 220, 196, 175, 196];
  const seq = state.day ? day : night;
  const step = (state.musicStep || 0) % seq.length;
  const em = ERA_MUSIC[(state.era - 1) % ERA_MUSIC.length];
  const bar = Math.floor((state.musicStep || 0) / seq.length) % em.progression.length;
  const shift = Math.pow(2, em.transpose / 12) * em.progression[bar];
  const root = (state.day ? 131 : 98) * shift;
  if (musicPad) {
    musicPad.frequency.setTargetAtTime(root, audioCtx.currentTime, 0.12);
  }
  const o = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  o.type = "triangle";
  o.frequency.value = seq[step] * shift;
  g.gain.setValueAtTime(0.12, audioCtx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.58);
  o.connect(g);
  g.connect(musicGain);
  o.start();
  o.stop(audioCtx.currentTime + 0.58);
  const b = audioCtx.createOscillator();
  const bg = audioCtx.createGain();
  b.type = "square";
  b.frequency.value = root * (step % 4 === 2 ? 0.75 : 1);
  bg.gain.setValueAtTime(0.035, audioCtx.currentTime);
  bg.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.42);
  b.connect(bg);
  bg.connect(musicGain);
  b.start();
  b.stop(audioCtx.currentTime + 0.42);
  } catch (_) { /* No audio device: keep gameplay running silently. */ }
}

export function audioLabel() {
  if (musicOn && sfxOn) return "声音开";
  if (sfxOn) return "仅音效";
  return "静音";
}

export function cycleAudio() {
  if (musicOn && sfxOn) {
    musicOn = false;
    sfxOn = true;
  } else if (!musicOn && sfxOn) {
    musicOn = false;
    sfxOn = false;
  } else {
    musicOn = true;
    sfxOn = true;
  }
  setMusicLevel();
  if (btnMute) btnMute.textContent = audioLabel();
}
