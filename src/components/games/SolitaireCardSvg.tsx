import React from 'react';
import { CardSuit, getRankLabel, PlayingCard, SUIT_META } from '../../logic/solitaire';

interface SolitaireCardSvgProps {
  card: PlayingCard;
  selected?: boolean;
  hinted?: boolean;
  compact?: boolean;
  sizeVariant?: 'sm' | 'md' | 'lg';
}

const SUIT_THEME: Record<
  CardSuit,
  {
    ink: string;
    fur: string;
    accent: string;
    bg: string;
    catTitle: string;
  }
> = {
  spades: {
    ink: '#1e293b',
    fur: '#475569',
    accent: '#38bdf8',
    bg: '#f8fafc',
    catTitle: 'astrônomo',
  },
  hearts: {
    ink: '#be123c',
    fur: '#fb923c',
    accent: '#f43f5e',
    bg: '#fff1f2',
    catTitle: 'jardineiro',
  },
  clubs: {
    ink: '#064e3b',
    fur: '#334155',
    accent: '#10b981',
    bg: '#ecfdf5',
    catTitle: 'botânico',
  },
  diamonds: {
    ink: '#b45309',
    fur: '#f59e0b',
    accent: '#fbbf24',
    bg: '#fffbeb',
    catTitle: 'músico',
  },
};

