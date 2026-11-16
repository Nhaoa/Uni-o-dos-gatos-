import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  ExternalLink,
  Eye,
  Film,
  Globe,
  HardDrive,
  Image as ImageIcon,
  Pencil,
  Play,
} from 'lucide-react';
import { GalleryExhibit } from '../../types/game';
import { extractDomainLabel, FRAME_STYLE_META } from '../../logic/gallery';
import { fetchDriveFileBlobUrl } from '../../lib/googleDrive';

interface GalleryArtworkCardProps {
  exhibit: GalleryExhibit;
  index: number;
  total: number;
  isFocused: boolean;
  reorderMode: boolean;
  driveToken?: string | null;
  onFocus: () => void;
  onInspect: () => void;
  onEdit: () => void;
  onMoveLeft: () => void;
  onMoveRight: () => void;
  onMoveToPosition: (pos: number) => void;
}

export const GalleryArtworkCard: React.FC<GalleryArtworkCardProps> = ({
  exhibit,
  index,
  total,
  isFocused,
  reorderMode,
  driveToken,
  onFocus,
  onInspect,
  onEdit,
  onMoveLeft,
  onMoveRight,
  onMoveToPosition,
}) => {
  const [imgFailed, setImgFailed] = useState(false);
  const [fallbackBlobUrl, setFallbackBlobUrl] = useState<string | null>(null);

  useEffect(() => {
    setImgFailed(false);
    setFallbackBlobUrl(null);
  }, [exhibit.id, exhibit.imageUrl, exhibit.driveFileId]);

  useEffect(() => {
    if (!imgFailed || exhibit.kind === 'site' || !exhibit.driveFileId || !driveToken) return;
    if (exhibit.kind !== 'image') return;
    let active = true;
    let createdUrl: string | null = null;

    fetchDriveFileBlobUrl(driveToken, exhibit.driveFileId)
      .then((url) => {
        if (!active) {
          URL.revokeObjectURL(url);
          return;
        }
        createdUrl = url;
        setFallbackBlobUrl(url);
      })
      .catch(() => {
        // leave fallback placeholder
      });

    return () => {
      active = false;
      if (createdUrl) URL.revokeObjectURL(createdUrl);
    };
  }, [imgFailed, exhibit.kind, exhibit.driveFileId, driveToken]);

  const frameMeta = FRAME_STYLE_META[exhibit.frameStyle] || FRAME_STYLE_META.gold;
  const accessionNo = String(index + 1).padStart(2, '0');
  const domain = extractDomainLabel(exhibit.url);
  const resolvedImageSrc = fallbackBlobUrl || (!imgFailed ? exhibit.imageUrl : undefined);
  const hasUsableImage = Boolean(resolvedImageSrc);
  const isDriveBacked = exhibit.storage === 'drive' || Boolean(exhibit.driveFileId);

  const kindTag =
    exhibit.kind === 'site' ? 'Site' : exhibit.kind === 'video' ? 'Vídeo' : 'Imagem';
  const kindCaption =
    exhibit.kind === 'site'
      ? 'Site Interativo'
      : exhibit.kind === 'video'
      ? 'Vídeo & Cinema'
      : 'Fotografia & Arte';

  return (
    <article
      data-exhibit-index={index}
      className={`relative shrink-0 w-[208px] sm:w-[224px] flex flex-col items-center transition-transform duration-300 select-none ${
        isFocused ? 'scale-[1.02] z-10' : 'opacity-90 hover:opacity-100'
      }`}
    >
      {/* Overhead Museum Spotlight Cone */}
      <div
        aria-hidden="true"
        className={`pointer-events-none w-40 h-4 -mb-2 transition-opacity duration-300 ${
          isFocused ? 'opacity-100' : 'opacity-45'
        }`}
        style={{
          background:
            'radial-gradient(ellipse at 50% 0%, rgba(254, 243, 199, 0.92) 0%, rgba(254, 243, 199, 0.25) 55%, transparent 80%)',
        }}
      />

      {/* Framed Canvas / Video / Website Exhibit */}
      <button
        type="button"
        onClick={() => {
          onFocus();
          onInspect();
        }}
        aria-label={`Abrir obra ${accessionNo}: ${exhibit.title}`}
        className={`w-full p-1.5 rounded-xl border-[4px] shadow-[0_10px_18px_-8px_rgba(28,25,23,0.45)] cursor-pointer transition-transform duration-200 hover:-translate-y-1 text-left ${
          frameMeta.outerClass
        } ${isFocused ? 'ring-2 ring-amber-400 ring-offset-2 ring-offset-[#F3EFE6]' : ''}`}
      >
        <div
          className="w-full p-1 rounded-md border border-black/15"
          style={{ backgroundColor: frameMeta.matHex }}
        >
          <div className="relative w-full aspect-[16/10] rounded-sm overflow-hidden border border-stone-300 bg-stone-100">
            {hasUsableImage ? (
              <>
                <img
                  src={resolvedImageSrc}
                  alt={exhibit.title}
                  referrerPolicy="no-referrer"
                  onError={() => {
                    if (!fallbackBlobUrl) setImgFailed(true);
                  }}
                  className="w-full h-full object-cover"
                />
                {exhibit.kind === 'video' && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/25">
                    <span className="w-10 h-10 rounded-full bg-black/80 text-amber-200 border border-amber-300/70 flex items-center justify-center shadow-lg">
                      <Play className="w-4 h-4 fill-current ml-0.5" />
                    </span>
                  </div>
                )}
              </>
            ) : exhibit.kind === 'video' ? (
              <div className="w-full h-full flex flex-col items-center justify-center text-center px-3 pt-2 pb-6 bg-gradient-to-br from-stone-900 via-stone-800 to-red-950 text-amber-100 gap-1.5">
                <div className="w-9 h-9 rounded-full bg-amber-400/20 border border-amber-300/60 flex items-center justify-center text-amber-200 shadow">
                  <Play className="w-4 h-4 fill-current ml-0.5" />
                </div>
                <p className="font-display text-xs font-bold text-amber-50 line-clamp-1 leading-tight">
                  {exhibit.title}
                </p>
                <span className="text-[10px] text-amber-200/80 inline-flex items-center gap-1">
                  <Film className="w-3 h-3" /> Clique para assistir
                </span>
              </div>
            ) : exhibit.kind === 'site' ? (
              <div className="w-full h-full flex flex-col bg-gradient-to-br from-[#faf6ee] via-[#f1ebe0] to-[#e6ddcc] text-stone-900">
                <div className="h-5 bg-stone-800 text-stone-100 px-2 flex items-center justify-between gap-2 shrink-0">
                  <div className="flex items-center gap-1" aria-hidden="true">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-400/90" />
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-300/90" />
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400/90" />
                  </div>
                  <span className="text-[10px] font-mono truncate text-stone-300">
                    {domain || 'site-interativo'}
                  </span>
                </div>
                <div className="flex-1 px-2.5 pt-2 pb-6 flex flex-col items-center justify-center text-center gap-1">
                  <div className="w-8 h-8 rounded-full bg-amber-900/10 border border-amber-900/25 flex items-center justify-center text-amber-900">
                    <Globe className="w-4 h-4" />
                  </div>
                  <p className="font-display text-xs font-bold text-stone-900 line-clamp-1 leading-tight">
                    {exhibit.title}
                  </p>
                  <span className="text-[10px] text-stone-600 font-medium">
                    Clique para abrir o site
                  </span>
                </div>
              </div>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-center px-3 pt-2 pb-6 bg-gradient-to-br from-[#f8f3e8] to-[#e9decb] text-stone-700 gap-1">
                <div className="w-8 h-8 rounded-full bg-stone-800/10 border border-stone-800/20 flex items-center justify-center">
                  <ImageIcon className="w-4 h-4 text-stone-700" />
                </div>
                <p className="font-display text-xs font-bold text-stone-900 line-clamp-1 leading-tight">
                  {exhibit.title}
                </p>
                <span className="text-[10px] text-stone-600">
                  Toque para ver ou enviar foto
                </span>
              </div>
            )}

            {/* Drive Badge */}
            {isDriveBacked && (
              <span
                title="Armazenado no Google Drive"
                className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded-md bg-stone-950/80 text-sky-200 border border-sky-400/40 text-[9px] font-bold inline-flex items-center gap-1"
              >
                <HardDrive className="w-2.5 h-2.5" /> Drive
              </span>
            )}

            {/* Subtle Hover Caption Scrim */}
            <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-black/75 via-black/25 to-transparent flex items-end justify-between px-2 pb-1 text-[10px] font-semibold text-white">
              <span>{kindCaption}</span>
              <span className="inline-flex items-center gap-1">
                <Eye className="w-3 h-3" /> Ver
              </span>
            </div>
          </div>
        </div>
      </button>

      {/* Brass / Limestone Museum Placard Below Frame */}
      <div className="w-[96%] mt-1.5 bg-[#FBF9F5] border border-stone-300 rounded-xl p-2 shadow-sm space-y-1 text-left">
        <div className="flex items-center justify-between gap-2 text-[10px] text-stone-500 font-medium">
          <span className="font-mono-num uppercase tracking-wider text-stone-700 font-bold">
            Obra {accessionNo} · {kindTag}
          </span>
          <span className="truncate">
            {exhibit.occasionDate || exhibit.authorName}
          </span>
        </div>

        <h3 className="font-display text-[15px] font-bold text-stone-900 leading-tight truncate">
          {exhibit.title}
        </h3>

        <p className="text-[11px] text-stone-600 leading-snug line-clamp-2 min-h-[1.85rem]">
          {exhibit.description}
        </p>

        {/* Actions / Reorder Controls */}
        {reorderMode ? (
          <div className="pt-1 border-t border-stone-200 flex items-center justify-between gap-1.5">
            <button
              type="button"
              onClick={onMoveLeft}
              disabled={index === 0}
              aria-label={`Mover ${exhibit.title} para trás`}
              className="px-2 py-1.5 rounded-lg border border-stone-300 bg-white hover:bg-stone-100 disabled:opacity-40 text-stone-800 text-xs font-bold flex items-center gap-1 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
            </button>

            <label className="flex items-center gap-1 text-[11px] font-bold text-stone-700">
              <span>Posição</span>
              <select
                aria-label={`Posição de ${exhibit.title}`}
                value={index + 1}
                onChange={(e) => onMoveToPosition(Number(e.target.value))}
                className="bg-white border border-stone-300 rounded-lg px-1.5 py-1 text-xs font-mono-num font-bold text-stone-900 cursor-pointer"
              >
                {Array.from({ length: total }, (_, idx) => (
                  <option key={idx + 1} value={idx + 1}>
                    #{idx + 1}
                  </option>
                ))}
              </select>
            </label>

            <button
              type="button"
              onClick={onMoveRight}
              disabled={index === total - 1}
              aria-label={`Mover ${exhibit.title} para frente`}
              className="px-2 py-1.5 rounded-lg border border-stone-300 bg-white hover:bg-stone-100 disabled:opacity-40 text-stone-800 text-xs font-bold flex items-center gap-1 cursor-pointer"
            >
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <div className="pt-1 border-t border-stone-200 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => {
                onFocus();
                onInspect();
              }}
              className="text-xs font-bold text-stone-900 hover:text-red-900 inline-flex items-center gap-1 cursor-pointer py-1"
            >
              <Eye className="w-3.5 h-3.5" /> Inspecionar
            </button>

            <div className="flex items-center gap-2">
              {exhibit.kind === 'site' && exhibit.url && (
                <a
                  href={exhibit.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-bold text-amber-900 hover:underline inline-flex items-center gap-1 py-1"
                >
                  Abrir <ExternalLink className="w-3 h-3" />
                </a>
              )}
              <button
                type="button"
                onClick={onEdit}
                aria-label={`Editar ${exhibit.title}`}
                className="p-1.5 rounded-lg border border-stone-200 hover:bg-stone-100 text-stone-600 hover:text-stone-900 cursor-pointer"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </article>
  );
};
