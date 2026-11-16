import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Lightbulb, RotateCcw, Sparkles, Undo2, X } from 'lucide-react';
import { PlayerRole } from '../../types/game';
import { ViewportOrientation } from '../../hooks/useOrientation';
import {
  canAutoComplete,
  CardSuit,
  computeSolitaireReward,
  createInitialSolitaireState,
  drawFromStock,
  findSolitaireHint,
  moveFoundationToTableau,
  moveTableauToFoundation,
  moveTableauToTableau,
  moveWasteToFoundation,
  moveWasteToTableau,
  SolitaireDifficulty,
  SolitaireGameState,
  SolitaireHint,
  stepAutoComplete,
  SUIT_META,
  SUIT_ORDER,
} from '../../logic/solitaire';
import { computeColumnCardOffsets, computeSolitaireLayout } from '../../logic/solitaireLayout';
import { AchievementEvent } from '../../logic/achievements';
import { MatchScoreOutcome } from '../../logic/scores';
import { sfx } from '../../utils/sound';
import { SolitaireCardSvg } from './SolitaireCardSvg';

interface SolitaireModalProps {
  open: boolean;
  myRole: PlayerRole;
  vp: ViewportOrientation;
  onClose: () => void;
  onAwardPaws: (role: PlayerRole, amount: number) => void;
  onRecordOutcome?: (outcome: MatchScoreOutcome) => void;
  onAchievementEvent?: (role: PlayerRole, event: AchievementEvent) => void;
}

type Selection =
  | { source: 'waste' }
  | { source: 'tableau'; col: number; cardIndex: number }
  | { source: 'foundation'; suit: CardSuit };

const DIFFICULTY_OPTIONS: { id: SolitaireDifficulty; label: string; sub: string }[] = [
  { id: 'easy', label: 'Fácil', sub: '1' },
  { id: 'medium', label: 'Médio', sub: '2' },
  { id: 'hard', label: 'Difícil', sub: '3' },
];