export const SolitaireCardSvg: React.FC<SolitaireCardSvgProps> = ({
  card,
  selected = false,
  hinted = false,
  compact = false,
  sizeVariant = 'md',
}) => {
  if (!card.faceUp) {
    return (
      <div
        className={`w-full h-full rounded-lg sm:rounded-xl border-2 border-[#1e293b] bg-[#fefcf6] ${
          sizeVariant === 'sm' ? 'p-0.5' : 'p-1'
        } shadow-sm select-none ${hinted ? 'ring-2 ring-amber-400' : ''}`}
      >
        <div
          className="w-full h-full rounded-md sm:rounded-lg border border-amber-300/60 flex items-center justify-center overflow-hidden relative"
          style={{
            background: 'linear-gradient(145deg, #1e293b 0%, #312e81 55%, #1e1b4b 100%)',
          }}
        >
          <svg viewBox="0 0 60 84" className="w-full h-full" aria-hidden="true">
            <rect
              x="4"
              y="4"
              width="52"
              height="76"
              rx="6"
              fill="none"
              stroke="#fde68a"
              strokeWidth="1.2"
              strokeDasharray="3 2"
              opacity="0.7"
            />
            <path
              d="M36 22 A12 12 0 1 0 42 40 A9.5 9.5 0 1 1 36 22 Z"
              fill="#fde68a"
              opacity="0.9"
            />
            <circle cx="20" cy="24" r="1.4" fill="#fef3c7" />
            <circle cx="44" cy="20" r="1.1" fill="#fef3c7" />
            <circle cx="17" cy="60" r="1.2" fill="#fef3c7" />
            <path
              d="M21 53 L23 43 L28 48 L32 48 L37 43 L39 53 C39 59 35 63 30 63 C25 63 21 59 21 53 Z"
              fill="#f8fafc"
              stroke="#fde68a"
              strokeWidth="1.2"
            />
            <circle cx="27" cy="54" r="1.2" fill="#1e1b4b" />
            <circle cx="33" cy="54" r="1.2" fill="#1e1b4b" />
            <path d="M29 56.5 L31 56.5 L30 58 Z" fill="#f472b6" />
          </svg>
        </div>
      </div>
    );
  }

  const theme = SUIT_THEME[card.suit];
  const suitMeta = SUIT_META[card.suit];
  const rankLabel = getRankLabel(card.rank);
  const isCourtOrAce = card.rank === 1 || card.rank >= 11;

  const rankSizeClass =
    sizeVariant === 'sm'
      ? 'text-[11px]'
      : sizeVariant === 'md'
      ? 'text-xs sm:text-sm'
      : 'text-sm sm:text-base';
  const suitSizeClass =
    sizeVariant === 'sm'
      ? 'text-[10px]'
      : sizeVariant === 'md'
      ? 'text-xs sm:text-sm'
      : 'text-sm sm:text-base';
  const padClass = sizeVariant === 'sm' ? 'p-0.5' : sizeVariant === 'md' ? 'p-1' : 'p-1.5';

  return (
    <div
      className={`w-full h-full rounded-lg sm:rounded-xl border-2 bg-[#fffdf8] flex flex-col justify-between ${padClass} shadow-md select-none transition-transform ${
        selected
          ? 'border-amber-500 ring-2 ring-amber-400 -translate-y-1'
          : hinted
          ? 'border-emerald-500 ring-2 ring-emerald-400'
          : 'border-[#1f2937]'
      }`}
    >
      {/* Top index strip: rank + suit side-by-side so stacked cards remain 100% legible */}
      <div
        className="flex items-center justify-between leading-none px-0.5 shrink-0"
        style={{ color: theme.ink }}
      >
        <div className="flex items-center gap-0.5">
          <span className={`font-mono-num font-black tracking-tight ${rankSizeClass}`}>
            {rankLabel}
          </span>
          <span className={suitSizeClass}>{suitMeta.symbol}</span>
        </div>
        {compact ? (
          <span className={`opacity-75 ${suitSizeClass}`} aria-hidden="true">
            {suitMeta.symbol}
          </span>
        ) : (
          <span
            className={`${sizeVariant === 'sm' ? 'text-[8px]' : 'text-[10px]'} opacity-60 font-bold`}
            aria-hidden="true"
          >
            🐾
          </span>
        )}
      </div>

      {/* Center custom non-communist cozy cat artwork */}
      <div
        className="flex-1 min-h-0 my-0.5 rounded-md sm:rounded-lg flex items-center justify-center overflow-hidden border"
        style={{ backgroundColor: theme.bg, borderColor: `${theme.ink}22` }}
      >
        {isCourtOrAce ? (
          <svg viewBox="0 0 64 64" className="w-[82%] h-[82%]" aria-hidden="true">
            <circle cx="32" cy="34" r="22" fill="#ffffff" stroke={theme.accent} strokeWidth="2" />
            <path
              d="M19 30 L21 15 L29 24 L35 24 L43 15 L45 30 C46 41 40 48 32 48 C24 48 18 41 19 30 Z"
              fill={theme.fur}
              stroke={theme.ink}
              strokeWidth="2"
              strokeLinejoin="round"
            />
            {card.rank === 13 && (
              <path
                d="M24 20 L27 12 L32 18 L37 12 L40 20 Z"
                fill="#fbbf24"
                stroke={theme.ink}
                strokeWidth="1.5"
              />
            )}
            {card.rank === 12 && (
              <circle cx="41" cy="21" r="4" fill="#f472b6" stroke={theme.ink} strokeWidth="1.3" />
            )}
            {card.rank === 11 && (
              <path
                d="M22 44 Q32 49 42 44 L40 50 L24 50 Z"
                fill={theme.accent}
                stroke={theme.ink}
                strokeWidth="1.4"
              />
            )}
            <circle cx="27" cy="34" r="2.3" fill="#ffffff" />
            <circle cx="37" cy="34" r="2.3" fill="#ffffff" />
            <circle cx="27" cy="34" r="1.2" fill="#111827" />
            <circle cx="37" cy="34" r="1.2" fill="#111827" />
            <path d="M30 38 L34 38 L32 40.5 Z" fill="#fb7185" />
            <path
              d="M28 42 Q32 44 36 42"
              fill="none"
              stroke="#ffffff"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
            {card.rank === 1 && (
              <text
                x="32"
                y="57"
                textAnchor="middle"
                fontSize="12"
                fill={theme.ink}
                fontWeight="bold"
              >
                {suitMeta.symbol}
              </text>
            )}
          </svg>
        ) : (
          <div className="flex flex-col items-center justify-center" style={{ color: theme.ink }}>
            <span
              className={`leading-none ${
                sizeVariant === 'sm'
                  ? 'text-base'
                  : sizeVariant === 'md'
                  ? 'text-xl sm:text-2xl'
                  : 'text-2xl sm:text-3xl'
              }`}
            >
              {suitMeta.symbol}
            </span>
            {sizeVariant !== 'sm' && (
              <span className="text-[10px] opacity-70 leading-none mt-0.5">🐱</span>
            )}
          </div>
        )}
      </div>

      {/* Bottom inverted corner index */}
      {!compact && (
        <div
          className="flex items-end justify-end leading-none rotate-180 px-0.5 shrink-0"
          style={{ color: theme.ink }}
          aria-hidden="true"
        >
          <span className={`font-mono-num font-black ${sizeVariant === 'sm' ? 'text-[10px]' : 'text-xs'}`}>
            {rankLabel}
          </span>
        </div>
      )}
    </div>
  );
};
