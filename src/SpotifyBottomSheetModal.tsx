import React, { useState } from 'react';
import {
  Share2,
  CheckCircle2,
  MinusCircle,
  ArrowDownCircle,
  Download,
  ListPlus,
  Sliders,
  PlusCircle,
  Users,
  Folder,
  UserCheck,
  XCircle,
  ArrowLeft,
  Check,
  Plus,
  X,
  Edit3,
  Image as ImageIcon
} from 'lucide-react';
import { type Song, type AudioFolder } from './App';

export interface SpotifyBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  itemType: 'song' | 'playlist';
  song?: Song | null;
  folder?: AudioFolder | null;
  allFolders: AudioFolder[];
  isFavorite?: boolean;
  isShuffle?: boolean;
  onShare: (item: Song | AudioFolder) => void;
  onDeleteFromLibrary: (song: Song) => void;
  onDeleteFolder?: (folder: AudioFolder) => void;
  onAddToQueue: (song: Song) => void;
  onAddFolderToQueue?: (folder: AudioFolder) => void;
  onToggleShuffle: () => void;
  onAddToPlaylist: (song: Song, targetFolderId: string) => void;
  onRemoveFromSection?: (item: Song | AudioFolder) => void;
  onRenameFolder?: (folder: AudioFolder) => void;
  onUploadFolderCover?: (folder: AudioFolder) => void;
  canMoveSong?: boolean;
  renderCover: (coverUrlOrKey: string | undefined, className: string) => React.ReactNode;
  triggerToast: (message: string, type?: 'success' | 'info' | 'error') => void;
}

