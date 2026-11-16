import test from 'node:test';
import assert from 'node:assert/strict';
import {
  addGalleryExhibit,
  buildDriveImageViewUrl,
  buildDriveVideoPreviewUrl,
  extractDomainLabel,
  extractGoogleDriveFileId,
  formatFileSize,
  getDefaultStarterExhibits,
  isDirectHtmlVideoUrl,
  moveGalleryExhibit,
  moveGalleryExhibitToPosition,
  normalizeExhibitUrl,
  normalizeImageSource,
  normalizeVideoSource,
  removeGalleryExhibit,
  sanitizeGalleryDriveFolder,
  sanitizeGalleryItems,
  updateGalleryExhibit,
  validateGalleryExhibitInput,
} from './gallery';

test('normalizeExhibitUrl accepts valid URLs, adds https, and blocks unsafe schemes', () => {
  assert.equal(normalizeExhibitUrl('meusite.vercel.app'), 'https://meusite.vercel.app/');
  assert.equal(
    normalizeExhibitUrl('https://amor-nosso.netlify.app/carta'),
    'https://amor-nosso.netlify.app/carta'
  );
  assert.equal(normalizeExhibitUrl('javascript:alert(1)'), null);
  assert.equal(normalizeExhibitUrl('data:text/html,<script>'), null);
  assert.equal(normalizeExhibitUrl('not-a-domain'), null);
});

test('normalizeImageSource accepts data:image base64, local /assets, Drive links, and valid URLs', () => {
  assert.equal(
    normalizeImageSource('data:image/png;base64,iVBORw0KGgo='),
    'data:image/png;base64,iVBORw0KGgo='
  );
  assert.equal(normalizeImageSource('/assets/foto.png'), '/assets/foto.png');
  assert.equal(normalizeImageSource('/assets/../secret'), null);
  assert.equal(normalizeImageSource('javascript:void(0)'), null);
  assert.equal(
    normalizeImageSource('https://drive.google.com/file/d/1AbCdEfGhIjKlMnOpQrStUvWxYz/view?usp=sharing'),
    buildDriveImageViewUrl('1AbCdEfGhIjKlMnOpQrStUvWxYz')
  );
});

test('extractGoogleDriveFileId and normalizeVideoSource handle Drive, YouTube, Vimeo, and MP4 URLs', () => {
  assert.equal(
    extractGoogleDriveFileId('https://drive.google.com/file/d/1XyZ_9876543210AbCdEf/view'),
    '1XyZ_9876543210AbCdEf'
  );
  assert.equal(
    extractGoogleDriveFileId('https://drive.google.com/open?id=1XyZ_9876543210AbCdEf'),
    '1XyZ_9876543210AbCdEf'
  );

  const driveVideo = normalizeVideoSource(
    'https://drive.google.com/file/d/1XyZ_9876543210AbCdEf/view'
  );
  assert.deepEqual(driveVideo, {
    videoUrl: buildDriveVideoPreviewUrl('1XyZ_9876543210AbCdEf'),
    driveFileId: '1XyZ_9876543210AbCdEf',
    embedUrl: buildDriveVideoPreviewUrl('1XyZ_9876543210AbCdEf'),
  });

  const ytShort = normalizeVideoSource('https://youtu.be/dQw4w9WgXcQ');
  assert.equal(ytShort?.videoUrl, 'https://www.youtube.com/embed/dQw4w9WgXcQ');

  const vimeo = normalizeVideoSource('https://vimeo.com/123456789');
  assert.equal(vimeo?.videoUrl, 'https://player.vimeo.com/video/123456789');

  assert.equal(isDirectHtmlVideoUrl('https://cdn.example.com/clip.mp4?token=1'), true);
  assert.equal(isDirectHtmlVideoUrl('blob:https://app.example.com/123'), true);
  assert.equal(isDirectHtmlVideoUrl('https://www.youtube.com/embed/dQw4w9WgXcQ'), false);
});

