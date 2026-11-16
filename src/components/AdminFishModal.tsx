import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Flame, ShieldCheck, Sparkles, Wrench, X } from 'lucide-react';
import { PlayerRole, SharedState } from '../types/game';
import { FOOD_ITEMS } from '../logic/minigames';
import {
  AdminCatHackValues,
  AdminFullHackPayload,
  extractAdminHackDraft,
} from '../logic/adminHack';

interface AdminFishModalProps {
  open: boolean;
  state: SharedState;
  onClose: () => void;
  onSaveHack?: (
    payload: AdminFullHackPayload
  ) => Promise<{ ok: boolean; error?: string }>;
  onSaveFish?: (
    targetRole: PlayerRole,
    amount: number
  ) => Promise<{ ok: boolean; error?: string }>;
}

type HackTab = 'casal' | 'cat1' | 'cat2';

export const AdminFishModal: React.FC<AdminFishModalProps> = ({
  open,
  state,
  onClose,
  onSaveHack,
  onSaveFish,
}) => {
  const [activeTab, setActiveTab] = useState<HackTab>('casal');
  const [draft, setDraft] = useState<AdminFullHackPayload>(() =>
    extractAdminHackDraft(state)
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setError('');
    setDraft(extractAdminHackDraft(state));
  }, [open, state]);

  if (!open) return null;

  const cat1Nick = state.nicknames.cat1 || 'Admin';
  const cat2Nick = state.nicknames.cat2 || 'Amy';

  const updateCatField = (
    role: PlayerRole,
    patch: Partial<AdminCatHackValues>
  ) => {
    setDraft((prev) => ({
      ...prev,
      [role]: {
        ...prev[role],
        ...patch,
      },
    }));
    setError('');
  };

  const updateCatWallet = (role: PlayerRole, patch: Partial<AdminCatHackValues['wallet']>) => {
    setDraft((prev) => ({
      ...prev,
      [role]: {
        ...prev[role],
        wallet: {
          ...prev[role].wallet,
          ...patch,
        },
      },
    }));
    setError('');
  };

  const updateCatInventory = (role: PlayerRole, foodId: string, qty: number) => {
    const safeQty = Math.max(0, Math.min(9999, Math.floor(Number(qty) || 0)));
    setDraft((prev) => ({
      ...prev,
      [role]: {
        ...prev[role],
        inventory: {
          ...prev[role].inventory,
          [foodId]: safeQty,
        },
      },
    }));
    setError('');
  };

  const fillFullVitals = (role: PlayerRole) => {
    updateCatField(role, {
      hunger: 100,
      energy: 100,
      happiness: 100,
    });
  };

  const addAllFoods = (role: PlayerRole, amount = 50) => {
    setDraft((prev) => {
      const nextInv = { ...prev[role].inventory };
      for (const f of FOOD_ITEMS) {
        nextInv[f.id] = Math.min(9999, Number(nextInv[f.id] || 0) + amount);
      }
      return {
        ...prev,
        [role]: {
          ...prev[role],
          inventory: nextInv,
        },
      };
    });
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    let result: { ok: boolean; error?: string } = {
      ok: false,
      error: 'Função de hack indisponível.',
    };

    if (onSaveHack) {
      result = await onSaveHack(draft);
    } else if (onSaveFish) {
      result = await onSaveFish('cat1', draft.cat1.wallet.fish);
    }

    setSaving(false);

    if (result.ok) {
      onClose();
    } else {
      setError(result.error || 'Não foi possível aplicar o Hack do Admin.');
    }
  };

  const renderCatEditor = (role: PlayerRole, label: string) => {
    const catDraft = draft[role];
    return (
      <div className="space-y-4">
        {/* Quick Boost Strip */}
        <div className="flex flex-wrap items-center justify-between gap-2 bg-amber-100/80 border border-red-800/30 rounded-2xl px-3 py-2">
          <span className="text-xs font-bold text-red-950">
            Atalhos Rápidos para {label}
          </span>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() =>
                updateCatWallet(role, {
                  fish: catDraft.wallet.fish + 500,
                  paws: catDraft.wallet.paws + 500,
                  coupleCoins: catDraft.wallet.coupleCoins + 25,
                })
              }
              className="px-2.5 py-1 rounded-lg bg-red-700 hover:bg-red-800 text-amber-100 text-[11px] font-bold cursor-pointer"
            >
              +500 🐟 / +500 🐾 / +25 💖
            </button>
            <button
              type="button"
              onClick={() => fillFullVitals(role)}
              className="px-2.5 py-1 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-[11px] font-bold cursor-pointer"
            >
              100% Vitalidade ✨
            </button>
            <button
              type="button"
              onClick={() => addAllFoods(role, 50)}
              className="px-2.5 py-1 rounded-lg bg-amber-300 hover:bg-amber-400 text-red-950 border border-[#2b1111]/40 text-[11px] font-bold cursor-pointer"
            >
              +50 de Cada Comida 🍱
            </button>
          </div>
        </div>

        {/* Wallets */}
        <div className="bg-white rounded-2xl border-2 border-[#2b1111]/25 p-3.5 space-y-2.5">
          <h3 className="text-xs font-bold uppercase tracking-wider text-red-900">
            💰 Carteira de {label}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <label className="block space-y-1">
              <span className="text-[11px] font-bold text-[#2b1111]">
                🐟 Peixinhos
              </span>
              <input
                type="number"
                min={0}
                max={999999}
                value={catDraft.wallet.fish}
                onChange={(e) =>
                  updateCatWallet(role, {
                    fish: Math.max(0, Math.min(999999, Math.floor(Number(e.target.value) || 0))),
                  })
                }
                className="w-full px-3 py-2 rounded-xl border border-[#2b1111] bg-[#fff8ed] font-mono-num text-sm font-bold text-red-950"
              />
            </label>
            <label className="block space-y-1">
              <span className="text-[11px] font-bold text-[#2b1111]">
                🐾 Patinhas
              </span>
              <input
                type="number"
                min={0}
                max={999999}
                value={catDraft.wallet.paws}
                onChange={(e) =>
                  updateCatWallet(role, {
                    paws: Math.max(0, Math.min(999999, Math.floor(Number(e.target.value) || 0))),
                  })
                }
                className="w-full px-3 py-2 rounded-xl border border-[#2b1111] bg-[#fff8ed] font-mono-num text-sm font-bold text-red-950"
              />
            </label>
            <label className="block space-y-1">
              <span className="text-[11px] font-bold text-[#2b1111]">
                💖 Medalhas do Casal
              </span>
              <input
                type="number"
                min={0}
                max={999999}
                value={catDraft.wallet.coupleCoins}
                onChange={(e) =>
                  updateCatWallet(role, {
                    coupleCoins: Math.max(
                      0,
                      Math.min(999999, Math.floor(Number(e.target.value) || 0))
                    ),
                  })
                }
                className="w-full px-3 py-2 rounded-xl border border-[#2b1111] bg-[#fff8ed] font-mono-num text-sm font-bold text-red-950"
              />
            </label>
          </div>
        </div>

        {/* Vitals & Speech */}
        <div className="bg-white rounded-2xl border-2 border-[#2b1111]/25 p-3.5 space-y-2.5">
          <h3 className="text-xs font-bold uppercase tracking-wider text-red-900">
            💓 Status Vitais & Fala ({label})
          </h3>
          <div className="grid grid-cols-3 gap-2.5">
            <label className="block space-y-1">
              <span className="text-[11px] font-bold text-[#2b1111]">
                🍖 Saciedade (0-100)
              </span>
              <input
                type="number"
                min={0}
                max={100}
                value={catDraft.hunger}
                onChange={(e) =>
                  updateCatField(role, {
                    hunger: Math.max(0, Math.min(100, Math.round(Number(e.target.value) || 0))),
                  })
                }
                className="w-full px-2.5 py-1.5 rounded-xl border border-[#2b1111] bg-[#fff8ed] font-mono-num text-sm font-bold text-red-950"
              />
            </label>
            <label className="block space-y-1">
              <span className="text-[11px] font-bold text-[#2b1111]">
                ⚡ Energia (0-100)
              </span>
              <input
                type="number"
                min={0}
                max={100}
                value={catDraft.energy}
                onChange={(e) =>
                  updateCatField(role, {
                    energy: Math.max(0, Math.min(100, Math.round(Number(e.target.value) || 0))),
                  })
                }
                className="w-full px-2.5 py-1.5 rounded-xl border border-[#2b1111] bg-[#fff8ed] font-mono-num text-sm font-bold text-red-950"
              />
            </label>
            <label className="block space-y-1">
              <span className="text-[11px] font-bold text-[#2b1111]">
                😺 Alegria (0-100)
              </span>
              <input
                type="number"
                min={0}
                max={100}
                value={catDraft.happiness}
                onChange={(e) =>
                  updateCatField(role, {
                    happiness: Math.max(0, Math.min(100, Math.round(Number(e.target.value) || 0))),
                  })
                }
                className="w-full px-2.5 py-1.5 rounded-xl border border-[#2b1111] bg-[#fff8ed] font-mono-num text-sm font-bold text-red-950"
              />
            </label>
          </div>
          <label className="block space-y-1 pt-1">
            <span className="text-[11px] font-bold text-[#2b1111]">
              💬 Balão de Fala do Gatinho
            </span>
            <input
              type="text"
              maxLength={140}
              value={catDraft.speech}
              onChange={(e) => updateCatField(role, { speech: e.target.value })}
              className="w-full px-3 py-1.5 rounded-xl border border-[#2b1111] bg-[#fff8ed] text-xs font-semibold text-[#2b1111]"
            />
          </label>
        </div>

        {/* Food Inventory */}
        <div className="bg-white rounded-2xl border-2 border-[#2b1111]/25 p-3.5 space-y-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-red-900">
            🎒 Estoque do Armazém ({label})
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {FOOD_ITEMS.map((food) => (
              <label
                key={food.id}
                className="flex items-center justify-between gap-1.5 bg-[#fff8ed] border border-[#2b1111]/30 rounded-xl px-2.5 py-1.5"
              >
                <span className="text-[11px] font-bold text-[#2b1111] truncate">
                  {food.icon} {food.name}
                </span>
                <input
                  type="number"
                  min={0}
                  max={9999}
                  value={catDraft.inventory[food.id] ?? 0}
                  onChange={(e) =>
                    updateCatInventory(role, food.id, Number(e.target.value))
                  }
                  className="w-16 px-2 py-1 rounded-lg border border-[#2b1111] bg-white font-mono-num text-xs font-bold text-right text-red-950"
                />
              </label>
            ))}
          </div>
        </div>
      </div>
    );
  };

  return createPortal(
    <div
      className="fixed inset-0 bg-black/75 z-[110] flex items-center justify-center p-2 sm:p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-label="Painel Hack do Admin"
    >
      <form
        onSubmit={handleSubmit}
        className="bg-[#fff8ed] w-full max-w-2xl rounded-3xl sketch-border border-t-4 border-t-red-700 p-4 sm:p-5 space-y-4 shadow-2xl my-auto max-h-[92dvh] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-2 border-b border-[#2b1111]/15 pb-3 shrink-0">
          <div>
            <div className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-red-800 bg-amber-200 px-2 py-0.5 rounded-md border border-red-800/40">
              <ShieldCheck className="w-3 h-3" /> Hack Mestre Exclusivo do Admin
            </div>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-red-950 mt-1 leading-none flex items-center gap-2">
              <Wrench className="w-5 h-5 text-red-700" />
              Painel Hack: {cat1Nick} & {cat2Nick}
            </h2>
            <p className="text-xs text-[#2b1111]/75 mt-1">
              Edite contador de dias, moedas, status vitais, placar e estoque de ambos os gatinhos em tempo real.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar painel hack"
            className="p-2 rounded-xl border border-[#2b1111]/30 bg-white hover:bg-amber-50 cursor-pointer"
          >
            <X className="w-4 h-4 text-[#2b1111]" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="grid grid-cols-3 gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('casal')}
            className={`px-3 py-2 rounded-xl border-2 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors ${
              activeTab === 'casal'
                ? 'bg-red-700 text-amber-100 border-[#2b1111]'
                : 'bg-white text-[#2b1111] border-[#2b1111]/30 hover:bg-amber-50'
            }`}
          >
            <Flame className="w-3.5 h-3.5" />
            <span>Dias & Casal ({draft.streak.current}🔥)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('cat1')}
            className={`px-3 py-2 rounded-xl border-2 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors ${
              activeTab === 'cat1'
                ? 'bg-red-700 text-amber-100 border-[#2b1111]'
                : 'bg-white text-[#2b1111] border-[#2b1111]/30 hover:bg-amber-50'
            }`}
          >
            <span>🐱 {cat1Nick}</span>
            <span className="font-mono-num text-[11px]">🐟{draft.cat1.wallet.fish}</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('cat2')}
            className={`px-3 py-2 rounded-xl border-2 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors ${
              activeTab === 'cat2'
                ? 'bg-red-700 text-amber-100 border-[#2b1111]'
                : 'bg-white text-[#2b1111] border-[#2b1111]/30 hover:bg-amber-50'
            }`}
          >
            <span>🎀 {cat2Nick}</span>
            <span className="font-mono-num text-[11px]">🐟{draft.cat2.wallet.fish}</span>
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="overflow-y-auto custom-scroll pr-1 space-y-4 flex-1 min-h-0">
          {activeTab === 'casal' && (
            <div className="space-y-4">
              {/* Contador de Dias / Chama da Revolução */}
              <div className="bg-gradient-to-r from-red-100 via-amber-100 to-red-100 rounded-2xl border-2 border-[#2b1111] p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-red-950 flex items-center gap-1.5">
                    🔥 Contador de Dias (Chama da Revolução)
                  </h3>
                  <div className="flex gap-1.5">
                    {[7, 30, 100, 365].map((days) => (
                      <button
                        key={days}
                        type="button"
                        onClick={() =>
                          setDraft((prev) => ({
                            ...prev,
                            streak: {
                              current: days,
                              best: Math.max(prev.streak.best, days),
                              totalDays: Math.max(prev.streak.totalDays, days),
                            },
                          }))
                        }
                        className="px-2 py-0.5 rounded-lg bg-white/90 hover:bg-amber-200 border border-[#2b1111]/40 text-[11px] font-mono-num font-bold text-red-950 cursor-pointer"
                      >
                        {days}d 🔥
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <label className="block space-y-1">
                    <span className="text-[11px] font-bold text-[#2b1111]">
                      🔥 Dias Seguidos (Atual)
                    </span>
                    <input
                      type="number"
                      min={0}
                      max={99999}
                      value={draft.streak.current}
                      onChange={(e) => {
                        const val = Math.max(
                          0,
                          Math.min(99999, Math.floor(Number(e.target.value) || 0))
                        );
                        setDraft((prev) => ({
                          ...prev,
                          streak: {
                            ...prev.streak,
                            current: val,
                            best: Math.max(prev.streak.best, val),
                            totalDays: Math.max(prev.streak.totalDays, val),
                          },
                        }));
                      }}
                      className="w-full px-3 py-2 rounded-xl border-2 border-[#2b1111] bg-white font-mono-num text-base font-bold text-red-950"
                    />
                  </label>
                  <label className="block space-y-1">
                    <span className="text-[11px] font-bold text-[#2b1111]">
                      🏅 Recorde de Dias
                    </span>
                    <input
                      type="number"
                      min={0}
                      max={99999}
                      value={draft.streak.best}
                      onChange={(e) => {
                        const val = Math.max(
                          0,
                          Math.min(99999, Math.floor(Number(e.target.value) || 0))
                        );
                        setDraft((prev) => ({
                          ...prev,
                          streak: {
                            ...prev.streak,
                            best: val,
                          },
                        }));
                      }}
                      className="w-full px-3 py-2 rounded-xl border-2 border-[#2b1111] bg-white font-mono-num text-base font-bold text-red-950"
                    />
                  </label>
                  <label className="block space-y-1">
                    <span className="text-[11px] font-bold text-[#2b1111]">
                      📅 Total de Dias Juntos
                    </span>
                    <input
                      type="number"
                      min={0}
                      max={99999}
                      value={draft.streak.totalDays}
                      onChange={(e) => {
                        const val = Math.max(
                          0,
                          Math.min(99999, Math.floor(Number(e.target.value) || 0))
                        );
                        setDraft((prev) => ({
                          ...prev,
                          streak: {
                            ...prev.streak,
                            totalDays: val,
                          },
                        }));
                      }}
                      className="w-full px-3 py-2 rounded-xl border-2 border-[#2b1111] bg-white font-mono-num text-base font-bold text-red-950"
                    />
                  </label>
                </div>

                <label className="flex items-center justify-between gap-2 bg-white/85 rounded-xl px-3 py-2 border border-[#2b1111]/30 cursor-pointer">
                  <span className="text-xs font-bold text-[#2b1111]">
                    🔓 Ponto Diário do Sindicato validado hoje
                  </span>
                  <input
                    type="checkbox"
                    checked={draft.syncedToday}
                    onChange={(e) =>
                      setDraft((prev) => ({ ...prev, syncedToday: e.target.checked }))
                    }
                    className="w-4 h-4 accent-red-700 cursor-pointer"
                  />
                </label>
              </div>

              {/* Nível de Amor */}
              <div className="bg-white rounded-2xl border-2 border-[#2b1111]/25 p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-red-900">
                    💖 Sintonia / Amor do Casal (0 a 100%)
                  </h3>
                  <button
                    type="button"
                    onClick={() => setDraft((prev) => ({ ...prev, loveScore: 100 }))}
                    className="px-2.5 py-0.5 rounded-lg bg-rose-100 hover:bg-rose-200 text-rose-900 text-[11px] font-bold cursor-pointer flex items-center gap-1"
                  >
                    <Sparkles className="w-3 h-3" /> 100% Amor
                  </button>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={draft.loveScore}
                    onChange={(e) =>
                      setDraft((prev) => ({
                        ...prev,
                        loveScore: Number(e.target.value),
                      }))
                    }
                    className="flex-1 accent-red-700 cursor-pointer"
                  />
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={draft.loveScore}
                    onChange={(e) =>
                      setDraft((prev) => ({
                        ...prev,
                        loveScore: Math.max(
                          0,
                          Math.min(100, Math.round(Number(e.target.value) || 0))
                        ),
                      }))
                    }
                    className="w-20 px-2.5 py-1.5 rounded-xl border border-[#2b1111] bg-[#fff8ed] font-mono-num text-sm font-bold text-center text-red-950"
                  />
                </div>
              </div>

              {/* Placar das Olimpíadas */}
              <div className="bg-white rounded-2xl border-2 border-[#2b1111]/25 p-3.5 space-y-2.5">
                <h3 className="text-xs font-bold uppercase tracking-wider text-red-900">
                  🏆 Quadro de Honra (Vitórias & Empates)
                </h3>
                <div className="grid grid-cols-3 gap-2.5">
                  <label className="block space-y-1">
                    <span className="text-[11px] font-bold text-[#2b1111] truncate block">
                      Vitórias {cat1Nick}
                    </span>
                    <input
                      type="number"
                      min={0}
                      max={99999}
                      value={draft.scores.cat1Wins}
                      onChange={(e) =>
                        setDraft((prev) => ({
                          ...prev,
                          scores: {
                            ...prev.scores,
                            cat1Wins: Math.max(
                              0,
                              Math.min(99999, Math.floor(Number(e.target.value) || 0))
                            ),
                          },
                        }))
                      }
                      className="w-full px-2.5 py-1.5 rounded-xl border border-[#2b1111] bg-[#fff8ed] font-mono-num text-sm font-bold text-red-950"
                    />
                  </label>
                  <label className="block space-y-1">
                    <span className="text-[11px] font-bold text-[#2b1111] truncate block">
                      Empates
                    </span>
                    <input
                      type="number"
                      min={0}
                      max={99999}
                      value={draft.scores.ties}
                      onChange={(e) =>
                        setDraft((prev) => ({
                          ...prev,
                          scores: {
                            ...prev.scores,
                            ties: Math.max(
                              0,
                              Math.min(99999, Math.floor(Number(e.target.value) || 0))
                            ),
                          },
                        }))
                      }
                      className="w-full px-2.5 py-1.5 rounded-xl border border-[#2b1111] bg-[#fff8ed] font-mono-num text-sm font-bold text-red-950"
                    />
                  </label>
                  <label className="block space-y-1">
                    <span className="text-[11px] font-bold text-[#2b1111] truncate block">
                      Vitórias {cat2Nick}
                    </span>
                    <input
                      type="number"
                      min={0}
                      max={99999}
                      value={draft.scores.cat2Wins}
                      onChange={(e) =>
                        setDraft((prev) => ({
                          ...prev,
                          scores: {
                            ...prev.scores,
                            cat2Wins: Math.max(
                              0,
                              Math.min(99999, Math.floor(Number(e.target.value) || 0))
                            ),
                          },
                        }))
                      }
                      className="w-full px-2.5 py-1.5 rounded-xl border border-[#2b1111] bg-[#fff8ed] font-mono-num text-sm font-bold text-red-950"
                    />
                  </label>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'cat1' && renderCatEditor('cat1', cat1Nick)}
          {activeTab === 'cat2' && renderCatEditor('cat2', cat2Nick)}
        </div>

        {error && (
          <p
            role="alert"
            className="text-xs font-bold text-red-800 bg-red-100 border border-red-300 rounded-xl px-3 py-2 shrink-0"
          >
            {error}
          </p>
        )}

        {/* Footer */}
        <div className="pt-2 border-t border-[#2b1111]/15 flex items-center justify-between gap-2 shrink-0">
          <span className="text-[11px] font-semibold text-[#2b1111]/70">
            Sincroniza instantaneamente para {cat1Nick} e {cat2Nick}
          </span>
          <div className="flex items-center gap-2">
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
              {saving ? 'Salvando Hack...' : 'Aplicar Todos os Valores ⚡'}
            </button>
          </div>
        </div>
      </form>
    </div>,
    document.body
  );
};
