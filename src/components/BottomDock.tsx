import React from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { ViewportOrientation } from '../hooks/useOrientation';

export type ScreenTabId =
  | 'jardim'
  | 'armazem'
  | 'mercado'
  | 'jogos'
  | 'galeria'
  | 'partido'
  | 'radio'
  | 'atelie'
  | 'conquistas';

export const SCREEN_TABS: {
  id: ScreenTabId;
  icon: string;
  label: string;
  compactLabel?: string;
}[] = [
  { id: 'jardim', icon: '🌿', label: 'Jardim' },
  { id: 'armazem', icon: '🎒', label: 'Armazém' },
  { id: 'mercado', icon: '🏪', label: 'Mercado' },
  { id: 'jogos', icon: '🎮', label: 'Jogos' },
  { id: 'galeria', icon: '🖼️', label: 'Galeria' },
  { id: 'partido', icon: '📖', label: 'Partido' },
  { id: 'radio', icon: '💬', label: 'Rádio' },
  { id: 'atelie', icon: '☭', label: 'Ateliê' },
  { id: 'conquistas', icon: '🏆', label: 'Conquistas', compactLabel: 'Troféus' },
];

interface BottomDockProps {
  vp: ViewportOrientation;
  activeTab: ScreenTabId;
  lettersCount: number;
  isHidden: boolean;
  onSelectTab: (tab: ScreenTabId) => void;
  onToggleHidden: () => void;
}

export const BottomDock: React.FC<BottomDockProps> = ({
  vp,
  activeTab,
  lettersCount,
  isHidden,
  onSelectTab,
  onToggleHidden,
}) => {
  const compact = vp.isCompactLandscape;

  return (
    <div className="fixed bottom-1.5 sm:bottom-2 left-1/2 -translate-x-1/2 w-[97%] max-w-4xl z-40 pointer-events-none flex flex-col items-center">
      <button
        type="button"
        onClick={onToggleHidden}
        aria-expanded={!isHidden}
        aria-label={isHidden ? 'Mostrar barra de telas' : 'Ocultar barra de telas'}
        className={`pointer-events-auto cursor-pointer flex items-center gap-1.5 px-3.5 font-bold text-[11px] bg-[#fff8ed]/95 hover:bg-amber-100 text-red-950 border-2 border-[#2b1111] shadow-md transition-all ${
          isHidden
            ? 'rounded-full py-1.5 min-h-[36px]'
            : 'rounded-t-xl border-b-0 py-0.5 -mb-0.5 z-10'
        }`}
      >
        {isHidden ? (
          <>
            <ChevronUp className="w-3.5 h-3.5 text-red-800" />
            <span>Mostrar Telas</span>
          </>
        ) : (
          <>
            <ChevronDown className="w-3.5 h-3.5 text-red-800" />
            <span>Ocultar barra</span>
          </>
        )}
      </button>

      {!isHidden && (
        <nav
          aria-label="Navegação principal"
          className={`pointer-events-auto w-full bg-[#fff8ed]/95 backdrop-blur-sm border-2 border-[#2b1111] rounded-2xl shadow-xl grid grid-cols-9 gap-0.5 sm:gap-1.5 ${
            compact ? 'p-1' : 'p-1 sm:p-2'
          }`}
        >
          {SCREEN_TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onSelectTab(tab.id)}
                aria-label={tab.label}
                aria-current={isActive ? 'page' : undefined}
                className={`rounded-xl font-bold flex flex-col items-center justify-center relative transition-all cursor-pointer min-w-0 ${
                  compact ? 'min-h-[38px] py-0.5' : 'min-h-[44px] py-1'
                } ${
                  isActive
                    ? 'bg-red-700 text-amber-200 border-2 border-[#2b1111] -translate-y-0.5 shadow-sm'
                    : 'bg-[#fff8ed] hover:bg-amber-100 text-red-950 border border-[#2b1111]/25'
                }`}
              >
                <span className={compact ? 'text-sm leading-none' : 'text-base leading-none'}>
                  {tab.icon}
                </span>
                <span className="text-[8px] sm:text-xs tracking-tighter sm:tracking-normal whitespace-nowrap mt-0.5 max-w-full truncate">
                  {tab.compactLabel ? (
                    <>
                      <span className="sm:hidden">{tab.compactLabel}</span>
                      <span className="hidden sm:inline">{tab.label}</span>
                    </>
                  ) : (
                    tab.label
                  )}
                </span>
                {tab.id === 'radio' && lettersCount > 0 && !isActive && (
                  <span className="absolute -top-1 -right-1 bg-red-700 text-amber-100 text-[9px] font-mono-num px-1 rounded-full border border-[#2b1111] leading-tight">
                    {lettersCount > 99 ? '99+' : lettersCount}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      )}
    </div>
  );
};
