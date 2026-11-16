import { GalleryDriveFolderConfig } from '../types/game';
import { buildDriveImageViewUrl, buildDriveVideoPreviewUrl } from '../logic/gallery';

export const DEFAULT_GALLERY_DRIVE_FOLDER_NAME = 'Galeria do Casal — União dos Camaradas';
export const MAX_DRIVE_UPLOAD_BYTES = 250 * 1024 * 1024; // 250 MB

const DRIVE_FILES_API = 'https://www.googleapis.com/drive/v3/files';
const DRIVE_UPLOAD_API = 'https://www.googleapis.com/upload/drive/v3/files';

export interface DriveFileSummary {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  webViewLink?: string;
  webContentLink?: string;
  thumbnailLink?: string;
  trashed?: boolean;
}

export interface DriveUploadResult {
  fileId: string;
  folderId: string;
  name: string;
  mimeType: string;
  sizeBytes: number;
  webViewLink?: string;
  thumbnailLink?: string;
  imageUrl?: string;
  videoUrl?: string;
}

async function parseDriveError(res: Response, fallbackMsg: string): Promise<string> {
  try {
    const json = (await res.json()) as { error?: { message?: string } };
    if (json?.error?.message) return json.error.message;
  } catch {
    // ignore parse failure
  }
  return fallbackMsg;
}

export async function listAppManagedDriveFolders(
  accessToken: string
): Promise<GalleryDriveFolderConfig[]> {
  const q = encodeURIComponent(
    "mimeType = 'application/vnd.google-apps.folder' and trashed = false"
  );
  const fields = encodeURIComponent('files(id,name,webViewLink)');
  const res = await fetch(`${DRIVE_FILES_API}?q=${q}&fields=${fields}&orderBy=createdTime desc`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    throw new Error(await parseDriveError(res, 'Não foi possível listar pastas do Google Drive.'));
  }
  const data = (await res.json()) as { files?: DriveFileSummary[] };
  return (data.files || []).map((f) => ({
    folderId: f.id,
    folderName: f.name,
    webViewLink: f.webViewLink,
    updatedAt: Date.now(),
  }));
}

