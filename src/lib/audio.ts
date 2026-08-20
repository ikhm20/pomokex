export type Melody = "bell" | "soft" | "digital";
export type ChimeKind = "focus" | "break";

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let masterVol = 0.7;

export function getAudio(): AudioContext | null {
  try {
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    ctx ??= new Ctor();
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

export function getMaster(): GainNode | null {
  const ac = getAudio();
  if (!ac) return null;
  if (!master) {
    master = ac.createGain();
    master.gain.value = masterVol;
    master.connect(ac.destination);
  }
  return master;
}

/** Call from a user gesture so later sounds are allowed. */
export function unlockAudio() {
  getAudio();
}

export function setMasterVolume(v: number) {
  masterVol = Math.min(1, Math.max(0, v));
  const ac = getAudio();
  if (master && ac) master.gain.setTargetAtTime(masterVol, ac.currentTime, 0.05);
}

interface Note {
  freq: number;
  at: number;
  dur?: number;
  gain?: number;
  type?: OscillatorType;
}

/** Small synthesized chimes — no audio assets needed. */
export function playChime(kind: ChimeKind, melody: Melody = "bell") {
  const ac = getAudio();
  const bus = getMaster();
  if (!ac || !bus) return;
  try {
    const t0 = ac.currentTime;
    let notes: Note[];
    if (melody === "soft") {
      notes =
        kind === "focus"
          ? [
              { freq: 587.33, at: 0, dur: 1.1, gain: 0.18 },
              { freq: 1174.66, at: 0.02, dur: 0.9, gain: 0.06 },
            ]
          : [{ freq: 440, at: 0, dur: 1, gain: 0.17 }];
    } else if (melody === "digital") {
      notes =
        kind === "focus"
          ? [
              { freq: 987.77, at: 0, dur: 0.12, gain: 0.1, type: "square" },
              { freq: 987.77, at: 0.16, dur: 0.12, gain: 0.1, type: "square" },
              { freq: 1318.51, at: 0.32, dur: 0.22, gain: 0.1, type: "square" },
            ]
          : [
              { freq: 739.99, at: 0, dur: 0.12, gain: 0.1, type: "square" },
              { freq: 987.77, at: 0.16, dur: 0.22, gain: 0.1, type: "square" },
            ];
    } else {
      notes =
        kind === "focus"
          ? [
              { freq: 523.25, at: 0 },
              { freq: 659.25, at: 0.15 },
              { freq: 783.99, at: 0.3 },
            ]
          : [
              { freq: 659.25, at: 0 },
              { freq: 523.25, at: 0.15 },
            ];
    }
    notes.forEach((n) => {
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      const start = t0 + n.at;
      const dur = n.dur ?? 0.7;
      osc.type = n.type ?? "sine";
      osc.frequency.value = n.freq;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(n.gain ?? 0.16, start + 0.025);
      gain.gain.exponentialRampToValueAtTime(0.0008, start + dur);
      osc.connect(gain);
      gain.connect(bus);
      osc.start(start);
      osc.stop(start + dur + 0.1);
    });
  } catch {
    /* sound is a garnish, never a crash */
  }
}

/** Tiny UI blips: start / pause / distraction drip. */
export function playTick(kind: "start" | "pause" | "drip") {
  const ac = getAudio();
  const bus = getMaster();
  if (!ac || !bus) return;
  try {
    const t0 = ac.currentTime;
    const specs: [number, number][] =
      kind === "start" ? [[660, 0], [990, 0.07]] : kind === "pause" ? [[495, 0], [396, 0.07]] : [[1420, 0]];
    specs.forEach(([freq, at]) => {
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      const start = t0 + at;
      osc.type = "triangle";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.08, start + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0008, start + 0.14);
      osc.connect(gain);
      gain.connect(bus);
      osc.start(start);
      osc.stop(start + 0.2);
    });
  } catch {
    /* noop */
  }
}
