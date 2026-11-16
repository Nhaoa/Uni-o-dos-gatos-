import { CatState, PlayerRole, SharedState } from '../types/game';

/**
 * Active daily decay tuned so all stats drain from 100 to 0 at least 3 times per 24h day
 * (each stat reaches 0 in under 8 hours when awake):
 * - Hunger drops 15 pts/hour (~6.67h to 0 -> ~3.6x/day)
 * - Energy drops 14 pts/hour (~7.14h to 0 -> ~3.36x/day while awake)
 * - Happiness drops 13.5 pts/hour (~7.41h to 0 -> ~3.24x/day)
 * While sleeping in a cat bed (`isSleeping`), energy regenerates (+45 pts/hour).
 */
export const DECAY_INTERVAL_MS = 2 * 60 * 1000; // Evaluate every 2 minutes
export const HUNGER_DROP_PER_HOUR = 15;
export const ENERGY_DROP_PER_HOUR = 14;
export const HAPPINESS_DROP_PER_HOUR = 13.5;
export const SLEEP_ENERGY_GAIN_PER_HOUR = 45;
export const SLEEP_HUNGER_MULTIPLIER = 0.6;
export const SLEEP_HAPPINESS_MULTIPLIER = 0.5;
export const MIN_STAT_FLOOR = 0;

function clampStat(val: number): number {
  return Math.max(MIN_STAT_FLOOR, Math.min(100, Math.round(val * 10) / 10));
}

function decaySingleCat(cat: CatState, elapsedHours: number): CatState {
  const sleeping = Boolean(cat.isSleeping);
  const nextHunger = clampStat(
    cat.hunger - elapsedHours * HUNGER_DROP_PER_HOUR * (sleeping ? SLEEP_HUNGER_MULTIPLIER : 1)
  );
  const nextEnergy = sleeping
    ? clampStat(cat.energy + elapsedHours * SLEEP_ENERGY_GAIN_PER_HOUR)
    : clampStat(cat.energy - elapsedHours * ENERGY_DROP_PER_HOUR);
  const nextHappiness = clampStat(
    cat.happiness -
      elapsedHours * HAPPINESS_DROP_PER_HOUR * (sleeping ? SLEEP_HAPPINESS_MULTIPLIER : 1)
  );

  let nextSpeech = cat.speech;
  if (sleeping) {
    if (nextEnergy >= 100 && cat.energy < 100) {
      nextSpeech = 'Dormiu super bem na caminha! Energia cheia ☀️💤';
    }
  } else if (nextHunger === 0 && !cat.speech.includes('zerada')) {
    nextSpeech = 'Fome zerada! Precisando muito de ração no Armazém 🥣';
  } else if (nextEnergy === 0 && !cat.speech.includes('dormir')) {
    nextSpeech = 'Sem energia... Coloque o gatinho para dormir na caminha! 🛏️';
  } else if (nextHappiness === 0 && !cat.speech.includes('carinho')) {
    nextSpeech = 'Moral zerada! Precisando de carinho e brincadeiras 😿';
  } else if (nextHunger <= 25 && !cat.speech.includes('fom')) {
    nextSpeech = 'Bateu uma fominha... Que tal um petisco no Armazém? 🐟';
  }

  return {
    ...cat,
    hunger: nextHunger,
    energy: nextEnergy,
    happiness: nextHappiness,
    speech: nextSpeech,
  };
}

export function applyRealisticCatDecay(
  state: SharedState,
  now = Date.now()
): { state: SharedState; changed: boolean } {
  const lastUpdate = state.lastStatsUpdateTime || now;
  const elapsedMs = now - lastUpdate;
  if (elapsedMs < DECAY_INTERVAL_MS) {
    return { state, changed: false };
  }

  // Cap single-jump offline catchup to 72 hours so returning after a break stays reasonable
  const cappedMs = Math.min(elapsedMs, 72 * 60 * 60 * 1000);
  const elapsedHours = cappedMs / (60 * 60 * 1000);

  const roles: PlayerRole[] = ['cat1', 'cat2'];
  const nextState: SharedState = {
    ...state,
    lastStatsUpdateTime: now,
  };

  let anyStatChanged = false;
  for (const r of roles) {
    const decayed = decaySingleCat(state[r], elapsedHours);
    if (
      decayed.hunger !== state[r].hunger ||
      decayed.energy !== state[r].energy ||
      decayed.happiness !== state[r].happiness ||
      decayed.speech !== state[r].speech
    ) {
      anyStatChanged = true;
    }
    nextState[r] = decayed;
  }

  return { state: nextState, changed: anyStatChanged };
}
