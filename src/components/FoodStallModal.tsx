import React from 'react';
import { X } from 'lucide-react';
import { FOOD_ITEMS } from '../logic/minigames';
import { MerchantCatSvg } from './CatSvg';

interface FoodStallModalProps {
  open: boolean;
  paws: number;
  onClose: () => void;
  onBuyFood: (foodId: string) => void;
}

export const FoodStallModal: React.FC<FoodStallModalProps> = ({
  open,
  paws,
  onClose,
  onBuyFood,
}) => {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 bg-black/65 z-50 flex items-center justify-center p-3"
      role="dialog"
      aria-modal="true"
      aria-labelledby="stall-title"
    >
      <div className="bg-[#fff8ed] max-w-lg w-full rounded-2xl sketch-border overflow-hidden shadow-2xl flex flex-col max-h-[92dvh]">
        <div className="stall-canopy h-7 w-full shrink-0" />
        <div className="p-4 space-y-3 overflow-y-auto custom-scroll">
          <div className="flex justify-between items-start gap-2">
            <div>
              <h2 id="stall-title" className="font-display text-2xl sm:text-3xl font-bold text-red-950">
                Cooperativa do Camarada Mercador
              </h2>
              <p className="text-xs text-[#2b1111]/75">
                Adquira rações com seus Rublos Felinos · Saldo:{' '}
                <strong className="font-mono-num text-red-800">{paws} 🐾</strong>
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Fechar cooperativa"
              className="sketch-btn bg-white p-1.5 rounded-xl cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="bg-gradient-to-b from-[#f9e2c2] to-[#f1cc99] border-2 border-[#2b1111] rounded-2xl p-3 flex items-center gap-3">
            <div className="w-20 h-20 sm:w-24 sm:h-24 shrink-0">
              <MerchantCatSvg />
            </div>
            <div className="bg-[#fff8ed] border-2 border-[#2b1111] rounded-xl p-2.5 text-xs font-medium flex-1">
              “Saudações, Camarada! Ração fresca direto da fazenda coletiva para manter o vigor operário!”
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {FOOD_ITEMS.map((item) => {
              const canAfford = paws >= item.price;
              return (
                <div
                  key={item.id}
                  className="bg-white p-2.5 rounded-xl border-2 border-[#2b1111] flex flex-col items-center text-center justify-between gap-1.5"
                >
                  <span className="text-3xl">{item.icon}</span>
                  <div>
                    <p className="text-xs font-bold text-red-950">{item.name}</p>
                    <p className="text-[11px] text-[#2b1111]/70">
                      +{item.hunger} 🐟 · +{item.joy} ☭ · +{item.energy} ⚡
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={!canAfford}
                    onClick={() => onBuyFood(item.id)}
                    className={`sketch-btn w-full text-xs py-1.5 rounded-lg font-bold font-mono-num cursor-pointer ${
                      canAfford
                        ? 'bg-amber-200 hover:bg-amber-300 text-red-950'
                        : 'bg-stone-100 text-stone-500'
                    }`}
                  >
                    {item.price} 🐾 · Pegar
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