test('validateGalleryExhibitInput validates sites, images, and videos with Drive metadata', () => {
  const badSite = validateGalleryExhibitInput({
    kind: 'site',
    title: 'Nosso Site',
    description: 'Presente especial',
    url: 'invalid',
    frameStyle: 'gold',
    addedBy: 'cat1',
    authorName: 'João',
  });
  assert.equal(badSite.ok, false);

  const okSite = validateGalleryExhibitInput({
    kind: 'site',
    title: 'Carta Estelar',
    description: 'Um site com constelações que fiz para você.',
    url: 'carta-estelar.vercel.app',
    frameStyle: 'crimson',
    addedBy: 'cat1',
    authorName: 'João',
    occasionDate: '12/06/2026',
  });
  assert.equal(okSite.ok, true);
  if (okSite.ok) {
    assert.equal(okSite.value.url, 'https://carta-estelar.vercel.app/');
    assert.equal(extractDomainLabel(okSite.value.url), 'carta-estelar.vercel.app');
  }

  const okDriveVideo = validateGalleryExhibitInput({
    kind: 'video',
    title: 'Nosso Vídeo na Praia',
    description: 'Memória gravada no celular e guardada no Google Drive.',
    driveFileId: '1DriveVideoId_1234567890',
    driveFolderId: '1DriveFolderId_9999',
    mimeType: 'video/mp4',
    fileSizeBytes: 15_728_640,
    frameStyle: 'modern',
    addedBy: 'cat2',
    authorName: 'Maria',
  });
  assert.equal(okDriveVideo.ok, true);
  if (okDriveVideo.ok) {
    assert.equal(okDriveVideo.value.kind, 'video');
    assert.equal(okDriveVideo.value.storage, 'drive');
    assert.equal(
      okDriveVideo.value.videoUrl,
      buildDriveVideoPreviewUrl('1DriveVideoId_1234567890')
    );
    assert.equal(okDriveVideo.value.fileSizeBytes, 15_728_640);
  }
});

test('sanitizeGalleryItems and sanitizeGalleryDriveFolder preserve Drive metadata', () => {
  const folder = sanitizeGalleryDriveFolder({
    folderId: 'folder_abc_123',
    folderName: 'Galeria do Casal',
    webViewLink: 'https://drive.google.com/drive/folders/folder_abc_123',
    ownerEmail: 'casal@example.com',
  });
  assert.equal(folder?.folderId, 'folder_abc_123');
  assert.equal(folder?.folderName, 'Galeria do Casal');
  assert.equal(sanitizeGalleryDriveFolder({ folderId: '' }), null);

  const items = sanitizeGalleryItems([
    {
      id: 'exh_video_1',
      kind: 'video',
      title: 'Dança na Cozinha',
      description: 'Vídeo salvo no Google Drive',
      videoUrl: buildDriveVideoPreviewUrl('1VidId'),
      driveFileId: '1VidId',
      driveFolderId: 'folder_abc_123',
      mimeType: 'video/mp4',
      fileSizeBytes: 5_242_880,
      storage: 'drive',
      frameStyle: 'gold',
      addedBy: 'cat1',
      authorName: 'Ademir',
      createdAt: 1700000000000,
    },
  ]);
  assert.equal(items.length, 1);
  assert.equal(items[0].kind, 'video');
  assert.equal(items[0].driveFileId, '1VidId');
  assert.equal(items[0].storage, 'drive');
  assert.equal(formatFileSize(items[0].fileSizeBytes), '5,0 MB');
});

test('addGalleryExhibit, moveGalleryExhibit, moveGalleryExhibitToPosition, update, and remove work accurately', () => {
  let list = getDefaultStarterExhibits();
  assert.equal(list.length, 2);

  list = addGalleryExhibit(list, {
    kind: 'site',
    title: 'Obra Terceira',
    description: 'Adicionada no final',
    url: 'https://terceira.example.com',
    frameStyle: 'oak',
    addedBy: 'cat1',
    authorName: 'Admin',
  });
  assert.equal(list.length, 3);
  assert.equal(list[2].title, 'Obra Terceira');

  const addedId = list[2].id;
  list = moveGalleryExhibit(list, addedId, 'left');
  assert.equal(list[1].id, addedId);

  list = moveGalleryExhibitToPosition(list, addedId, 1);
  assert.equal(list[0].id, addedId);

  list = updateGalleryExhibit(list, addedId, { title: 'Obra Renomeada' });
  assert.equal(list[0].title, 'Obra Renomeada');

  list = removeGalleryExhibit(list, addedId);
  assert.equal(list.length, 2);
});
