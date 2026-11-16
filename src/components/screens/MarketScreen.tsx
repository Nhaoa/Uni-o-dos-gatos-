import React, { useMemo, useState } from 'react';
import { ShoppingBag, Sparkles } from 'lucide-react';
import { FOOD_ITEMS, FoodItemDef } from '../../logic/minigames';
import { Inventory } from '../../types/game';
import { sfx } from '../../utils/sound';
import { MerchantCatSvg } from '../CatSvg';

interface MarketScreenProps {
  paws: number;
  inventory?: Inventory;
  onBuyFood: (foodId: string, qty?: number) => void;
  onGoToWarehouse: () => void;
}

type FoodCategory = 'all' | 'basic' | 'gourmet' | 'festive';

const CATEGORY_TABS: { id: FoodCategory; label: string; icon: string }[] = [
  { id: 'all', label: 'Todos', icon: '🧺' },
  { id: 'basic', label: 'Essenciais', icon: '🍞' },
  { id: 'gourmet', label: 'Gourmet', icon: '🐟' },
  { id: 'festive', label: 'Especiais', icon: '✨' },
];

function classifyFood(item: FoodItemDef): Exclude<FoodCategory, 'all'> {
  if (item.id === 'food_bread' || item.id === 'food_milk') return 'basic';
  if (item.id === 'food_salmon' || item.id === 'food_steak') return 'gourmet';
  return 'festive';
}