export async function createGalleryDriveFolder(
  accessToken: string,
  folderName: string,
  ownerEmail?: string
): Promise<GalleryDriveFolderConfig> {
  const cleanName = folderName.trim().slice(0, 100) || DEFAULT_GALLERY_DRIVE_FOLDER_NAME;
  const fields = encodeURIComponent('id,name,webViewLink');
  const res = await fetch(`${DRIVE_FILES_API}?fields=${fields}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: cleanName,
      mimeType: 'application/vnd.google-apps.folder',
    }),
  });
  if (!res.ok) {
    throw new Error(await parseDriveError(res, 'Não foi possível criar a pasta no Google Drive.'));
  }
  const created = (await res.json()) as DriveFileSummary;
  return {
    folderId: created.id,
    folderName: created.name,
    webViewLink: created.webViewLink,
    ownerEmail,
    updatedAt: Date.now(),
  };
}

export async function ensureGalleryDriveFolder(
  accessToken: string,
  existingFolder?: GalleryDriveFolderConfig | null,
  ownerEmail?: string
): Promise<GalleryDriveFolderConfig> {
  if (existingFolder?.folderId) {
    try {
      const fields = encodeURIComponent('id,name,webViewLink,trashed,mimeType');
      const res = await fetch(
        `${DRIVE_FILES_API}/${encodeURIComponent(existingFolder.folderId)}?fields=${fields}`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      if (res.ok) {
        const meta = (await res.json()) as DriveFileSummary;
        if (!meta.trashed && meta.mimeType === 'application/vnd.google-apps.folder') {
          return {
            folderId: meta.id,
            folderName: meta.name,
            webViewLink: meta.webViewLink || existingFolder.webViewLink,
            ownerEmail: existingFolder.ownerEmail || ownerEmail,
            updatedAt: Date.now(),
          };
        }
      }
    } catch {
      // fall through to search or create
    }
  }

  const folders = await listAppManagedDriveFolders(accessToken);
  const targetName = existingFolder?.folderName || DEFAULT_GALLERY_DRIVE_FOLDER_NAME;
  const matching = folders.find((f) => f.folderName === targetName) || folders[0];
  if (matching) {
    return {
      ...matching,
      ownerEmail: ownerEmail || matching.ownerEmail,
      updatedAt: Date.now(),
    };
  }

  return createGalleryDriveFolder(accessToken, targetName, ownerEmail);
}

export async function shareDriveFileWithAnyone(
  accessToken: string,
  fileId: string
): Promise<boolean> {
  try {
    const res = await fetch(
      `${DRIVE_FILES_API}/${encodeURIComponent(fileId)}/permissions`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          role: 'reader',
          type: 'anyone',
        }),
      }
    );
    return res.ok;
  } catch {
    return false;
  }
}

export async function uploadMediaToDriveFolder(params: {
  accessToken: string;
  folderId: string;
  file: File;
  shareWithLink?: boolean;
  onProgress?: (percent: number) => void;
}): Promise<DriveUploadResult> {
  const { accessToken, folderId, file, shareWithLink = true, onProgress } = params;

  if (file.size <= 0) {
    throw new Error('O arquivo selecionado está vazio.');
  }
  if (file.size > MAX_DRIVE_UPLOAD_BYTES) {
    throw new Error('O arquivo excede o limite de 250 MB para envio direto.');
  }

  const mimeType = file.type || 'application/octet-stream';
  const fields = encodeURIComponent('id,name,mimeType,size,webViewLink,thumbnailLink');

  // 1. Initiate Google Drive Resumable Upload session
  const initRes = await fetch(
    `${DRIVE_UPLOAD_API}?uploadType=resumable&fields=${fields}`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json; charset=UTF-8',
        'X-Upload-Content-Type': mimeType,
        'X-Upload-Content-Length': String(file.size),
      },
      body: JSON.stringify({
        name: file.name,
        parents: [folderId],
        mimeType,
      }),
    }
  );

  if (!initRes.ok) {
    throw new Error(
      await parseDriveError(initRes, 'Não foi possível iniciar o envio para o Google Drive.')
    );
  }

  const uploadUrl = initRes.headers.get('Location');
  if (!uploadUrl) {
    throw new Error('Google Drive não retornou o endereço de envio.');
  }

  // 2. Stream binary payload with progress feedback via XMLHttpRequest
  const uploadedMeta = await new Promise<DriveFileSummary>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', uploadUrl, true);
    xhr.setRequestHeader('Content-Type', mimeType);

    xhr.upload.onprogress = (ev) => {
      if (ev.lengthComputable && onProgress) {
        onProgress(Math.min(98, Math.round((ev.loaded / ev.total) * 100)));
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(JSON.parse(xhr.responseText) as DriveFileSummary);
        } catch {
          reject(new Error('Resposta inválida do Google Drive após envio.'));
        }
      } else {
        reject(new Error(`Falha ao enviar arquivo ao Google Drive (status ${xhr.status}).`));
      }
    };

    xhr.onerror = () => reject(new Error('Erro de rede ao enviar arquivo para o Google Drive.'));
    xhr.send(file);
  });

  if (shareWithLink) {
    await shareDriveFileWithAnyone(accessToken, uploadedMeta.id);
  }
  onProgress?.(100);

  const isVideo = mimeType.startsWith('video/');
  const isImage = mimeType.startsWith('image/');

  return {
    fileId: uploadedMeta.id,
    folderId,
    name: uploadedMeta.name,
    mimeType: uploadedMeta.mimeType || mimeType,
    sizeBytes: Number(uploadedMeta.size) || file.size,
    webViewLink: uploadedMeta.webViewLink,
    thumbnailLink: uploadedMeta.thumbnailLink,
    imageUrl: isImage
      ? buildDriveImageViewUrl(uploadedMeta.id)
      : uploadedMeta.thumbnailLink || undefined,
    videoUrl: isVideo ? buildDriveVideoPreviewUrl(uploadedMeta.id) : undefined,
  };
}

export async function fetchDriveFileBlobUrl(
  accessToken: string,
  fileId: string
): Promise<string> {
  const res = await fetch(
    `${DRIVE_FILES_API}/${encodeURIComponent(fileId)}?alt=media`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );
  if (!res.ok) {
    throw new Error(await parseDriveError(res, 'Não foi possível carregar o arquivo do Google Drive.'));
  }
  const blob = await res.blob();
  return URL.createObjectURL(blob);
}

export async function deleteDriveFile(
  accessToken: string,
  fileId: string
): Promise<void> {
  const res = await fetch(
    `${DRIVE_FILES_API}/${encodeURIComponent(fileId)}`,
    {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );
  // Ignore 404 (already deleted in Drive)
  if (!res.ok && res.status !== 404) {
    throw new Error(await parseDriveError(res, 'Não foi possível excluir o arquivo no Google Drive.'));
  }
}
