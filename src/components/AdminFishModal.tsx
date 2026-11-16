import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Fish, ShieldCheck, X } from 'lucide-react';
import { PlayerRole, SharedState } from '../types/game';
import { parseAdminFishAmount } from '../logic/adminHack';

interface AdminFishModalProps {
  open: boolean;
  state: SharedState;
  onClose: () => void;
  onSaveFish: (
    targetRole: PlayerRole,
    amount: number
  ) => Promise<{ ok: boolean; error?: string }>;
}

const PRESET_AMOUNTS = [10, 50, 100, 500];

export const AdminFishModal: React.FC<AdminFishModalProps> = ({
  open,
  state,
  onClose,
  onSaveFish,
}) => {
  const [targetRole, setTargetRole] = useState<PlayerRole>('cat1');
  const [rawFish, setRawFish] = useState<string>('10');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setError('');
    setTargetRole('cat1');
    setRawFish(String(state.wallets.cat1.fish));
  }, [open, state.wallets.cat1.fish]);

  if (!open) return null;

  const handleSelectTarget = (nextRole: PlayerRole) => {
    setTargetRole(nextRole);
    setRawFish(String(state.wallets[nextRole].fish));
    setError('');
  };

  const adjustBy = (delta: number) => {
    const cur = Number(rawFish);
    const base = Number.isFinite(cur) ? Math.floor(cur) : state.wallets[targetRole].fish;
    const next = Math.max(0, Math.min(999999, base + delta));
    setRawFish(String(next));
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseAdminFishAmount(rawFish);
    if (!parsed.ok) {
      setError(parsed.error);
      return;
    }

    setSaving(true);
    setError('');
    const result = await onSaveFish(targetRole, parsed.value);
    setSaving(false);

    if (result.ok) {
      onClose();
    } else {
      setError(result.error || 'Não foi possível salvar os peixinhos.');
    }
  };

  const targetNick =
    state.nicknames[targetRole] || (targetRole === 'cat1' ? 'Admin' : 'Camarada 2');

  return createPortal(
    <div
      className="fixed inset-0 bg-black/75 z-[110] flex items-center justify-center p-3"
      role="dialog"
      aria-modal="true"
      aria-label="Painel Admin: Editar Peixinhos"
    >
      <form
        onSubmit={handleSubmit}
        className="bg-[#fff8ed] w-full max-w-md rounded-3xl sketch-border border-t-4 border-t-red-700 p-5 space-y-4 shadow-2xl"
      >
        <div className="flex items-start justify-between gap-2 border-b border-[#2b1111]/15 pb-3">
          <div>
            <div className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-red-800 bg-amber-200 px-2 py-0.5 rounded-md border border-red-800/40">
              <ShieldCheck className="w-3 h-3" /> Exclusivo do Admin
            </div>
            <h2 className="font-display text-2xl font-bold text-red-950 mt-1 leading-none">
              Editar Peixinhos 🐟
            </h2>
            <p className="text-xs text-[#2b1111]/75 mt-1">
              Ajuste o saldo diretamente no banco e sincronize em tempo real.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar editor de peixinhos"
            className="p-2 rounded-xl border border-[#2b1111]/30 bg-white hover:bg-amber-50 cursor-pointer"
          >
            <X className="w-4 h-4 text-[#2b1111]" />
          </button>
        </div>

        {/* Target selector */}
        <div className="space-y-1.5">
          <span className="text-xs font-bold text-[#2b1111] block">Gato alvo</span>
          <div className="grid grid-cols-2 gap-2">
            {(['cat1', 'cat2'] as PlayerRole[]).map((role) => {
              const nick = state.nicknames[role] || (role === 'cat1' ? 'Admin' : 'Camarada 2');
              const active = targetRole === role;
              return (
                <button
                  key={role}
                  type="button"
                  onClick={() => handleSelectTarget(role)}
                  className={`px-3 py-2 rounded-xl border-2 text-xs font-bold flex items-center justify-between cursor-pointer transition-colors ${
                    active
                      ? 'bg-red-700 text-amber-100 border-[#2b1111]'
                      : 'bg-white text-[#2b1111] border-[#2b1111]/30 hover:bg-amber-50'
                  }`}
                >
                  <span className="truncate">{nick}</span>
                  <span className="font-mono-num">🐟 {state.wallets[role].fish}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Fish input */}
        <div className="space-y-2">
          <label className="block space-y-1">
            <span className="text-xs font-bold text-[#2b1111]">
              Novo valor de peixinhos para {targetNick}
            </span>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Fish className="w-4 h-4 text-red-800 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="number"
                  min={0}
                  max={999999}
                  step={1}
                  value={rawFish}
                  onChange={(e) => {
                    setRawFish(e.target.value);
                    setError('');
                  }}
                  aria-label="Quantidade de peixinhos"
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border-2 border-[#2b1111] bg-white font-mono-num text-base font-bold text-red-950 focus:outline-none focus:ring-2 focus:ring-red-700"
                />
              </div>
              <button
                type="button"
                onClick={() => adjustBy(-10)}
                className="px-2.5 py-2.5 rounded-xl border border-[#2b1111]/40 bg-white hover:bg-amber-50 text-xs font-mono-num font-bold cursor-pointer"
              >
                -10
              </button>
              <button
                type="button"
                onClick={() => adjustBy(10)}
                className="px-2.5 py-2.5 rounded-xl border border-[#2b1111]/40 bg-white hover:bg-amber-50 text-xs font-mono-num font-bold cursor-pointer"
              >
                +10
              </button>
            </div>
          </label>

          <div className="flex flex-wrap items-center gap-1.5">
            {PRESET_AMOUNTS.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => {
                  setRawFish(String(preset));
                  setError('');
                }}
                className="px-2.5 py-1 rounded-lg border border-red-800/35 bg-amber-100 hover:bg-amber-200 text-red-950 text-xs font-mono-num font-bold cursor-pointer"
              >
                {preset} 🐟
              </button>
            ))}
          </div>
        </div>

        {error && (
          <p
            role="alert"
            className="text-xs font-bold text-red-800 bg-red-100 border border-red-300 rounded-xl px-3 py-2"
          >
            {error}
          </p>
        )}

        <div className="pt-1 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-[#2b1111]/30 bg-white hover:bg-stone-100 text-xs font-bold text-[#2b1111] cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={saving}
            className="sketch-btn bg-red-700 hover:bg-red-800 disabled:opacity-50 text-amber-100 px-5 py-2 rounded-xl text-xs font-bold cursor-pointer"
          >
            {saving ? 'Salvando...' : 'Aplicar Peixinhos'}
          </button>
        </div>
      </form>
    </div>,
    document.body
  );
};
