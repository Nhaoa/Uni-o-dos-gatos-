import { SkyScenarioId } from './skyHop';
import { getSharedAudioContext, isSoundMuted } from '../utils/sound';

export interface ScenarioMusicSpec {
  id: SkyScenarioId;
  themeTitle: string;
  tempoBpm: number;
  leadWave: OscillatorType;
  bassWave: OscillatorType;
  filterCutoffHz: number;
  /** MIDI pitches for melodic steps; null indicates a musical rest */
  melodySteps: Array<number | null>;
  /** MIDI pitches for bass pulse aligned by step modulo length */
  bassSteps: Array<number | null>;
  /** Warm sustained background pad triad (MIDI) */
  padChord: number[];
}

export const SCENARIO_MUSIC_SPECS: Record<SkyScenarioId, ScenarioMusicSpec> = {
  earth: {
    id: 'earth',
    themeTitle: 'Brisa da Decolagem',
    tempoBpm: 116,
    leadWave: 'triangle',
    bassWave: 'sine',
    filterCutoffHz: 2100,
    melodySteps: [72, null, 76, 79, 84, null, 79, 76, 74, null, 79, 76, 72, 74, 76, null],
    bassSteps: [48, null, 55, null, 53, null, 55, null],
    padChord: [60, 64, 67],
  },
  moon: {
    id: 'moon',
    themeTitle: 'Vala Lunar Prateada',
    tempoBpm: 88,
    leadWave: 'sine',
    bassWave: 'triangle',
    filterCutoffHz: 1450,
    melodySteps: [76, null, 81, null, 83, 88, null, 81, 79, null, 76, null, 74, null, 76, null],
    bassSteps: [45, null, null, 52, 48, null, null, 52],
    padChord: [57, 64, 69],
  },
  inner_planets: {
    id: 'inner_planets',
    themeTitle: 'Fulgor Solar',
    tempoBpm: 110,
    leadWave: 'triangle',
    bassWave: 'sawtooth',
    filterCutoffHz: 1850,
    melodySteps: [69, 73, 74, null, 77, 76, 74, null, 73, 76, 81, null, 77, 74, 73, null],
    bassSteps: [45, 45, null, 52, 46, null, 53, null],
    padChord: [57, 61, 64],
  },
  mars: {
    id: 'mars',
    themeTitle: 'Marcha das Dunas Rubras',
    tempoBpm: 126,
    leadWave: 'sawtooth',
    bassWave: 'triangle',
    filterCutoffHz: 1650,
    melodySteps: [62, null, 65, 69, 74, null, 72, 69, 67, null, 69, 65, 62, 65, 69, null],
    bassSteps: [38, 38, 45, 38, 41, 41, 45, 43],
    padChord: [50, 53, 57],
  },
  asteroid_belt: {
    id: 'asteroid_belt',
    themeTitle: 'Slalom dos Asteroides',
    tempoBpm: 136,
    leadWave: 'square',
    bassWave: 'sawtooth',
    filterCutoffHz: 1500,
    melodySteps: [64, 67, null, 71, 70, null, 67, 64, 66, null, 71, 74, 72, null, 67, null],
    bassSteps: [40, null, 40, 47, 41, null, 46, null],
    padChord: [52, 55, 58],
  },
  jupiter: {
    id: 'jupiter',
    themeTitle: 'Sinfonia do Gigante',
    tempoBpm: 96,
    leadWave: 'triangle',
    bassWave: 'sawtooth',
    filterCutoffHz: 1400,
    melodySteps: [65, null, 72, 74, 77, null, 76, 72, 69, null, 72, 74, 79, null, 77, null],
    bassSteps: [41, null, 48, null, 45, null, 48, null],
    padChord: [53, 57, 60],
  },
  saturn: {
    id: 'saturn',
    themeTitle: 'Valsa dos Anéis de Gelo',
    tempoBpm: 102,
    leadWave: 'sine',
    bassWave: 'triangle',
    filterCutoffHz: 1900,
    melodySteps: [74, 78, 81, 86, null, 81, 78, null, 76, 79, 83, 86, null, 83, 79, null],
    bassSteps: [50, null, 57, null, 47, null, 54, null],
    padChord: [62, 66, 69],
  },
  ice_giants: {
    id: 'ice_giants',
    themeTitle: 'Cristais de Netuno',
    tempoBpm: 108,
    leadWave: 'sine',
    bassWave: 'sine',
    filterCutoffHz: 2200,
    melodySteps: [76, null, 79, 83, 86, 83, null, 79, 74, null, 78, 81, 83, null, 79, null],
    bassSteps: [40, null, 47, null, 43, null, 50, null],
    padChord: [52, 59, 62],
  },
  solar_system: {
    id: 'solar_system',
    themeTitle: 'Órbita Panorâmica',
    tempoBpm: 118,
    leadWave: 'triangle',
    bassWave: 'triangle',
    filterCutoffHz: 2050,
    melodySteps: [67, 71, 74, 79, 83, null, 79, 74, 69, 72, 76, 81, 84, null, 81, 76],
    bassSteps: [43, 43, 50, null, 45, 45, 52, null],
    padChord: [55, 59, 62],
  },
  constellations: {
    id: 'constellations',
    themeTitle: 'Harpa das Estrelas',
    tempoBpm: 94,
    leadWave: 'sine',
    bassWave: 'triangle',
    filterCutoffHz: 2400,
    melodySteps: [72, 79, 84, 88, 91, null, 88, 84, 74, 81, 86, 89, 93, null, 89, 86],
    bassSteps: [48, null, 55, null, 50, null, 57, null],
    padChord: [60, 67, 71],
  },
  nebula_milkyway: {
    id: 'nebula_milkyway',
    themeTitle: 'Sonho da Via Láctea',
    tempoBpm: 120,
    leadWave: 'sawtooth',
    bassWave: 'sawtooth',
    filterCutoffHz: 1750,
    melodySteps: [71, 76, 79, null, 83, 79, 76, null, 72, 76, 79, null, 84, 83, 79, null],
    bassSteps: [40, 40, 52, 40, 48, 48, 55, 48],
    padChord: [52, 55, 59],
  },
  galaxies: {
    id: 'galaxies',
    themeTitle: 'Espirais de Andrômeda',
    tempoBpm: 130,
    leadWave: 'triangle',
    bassWave: 'sawtooth',
    filterCutoffHz: 2300,
    melodySteps: [69, 72, 76, 81, 84, 81, 76, 72, 67, 71, 74, 79, 83, 79, 74, 71],
    bassSteps: [45, 45, 57, 45, 43, 43, 55, 43],
    padChord: [57, 60, 64],
  },
};

