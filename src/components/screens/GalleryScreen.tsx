import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpDown,
  Check,
  Compass,
  ExternalLink,
  FolderOpen,
  FolderPlus,
  HardDrive,
  Plus,
  RefreshCw,
} from 'lucide-react';
import {
  GalleryDriveFolderConfig,
  GalleryExhibit,
  PlayerRole,
  SharedState,
} from '../../types/game';
import {
  addGalleryExhibit,
  getDefaultStarterExhibits,
  moveGalleryExhibit,
  moveGalleryExhibitToPosition,
  removeGalleryExhibit,
  updateGalleryExhibit,
} from '../../logic/gallery';
import {
  auth,
  connectGoogleDriveWithPopup,
  getDriveAccessToken,
  isFirebaseConfigured,
  subscribeFirebaseConfig,
} from '../../lib/firebase';
import {
  createGalleryDriveFolder,
  DEFAULT_GALLERY_DRIVE_FOLDER_NAME,
  deleteDriveFile,
  ensureGalleryDriveFolder,
  listAppManagedDriveFolders,
} from '../../lib/googleDrive';
import { sfx } from '../../utils/sound';
import { CatSvg } from '../CatSvg';
import { GalleryArtworkCard } from '../gallery/GalleryArtworkCard';
import {
  GalleryEditorModal,
  GalleryInspectorModal,
  GoogleLogoSvg,
} from '../gallery/GalleryModals';

interface GalleryScreenProps {
  state: SharedState;
  myRole: PlayerRole;
  isActiveTab: boolean;
  onUpdateGallery: (nextItems: GalleryExhibit[]) => void;
  onUpdateDriveFolder: (folder: GalleryDriveFolderConfig | null) => void;
  onToast: (msg: string) => void;
}

