import {
  GalleryDriveFolderConfig,
  GalleryExhibit,
  GalleryExhibitKind,
  GalleryFrameStyle,
  GalleryMediaStorage,
  PlayerRole,
} from '../types/game';

export const MAX_GALLERY_ITEMS = 60;

export const FRAME_STYLE_META: Record<
  GalleryFrameStyle,
  { label: string; outerClass: string; borderHex: string; matHex: string }
> = {
  gold: {
    label: 'Dourada Clássica',
    outerClass: 'border-[#9a6b19] bg-gradient-to-br from-[#d9a94b] via-[#b88628] to-[#8a5d11]',
    borderHex: '#9a6b19',
    matHex: '#fbf8f1',
  },
  oak: {
    label: 'Carvalho Escuro',
    outerClass: 'border-[#3d2516] bg-gradient-to-br from-[#6b442a] via-[#51311d] to-[#372011]',
    borderHex: '#3d2516',
    matHex: '#f8f4ea',
  },
  modern: {
    label: 'Galeria Moderna',
    outerClass: 'border-[#1c1917] bg-[#292524]',
    borderHex: '#1c1917',
    matHex: '#ffffff',
  },
  crimson: {
    label: 'Carmim Imperial',
    outerClass: 'border-[#4c0f0f] bg-gradient-to-br from-[#991b1b] via-[#7f1d1d] to-[#571010]',
    borderHex: '#4c0f0f',
    matHex: '#fcf7ee',
  },
};

