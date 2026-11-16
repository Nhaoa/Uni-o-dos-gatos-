import React, { useState } from 'react';
import { PlayerRole, SharedState } from '../../types/game';
import { normalizeScores } from '../../logic/scores';

interface PartyScreenProps {
  myRole: PlayerRole;
  state: SharedState;
  hasRoomPassword: boolean;
  canManageAccount: boolean;
  isAdmin?: boolean;
  onOpenAdminFish?: () => void;
  onOpenSync: () => void;
  onUpdateNickname: (newNickname: string) => Promise<{ ok: boolean; error?: string }>;
  onUpdateRoomPassword: (
    currentPassword: string,
    newPassword: string
  ) => Promise<{ ok: boolean; error?: string }>;
}

export const PartyScreen: React.FC<PartyScreenProps> = ({
  myRole,
  state,
  hasRoomPassword,
  canManageAccount,
  isAdmin = false,
  onOpenAdminFish,
  onOpenSync,
  onUpdateNickname,
  onUpdateRoomPassword,
}) => {
  const [newNick, setNewNick] = useState('');
  const [savingNick, setSavingNick] = useState(false);
  const [nickMsg, setNickMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const [curPass, setCurPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [savingPass, setSavingPass] = useState(false);
  const [passMsg, setPassMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const handleNickSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingNick(true);
    setNickMsg(null);
    const res = await onUpdateNickname(newNick.trim());
    setSavingNick(false);
    if (res.ok) {
      setNewNick('');
      setNickMsg({
        ok: true,
        text: 'Nick atualizado! Na próxima entrada, use este novo nick.',
      });
    } else {
      setNickMsg({ ok: false, text: res.error || 'Não foi possível alterar o nick.' });
    }
  };

  const handlePassSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingPass(true);
    setPassMsg(null);
    const res = await onUpdateRoomPassword(curPass.trim(), newPass.trim());
    setSavingPass(false);
    if (res.ok) {
      setCurPass('');
      setNewPass('');
      setPassMsg({ ok: true, text: 'Código secreto atualizado!' });
    } else {
      setPassMsg({ ok: false, text: res.error || 'Não foi possível atualizar.' });
    }
  };

  return (
    <section className="w-full max-w-5xl bg-[#fff8ed] rounded-3xl sketch-border p-4 sm:p-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-[#2b1111]/15 pb-3">
        <div>
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-red-950">
            Diário do Partido & Conta 📖
          </h2>
          <p className="text-xs text-[#2b1111]/75">
            Planos quinquenais, quadro de honra do casal e segurança da sua credencial.
          </p>
        </div>
        <button
          type="button"
          onClick={onOpenSync}
          className={`sketch-btn text-xs font-bold px-3.5 py-2 rounded-xl whitespace-nowrap cursor-pointer ${
            state.presence.syncedToday
              ? 'bg-emerald-100 text-emerald-950'
              : 'bg-amber-300 hover:bg-amber-400 text-red-950'
          }`}
        >
          {state.presence.syncedToday ? '🔓 Sindicato Ativo Hoje' : '🔒 Validar Ponto Diário'}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Chama da Revolução */}
        <div className="bg-gradient-to-r from-red-100 via-amber-100 to-red-100 border-2 border-[#2b1111] rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between text-xs font-bold text-red-950">
            <span>Chama da Revolução ☭</span>
            <span>{state.presence.syncedToday ? 'Ponto Validado ✓' : 'Aguardando Ponto'}</span>
          </div>
          <div className="grid grid-cols-3 text-center py-2 font-mono-num">
            <div>
              <div className="text-2xl sm:text-3xl font-black text-red-700">
                🔥 {state.streak.current}
              </div>
              <span className="text-[11px] font-sans font-semibold text-[#2b1111]/80">
                Dias Seguidos
              </span>
            </div>
            <div>
              <div className="text-2xl font-bold text-amber-800">{state.streak.best}</div>
              <span className="text-[11px] font-sans font-semibold text-[#2b1111]/80">Recorde</span>
            </div>
            <div>
              <div className="text-2xl font-bold text-red-900">{state.streak.totalDays}</div>
              <span className="text-[11px] font-sans font-semibold text-[#2b1111]/80">
                Total de Dias
              </span>
            </div>
          </div>
        </div>

        {/* Quadro de Honra */}
        {(() => {
          const scores = normalizeScores(state.scores);
          return (
            <div className="bg-white border-2 border-[#2b1111] rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-bold text-red-950">🏆 Quadro de Honra das Olimpíadas</h3>
                <span className="text-[11px] font-semibold text-[#2b1111]/65">
                  Vitórias · Derrotas · Empates
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] gap-2 text-center text-xs font-mono-num items-stretch">
                <div className="bg-amber-50 p-2.5 rounded-xl border border-[#2b1111] flex flex-col justify-between gap-1.5">
                  <span className="font-sans font-bold text-xs block truncate text-amber-950">
                    {state.nicknames.cat1}
                  </span>
                  <div className="grid grid-cols-2 gap-1.5">
                    <div className="bg-white/85 rounded-lg py-1 px-1.5 border border-amber-900/15">
                      <span
                        data-testid="score-cat1-wins"
                        className="text-lg sm:text-xl font-black text-emerald-700 block leading-tight"
                      >
                        {scores.cat1Wins}
                      </span>
                      <span className="font-sans text-[10px] font-semibold text-[#2b1111]/75 block">
                        Vitórias
                      </span>
                    </div>
                    <div className="bg-white/85 rounded-lg py-1 px-1.5 border border-amber-900/15">
                      <span
                        data-testid="score-cat1-losses"
                        className="text-lg sm:text-xl font-black text-rose-700 block leading-tight"
                      >
                        {scores.cat1Losses}
                      </span>
                      <span className="font-sans text-[10px] font-semibold text-[#2b1111]/75 block">
                        Derrotas
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-stone-50 px-4 py-2.5 rounded-xl border border-[#2b1111] flex flex-col items-center justify-center min-w-[92px]">
                  <span className="font-sans font-bold text-xs block text-stone-800">Empates</span>
                  <span
                    data-testid="score-ties"
                    className="text-xl sm:text-2xl font-black text-stone-700 leading-tight my-0.5"
                  >
                    {scores.ties}
                  </span>
                  <span className="font-sans text-[10px] font-semibold text-[#2b1111]/70 block">
                    Partidas
                  </span>
                </div>

                <div className="bg-red-50 p-2.5 rounded-xl border border-[#2b1111] flex flex-col justify-between gap-1.5">
                  <span className="font-sans font-bold text-xs block truncate text-red-950">
                    {state.nicknames.cat2}
                  </span>
                  <div className="grid grid-cols-2 gap-1.5">
                    <div className="bg-white/85 rounded-lg py-1 px-1.5 border border-red-900/15">
                      <span
                        data-testid="score-cat2-wins"
                        className="text-lg sm:text-xl font-black text-emerald-700 block leading-tight"
                      >
                        {scores.cat2Wins}
                      </span>
                      <span className="font-sans text-[10px] font-semibold text-[#2b1111]/75 block">
                        Vitórias
                      </span>
                    </div>
                    <div className="bg-white/85 rounded-lg py-1 px-1.5 border border-red-900/15">
                      <span
                        data-testid="score-cat2-losses"
                        className="text-lg sm:text-xl font-black text-rose-700 block leading-tight"
                      >
                        {scores.cat2Losses}
                      </span>
                      <span className="font-sans text-[10px] font-semibold text-[#2b1111]/75 block">
                        Derrotas
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

        {canManageAccount && (
          <>
            <form
              onSubmit={handleNickSubmit}
              className="bg-white border-2 border-[#2b1111] rounded-2xl p-4 space-y-2.5"
            >
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-bold text-red-950">🪪 Alterar Meu Nick</h3>
                <span className="text-xs font-semibold text-[#2b1111]/70">
                  Atual: {state.nicknames[myRole]}
                </span>
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newNick}
                  onChange={(e) => setNewNick(e.target.value)}
                  placeholder="Novo nick (2 a 18 caracteres)"
                  minLength={2}
                  maxLength={18}
                  className="flex-1 text-xs sm:text-sm px-3 py-2 rounded-xl border border-[#2b1111]/60 bg-[#fff8ed]"
                />
                <button
                  type="submit"
                  disabled={savingNick || newNick.trim().length < 2}
                  className="sketch-btn bg-amber-300 hover:bg-amber-400 text-red-950 text-xs font-bold px-3.5 py-2 rounded-xl cursor-pointer disabled:opacity-50 whitespace-nowrap"
                >
                  {savingNick ? 'Salvando...' : 'Mudar Nick'}
                </button>
              </div>
              {nickMsg && (
                <p className={`text-xs font-bold ${nickMsg.ok ? 'text-emerald-700' : 'text-red-700'}`}>
                  {nickMsg.text}
                </p>
              )}
            </form>

            <form
              onSubmit={handlePassSubmit}
              className="bg-white border-2 border-[#2b1111] rounded-2xl p-4 space-y-2.5"
            >
              <h3 className="text-sm font-bold text-red-950">🔐 Código Secreto da Sala</h3>
              {hasRoomPassword && (
                <input
                  type="password"
                  value={curPass}
                  onChange={(e) => setCurPass(e.target.value)}
                  placeholder="Código secreto atual"
                  className="w-full text-xs sm:text-sm px-3 py-2 rounded-xl border border-[#2b1111]/60 bg-[#fff8ed]"
                />
              )}
              <div className="flex gap-2">
                <input
                  type="password"
                  value={newPass}
                  onChange={(e) => setNewPass(e.target.value)}
                  placeholder="Novo código (mín. 4 caracteres)"
                  minLength={4}
                  maxLength={32}
                  className="flex-1 text-xs sm:text-sm px-3 py-2 rounded-xl border border-[#2b1111]/60 bg-[#fff8ed]"
                />
                <button
                  type="submit"
                  disabled={savingPass || newPass.trim().length < 4}
                  className="sketch-btn bg-amber-300 hover:bg-amber-400 text-red-950 text-xs font-bold px-3.5 py-2 rounded-xl cursor-pointer disabled:opacity-50 whitespace-nowrap"
                >
                  {savingPass ? 'Salvando...' : 'Atualizar'}
                </button>
              </div>
              {passMsg && (
                <p className={`text-xs font-bold ${passMsg.ok ? 'text-emerald-700' : 'text-red-700'}`}>
                  {passMsg.text}
                </p>
              )}
            </form>
          </>
        )}

        {isAdmin && onOpenAdminFish && (
          <div className="md:col-span-2 bg-gradient-to-r from-amber-100 via-[#fff8ed] to-red-100 border-2 border-[#2b1111] rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-red-950">
                🛠️ Painel Hack Mestre do Admin ({state.nicknames.cat1} & {state.nicknames.cat2})
              </h3>
              <p className="text-xs text-[#2b1111]/75 mt-0.5">
                Exclusivo para você ({state.nicknames.cat1}). Edite contador de dias seguidos, moedas, status vitais, placar e comidas seus e da {state.nicknames.cat2}.
              </p>
            </div>
            <button
              type="button"
              onClick={onOpenAdminFish}
              className="sketch-btn bg-red-700 hover:bg-red-800 text-amber-100 text-xs font-bold px-4 py-2 rounded-xl cursor-pointer whitespace-nowrap"
            >
              ⚡ Abrir Painel Hack Completo
            </button>
          </div>
        )}
      </div>
    </section>
  );
};
