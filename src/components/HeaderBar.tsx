import React from 'react';
import { Volume2, VolumeX, Lock, Mail, UserCheck, Pencil } from 'lucide-react';
import { PlayerActiveGameStatus, PlayerRole, Wallet } from '../types/game';
import { ViewportOrientation } from '../hooks/useOrientation';

interface HeaderBarProps {
  myRole: PlayerRole;
  myNick: string;
  partnerNick?: string;
  partnerActiveGame?: PlayerActiveGameStatus | null;
  wallet: Wallet;
  connected: boolean;
  isSyncedToday: boolean;
  lettersCount: number;
  muted: boolean;
  vp: ViewportOrientation;
  isAdmin?: boolean;
  onOpenAdminFish?: () => void;
  onClaimDaily: () => void;
  onOpenSync: () => void;
  onToggleIdentity: () => void;
  onLogout: () => void;
  onOpenLetters: () => void;
  onToggleMute: () => void;
}

export const HeaderBar: React.FC<HeaderBarProps> = ({
  myRole,
  myNick,
  partnerNick,
  partnerActiveGame,
  wallet,
  connected,
  isSyncedToday,
  lettersCount,
  muted,
  vp,
  isAdmin = false,
  onOpenAdminFish,
  onClaimDaily,
  onOpenSync,
  onToggleIdentity,
  onLogout,
  onOpenLetters,
  onToggleMute,
}) => {
  const compact = vp.isCompactLandscape;

  return (
    <header
      className={`w-full max-w-5xl bg-[#fff8ed] rounded-2xl sketch-border border-t-4 border-t-red-700 z-30 ${
        compact ? 'px-2.5 py-1' : 'px-3.5 py-2.5 sm:px-5 sm:py-3'
      }`}
    >
      <div
        className={`flex items-center justify-between gap-2 ${
          compact ? 'flex-nowrap overflow-x-auto custom-scroll' : 'flex-wrap sm:gap-4'
        }`}
      >
        {/* Brand */}
        <div className="flex items-center gap-2 min-w-0 shrink-0">
          <div
            className={`${
              compact ? 'w-7 h-7 text-base' : 'w-10 h-10 text-xl'
            } rounded-xl bg-red-700 border-2 border-[#2b1111] flex items-center justify-center text-amber-300 shadow-sm shrink-0`}
            aria-hidden="true"
          >
            ☭
          </div>
          <div className="min-w-0">
            <h1
              className={`font-display font-bold leading-none text-red-900 whitespace-nowrap ${
                compact ? 'text-lg' : 'text-2xl sm:text-3xl truncate'
              }`}
            >
              União dos Camaradas Felinos
            </h1>
            {!compact && (
              <p className="text-[11px] text-[#2b1111]/75 font-semibold truncate mt-0.5 flex items-center gap-1.5">
                <span>{connected ? 'Sputnik Conectado' : 'Modo Local'} · Coletivo do Casal</span>
                {partnerActiveGame && (
                  <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-950 border border-emerald-700/35 px-1.5 py-0.2 rounded-md text-[10px] font-bold">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                    {partnerNick || 'Amor'}: {partnerActiveGame.icon} {partnerActiveGame.label}
                  </span>
                )}
              </p>
            )}
          </div>
        </div>

        {/* Actions & Wallets */}
        <div className={`flex items-center gap-1.5 ${compact ? 'flex-nowrap shrink-0' : 'sm:gap-2 flex-wrap'}`}>
          {/* Wallet strip */}
          <div
            className={`bg-amber-100 text-red-950 border-2 border-red-800 rounded-xl flex items-center gap-1.5 sm:gap-2 text-xs font-bold font-mono-num shrink-0 ${
              compact ? 'px-2 py-0.5' : 'px-2.5 py-1'
            }`}
          >
            <span title="Peixes do Estado — Moeda diária (reinicia às 00:00)">🐟 {wallet.fish}</span>
            {isAdmin && onOpenAdminFish && (
              <button
                type="button"
                onClick={onOpenAdminFish}
                title="Painel Hack do Admin: Editar todos os valores (Admin, Amy e Contador de Dias)"
                aria-label="Abrir Painel Hack do Admin"
                className="bg-amber-300 hover:bg-amber-400 text-red-950 border border-[#2b1111]/60 p-1 rounded-md cursor-pointer flex items-center justify-center"
              >
                <Pencil className="w-3 h-3" />
              </button>
            )}
            <button
              type="button"
              onClick={onClaimDaily}
              title="Resgatar Moeda Diária (+1 Peixe · Reinicia às 00:00)"
              className="bg-red-700 hover:bg-red-800 text-amber-200 border border-[#2b1111] px-1.5 py-0.5 rounded-lg text-[11px] font-sans font-bold whitespace-nowrap cursor-pointer"
            >
              +1 🐟
            </button>
            <span title="Patinhas — Ganhas nos Jogos (Comidas)">🐾 {wallet.paws}</span>
            <span
              title="Medalhas do Partido (Visuais Anime)"
              className="text-red-800 border-l border-red-800/30 pl-1.5"
            >
              💖 {wallet.coupleCoins}
            </span>
          </div>

          <button
            type="button"
            onClick={onOpenSync}
            className={`sketch-btn rounded-xl text-xs font-bold flex items-center gap-1 whitespace-nowrap cursor-pointer ${
              compact ? 'px-2 py-1' : 'px-2.5 py-1.5'
            } ${
              isSyncedToday
                ? 'bg-emerald-100 text-emerald-950'
                : 'bg-amber-200 text-red-950'
            }`}
            aria-label="Ponto do Sindicato"
          >
            <span>{isSyncedToday ? '🔓' : '🔒'}</span>
            {!compact && (
              <span className="hidden sm:inline">
                {isSyncedToday ? 'Sindicato Ativo' : 'Ponto Diário'}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={onToggleIdentity}
            className={`sketch-btn bg-white hover:bg-amber-50 rounded-xl font-bold text-xs flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              compact ? 'px-2 py-1' : 'px-2.5 py-1.5'
            }`}
            aria-label="Alternar Camarada"
          >
            <UserCheck className="w-3.5 h-3.5 text-red-700" />
            <span className="text-red-800 max-w-[84px] sm:max-w-[96px] truncate">
              {myNick || (myRole === 'cat1' ? 'Camarada 1' : 'Camarada 2')}
            </span>
          </button>

          <button
            type="button"
            onClick={onOpenLetters}
            className={`sketch-btn bg-red-700 hover:bg-red-800 rounded-xl font-bold text-xs flex items-center gap-1 text-amber-100 whitespace-nowrap cursor-pointer ${
              compact ? 'px-2 py-1' : 'px-2.5 py-1.5'
            }`}
            aria-label="Abrir Telegramas"
          >
            <Mail className="w-3.5 h-3.5" />
            {!compact && <span className="hidden sm:inline">Telegramas</span>}
            <span className="font-mono-num bg-amber-300 text-red-950 px-1.5 rounded text-[11px] font-bold">
              {lettersCount}
            </span>
          </button>

          <button
            type="button"
            onClick={onToggleMute}
            className={`sketch-btn bg-white hover:bg-amber-50 rounded-xl text-[#2b1111] cursor-pointer ${
              compact ? 'p-1' : 'p-1.5'
            }`}
            aria-label={muted ? 'Ativar som' : 'Silenciar som'}
            title={muted ? 'Ativar som' : 'Silenciar som'}
          >
            {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>

          <button
            type="button"
            onClick={onLogout}
            className={`sketch-btn bg-stone-100 hover:bg-stone-200 rounded-xl text-stone-800 cursor-pointer ${
              compact ? 'p-1' : 'p-1.5'
            }`}
            aria-label="Trocar credencial"
            title="Trocar credencial"
          >
            <Lock className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
