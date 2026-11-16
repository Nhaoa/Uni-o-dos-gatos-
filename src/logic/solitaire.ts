export type CardSuit = 'spades' | 'hearts' | 'diamonds' | 'clubs';
export type CardColor = 'black' | 'red';
export type SolitaireDifficulty = 'easy' | 'medium' | 'hard';

export interface PlayingCard {
  id: string;
  suit: CardSuit;
  rank: number; // 1 (A) .. 13 (K)
  faceUp: boolean;
}

export interface SolitaireGameState {
  difficulty: SolitaireDifficulty;
  drawCount: 1 | 2 | 3;
  stock: PlayingCard[];
  waste: PlayingCard[];
  foundations: Record<CardSuit, PlayingCard[]>;
  tableau: PlayingCard[][];
  moves: number;
  score: number;
  won: boolean;
}

export const SUIT_ORDER: CardSuit[] = ['spades', 'hearts', 'clubs', 'diamonds'];

export const SUIT_META: Record<
  CardSuit,
  { symbol: string; label: string; color: CardColor }
> = {
  spades: { symbol: '♠', label: 'Espadas', color: 'black' },
  hearts: { symbol: '♥', label: 'Copas', color: 'red' },
  clubs: { symbol: '♣', label: 'Paus', color: 'black' },
  diamonds: { symbol: '♦', label: 'Ouros', color: 'red' },
};

export function getCardColor(suit: CardSuit): CardColor {
  return suit === 'hearts' || suit === 'diamonds' ? 'red' : 'black';
}

export function getRankLabel(rank: number): string {
  if (rank === 1) return 'A';
  if (rank === 11) return 'J';
  if (rank === 12) return 'Q';
  if (rank === 13) return 'K';
  return String(rank);
}

export function getDrawCountForDifficulty(difficulty: SolitaireDifficulty): 1 | 2 | 3 {
  if (difficulty === 'easy') return 1;
  if (difficulty === 'medium') return 2;
  return 3;
}

export function computeSolitaireReward(difficulty: SolitaireDifficulty): number {
  if (difficulty === 'easy') return 10;
  if (difficulty === 'medium') return 15;
  return 22;
}

