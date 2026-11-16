import type { PlayingCard } from './solitaire.ts';

export interface SolitaireLayout {
  mode: 'classic-top' | 'landscape-split';
  hudCompact: boolean;
  cardW: number;
  cardH: number;
  colGap: number;
  rowGap: number;
  splitGap: number;
  wasteFanStep: number;
  padX: number;
  padY: number;
  availTableauH: number;
  cardSize: 'sm' | 'md' | 'lg';
}

export function computeSolitaireLayout(
  viewportWidth: number,
  viewportHeight: number
): SolitaireLayout {
  const vw = Math.max(300, Math.round(viewportWidth));
  const vh = Math.max(300, Math.round(viewportHeight));

  const isLandscape = vw >= vh;
  const useSplit = isLandscape && vh < 520;
  const hudCompact = vh < 560 || vw < 640;

  const hudH = useSplit ? 48 : isLandscape ? 54 : vw < 640 ? 86 : 58;
  const padX = vw < 480 ? 6 : vw < 900 ? 12 : 24;
  const padY = useSplit ? 6 : vh < 700 ? 8 : 14;

  const availW = Math.max(260, vw - padX * 2);
  const availH = Math.max(220, vh - hudH - padY * 2);

  const colGap = vw < 460 ? 4 : vw < 768 ? 7 : 12;
  const rowGap = useSplit ? 6 : vh < 700 ? 10 : 16;

  let cardW: number;
  let cardH: number;
  let availTableauH: number;
  let splitGap = colGap * 2;
  let wasteFanStep = 14;

  if (useSplit) {
    // Reserve space for up to 2 fanned waste cards sticking slightly past the 2nd dock col
    const fanExtra = 22;
    splitGap = colGap * 2 + fanExtra;
    const maxWByWidth = Math.floor((availW - colGap * 7 - splitGap) / 9);
    // Left dock stacks Stock/Waste row + 2 Foundation rows (3 card rows total)
    const maxHByHeight = Math.floor((availH - rowGap * 2) / 3);
    const maxWByHeight = Math.floor(maxHByHeight / 1.4);
    cardW = Math.max(38, Math.min(maxWByWidth, maxWByHeight, 120));
    cardH = Math.round(cardW * 1.4);
    availTableauH = availH;
    wasteFanStep = 9;
  } else {
    const maxTableW = Math.min(availW, 1140);
    const maxWByWidth = Math.floor((maxTableW - colGap * 6) / 7);
    const maxHByHeight = Math.floor((availH - rowGap) / 4.0);
    const maxWByHeight = Math.floor(maxHByHeight / 1.4);
    cardW = Math.max(38, Math.min(maxWByWidth, maxWByHeight, 146));
    cardH = Math.round(cardW * 1.4);
    availTableauH = Math.max(140, availH - cardH - rowGap);
    wasteFanStep = Math.min(
      Math.round(cardW * 0.36),
      Math.floor((cardW + colGap) / 2)
    );
  }

  const cardSize: 'sm' | 'md' | 'lg' = cardW < 64 ? 'sm' : cardW < 105 ? 'md' : 'lg';

  return {
    mode: useSplit ? 'landscape-split' : 'classic-top',
    hudCompact,
    cardW,
    cardH,
    colGap,
    rowGap,
    splitGap,
    wasteFanStep,
    padX,
    padY,
    availTableauH,
    cardSize,
  };
}

export function computeColumnCardOffsets(
  cards: PlayingCard[],
  cardH: number,
  availTableauH: number
): { offsets: number[]; totalHeight: number } {
  if (cards.length === 0) {
    return { offsets: [], totalHeight: cardH };
  }

  let downCount = 0;
  let upTransitions = 0;
  for (let i = 0; i < cards.length - 1; i++) {
    if (cards[i].faceUp) upTransitions++;
    else downCount++;
  }

  let downStep = Math.max(8, Math.round(cardH * 0.13));
  let upStep = Math.max(19, Math.round(cardH * 0.27));

  const maxAllowed = Math.max(cardH + 20, availTableauH - 6);
  const calcTotal = (d: number, u: number) => cardH + downCount * d + upTransitions * u;

  if (calcTotal(downStep, upStep) > maxAllowed && downCount + upTransitions > 0) {
    const minDown = Math.max(5, Math.round(cardH * 0.07));
    if (downCount > 0) {
      const neededAfterUp = maxAllowed - cardH - upTransitions * upStep;
      downStep = Math.max(minDown, Math.min(downStep, Math.floor(neededAfterUp / downCount)));
    }
    if (calcTotal(downStep, upStep) > maxAllowed && upTransitions > 0) {
      const minUp = Math.max(16, Math.round(cardH * 0.2));
      const remaining = maxAllowed - cardH - downCount * downStep;
      upStep = Math.max(minUp, Math.min(upStep, Math.floor(remaining / upTransitions)));
    }
  }

  const offsets: number[] = [];
  let y = 0;
  for (let i = 0; i < cards.length; i++) {
    offsets.push(y);
    if (i < cards.length - 1) {
      y += cards[i].faceUp ? upStep : downStep;
    }
  }

  return {
    offsets,
    totalHeight: y + cardH,
  };
}