export function getScenarioMusicSpec(scenarioId: SkyScenarioId): ScenarioMusicSpec {
  return SCENARIO_MUSIC_SPECS[scenarioId] || SCENARIO_MUSIC_SPECS.earth;
}

export function midiToFreq(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

/**
 * Lightweight Web Audio procedural soundtrack player tailored per SkyHop scenario.
 */
export class SkyHopMusicPlayer {
  private scenarioId: SkyScenarioId = 'earth';
  private playing = false;
  private enabled = true;
  private stepIdx = 0;
  private timerId: number | null = null;
  private padOscs: OscillatorNode[] = [];
  private padGain: GainNode | null = null;

  public start(scenarioId: SkyScenarioId): void {
    this.scenarioId = scenarioId;
    this.playing = true;
    this.stepIdx = 0;
    this.restartLoop();
  }

  public setScenario(scenarioId: SkyScenarioId): void {
    if (this.scenarioId === scenarioId) return;
    this.scenarioId = scenarioId;
    this.stepIdx = 0;
    if (this.playing) {
      this.restartLoop();
    }
  }

  public setEnabled(next: boolean): void {
    this.enabled = next;
    if (!next) {
      this.clearAudioNodes();
    } else if (this.playing) {
      this.restartLoop();
    }
  }

  public stop(): void {
    this.playing = false;
    this.clearAudioNodes();
  }

  private clearAudioNodes(): void {
    if (this.timerId !== null && typeof window !== 'undefined') {
      window.clearInterval(this.timerId);
      this.timerId = null;
    }
    for (const osc of this.padOscs) {
      try {
        osc.stop();
        osc.disconnect();
      } catch {
        // ignore stopped oscillator
      }
    }
    this.padOscs = [];
    if (this.padGain) {
      try {
        this.padGain.disconnect();
      } catch {
        // ignore
      }
      this.padGain = null;
    }
  }

  private restartLoop(): void {
    this.clearAudioNodes();
    if (!this.playing || !this.enabled || isSoundMuted() || typeof window === 'undefined') {
      return;
    }
    const ctx = getSharedAudioContext();
    if (!ctx) return;

    const spec = getScenarioMusicSpec(this.scenarioId);
    this.startPad(ctx, spec);

    const stepMs = Math.max(95, Math.round((60 / spec.tempoBpm / 2) * 1000));
    this.playStep(ctx, spec);
    this.timerId = window.setInterval(() => {
      if (!this.playing || !this.enabled || isSoundMuted()) {
        this.clearAudioNodes();
        return;
      }
      const activeCtx = getSharedAudioContext();
      if (!activeCtx) return;
      this.playStep(activeCtx, getScenarioMusicSpec(this.scenarioId));
    }, stepMs);
  }

  private startPad(ctx: AudioContext, spec: ScenarioMusicSpec): void {
    try {
      const now = ctx.currentTime;
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(Math.min(1100, spec.filterCutoffHz * 0.6), now);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.022, now + 0.6);

      filter.connect(gain);
      gain.connect(ctx.destination);
      this.padGain = gain;

      this.padOscs = spec.padChord.map((midi) => {
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(midiToFreq(midi), now);
        osc.connect(filter);
        osc.start(now);
        return osc;
      });
    } catch {
      // ignore web audio errors
    }
  }

  private playStep(ctx: AudioContext, spec: ScenarioMusicSpec): void {
    const idx = this.stepIdx++;
    const stepDuration = Math.max(0.09, 60 / spec.tempoBpm / 2);
    const leadMidi = spec.melodySteps[idx % spec.melodySteps.length];
    const bassMidi = spec.bassSteps[idx % spec.bassSteps.length];

    if (leadMidi !== null) {
      this.triggerNote(
        ctx,
        midiToFreq(leadMidi),
        stepDuration * 0.92,
        spec.leadWave,
        0.036,
        spec.filterCutoffHz
      );
    }
    if (bassMidi !== null) {
      this.triggerNote(
        ctx,
        midiToFreq(bassMidi),
        stepDuration * 1.1,
        spec.bassWave,
        0.042,
        Math.min(900, spec.filterCutoffHz * 0.55)
      );
    }
  }

  private triggerNote(
    ctx: AudioContext,
    freq: number,
    duration: number,
    wave: OscillatorType,
    peakGain: number,
    cutoffHz: number
  ): void {
    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();

      osc.type = wave;
      osc.frequency.setValueAtTime(freq, now);

      filter.type = 'lowpass';
      filter.Q.setValueAtTime(1.1, now);
      filter.frequency.setValueAtTime(cutoffHz, now);

      gain.gain.setValueAtTime(0.0008, now);
      gain.gain.linearRampToValueAtTime(peakGain, now + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0008, now + duration);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + duration + 0.02);
    } catch {
      // ignore web audio errors
    }
  }
}
