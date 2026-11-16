let audioCtx: AudioContext | null = null;
let muted = false;

export function isSoundMuted(): boolean {
  return muted;
}

export function setSoundMuted(next: boolean) {
  muted = next;
}

function getCtx(): AudioContext | null {
  if (muted || typeof window === 'undefined') return null;
  if (!audioCtx) {
    const Ctor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (Ctor) audioCtx = new Ctor();
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

function playTone(
  freq: number,
  duration = 0.08,
  type: OscillatorType = 'sine',
  gainVal = 0.08,
  endFreq?: number
) {
  const ctx = getCtx();
  if (!ctx) return;
  try {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (endFreq !== undefined) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(40, endFreq), now + duration);
    }
    gain.gain.setValueAtTime(gainVal, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + duration);
  } catch {
    // ignore audio errors
  }
}

export function getSharedAudioContext(): AudioContext | null {
  return getCtx();
}

export const sfx = {
  purr: () => {
    playTone(340, 0.1, 'triangle', 0.07, 460);
    setTimeout(() => playTone(480, 0.12, 'sine', 0.06, 560), 75);
  },
  move: () => playTone(260, 0.06, 'triangle', 0.07, 310),
  capture: () => playTone(210, 0.12, 'sawtooth', 0.08, 110),
  check: () => {
    playTone(580, 0.09, 'square', 0.06);
    setTimeout(() => playTone(760, 0.12, 'square', 0.06), 90);
  },
  bounce: () => playTone(380 + (Math.random() * 60 - 30), 0.06, 'sine', 0.07, 520),
  hit: () => playTone(180 + (Math.random() * 30 - 15), 0.07, 'triangle', 0.09, 95),
  portal: () => {
    playTone(420, 0.11, 'sine', 0.08, 880);
    setTimeout(() => playTone(660, 0.14, 'triangle', 0.08, 1320), 60);
  },
  goal: () => {
    playTone(440, 0.12, 'triangle', 0.09);
    setTimeout(() => playTone(554, 0.12, 'triangle', 0.09), 110);
    setTimeout(() => playTone(659, 0.22, 'triangle', 0.1), 220);
  },
  win: () => {
    [523, 659, 784, 1046].forEach((f, idx) => {
      setTimeout(() => playTone(f, 0.16, 'triangle', 0.08), idx * 95);
    });
  },
  error: () => playTone(160, 0.14, 'sawtooth', 0.06, 110),
  select: () => playTone(460, 0.045, 'triangle', 0.055, 580),
  buy: () => {
    playTone(587, 0.08, 'triangle', 0.075, 659);
    setTimeout(() => playTone(880, 0.13, 'sine', 0.08, 1175), 70);
  },
  feed: () => {
    playTone(392, 0.08, 'sine', 0.07, 523);
    setTimeout(() => playTone(523, 0.11, 'triangle', 0.075, 659), 75);
  },
  cardFlip: () => playTone(320, 0.05, 'triangle', 0.06, 480),
  cardPlace: () => playTone(220, 0.055, 'sine', 0.075, 160),
  cardWin: () => {
    [523, 659, 784, 987, 1046].forEach((f, idx) => {
      setTimeout(() => playTone(f, 0.14, 'triangle', 0.075), idx * 75);
    });
  },
  keyTap: () => playTone(510 + (Math.random() * 40 - 20), 0.035, 'triangle', 0.045, 420),
  tileFlip: () => playTone(360, 0.055, 'sine', 0.055, 540),
  tileWin: () => {
    [587, 740, 880, 1174].forEach((f, idx) => {
      setTimeout(() => playTone(f, 0.15, 'triangle', 0.08), idx * 80);
    });
  },
  rowInvalid: () => {
    playTone(190, 0.09, 'sawtooth', 0.06, 145);
    setTimeout(() => playTone(150, 0.11, 'sawtooth', 0.055, 115), 85);
  },
  pencilNote: () => playTone(680, 0.035, 'sine', 0.04, 760),
  sudokuPlace: () => playTone(430, 0.055, 'triangle', 0.06, 560),
  sudokuError: () => playTone(170, 0.14, 'sawtooth', 0.065, 115),
  step: () => playTone(145, 0.038, 'triangle', 0.035, 105),
  curate: () => {
    playTone(523, 0.075, 'sine', 0.065, 659);
    setTimeout(() => playTone(784, 0.11, 'triangle', 0.065, 987), 70);
  },
};
