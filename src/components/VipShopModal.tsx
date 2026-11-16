import React, { useState } from 'react';
import { X, Palette } from 'lucide-react';
import { CatState, Wallet } from '../types/game';
import { PALETTE_COLORS, ShopCategory as CatKey, VIP_CATALOG } from '../logic/minigames';
import { CatSvg, ShopItemPreviewSvg } from './CatSvg';

interface VipShopModalProps {
  open: boolean;
  myCat: CatState;
  wallet: Wallet;
  unlockedItems: string[];
  onClose: () => void;
  onEquipOrBuy: (
    itemId: string,
    type: 'outfit' | 'pupil' | 'eyeShape' | 'accessory' | 'breed' | 'mouth' | 'bed',
    val: string,
    price: number,
    currency: 'fish' | 'couple'
  ) => void;
  onApplyColor: (
    target: 'outfit' | 'accessory' | 'eyeShape' | 'pupil' | 'bed',
    hex: string,
    costFish: number
  ) => void;
}

const CATEGORIES: { key: CatKey; label: string }[] = [
  { key: 'roupas', label: 'Roupas' },
  { key: 'acessorios', label: 'Acessórios' },
  { key: 'caminhas', label: 'Caminhas 🛏️' },
  { key: 'anime', label: 'Anime 🎌' },
  { key: 'racas', label: 'Raças' },
  { key: 'olhos', label: 'Olhos' },
  { key: 'pupilas', label: 'Pupilas' },
  { key: 'bocas', label: 'Bocas' },
];

