import React, { useEffect, useRef, useState } from 'react';
import { PlayerRole, SharedState } from '../../types/game';

interface RadioScreenProps {
  myRole: PlayerRole;
  state: SharedState;
  onSend: (text: string) => void;
}

export const RadioScreen: React.FC<RadioScreenProps> = ({ myRole, state, onSend }) => {
  const [text, setText] = useState('');
  const listRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [state.letters.length]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    onSend(text.trim());
    setText('');
  };

  return (
    <section className="w-full max-w-5xl bg-[#fff8ed] rounded-3xl sketch-border p-4 sm:p-6 flex flex-col gap-3.5">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-[#2b1111]/15 pb-3">
        <div>
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-red-950">
            Rádio & Telegramas do Comitê 💬
          </h2>
          <p className="text-xs text-[#2b1111]/75">
            Recados sincronizados em tempo real · O último telegrama aparece no balão do Jardim.
          </p>
        </div>
        <span className="text-xs font-mono-num font-bold text-red-900">
          {state.letters.length} {state.letters.length === 1 ? 'mensagem' : 'mensagens'}
        </span>
      </div>

      <div
        ref={listRef}
        className="h-[46dvh] sm:h-[52dvh] overflow-y-auto custom-scroll space-y-2.5 p-3 bg-white rounded-2xl border-2 border-[#2b1111]/25"
      >
        {state.letters.length === 0 ? (
          <p className="text-xs sm:text-sm text-[#2b1111]/55 text-center py-12 italic">
            Nenhum telegrama enviado ainda. Escreva o primeiro recado carinhoso!
          </p>
        ) : (
          state.letters.map((l) => {
            const isMine = l.from === myRole;
            return (
              <div
                key={l.id}
                className={`p-3 rounded-2xl border max-w-[84%] sm:max-w-[70%] text-xs sm:text-sm ${
                  isMine
                    ? 'ml-auto bg-amber-50 border-amber-400 text-amber-950'
                    : 'mr-auto bg-red-50 border-red-300 text-red-950'
                }`}
              >
                <div className="flex items-center justify-between gap-3 text-[11px] font-bold opacity-75 mb-1">
                  <span>{l.authorName}</span>
                  <span className="font-mono-num">{l.timeFormatted}</span>
                </div>
                <p className="font-medium break-words leading-snug">{l.text}</p>
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
          placeholder="Escreva um telegrama para o seu Camarada..."
          maxLength={200}
          className="flex-1 text-sm px-3.5 py-2.5 rounded-xl border-2 border-[#2b1111] bg-white focus:outline-none focus:ring-2 focus:ring-red-600"
        />
        <button
          type="submit"
          className="sketch-btn bg-red-700 hover:bg-red-800 text-amber-100 font-bold text-xs sm:text-sm px-5 py-2.5 rounded-xl cursor-pointer whitespace-nowrap"
        >
          Enviar ☭
        </button>
      </form>
    </section>
  );
};
