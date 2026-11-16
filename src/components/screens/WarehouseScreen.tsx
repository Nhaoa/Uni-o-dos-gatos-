import React, { useRef, useState } from 'react';
import { Store, Utensils } from 'lucide-react';
import { FOOD_ITEMS } from '../../logic/minigames';
import { Inventory, PlayerRole, SharedState } from '../../types/game';
import { CatSvg } from '../CatSvg';
import { ViewportOrientation } from '../../hooks/useOrientation';
import { sfx } from '../../utils/sound';

interface WarehouseScreenProps {
  state: SharedState;
  myRole: PlayerRole;
  vp: ViewportOrientation;
  onFeedCat: (target: PlayerRole, foodId: string) => void;
  onGoToMarket: () => void;
}

interface MealBurst {
  id: number;
  label: string;
}

export const WarehouseScreen: React.FC<WarehouseScreenProps> = ({
  state,
  myRole,
  vp,
  onFeedCat,
  onGoToMarket,
}) => {
  const [selectedFood, setSelectedFood] = useState<string | null>(null);
  const [dragOverCat, setDragOverCat] = useState<PlayerRole | null>(null);
  const [touchGhost, setTouchGhost] = useState<{ icon: string; x: number; y: number } | null>(null);
  const [mealBursts, setMealBursts] = useState<Partial<Record<PlayerRole, MealBurst>>>({});
  const touchFoodRef = useRef<string | null>(null);
  const cat1Ref = useRef<HTMLButtonElement | null>(null);
  const cat2Ref = useRef<HTMLButtonElement | null>(null);

  const myInv: Inventory = state.inventories[myRole] || {};
  const availableFoods = Object.entries(myInv)
    .filter(([, qty]) => Number(qty) > 0)
    .map(([id, qty]) => {
      const def = FOOD_ITEMS.find((f) => f.id === id);
      return def ? { ...def, qty: Number(qty) } : null;
    })
    .filter((x): x is NonNullable<typeof x> => Boolean(x));

  const deliverMeal = (target: PlayerRole, foodId: string) => {
    const def = FOOD_ITEMS.find((f) => f.id === foodId);
    sfx.feed();
    onFeedCat(target, foodId);
    setSelectedFood(null);
    if (def) {
      const burstId = Date.now() + Math.random();
      setMealBursts((prev) => ({
        ...prev,
        [target]: { id: burstId, label: `${def.icon} +${def.hunger} 🐟 · +${def.energy} ⚡ · +${def.joy} ☭` },
      }));
      window.setTimeout(() => {
        setMealBursts((prev) => {
          if (prev[target]?.id !== burstId) return prev;
          const next = { ...prev };
          delete next[target];
          return next;
        });
      }, 1200);
    }
  };

  const detectDropTarget = (clientX: number, clientY: number): PlayerRole | null => {
    const r1 = cat1Ref.current?.getBoundingClientRect();
    if (r1 && clientX >= r1.left && clientX <= r1.right && clientY >= r1.top && clientY <= r1.bottom) {
      return 'cat1';
    }
    const r2 = cat2Ref.current?.getBoundingClientRect();
    if (r2 && clientX >= r2.left && clientX <= r2.right && clientY >= r2.top && clientY <= r2.bottom) {
      return 'cat2';
    }
    return null;
  };

  const renderMeterBar = (label: string, val: number, barClass: string) => {
    const pct = Math.max(0, Math.min(100, Math.round(val)));
    return (
      <div className="space-y-0.5">
        <div className="flex items-center justify-between text-[11px] font-semibold">
          <span>{label}</span>
          <span className="font-mono-num font-bold">{pct}%</span>
        </div>
        <div className="h-2 w-full rounded-full bg-stone-200 border border-[#2b1111]/25 overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ${barClass}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    );
  };

  const renderFeedTarget = (role: PlayerRole) => {
    const cat = state[role];
    const nick = state.nicknames[role] || (role === 'cat1' ? 'Camarada 1' : 'Camarada 2');
    const isDragOver = dragOverCat === role;
    const targetRef = role === 'cat1' ? cat1Ref : cat2Ref;
    const burst = mealBursts[role];
    const isHungry = cat.hunger < 45;

    return (
      <button
        key={role}
        ref={targetRef}
        type="button"
        onDragOver={(e) => {
          e.preventDefault();
          setDragOverCat(role);
        }}
        onDragLeave={() => setDragOverCat(null)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOverCat(null);
          const fId = e.dataTransfer.getData('text/plain') || selectedFood;
          if (fId) deliverMeal(role, fId);
        }}
        onClick={() => {
          if (selectedFood) deliverMeal(role, selectedFood);
        }}
        className={`relative rounded-2xl border-2 p-3.5 flex items-center gap-3 text-left transition-all cursor-pointer ${
          burst ? 'anim-meal-pulse' : ''
        } ${
          isDragOver
            ? 'border-red-600 bg-amber-100 scale-[1.02] shadow-lg'
            : selectedFood
            ? 'border-amber-600 bg-amber-50 hover:bg-amber-100 shadow-sm'
            : 'border-[#2b1111] bg-white/95 shadow-sm'
        }`}
      >
        {burst && (
          <div
            key={burst.id}
            className="pointer-events-none absolute -top-2 right-3 z-20 bg-emerald-700 text-amber-100 border border-[#2b1111] text-[11px] font-mono-num font-bold px-2.5 py-0.5 rounded-lg shadow anim-coin-float"
          >
            {burst.label}
          </div>
        )}

        <div className="w-20 h-20 sm:w-24 sm:h-24 shrink-0 rounded-2xl bg-[#fff8ed] border border-[#2b1111]/15 p-1">
          <CatSvg cat={cat} isFlipped={role === 'cat2'} showBed />
        </div>
        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="font-bold text-sm text-red-950 truncate">
              {role === 'cat1' ? '★' : '☭'} {nick}
            </span>
            {selectedFood ? (
              <span className="text-[11px] font-bold bg-red-700 text-amber-100 px-2 py-0.5 rounded-lg shrink-0 flex items-center gap-1">
                <Utensils className="w-3 h-3" /> Servir!
              </span>
            ) : (
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-md border shrink-0 ${
                  cat.isSleeping
                    ? 'bg-indigo-100 border-indigo-400 text-indigo-950'
                    : isHungry
                    ? 'bg-rose-100 border-rose-400 text-rose-900'
                    : 'bg-emerald-50 border-emerald-400 text-emerald-900'
                }`}
              >
                {cat.isSleeping ? 'Dormindo 💤' : isHungry ? 'Com fome!' : 'Bem nutrido'}
              </span>
            )}
          </div>
          <div className="space-y-1.5 text-[#2b1111]/85">
            {renderMeterBar('Ração 🐟', cat.hunger, 'bg-amber-500')}
            {renderMeterBar('Vigor ⚡', cat.energy, 'bg-sky-500')}
            {renderMeterBar('Moral ☭', cat.happiness, 'bg-rose-500')}
          </div>
        </div>
      </button>
    );
  };

  const totalItems = availableFoods.reduce((acc, f) => acc + f.qty, 0);

  return (
    <section className="w-full max-w-5xl bg-[#fff8ed] rounded-3xl sketch-border p-4 sm:p-6 space-y-4">
      {touchGhost && (
        <div
          className="fixed pointer-events-none z-[120] text-4xl -translate-x-1/2 -translate-y-1/2 drop-shadow-xl"
          style={{ left: touchGhost.x, top: touchGhost.y }}
        >
          {touchGhost.icon}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2.5 border-b-2 border-[#2b1111]/15 pb-3">
        <div>
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-red-950 leading-none">
            Armazém & Refeitório 🎒
          </h2>
          <p className="text-xs text-[#2b1111]/75 mt-1">
            Toque em um alimento e clique no gatinho (ou arraste até ele) para servir · cada um dá Fome, Vigor e Moral únicos.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            sfx.select();
            onGoToMarket();
          }}
          className="sketch-btn bg-amber-300 hover:bg-amber-400 text-red-950 text-xs font-bold px-3.5 py-2 rounded-xl whitespace-nowrap cursor-pointer flex items-center gap-1.5"
        >
          <Store className="w-3.5 h-3.5" />
          <span>Ir ao Mercado</span>
        </button>
      </div>

      {/* Cat feeding stations */}
      <div className={`grid gap-3 ${vp.width >= 640 ? 'grid-cols-2' : 'grid-cols-1'}`}>
        {renderFeedTarget('cat1')}
        {renderFeedTarget('cat2')}
      </div>

      {/* Food Pantry */}
      <div className="bg-gradient-to-b from-[#f6e3c6] to-[#eed1a7] border-2 border-[#2b1111] rounded-2xl p-3.5 sm:p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-xs sm:text-sm font-bold text-red-950 flex items-center gap-1.5">
            <span>Despensa Coletiva</span>
            <span className="font-mono-num bg-[#2b1111] text-amber-200 px-2 py-0.5 rounded-lg text-[11px]">
              {totalItems} {totalItems === 1 ? 'item' : 'itens'}
            </span>
          </h3>
          {selectedFood && (
            <button
              type="button"
              onClick={() => {
                setSelectedFood(null);
                sfx.select();
              }}
              className="text-xs font-bold text-red-800 underline cursor-pointer"
            >
              Cancelar seleção
            </button>
          )}
        </div>

        {availableFoods.length === 0 ? (
          <div className="bg-[#fff8ed] rounded-2xl border-2 border-dashed border-[#2b1111]/35 p-6 text-center space-y-3 anim-card-pop">
            <div className="text-3xl">🥣</div>
            <p className="text-xs sm:text-sm font-medium text-[#2b1111]/80 max-w-md mx-auto">
              Seu armazém está vazio! Visite a Cooperativa do Mercador e compre rações deliciosas usando suas Patinhas 🐾.
            </p>
            <button
              type="button"
              onClick={() => {
                sfx.select();
                onGoToMarket();
              }}
              className="sketch-btn bg-red-700 hover:bg-red-800 text-amber-100 text-xs font-bold px-4 py-2 rounded-xl cursor-pointer"
            >
              Abastecer no Mercado 🏪
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {availableFoods.map((food) => {
              const isSel = selectedFood === food.id;
              return (
                <button
                  key={food.id}
                  type="button"
                  data-no-swipe="true"
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData('text/plain', food.id);
                    setSelectedFood(food.id);
                    sfx.select();
                  }}
                  onTouchStart={(e) => {
                    const t = e.touches[0];
                    touchFoodRef.current = food.id;
                    setTouchGhost({ icon: food.icon, x: t.clientX, y: t.clientY });
                  }}
                  onTouchMove={(e) => {
                    const t = e.touches[0];
                    setTouchGhost({ icon: food.icon, x: t.clientX, y: t.clientY });
                    setDragOverCat(detectDropTarget(t.clientX, t.clientY));
                  }}
                  onTouchEnd={(e) => {
                    const t = e.changedTouches[0];
                    const target = detectDropTarget(t.clientX, t.clientY);
                    if (target && touchFoodRef.current) {
                      deliverMeal(target, touchFoodRef.current);
                    }
                    touchFoodRef.current = null;
                    setTouchGhost(null);
                    setDragOverCat(null);
                  }}
                  onClick={() => {
                    setSelectedFood(isSel ? null : food.id);
                    sfx.select();
                  }}
                  className={`sketch-btn p-3 rounded-2xl flex items-center gap-3 text-left cursor-pointer anim-card-pop ${
                    isSel
                      ? 'bg-amber-300 text-red-950 ring-2 ring-red-700'
                      : 'bg-[#fff8ed] text-[#2b1111] hover:bg-amber-50'
                  }`}
                >
                  <div className="w-11 h-11 rounded-xl bg-white border border-[#2b1111]/20 flex items-center justify-center text-2xl leading-none shrink-0">
                    {food.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold truncate">{food.name}</p>
                    <p className="text-[11px] text-[#2b1111]/75 font-mono-num mt-0.5">
                      +{food.hunger} 🐟 · +{food.joy} ☭ · +{food.energy} ⚡
                    </p>
                  </div>
                  <span className="font-mono-num bg-red-700 text-amber-100 px-2 py-0.5 rounded-lg text-xs font-bold shrink-0">
                    x{food.qty}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
};
