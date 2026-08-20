import { getAudio, getMaster } from "./audio";

export type SceneId = "rain" | "cafe" | "noise" | "pink";
export type Mixer = Record<SceneId, number>; // 0..100 per scene, scenes layer

type Src = AudioScheduledSourceNode;

let sources: Src[] = [];
let timers: number[] = [];
let nodes: AudioNode[] = [];
let bus: GainNode | null = null;
let live = false; // true while the running timer owns the ambience
let previewTimer: number | null = null;

function whiteBuffer(ac: AudioContext, seconds = 2) {
  const buf = ac.createBuffer(1, ac.sampleRate * seconds, ac.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return buf;
}

function pinkBuffer(ac: AudioContext, seconds = 2) {
  const buf = ac.createBuffer(1, ac.sampleRate * seconds, ac.sampleRate);
  const d = buf.getChannelData(0);
  let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
  for (let i = 0; i < d.length; i++) {
    const w = Math.random() * 2 - 1;
    b0 = 0.99886 * b0 + w * 0.0555179;
    b1 = 0.99332 * b1 + w * 0.0750759;
    b2 = 0.969 * b2 + w * 0.153852;
    b3 = 0.8665 * b3 + w * 0.3104856;
    b4 = 0.55 * b4 + w * 0.5329522;
    b5 = -0.7616 * b5 - w * 0.016898;
    d[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11;
    b6 = w * 0.115926;
  }
  return buf;
}

function brownBuffer(ac: AudioContext, seconds = 2) {
  const buf = ac.createBuffer(1, ac.sampleRate * seconds, ac.sampleRate);
  const d = buf.getChannelData(0);
  let last = 0;
  for (let i = 0; i < d.length; i++) {
    const w = Math.random() * 2 - 1;
    last = (last + 0.02 * w) / 1.02;
    d[i] = last * 3.5;
  }
  return buf;
}

const bp = (ac: AudioContext, freq: number, q: number) => {
  const f = ac.createBiquadFilter();
  f.type = "bandpass";
  f.frequency.value = freq;
  f.Q.value = q;
  return f;
};
const lp = (ac: AudioContext, freq: number) => {
  const f = ac.createBiquadFilter();
  f.type = "lowpass";
  f.frequency.value = freq;
  return f;
};
const hp = (ac: AudioContext, freq: number) => {
  const f = ac.createBiquadFilter();
  f.type = "highpass";
  f.frequency.value = freq;
  return f;
};

function layer(ac: AudioContext, buffer: AudioBuffer, filter: BiquadFilterNode, gainV: number) {
  const g = ac.createGain();
  g.gain.value = gainV;
  const src = ac.createBufferSource();
  src.buffer = buffer;
  src.loop = true;
  src.connect(filter);
  filter.connect(g);
  g.connect(bus!);
  src.start();
  sources.push(src);
  nodes.push(filter, g);
  return g;
}

export function setMixerVolume(v: number) {
  const ac = getAudio();
  if (bus && ac) bus.gain.setTargetAtTime(Math.min(1, Math.max(0, v)) * 0.9, ac.currentTime, 0.15);
}

function teardown() {
  timers.forEach((t) => window.clearInterval(t));
  timers = [];
  const ac = getAudio();
  const dyingBus = bus;
  const dyingSources = sources;
  const dyingNodes = nodes;
  bus = null;
  sources = [];
  nodes = [];
  if (dyingBus) {
    if (ac) dyingBus.gain.setTargetAtTime(0, ac.currentTime, 0.12);
    window.setTimeout(() => {
      dyingSources.forEach((s) => {
        try {
          s.stop();
        } catch {
          /* already stopped */
        }
      });
      dyingNodes.forEach((n) => {
        try {
          n.disconnect();
        } catch {
          /* noop */
        }
      });
      try {
        dyingBus.disconnect();
      } catch {
        /* noop */
      }
    }, 500);
  }
}

export function stopMixer() {
  live = false;
  if (previewTimer) {
    window.clearTimeout(previewTimer);
    previewTimer = null;
  }
  teardown();
}

/** Mix several scenes at once, each with its own volume (0..100). */
export function startMixer(mixer: Mixer) {
  const ac = getAudio();
  const master = getMaster();
  if (!ac || !master) return;
  const anyOn = (Object.values(mixer) as number[]).some((v) => v > 0);
  teardown();
  if (!anyOn) return;
  live = true;

  bus = ac.createGain();
  bus.gain.value = 0;
  bus.gain.setTargetAtTime(0.9, ac.currentTime, 0.6);
  bus.connect(master);

  const white = whiteBuffer(ac);
  const pink = pinkBuffer(ac);
  const brown = brownBuffer(ac);
  const k = (v: number) => Math.min(1, Math.max(0, v / 100));

  if (mixer.noise > 0) layer(ac, white, lp(ac, 950), 0.5 * k(mixer.noise));
  if (mixer.pink > 0) layer(ac, pink, lp(ac, 1400), 1.0 * k(mixer.pink));

  if (mixer.rain > 0) {
    const kr = k(mixer.rain);
    layer(ac, white, bp(ac, 3600, 0.55), 0.65 * kr);
    layer(ac, brown, lp(ac, 260), 0.42 * kr);
    timers.push(
      window.setInterval(() => {
        if (Math.random() > 0.5 || !bus) return;
        const t = ac.currentTime;
        const src = ac.createBufferSource();
        src.buffer = white;
        src.playbackRate.value = 1.5 + Math.random();
        const f = hp(ac, 5200);
        const g = ac.createGain();
        g.gain.setValueAtTime((0.08 + Math.random() * 0.1) * kr, t);
        g.gain.exponentialRampToValueAtTime(0.0005, t + 0.05 + Math.random() * 0.05);
        src.connect(f);
        f.connect(g);
        g.connect(bus);
        src.start(t, Math.random());
        src.stop(t + 0.15);
      }, 90)
    );
  }

  if (mixer.cafe > 0) {
    const kc = k(mixer.cafe);
    layer(ac, brown, lp(ac, 320), 0.62 * kc);
    const murmurGain = layer(ac, pink, bp(ac, 480, 2.2), 0.3 * kc);
    const lfo = ac.createOscillator();
    lfo.frequency.value = 0.13;
    const lfoAmp = ac.createGain();
    lfoAmp.gain.value = 0.1 * kc;
    lfo.connect(lfoAmp);
    lfoAmp.connect(murmurGain.gain);
    lfo.start();
    sources.push(lfo);
    nodes.push(lfoAmp);
    timers.push(
      window.setInterval(() => {
        if (Math.random() > 0.55 || !bus) return;
        const t = ac.currentTime;
        const osc = ac.createOscillator();
        const g = ac.createGain();
        osc.type = "sine";
        osc.frequency.value = 1700 + Math.random() * 1100;
        g.gain.setValueAtTime(0.05 * kc, t);
        g.gain.exponentialRampToValueAtTime(0.0004, t + 0.28);
        osc.connect(g);
        g.connect(bus);
        osc.start(t);
        osc.stop(t + 0.32);
      }, 3600)
    );
  }
}

/** Short 3.5s audition of the mix (from settings). */
export function previewMixer(mixer: Mixer) {
  startMixer(mixer);
  live = false;
  if (previewTimer) window.clearTimeout(previewTimer);
  previewTimer = window.setTimeout(() => {
    if (!live) stopMixer();
  }, 3500);
}