export const MarketScreen: React.FC<MarketScreenProps> = ({
  paws,
  inventory = {},
  onBuyFood,
  onGoToWarehouse,
}) => {
  const [category, setCategory] = useState<FoodCategory>('all');
  const [merchantQuote, setMerchantQuote] = useState(
    '“Saudações, Camarada! Ração fresca direto da fazenda coletiva para manter o vigor e a moral em alta!”'
  );
  const [burstMap, setBurstMap] = useState<Record<string, { id: number; text: string }>>({});

  const filteredItems = useMemo(() => {
    if (category === 'all') return FOOD_ITEMS;
    return FOOD_ITEMS.filter((item) => classifyFood(item) === category);
  }, [category]);

  const totalOwned = useMemo(
    () => Object.values(inventory).reduce((sum, n) => sum + Math.max(0, Number(n) || 0), 0),
    [inventory]
  );

  const featuredItem = FOOD_ITEMS[4] || FOOD_ITEMS[2]; // Bife Grelhado or Salmão Grelhado

  const handlePurchase = (item: FoodItemDef, qty: number) => {
    const totalCost = item.price * qty;
    if (paws < totalCost) {
      sfx.error();
      setMerchantQuote(
        `“Faltam ${totalCost - paws} 🐾 para levar ${qty}x ${item.name}! Vença partidas nos Jogos para acumular Patinhas.”`
      );
      return;
    }
    sfx.buy();
    onBuyFood(item.id, qty);
    setMerchantQuote(
      `“Excelente escolha! ${qty}x ${item.name} empacotado(s) com carinho direto para o Armazém!”`
    );
    const burstId = Date.now() + Math.random();
    setBurstMap((prev) => ({
      ...prev,
      [item.id]: { id: burstId, text: `+${qty} 🎒  -${totalCost} 🐾` },
    }));
    window.setTimeout(() => {
      setBurstMap((prev) => {
        if (prev[item.id]?.id !== burstId) return prev;
        const copy = { ...prev };
        delete copy[item.id];
        return copy;
      });
    }, 1200);
  };

  return (
    <section className="w-full max-w-5xl bg-[#fff8ed] rounded-3xl sketch-border overflow-hidden">
      <div className="stall-canopy h-8 w-full" />
      <div className="p-4 sm:p-6 space-y-4">
        {/* Header Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 border-b-2 border-[#2b1111]/15 pb-3">
          <div>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-red-950 leading-none">
              Cooperativa do Camarada Mercador 🏪
            </h2>
            <p className="text-xs text-[#2b1111]/75 mt-1">
              Use suas Patinhas ganhas nos jogos · Saldo:{' '}
              <strong className="font-mono-num text-red-800 bg-amber-100 px-2 py-0.5 rounded-lg border border-[#2b1111]/20">
                {paws} 🐾
              </strong>
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              sfx.select();
              onGoToWarehouse();
            }}
            className="sketch-btn bg-amber-300 hover:bg-amber-400 text-red-950 text-xs font-bold px-3.5 py-2 rounded-xl whitespace-nowrap cursor-pointer flex items-center gap-1.5"
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>Armazém</span>
            <span className="font-mono-num bg-red-800 text-amber-100 px-1.5 py-0.5 rounded-md text-[11px]">
              {totalOwned}
            </span>
          </button>
        </div>

        {/* Reactive Merchant Banner + Featured Highlight */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          <div className="lg:col-span-2 bg-gradient-to-br from-[#fae4c4] via-[#f4d3a1] to-[#edc284] border-2 border-[#2b1111] rounded-2xl p-3.5 flex items-center gap-3 sm:gap-4 shadow-sm">
            <div className="w-20 h-20 sm:w-24 sm:h-24 shrink-0 anim-idle">
              <MerchantCatSvg />
            </div>
            <div className="bg-[#fff8ed] border-2 border-[#2b1111] rounded-2xl p-3 text-xs sm:text-sm font-medium flex-1 shadow-sm">
              <div className="text-[10px] font-bold uppercase tracking-wider text-red-800 mb-0.5">
                Balcão da Cooperativa
              </div>
              <p className="leading-snug text-[#2b1111]">{merchantQuote}</p>
            </div>
          </div>

          {/* Spotlight Card */}
          <div className="bg-gradient-to-br from-red-800 to-red-950 text-amber-50 border-2 border-[#2b1111] rounded-2xl p-3.5 flex items-center justify-between gap-3 shadow-sm">
            <div className="min-w-0 space-y-1">
              <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-amber-300">
                <Sparkles className="w-3 h-3" /> Destaque do Dia
              </span>
              <h3 className="text-sm font-bold truncate">{featuredItem.name}</h3>
              <p className="text-[11px] font-mono-num text-amber-100/85">
                +{featuredItem.hunger} 🐟 · +{featuredItem.joy} ☭ · +{featuredItem.energy} ⚡
              </p>
              <button
                type="button"
                disabled={paws < featuredItem.price}
                onClick={() => handlePurchase(featuredItem, 1)}
                className="sketch-btn mt-1 bg-amber-300 hover:bg-amber-400 text-red-950 text-xs font-bold px-3 py-1.5 rounded-xl cursor-pointer whitespace-nowrap"
              >
                Levar por {featuredItem.price} 🐾
              </button>
            </div>
            <span className="text-5xl leading-none shrink-0 drop-shadow-md">
              {featuredItem.icon}
            </span>
          </div>
        </div>

        {/* Category Filter Strip */}
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Categorias do mercado">
          {CATEGORY_TABS.map((tab) => {
            const active = category === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setCategory(tab.id);
                  sfx.select();
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold border-2 cursor-pointer whitespace-nowrap transition-colors ${
                  active
                    ? 'bg-[#2b1111] border-[#2b1111] text-amber-200 shadow-sm'
                    : 'bg-white border-[#2b1111]/25 text-red-950 hover:bg-amber-50'
                }`}
              >
                {tab.icon} {tab.label}
              </button>
            );
          })}
        </div>

        {/* Interactive Product Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredItems.map((item) => {
            const ownedQty = Number(inventory[item.id] || 0);
            const canBuy1 = paws >= item.price;
            const canBuy5 = paws >= item.price * 5;
            const burst = burstMap[item.id];

            return (
              <div
                key={item.id}
                className="relative bg-white p-3.5 rounded-2xl border-2 border-[#2b1111] flex flex-col justify-between gap-2.5 shadow-sm hover:-translate-y-0.5 transition-transform anim-card-pop"
              >
                {burst && (
                  <div
                    key={burst.id}
                    className="pointer-events-none absolute top-2 right-3 z-20 bg-emerald-700 text-amber-100 border border-[#2b1111] text-[11px] font-mono-num font-bold px-2 py-0.5 rounded-lg shadow anim-coin-float"
                  >
                    {burst.text}
                  </div>
                )}

                <div className="flex items-start justify-between gap-2">
                  <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-[#2b1111]/20 flex items-center justify-center text-3xl leading-none shrink-0">
                    {item.icon}
                  </div>
                  <span
                    className={`font-mono-num text-[11px] font-bold px-2 py-0.5 rounded-lg border ${
                      ownedQty > 0
                        ? 'bg-emerald-50 border-emerald-700/30 text-emerald-900'
                        : 'bg-stone-50 border-stone-300 text-stone-500'
                    }`}
                  >
                    Na mochila: x{ownedQty}
                  </span>
                </div>

                <div>
                  <h3 className="text-sm font-bold text-red-950">{item.name}</h3>
                  <div className="flex flex-wrap gap-1.5 mt-1 text-[11px] font-mono-num font-semibold">
                    <span className="bg-amber-50 border border-amber-300 text-amber-950 px-1.5 py-0.5 rounded-md">
                      +{item.hunger} 🐟
                    </span>
                    <span className="bg-rose-50 border border-rose-300 text-rose-950 px-1.5 py-0.5 rounded-md">
                      +{item.joy} ☭
                    </span>
                    <span className="bg-sky-50 border border-sky-300 text-sky-950 px-1.5 py-0.5 rounded-md">
                      +{item.energy} ⚡
                    </span>
                  </div>
                </div>

                <div className="flex gap-1.5 pt-1">
                  <button
                    type="button"
                    disabled={!canBuy1}
                    onClick={() => handlePurchase(item, 1)}
                    className={`sketch-btn flex-1 text-xs py-2 px-2 rounded-xl font-bold font-mono-num cursor-pointer whitespace-nowrap ${
                      canBuy1
                        ? 'bg-amber-200 hover:bg-amber-300 text-red-950'
                        : 'bg-stone-100 text-stone-500 cursor-not-allowed'
                    }`}
                  >
                    {item.price} 🐾 · +1
                  </button>
                  <button
                    type="button"
                    disabled={!canBuy5}
                    onClick={() => handlePurchase(item, 5)}
                    title={`Comprar pacote com 5 por ${item.price * 5} 🐾`}
                    className={`sketch-btn text-xs py-2 px-2.5 rounded-xl font-bold font-mono-num cursor-pointer whitespace-nowrap ${
                      canBuy5
                        ? 'bg-red-700 hover:bg-red-800 text-amber-100'
                        : 'bg-stone-100 text-stone-400 cursor-not-allowed'
                    }`}
                  >
                    ×5
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