export function createShuffledDeck(): PlayingCard[] {
  const deck: PlayingCard[] = [];
  for (const suit of SUIT_ORDER) {
    for (let rank = 1; rank <= 13; rank++) {
      deck.push({
        id: `${suit}_${rank}`,
        suit,
        rank,
        faceUp: false,
      });
    }
  }
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

export function createInitialSolitaireState(
  difficulty: SolitaireDifficulty = 'easy',
  customDeck?: PlayingCard[]
): SolitaireGameState {
  const deck = (customDeck || createShuffledDeck()).map((c) => ({ ...c, faceUp: false }));
  const tableau: PlayingCard[][] = [[], [], [], [], [], [], []];
  let cursor = 0;

  for (let col = 0; col < 7; col++) {
    for (let row = 0; row <= col; row++) {
      const card = { ...deck[cursor++] };
      card.faceUp = row === col;
      tableau[col].push(card);
    }
  }

  const stock = deck.slice(cursor).map((c) => ({ ...c, faceUp: false }));

  return {
    difficulty,
    drawCount: getDrawCountForDifficulty(difficulty),
    stock,
    waste: [],
    foundations: {
      spades: [],
      hearts: [],
      clubs: [],
      diamonds: [],
    },
    tableau,
    moves: 0,
    score: 0,
    won: false,
  };
}

export function cloneSolitaireState(state: SolitaireGameState): SolitaireGameState {
  return {
    ...state,
    stock: state.stock.map((c) => ({ ...c })),
    waste: state.waste.map((c) => ({ ...c })),
    foundations: {
      spades: state.foundations.spades.map((c) => ({ ...c })),
      hearts: state.foundations.hearts.map((c) => ({ ...c })),
      clubs: state.foundations.clubs.map((c) => ({ ...c })),
      diamonds: state.foundations.diamonds.map((c) => ({ ...c })),
    },
    tableau: state.tableau.map((col) => col.map((c) => ({ ...c }))),
  };
}

export function canPlaceOnFoundation(card: PlayingCard, foundationPile: readonly PlayingCard[]): boolean {
  if (foundationPile.length === 0) return card.rank === 1;
  const top = foundationPile[foundationPile.length - 1];
  return top.suit === card.suit && card.rank === top.rank + 1;
}

export function canPlaceOnTableau(card: PlayingCard, tableauColumn: readonly PlayingCard[]): boolean {
  if (tableauColumn.length === 0) return card.rank === 13;
  const top = tableauColumn[tableauColumn.length - 1];
  if (!top.faceUp) return false;
  return getCardColor(top.suit) !== getCardColor(card.suit) && card.rank === top.rank - 1;
}

export function isSolitaireWon(state: SolitaireGameState): boolean {
  return SUIT_ORDER.every((s) => state.foundations[s].length === 13);
}

export function drawFromStock(prev: SolitaireGameState): SolitaireGameState {
  const next = cloneSolitaireState(prev);
  if (next.stock.length > 0) {
    const count = Math.min(next.drawCount, next.stock.length);
    for (let i = 0; i < count; i++) {
      const card = next.stock.pop()!;
      card.faceUp = true;
      next.waste.push(card);
    }
    next.moves += 1;
    return next;
  }

  if (next.waste.length === 0) return prev;
  // Recycle waste back to stock preserving order
  next.stock = next.waste
    .reverse()
    .map((c) => ({ ...c, faceUp: false }));
  next.waste = [];
  next.moves += 1;
  next.score = Math.max(0, next.score - 20);
  return next;
}

export function moveWasteToFoundation(
  prev: SolitaireGameState,
  targetSuit?: CardSuit
): SolitaireGameState | null {
  if (prev.waste.length === 0) return null;
  const card = prev.waste[prev.waste.length - 1];
  const suit = targetSuit || card.suit;
  if (suit !== card.suit) return null;
  if (!canPlaceOnFoundation(card, prev.foundations[suit])) return null;

  const next = cloneSolitaireState(prev);
  const moved = next.waste.pop()!;
  next.foundations[suit].push(moved);
  next.moves += 1;
  next.score += 10;
  next.won = isSolitaireWon(next);
  return next;
}

export function moveWasteToTableau(
  prev: SolitaireGameState,
  colIdx: number
): SolitaireGameState | null {
  if (prev.waste.length === 0 || colIdx < 0 || colIdx >= 7) return null;
  const card = prev.waste[prev.waste.length - 1];
  if (!canPlaceOnTableau(card, prev.tableau[colIdx])) return null;

  const next = cloneSolitaireState(prev);
  const moved = next.waste.pop()!;
  next.tableau[colIdx].push(moved);
  next.moves += 1;
  next.score += 5;
  return next;
}

export function moveTableauToFoundation(
  prev: SolitaireGameState,
  colIdx: number,
  targetSuit?: CardSuit
): SolitaireGameState | null {
  if (colIdx < 0 || colIdx >= 7) return null;
  const col = prev.tableau[colIdx];
  if (col.length === 0) return null;
  const card = col[col.length - 1];
  if (!card.faceUp) return null;
  const suit = targetSuit || card.suit;
  if (suit !== card.suit) return null;
  if (!canPlaceOnFoundation(card, prev.foundations[suit])) return null;

  const next = cloneSolitaireState(prev);
  const moved = next.tableau[colIdx].pop()!;
  next.foundations[suit].push(moved);
  const remaining = next.tableau[colIdx];
  if (remaining.length > 0 && !remaining[remaining.length - 1].faceUp) {
    remaining[remaining.length - 1].faceUp = true;
    next.score += 5;
  }
  next.moves += 1;
  next.score += 10;
  next.won = isSolitaireWon(next);
  return next;
}

export function moveTableauToTableau(
  prev: SolitaireGameState,
  fromCol: number,
  cardIndex: number,
  toCol: number
): SolitaireGameState | null {
  if (
    fromCol === toCol ||
    fromCol < 0 ||
    fromCol >= 7 ||
    toCol < 0 ||
    toCol >= 7
  ) {
    return null;
  }
  const source = prev.tableau[fromCol];
  if (cardIndex < 0 || cardIndex >= source.length) return null;
  const leadCard = source[cardIndex];
  if (!leadCard.faceUp) return null;
  if (!canPlaceOnTableau(leadCard, prev.tableau[toCol])) return null;

  const next = cloneSolitaireState(prev);
  const moving = next.tableau[fromCol].splice(cardIndex);
  next.tableau[toCol].push(...moving);
  const remaining = next.tableau[fromCol];
  if (remaining.length > 0 && !remaining[remaining.length - 1].faceUp) {
    remaining[remaining.length - 1].faceUp = true;
    next.score += 5;
  }
  next.moves += 1;
  next.score += 3;
  return next;
}

export function moveFoundationToTableau(
  prev: SolitaireGameState,
  suit: CardSuit,
  toCol: number
): SolitaireGameState | null {
  if (toCol < 0 || toCol >= 7) return null;
  const pile = prev.foundations[suit];
  if (pile.length === 0) return null;
  const card = pile[pile.length - 1];
  if (!canPlaceOnTableau(card, prev.tableau[toCol])) return null;

  const next = cloneSolitaireState(prev);
  const moved = next.foundations[suit].pop()!;
  next.tableau[toCol].push(moved);
  next.moves += 1;
  next.score = Math.max(0, next.score - 10);
  return next;
}

export function canAutoComplete(state: SolitaireGameState): boolean {
  if (state.won) return false;
  if (state.stock.length > 0 || state.waste.length > 0) return false;
  return state.tableau.every((col) => col.every((c) => c.faceUp));
}

export function stepAutoComplete(state: SolitaireGameState): SolitaireGameState | null {
  if (state.won) return null;
  if (state.waste.length > 0) {
    const movedWaste = moveWasteToFoundation(state);
    if (movedWaste) return movedWaste;
  }
  for (let col = 0; col < 7; col++) {
    const moved = moveTableauToFoundation(state, col);
    if (moved) return moved;
  }
  return null;
}

export interface SolitaireHint {
  from: string;
  to: string;
  description: string;
}

export function findSolitaireHint(state: SolitaireGameState): SolitaireHint | null {
  if (state.waste.length > 0) {
    const card = state.waste[state.waste.length - 1];
    if (canPlaceOnFoundation(card, state.foundations[card.suit])) {
      return {
        from: 'waste',
        to: `foundation:${card.suit}`,
        description: `Enviar ${getRankLabel(card.rank)}${SUIT_META[card.suit].symbol} para a fundação`,
      };
    }
  }
  for (let col = 0; col < 7; col++) {
    const pile = state.tableau[col];
    if (pile.length === 0) continue;
    const top = pile[pile.length - 1];
    if (canPlaceOnFoundation(top, state.foundations[top.suit])) {
      return {
        from: `tableau:${col}:${pile.length - 1}`,
        to: `foundation:${top.suit}`,
        description: `Subir ${getRankLabel(top.rank)}${SUIT_META[top.suit].symbol} para a fundação`,
      };
    }
  }
  for (let fromCol = 0; fromCol < 7; fromCol++) {
    const pile = state.tableau[fromCol];
    const firstFaceUpIdx = pile.findIndex((c) => c.faceUp);
    if (firstFaceUpIdx === -1) continue;
    const lead = pile[firstFaceUpIdx];
    for (let toCol = 0; toCol < 7; toCol++) {
      if (fromCol === toCol) continue;
      if (firstFaceUpIdx === 0 && lead.rank === 13 && state.tableau[toCol].length === 0) continue;
      if (canPlaceOnTableau(lead, state.tableau[toCol])) {
        return {
          from: `tableau:${fromCol}:${firstFaceUpIdx}`,
          to: `tableau:${toCol}`,
          description: `Mover ${getRankLabel(lead.rank)}${SUIT_META[lead.suit].symbol} para a coluna ${toCol + 1}`,
        };
      }
    }
  }
  if (state.waste.length > 0) {
    const card = state.waste[state.waste.length - 1];
    for (let toCol = 0; toCol < 7; toCol++) {
      if (canPlaceOnTableau(card, state.tableau[toCol])) {
        return {
          from: 'waste',
          to: `tableau:${toCol}`,
          description: `Mover ${getRankLabel(card.rank)}${SUIT_META[card.suit].symbol} para a coluna ${toCol + 1}`,
        };
      }
    }
  }
  if (state.stock.length > 0 || state.waste.length > 0) {
    return {
      from: 'stock',
      to: 'waste',
      description: 'Comprar carta do monte',
    };
  }
  return null;
}