export const SolitaireModal: React.FC<SolitaireModalProps> = ({
  open,
  myRole,
  vp,
  onClose,
  onAwardPaws,
  onRecordOutcome,
  onAchievementEvent,
}) => {
  const [difficulty, setDifficulty] = useState<SolitaireDifficulty>('easy');
  const [game, setGame] = useState<SolitaireGameState>(() => createInitialSolitaireState('easy'));
  const [undoStack, setUndoStack] = useState<SolitaireGameState[]>([]);
  const [selection, setSelection] = useState<Selection | null>(null);
  const [hint, setHint] = useState<SolitaireHint | null>(null);
  const [autoCompleting, setAutoCompleting] = useState(false);
  const [rewardPaid, setRewardPaid] = useState(false);

  const layout = useMemo(
    () => computeSolitaireLayout(vp.width, vp.height),
    [vp.width, vp.height]
  );

  const startNewGame = useCallback((diff: SolitaireDifficulty) => {
    setDifficulty(diff);
    setGame(createInitialSolitaireState(diff));
    setUndoStack([]);
    setSelection(null);
    setHint(null);
    setAutoCompleting(false);
    setRewardPaid(false);
    sfx.cardFlip();
  }, []);

  useEffect(() => {
    if (open) {
      startNewGame(difficulty);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const applyNextState = useCallback(
    (next: SolitaireGameState | null, soundType: 'flip' | 'place' = 'place') => {
      if (!next) {
        sfx.error();
        return false;
      }
      setUndoStack((prev) => [...prev.slice(-39), game]);
      setGame(next);
      setSelection(null);
      setHint(null);
      if (next.won && !rewardPaid) {
        setRewardPaid(true);
        setAutoCompleting(false);
        sfx.cardWin();
        const reward = computeSolitaireReward(next.difficulty);
        onAwardPaws(myRole, reward);
        onRecordOutcome?.({ kind: 'solo_win', role: myRole });
        onAchievementEvent?.(myRole, {
          type: 'solitaire_win',
          difficulty: next.difficulty,
        });
      } else {
        if (soundType === 'flip') sfx.cardFlip();
        else sfx.cardPlace();
      }
      return true;
    },
    [game, rewardPaid, myRole, onAwardPaws, onRecordOutcome, onAchievementEvent]
  );

  // Smooth cascading auto-complete stepper
  useEffect(() => {
    if (!open || !autoCompleting || game.won) return;
    const timer = window.setTimeout(() => {
      const next = stepAutoComplete(game);
      if (next) {
        applyNextState(next, 'place');
      } else {
        setAutoCompleting(false);
      }
    }, 95);
    return () => window.clearTimeout(timer);
  }, [open, autoCompleting, game, applyNextState]);

  const handleDrawStock = () => {
    const next = drawFromStock(game);
    if (next !== game) {
      applyNextState(next, 'flip');
    }
  };

  const handleFoundationClick = (suit: CardSuit) => {
    if (selection) {
      if (selection.source === 'waste') {
        if (applyNextState(moveWasteToFoundation(game, suit))) return;
      } else if (selection.source === 'tableau') {
        const col = game.tableau[selection.col];
        if (selection.cardIndex === col.length - 1) {
          if (applyNextState(moveTableauToFoundation(game, selection.col, suit))) return;
        }
      }
      setSelection(null);
      return;
    }

    if (game.foundations[suit].length > 0) {
      setSelection({ source: 'foundation', suit });
      sfx.select();
    }
  };

  const handleTableauColumnClick = (colIdx: number) => {
    if (!selection) return;
    if (selection.source === 'waste') {
      applyNextState(moveWasteToTableau(game, colIdx));
    } else if (selection.source === 'tableau') {
      if (selection.col === colIdx) {
        setSelection(null);
      } else {
        applyNextState(moveTableauToTableau(game, selection.col, selection.cardIndex, colIdx));
      }
    } else if (selection.source === 'foundation') {
      applyNextState(moveFoundationToTableau(game, selection.suit, colIdx));
    }
  };

  const handleTableauCardClick = (colIdx: number, cardIndex: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const card = game.tableau[colIdx][cardIndex];
    if (!card || !card.faceUp) return;

    if (selection) {
      if (
        selection.source === 'tableau' &&
        selection.col === colIdx &&
        selection.cardIndex === cardIndex
      ) {
        setSelection(null);
        return;
      }
      handleTableauColumnClick(colIdx);
      return;
    }

    setSelection({ source: 'tableau', col: colIdx, cardIndex });
    sfx.select();
  };

  const handleAutoSendToFoundation = (source: 'waste' | 'tableau', colIdx?: number) => {
    if (source === 'waste') {
      applyNextState(moveWasteToFoundation(game));
    } else if (typeof colIdx === 'number') {
      applyNextState(moveTableauToFoundation(game, colIdx));
    }
  };

  const handleUndo = () => {
    if (undoStack.length === 0) return;
    const prev = undoStack[undoStack.length - 1];
    setUndoStack((s) => s.slice(0, -1));
    setGame(prev);
    setSelection(null);
    setHint(null);
    sfx.cardFlip();
  };

  const handleShowHint = () => {
    const found = findSolitaireHint(game);
    setHint(found);
    if (found) sfx.select();
    else sfx.error();
  };

  if (!open) return null;

  const autoCompleteReady = canAutoComplete(game);
  const visibleWaste = game.waste.slice(-Math.min(3, Math.max(1, game.drawCount)));
  const isSplit = layout.mode === 'landscape-split';
  const tableauGridW = layout.cardW * 7 + layout.colGap * 6;
  const fanStepPx = visibleWaste.length > 1 ? layout.wasteFanStep : 0;

  const stockButton = (
    <button
      type="button"
      onClick={handleDrawStock}
      aria-label={`Comprar carta do monte (${game.stock.length} restantes)`}
      className="relative rounded-lg sm:rounded-xl border-2 border-amber-200/45 bg-emerald-950/45 flex items-center justify-center cursor-pointer hover:border-amber-300 shrink-0"
      style={{ width: `${layout.cardW}px`, height: `${layout.cardH}px` }}
    >
      {game.stock.length > 0 ? (
        <SolitaireCardSvg
          card={game.stock[game.stock.length - 1]}
          hinted={hint?.from === 'stock'}
          compact
          sizeVariant={layout.cardSize}
        />
      ) : (
        <span className="text-amber-200 text-lg sm:text-2xl font-bold">↻</span>
      )}
      <span className="absolute -bottom-1.5 right-0.5 bg-[#1e293b] text-amber-200 border border-amber-200/50 text-[10px] font-mono-num font-bold px-1.5 rounded-md leading-tight">
        {game.stock.length}
      </span>
    </button>
  );

  const wasteArea = (
    <div
      className="relative shrink-0"
      style={{
        width: `${isSplit ? layout.cardW : layout.cardW * 2 + layout.colGap}px`,
        height: `${layout.cardH}px`,
      }}
    >
      {visibleWaste.length === 0 ? (
        <div
          className="rounded-lg sm:rounded-xl border-2 border-dashed border-amber-200/35 flex items-center justify-center text-[10px] text-amber-100/55 font-bold"
          style={{ width: `${layout.cardW}px`, height: `${layout.cardH}px` }}
        >
          Descarte
        </div>
      ) : (
        visibleWaste.map((card, idx) => {
          const isTop = idx === visibleWaste.length - 1;
          const isSelected = isTop && selection?.source === 'waste';
          return (
            <button
              key={card.id}
              type="button"
              disabled={!isTop}
              draggable={isTop}
              aria-label={`Carta do descarte ${card.rank} de ${SUIT_META[card.suit].label}`}
              onDragStart={(e) => {
                if (!isTop) return;
                e.dataTransfer.setData('text/plain', 'waste');
                setSelection({ source: 'waste' });
              }}
              onClick={() => {
                if (!isTop) return;
                setSelection(isSelected ? null : { source: 'waste' });
                sfx.select();
              }}
              onDoubleClick={() => {
                if (isTop) handleAutoSendToFoundation('waste');
              }}
              className="absolute top-0 cursor-pointer"
              style={{
                width: `${layout.cardW}px`,
                height: `${layout.cardH}px`,
                left: `${idx * fanStepPx}px`,
                zIndex: idx + 1,
              }}
            >
              <SolitaireCardSvg
                card={card}
                selected={isSelected}
                hinted={isTop && hint?.from === 'waste'}
                sizeVariant={layout.cardSize}
              />
            </button>
          );
        })
      )}
    </div>
  );

  const foundationButtons = SUIT_ORDER.map((suit) => {
    const pile = game.foundations[suit];
    const topCard = pile[pile.length - 1];
    const isSelected = selection?.source === 'foundation' && selection.suit === suit;
    const isHintTarget = hint?.to === `foundation:${suit}`;
    return (
      <button
        key={suit}
        type="button"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          handleFoundationClick(suit);
        }}
        onClick={() => handleFoundationClick(suit)}
        aria-label={`Fundação de ${SUIT_META[suit].label}`}
        className={`relative rounded-lg sm:rounded-xl border-2 flex items-center justify-center cursor-pointer transition-colors shrink-0 ${
          isHintTarget
            ? 'border-amber-300 bg-emerald-800/75'
            : 'border-amber-200/40 bg-emerald-950/35 hover:border-amber-200'
        }`}
        style={{ width: `${layout.cardW}px`, height: `${layout.cardH}px` }}
      >
        {topCard ? (
          <SolitaireCardSvg
            card={topCard}
            selected={isSelected}
            sizeVariant={layout.cardSize}
          />
        ) : (
          <span
            className={`${
              layout.cardSize === 'sm' ? 'text-lg' : 'text-2xl sm:text-3xl'
            } text-amber-100/60 font-bold`}
          >
            {SUIT_META[suit].symbol}
          </span>
        )}
      </button>
    );
  });

  const tableauColumns = (
    <div
      data-testid="solitaire-tableau"
      className="flex items-start shrink-0"
      style={{ gap: `${layout.colGap}px`, width: `${tableauGridW}px` }}
    >
      {game.tableau.map((col, colIdx) => {
        const isHintTarget = hint?.to === `tableau:${colIdx}`;
        const { offsets, totalHeight } = computeColumnCardOffsets(
          col,
          layout.cardH,
          layout.availTableauH
        );

        return (
          <div
            key={colIdx}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              handleTableauColumnClick(colIdx);
            }}
            onClick={() => handleTableauColumnClick(colIdx)}
            className={`relative shrink-0 rounded-lg sm:rounded-xl transition-colors ${
              col.length === 0
                ? `border-2 border-dashed flex items-center justify-center cursor-pointer ${
                    isHintTarget
                      ? 'border-amber-300 bg-emerald-800/55'
                      : 'border-amber-200/35 bg-emerald-950/20'
                  }`
                : ''
            }`}
            style={{
              width: `${layout.cardW}px`,
              height: `${col.length === 0 ? layout.cardH : totalHeight}px`,
            }}
          >
            {col.length === 0 ? (
              <span className="text-xs sm:text-sm font-bold text-amber-100/45">K</span>
            ) : (
              col.map((card, cardIdx) => {
                const isSel =
                  selection?.source === 'tableau' &&
                  selection.col === colIdx &&
                  cardIdx >= selection.cardIndex;
                const isHinted = hint?.from === `tableau:${colIdx}:${cardIdx}`;
                const isTop = cardIdx === col.length - 1;
                return (
                  <button
                    key={card.id}
                    type="button"
                    disabled={!card.faceUp}
                    draggable={card.faceUp}
                    aria-label={
                      card.faceUp
                        ? `Coluna ${colIdx + 1}: ${card.rank} de ${SUIT_META[card.suit].label}`
                        : `Coluna ${colIdx + 1}: carta virada para baixo`
                    }
                    onDragStart={(e) => {
                      if (!card.faceUp) return;
                      e.dataTransfer.setData('text/plain', `${colIdx}:${cardIdx}`);
                      setSelection({ source: 'tableau', col: colIdx, cardIndex: cardIdx });
                    }}
                    onClick={(e) => handleTableauCardClick(colIdx, cardIdx, e)}
                    onDoubleClick={(e) => {
                      e.stopPropagation();
                      if (isTop && card.faceUp) {
                        handleAutoSendToFoundation('tableau', colIdx);
                      }
                    }}
                    className={`absolute left-0 right-0 text-left ${
                      card.faceUp ? 'cursor-pointer' : 'cursor-default'
                    }`}
                    style={{
                      top: `${offsets[cardIdx]}px`,
                      width: `${layout.cardW}px`,
                      height: `${layout.cardH}px`,
                      zIndex: cardIdx + 1,
                    }}
                  >
                    <SolitaireCardSvg
                      card={card}
                      selected={isSel}
                      hinted={isHinted}
                      compact={!isTop}
                      sizeVariant={layout.cardSize}
                    />
                  </button>
                );
              })
            )}
          </div>
        );
      })}
    </div>
  );

  return (
    <div
      data-testid="solitaire-fullscreen"
      data-layout-mode={layout.mode}
      className="fixed inset-0 z-50 w-screen h-[100dvh] flex flex-col overflow-hidden"
      style={{
        background: 'radial-gradient(circle at 50% 25%, #166534 0%, #0f5132 65%, #064e3b 100%)',
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Solitária dos Gatinhos"
    >
      {/* Sleek Full-Width Top HUD */}
      <header
        className={`shrink-0 bg-[#fffaf0]/95 border-b-2 border-[#2b1111] px-2.5 sm:px-5 flex items-center justify-between gap-1.5 sm:gap-3 shadow-md z-20 ${
          isSplit ? 'flex-nowrap py-1 h-11' : 'flex-wrap py-1.5 sm:py-2'
        }`}
      >
        <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
          <h2
            className={`font-display font-bold text-emerald-950 leading-none truncate ${
              isSplit ? 'text-base sm:text-lg' : 'text-lg sm:text-2xl'
            }`}
          >
            {isSplit ? 'Solitária 🃏' : 'Solitária dos Gatinhos 🃏'}
          </h2>
          <span className="hidden md:inline-block text-xs font-mono-num font-bold text-amber-800 bg-amber-100 border border-amber-900/20 px-2 py-0.5 rounded-lg whitespace-nowrap">
            +{computeSolitaireReward(difficulty)} 🐾
          </span>
          <div className="flex items-center gap-1 text-[11px] font-mono-num font-bold text-emerald-950 shrink-0">
            <span className="bg-emerald-100 border border-emerald-900/20 px-1.5 sm:px-2 py-0.5 rounded-md">
              {game.score} pts
            </span>
            <span className="bg-amber-100 border border-amber-900/20 px-1.5 sm:px-2 py-0.5 rounded-md">
              {game.moves} jog.
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1 sm:gap-1.5 shrink-0">
          <div className="flex gap-0.5 bg-emerald-100/80 p-0.5 rounded-xl border border-emerald-900/25">
            {DIFFICULTY_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => startNewGame(opt.id)}
                className={`px-1.5 sm:px-2 py-1 rounded-lg text-[11px] font-bold cursor-pointer whitespace-nowrap ${
                  difficulty === opt.id
                    ? 'bg-emerald-800 text-amber-100 shadow-sm'
                    : 'text-emerald-950 hover:bg-white'
                }`}
              >
                {opt.label}
                {!isSplit && <span className="hidden lg:inline"> (Compra {opt.sub})</span>}
              </button>
            ))}
          </div>

          {autoCompleteReady && !autoCompleting && (
            <button
              type="button"
              onClick={() => setAutoCompleting(true)}
              className="sketch-btn bg-amber-300 hover:bg-amber-400 text-red-950 px-2.5 py-1 rounded-xl text-[11px] font-bold flex items-center gap-1 cursor-pointer whitespace-nowrap"
            >
              <Sparkles className="w-3.5 h-3.5" /> Auto
            </button>
          )}

          <button
            type="button"
            onClick={handleUndo}
            disabled={undoStack.length === 0}
            aria-label="Desfazer jogada"
            className="sketch-btn bg-white px-2 py-1 rounded-xl text-[11px] font-bold flex items-center gap-1 cursor-pointer whitespace-nowrap disabled:opacity-45"
          >
            <Undo2 className="w-3.5 h-3.5" />
            {!isSplit && <span className="hidden sm:inline">Desfazer</span>}
          </button>

          <button
            type="button"
            onClick={handleShowHint}
            aria-label="Mostrar dica"
            className="sketch-btn bg-amber-200 hover:bg-amber-300 text-red-950 px-2 py-1 rounded-xl text-[11px] font-bold flex items-center gap-1 cursor-pointer whitespace-nowrap"
          >
            <Lightbulb className="w-3.5 h-3.5" />
            {!isSplit && <span className="hidden sm:inline">Dica</span>}
          </button>

          <button
            type="button"
            onClick={() => startNewGame(difficulty)}
            aria-label="Embaralhar nova partida"
            className="sketch-btn bg-emerald-700 hover:bg-emerald-800 text-amber-100 px-2 py-1 rounded-xl text-[11px] font-bold flex items-center gap-1 cursor-pointer whitespace-nowrap"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            {!isSplit && <span className="hidden sm:inline">Embaralhar</span>}
          </button>

          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar Solitária"
            className="sketch-btn bg-white hover:bg-rose-50 p-1.5 rounded-xl cursor-pointer"
          >
            <X className="w-4 h-4 text-[#2b1111]" />
          </button>
        </div>
      </header>

      {/* Floating Hint Banner */}
      {hint && (
        <div
          className={`absolute z-30 bg-amber-100 border-2 border-[#2b1111] text-amber-950 text-xs font-bold px-3.5 py-1.5 rounded-xl shadow-lg anim-card-pop max-w-[92vw] text-center ${
            isSplit ? 'bottom-2 right-3' : 'bottom-3 left-1/2 -translate-x-1/2'
          }`}
        >
          💡 Sugestão: {hint.description}
        </div>
      )}

      {/* Full-Screen Felt Board Area */}
      <main
        className="flex-1 min-h-0 w-full overflow-y-auto overflow-x-hidden flex justify-center items-start select-none"
        style={{
          paddingLeft: `${layout.padX}px`,
          paddingRight: `${layout.padX}px`,
          paddingTop: `${layout.padY}px`,
          paddingBottom: `${layout.padY}px`,
        }}
      >
        {isSplit ? (
          /* Compact Landscape Split: Left Stock/Waste + 2x2 Foundations, Right 7-col Tableau */
          <div className="flex items-start justify-center" style={{ gap: `${layout.splitGap}px` }}>
            <div className="flex flex-col shrink-0" style={{ gap: `${layout.rowGap}px` }}>
              <div className="flex items-start" style={{ gap: `${layout.colGap}px` }}>
                {stockButton}
                {wasteArea}
              </div>
              <div
                className="grid grid-cols-2"
                style={{ gap: `${layout.rowGap}px ${layout.colGap}px` }}
              >
                {foundationButtons}
              </div>
            </div>
            {tableauColumns}
          </div>
        ) : (
          /* Classic Top Layout: Top Row (7 cols) + 7-col Tableau */
          <div
            className="flex flex-col items-center shrink-0"
            style={{ gap: `${layout.rowGap}px`, width: `${tableauGridW}px` }}
          >
            <div
              className="flex items-start shrink-0"
              style={{ gap: `${layout.colGap}px`, width: `${tableauGridW}px` }}
            >
              {stockButton}
              {wasteArea}
              {foundationButtons}
            </div>
            {tableauColumns}
          </div>
        )}
      </main>

      {/* Victory Overlay */}
      {game.won && (
        <div
          className="absolute inset-0 z-40 flex items-center justify-center p-4 text-center"
          style={{ backgroundColor: 'rgba(6, 78, 59, 0.8)' }}
        >
          <div className="bg-[#fffaf0] border-2 border-[#1f2937] rounded-3xl p-5 max-w-sm w-full space-y-3 shadow-2xl anim-solitaire-cascade">
            <div className="flex justify-center gap-2 text-3xl">
              <span className="anim-solitaire-cascade">♠️</span>
              <span className="anim-solitaire-cascade">♥️</span>
              <span className="anim-solitaire-cascade">♣️</span>
              <span className="anim-solitaire-cascade">♦️</span>
            </div>
            <h3 className="font-display text-3xl font-bold text-emerald-950 leading-none">
              Vitória na Solitária!
            </h3>
            <p className="text-xs text-[#2b1111]/80 font-medium">
              Todos os gatinhos das 4 famílias voltaram para casa em {game.moves} jogadas!
            </p>
            <div className="bg-amber-100 border border-[#2b1111]/25 rounded-xl py-2 px-3 font-mono-num text-sm font-black text-amber-900">
              +{computeSolitaireReward(game.difficulty)} 🐾 Patinhas ganhas!
            </div>
            <button
              type="button"
              onClick={() => startNewGame(difficulty)}
              className="sketch-btn w-full bg-emerald-700 hover:bg-emerald-800 text-amber-100 font-bold text-sm py-2.5 rounded-xl cursor-pointer"
            >
              Nova Partida 🃏
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
