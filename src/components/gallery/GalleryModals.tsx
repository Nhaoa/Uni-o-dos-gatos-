import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  ArrowLeft,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Film,
  FolderOpen,
  Globe,
  HardDrive,
  Image as ImageIcon,
  Maximize2,
  Minimize2,
  Pencil,
  Play,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import {
  GalleryDriveFolderConfig,
  GalleryExhibit,
  GalleryExhibitKind,
  GalleryFrameStyle,
  GalleryMediaStorage,
  PlayerRole,
} from '../../types/game';
import {
  extractDomainLabel,
  formatFileSize,
  FRAME_STYLE_META,
  GalleryExhibitDraft,
  isDirectHtmlVideoUrl,
  normalizeVideoSource,
  validateGalleryExhibitInput,
} from '../../logic/gallery';
import {
  DEFAULT_GALLERY_DRIVE_FOLDER_NAME,
  fetchDriveFileBlobUrl,
  uploadMediaToDriveFolder,
} from '../../lib/googleDrive';

export const GoogleLogoSvg: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
    <path
      fill="#EA4335"
      d="M12 10.2v3.9h5.5c-.2 1.3-1.5 3.9-5.5 3.9-3.3 0-6-2.7-6-6s2.7-6 6-6c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.7 3.5 14.6 2.5 12 2.5 6.8 2.5 2.5 6.8 2.5 12s4.3 9.5 9.5 9.5c5.5 0 9.1-3.9 9.1-9.3 0-.6-.1-1.1-.2-1.6H12z"
    />
    <path
      fill="#34A853"
      d="M3.7 7.4l3.2 2.3C7.7 7.6 9.7 6 12 6c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.7 3.5 14.6 2.5 12 2.5 8.3 2.5 5.1 4.6 3.7 7.4z"
    />
    <path
      fill="#4285F4"
      d="M12 21.5c3.1 0 5.7-1 7.6-2.8l-3.1-2.5c-.9.6-2 1.1-4.5 1.1-2.9 0-5.4-1.9-6.2-4.6l-3.3 2.5C4 18.8 7.7 21.5 12 21.5z"
    />
    <path
      fill="#FBBC05"
      d="M2.5 12c0 1.2.2 2.3.7 3.2l3.3-2.5c-.2-.5-.3-1.1-.3-1.7s.1-1.2.3-1.7L3.2 6.8C2.7 8.4 2.5 10.2 2.5 12z"
    />
  </svg>
);

interface GalleryInspectorModalProps {
  exhibit: GalleryExhibit | null;
  index: number;
  total: number;
  driveToken: string | null;
  onConnectDrive: () => Promise<string | null>;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
  onMoveLeft: () => void;
  onMoveRight: () => void;
  onEdit: () => void;
  onDelete: (alsoDeleteFromDrive: boolean) => void | Promise<void>;
}

