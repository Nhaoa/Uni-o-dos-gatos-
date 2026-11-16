import React, { useState } from 'react';
import { X } from 'lucide-react';
import { PlayerRole, SharedState } from '../types/game';
import { generateDailyCodeForRole, getTodayDateString } from '../logic/minigames';
import { normalizeScores } from '../logic/scores';

/* 1. DIÁRIO DO PARTIDO */
export const PartnerDiaryModal: React.FC<{
  open: boolean;
  myRole: PlayerRole;
  state: SharedState;
  hasRoomPassword?: boolean;
  canManageAccount?: boolean;
  onUpdateNickname?: (newNickname: string) => Promise<{ ok: boolean; error?: string }>;
  onUpdateRoomPassword?: (currentPassword: string, newPassword: string) => Promise<{ ok: boolean; error?: string }>;
  onClose: () => void;
}> = ({
  open,
  myRole,
  state,
  hasRoomPassword,
  canManageAccount,
  onUpdateNickname,
  onUpdateRoomPassword,
  onClose,
}) => {
  const [newNick, setNewNick] = useState('');
  const [savingNick, setSavingNick] = useState(false);
  const [nickMsg, setNickMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const [curPass, setCurPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [savingPass, setSavingPass] = useState(false);
  const [passMsg, setPassMsg] = useState<{ ok: boolean; text: string } | null>(null);

  if (!open) return null;

  const handleNickSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onUpdateNickname) return;
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
    if (!onUpdateRoomPassword) return;
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
    <div className="fixed inset-0 bg-black/65 z-50 flex items-center justify-center p-3" role="dialog" aria-modal="true">
      <div className="bg-[#fff8ed] max-w-md w-full p-5 rounded-3xl sketch-border space-y-4 shadow-2xl max-h-[90dvh] overflow-y-auto">
        <div className="flex justify-between items-center border-b-2 border-[#2b1111]/15 pb-2">
          <div>
            <h2 className="font-display text-2xl font-bold text-red-950">Diário do Partido & Planos Quinquenais</h2>
            <p className="text-xs text-[#2b1111]/70">Registro histórico da união proletária</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Fechar diário" className="sketch-btn bg-white p-1.5 rounded-xl cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="bg-gradient-to-r from-red-100 via-amber-100 to-red-100 border-2 border-[#2b1111] rounded-2xl p-3.5 space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-red-950">
            <span>Chama da Revolução ☭</span>
            <span>{state.presence.syncedToday ? 'Ponto Validado ✓' : 'Aguardando Ponto'}</span>
          </div>
          <div className="grid grid-cols-3 text-center py-1 font-mono-num">
            <div>
              <div className="text-2xl font-black text-red-700">🔥 {state.streak.current}</div>
              <span className="text-[11px] font-sans font-semibold text-[#2b1111]/80">Dias Seguidos</span>
            </div>
            <div>
              <div className="text-xl font-bold text-amber-800">{state.streak.best}</div>
              <span className="text-[11px] font-sans font-semibold text-[#2b1111]/80">Recorde</span>
            </div>
            <div>
              <div className="text-xl font-bold text-red-900">{state.streak.totalDays}</div>
              <span className="text-[11px] font-sans font-semibold text-[#2b1111]/80">Total de Dias</span>
            </div>
          </div>
        </div>

        {(() => {
          const scores = normalizeScores(state.scores);
          return (
            <div className="bg-white border-2 border-[#2b1111] rounded-2xl p-3 space-y-2">
              <h3 className="text-xs font-bold text-[#2b1111]">🏆 Quadro de Honra das Olimpíadas</h3>
              <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] gap-2 text-center text-xs font-mono-num">
                <div className="bg-amber-50 p-2 rounded-xl border border-[#2b1111] space-y-1">
                  <span className="font-sans font-bold text-[11px] block truncate text-amber-950">
                    {state.nicknames.cat1}
                  </span>
                  <div className="grid grid-cols-2 gap-1">
                    <div className="bg-white/85 rounded-lg py-1 border border-amber-900/15">
                      <span className="text-base font-black text-emerald-700 block leading-tight">
                        {scores.cat1Wins}
                      </span>
                      <span className="font-sans text-[9px] font-semibold text-[#2b1111]/70 block">
                        Vitórias
                      </span>
                    </div>
                    <div className="bg-white/85 rounded-lg py-1 border border-amber-900/15">
                      <span className="text-base font-black text-rose-700 block leading-tight">
                        {scores.cat1Losses}
                      </span>
                      <span className="font-sans text-[9px] font-semibold text-[#2b1111]/70 block">
                        Derrotas
                      </span>
                    </div>
                  </div>
                </div>
                <div className="bg-stone-50 px-3 py-2 rounded-xl border border-[#2b1111] flex flex-col items-center justify-center">
                  <span className="font-sans font-bold text-[11px] block">Empates</span>
                  <span className="text-lg font-black text-stone-700">{scores.ties}</span>
                  <span className="font-sans text-[10px] text-[#2b1111]/70 block">Partidas</span>
                </div>
                <div className="bg-red-50 p-2 rounded-xl border border-[#2b1111] space-y-1">
                  <span className="font-sans font-bold text-[11px] block truncate text-red-950">
                    {state.nicknames.cat2}
                  </span>
                  <div className="grid grid-cols-2 gap-1">
                    <div className="bg-white/85 rounded-lg py-1 border border-red-900/15">
                      <span className="text-base font-black text-emerald-700 block leading-tight">
                        {scores.cat2Wins}
                      </span>
                      <span className="font-sans text-[9px] font-semibold text-[#2b1111]/70 block">
                        Vitórias
                      </span>
                    </div>
                    <div className="bg-white/85 rounded-lg py-1 border border-red-900/15">
                      <span className="text-base font-black text-rose-700 block leading-tight">
                        {scores.cat2Losses}
                      </span>
                      <span className="font-sans text-[9px] font-semibold text-[#2b1111]/70 block">
                        Derrotas
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

        {canManageAccount && onUpdateNickname && (
          <form onSubmit={handleNickSubmit} className="bg-white border-2 border-[#2b1111] rounded-2xl p-3 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-xs font-bold text-red-950">🪪 Alterar Meu Nick</h3>
              <span className="text-[11px] font-semibold text-[#2b1111]/70">
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
                className="flex-1 text-xs px-3 py-2 rounded-xl border border-[#2b1111]/60 bg-[#fff8ed]"
              />
              <button
                type="submit"
                disabled={savingNick || newNick.trim().length < 2}
                className="sketch-btn bg-amber-300 hover:bg-amber-400 text-red-950 text-xs font-bold px-3 py-2 rounded-xl cursor-pointer disabled:opacity-50"
              >
                {savingNick ? 'Salvando...' : 'Mudar Nick'}
              </button>
            </div>
            {nickMsg && (
              <p className={`text-[11px] font-bold ${nickMsg.ok ? 'text-emerald-700' : 'text-red-700'}`}>
                {nickMsg.text}
              </p>
            )}
          </form>
        )}

        {canManageAccount && onUpdateRoomPassword && (
          <form onSubmit={handlePassSubmit} className="bg-white border-2 border-[#2b1111] rounded-2xl p-3 space-y-2">
            <h3 className="text-xs font-bold text-red-950">🔐 Código Secreto da Sala</h3>
            {hasRoomPassword && (
              <input
                type="password"
                value={curPass}
                onChange={(e) => setCurPass(e.target.value)}
                placeholder="Código secreto atual"
                className="w-full text-xs px-3 py-2 rounded-xl border border-[#2b1111]/60 bg-[#fff8ed]"
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
                className="flex-1 text-xs px-3 py-2 rounded-xl border border-[#2b1111]/60 bg-[#fff8ed]"
              />
              <button
                type="submit"
                disabled={savingPass || newPass.trim().length < 4}
                className="sketch-btn bg-amber-300 hover:bg-amber-400 text-red-950 text-xs font-bold px-3 py-2 rounded-xl cursor-pointer disabled:opacity-50"
              >
                {savingPass ? 'Salvando...' : 'Atualizar'}
              </button>
            </div>
            {passMsg && (
              <p className={`text-[11px] font-bold ${passMsg.ok ? 'text-emerald-700' : 'text-red-700'}`}>
                {passMsg.text}
              </p>
            )}
          </form>
        )}
      </div>
    </div>
  );
};

/* 2. PONTO DO SINDICATO (NFC / CÓDIGO DIÁRIO) */
export const SyncModal: React.FC<{
  open: boolean;
  myRole: PlayerRole;
  onClose: () => void;
  onValidateCode: (code: string) => boolean;
  onToast: (msg: string) => void;
}> = ({ open, myRole, onClose, onValidateCode, onToast }) => {
  const [inputCode, setInputCode] = useState('');
  if (!open) return null;

  const today = getTodayDateString();
  const myCode = generateDailyCodeForRole(myRole, today);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(myCode);
      onToast(`Código ${myCode} copiado! Envie ao seu Camarada ☭`);
    } catch {
      onToast(`Seu código de hoje é: ${myCode}`);
    }
  };

  const handleNfc = async () => {
    const NDEFReaderCtor = (window as unknown as { NDEFReader?: new () => { scan: () => Promise<void> } }).NDEFReader;
    if (!NDEFReaderCtor) {
      onToast('NFC não disponível neste navegador. Use o código de 6 dígitos abaixo!');
      return;
    }
    try {
      const reader = new NDEFReaderCtor();
      await reader.scan();
      onToast('Leitor NFC ativado! Aproxime os aparelhos.');
    } catch {
      onToast('Permissão NFC recusada ou indisponível. Use o código de 6 dígitos!');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onValidateCode(inputCode.trim())) {
      setInputCode('');
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/65 z-50 flex items-center justify-center p-3" role="dialog" aria-modal="true">
      <div className="bg-[#fff8ed] max-w-sm w-full p-5 rounded-3xl sketch-border space-y-3.5 text-center shadow-2xl">
        <div className="flex justify-between items-center border-b border-[#2b1111]/20 pb-2">
          <h2 className="font-display text-2xl font-bold text-red-950">Ponto Diário do Sindicato</h2>
          <button type="button" onClick={onClose} aria-label="Fechar ponto diário" className="sketch-btn bg-white p-1.5 rounded-xl cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
        <p className="text-xs text-[#2b1111]/80">
          Troquem seus códigos estatais de 6 dígitos para ganhar +1 Medalha do Partido 💖 e manter a chama acesa!
        </p>

        <button
          type="button"
          onClick={handleNfc}
          className="sketch-btn w-full bg-red-700 hover:bg-red-800 text-amber-200 text-xs py-2 rounded-xl font-bold cursor-pointer"
        >
          Ativar Leitor NFC 📡
        </button>

        <div className="bg-red-50 border-2 border-red-800 rounded-2xl p-3 space-y-2.5">
          <div className="flex items-center justify-between text-left">
            <span className="text-xs font-bold text-red-950">Seu Código Estatal de Hoje:</span>
            <button
              type="button"
              onClick={handleCopy}
              className="bg-amber-300 hover:bg-amber-400 px-2.5 py-1 rounded-lg border border-[#2b1111] text-[11px] font-bold cursor-pointer"
            >
              Copiar 📋
            </button>
          </div>
          <div className="bg-white border-2 border-dashed border-red-700 py-2 rounded-xl font-mono-num text-2xl font-black text-red-950 tracking-widest">
            {myCode}
          </div>

          <form onSubmit={handleSubmit} className="pt-1 border-t border-red-200 space-y-1.5">
            <label htmlFor="partner-sync-code" className="block text-[11px] font-bold text-red-950 text-left">
              Código enviado pelo seu Camarada:
            </label>
            <div className="flex gap-1.5">
              <input
                id="partner-sync-code"
                type="tel"
                maxLength={6}
                value={inputCode}
                onChange={(e) => setInputCode(e.target.value)}
                placeholder="000000"
                className="w-full text-center font-mono-num text-base font-bold tracking-widest p-2 rounded-lg border-2 border-[#2b1111] bg-white"
              />
              <button
                type="submit"
                className="sketch-btn bg-amber-400 hover:bg-amber-500 px-3 py-2 rounded-lg text-xs font-bold text-red-950 cursor-pointer"
              >
                Validar
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

/* 3. TELEGRAMAS (HISTÓRICO DO CHAT) */
export const LettersModal: React.FC<{
  open: boolean;
  myRole: PlayerRole;
  state: SharedState;
  onClose: () => void;
  onSend: (text: string) => void;
}> = ({ open, myRole, state, onClose, onSend }) => {
  const [text, setText] = useState('');
  if (!open) return null;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    onSend(text.trim());
    setText('');
  };

  return (
    <div className="fixed inset-0 bg-black/65 z-50 flex items-center justify-center p-3" role="dialog" aria-modal="true">
      <div className="bg-[#fff8ed] max-w-md w-full p-4 sm:p-5 rounded-3xl sketch-border flex flex-col max-h-[88dvh] gap-3 shadow-2xl">
        <div className="flex justify-between items-center border-b-2 border-[#2b1111]/15 pb-2">
          <div>
            <h2 className="font-display text-2xl font-bold text-red-950">Telegramas do Comitê 💌</h2>
            <p className="text-xs text-[#2b1111]/70">Mensagens sincronizadas em tempo real</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Fechar telegramas" className="sketch-btn bg-white p-1.5 rounded-xl cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scroll space-y-2 p-2 bg-white rounded-2xl border-2 border-[#2b1111]/20 min-h-[200px]">
          {state.letters.length === 0 ? (
            <p className="text-xs text-[#2b1111]/55 text-center py-8 italic">
              Nenhum telegrama enviado ainda. Escreva o primeiro recado carinhoso!
            </p>
          ) : (
            state.letters.map((l) => {
              const isMine = l.from === myRole;
              return (
                <div
                  key={l.id}
                  className={`p-2.5 rounded-2xl border max-w-[85%] text-xs ${
                    isMine
                      ? 'ml-auto bg-amber-50 border-amber-400 text-amber-950'
                      : 'mr-auto bg-red-50 border-red-300 text-red-950'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 text-[10px] font-bold opacity-70 mb-0.5">
                    <span>{l.authorName}</span>
                    <span className="font-mono-num">{l.timeFormatted}</span>
                  </div>
                  <p className="font-medium break-words">{l.text}</p>
                </div>
              );
            })
          )}
        </div>

        <form onSubmit={submit} className="flex gap-2">
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Escreva um telegrama..."
            maxLength={200}
            className="flex-1 text-sm px-3 py-2 rounded-xl border-2 border-[#2b1111] bg-white focus:outline-none focus:ring-2 focus:ring-red-600"
          />
          <button
            type="submit"
            className="sketch-btn bg-red-700 hover:bg-red-800 text-amber-100 font-bold text-xs px-4 py-2 rounded-xl cursor-pointer"
          >
            Enviar
          </button>
        </form>
      </div>
    </div>
  );
};