export function normalizeExhibitUrl(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (/^(javascript|vbscript|data|file):/i.test(trimmed)) return null;

  const candidate = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const parsed = new URL(candidate);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
    if (!parsed.hostname || !parsed.hostname.includes('.')) return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

export function extractGoogleDriveFileId(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  // Raw ID check (Drive IDs are typically 25-60 alphanumeric/-/_ chars, only if no slashes/spaces)
  if (/^[a-zA-Z0-9_-]{20,80}$/.test(trimmed) && !trimmed.includes('.')) {
    return trimmed;
  }
  try {
    const parsed = new URL(/^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`);
    if (!parsed.hostname.endsWith('google.com')) return null;
    const matchPath = parsed.pathname.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (matchPath?.[1]) return matchPath[1];
    const qId = parsed.searchParams.get('id');
    if (qId && /^[a-zA-Z0-9_-]{10,80}$/.test(qId)) return qId;
    return null;
  } catch {
    return null;
  }
}

export function buildDriveImageViewUrl(fileId: string): string {
  return `https://drive.google.com/thumbnail?id=${encodeURIComponent(fileId)}&sz=w1600`;
}

export function buildDriveVideoPreviewUrl(fileId: string): string {
  return `https://drive.google.com/file/d/${encodeURIComponent(fileId)}/preview`;
}

export function normalizeImageSource(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (/^data:image\/(png|jpeg|jpg|webp|gif);base64,[a-z0-9+/=]+$/i.test(trimmed)) {
    return trimmed.length <= 450_000 ? trimmed : null;
  }
  if (trimmed.startsWith('/assets/') && !trimmed.includes('..')) {
    return trimmed;
  }
  const driveId = extractGoogleDriveFileId(trimmed);
  if (driveId && /drive\.google\.com/i.test(trimmed)) {
    return buildDriveImageViewUrl(driveId);
  }
  return normalizeExhibitUrl(trimmed);
}

export function normalizeVideoSource(raw: string): {
  videoUrl: string;
  driveFileId?: string;
  embedUrl?: string;
} | null {
  const cleanUrl = normalizeExhibitUrl(raw);
  if (!cleanUrl) return null;

  try {
    const parsed = new URL(cleanUrl);
    const host = parsed.hostname.toLowerCase();

    // Google Drive video links
    if (host === 'drive.google.com') {
      const driveId = extractGoogleDriveFileId(cleanUrl);
      if (driveId) {
        return {
          videoUrl: buildDriveVideoPreviewUrl(driveId),
          driveFileId: driveId,
          embedUrl: buildDriveVideoPreviewUrl(driveId),
        };
      }
    }

    // YouTube -> embed URL
    if (host === 'youtu.be' || host.endsWith('youtube.com')) {
      let vidId = '';
      if (host === 'youtu.be') {
        vidId = parsed.pathname.replace(/^\/+/, '').split('/')[0] || '';
      } else if (parsed.pathname.startsWith('/shorts/')) {
        vidId = parsed.pathname.split('/')[2] || '';
      } else if (parsed.pathname.startsWith('/embed/')) {
        vidId = parsed.pathname.split('/')[2] || '';
      } else {
        vidId = parsed.searchParams.get('v') || '';
      }
      if (/^[a-zA-Z0-9_-]{6,20}$/.test(vidId)) {
        const embed = `https://www.youtube.com/embed/${vidId}`;
        return { videoUrl: embed, embedUrl: embed };
      }
    }

    // Vimeo -> embed URL
    if (host === 'vimeo.com' || host.endsWith('.vimeo.com')) {
      const match = parsed.pathname.match(/\/(\d+)/);
      if (match?.[1]) {
        const embed = `https://player.vimeo.com/video/${match[1]}`;
        return { videoUrl: embed, embedUrl: embed };
      }
    }

    return { videoUrl: cleanUrl };
  } catch {
    return null;
  }
}

export function isDirectHtmlVideoUrl(url?: string): boolean {
  if (!url) return false;
  if (url.startsWith('blob:')) return true;
  return /\.(mp4|webm|mov|m4v|ogv|ogg)(\?|#|$)/i.test(url);
}

export function formatFileSize(bytes?: number): string {
  if (!bytes || !Number.isFinite(bytes) || bytes <= 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1).replace('.', ',')} MB`;
}

export function extractDomainLabel(url?: string): string {
  if (!url) return '';
  try {
    const u = new URL(url);
    return u.hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

export interface GalleryExhibitDraft {
  kind: GalleryExhibitKind;
  title: string;
  description: string;
  url?: string;
  imageUrl?: string;
  videoUrl?: string;
  driveFileId?: string;
  driveFolderId?: string;
  mimeType?: string;
  fileSizeBytes?: number;
  storage?: GalleryMediaStorage;
  frameStyle: GalleryFrameStyle;
  occasionDate?: string;
  addedBy: PlayerRole;
  authorName: string;
}

export function validateGalleryExhibitInput(
  draft: GalleryExhibitDraft
): { ok: true; value: Omit<GalleryExhibit, 'id' | 'createdAt'> } | { ok: false; error: string } {
  const title = draft.title.trim().slice(0, 80);
  if (title.length < 2) {
    return { ok: false, error: 'Dê um título com pelo menos 2 caracteres para a obra.' };
  }

  const description = draft.description.trim().slice(0, 420);
  if (description.length < 3) {
    return { ok: false, error: 'Escreva uma breve descrição ou dedicatória para a placa.' };
  }

  const frameStyle: GalleryFrameStyle =
    draft.frameStyle in FRAME_STYLE_META ? draft.frameStyle : 'gold';

  const occasionDate = (draft.occasionDate || '').trim().slice(0, 24) || undefined;
  const authorName = draft.authorName.trim().slice(0, 32) || 'Curador';

  const cleanDriveFileId = draft.driveFileId?.trim().slice(0, 128) || undefined;
  const cleanDriveFolderId = draft.driveFolderId?.trim().slice(0, 128) || undefined;
  const cleanMimeType = draft.mimeType?.trim().slice(0, 96) || undefined;
  const cleanFileSize =
    typeof draft.fileSizeBytes === 'number' && Number.isFinite(draft.fileSizeBytes) && draft.fileSizeBytes > 0
      ? Math.floor(draft.fileSizeBytes)
      : undefined;

  if (draft.kind === 'site') {
    const cleanUrl = normalizeExhibitUrl(draft.url || '');
    if (!cleanUrl) {
      return {
        ok: false,
        error: 'Informe um endereço válido para o site (ex: https://meu-site.vercel.app).',
      };
    }
    const cleanCover = draft.imageUrl?.trim() ? normalizeImageSource(draft.imageUrl) : undefined;
    if (draft.imageUrl?.trim() && !cleanCover) {
      return {
        ok: false,
        error: 'A imagem de capa informada é inválida ou grande demais.',
      };
    }
    const storage: GalleryMediaStorage | undefined = cleanDriveFileId
      ? 'drive'
      : cleanCover?.startsWith('data:image/')
      ? 'inline'
      : cleanCover
      ? 'url'
      : undefined;

    return {
      ok: true,
      value: {
        kind: 'site',
        title,
        description,
        url: cleanUrl,
        imageUrl: cleanCover || undefined,
        driveFileId: cleanDriveFileId,
        driveFolderId: cleanDriveFolderId,
        mimeType: cleanMimeType,
        fileSizeBytes: cleanFileSize,
        storage,
        frameStyle,
        occasionDate,
        addedBy: draft.addedBy,
        authorName,
      },
    };
  }

  if (draft.kind === 'video') {
    const parsedVideo = normalizeVideoSource(draft.videoUrl || '');
    const resolvedVideoUrl =
      parsedVideo?.videoUrl || (cleanDriveFileId ? buildDriveVideoPreviewUrl(cleanDriveFileId) : '');
    if (!resolvedVideoUrl) {
      return {
        ok: false,
        error: 'Envie um vídeo para o Google Drive ou cole um link válido de vídeo (Drive, YouTube, MP4).',
      };
    }
    const finalDriveId = cleanDriveFileId || parsedVideo?.driveFileId;
    const cleanPoster = draft.imageUrl?.trim() ? normalizeImageSource(draft.imageUrl) : undefined;
    const cleanShareUrl = draft.url?.trim() ? normalizeExhibitUrl(draft.url) || undefined : undefined;
    return {
      ok: true,
      value: {
        kind: 'video',
        title,
        description,
        videoUrl: resolvedVideoUrl,
        url: cleanShareUrl,
        imageUrl: cleanPoster || undefined,
        driveFileId: finalDriveId,
        driveFolderId: cleanDriveFolderId,
        mimeType: cleanMimeType,
        fileSizeBytes: cleanFileSize,
        storage: finalDriveId ? 'drive' : 'url',
        frameStyle,
        occasionDate,
        addedBy: draft.addedBy,
        authorName,
      },
    };
  }

  const cleanImage = normalizeImageSource(draft.imageUrl || '');
  const fallbackDriveImage =
    !cleanImage && cleanDriveFileId ? buildDriveImageViewUrl(cleanDriveFileId) : null;
  const finalImage = cleanImage || fallbackDriveImage;

  if (!finalImage) {
    return {
      ok: false,
      error: 'Envie uma foto para o Google Drive, do aparelho ou cole um link válido de imagem.',
    };
  }

  const finalDriveId = cleanDriveFileId || extractGoogleDriveFileId(finalImage) || undefined;
  const storage: GalleryMediaStorage = finalDriveId
    ? 'drive'
    : finalImage.startsWith('data:image/')
    ? 'inline'
    : 'url';

  return {
    ok: true,
    value: {
      kind: 'image',
      title,
      description,
      imageUrl: finalImage,
      url: draft.url?.trim() ? normalizeExhibitUrl(draft.url) || undefined : undefined,
      driveFileId: finalDriveId,
      driveFolderId: cleanDriveFolderId,
      mimeType: cleanMimeType,
      fileSizeBytes: cleanFileSize,
      storage,
      frameStyle,
      occasionDate,
      addedBy: draft.addedBy,
      authorName,
    },
  };
}

export function addGalleryExhibit(
  list: GalleryExhibit[],
  exhibitInput: Omit<GalleryExhibit, 'id' | 'createdAt'>,
  oneBasedPosition?: number
): GalleryExhibit[] {
  const nextItem: GalleryExhibit = {
    ...exhibitInput,
    id: `exh_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    createdAt: Date.now(),
  };

  const base = list.slice(0, MAX_GALLERY_ITEMS - 1);
  if (typeof oneBasedPosition !== 'number' || Number.isNaN(oneBasedPosition)) {
    return [...base, nextItem];
  }
  const idx = Math.max(0, Math.min(base.length, Math.round(oneBasedPosition) - 1));
  const copy = [...base];
  copy.splice(idx, 0, nextItem);
  return copy;
}

export function updateGalleryExhibit(
  list: GalleryExhibit[],
  id: string,
  patch: Partial<Omit<GalleryExhibit, 'id' | 'createdAt'>>
): GalleryExhibit[] {
  return list.map((item) => (item.id === id ? { ...item, ...patch } : item));
}

export function moveGalleryExhibit(
  list: GalleryExhibit[],
  id: string,
  direction: 'left' | 'right'
): GalleryExhibit[] {
  const idx = list.findIndex((item) => item.id === id);
  if (idx === -1) return list;
  const targetIdx = direction === 'left' ? idx - 1 : idx + 1;
  if (targetIdx < 0 || targetIdx >= list.length) return list;
  const copy = [...list];
  const [removed] = copy.splice(idx, 1);
  copy.splice(targetIdx, 0, removed);
  return copy;
}

export function moveGalleryExhibitToPosition(
  list: GalleryExhibit[],
  id: string,
  oneBasedPosition: number
): GalleryExhibit[] {
  const idx = list.findIndex((item) => item.id === id);
  if (idx === -1) return list;
  const clampedTarget = Math.max(0, Math.min(list.length - 1, Math.round(oneBasedPosition) - 1));
  if (clampedTarget === idx) return list;
  const copy = [...list];
  const [removed] = copy.splice(idx, 1);
  copy.splice(clampedTarget, 0, removed);
  return copy;
}

export function removeGalleryExhibit(list: GalleryExhibit[], id: string): GalleryExhibit[] {
  return list.filter((item) => item.id !== id);
}

export function sanitizeGalleryDriveFolder(raw: unknown): GalleryDriveFolderConfig | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Partial<GalleryDriveFolderConfig>;
  const folderId = typeof obj.folderId === 'string' ? obj.folderId.trim().slice(0, 128) : '';
  const folderName = typeof obj.folderName === 'string' ? obj.folderName.trim().slice(0, 100) : '';
  if (!folderId || !folderName) return null;
  const webViewLink =
    typeof obj.webViewLink === 'string' ? normalizeExhibitUrl(obj.webViewLink) || undefined : undefined;
  const ownerEmail =
    typeof obj.ownerEmail === 'string' ? obj.ownerEmail.trim().slice(0, 120) || undefined : undefined;
  return {
    folderId,
    folderName,
    webViewLink,
    ownerEmail,
    updatedAt: typeof obj.updatedAt === 'number' && Number.isFinite(obj.updatedAt) ? obj.updatedAt : Date.now(),
  };
}

export function sanitizeGalleryItems(raw: unknown): GalleryExhibit[] {
  if (!Array.isArray(raw)) return getDefaultStarterExhibits();
  const valid: GalleryExhibit[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const obj = item as Partial<GalleryExhibit>;
    if (typeof obj.id !== 'string' || typeof obj.title !== 'string') continue;
    const kind: GalleryExhibitKind =
      obj.kind === 'site' ? 'site' : obj.kind === 'video' ? 'video' : 'image';
    const frameStyle: GalleryFrameStyle =
      obj.frameStyle && obj.frameStyle in FRAME_STYLE_META ? obj.frameStyle : 'gold';
    const storage: GalleryMediaStorage | undefined =
      obj.storage === 'drive' || obj.storage === 'url' || obj.storage === 'inline'
        ? obj.storage
        : undefined;
    valid.push({
      id: obj.id,
      kind,
      title: obj.title.slice(0, 80),
      description: String(obj.description || '').slice(0, 420),
      url: typeof obj.url === 'string' ? obj.url : undefined,
      imageUrl: typeof obj.imageUrl === 'string' ? obj.imageUrl : undefined,
      videoUrl: typeof obj.videoUrl === 'string' ? obj.videoUrl : undefined,
      driveFileId: typeof obj.driveFileId === 'string' ? obj.driveFileId.slice(0, 128) : undefined,
      driveFolderId: typeof obj.driveFolderId === 'string' ? obj.driveFolderId.slice(0, 128) : undefined,
      mimeType: typeof obj.mimeType === 'string' ? obj.mimeType.slice(0, 96) : undefined,
      fileSizeBytes:
        typeof obj.fileSizeBytes === 'number' && Number.isFinite(obj.fileSizeBytes) && obj.fileSizeBytes > 0
          ? Math.floor(obj.fileSizeBytes)
          : undefined,
      storage,
      frameStyle,
      addedBy: obj.addedBy === 'cat2' ? 'cat2' : 'cat1',
      authorName: String(obj.authorName || 'Curador').slice(0, 32),
      occasionDate: typeof obj.occasionDate === 'string' ? obj.occasionDate.slice(0, 24) : undefined,
      createdAt: typeof obj.createdAt === 'number' ? obj.createdAt : Date.now(),
      isStarter: Boolean(obj.isStarter),
    });
    if (valid.length >= MAX_GALLERY_ITEMS) break;
  }
  return valid;
}

export function getDefaultStarterExhibits(): GalleryExhibit[] {
  return [
    {
      id: 'starter_wing_1',
      kind: 'site',
      title: 'Ala dos Sites Românticos',
      description:
        'Espaço dedicado aos sites e presentes interativos criados com carinho para você. Edite esta obra ou adicione os seus próprios links no final do corredor!',
      url: 'https://example.com',
      frameStyle: 'gold',
      addedBy: 'cat1',
      authorName: 'Curadoria do Museu',
      occasionDate: 'Acervo Inicial',
      createdAt: 1700000001000,
      isStarter: true,
    },
    {
      id: 'starter_wing_2',
      kind: 'image',
      title: 'Moldura de Lembranças',
      description:
        'Guarde fotos e vídeos especiais no Google Drive do casal ou cole links com legendas personalizadas na ordem em que nossa história aconteceu.',
      frameStyle: 'crimson',
      addedBy: 'cat2',
      authorName: 'Curadoria do Museu',
      occasionDate: 'Acervo Inicial',
      createdAt: 1700000002000,
      isStarter: true,
    },
  ];
}