export const SpotifyBottomSheetModal: React.FC<SpotifyBottomSheetProps> = ({
  isOpen,
  onClose,
  itemType,
  song,
  folder,
  allFolders,
  isShuffle = false,
  onShare,
  onDeleteFromLibrary,
  onDeleteFolder,
  onAddToQueue,
  onAddFolderToQueue,
  onToggleShuffle,
  onAddToPlaylist,
  onRemoveFromSection,
  onRenameFolder,
  onUploadFolderCover,
  canMoveSong = true,
  renderCover,
  triggerToast
}) => {
  const [currentView, setCurrentView] = useState<'main' | 'add_to_playlist' | 'move_to_folder'>('main');
  const [playlistSearch, setPlaylistSearch] = useState<string>('');

  if (!isOpen) return null;

  const title = itemType === 'song'
    ? song?.title || song?.titulo || 'Canción'
    : folder?.titulo || 'Playlist';

  const subtitle = itemType === 'song'
    ? `${song?.artist || song?.artista || 'Artista'} • Spotyy_AA`
    : `de Spotify • ${folder?.canciones?.length ?? 0} veces guardada`;

  const coverTarget = itemType === 'song'
    ? (song?.cover_url || song?.cover)
    : (folder?.coverKey);

  const handleShare = () => {
    if (itemType === 'song' && song) {
      onShare(song);
    } else if (folder) {
      onShare(folder);
    }
    onClose();
  };

  const handleDelete = () => {
    if (itemType === 'song' && song) {
      onDeleteFromLibrary(song);
    } else if (folder && onDeleteFolder) {
      onDeleteFolder(folder);
    }
    onClose();
  };

  const handleAddToQueue = () => {
    if (itemType === 'song' && song) {
      onAddToQueue(song);
    } else if (folder && onAddFolderToQueue) {
      onAddFolderToQueue(folder);
    }
    onClose();
  };

  const handleToggleShuffle = () => {
    onToggleShuffle();
    onClose();
  };

  const handleSelectTargetFolder = (targetFolderId: string) => {
    if (itemType === 'song' && song) {
      onAddToPlaylist(song, targetFolderId);
    }
    onClose();
  };

  const filteredFolders = allFolders.filter((f) =>
    f.titulo.toLowerCase().includes(playlistSearch.toLowerCase()) ||
    (f.subtitulo && f.subtitulo.toLowerCase().includes(playlistSearch.toLowerCase()))
  );

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/75 backdrop-blur-md animate-fade-in transition-opacity"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-[#242424] text-white rounded-t-3xl shadow-2xl border-t border-white/10 max-h-[88vh] flex flex-col overflow-hidden animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Tirador / Pill Bar superior estilo Spotify */}
        <div className="w-10 h-1 bg-[#535353] rounded-full mx-auto mt-3 mb-2 shrink-0" />

        {/* ========================================================
            VISTA 1: MENÚ PRINCIPAL BOTTOM SHEET
            ======================================================== */}
        {currentView === 'main' && (
          <>
            {/* Cabecera del Item (Portada cuadrada pequeña + Título + Subtítulo) */}
            <div className="flex items-center gap-3.5 px-5 py-3 border-b border-white/10 shrink-0">
              <div className="w-12 h-12 rounded-md overflow-hidden shrink-0 shadow-md bg-neutral-900 border border-white/10">
                {renderCover(coverTarget, 'w-full h-full object-cover')}
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-base font-bold text-white truncate leading-snug">
                  {title}
                </h3>
                <p className="text-xs text-[#B3B3B3] truncate mt-0.5">
                  {subtitle}
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-white rounded-full hover:bg-white/10 transition active:scale-95 shrink-0"
                title="Cerrar menú"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Lista vertical de opciones con íconos a la izquierda (exacto al screenshot) */}
            <div className="overflow-y-auto px-3 py-2 space-y-0.5 pb-8 sm:pb-6">
              {/* Opciones Especiales de Carpeta: Cambiar nombre y Agregar foto de portada */}
              {itemType === 'playlist' && folder && (
                <>
                  {onRenameFolder && (
                    <button
                      type="button"
                      onClick={() => {
                        onRenameFolder(folder);
                        onClose();
                      }}
                      className="w-full flex items-center gap-4 px-3 py-3 rounded-xl hover:bg-white/10 active:bg-white/15 transition text-left group bg-white/5 mb-1"
                    >
                      <Edit3 className="w-5 h-5 text-[#1ED760] group-hover:scale-110 transition shrink-0" />
                      <div className="flex-1 min-w-0">
                        <span className="text-[15px] font-bold text-white block">
                          Cambiar nombre a carpeta
                        </span>
                        <span className="text-xs text-gray-400 block truncate">
                          Editar el título actual ({folder.titulo})
                        </span>
                      </div>
                    </button>
                  )}

                  {onUploadFolderCover && (
                    <button
                      type="button"
                      onClick={() => {
                        onUploadFolderCover(folder);
                        onClose();
                      }}
                      className="w-full flex items-center gap-4 px-3 py-3 rounded-xl hover:bg-white/10 active:bg-white/15 transition text-left group bg-white/5 mb-1"
                    >
                      <ImageIcon className="w-5 h-5 text-blue-400 group-hover:scale-110 transition shrink-0" />
                      <div className="flex-1 min-w-0">
                        <span className="text-[15px] font-bold text-white block">
                          Agregar foto de portada
                        </span>
                        <span className="text-xs text-gray-400 block truncate">
                          Subir imagen personalizada a Cloudflare R2
                        </span>
                      </div>
                    </button>
                  )}
                </>
              )}

              {/* 1. Compartir */}
              <button
                type="button"
                onClick={handleShare}
                className="w-full flex items-center gap-4 px-3 py-3 rounded-xl hover:bg-white/10 active:bg-white/15 transition text-left group"
              >
                <Share2 className="w-5 h-5 text-gray-300 group-hover:text-white shrink-0" />
                <span className="text-[15px] font-medium text-white">Compartir</span>
              </button>

              {/* 2. Eliminar de Tu biblioteca */}
              <button
                type="button"
                onClick={handleDelete}
                className="w-full flex items-center gap-4 px-3 py-3 rounded-xl hover:bg-white/10 active:bg-white/15 transition text-left group"
              >
                <CheckCircle2 className="w-5 h-5 text-[#1ED760] shrink-0" />
                <span className="text-[15px] font-medium text-white">
                  Eliminar de Tu biblioteca
                </span>
              </button>

              {/* 3. Eliminar de esta sección */}
              <button
                type="button"
                onClick={() => {
                  if (onRemoveFromSection) {
                    if (itemType === 'song' && song) onRemoveFromSection(song);
                    else if (folder) onRemoveFromSection(folder);
                  } else {
                    triggerToast('Elemento quitado de esta sección', 'info');
                  }
                  onClose();
                }}
                className="w-full flex items-center gap-4 px-3 py-3 rounded-xl hover:bg-white/10 active:bg-white/15 transition text-left group"
              >
                <MinusCircle className="w-5 h-5 text-gray-300 group-hover:text-white shrink-0" />
                <span className="text-[15px] font-medium text-white">Eliminar de esta sección</span>
              </button>

              {/* 4. Eliminar descarga */}
              <button
                type="button"
                onClick={() => {
                  triggerToast('Descarga eliminada de este dispositivo', 'info');
                  onClose();
                }}
                className="w-full flex items-center gap-4 px-3 py-3 rounded-xl hover:bg-white/10 active:bg-white/15 transition text-left group"
              >
                <ArrowDownCircle className="w-5 h-5 text-[#1ED760] shrink-0" />
                <span className="text-[15px] font-medium text-white">Eliminar descarga</span>
              </button>

              {/* 5. Descargar en otros dispositivos */}
              <button
                type="button"
                onClick={() => {
                  triggerToast('Descarga sincronizada en tus otros dispositivos', 'info');
                  onClose();
                }}
                className="w-full flex items-center gap-4 px-3 py-3 rounded-xl hover:bg-white/10 active:bg-white/15 transition text-left group"
              >
                <Download className="w-5 h-5 text-gray-300 group-hover:text-white shrink-0" />
                <span className="text-[15px] font-medium text-white">Descargar en otros dispositivos</span>
              </button>

              {/* 6. Agregar a la fila */}
              <button
                type="button"
                onClick={handleAddToQueue}
                className="w-full flex items-center gap-4 px-3 py-3 rounded-xl hover:bg-white/10 active:bg-white/15 transition text-left group"
              >
                <ListPlus className="w-5 h-5 text-gray-300 group-hover:text-white shrink-0" />
                <span className="text-[15px] font-medium text-white">Agregar a la fila</span>
              </button>

              {/* 7. Activar Mixear (Shuffle) */}
              <button
                type="button"
                onClick={handleToggleShuffle}
                className="w-full flex items-center gap-4 px-3 py-3 rounded-xl hover:bg-white/10 active:bg-white/15 transition text-left group"
              >
                <Sliders className={`w-5 h-5 shrink-0 ${isShuffle ? 'text-[#1ED760]' : 'text-gray-300 group-hover:text-white'}`} />
                <span className="text-[15px] font-medium text-white">
                  {isShuffle ? 'Desactivar Mixear' : 'Activar Mixear'}
                </span>
              </button>

              {/* 8. Agregar a otra playlist */}
              <button
                type="button"
                onClick={() => setCurrentView('add_to_playlist')}
                className="w-full flex items-center gap-4 px-3 py-3 rounded-xl hover:bg-white/10 active:bg-white/15 transition text-left group"
              >
                <PlusCircle className="w-5 h-5 text-gray-300 group-hover:text-white shrink-0" />
                <span className="text-[15px] font-medium text-white">Agregar a otra playlist</span>
              </button>

              {/* 9. Empezar una jam */}
              <button
                type="button"
                onClick={() => {
                  triggerToast('Sesión Jam iniciada. Comparte el enlace con tus amigos.', 'success');
                  onClose();
                }}
                className="w-full flex items-center gap-4 px-3 py-3 rounded-xl hover:bg-white/10 active:bg-white/15 transition text-left group"
              >
                <Users className="w-5 h-5 text-gray-300 group-hover:text-white shrink-0" />
                <span className="text-[15px] font-medium text-white">Empezar una jam</span>
              </button>

              {/* 10. Mover a una carpeta (Controlado por permiso global) */}
              {canMoveSong && (
                <button
                  type="button"
                  onClick={() => setCurrentView('move_to_folder')}
                  className="w-full flex items-center gap-4 px-3 py-3 rounded-xl hover:bg-white/10 active:bg-white/15 transition text-left group"
                >
                  <Folder className="w-5 h-5 text-gray-300 group-hover:text-white shrink-0" />
                  <span className="text-[15px] font-medium text-white">Mover a una carpeta</span>
                </button>
              )}

              {/* 11. Agregar a tu perfil */}
              <button
                type="button"
                onClick={() => {
                  triggerToast('Agregado a tu perfil público de Spotyy_AA', 'success');
                  onClose();
                }}
                className="w-full flex items-center gap-4 px-3 py-3 rounded-xl hover:bg-white/10 active:bg-white/15 transition text-left group"
              >
                <UserCheck className="w-5 h-5 text-gray-300 group-hover:text-white shrink-0" />
                <span className="text-[15px] font-medium text-white">Agregar a tu perfil</span>
              </button>

              {/* 12. Excluir de perfil de gustos */}
              <button
                type="button"
                onClick={() => {
                  triggerToast('Excluida de tu perfil de gustos y recomendaciones', 'info');
                  onClose();
                }}
                className="w-full flex items-center gap-4 px-3 py-3 rounded-xl hover:bg-white/10 active:bg-white/15 transition text-left group"
              >
                <XCircle className="w-5 h-5 text-gray-300 group-hover:text-white shrink-0" />
                <span className="text-[15px] font-medium text-white">
                  {itemType === 'playlist'
                    ? 'Excluir la playlist de tu perfil de gustos'
                    : 'Excluir del perfil de gustos'}
                </span>
              </button>
            </div>
          </>
        )}

        {/* ========================================================
            VISTA 2: SUB-MENÚ AGREGAR A OTRA PLAYLIST / MOVER A CARPETA
            ======================================================== */}
        {(currentView === 'add_to_playlist' || currentView === 'move_to_folder') && (
          <div className="flex flex-col h-full max-h-[85vh]">
            <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10 shrink-0">
              <button
                type="button"
                onClick={() => setCurrentView('main')}
                className="p-1.5 text-gray-300 hover:text-white rounded-full hover:bg-white/10 transition active:scale-95"
                title="Volver"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="min-w-0 flex-1">
                <h3 className="text-base font-bold text-white truncate">
                  {currentView === 'move_to_folder' ? 'Mover a una carpeta' : 'Agregar a otra playlist'}
                </h3>
                <p className="text-xs text-gray-400 truncate">
                  Selecciona la playlist de destino
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 text-gray-400 hover:text-white rounded-full hover:bg-white/10 transition active:scale-95"
                title="Cerrar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Buscador de Playlists */}
            <div className="p-3 border-b border-white/5">
              <input
                type="text"
                placeholder="Buscar playlist..."
                value={playlistSearch}
                onChange={(e) => setPlaylistSearch(e.target.value)}
                className="w-full px-3 py-2 bg-[#181818] border border-white/10 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#1ED760] transition"
              />
            </div>

            {/* Listado de carpetas/playlists disponibles */}
            <div className="overflow-y-auto px-3 py-2 space-y-1 flex-1 pb-8 sm:pb-6">
              {filteredFolders.length === 0 ? (
                <div className="p-8 text-center text-sm text-gray-400">
                  No se encontraron playlists
                </div>
              ) : (
                filteredFolders.map((f) => {
                  const songCount = f.canciones?.length ?? 0;
                  const alreadyInFolder = song && f.canciones?.some((c) => String(c.id) === String(song.id));

                  return (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => handleSelectTargetFolder(f.id)}
                      className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-white/10 active:bg-white/15 transition text-left group"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-11 h-11 rounded-lg overflow-hidden shrink-0 bg-neutral-900 border border-white/10">
                          {renderCover(f.coverKey, 'w-full h-full object-cover')}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-white truncate">
                            {f.titulo}
                          </p>
                          <p className="text-xs text-gray-400 truncate mt-0.5">
                            {songCount} {songCount === 1 ? 'canción' : 'canciones'}
                          </p>
                        </div>
                      </div>

                      {alreadyInFolder ? (
                        <span className="text-xs font-semibold text-[#1ED760] flex items-center gap-1 bg-[#1ED760]/10 px-2 py-0.5 rounded-full shrink-0">
                          <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                          Ya añadida
                        </span>
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-white/5 group-hover:bg-[#1ED760] group-hover:text-black text-gray-400 flex items-center justify-center transition shrink-0">
                          <Plus className="w-4 h-4" />
                        </div>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SpotifyBottomSheetModal;