export const GalleryInspectorModal: React.FC<GalleryInspectorModalProps> = ({
  exhibit,
  index,
  total,
  driveToken,
  onConnectDrive,
  onClose,
  onPrev,
  onNext,
  onMoveLeft,
  onMoveRight,
  onEdit,
  onDelete,
}) => {
  const [siteViewMode, setSiteViewMode] = useState<'iframe' | 'cover'>('iframe');
  const [zoomed, setZoomed] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [alsoDeleteFromDrive, setAlsoDeleteFromDrive] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [imgFailed, setImgFailed] = useState(false);
  const [driveBlobUrl, setDriveBlobUrl] = useState<string | null>(null);
  const [loadingDriveBlob, setLoadingDriveBlob] = useState(false);
  const [driveConnectError, setDriveConnectError] = useState('');

  useEffect(() => {
    setSiteViewMode('iframe');
    setZoomed(false);
    setConfirmDelete(false);
    setAlsoDeleteFromDrive(false);
    setDeleting(false);
    setImgFailed(false);
    setDriveConnectError('');
    setDriveBlobUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
  }, [exhibit?.id]);

  // Cleanup any created object URL on unmount
  useEffect(() => {
    return () => {
      if (driveBlobUrl) URL.revokeObjectURL(driveBlobUrl);
    };
  }, [driveBlobUrl]);

  // Automatic authenticated Drive fallback for private photos
  useEffect(() => {
    if (!exhibit || exhibit.kind !== 'image' || !imgFailed || !exhibit.driveFileId || !driveToken) {
      return;
    }
    let active = true;
    setLoadingDriveBlob(true);
    fetchDriveFileBlobUrl(driveToken, exhibit.driveFileId)
      .then((blobUrl) => {
        if (!active) {
          URL.revokeObjectURL(blobUrl);
          return;
        }
        setDriveBlobUrl(blobUrl);
      })
      .catch(() => {
        // leave placeholder if unavailable
      })
      .finally(() => {
        if (active) setLoadingDriveBlob(false);
      });
    return () => {
      active = false;
    };
  }, [exhibit, imgFailed, driveToken]);

  if (!exhibit) return null;

  const frameMeta = FRAME_STYLE_META[exhibit.frameStyle] || FRAME_STYLE_META.gold;
  const accessionNo = String(index + 1).padStart(2, '0');
  const domain = extractDomainLabel(exhibit.url);
  const resolvedImageSrc =
    exhibit.kind === 'image' && driveBlobUrl
      ? driveBlobUrl
      : !imgFailed
      ? exhibit.imageUrl
      : undefined;
  const isDriveBacked = exhibit.storage === 'drive' || Boolean(exhibit.driveFileId);
  const sizeLabel = formatFileSize(exhibit.fileSizeBytes);
  const storageLabel = isDriveBacked
    ? 'Google Drive'
    : exhibit.storage === 'inline'
    ? 'Banco do App'
    : exhibit.url || exhibit.videoUrl || exhibit.imageUrl
    ? 'Link Externo'
    : 'Museu';

  const effectiveVideoUrl =
    exhibit.kind === 'video' ? driveBlobUrl || exhibit.videoUrl || '' : '';
  const useNativeVideoTag =
    exhibit.kind === 'video' && isDirectHtmlVideoUrl(effectiveVideoUrl);

  const handleLoadDriveVideoStream = async () => {
    if (!exhibit.driveFileId) return;
    setDriveConnectError('');
    setLoadingDriveBlob(true);
    try {
      const token = driveToken || (await onConnectDrive());
      if (!token) return;
      const blobUrl = await fetchDriveFileBlobUrl(token, exhibit.driveFileId);
      setDriveBlobUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return blobUrl;
      });
    } catch (err) {
      setDriveConnectError(
        err instanceof Error ? err.message : 'Não foi possível reproduzir o vídeo do Drive.'
      );
    } finally {
      setLoadingDriveBlob(false);
    }
  };

  const handleConfirmDelete = async () => {
    setDeleting(true);
    try {
      await onDelete(Boolean(exhibit.driveFileId && alsoDeleteFromDrive));
    } finally {
      setDeleting(false);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-2 sm:p-5"
      role="dialog"
      aria-modal="true"
      aria-label={`Obra em exposição: ${exhibit.title}`}
    >
      <div className="bg-[#FBF9F5] w-full max-w-5xl max-h-[95dvh] rounded-3xl border-2 border-[#1C1917] shadow-2xl flex flex-col overflow-hidden">
        {/* Top Curatorial Bar */}
        <div className="px-4 sm:px-6 py-3 bg-[#F3EFE6] border-b border-stone-300 flex flex-wrap items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="text-[11px] font-mono-num font-bold uppercase tracking-widest text-stone-500">
              Acervo {accessionNo} de {String(total).padStart(2, '0')} ·{' '}
              {exhibit.kind === 'site'
                ? 'Site Interativo'
                : exhibit.kind === 'video'
                ? 'Vídeo & Cinema'
                : 'Fotografia & Arte'}
            </div>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-stone-900 truncate leading-tight">
              {exhibit.title}
            </h2>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={onPrev}
              disabled={index <= 0}
              aria-label="Obra anterior"
              className="px-2.5 py-2 rounded-xl border border-stone-300 bg-white hover:bg-stone-100 disabled:opacity-40 text-stone-800 text-xs font-bold flex items-center gap-1 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" /> Anterior
            </button>
            <button
              type="button"
              onClick={onNext}
              disabled={index >= total - 1}
              aria-label="Próxima obra"
              className="px-2.5 py-2 rounded-xl border border-stone-300 bg-white hover:bg-stone-100 disabled:opacity-40 text-stone-800 text-xs font-bold flex items-center gap-1 cursor-pointer"
            >
              Próxima <ChevronRight className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Fechar visualização da obra"
              className="p-2 rounded-xl border border-stone-300 bg-white hover:bg-stone-100 text-stone-900 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Main Viewer & Curatorial Plaque */}
        <div className="flex-1 overflow-y-auto custom-scroll p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-[1.55fr_1fr] gap-5 items-start">
          {/* Left: Artwork / Video / Website Viewport */}
          <div className="space-y-3">
            <div className={`p-3 rounded-2xl border-[6px] shadow-lg ${frameMeta.outerClass}`}>
              <div
                className="rounded-lg border border-black/15 p-2"
                style={{ backgroundColor: frameMeta.matHex }}
              >
                {exhibit.kind === 'site' && exhibit.url ? (
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2 bg-stone-900 text-stone-100 px-3 py-2 rounded-lg text-xs">
                      <span className="font-mono truncate max-w-[240px] sm:max-w-sm">
                        {exhibit.url}
                      </span>
                      <div className="flex items-center gap-1.5">
                        {exhibit.imageUrl && (
                          <button
                            type="button"
                            onClick={() =>
                              setSiteViewMode((m) => (m === 'iframe' ? 'cover' : 'iframe'))
                            }
                            className="px-2.5 py-1 rounded-md bg-stone-700 hover:bg-stone-600 text-white font-semibold cursor-pointer whitespace-nowrap"
                          >
                            {siteViewMode === 'iframe' ? 'Ver Capa' : 'Ver Site Ao Vivo'}
                          </button>
                        )}
                        <a
                          href={exhibit.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2.5 py-1 rounded-md bg-amber-400 hover:bg-amber-300 text-stone-950 font-bold inline-flex items-center gap-1 whitespace-nowrap"
                        >
                          Abrir em Nova Aba <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    </div>

                    {siteViewMode === 'cover' && exhibit.imageUrl && !imgFailed ? (
                      <img
                        src={exhibit.imageUrl}
                        alt={`Capa do site ${exhibit.title}`}
                        referrerPolicy="no-referrer"
                        onError={() => setImgFailed(true)}
                        className="w-full h-[360px] sm:h-[440px] object-cover rounded-md border border-stone-300"
                      />
                    ) : (
                      <div className="relative w-full h-[360px] sm:h-[440px] rounded-md overflow-hidden border border-stone-300 bg-white">
                        <iframe
                          title={`Prévia do site ${exhibit.title}`}
                          src={exhibit.url}
                          sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                          referrerPolicy="no-referrer"
                          className="w-full h-full border-0"
                        />
                      </div>
                    )}
                    <p className="text-[11px] text-stone-600">
                      Observação: alguns sites externos bloqueiam incorporação direta em quadros de página; caso fique em branco, clique em <strong>Abrir em Nova Aba</strong> acima.
                    </p>
                  </div>
                ) : exhibit.kind === 'video' && effectiveVideoUrl ? (
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2 bg-stone-900 text-stone-100 px-3 py-2 rounded-lg text-xs">
                      <span className="inline-flex items-center gap-1.5 font-semibold truncate max-w-[260px]">
                        <Film className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                        {isDriveBacked ? 'Vídeo no Google Drive' : 'Player de Vídeo'}
                      </span>
                      <div className="flex items-center gap-1.5">
                        {exhibit.driveFileId && !driveBlobUrl && (
                          <button
                            type="button"
                            onClick={handleLoadDriveVideoStream}
                            disabled={loadingDriveBlob}
                            className="px-2.5 py-1 rounded-md bg-stone-700 hover:bg-stone-600 disabled:opacity-50 text-white font-semibold cursor-pointer whitespace-nowrap inline-flex items-center gap-1"
                          >
                            <Play className="w-3 h-3" />
                            {loadingDriveBlob ? 'Carregando...' : 'Reproduzir Direto'}
                          </button>
                        )}
                        {(exhibit.url || exhibit.videoUrl) && (
                          <a
                            href={exhibit.url || exhibit.videoUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-2.5 py-1 rounded-md bg-amber-400 hover:bg-amber-300 text-stone-950 font-bold inline-flex items-center gap-1 whitespace-nowrap"
                          >
                            Abrir Vídeo <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </div>
                    </div>

                    {useNativeVideoTag ? (
                      <video
                        key={effectiveVideoUrl}
                        src={effectiveVideoUrl}
                        poster={exhibit.imageUrl}
                        controls
                        playsInline
                        className="w-full max-h-[440px] rounded-md border border-stone-300 bg-black"
                      />
                    ) : (
                      <div className="relative w-full aspect-video max-h-[440px] rounded-md overflow-hidden border border-stone-300 bg-black">
                        <iframe
                          title={`Vídeo: ${exhibit.title}`}
                          src={effectiveVideoUrl}
                          allow="autoplay; fullscreen; picture-in-picture"
                          referrerPolicy="no-referrer"
                          className="w-full h-full border-0"
                        />
                      </div>
                    )}

                    {driveConnectError && (
                      <p className="text-[11px] font-bold text-red-700 bg-red-50 border border-red-200 rounded-md px-2.5 py-1.5">
                        {driveConnectError}
                      </p>
                    )}

                    {exhibit.driveFileId && !driveBlobUrl && (
                      <p className="text-[11px] text-stone-600">
                        Dica: se o vídeo do Drive ficar privado ou o player pedir login, clique em <strong>Reproduzir Direto</strong> (via Google Drive) ou em <strong>Abrir Vídeo</strong>.
                      </p>
                    )}
                  </div>
                ) : resolvedImageSrc ? (
                  <div className="relative bg-stone-100 rounded-md overflow-hidden border border-stone-300">
                    <img
                      src={resolvedImageSrc}
                      alt={exhibit.title}
                      referrerPolicy="no-referrer"
                      onError={() => {
                        if (!driveBlobUrl) setImgFailed(true);
                      }}
                      className={`w-full transition-transform duration-300 ${
                        zoomed
                          ? 'max-h-[70vh] object-contain scale-105 cursor-zoom-out'
                          : 'max-h-[440px] object-contain cursor-zoom-in'
                      }`}
                      onClick={() => setZoomed((z) => !z)}
                    />
                    <button
                      type="button"
                      onClick={() => setZoomed((z) => !z)}
                      aria-label={zoomed ? 'Reduzir imagem' : 'Ampliar imagem'}
                      className="absolute bottom-2 right-2 bg-stone-900/80 hover:bg-stone-900 text-white px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer"
                    >
                      {zoomed ? (
                        <>
                          <Minimize2 className="w-3.5 h-3.5" /> Ajustar
                        </>
                      ) : (
                        <>
                          <Maximize2 className="w-3.5 h-3.5" /> Ampliar
                        </>
                      )}
                    </button>
                  </div>
                ) : (
                  <div className="w-full h-[320px] flex flex-col items-center justify-center text-center p-6 bg-stone-100 rounded-md text-stone-600 gap-3">
                    <ImageIcon className="w-8 h-8" />
                    <p className="text-sm font-semibold max-w-sm">
                      {exhibit.driveFileId && !driveToken
                        ? 'Este arquivo está no Google Drive com acesso privado. Conecte sua conta Drive para visualizá-lo.'
                        : loadingDriveBlob
                        ? 'Carregando mídia diretamente do Google Drive...'
                        : 'Nenhuma mídia anexada ainda. Clique em Editar Obra para enviar uma foto ou vídeo.'}
                    </p>
                    {exhibit.driveFileId && !driveToken && (
                      <button
                        type="button"
                        onClick={() => void onConnectDrive()}
                        className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-stone-300 bg-white hover:bg-stone-50 text-stone-900 text-xs font-bold shadow-sm cursor-pointer"
                      >
                        <GoogleLogoSvg /> Conectar Google Drive
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right: Museum Accession Metadata & Actions */}
          <div className="bg-white border border-stone-200 rounded-2xl p-4 sm:p-5 space-y-4">
            <div className="space-y-2">
              <h3 className="text-xs font-mono-num uppercase tracking-widest text-stone-500 font-bold">
                Ficha Curatorial
              </h3>
              <p className="text-sm sm:text-base text-stone-800 leading-relaxed whitespace-pre-line">
                {exhibit.description}
              </p>
            </div>

            <dl className="divide-y divide-stone-200 border-y border-stone-200 text-xs">
              <div className="py-2 flex items-center justify-between gap-2">
                <dt className="text-stone-500 font-medium">Posição no Corredor</dt>
                <dd className="font-mono-num font-bold text-stone-900">
                  #{index + 1} de {total}
                </dd>
              </div>
              <div className="py-2 flex items-center justify-between gap-2">
                <dt className="text-stone-500 font-medium">Curadoria</dt>
                <dd className="font-semibold text-stone-900">{exhibit.authorName}</dd>
              </div>
              <div className="py-2 flex items-center justify-between gap-2">
                <dt className="text-stone-500 font-medium">Armazenamento</dt>
                <dd className="font-semibold text-stone-900 inline-flex items-center gap-1">
                  {isDriveBacked && <HardDrive className="w-3.5 h-3.5 text-sky-700" />}
                  {storageLabel}
                  {sizeLabel ? ` (${sizeLabel})` : ''}
                </dd>
              </div>
              <div className="py-2 flex items-center justify-between gap-2">
                <dt className="text-stone-500 font-medium">Moldura</dt>
                <dd className="font-semibold text-stone-900">{frameMeta.label}</dd>
              </div>
              {exhibit.occasionDate && (
                <div className="py-2 flex items-center justify-between gap-2">
                  <dt className="text-stone-500 font-medium">Data / Ocasião</dt>
                  <dd className="font-semibold text-stone-900">{exhibit.occasionDate}</dd>
                </div>
              )}
              {exhibit.kind === 'site' && domain && (
                <div className="py-2 flex items-center justify-between gap-2">
                  <dt className="text-stone-500 font-medium">Domínio</dt>
                  <dd className="font-mono text-stone-800 truncate max-w-[180px]">{domain}</dd>
                </div>
              )}
            </dl>

            {/* Reorder Position Buttons */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-stone-600 block">
                Mudar posição na exposição
              </span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={onMoveLeft}
                  disabled={index === 0}
                  className="px-3 py-2 rounded-xl border border-stone-300 bg-stone-50 hover:bg-stone-100 disabled:opacity-40 text-xs font-bold text-stone-900 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Mover p/ trás
                </button>
                <button
                  type="button"
                  onClick={onMoveRight}
                  disabled={index >= total - 1}
                  className="px-3 py-2 rounded-xl border border-stone-300 bg-stone-50 hover:bg-stone-100 disabled:opacity-40 text-xs font-bold text-stone-900 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  Mover p/ frente <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Edit & Remove Controls */}
            <div className="pt-2 border-t border-stone-200 space-y-2.5">
              {confirmDelete ? (
                <div className="rounded-xl border border-red-300 bg-red-50/90 p-3 space-y-2.5 text-left">
                  <p className="text-xs font-bold text-red-950">
                    Remover &ldquo;{exhibit.title}&rdquo; da galeria?
                  </p>
                  {exhibit.driveFileId && (
                    <label className="flex items-start gap-2 text-[11px] text-red-950 bg-white/80 border border-red-200 rounded-lg p-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={alsoDeleteFromDrive}
                        onChange={(e) => setAlsoDeleteFromDrive(e.target.checked)}
                        className="mt-0.5 accent-red-700"
                      />
                      <span>
                        <strong>Também excluir arquivo permanente do Google Drive</strong> (se desmarcado, o arquivo continua salvo na sua pasta do Drive).
                      </span>
                    </label>
                  )}
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      disabled={deleting}
                      onClick={() => void handleConfirmDelete()}
                      className="px-3 py-2 rounded-xl bg-red-700 hover:bg-red-800 disabled:opacity-50 text-white text-xs font-bold cursor-pointer"
                    >
                      {deleting ? 'Removendo...' : 'Confirmar Exclusão'}
                    </button>
                    <button
                      type="button"
                      disabled={deleting}
                      onClick={() => {
                        setConfirmDelete(false);
                        setAlsoDeleteFromDrive(false);
                      }}
                      className="px-3 py-2 rounded-xl border border-stone-300 bg-white text-xs font-bold text-stone-700 cursor-pointer"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={onEdit}
                    className="px-3.5 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    <Pencil className="w-3.5 h-3.5" /> Editar Obra
                  </button>

                  <button
                    type="button"
                    onClick={() => setConfirmDelete(true)}
                    className="px-3 py-2 rounded-xl border border-red-300 text-red-800 hover:bg-red-50 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Remover
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

interface GalleryEditorModalProps {
  open: boolean;
  editingExhibit: GalleryExhibit | null;
  totalCount: number;
  myRole: PlayerRole;
  myNick: string;
  driveToken: string | null;
  driveFolder: GalleryDriveFolderConfig | null;
  onConnectDrive: () => Promise<string | null>;
  onEnsureFolder: (token: string) => Promise<GalleryDriveFolderConfig>;
  onClose: () => void;
  onSave: (
    validated: Omit<GalleryExhibit, 'id' | 'createdAt'>,
    targetOneBasedPosition: number
  ) => void;
}

async function compressImageFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Não foi possível ler a imagem.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Formato de imagem inválido.'));
      img.onload = () => {
        const maxDim = 1080;
        const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
        const w = Math.max(1, Math.round(img.width * scale));
        const h = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Falha ao processar imagem.'));
          return;
        }
        ctx.drawImage(img, 0, 0, w, h);
        const compressed = canvas.toDataURL('image/jpeg', 0.82);
        resolve(compressed);
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

export const GalleryEditorModal: React.FC<GalleryEditorModalProps> = ({
  open,
  editingExhibit,
  totalCount,
  myRole,
  myNick,
  driveToken,
  driveFolder,
  onConnectDrive,
  onEnsureFolder,
  onClose,
  onSave,
}) => {
  const [kind, setKind] = useState<GalleryExhibitKind>('site');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [url, setUrl] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [driveFileId, setDriveFileId] = useState<string | undefined>(undefined);
  const [driveFolderId, setDriveFolderId] = useState<string | undefined>(undefined);
  const [mimeType, setMimeType] = useState<string | undefined>(undefined);
  const [fileSizeBytes, setFileSizeBytes] = useState<number | undefined>(undefined);
  const [storage, setStorage] = useState<GalleryMediaStorage | undefined>(undefined);
  const [shareWithLink, setShareWithLink] = useState(true);
  const [occasionDate, setOccasionDate] = useState('');
  const [frameStyle, setFrameStyle] = useState<GalleryFrameStyle>('gold');
  const [position, setPosition] = useState<number>(totalCount + 1);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setError('');
    setUploading(false);
    setUploadProgress(0);
    setShareWithLink(true);
    if (editingExhibit) {
      setKind(editingExhibit.kind);
      setTitle(editingExhibit.title);
      setDescription(editingExhibit.description);
      setUrl(editingExhibit.url || '');
      setImageUrl(editingExhibit.imageUrl || '');
      setVideoUrl(editingExhibit.videoUrl || '');
      setDriveFileId(editingExhibit.driveFileId);
      setDriveFolderId(editingExhibit.driveFolderId);
      setMimeType(editingExhibit.mimeType);
      setFileSizeBytes(editingExhibit.fileSizeBytes);
      setStorage(editingExhibit.storage);
      setOccasionDate(editingExhibit.occasionDate || '');
      setFrameStyle(editingExhibit.frameStyle || 'gold');
      setPosition(1);
    } else {
      setKind('site');
      setTitle('');
      setDescription('');
      setUrl('');
      setImageUrl('');
      setVideoUrl('');
      setDriveFileId(undefined);
      setDriveFolderId(undefined);
      setMimeType(undefined);
      setFileSizeBytes(undefined);
      setStorage(undefined);
      setOccasionDate('');
      setFrameStyle('gold');
      setPosition(totalCount + 1);
    }
  }, [open, editingExhibit, totalCount]);

  if (!open) return null;

  const clearMediaMetadata = () => {
    setDriveFileId(undefined);
    setDriveFolderId(undefined);
    setMimeType(undefined);
    setFileSizeBytes(undefined);
    setStorage(undefined);
  };

  const handleUploadToDrive = async (
    e: React.ChangeEvent<HTMLInputElement>,
    mediaType: 'image' | 'video'
  ) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setError('');
    setUploading(true);
    setUploadProgress(5);
    try {
      const token = driveToken || (await onConnectDrive());
      if (!token) {
        setError('Conecte sua conta Google Drive para enviar arquivos para sua pasta.');
        return;
      }
      const folder = driveFolder || (await onEnsureFolder(token));
      const uploaded = await uploadMediaToDriveFolder({
        accessToken: token,
        folderId: folder.folderId,
        file,
        shareWithLink,
        onProgress: (pct) => setUploadProgress(pct),
      });

      setDriveFileId(uploaded.fileId);
      setDriveFolderId(uploaded.folderId);
      setMimeType(uploaded.mimeType);
      setFileSizeBytes(uploaded.sizeBytes);
      setStorage('drive');

      if (mediaType === 'video') {
        if (uploaded.videoUrl) setVideoUrl(uploaded.videoUrl);
        if (uploaded.webViewLink) setUrl(uploaded.webViewLink);
        if (uploaded.imageUrl) setImageUrl(uploaded.imageUrl);
      } else {
        if (uploaded.imageUrl) setImageUrl(uploaded.imageUrl);
        if (uploaded.webViewLink) setUrl(uploaded.webViewLink);
      }
      if (!title.trim()) {
        const cleanTitle = file.name.replace(/\.[^.]+$/, '').slice(0, 80);
        if (cleanTitle.length >= 2) setTitle(cleanTitle);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao enviar para o Google Drive.');
    } finally {
      setUploading(false);
    }
  };

  const handleInlineImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setError('');
    setUploading(true);
    try {
      const dataUrl = await compressImageFile(file);
      clearMediaMetadata();
      setStorage('inline');
      setImageUrl(dataUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar imagem.');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const draft: GalleryExhibitDraft = {
      kind,
      title,
      description,
      url,
      imageUrl,
      videoUrl,
      driveFileId,
      driveFolderId,
      mimeType,
      fileSizeBytes,
      storage,
      frameStyle,
      occasionDate,
      addedBy: myRole,
      authorName: myNick,
    };
    const result = validateGalleryExhibitInput(draft);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    onSave(result.value, position);
  };

  const maxPositions = editingExhibit ? totalCount : totalCount + 1;
  const normalizedVideoPreview = kind === 'video' && videoUrl ? normalizeVideoSource(videoUrl) : null;

  return createPortal(
    <div
      className="fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-3"
      role="dialog"
      aria-modal="true"
      aria-label={editingExhibit ? 'Editar Obra da Galeria' : 'Adicionar Nova Obra'}
    >
      <form
        onSubmit={handleSubmit}
        className="bg-[#FBF9F5] w-full max-w-lg max-h-[94dvh] rounded-3xl border-2 border-[#1C1917] p-4 sm:p-6 flex flex-col gap-3.5 shadow-2xl overflow-y-auto custom-scroll text-left"
      >
        <div className="flex items-center justify-between gap-2 border-b border-stone-300 pb-2.5">
          <div>
            <h2 className="font-display text-2xl font-bold text-stone-900 leading-none">
              {editingExhibit ? 'Editar Obra na Exposição' : 'Adicionar Obra ao Museu'}
            </h2>
            <p className="text-xs text-stone-600 mt-1">
              Exiba sites, fotos e vídeos salvos direto na sua pasta do Google Drive.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar formulário da galeria"
            className="p-2 rounded-xl border border-stone-300 bg-white hover:bg-stone-100 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Kind Selector */}
        <div className="grid grid-cols-3 gap-1.5 bg-stone-200/75 p-1 rounded-xl border border-stone-300">
          <button
            type="button"
            onClick={() => setKind('site')}
            className={`py-2 px-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer ${
              kind === 'site'
                ? 'bg-stone-900 text-amber-200 shadow-sm'
                : 'text-stone-700 hover:bg-white/60'
            }`}
          >
            <Globe className="w-3.5 h-3.5" /> Site / Link
          </button>
          <button
            type="button"
            onClick={() => setKind('image')}
            className={`py-2 px-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer ${
              kind === 'image'
                ? 'bg-stone-900 text-amber-200 shadow-sm'
                : 'text-stone-700 hover:bg-white/60'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5" /> Foto / Imagem
          </button>
          <button
            type="button"
            onClick={() => setKind('video')}
            className={`py-2 px-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer ${
              kind === 'video'
                ? 'bg-stone-900 text-amber-200 shadow-sm'
                : 'text-stone-700 hover:bg-white/60'
            }`}
          >
            <Film className="w-3.5 h-3.5" /> Vídeo
          </button>
        </div>

        {/* Title */}
        <label className="space-y-1 block">
          <span className="text-xs font-bold text-stone-800">Título da Obra</span>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={80}
            placeholder={
              kind === 'site'
                ? 'Ex: Nosso Jardim Estelar'
                : kind === 'video'
                ? 'Ex: Nosso Pôr do Sol na Praia'
                : 'Ex: Nossa Primeira Viagem'
            }
            className="w-full px-3 py-2 rounded-xl border border-stone-300 bg-white text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-600"
          />
        </label>

        {/* Site URL */}
        {kind === 'site' && (
          <label className="space-y-1 block">
            <span className="text-xs font-bold text-stone-800">Endereço do Site (URL)</span>
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://meu-site-romantico.vercel.app"
              className="w-full px-3 py-2 rounded-xl border border-stone-300 bg-white text-sm font-mono text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-600"
            />
          </label>
        )}

        {/* Google Drive Upload Box for Foto / Vídeo */}
        {(kind === 'image' || kind === 'video') && (
          <div className="rounded-2xl border border-sky-300 bg-sky-50/75 p-3 space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-sky-950 min-w-0">
                <FolderOpen className="w-4 h-4 text-sky-700 shrink-0" />
                <span className="truncate">
                  Pasta: {driveFolder?.folderName || DEFAULT_GALLERY_DRIVE_FOLDER_NAME}
                </span>
              </div>
              {driveToken ? (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-900 border border-emerald-300">
                  Google Drive Conectado ✓
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => void onConnectDrive()}
                  className="px-2.5 py-1 rounded-lg border border-stone-300 bg-white hover:bg-stone-50 text-stone-900 text-[11px] font-bold inline-flex items-center gap-1.5 shadow-sm cursor-pointer"
                >
                  <GoogleLogoSvg className="w-3.5 h-3.5" /> Conectar Drive
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <label className="px-3 py-2 rounded-xl border border-sky-700 bg-sky-700 hover:bg-sky-800 text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer shadow-sm">
                <HardDrive className="w-3.5 h-3.5" />
                {uploading
                  ? `Enviando (${uploadProgress}%)...`
                  : kind === 'video'
                  ? 'Enviar Vídeo p/ Google Drive'
                  : 'Enviar Foto p/ Google Drive'}
                <input
                  type="file"
                  accept={kind === 'video' ? 'video/*' : 'image/*'}
                  disabled={uploading}
                  onChange={(e) => void handleUploadToDrive(e, kind)}
                  className="sr-only"
                />
              </label>

              {kind === 'image' && (
                <label className="px-3 py-2 rounded-xl border border-stone-300 bg-amber-100 hover:bg-amber-200 text-stone-900 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer">
                  <Upload className="w-3.5 h-3.5" />
                  Comprimir no App
                  <input
                    type="file"
                    accept="image/*"
                    disabled={uploading}
                    onChange={(e) => void handleInlineImageChange(e)}
                    className="sr-only"
                  />
                </label>
              )}
            </div>

            <label className="flex items-center gap-2 text-[11px] text-sky-950 cursor-pointer">
              <input
                type="checkbox"
                checked={shareWithLink}
                onChange={(e) => setShareWithLink(e.target.checked)}
                className="accent-sky-700"
              />
              <span>
                Compartilhar link de leitura com meu amor (ambos conseguem ver direto na galeria)
              </span>
            </label>

            {uploading && (
              <div className="w-full h-2 rounded-full bg-sky-200 overflow-hidden">
                <div
                  className="h-full bg-sky-700 transition-all duration-200"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            )}
          </div>
        )}

        {/* Video URL Input + Preview */}
        {kind === 'video' && (
          <div className="space-y-1.5">
            <label className="space-y-1 block">
              <span className="text-xs font-bold text-stone-800">
                Link do Vídeo (Google Drive, YouTube, Vimeo ou .mp4)
              </span>
              <input
                type="text"
                value={videoUrl}
                onChange={(e) => {
                  clearMediaMetadata();
                  setVideoUrl(e.target.value);
                }}
                placeholder="https://drive.google.com/file/d/.../view ou https://youtu.be/..."
                className="w-full px-3 py-2 rounded-xl border border-stone-300 bg-white text-xs font-mono text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-600"
              />
            </label>

            {driveFileId && storage === 'drive' && (
              <div className="flex items-center justify-between gap-2 bg-emerald-50 border border-emerald-300 rounded-xl px-3 py-2 text-xs text-emerald-950">
                <span className="inline-flex items-center gap-1.5 font-bold truncate">
                  <HardDrive className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                  Vídeo pronto no Google Drive
                  {fileSizeBytes ? ` · ${formatFileSize(fileSizeBytes)}` : ''}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setVideoUrl('');
                    setUrl('');
                    setImageUrl('');
                    clearMediaMetadata();
                  }}
                  className="px-2 py-0.5 rounded-md bg-stone-900 text-white text-[10px] font-bold cursor-pointer"
                >
                  Limpar
                </button>
              </div>
            )}

            {!driveFileId && normalizedVideoPreview && (
              <p className="text-[11px] text-emerald-800 font-semibold">
                Link reconhecido ✓ ({normalizedVideoPreview.driveFileId ? 'Google Drive' : 'Embed / Mídia'})
              </p>
            )}
          </div>
        )}

        {/* Image Upload / Image URL (Primary for image, Optional Cover for site/video) */}
        <div className="space-y-1.5">
          <span className="text-xs font-bold text-stone-800 block">
            {kind === 'site'
              ? 'Imagem de Capa / Print do Site (opcional)'
              : kind === 'video'
              ? 'Miniatura / Capa do Vídeo (opcional)'
              : 'Link ou Prévia da Imagem'}
          </span>
          <div className="flex flex-wrap items-center gap-2">
            {kind === 'site' && (
              <label className="px-3 py-2 rounded-xl border border-stone-300 bg-amber-100 hover:bg-amber-200 text-stone-900 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer">
                <Upload className="w-3.5 h-3.5" />
                {uploading ? 'Processando...' : 'Enviar Capa'}
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => void handleInlineImageChange(e)}
                  className="sr-only"
                />
              </label>
            )}
            <input
              type="text"
              value={imageUrl.startsWith('data:image/') ? '' : imageUrl}
              onChange={(e) => {
                if (kind === 'image') clearMediaMetadata();
                setImageUrl(e.target.value);
              }}
              placeholder={
                imageUrl.startsWith('data:image/')
                  ? 'Imagem comprimida no app ✓'
                  : 'Ou cole a URL da imagem (https://... ou link do Drive)'
              }
              aria-label="Link da imagem"
              className="flex-1 min-w-[180px] px-3 py-2 rounded-xl border border-stone-300 bg-white text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-600"
            />
          </div>
          {imageUrl && (
            <div className="relative mt-1 rounded-xl border border-stone-300 overflow-hidden bg-stone-100 h-28 flex items-center justify-center">
              <img
                src={imageUrl}
                alt="Prévia da imagem"
                referrerPolicy="no-referrer"
                className="h-full w-full object-cover"
              />
              {driveFileId && kind === 'image' && (
                <span className="absolute top-1.5 left-1.5 px-2 py-0.5 rounded-md bg-black/75 text-sky-200 text-[10px] font-bold inline-flex items-center gap-1">
                  <HardDrive className="w-3 h-3" /> Drive
                  {fileSizeBytes ? ` · ${formatFileSize(fileSizeBytes)}` : ''}
                </span>
              )}
              <button
                type="button"
                onClick={() => {
                  setImageUrl('');
                  if (kind === 'image') clearMediaMetadata();
                }}
                className="absolute top-1.5 right-1.5 px-2 py-0.5 rounded-md bg-black/75 text-white text-[10px] font-bold cursor-pointer"
              >
                Limpar
              </button>
            </div>
          )}
        </div>

        {/* Description */}
        <label className="space-y-1 block">
          <span className="text-xs font-bold text-stone-800">Descrição & Dedicatória</span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={420}
            rows={3}
            placeholder="Conte a história dessa obra ou deixe uma dedicatória para a placa do museu..."
            className="w-full px-3 py-2 rounded-xl border border-stone-300 bg-white text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-600"
          />
        </label>

        {/* Frame Style + Date + Position */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <label className="space-y-1 block">
            <span className="text-xs font-bold text-stone-800">Moldura</span>
            <select
              value={frameStyle}
              onChange={(e) => setFrameStyle(e.target.value as GalleryFrameStyle)}
              className="w-full px-3 py-2 rounded-xl border border-stone-300 bg-white text-xs font-bold text-stone-900 cursor-pointer"
            >
              {(Object.keys(FRAME_STYLE_META) as GalleryFrameStyle[]).map((key) => (
                <option key={key} value={key}>
                  {FRAME_STYLE_META[key].label}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1 block">
            <span className="text-xs font-bold text-stone-800">Data / Ocasião (opcional)</span>
            <input
              type="text"
              value={occasionDate}
              onChange={(e) => setOccasionDate(e.target.value)}
              maxLength={24}
              placeholder="Ex: Novembro de 2026"
              className="w-full px-3 py-2 rounded-xl border border-stone-300 bg-white text-xs text-stone-900"
            />
          </label>
        </div>

        {!editingExhibit && (
          <label className="space-y-1 block">
            <span className="text-xs font-bold text-stone-800">Posição Inicial no Corredor</span>
            <select
              value={position}
              onChange={(e) => setPosition(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-xl border border-stone-300 bg-white text-xs font-bold text-stone-900 cursor-pointer"
            >
              {Array.from({ length: maxPositions }, (_, idx) => {
                const pos = idx + 1;
                const suffix =
                  pos === maxPositions
                    ? ' (Final do corredor)'
                    : pos === 1
                    ? ' (Entrada do museu)'
                    : '';
                return (
                  <option key={pos} value={pos}>
                    Posição #{pos}
                    {suffix}
                  </option>
                );
              })}
            </select>
          </label>
        )}

        {error && (
          <p
            role="alert"
            className="text-xs font-bold text-red-700 bg-red-50 border border-red-200 rounded-xl px-3 py-2"
          >
            {error}
          </p>
        )}

        <div className="pt-1 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-stone-300 bg-white hover:bg-stone-100 text-xs font-bold text-stone-800 cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={uploading}
            className="px-5 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 disabled:opacity-50 text-amber-200 text-xs font-bold cursor-pointer"
          >
            {editingExhibit ? 'Salvar Alterações' : 'Pendurar na Galeria'}
          </button>
        </div>
      </form>
    </div>,
    document.body
  );
};