export const VipShopModal: React.FC<VipShopModalProps> = ({
  open,
  myCat,
  wallet,
  unlockedItems,
  onClose,
  onEquipOrBuy,
  onApplyColor,
}) => {
  const [tab, setTab] = useState<CatKey>('roupas');
  const [preview, setPreview] = useState<Partial<CatState>>({});
  const [paletteTarget, setPaletteTarget] = useState<
    'outfit' | 'accessory' | 'eyeShape' | 'pupil' | 'bed' | null
  >(null);
  const [customHex, setCustomHex] = useState('#b91c1c');

  if (!open) return null;

  const activePreview: CatState = {
    ...myCat,
    ...preview,
  };

  const items = VIP_CATALOG[tab] || [];

  return (
    <div
      className="fixed inset-0 bg-black/65 z-50 flex items-center justify-center p-2 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="shop-title"
    >
      <div className="bg-[#fff8ed] max-w-3xl w-full rounded-3xl sketch-border p-4 sm:p-5 flex flex-col max-h-[92dvh] gap-3 shadow-2xl">
        <div className="flex items-center justify-between border-b-2 border-[#2b1111]/15 pb-2">
          <div>
            <h2 id="shop-title" className="font-display text-2xl sm:text-3xl font-bold text-red-950">
              Ateliê Estatal de Moda Felina
            </h2>
            <p className="text-xs text-[#2b1111]/75 font-mono-num">
              Saldo: {wallet.fish} 🐟 Peixes · {wallet.coupleCoins} 💖 Medalhas
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar ateliê"
            className="sketch-btn bg-white p-1.5 rounded-xl cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 flex-1 overflow-hidden">
          {/* Live Preview */}
          <div className="bg-[#f3dfc1] border-2 border-[#2b1111] rounded-2xl p-3 flex flex-col items-center justify-between gap-2">
            <span className="text-xs font-bold text-red-950">Provador ao Vivo</span>
            <div className="w-32 h-32 sm:w-40 sm:h-40">
              <CatSvg cat={activePreview} showBed />
            </div>
            <div className="flex flex-wrap justify-center gap-1.5 w-full">
              <button
                type="button"
                onClick={() => setPaletteTarget('outfit')}
                className="sketch-btn bg-white text-[11px] font-bold px-2 py-1 rounded-lg flex items-center gap-1 cursor-pointer"
              >
                <Palette className="w-3 h-3" /> Cor Roupa
              </button>
              <button
                type="button"
                onClick={() => setPaletteTarget('accessory')}
                className="sketch-btn bg-white text-[11px] font-bold px-2 py-1 rounded-lg flex items-center gap-1 cursor-pointer"
              >
                <Palette className="w-3 h-3" /> Cor Item
              </button>
              <button
                type="button"
                onClick={() => setPaletteTarget('eyeShape')}
                className="sketch-btn bg-white text-[11px] font-bold px-2 py-1 rounded-lg flex items-center gap-1 cursor-pointer"
              >
                <Palette className="w-3 h-3" /> Cor Íris
              </button>
              <button
                type="button"
                onClick={() => setPaletteTarget('bed')}
                className="sketch-btn bg-white text-[11px] font-bold px-2 py-1 rounded-lg flex items-center gap-1 cursor-pointer"
              >
                <Palette className="w-3 h-3" /> Cor Caminha
              </button>
            </div>
          </div>

          {/* Catalog */}
          <div className="md:col-span-2 flex flex-col gap-2.5 overflow-hidden">
            <div className="flex flex-wrap gap-1.5">
              {CATEGORIES.map((c) => (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => setTab(c.key)}
                  className={`px-2.5 py-1 rounded-lg border border-[#2b1111] text-xs font-bold whitespace-nowrap cursor-pointer ${
                    tab === c.key ? 'bg-amber-300 text-red-950' : 'bg-white text-[#2b1111]'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 overflow-y-auto custom-scroll pr-1 flex-1">
              {items.map((item) => {
                const isUnlocked = unlockedItems.includes(item.id) || item.price === 0;
                const currentVal = myCat[item.type] ?? (item.type === 'bed' ? 'classic' : undefined);
                const isEquipped = currentVal === item.val;
                const currency = item.currency || 'fish';
                const priceLabel =
                  item.price === 0
                    ? 'Grátis'
                    : currency === 'couple'
                    ? `${item.price} 💖`
                    : `${item.price} 🐟`;

                return (
                  <div
                    key={item.id}
                    className="bg-white p-2.5 rounded-xl border-2 border-[#2b1111] flex flex-col items-center justify-between text-center gap-1.5"
                  >
                    <div className="w-16 h-16 rounded-xl bg-[#f9efe0] border border-[#2b1111]/25 p-1 flex items-center justify-center overflow-hidden">
                      <ShopItemPreviewSvg
                        type={item.type}
                        val={item.val}
                        baseCat={activePreview}
                      />
                    </div>
                    <p className="text-xs font-bold leading-tight">{item.name}</p>
                    <span className="text-[11px] font-bold font-mono-num text-amber-800">
                      {isUnlocked ? (isEquipped ? 'Em uso' : 'Liberado') : priceLabel}
                    </span>
                    <div className="w-full space-y-1">
                      <button
                        type="button"
                        onClick={() =>
                          setPreview((p) => ({
                            ...p,
                            [item.type]: item.val,
                          }))
                        }
                        className="w-full text-[11px] bg-stone-100 hover:bg-stone-200 py-1 rounded-lg border border-[#2b1111]/40 font-semibold cursor-pointer"
                      >
                        Testar
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setPreview((p) => ({ ...p, [item.type]: item.val }));
                          onEquipOrBuy(item.id, item.type, item.val, item.price, currency);
                        }}
                        className={`sketch-btn w-full text-xs py-1 rounded-lg font-bold cursor-pointer ${
                          isEquipped
                            ? 'bg-amber-300 text-red-950'
                            : 'bg-amber-100 hover:bg-amber-200 text-red-950'
                        }`}
                      >
                        {isUnlocked
                          ? isEquipped
                            ? 'Equipado ✓'
                            : item.type === 'bed'
                            ? 'Colocar'
                            : 'Vestir'
                          : 'Adquirir'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Inline Color Picker Drawer when active */}
        {paletteTarget && (
          <div className="bg-white border-2 border-[#2b1111] rounded-2xl p-3 space-y-2">
            <div className="flex items-center justify-between text-xs font-bold">
              <span>
                Tintas para{' '}
                {paletteTarget === 'outfit'
                  ? 'Roupa'
                  : paletteTarget === 'accessory'
                  ? 'Acessório'
                  : paletteTarget === 'eyeShape'
                  ? 'Íris dos Olhos'
                  : paletteTarget === 'bed'
                  ? 'Caminha'
                  : 'Pupila'}{' '}
                (1 🐟)
              </span>
              <button
                type="button"
                onClick={() => setPaletteTarget(null)}
                className="text-red-700 font-bold cursor-pointer"
              >
                Fechar ✕
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {PALETTE_COLORS.map((c) => (
                <button
                  key={c.hex}
                  type="button"
                  onClick={() => {
                    onApplyColor(paletteTarget, c.hex, 1);
                    setPaletteTarget(null);
                  }}
                  className="flex items-center gap-1.5 px-2 py-1 rounded-lg border border-[#2b1111]/40 hover:bg-amber-50 text-[11px] font-semibold cursor-pointer"
                >
                  <span
                    className="w-4 h-4 rounded-full border border-[#2b1111]"
                    style={{ backgroundColor: c.hex }}
                  />
                  <span>{c.name}</span>
                </button>
              ))}
              <div className="flex items-center gap-1.5 ml-auto">
                <input
                  type="color"
                  value={customHex}
                  onChange={(e) => setCustomHex(e.target.value)}
                  className="w-8 h-8 rounded cursor-pointer border border-[#2b1111]"
                  aria-label="Cor personalizada"
                />
                <button
                  type="button"
                  onClick={() => {
                    onApplyColor(paletteTarget, customHex, 1);
                    setPaletteTarget(null);
                  }}
                  className="sketch-btn bg-amber-200 text-xs font-bold px-2.5 py-1 rounded-lg cursor-pointer"
                >
                  Aplicar Cor (1 🐟)
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