export const GalleryScreen: React.FC<GalleryScreenProps> = ({
  state,
  myRole,
  isActiveTab,
  onUpdateGallery,
  onUpdateDriveFolder,
  onToast,
}) => {
  const exhibits = useMemo(
    () =>
      Array.isArray(state.galleryItems)
        ? state.galleryItems
        : getDefaultStarterExhibits(),
    [state.galleryItems]
  );

  const driveFolder = state.galleryDriveFolder || null;

  // Corridor position: 0..exhibits.length-1 are hung works; exhibits.length is the end-of-corridor Add Pedestal
  const [focusSlot, setFocusSlot] = useState<number>(0);
  const [facingLeft, setFacingLeft] = useState<boolean>(false);
  const [walkerX, setWalkerX] = useState<number>(156);
  const [reorderMode, setReorderMode] = useState<boolean>(false);
  const [inspectorIndex, setInspectorIndex] = useState<number | null>(null);
  const [editorState, setEditorState] = useState<{
    open: boolean;
    editing: GalleryExhibit | null;
  }>({ open: false, editing: null });

  // Google Drive integration state
  const [driveToken, setDriveToken] = useState<string | null>(() => getDriveAccessToken());
  const [connectingDrive, setConnectingDrive] = useState(false);
  const [folderManagerOpen, setFolderManagerOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState(DEFAULT_GALLERY_DRIVE_FOLDER_NAME);
  const [appFolders, setAppFolders] = useState<GalleryDriveFolderConfig[]>([]);
  const [loadingFolders, setLoadingFolders] = useState(false);
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [confirmUnlinkFolder, setConfirmUnlinkFolder] = useState(false);

  const corridorRef = useRef<HTMLDivElement | null>(null);
  const totalSlots = exhibits.length + 1;

  const [firebaseReady, setFirebaseReady] = useState<boolean>(() =>
    isFirebaseConfigured()
  );

  useEffect(() => {
    return subscribeFirebaseConfig(() => {
      setFirebaseReady(isFirebaseConfigured());
    });
  }, []);

  useEffect(() => {
    setDriveToken(getDriveAccessToken());
  }, [isActiveTab]);

  useEffect(() => {
    if (!firebaseReady || !auth) return;
    const unsub = onAuthStateChanged(auth, () => {
      setDriveToken(getDriveAccessToken());
    });
    return () => unsub();
  }, [firebaseReady]);

  const updateWalkerPosition = useCallback((slot: number) => {
    const container = corridorRef.current;
    if (!container) return;
    const el = container.querySelector<HTMLElement>(`[data-corridor-slot="${slot}"]`);
    if (el) {
      setWalkerX(el.offsetLeft + el.offsetWidth / 2);
    }
  }, []);

  useEffect(() => {
    setFocusSlot((prev) => Math.max(0, Math.min(exhibits.length, prev)));
  }, [exhibits.length]);

  useEffect(() => {
    updateWalkerPosition(focusSlot);
    const onResize = () => updateWalkerPosition(focusSlot);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [focusSlot, exhibits.length, isActiveTab, updateWalkerPosition]);

  const scrollToSlot = useCallback((slot: number) => {
    const container = corridorRef.current;
    if (!container) return;
    const el = container.querySelector<HTMLElement>(`[data-corridor-slot="${slot}"]`);
    if (el) {
      const targetLeft = el.offsetLeft + el.offsetWidth / 2 - container.clientWidth / 2;
      const maxLeft = Math.max(0, container.scrollWidth - container.clientWidth);
      container.scrollTo({
        left: Math.max(0, Math.min(maxLeft, targetLeft)),
        behavior: 'smooth',
      });
    }
  }, []);

  const walkToSlot = useCallback(
    (nextSlot: number) => {
      const clamped = Math.max(0, Math.min(exhibits.length, nextSlot));
      if (clamped !== focusSlot) {
        setFacingLeft(clamped < focusSlot);
        sfx.step();
      }
      setFocusSlot(clamped);
      updateWalkerPosition(clamped);
      scrollToSlot(clamped);
    },
    [exhibits.length, focusSlot, scrollToSlot, updateWalkerPosition]
  );

  // Keyboard walking along the museum corridor (Left/Right or A/D, Enter to inspect or add)
  useEffect(() => {
    if (!isActiveTab || inspectorIndex !== null || editorState.open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      if (e.key === 'ArrowRight' || e.key.toLowerCase() === 'd') {
        e.preventDefault();
        walkToSlot(focusSlot + 1);
      } else if (e.key === 'ArrowLeft' || e.key.toLowerCase() === 'a') {
        e.preventDefault();
        walkToSlot(focusSlot - 1);
      } else if (e.key === 'Enter') {
        if (focusSlot < exhibits.length) {
          setInspectorIndex(focusSlot);
          sfx.select();
        } else {
          setEditorState({ open: true, editing: null });
          sfx.select();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    isActiveTab,
    inspectorIndex,
    editorState.open,
    focusSlot,
    exhibits.length,
    walkToSlot,
  ]);

  const myNick = state.nicknames[myRole] || (myRole === 'cat1' ? 'Camarada 1' : 'Camarada 2');
  const myCat = state[myRole];
  const inspectedExhibit =
    inspectorIndex !== null && exhibits[inspectorIndex] ? exhibits[inspectorIndex] : null;

  const handleConnectDrive = useCallback(async (): Promise<string | null> => {
    setConnectingDrive(true);
    try {
      const { user, accessToken } = await connectGoogleDriveWithPopup();
      setDriveToken(accessToken);
      if (!driveFolder) {
        const folder = await ensureGalleryDriveFolder(
          accessToken,
          null,
          user.email || undefined
        );
        onUpdateDriveFolder(folder);
        onToast(`Google Drive conectado e pasta "${folder.folderName}" vinculada!`);
      } else {
        onToast('Google Drive conectado para esta sessão!');
      }
      return accessToken;
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'Não foi possível conectar ao Google Drive.';
      onToast(msg);
      return null;
    } finally {
      setConnectingDrive(false);
    }
  }, [driveFolder, onToast, onUpdateDriveFolder]);

  const handleEnsureFolder = useCallback(
    async (token: string): Promise<GalleryDriveFolderConfig> => {
      const folder = await ensureGalleryDriveFolder(
        token,
        driveFolder,
        auth.currentUser?.email || undefined
      );
      if (!driveFolder || driveFolder.folderId !== folder.folderId) {
        onUpdateDriveFolder(folder);
      }
      return folder;
    },
    [driveFolder, onUpdateDriveFolder]
  );

  const handleLoadFolders = async () => {
    setLoadingFolders(true);
    try {
      const token = driveToken || (await handleConnectDrive());
      if (!token) return;
      const list = await listAppManagedDriveFolders(token);
      setAppFolders(list);
    } catch (err) {
      onToast(err instanceof Error ? err.message : 'Erro ao listar pastas do Drive.');
    } finally {
      setLoadingFolders(false);
    }
  };

  const handleCreateCustomFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreatingFolder(true);
    try {
      const token = driveToken || (await handleConnectDrive());
      if (!token) return;
      const created = await createGalleryDriveFolder(
        token,
        newFolderName,
        auth.currentUser?.email || undefined
      );
      onUpdateDriveFolder(created);
      setAppFolders((prev) => [created, ...prev.filter((f) => f.folderId !== created.folderId)]);
      onToast(`Pasta "${created.folderName}" criada e vinculada no Drive!`);
      setFolderManagerOpen(false);
    } catch (err) {
      onToast(err instanceof Error ? err.message : 'Não foi possível criar a pasta no Drive.');
    } finally {
      setCreatingFolder(false);
    }
  };

  const handleSaveExhibit = (
    validated: Omit<GalleryExhibit, 'id' | 'createdAt'>,
    targetPosition: number
  ) => {
    if (editorState.editing) {
      const next = updateGalleryExhibit(exhibits, editorState.editing.id, {
        ...validated,
        isStarter: false,
      });
      onUpdateGallery(next);
      onToast(`Obra "${validated.title}" atualizada no museu.`);
    } else {
      const next = addGalleryExhibit(exhibits, validated, targetPosition);
      onUpdateGallery(next);
      const insertedIdx = Math.max(0, Math.min(next.length - 1, targetPosition - 1));
      setFocusSlot(insertedIdx);
      window.setTimeout(() => scrollToSlot(insertedIdx), 80);
      onToast(`"${validated.title}" pendurada na posição #${insertedIdx + 1}!`);
    }
    sfx.curate();
    setEditorState({ open: false, editing: null });
  };

  const handleMove = (id: string, dir: 'left' | 'right') => {
    const curIdx = exhibits.findIndex((x) => x.id === id);
    const next = moveGalleryExhibit(exhibits, id, dir);
    onUpdateGallery(next);
    const nextIdx = next.findIndex((x) => x.id === id);
    if (nextIdx !== -1 && nextIdx !== curIdx) {
      setFocusSlot(nextIdx);
      if (inspectorIndex !== null) setInspectorIndex(nextIdx);
      sfx.select();
    }
  };

  const handleMoveToPos = (id: string, targetPos: number) => {
    const next = moveGalleryExhibitToPosition(exhibits, id, targetPos);
    onUpdateGallery(next);
    const nextIdx = next.findIndex((x) => x.id === id);
    if (nextIdx !== -1) {
      setFocusSlot(nextIdx);
      scrollToSlot(nextIdx);
      sfx.select();
    }
  };

  const handleDelete = async (
    exhibit: GalleryExhibit,
    alsoDeleteFromDrive: boolean
  ) => {
    let driveDeleted = false;
    if (alsoDeleteFromDrive && exhibit.driveFileId) {
      try {
        const token = driveToken || (await handleConnectDrive());
        if (!token) return;
        await deleteDriveFile(token, exhibit.driveFileId);
        driveDeleted = true;
      } catch (err) {
        onToast(
          err instanceof Error
            ? err.message
            : 'Não foi possível excluir o arquivo no Google Drive.'
        );
        return;
      }
    }

    const next = removeGalleryExhibit(exhibits, exhibit.id);
    onUpdateGallery(next);
    setInspectorIndex(null);
    setFocusSlot((prev) => Math.max(0, Math.min(next.length, prev)));
    sfx.move();
    onToast(
      driveDeleted
        ? `Obra "${exhibit.title}" removida da galeria e excluída do Google Drive.`
        : `Obra "${exhibit.title}" removida da exposição.`
    );
  };

  return (
    <section
      aria-label="Galeria e Museu do Casal"
      className="w-full max-w-6xl bg-[#FBF9F5] border-2 border-[#1C1917] rounded-3xl p-2 sm:p-2.5 space-y-1.5 shadow-xl"
    >
      {/* Museum Wing Editorial Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-300 pb-1.5">
        <div className="min-w-0">
          <div className="text-[10px] font-mono-num uppercase tracking-widest text-stone-500 font-bold">
            Exposição Permanente · {exhibits.length}{' '}
            {exhibits.length === 1 ? 'obra em ordem' : 'obras em ordem'}
          </div>
          <h2 className="font-display text-lg sm:text-xl font-bold text-stone-900 leading-none mt-0.5">
            Museu & Galeria do Casal 🖼️
          </h2>
          <p className="text-[11px] text-stone-600 mt-0.5 hidden sm:block">
            Caminhe pelo corredor para admirar sites, fotos e vídeos guardados no Google Drive do casal.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setReorderMode((v) => !v);
              sfx.select();
            }}
            aria-pressed={reorderMode}
            className={`px-3.5 py-2 rounded-xl border text-xs font-bold flex items-center gap-1.5 cursor-pointer whitespace-nowrap transition-colors ${
              reorderMode
                ? 'bg-amber-400 border-[#1C1917] text-stone-950 shadow-sm'
                : 'bg-white border-stone-300 hover:bg-stone-100 text-stone-800'
            }`}
          >
            {reorderMode ? (
              <>
                <Check className="w-3.5 h-3.5" /> Concluir Ordem
              </>
            ) : (
              <>
                <ArrowUpDown className="w-3.5 h-3.5" /> Organizar Posições
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              setEditorState({ open: true, editing: null });
              sfx.select();
            }}
            className="px-4 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-amber-200 text-xs font-bold flex items-center gap-1.5 cursor-pointer whitespace-nowrap shadow-sm"
          >
            <Plus className="w-4 h-4" /> Adicionar Obra / Mídia
          </button>
        </div>
      </div>

      {/* Google Drive Folder Storage Bar */}
      <div className="bg-[#F3EFE6] border border-stone-300 rounded-2xl px-2.5 py-1.5 space-y-1.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2 min-w-0">
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-stone-900">
              <HardDrive className="w-3.5 h-3.5 text-sky-700 shrink-0" />
              Pasta do Drive:
            </span>
            {driveFolder ? (
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-sky-950 bg-white border border-sky-300 px-2.5 py-0.5 rounded-lg max-w-[260px] truncate">
                <FolderOpen className="w-3.5 h-3.5 text-sky-700 shrink-0" />
                <span className="truncate">{driveFolder.folderName}</span>
              </span>
            ) : (
              <span className="text-[11px] text-stone-600">
                Nenhuma pasta vinculada ainda (conecte o Drive para criar uma pasta para fotos e vídeos)
              </span>
            )}
            {driveFolder?.webViewLink && (
              <a
                href={driveFolder.webViewLink}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] font-bold text-sky-800 hover:underline inline-flex items-center gap-1"
              >
                Abrir Pasta <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {driveToken ? (
              <span className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-900 border border-emerald-300">
                Drive Conectado ✓
              </span>
            ) : (
              <button
                type="button"
                disabled={connectingDrive}
                onClick={() => void handleConnectDrive()}
                className="px-3 py-1.5 rounded-xl border border-stone-300 bg-white hover:bg-stone-50 disabled:opacity-60 text-stone-900 text-xs font-bold inline-flex items-center gap-1.5 shadow-sm cursor-pointer"
              >
                <GoogleLogoSvg className="w-3.5 h-3.5" />
                {connectingDrive ? 'Conectando...' : 'Conectar Google Drive'}
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                setFolderManagerOpen((v) => !v);
                setConfirmUnlinkFolder(false);
              }}
              aria-expanded={folderManagerOpen}
              className="px-2.5 py-1.5 rounded-xl border border-stone-300 bg-white hover:bg-stone-100 text-xs font-bold text-stone-800 inline-flex items-center gap-1 cursor-pointer"
            >
              <FolderPlus className="w-3.5 h-3.5" />
              {folderManagerOpen ? 'Fechar Pasta' : 'Gerenciar Pasta'}
            </button>
          </div>
        </div>

        {folderManagerOpen && (
          <div className="bg-white border border-stone-300 rounded-xl p-3 space-y-3 text-left">
            <form onSubmit={handleCreateCustomFolder} className="flex flex-wrap items-end gap-2">
              <label className="flex-1 min-w-[200px] space-y-1 block">
                <span className="text-[11px] font-bold text-stone-700">
                  Criar e vincular nova pasta no Google Drive
                </span>
                <input
                  type="text"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  maxLength={100}
                  placeholder={DEFAULT_GALLERY_DRIVE_FOLDER_NAME}
                  className="w-full px-3 py-1.5 rounded-lg border border-stone-300 text-xs text-stone-900"
                />
              </label>
              <button
                type="submit"
                disabled={creatingFolder || !newFolderName.trim()}
                className="px-3 py-1.5 rounded-lg bg-sky-700 hover:bg-sky-800 disabled:opacity-50 text-white text-xs font-bold cursor-pointer"
              >
                {creatingFolder ? 'Criando...' : 'Criar e Vincular Pasta'}
              </button>
            </form>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-stone-200">
              <button
                type="button"
                disabled={loadingFolders}
                onClick={() => void handleLoadFolders()}
                className="px-3 py-1.5 rounded-lg border border-stone-300 bg-stone-50 hover:bg-stone-100 text-xs font-bold text-stone-800 inline-flex items-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingFolders ? 'animate-spin' : ''}`} />
                {loadingFolders ? 'Buscando pastas...' : 'Listar Pastas do App no Drive'}
              </button>

              {driveFolder &&
                (confirmUnlinkFolder ? (
                  <div className="flex items-center gap-1.5 text-[11px]">
                    <span className="text-red-800 font-bold">Desvincular pasta da sala?</span>
                    <button
                      type="button"
                      onClick={() => {
                        onUpdateDriveFolder(null);
                        setConfirmUnlinkFolder(false);
                        onToast('Pasta desvinculada (os arquivos no seu Drive permanecem intactos).');
                      }}
                      className="px-2 py-1 rounded-md bg-red-700 text-white font-bold cursor-pointer"
                    >
                      Confirmar
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmUnlinkFolder(false)}
                      className="px-2 py-1 rounded-md border border-stone-300 text-stone-700 font-bold cursor-pointer"
                    >
                      Cancelar
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmUnlinkFolder(true)}
                    className="text-[11px] font-bold text-red-700 hover:underline cursor-pointer"
                  >
                    Desvincular pasta
                  </button>
                ))}
            </div>

            {appFolders.length > 0 && (
              <div className="space-y-1">
                <span className="text-[11px] font-bold text-stone-600 block">
                  Pastas criadas pelo app no seu Google Drive:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {appFolders.map((folder) => {
                    const isSelected = driveFolder?.folderId === folder.folderId;
                    return (
                      <button
                        key={folder.folderId}
                        type="button"
                        onClick={() => {
                          onUpdateDriveFolder(folder);
                          onToast(`Pasta "${folder.folderName}" selecionada!`);
                          setFolderManagerOpen(false);
                        }}
                        className={`px-2.5 py-1 rounded-lg border text-xs font-bold inline-flex items-center gap-1 cursor-pointer ${
                          isSelected
                            ? 'bg-sky-700 text-white border-sky-800'
                            : 'bg-stone-50 hover:bg-stone-100 text-stone-800 border-stone-300'
                        }`}
                      >
                        <FolderOpen className="w-3 h-3" /> {folder.folderName}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Walkable Museum Corridor Stage */}
      <div
        data-no-swipe="true"
        className="relative rounded-2xl border-2 border-stone-300 overflow-hidden bg-gradient-to-b from-[#F3EFE6] via-[#F7F4EC] to-[#EBE4D6]"
      >
        {/* Top Ceiling Track Lighting Rail */}
        <div
          aria-hidden="true"
          className="h-3 bg-gradient-to-b from-stone-800 to-stone-700 border-b border-stone-900/40 flex items-center justify-around px-8"
        >
          <span className="w-3 h-1.5 rounded-b-sm bg-amber-200/80" />
          <span className="w-3 h-1.5 rounded-b-sm bg-amber-200/80" />
          <span className="w-3 h-1.5 rounded-b-sm bg-amber-200/80" />
          <span className="w-3 h-1.5 rounded-b-sm bg-amber-200/80 hidden sm:inline-block" />
        </div>

        {/* Horizontally Scrollable Corridor Wall + Floor */}
        <div ref={corridorRef} className="overflow-x-auto custom-scroll scroll-smooth">
          <div className="relative min-w-max">
            {/* Wall Row of Hung Exhibits + End-of-Corridor Expansion Alcove */}
            <div className="flex items-start gap-5 sm:gap-7 px-5 sm:px-8 pt-1 pb-2">
              {exhibits.map((exhibit, idx) => (
                <div key={exhibit.id} data-corridor-slot={idx} className="shrink-0">
                  <GalleryArtworkCard
                    exhibit={exhibit}
                    index={idx}
                    total={exhibits.length}
                    isFocused={focusSlot === idx}
                    reorderMode={reorderMode}
                    driveToken={driveToken}
                    onFocus={() => walkToSlot(idx)}
                    onInspect={() => {
                      setFocusSlot(idx);
                      setInspectorIndex(idx);
                      sfx.select();
                    }}
                    onEdit={() => {
                      setEditorState({ open: true, editing: exhibit });
                      sfx.select();
                    }}
                    onMoveLeft={() => handleMove(exhibit.id, 'left')}
                    onMoveRight={() => handleMove(exhibit.id, 'right')}
                    onMoveToPosition={(pos) => handleMoveToPos(exhibit.id, pos)}
                  />
                </div>
              ))}

              {/* End of the Corridor: Dedicated Expansion Pedestal ("Adicionar Mais") */}
              <div
                data-corridor-slot={exhibits.length}
                className={`shrink-0 w-[208px] sm:w-[224px] flex flex-col items-center transition-transform duration-300 ${
                  focusSlot === exhibits.length ? 'scale-[1.02]' : 'opacity-95'
                }`}
              >
                <div
                  aria-hidden="true"
                  className="pointer-events-none w-40 h-4 -mb-2"
                  style={{
                    background:
                      'radial-gradient(ellipse at 50% 0%, rgba(254, 243, 199, 0.9) 0%, transparent 78%)',
                  }}
                />
                <button
                  type="button"
                  onClick={() => {
                    walkToSlot(exhibits.length);
                    setEditorState({ open: true, editing: null });
                    sfx.select();
                  }}
                  aria-label="Adicionar nova obra no final do corredor"
                  className={`w-full aspect-[16/10] rounded-xl border-2 border-dashed border-stone-400 bg-[#FBF9F5]/90 hover:bg-amber-50 hover:border-amber-700 p-3 flex flex-col items-center justify-center text-center gap-1.5 shadow-inner cursor-pointer transition-colors ${
                    focusSlot === exhibits.length
                      ? 'ring-2 ring-amber-500 ring-offset-2 ring-offset-[#F3EFE6]'
                      : ''
                  }`}
                >
                  <span className="w-9 h-9 rounded-full bg-stone-900 text-amber-200 flex items-center justify-center shadow">
                    <Plus className="w-4 h-4" />
                  </span>
                  <div className="space-y-0.5">
                    <span className="font-display text-base font-bold text-stone-900 block leading-tight">
                      Adicionar Mais Obras
                    </span>
                    <span className="text-[10px] text-stone-600 block leading-snug">
                      Pendure outro site, foto ou vídeo no final do corredor.
                    </span>
                  </div>
                </button>
                <div className="w-[96%] mt-1.5 bg-[#FBF9F5] border border-stone-300 rounded-xl p-2 text-left">
                  <div className="text-[10px] font-mono-num uppercase tracking-wider text-stone-500 font-bold">
                    Ala #{String(exhibits.length + 1).padStart(2, '0')} · Próximo Espaço
                  </div>
                  <p className="text-[11px] text-stone-700 mt-0.5 leading-snug">
                    Sempre pronto ao final da visita para expandir sua coleção.
                  </p>
                </div>
              </div>
            </div>

            {/* Museum Wainscoting + Velvet Rope + Walkable Gallery Floor */}
            <div className="relative h-14 sm:h-[58px] border-t border-stone-300 bg-gradient-to-b from-[#DFD5C3] via-[#D4C7B1] to-[#C2B299]">
              {/* Subtle Velvet Stanchion Rope Line */}
              <div
                aria-hidden="true"
                className="absolute inset-x-6 top-1.5 h-0.5 bg-red-900/35"
              />

              {/* Floor Position Plaques Aligned Under Each Slot */}
              <div className="flex items-end justify-between px-5 sm:px-8 h-full pb-1 pointer-events-none">
                {Array.from({ length: totalSlots }, (_, slotIdx) => (
                  <div
                    key={slotIdx}
                    className="w-[208px] sm:w-[224px] mr-5 sm:mr-7 last:mr-0 flex justify-center"
                  >
                    <span
                      className={`text-[10px] font-mono-num font-bold px-2 py-0.5 rounded-md border ${
                        focusSlot === slotIdx
                          ? 'bg-stone-900 text-amber-200 border-stone-900'
                          : 'bg-[#FBF9F5]/80 text-stone-600 border-stone-400/50'
                      }`}
                    >
                      {slotIdx < exhibits.length
                        ? `PARADA ${String(slotIdx + 1).padStart(2, '0')}`
                        : 'NOVAS OBRAS'}
                    </span>
                  </div>
                ))}
              </div>

              {/* Walkable Curator Cat Avatar */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute bottom-1.5 left-0 transition-transform duration-300 ease-out motion-reduce:transition-none flex flex-col items-center"
                style={{ transform: `translate3d(calc(${walkerX}px - 50%), 0, 0)` }}
              >
                <span className="text-[9px] font-bold bg-[#fff8ed] border border-stone-700 text-stone-900 px-1.5 py-0.5 rounded-md shadow-sm -mb-1 whitespace-nowrap">
                  {myNick}
                </span>
                <div className="w-11 h-11 sm:w-12 sm:h-12 drop-shadow-md">
                  <CatSvg cat={myCat} isFlipped={facingLeft} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Corridor Navigation & Floor Guide */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-[#F3EFE6] border border-stone-300 rounded-2xl px-3 py-1.5">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => walkToSlot(focusSlot - 1)}
            disabled={focusSlot <= 0}
            aria-label="Andar para trás no corredor"
            className="px-3 py-2 rounded-xl bg-white hover:bg-stone-100 disabled:opacity-40 border border-stone-300 text-xs font-bold text-stone-900 flex items-center gap-1 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Andar
          </button>
          <button
            type="button"
            onClick={() => walkToSlot(focusSlot + 1)}
            disabled={focusSlot >= exhibits.length}
            aria-label="Andar para frente no corredor"
            className="px-3 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 disabled:opacity-40 text-amber-200 text-xs font-bold flex items-center gap-1 cursor-pointer"
          >
            Andar <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Clickable Numbered Floor Stops */}
        <div
          className="flex flex-wrap items-center gap-1"
          role="navigation"
          aria-label="Paradas do corredor do museu"
        >
          {exhibits.map((ex, idx) => (
            <button
              key={ex.id}
              type="button"
              onClick={() => walkToSlot(idx)}
              aria-label={`Ir para obra ${idx + 1}: ${ex.title}`}
              className={`min-w-[32px] px-2 py-1.5 rounded-lg text-xs font-mono-num font-bold border cursor-pointer transition-colors ${
                focusSlot === idx
                  ? 'bg-stone-900 text-amber-200 border-stone-900'
                  : 'bg-white hover:bg-stone-100 text-stone-700 border-stone-300'
              }`}
            >
              {String(idx + 1).padStart(2, '0')}
            </button>
          ))}
          <button
            type="button"
            onClick={() => walkToSlot(exhibits.length)}
            aria-label="Ir para o final do corredor para adicionar obra"
            className={`px-2.5 py-1.5 rounded-lg text-xs font-bold border cursor-pointer transition-colors ${
              focusSlot === exhibits.length
                ? 'bg-amber-400 text-stone-950 border-stone-900'
                : 'bg-white hover:bg-amber-50 text-stone-800 border-stone-300'
            }`}
          >
            + Fim
          </button>
        </div>

        <span className="hidden md:inline-flex items-center gap-1.5 text-[11px] text-stone-600 font-medium">
          <Compass className="w-3.5 h-3.5" /> Setas ← → ou A / D para andar · Enter para abrir
        </span>
      </div>

      {/* Inspector Modal */}
      <GalleryInspectorModal
        exhibit={inspectedExhibit}
        index={inspectorIndex ?? 0}
        total={exhibits.length}
        driveToken={driveToken}
        onConnectDrive={handleConnectDrive}
        onClose={() => setInspectorIndex(null)}
        onPrev={() => {
          if (inspectorIndex !== null && inspectorIndex > 0) {
            const next = inspectorIndex - 1;
            setInspectorIndex(next);
            walkToSlot(next);
          }
        }}
        onNext={() => {
          if (inspectorIndex !== null && inspectorIndex < exhibits.length - 1) {
            const next = inspectorIndex + 1;
            setInspectorIndex(next);
            walkToSlot(next);
          }
        }}
        onMoveLeft={() => inspectedExhibit && handleMove(inspectedExhibit.id, 'left')}
        onMoveRight={() => inspectedExhibit && handleMove(inspectedExhibit.id, 'right')}
        onEdit={() => {
          if (!inspectedExhibit) return;
          setInspectorIndex(null);
          setEditorState({ open: true, editing: inspectedExhibit });
        }}
        onDelete={(alsoDeleteFromDrive) => {
          if (inspectedExhibit) {
            return handleDelete(inspectedExhibit, alsoDeleteFromDrive);
          }
        }}
      />

      {/* Add / Edit Modal */}
      <GalleryEditorModal
        open={editorState.open}
        editingExhibit={editorState.editing}
        totalCount={exhibits.length}
        myRole={myRole}
        myNick={myNick}
        driveToken={driveToken}
        driveFolder={driveFolder}
        onConnectDrive={handleConnectDrive}
        onEnsureFolder={handleEnsureFolder}
        onClose={() => setEditorState({ open: false, editing: null })}
        onSave={handleSaveExhibit}
      />
    </section>
  );
};
