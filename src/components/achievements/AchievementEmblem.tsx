import React from 'react';
import { AchievementRarity } from '../../types/game';
import { AchievementDefinition, RARITY_META } from '../../logic/achievements';

interface AchievementEmblemProps {
  achievement: AchievementDefinition;
  unlocked: boolean;
  size?: number;
}

const RARITY_GRADIENTS: Record<
  AchievementRarity,
  { outer: string; inner: string; rim: string }
> = {
  bronze: { outer: '#f59e0b', inner: '#fef3c7', rim: '#78350f' },
  prata: { outer: '#cbd5e1', inner: '#f8fafc', rim: '#334155' },
  ouro: { outer: '#facc15', inner: '#fef9c3', rim: '#854d0e' },
  cosmico: { outer: '#7e22ce', inner: '#1e1b4b', rim: '#3b0764' },
};

export const AchievementEmblem: React.FC<AchievementEmblemProps> = ({
  achievement,
  unlocked,
  size = 56,
}) => {
  const pal = RARITY_GRADIENTS[achievement.rarity];
  const meta = RARITY_META[achievement.rarity];

  return (
    <div
      className={`relative shrink-0 inline-flex items-center justify-center select-none ${
        unlocked ? '' : 'opacity-50 grayscale'
      }`}
      style={{ width: size, height: size }}
      aria-label={`${achievement.title} (${meta.label}${unlocked ? ', desbloqueado' : ', bloqueado'})`}
    >
      <svg
        viewBox="0 0 64 64"
        width={size}
        height={size}
        className="block overflow-visible"
        aria-hidden="true"
      >
        <defs>
          <radialGradient id={`emb_${achievement.id}`} cx="35%" cy="30%" r="70%">
            <stop offset="0%" stopColor={unlocked ? pal.inner : '#e7e5e4'} />
            <stop offset="100%" stopColor={unlocked ? pal.outer : '#a8a29e'} />
          </radialGradient>
        </defs>

        {/* Laurel / Cosmic Rays for higher tiers when unlocked */}
        {unlocked && (achievement.rarity === 'ouro' || achievement.rarity === 'cosmico') && (
          <g stroke={meta.ringColor} strokeWidth="2" strokeLinecap="round" opacity="0.85">
            <line x1="32" y1="2" x2="32" y2="7" />
            <line x1="32" y1="57" x2="32" y2="62" />
            <line x1="2" y1="32" x2="7" y2="32" />
            <line x1="57" y1="32" x2="62" y2="32" />
            <line x1="10" y1="10" x2="14" y2="14" />
            <line x1="50" y1="50" x2="54" y2="54" />
            <line x1="54" y1="10" x2="50" y2="14" />
            <line x1="14" y1="50" x2="10" y2="54" />
          </g>
        )}

        {/* Outer scalloped medal shield */}
        <circle
          cx="32"
          cy="32"
          r="25"
          fill={`url(#emb_${achievement.id})`}
          stroke="#2b1111"
          strokeWidth="2.5"
        />

        {/* Inner engraved ring */}
        <circle
          cx="32"
          cy="32"
          r="20"
          fill="none"
          stroke={unlocked ? pal.rim : '#57534e'}
          strokeWidth="1.5"
          strokeDasharray={achievement.rarity === 'cosmico' ? '3 2.5' : undefined}
        />

        {achievement.game === 'sudoku' && unlocked && (
          <g stroke={pal.rim} strokeWidth="0.9" opacity="0.35">
            <line x1="25" y1="18" x2="25" y2="46" />
            <line x1="39" y1="18" x2="39" y2="46" />
            <line x1="18" y1="25" x2="46" y2="25" />
            <line x1="18" y1="39" x2="46" y2="39" />
          </g>
        )}

        {achievement.game === 'termo' && unlocked && (
          <g fill="none" stroke={pal.rim} strokeWidth="1" opacity="0.35">
            <rect x="17" y="21" width="9" height="9" rx="1.5" />
            <rect x="27.5" y="21" width="9" height="9" rx="1.5" />
            <rect x="38" y="21" width="9" height="9" rx="1.5" />
          </g>
        )}

        {achievement.game === 'solitaire' && unlocked && (
          <rect
            x="19"
            y="16"
            width="26"
            height="32"
            rx="4"
            fill="none"
            stroke={pal.rim}
            strokeWidth="1.2"
            opacity="0.35"
          />
        )}

        {/* Top ears silhouette (neutral royal ears for Solitaire, cat ears for others) */}
        <path
          d="M21 11 L24 4 L29 9 M35 9 L40 4 L43 11"
          fill={unlocked ? achievement.accent : '#d6d3d1'}
          stroke="#2b1111"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />

        {/* Center icon */}
        <text
          x="32"
          y="34"
          textAnchor="middle"
          dominantBaseline="central"
          fontSize="23"
        >
          {achievement.icon}
        </text>
      </svg>

      {!unlocked && (
        <span
          aria-hidden="true"
          className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-md bg-[#2b1111] text-amber-100 text-[10px] flex items-center justify-center border border-[#fff8ed]"
        >
          🔒
        </span>
      )}
    </div>
  );
};
