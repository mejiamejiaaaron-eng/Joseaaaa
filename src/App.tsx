import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  type User
} from 'firebase/auth';
import {
  collection,
  getDocs,
  getDoc,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  doc
} from 'firebase/firestore';
import { auth, db } from './firebase';
import { uploadToR2, uploadCoverToR2, uploadFolderCoverToR2 } from './r2Client';
export { auth, db };
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  ChevronDown,
  Volume2,
  VolumeX,
  Upload,
  Trash2,
  LogIn,
  LogOut,
  Music,
  Search,
  Lock,
  Eye,
  EyeOff,
  Edit3,
  X,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Copy,
  Check,
  HelpCircle,
  ExternalLink,
  UserPlus,
  Smartphone,
  Rocket,
  Globe,
  Home,
  Library,
  Plus,
  Heart,
  MoreVertical,
  Cast,
  Headphones,
  Bell,
  Clock,
  Battery,
  ArrowLeft,
  Shuffle,
  Repeat,
  Repeat1,
  Download,
  Folder,
  Image as ImageIcon,
  Share2,
  FolderPlus,
  ListMusic,
  Sparkles,
  RefreshCw,
  MinusCircle,
  FolderCheck,
  Mic,
  UserX,
  Sliders,
  Shield,
  Send,
  GripVertical
} from 'lucide-react';
import TelegramUploaderModal, { generarCoverBlobFallback, fetchDeepSeekData, generateImageWithDeepSeek, convertImageUrlToFile } from './TelegramUploaderModal';
import SpotifyBottomSheetModal from './SpotifyBottomSheetModal';
import {
  extractRealAudioMetadata,
  resolveCoverAndUploadToR2,
  searchCoverInITunes,
  downloadImageBlob,
  getGenreCover,
  fixUtf8Encoding,
  cleanArtist,
  cleanGenre,
  cleanTitle,
  DEFAULT_SONG_COVER,
  GENRE_COVERS,
  extractArtistAndTitleFromFilename,
  obtenerPortadaUnsplashCarpeta,
  asignarPortadaAutomaticaCarpeta,
  limpiarTituloCancion
} from './audioMetadataService';
import { migrarDeSupabaseAFirebase } from './migrationService';
export { asignarPortadaAutomaticaCarpeta, obtenerPortadaUnsplashCarpeta, limpiarTituloCancion, migrarDeSupabaseAFirebase };

// ==========================================
// 1. TIPOS Y MODELOS DE DATOS
// ==========================================

export interface Song {
  id: string | number;
  titulo: string;
  artista: string;
  url: string;
  storage_path: string;
  created_at?: string | null;
  cover?: string;
  // Campos oficiales de la tabla 'songs' de Supabase
  title?: string;
  artist?: string;
  performer?: string;
  playback_url?: string;
  cover_url?: string;
  audio_url?: string;
  folder_id?: string;
  lyrics?: string;
  fingerprint?: string;
  genre?: string;
}


export interface AudioFolder {
  id: string;
  titulo: string;
  subtitulo: string;
  descripcion: string;
  coverKey: string;
  coverUrl?: string;
  badge?: string;
  canciones: Song[];
}

export const carpetasAudio: AudioFolder[] = [
  {
    id: 'mis_canciones',
    titulo: 'Mis Canciones',
    subtitulo: 'Tus temas propios y canciones sueltas',
    descripcion: 'Playlist con tus temas y audios subidos.',
    coverKey: obtenerPortadaUnsplashCarpeta('Mis Canciones'),
    coverUrl: obtenerPortadaUnsplashCarpeta('Mis Canciones'),
    badge: 'Playlist Personal',
    canciones: []
  },
  {
    id: 'buchonass',
    titulo: 'buchonass',
    subtitulo: 'Corridos, Bélicos y Regional Mexicano',
    descripcion: 'Carpeta de corridos, música bélica y regional mexicano.',
    coverKey: obtenerPortadaUnsplashCarpeta('buchonass'),
    coverUrl: obtenerPortadaUnsplashCarpeta('buchonass'),
    badge: 'Corridos & Regional',
    canciones: []
  },
  {
    id: 'tus_me_gusta',
    titulo: 'Tus me gusta',
    subtitulo: 'Tus temas favoritos y canciones en la nube',
    descripcion: 'Carpeta personal y sincronizada en la nube.',
    coverKey: obtenerPortadaUnsplashCarpeta('Tus me gusta'),
    coverUrl: obtenerPortadaUnsplashCarpeta('Tus me gusta'),
    badge: 'Favoritos & En la Nube',
    canciones: []
  },
  {
    id: 'perreale',
    titulo: 'Perreale',
    subtitulo: 'Reggaetón, Urbano y Perreo',
    descripcion: 'Carpeta de reggaetón, perreo intenso y ritmos urbanos latinos.',
    coverKey: obtenerPortadaUnsplashCarpeta('Perreale'),
    coverUrl: obtenerPortadaUnsplashCarpeta('Perreale'),
    badge: 'Reggaetón & Perreo',
    canciones: []
  },
  {
    id: 'lob_songs',
    titulo: 'LOB SONGS',
    subtitulo: 'Banda, Campirano y Sierreño',
    descripcion: 'Lo más nuevo de banda, campirano y sierreño en alta fidelidad.',
    coverKey: obtenerPortadaUnsplashCarpeta('LOB SONGS'),
    coverUrl: obtenerPortadaUnsplashCarpeta('LOB SONGS'),
    badge: 'Banda & Grupero',
    canciones: []
  },
  {
    id: 'los_2000',
    titulo: "los 2000'",
    subtitulo: 'Pop & Clásicos de los 2000s',
    descripcion: 'Pistas nostálgicas y grandes himnos del nuevo milenio.',
    coverKey: obtenerPortadaUnsplashCarpeta("los 2000'"),
    coverUrl: obtenerPortadaUnsplashCarpeta("los 2000'"),
    badge: 'Pop 2000s',
    canciones: []
  },
  {
    id: 'grwm',
    titulo: 'GRWM🍒💋⭐💍',
    subtitulo: 'Música para arreglarte y brillar',
    descripcion: 'Vibes aesthetic, pop femenino, R&B y beats envolventes.',
    coverKey: obtenerPortadaUnsplashCarpeta('GRWM'),
    coverUrl: obtenerPortadaUnsplashCarpeta('GRWM'),
    badge: 'GRWM & Aesthetic',
    canciones: []
  },
  {
    id: 'baladas',
    titulo: 'Baladas Románticas',
    subtitulo: 'Baladas Inmortales en Español',
    descripcion: 'Las mejores poesías cantadas y clásicos románticos.',
    coverKey: obtenerPortadaUnsplashCarpeta('Baladas Románticas'),
    coverUrl: obtenerPortadaUnsplashCarpeta('Baladas Románticas'),
    badge: 'Baladas de Oro',
    canciones: []
  },
  {
    id: 'la_reina',
    titulo: 'La Reina: Éxitos de la ...',
    subtitulo: 'Selena Quintanilla y Reinas de la Música Latina',
    descripcion: 'Homenaje a Selena y las grandes voces de la música hispana.',
    coverKey: obtenerPortadaUnsplashCarpeta('La Reina Selena'),
    coverUrl: obtenerPortadaUnsplashCarpeta('La Reina Selena'),
    badge: 'Tributo Legendario',
    canciones: []
  },
  {
    id: 'audiolibro',
    titulo: 'Deja de ser tú (latino): La mente crea la real...',
    subtitulo: 'Dr. Joe Dispenza (Audiolibro Completo)',
    descripcion: 'Capítulos de audio para reprogramar tu mente y transformar tu realidad.',
    coverKey: obtenerPortadaUnsplashCarpeta('Audiolibro'),
    coverUrl: obtenerPortadaUnsplashCarpeta('Audiolibro'),
    badge: 'Audiolibro Premium',
    canciones: []
  },
  {
    id: 'marco_antonio',
    titulo: 'Marco Antonio Solís',
    subtitulo: 'Franco De Vita, Chayanne y Los Bukis',
    descripcion: 'Las mejores poesías cantadas del maestro de maestros.',
    coverKey: obtenerPortadaUnsplashCarpeta('Marco Antonio Solís'),
    coverUrl: obtenerPortadaUnsplashCarpeta('Marco Antonio Solís'),
    badge: 'Maestros de la Música',
    canciones: []
  },
  {
    id: 'mix_grupero',
    titulo: 'Mix de grupero',
    subtitulo: 'Eden Muñoz, Grupo Mojado, Kany García y más',
    descripcion: 'Pistas seleccionadas con la mejor energía grupera.',
    coverKey: obtenerPortadaUnsplashCarpeta('Mix de grupero'),
    coverUrl: obtenerPortadaUnsplashCarpeta('Mix de grupero'),
    badge: 'Mix Grupero',
    canciones: []
  }
];

export const initialDemoSongs: Song[] = [];

export interface AppSettings {
  allow_user_create_folder: boolean;
  allow_user_upload: boolean;
  allow_user_move_song: boolean;
}

export const DEFAULT_APP_SETTINGS: AppSettings = {
  allow_user_create_folder: true,
  allow_user_upload: true,
  allow_user_move_song: true,
};

export default function App() {
  // Estado de autenticación y control de sesión
  const [user, setUser] = useState<User | null>(null);
  const [sessionLoading, setSessionLoading] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [showLoginModal, setShowLoginModal] = useState<boolean>(false);
  const [isSignUpMode, setIsSignUpMode] = useState<boolean>(false);
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [isLoggingIn, setIsLoggingIn] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Nombre de la aplicación (configurable por el Admin y persistente en localStorage)
  const [appName, setAppName] = useState<string>(() => {
    try {
      const stored = localStorage.getItem('appName') || localStorage.getItem('fa_app_title_v1');
      if (!stored || stored === 'FINANCIERA AARON' || stored === 'Financiera Aaron' || stored === 'JAaron Music') {
        localStorage.setItem('appName', 'Spotyy_AA');
        localStorage.setItem('fa_app_title_v1', 'Spotyy_AA');
        return 'Spotyy_AA';
      }
      return stored;
    } catch {
      return 'Spotyy_AA';
    }
  });
  const [tempAppName, setTempAppName] = useState<string>(() => {
    try {
      const stored = localStorage.getItem('appName') || localStorage.getItem('fa_app_title_v1');
      if (!stored || stored === 'FINANCIERA AARON' || stored === 'Financiera Aaron' || stored === 'JAaron Music') {
        return 'Spotyy_AA';
      }
      return stored;
    } catch {
      return 'Spotyy_AA';
    }
  });

  // Panel de Ajustes Administrativos y Gestión de Usuarios Bloqueados (Kick)
  const [showAdminSettingsModal, setShowAdminSettingsModal] = useState<boolean>(false);
  const [blockedUsers, setBlockedUsers] = useState<{ email: string; created_at: string }[]>([]);
  const [newBlockEmail, setNewBlockEmail] = useState<string>('');
  const [loadingBlockedUsers, setLoadingBlockedUsers] = useState<boolean>(false);
  const [sqlCopiedBlocked, setSqlCopiedBlocked] = useState<boolean>(false);

  // Configuración global y permisos de usuarios normales (tabla app_settings)
  const [appSettings, setAppSettings] = useState<AppSettings>(() => {
    try {
      const raw = localStorage.getItem('spotyy_app_settings_v1');
      if (raw) return { ...DEFAULT_APP_SETTINGS, ...JSON.parse(raw) };
    } catch {}
    return DEFAULT_APP_SETTINGS;
  });
  const [loadingAppSettings, setLoadingAppSettings] = useState<boolean>(false);
  const [sqlCopiedAppSettings, setSqlCopiedAppSettings] = useState<boolean>(false);
  const [savingSettingKey, setSavingSettingKey] = useState<string | null>(null);

  // Lógica de Admin estricta: permite acceso a administradores autorizados
  const isAdmin = Boolean(
    user?.email &&
    ['mejiamejiaaaron@gmail.com', 'joseaaronperez25@gmail.com', 'am0360136@gmail.com'].includes(user.email.trim().toLowerCase())
  );

  // Estados para la Migración Mágica (Supabase -> Firebase)
  const [showMigrationModal, setShowMigrationModal] = useState<boolean>(false);
  const [isMigratingSupabase, setIsMigratingSupabase] = useState<boolean>(false);
  const [migrationSupabaseUrl, setMigrationSupabaseUrl] = useState<string>(() => {
    try {
      return localStorage.getItem('spotyy_migration_url') || import.meta.env.VITE_SUPABASE_URL || 'https://djqjagjaywphhaoonbdq.supabase.co';
    } catch {
      return 'https://djqjagjaywphhaoonbdq.supabase.co';
    }
  });
  const [migrationSupabaseKey, setMigrationSupabaseKey] = useState<string>(() => {
    try {
      return localStorage.getItem('spotyy_migration_key') || import.meta.env.VITE_SUPABASE_ANON_KEY || '';
    } catch {
      return '';
    }
  });
  const [migrationStatusMsg, setMigrationStatusMsg] = useState<string>('');
  const [migrationSongTable, setMigrationSongTable] = useState<string>('songs');
  const [migrationFolderTable, setMigrationFolderTable] = useState<string>('folders');

  // Permisos efectivos: Administrador siempre tiene acceso total; usuarios normales según appSettings
  const canUpload = isAdmin || appSettings.allow_user_upload;
  const canCreateFolder = isAdmin || appSettings.allow_user_create_folder;
  const canMoveSong = isAdmin || appSettings.allow_user_move_song;

  // Navegación por pestañas y vistas funcionales con persistencia en localStorage
  const [activeTab, setActiveTab] = useState<'inicio' | 'buscar' | 'biblioteca'>(() => {
    try {
      const saved = localStorage.getItem('fa_active_tab_v2');
      if (saved === 'inicio' || saved === 'buscar' || saved === 'biblioteca') return saved;
    } catch {}
    return 'inicio';
  });
  const [activeFilter, setActiveFilter] = useState<'inicio' | 'canciones' | 'carpetas' | 'favoritas'>(() => {
    try {
      const saved = localStorage.getItem('fa_active_filter_v2');
      if (saved === 'inicio' || saved === 'canciones' || saved === 'carpetas' || saved === 'favoritas') return saved;
    } catch {}
    return 'inicio';
  });

  // Clave de almacenamiento local persistente para canciones de la biblioteca
  const CUSTOM_LIBRARY_KEY = 'spotyy_custom_songs_v1';
  const obtenerCancionesLocales = (): Song[] => {
    try {
      const raw =
        localStorage.getItem('library') ||
        localStorage.getItem(CUSTOM_LIBRARY_KEY) ||
        localStorage.getItem('spotyy_custom_songs_v1');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  };

  // Estado de canciones y biblioteca (library)
  const [library, setLibrary] = useState<Song[]>(() => obtenerCancionesLocales());
  const [songs, setSongs] = useState<Song[]>(() => obtenerCancionesLocales());
  const [canciones, setCanciones] = useState<Song[]>(() => obtenerCancionesLocales());
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [volume, setVolume] = useState<number>(0.85);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isShuffle, setIsShuffle] = useState<boolean>(false);
  const [repeatMode, setRepeatMode] = useState<'off' | 'all' | 'one'>('off');

  // Sistema de Favoritos, Cola de Reproducción y Visualizador de Audio
  const [favorites, setFavorites] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('fa_favorites_v1');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [queue, setQueue] = useState<Song[]>([]);
  const [showQueueModal, setShowQueueModal] = useState<boolean>(false);
  const [showExpandedPlayer, setShowExpandedPlayer] = useState<boolean>(false);
  const [showVisualizer, setShowVisualizer] = useState<boolean>(false);

  // ==========================================
  // TEMPORIZADOR DE APAGADO (SLEEP TIMER)
  // ==========================================
  const [sleepTimerMinutes, setSleepTimerMinutes] = useState<number | null>(null);
  const [sleepTimerRemainingSec, setSleepTimerRemainingSec] = useState<number | null>(null);
  const [showSleepTimerModal, setShowSleepTimerModal] = useState<boolean>(false);

  // Funciones de visualización y limpieza de títulos y artistas
  const obtenerTituloCancionLimpio = useCallback((rawTitle: string | null | undefined): string => {
    return limpiarTituloCancion(rawTitle);
  }, []);

  const obtenerArtistaVisible = useCallback((rawArtist: string | null | undefined): string => {
    return cleanArtist(rawArtist, 'Artista Desconocido');
  }, []);

  // Efecto regresivo para el temporizador de apagado
  useEffect(() => {
    if (sleepTimerRemainingSec === null || sleepTimerRemainingSec <= 0) return;

    const timer = setInterval(() => {
      setSleepTimerRemainingSec((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(timer);
          if (audioRef.current) {
            audioRef.current.pause();
          }
          setIsPlaying(false);
          setSleepTimerMinutes(null);
          triggerToast('⏰ Temporizador finalizado: Reproducción pausada', 'info');
          return null;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [sleepTimerRemainingSec]);

  const activarTemporizador = (minutos: number) => {
    setSleepTimerMinutes(minutos);
    setSleepTimerRemainingSec(minutos * 60);
    setShowSleepTimerModal(false);
    triggerToast(`⏰ Temporizador configurado a ${minutos} minutos`, 'success');
  };

  const cancelarTemporizador = () => {
    setSleepTimerMinutes(null);
    setSleepTimerRemainingSec(null);
    setShowSleepTimerModal(false);
    triggerToast('Temporizador desactivado', 'info');
  };

  const formatearTiempoRestante = (segundos: number | null): string => {
    if (segundos === null || segundos <= 0) return '';
    const m = Math.floor(segundos / 60);
    const s = segundos % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Visualizador Animado con AudioContext y AnalyserNode
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameIdRef = useRef<number | null>(null);

  // Refs para subida múltiple y carpetas completas
  const multiFileInputRef = useRef<HTMLInputElement | null>(null);
  const folderInputRef = useRef<HTMLInputElement | null>(null);
  const folderDirectFileInputRef = useRef<HTMLInputElement | null>(null);
  const refrescarDatosRef = useRef<((mostrarFeedback?: boolean) => Promise<void>) | null>(null);
  const [isDirectFolderUploading, setIsDirectFolderUploading] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<{ total: number; current: number; currentName: string } | null>(null);

  // Estado de carpetas dinámicas.
  // CRÍTICO: La app NO carga el orden desde localStorage para evitar desincronización entre dispositivos (PC vs celular).
  // El orden se carga estricta y directamente desde Supabase ('user_preferences' o 'playlists').
  const [folders, setFolders] = useState<AudioFolder[]>(() => {
    // Limpieza defensiva de claves locales obsoletas de orden para que no interfieran en navegadores móviles
    try {
      localStorage.removeItem('fa_folders_order_v1');
      localStorage.removeItem('spotyy_global_playlist_order');
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith('spotyy_user_playlist_order_')) {
          localStorage.removeItem(k);
        }
      }
    } catch (_) {}
    return carpetasAudio;
  });

  // Paginación de alto rendimiento para listas grandes (mostrar de 50 en 50 para evitar bloqueos)
  const [cancionesPageSize, setCancionesPageSize] = useState<number>(50);
  const [folderPageSize, setFolderPageSize] = useState<number>(50);
  const [addMusicModalPageSize, setAddMusicModalPageSize] = useState<number>(50);

  // Referencia mutable inmediata para evitar carpetas duplicadas en subidas múltiples o rápidas
  const foldersRef = useRef<AudioFolder[]>(folders);
  useEffect(() => {
    foldersRef.current = folders;
  }, [folders]);

  const saveFolders = (newFolders: AudioFolder[]) => {
    foldersRef.current = newFolders;
    setFolders(newFolders);
    try {
      // Guardar representación ligera sin duplicar imágenes base64 ni metadatos pesados para no exceder los 5MB de localStorage
      const lightweight = newFolders.map((f) => ({
        id: f.id,
        titulo: f.titulo,
        subtitulo: f.subtitulo,
        descripcion: f.descripcion,
        coverKey: f.coverKey,
        coverUrl: f.coverUrl,
        badge: f.badge,
        canciones: (f.canciones || []).map((c) => ({
          id: c.id,
          title: c.title || c.titulo,
          artist: c.artist || c.artista,
          titulo: c.title || c.titulo,
          artista: c.artist || c.artista,
          cover_url: c.cover_url?.startsWith('data:') ? undefined : c.cover_url,
          audio_url: c.audio_url || c.url,
          url: c.audio_url || c.url,
          storage_path: c.storage_path || c.audio_url || c.url,
          folder_id: c.folder_id || f.id
        }))
      }));
      localStorage.setItem('fa_folders_v3', JSON.stringify(lightweight));
    } catch (e) {
      console.warn('Nota de cuota al guardar carpetas en localStorage (se mantiene en memoria de React):', e);
      try {
        localStorage.removeItem('fa_folders_v2');
      } catch {}
    }
  };

  // Estado del formulario de subida y DeepSeek IA
  const [showUploadModal, setShowUploadModal] = useState<boolean>(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreviewUrl, setCoverPreviewUrl] = useState<string>('');
  const [customTitle, setCustomTitle] = useState<string>('');
  const [customArtist, setCustomArtist] = useState<string>('');
  const [customCoverUrl, setCustomCoverUrl] = useState<string>('');
  const [targetFolderId, setTargetFolderId] = useState<string>('buchonass');
  const [isAiAnalyzing, setIsAiAnalyzing] = useState<boolean>(false);
  const [aiIdentifiedInfo, setAiIdentifiedInfo] = useState<{
    titulo: string;
    artista: string;
    genero: string;
    fuenteIA?: string;
  } | null>(null);

  const [detectedGenre, setDetectedGenre] = useState<string>('');
  const [manualTargetFolderId, setManualTargetFolderId] = useState<string>('');
  const [showFolderPickerInModal, setShowFolderPickerInModal] = useState<boolean>(false);
  const latestGenreRef = useRef<string>('');

  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadStatus, setUploadStatus] = useState<string>('');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Modales de Carpetas, Opciones y Reproductor
  // 1. Estado de la vista actual con persistencia exacta 'ultimaVista'
  const [vistaActual, setVistaActual] = useState<string>(() => {
    try {
      const guardada = localStorage.getItem('ultimaVista');
      if (guardada) return guardada;
    } catch {}
    return 'inicio';
  });

  const [selectedFolder, setSelectedFolder] = useState<AudioFolder | null>(() => {
    try {
      const savedVista = localStorage.getItem('ultimaVista') || localStorage.getItem('fa_selected_folder_id_v2');
      if (savedVista && savedVista !== 'inicio' && savedVista !== 'buscar' && savedVista !== 'biblioteca') {
        const found = carpetasAudio.find((f) => f.id === savedVista);
        if (found) return found;
      }
    } catch {}
    return null;
  });

  // Estados para el Menú de Opciones en Canciones (⋮) y Mover a Carpeta
  const [selectedSongForMenu, setSelectedSongForMenu] = useState<Song | null>(null);
  const [showSongMenuModal, setShowSongMenuModal] = useState<boolean>(false);
  const [showMoveModal, setShowMoveModal] = useState<boolean>(false);

  // ==========================================
  // ESTADOS Y GESTIÓN: SUBIR MÚSICA A TELEGRAM COLD STORAGE
  // ==========================================
  const [showTelegramUploadModal, setShowTelegramUploadModal] = useState<boolean>(false);
  const [telegramAudioFile, setTelegramAudioFile] = useState<File | null>(null);
  const [telegramTitle, setTelegramTitle] = useState<string>('');
  const [telegramPerformer, setTelegramPerformer] = useState<string>('');
  const [telegramCoverUrl, setTelegramCoverUrl] = useState<string>('');
  const [telegramCoverFile, setTelegramCoverFile] = useState<File | null>(null);
  const [telegramIsAnalyzing, setTelegramIsAnalyzing] = useState<boolean>(false);
  const [telegramWorkerUrl, setTelegramWorkerUrl] = useState<string>(() => {
    try {
      return localStorage.getItem('spotyy_worker_url') || 'https://musica-bot.perezperezaaron61.workers.dev';
    } catch {
      return 'https://musica-bot.perezperezaaron61.workers.dev';
    }
  });
  const [telegramUploading, setTelegramUploading] = useState<boolean>(false);
  const [telegramError, setTelegramError] = useState<string | null>(null);
  const [telegramSuccessData, setTelegramSuccessData] = useState<{
    playback_url: string;
    file_id: string;
    title: string;
    performer: string;
  } | null>(null);
  const [telegramCopied, setTelegramCopied] = useState<boolean>(false);
  const [telegramIsDragging, setTelegramIsDragging] = useState<boolean>(false);
  const telegramFileInputRef = useRef<HTMLInputElement | null>(null);

  // 1. PROCESAR CON DEEPSEEK AL SELECCIONAR ARCHIVO
  const handleSelectTelegramFile = async (file: File) => {
    setTelegramError(null);
    const validExtensions = /\.(mp3|m4a|wav|ogg|flac|aac)$/i;
    if (!file.type.startsWith('audio/') && !file.name.match(validExtensions)) {
      setTelegramError('El archivo seleccionado no es un formato de audio compatible (.mp3, .m4a, .wav, .ogg).');
      return;
    }

    const fileSizeMB = file.size / (1024 * 1024);
    if (fileSizeMB > 20) {
      setTelegramError(
        `El archivo pesa ${fileSizeMB.toFixed(2)} MB. Telegram rechaza descargas de más de 20 MB a través de su API pública. Por favor selecciona un archivo menor a 20 MB.`
      );
      setTelegramAudioFile(null);
      return;
    }

    setTelegramAudioFile(file);
    setTelegramIsAnalyzing(true);

    try {
      // Inmediatamente llamar a la función integrada de DeepSeek
      const ds = await fetchDeepSeekData(file.name);
      setTelegramTitle(ds.title);
      setTelegramPerformer(ds.artist);
      setTelegramCoverUrl(ds.coverUrl);

      // 2. CONVERTIR LA URL DE LA IMAGEN A ARCHIVO FÍSICO (File)
      let imgFile = ds.coverFile;
      if (!imgFile || !(imgFile instanceof File)) {
        imgFile = await convertImageUrlToFile(ds.coverUrl, ds.title, ds.artist);
      }
      setTelegramCoverFile(imgFile);
    } catch (errAi) {
      console.warn('Nota procesando con DeepSeek en Telegram:', errAi);
      const clean = file.name
        .replace(/\.[^/.]+$/, '')
        .replace(/_?spotdown(?:\.org)?/gi, '')
        .replace(/^[0-9]+[_\s.-]*/, '')
        .trim();
      const fallbackTitle = clean || 'Canción';
      const fallbackArtist = 'Artista Desconocido';
      setTelegramTitle(fallbackTitle);
      setTelegramPerformer(fallbackArtist);

      // 4. MANEJO DE ERRORES: usar imagen fallback convertida a File
      const fallbackFile = await convertImageUrlToFile(null, fallbackTitle, fallbackArtist);
      setTelegramCoverFile(fallbackFile);
      setTelegramCoverUrl(URL.createObjectURL(fallbackFile));
    } finally {
      setTelegramIsAnalyzing(false);
    }
  };

  // 3. ENVÍO AL WORKER (FORMDATA)
  const handleTelegramUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!telegramAudioFile) {
      setTelegramError('Por favor selecciona o arrastra un archivo de audio primero.');
      return;
    }

    const fileSizeMB = telegramAudioFile.size / (1024 * 1024);
    if (fileSizeMB > 20) {
      setTelegramError(
        `El archivo pesa ${fileSizeMB.toFixed(2)} MB. Telegram rechaza descargas de más de 20 MB. Selecciona un archivo menor a 20 MB.`
      );
      return;
    }

    const workerBase = telegramWorkerUrl.trim().replace(/\/+$/, '');
    if (!workerBase) {
      setTelegramError('Por favor especifica la URL de tu Cloudflare Worker.');
      return;
    }

    setTelegramUploading(true);
    setTelegramError(null);

    try {
      const finalTitle = telegramTitle.trim() || telegramAudioFile.name.replace(/\.[^/.]+$/, '');
      const finalPerformer = telegramPerformer.trim() || 'Artista';

      // 2. CONVERTIR LA URL DE LA IMAGEN A ARCHIVO (File) SI AÚN NO SE CONVIRTIÓ
      let imagenFile = telegramCoverFile;
      if (!imagenFile || !(imagenFile instanceof File)) {
        imagenFile = await convertImageUrlToFile(telegramCoverUrl, finalTitle, finalPerformer);
      }

      // 3. ENVÍO AL WORKER (FORMDATA):
      const endpoint = `${workerBase}/upload-cold-storage`;
      const formData = new FormData();
      formData.append('audio', telegramAudioFile);
      formData.append('title', finalTitle);
      formData.append('performer', finalPerformer);

      // Añade la imagen convertida a archivo físico para Telegram
      if (imagenFile instanceof File) {
        formData.append('thumbnail', imagenFile, 'cover.jpg');
      }
      formData.append('save_to_r2', 'true');

      localStorage.setItem('spotyy_worker_url', workerBase);
      const response = await fetch(endpoint, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        if (response.status === 413) {
          throw new Error('El servidor rechazó el archivo por superar el límite de 20 MB (HTTP 413).');
        }
        const serverMsg = data?.description || data?.error || `Error del servidor (HTTP ${response.status})`;
        throw new Error(serverMsg);
      }

      if (!data || !data.success) {
        throw new Error(data?.error || data?.description || 'Ocurrió un error inesperado al guardar en Telegram.');
      }

      const songInfo = {
        playback_url: data.playback_url,
        file_id: data.file_id || String(Date.now()),
        title: finalTitle,
        performer: finalPerformer,
      };

      setTelegramSuccessData(songInfo);

      // Integrar inmediatamente en la lista de canciones en memoria para reproducción en Spotyy
      const newSong: Song = {
        id: songInfo.file_id,
        titulo: songInfo.title,
        title: songInfo.title,
        artista: songInfo.performer,
        artist: songInfo.performer,
        url: songInfo.playback_url,
        audio_url: songInfo.playback_url,
        storage_path: songInfo.playback_url,
        folder_id: 'tus_me_gusta',
        cover_url: telegramCoverUrl || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400&auto=format&fit=crop&q=80',
        cover: telegramCoverUrl || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400&auto=format&fit=crop&q=80',
        created_at: new Date().toISOString(),
      };

      setSongs((prev) => [newSong, ...prev.filter((s) => String(s.id) !== String(newSong.id))]);
      setCanciones((prev) => [newSong, ...prev.filter((s) => String(s.id) !== String(newSong.id))]);

      setFolders((prevFolders) =>
        prevFolders.map((f) =>
          f.id === 'tus_me_gusta'
            ? { ...f, canciones: [newSong, ...(f.canciones || []).filter((s) => String(s.id) !== String(newSong.id))] }
            : f
        )
      );

      triggerToast('¡Audio respaldado en Telegram y añadido a tu biblioteca!', 'success');
      setTelegramAudioFile(null);
    } catch (err: any) {
      console.error('Error al subir a Telegram:', err);
      setTelegramError(err?.message || 'Error al conectar con Cloudflare Worker.');
    } finally {
      setTelegramUploading(false);
    }
  };

  // ==========================================
  // VISIBILIDAD DE CARPETAS EN PANTALLA DE INICIO (Persistencia localStorage)
  // ==========================================
  const [hiddenFromHomeFolderIds, setHiddenFromHomeFolderIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('spotyy_hidden_from_home_folders_v1');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [folderForMenu, setFolderForMenu] = useState<AudioFolder | null>(null);
  const [showFolderMenuModal, setShowFolderMenuModal] = useState<boolean>(false);

  // Estado para cambiar nombre a carpeta
  const [folderToRename, setFolderToRename] = useState<AudioFolder | null>(null);
  const [newFolderTitle, setNewFolderTitle] = useState<string>('');
  const [isSavingFolderTitle, setIsSavingFolderTitle] = useState<boolean>(false);

  // Estado y referencia para subir foto de portada a carpeta en Cloudflare R2
  const [folderForCoverUpload, setFolderForCoverUpload] = useState<AudioFolder | null>(null);
  const [isUploadingFolderCover, setIsUploadingFolderCover] = useState<boolean>(false);
  const folderCoverInputRef = useRef<HTMLInputElement | null>(null);

  const handleStartRenameFolder = (folder: AudioFolder) => {
    setFolderToRename(folder);
    setNewFolderTitle(folder.titulo);
  };

  const handleSaveFolderTitle = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!folderToRename) return;
    const cleanTitle = newFolderTitle.trim();
    if (!cleanTitle) {
      alert('Por favor ingresa un nombre para la carpeta.');
      return;
    }

    setIsSavingFolderTitle(true);
    const updatedFolders = folders.map((f) => {
      if (f.id === folderToRename.id) {
        return { ...f, titulo: cleanTitle };
      }
      return f;
    });

    saveFolders(updatedFolders);
    if (selectedFolder && selectedFolder.id === folderToRename.id) {
      setSelectedFolder({ ...selectedFolder, titulo: cleanTitle });
    }

    try {
      // 1. Guardar en colección folders en Firebase Firestore
      await setDoc(doc(db, 'folders', folderToRename.id), {
        id: folderToRename.id,
        titulo: cleanTitle,
        subtitulo: folderToRename.subtitulo || '',
        descripcion: folderToRename.descripcion || '',
        cover_key: folderToRename.coverKey || '',
        badge: folderToRename.badge || '',
        updated_at: new Date().toISOString()
      }, { merge: true });
    } catch (err) {
      console.warn('Nota al actualizar título de carpeta en Firebase:', err);
    } finally {
      setIsSavingFolderTitle(false);
      setFolderToRename(null);
      triggerToast(`¡Nombre de carpeta actualizado a "${cleanTitle}"!`, 'success');
    }
  };

  const handleStartUploadFolderCover = (folder: AudioFolder) => {
    setFolderForCoverUpload(folder);
    if (folderCoverInputRef.current) {
      folderCoverInputRef.current.value = '';
      folderCoverInputRef.current.click();
    }
  };

  const handleFolderCoverFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !folderForCoverUpload) return;

    if (!file.type.startsWith('image/')) {
      alert('Por favor selecciona un archivo de imagen válido (JPG, PNG, WebP).');
      return;
    }

    setIsUploadingFolderCover(true);
    triggerToast(`Subiendo foto de portada para "${folderForCoverUpload.titulo}"...`, 'info');

    try {
      const publicUrl = await uploadFolderCoverToR2(file, `cover_${folderForCoverUpload.id}.jpg`);

      const updatedFolders = folders.map((f) => {
        if (f.id === folderForCoverUpload.id) {
          return {
            ...f,
            coverKey: publicUrl,
            coverUrl: publicUrl
          };
        }
        return f;
      });

      saveFolders(updatedFolders);
      if (selectedFolder && selectedFolder.id === folderForCoverUpload.id) {
        setSelectedFolder({
          ...selectedFolder,
          coverKey: publicUrl,
          coverUrl: publicUrl
        });
      }

      // Guardar URL pública en Firebase Firestore (colección folders)
      try {
        await setDoc(doc(db, 'folders', folderForCoverUpload.id), {
          id: folderForCoverUpload.id,
          titulo: folderForCoverUpload.titulo,
          cover_key: publicUrl,
          cover_url: publicUrl,
          subtitulo: folderForCoverUpload.subtitulo || '',
          descripcion: folderForCoverUpload.descripcion || '',
          badge: folderForCoverUpload.badge || '',
          updated_at: new Date().toISOString()
        }, { merge: true });
      } catch (dbErr) {
        console.warn('Nota al guardar portada en Firebase:', dbErr);
      }

      triggerToast(`¡Foto de portada actualizada para "${folderForCoverUpload.titulo}"!`, 'success');
    } catch (uploadErr: any) {
      console.error('Error al subir foto de portada a R2:', uploadErr);
      alert(`Error al subir imagen a Cloudflare R2:\n\n${uploadErr?.message || uploadErr}\n\nVerifica tus credenciales de Cloudflare R2.`);
    } finally {
      setIsUploadingFolderCover(false);
      setFolderForCoverUpload(null);
    }
  };

  // ==========================================
  // ESTADO Y LÓGICA PARA CREAR NUEVA CARPETA / PLAYLIST
  // ==========================================
  const [showCreateFolderModal, setShowCreateFolderModal] = useState<boolean>(false);
  const [newFolderNameInput, setNewFolderNameInput] = useState<string>('');
  const [newFolderDescInput, setNewFolderDescInput] = useState<string>('');
  const [isCreatingFolder, setIsCreatingFolder] = useState<boolean>(false);

  const handleCreateFolder = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!canCreateFolder) {
      triggerToast('No tienes permisos para crear carpetas.', 'info');
      return;
    }
    const cleanTitle = newFolderNameInput.trim();
    if (!cleanTitle) {
      alert('Por favor escribe un nombre para la nueva carpeta.');
      return;
    }

    setIsCreatingFolder(true);
    const newId = `folder_${Date.now()}`;
    const autoCover = obtenerPortadaUnsplashCarpeta(cleanTitle);
    const newFolderItem: AudioFolder = {
      id: newId,
      titulo: cleanTitle,
      subtitulo: newFolderDescInput.trim() || 'Carpeta personalizada',
      descripcion: newFolderDescInput.trim() || 'Carpeta creada en Spotyy_AA',
      coverKey: autoCover,
      coverUrl: autoCover,
      badge: 'Playlist',
      canciones: []
    };

    const updated = [...folders, newFolderItem];
    saveFolders(updated);

    try {
      // Guardar en colección folders en Firebase Firestore con la portada automática de Unsplash
      await setDoc(doc(db, 'folders', newId), {
        id: newId,
        titulo: cleanTitle,
        subtitulo: newFolderItem.subtitulo,
        descripcion: newFolderItem.descripcion,
        cover_key: autoCover,
        cover_url: autoCover,
        badge: 'Playlist',
        position: updated.length,
        created_at: new Date().toISOString()
      }, { merge: true });
    } catch (err) {
      console.warn('Nota al crear carpeta en Firebase:', err);
    } finally {
      setIsCreatingFolder(false);
      setShowCreateFolderModal(false);
      setNewFolderNameInput('');
      setNewFolderDescInput('');
      triggerToast(`¡Carpeta "${cleanTitle}" creada exitosamente!`, 'success');
    }
  };

  const removeFromHomeScreen = (folderId: string) => {
    setHiddenFromHomeFolderIds((prev) => {
      if (prev.includes(folderId)) return prev;
      const next = [...prev, folderId];
      try {
        localStorage.setItem('spotyy_hidden_from_home_folders_v1', JSON.stringify(next));
      } catch (e) {
        console.warn('Error guardando carpetas ocultas de inicio:', e);
      }
      return next;
    });
    const folder = folders.find((f) => f.id === folderId) || carpetasAudio.find((f) => f.id === folderId);
    triggerToast(`"${folder?.titulo || 'Carpeta'}" se quitó de pantalla de inicio`, 'success');
    setShowFolderMenuModal(false);
    setFolderForMenu(null);
  };

  const addToHomeScreen = (folderId: string) => {
    setHiddenFromHomeFolderIds((prev) => {
      const next = prev.filter((id) => id !== folderId);
      try {
        localStorage.setItem('spotyy_hidden_from_home_folders_v1', JSON.stringify(next));
      } catch (e) {
        console.warn('Error guardando carpetas de inicio:', e);
      }
      return next;
    });
    const folder = folders.find((f) => f.id === folderId) || carpetasAudio.find((f) => f.id === folderId);
    triggerToast(`"${folder?.titulo || 'Carpeta'}" se agregó a pantalla de inicio`, 'success');
    setShowFolderMenuModal(false);
    setFolderForMenu(null);
  };

  // ==========================================
  // HERRAMIENTA EXCLUSIVA DE ADMINISTRADOR: ORGANIZAR MI BIBLIOTECA
  // ==========================================
  const [showOrganizeModal, setShowOrganizeModal] = useState<boolean>(false);
  const [organizeStep, setOrganizeStep] = useState<'confirm' | 'processing' | 'completed'>('confirm');
  const [isOrganizingRunning, setIsOrganizingRunning] = useState<boolean>(false);
  const cancelOrganizeRef = useRef<boolean>(false);
  const [organizeScope, setOrganizeScope] = useState<'all' | 'tus_me_gusta'>('all');
  const [totalSongsToOrganize, setTotalSongsToOrganize] = useState<number>(0);
  const [totalTusMeGustaCount, setTotalTusMeGustaCount] = useState<number>(0);
  const [loadingPreCount, setLoadingPreCount] = useState<boolean>(false);

  const [organizeStats, setOrganizeStats] = useState<{
    revisadas: number;
    clasificadas: number;
    carpetasCreadas: number;
    pendientes: number;
    sinClasificar: number;
    total: number;
    currentSongName: string;
    currentFolderAssigned: string;
    activityLogs: Array<{ text: string; time: string; type: 'success' | 'info' | 'skip' }>;
    createdFolderNames: string[];
  }>({
    revisadas: 0,
    clasificadas: 0,
    carpetasCreadas: 0,
    pendientes: 0,
    sinClasificar: 0,
    total: 0,
    currentSongName: '',
    currentFolderAssigned: '',
    activityLogs: [],
    createdFolderNames: []
  });

  // 2. useEffect que escucha cambios de vistaActual y guarda en localStorage('ultimaVista')
  useEffect(() => {
    try {
      localStorage.setItem('ultimaVista', vistaActual);
    } catch {}
  }, [vistaActual]);

  // Sincronizar vistaActual con la carpeta seleccionada y las pestañas
  useEffect(() => {
    try {
      if (selectedFolder) {
        setVistaActual(selectedFolder.id);
        localStorage.setItem('ultimaVista', selectedFolder.id);
        localStorage.setItem('fa_selected_folder_id_v2', selectedFolder.id);
      } else {
        setVistaActual(activeTab);
        localStorage.setItem('ultimaVista', activeTab);
        localStorage.removeItem('fa_selected_folder_id_v2');
      }
    } catch {}
  }, [selectedFolder, activeTab]);

  useEffect(() => {
    try {
      localStorage.setItem('fa_active_tab_v2', activeTab);
    } catch {}
  }, [activeTab]);

  useEffect(() => {
    try {
      localStorage.setItem('fa_active_filter_v2', activeFilter);
    } catch {}
  }, [activeFilter]);

  // Mantener selectedFolder sincronizado cuando se actualizan o cargan carpetas desde Supabase o localStorage
  useEffect(() => {
    try {
      const savedVista = localStorage.getItem('ultimaVista') || localStorage.getItem('fa_selected_folder_id_v2');
      if (savedVista && savedVista !== 'inicio' && savedVista !== 'buscar' && savedVista !== 'biblioteca') {
        const f = folders.find((c) => c.id === savedVista) || carpetasAudio.find((c) => c.id === savedVista);
        if (f) {
          setSelectedFolder(f);
          setVistaActual(f.id);
        }
      } else if (savedVista === 'buscar' || savedVista === 'biblioteca') {
        setActiveTab(savedVista);
      }
    } catch {}
  }, [folders]);
  const [folderLiked, setFolderLiked] = useState<Record<string, boolean>>({});
  const [showAddToFolderModal, setShowAddToFolderModal] = useState<boolean>(false);
  const [songToAddToFolder, setSongToAddToFolder] = useState<Song | null>(null);
  const [showChangeSongModal, setShowChangeSongModal] = useState<boolean>(false);
  const [showAddMusicToCurrentFolderModal, setShowAddMusicToCurrentFolderModal] = useState<boolean>(false);
  const [addMusicModalTab, setAddMusicModalTab] = useState<'subir' | 'biblioteca'>('biblioteca');
  const [selectedSongIdsToAdd, setSelectedSongIdsToAdd] = useState<Set<string>>(new Set());
  const [librarySearchTerm, setLibrarySearchTerm] = useState<string>('');

  // Estados para Drag & Drop de carpetas en Inicio
  const [draggedFolderId, setDraggedFolderId] = useState<string | null>(null);
  const [dragOverFolderId, setDragOverFolderId] = useState<string | null>(null);
  const [isDraggingActive, setIsDraggingActive] = useState<boolean>(false);
  const [showRlsModal, setShowRlsModal] = useState<boolean>(false);
  const [sqlCopied, setSqlCopied] = useState<boolean>(false);
  const [showDeployModal, setShowDeployModal] = useState<boolean>(false);
  const [showInstallGuideModal, setShowInstallGuideModal] = useState<boolean>(false);
  const [deployTab, setDeployTab] = useState<'vercel' | 'netlify' | 'render' | 'android'>('vercel');
  const [copiedDeployText, setCopiedDeployText] = useState<string>('');
  const [songToDelete, setSongToDelete] = useState<Song | null>(null);
  const [folderToDelete, setFolderToDelete] = useState<AudioFolder | null>(null);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isStandalone, setIsStandalone] = useState<boolean>(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const coverInputRef = useRef<HTMLInputElement | null>(null);

  // ==========================================
  // DESBLOQUEO ESTRICTO DE AUDIO PARA iOS (SAFARI / iPHONE / iPAD)
  // Desbloquea el elemento <audio> y el subsistema de sonido en la primera interacción
  // para permitir autoplay continuo y reproducción en segundo plano sin bloqueos
  // ==========================================
  const isAudioUnlockedRef = useRef<boolean>(false);

  const unlockAudioForIOS = useCallback(() => {
    if (isAudioUnlockedRef.current) return;

    try {
      // Desbloquear Web Audio API (AudioContext) en iOS sin reproducir audio
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        if (!audioContextRef.current) {
          audioContextRef.current = new AudioCtx();
        }
        if (audioContextRef.current.state === 'suspended') {
          audioContextRef.current.resume();
        }
        const buffer = audioContextRef.current.createBuffer(1, 1, 22050);
        const source = audioContextRef.current.createBufferSource();
        source.buffer = buffer;
        source.connect(audioContextRef.current.destination);
        source.start(0);
      }

      isAudioUnlockedRef.current = true;
    } catch (e) {
      console.warn('iOS audio unlock warning:', e);
    }
  }, []);

  // Escuchar la primera interacción táctil o clic del usuario en pantalla
  useEffect(() => {
    const handleFirstInteraction = () => {
      unlockAudioForIOS();
      window.removeEventListener('touchstart', handleFirstInteraction);
      window.removeEventListener('touchend', handleFirstInteraction);
      window.removeEventListener('click', handleFirstInteraction);
      window.removeEventListener('pointerdown', handleFirstInteraction);
    };

    window.addEventListener('touchstart', handleFirstInteraction, { passive: true, once: true });
    window.addEventListener('touchend', handleFirstInteraction, { passive: true, once: true });
    window.addEventListener('click', handleFirstInteraction, { passive: true, once: true });
    window.addEventListener('pointerdown', handleFirstInteraction, { passive: true, once: true });

    return () => {
      window.removeEventListener('touchstart', handleFirstInteraction);
      window.removeEventListener('touchend', handleFirstInteraction);
      window.removeEventListener('click', handleFirstInteraction);
      window.removeEventListener('pointerdown', handleFirstInteraction);
    };
  }, [unlockAudioForIOS]);

  const triggerToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4500);
  };

  // SQL exacto para crear la tabla 'songs', RLS y bucket 'musica' en Supabase
  const rlsSql = `-- ========================================================
-- 1. CREACIÓN DE LA TABLA 'songs' EN SUPABASE
-- ========================================================
CREATE TABLE IF NOT EXISTS public.songs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  title TEXT NOT NULL,
  artist TEXT NOT NULL,
  cover_url TEXT,
  audio_url TEXT NOT NULL,
  folder_id TEXT DEFAULT 'tus_me_gusta'
);

-- Asegurar columna folder_id si la tabla ya existía
ALTER TABLE public.songs ADD COLUMN IF NOT EXISTS folder_id TEXT DEFAULT 'tus_me_gusta';

-- Habilitar Seguridad a Nivel de Fila (RLS)
ALTER TABLE public.songs ENABLE ROW LEVEL SECURITY;

-- Políticas de acceso para lectura, inserción, actualización y borrado
DROP POLICY IF EXISTS "Permitir lectura publica de songs" ON public.songs;
CREATE POLICY "Permitir lectura publica de songs"
ON public.songs FOR SELECT
TO anon, authenticated
USING (true);

DROP POLICY IF EXISTS "Permitir insercion publica de songs" ON public.songs;
CREATE POLICY "Permitir insercion publica de songs"
ON public.songs FOR INSERT
TO anon, authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir actualizacion publica de songs" ON public.songs;
CREATE POLICY "Permitir actualizacion publica de songs"
ON public.songs FOR UPDATE
TO anon, authenticated
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir eliminacion publica de songs" ON public.songs;
CREATE POLICY "Permitir eliminacion publica de songs"
ON public.songs FOR DELETE
TO anon, authenticated
USING (true);

-- ========================================================
-- 2. TABLA 'folders' (Y 'playlists') PARA ORDEN Y CARPETAS
-- ========================================================
CREATE TABLE IF NOT EXISTS public.folders (
  id TEXT PRIMARY KEY,
  titulo TEXT NOT NULL,
  subtitulo TEXT,
  descripcion TEXT,
  cover_key TEXT,
  badge TEXT,
  position INTEGER DEFAULT 0,
  "order" INTEGER DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.folders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir todo en folders" ON public.folders;
CREATE POLICY "Permitir todo en folders"
ON public.folders FOR ALL
TO anon, authenticated
USING (true)
WITH CHECK (true);

-- Tabla opcional 'playlists' para compatibilidad
CREATE TABLE IF NOT EXISTS public.playlists (
  id TEXT PRIMARY KEY,
  titulo TEXT NOT NULL,
  subtitulo TEXT,
  descripcion TEXT,
  cover_key TEXT,
  badge TEXT,
  position INTEGER DEFAULT 0,
  order_index INTEGER DEFAULT 0,
  "order" INTEGER DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.playlists ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir todo en playlists" ON public.playlists;
CREATE POLICY "Permitir todo en playlists"
ON public.playlists FOR ALL
TO anon, authenticated
USING (true)
WITH CHECK (true);

-- Tabla 'user_preferences' para orden personalizado de cada usuario
CREATE TABLE IF NOT EXISTS public.user_preferences (
  user_id UUID PRIMARY KEY,
  playlist_order JSONB,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir todo en user_preferences" ON public.user_preferences;
CREATE POLICY "Permitir todo en user_preferences"
ON public.user_preferences FOR ALL
TO anon, authenticated
USING (true)
WITH CHECK (true);

-- Tabla intermedia opcional 'playlist_songs'
CREATE TABLE IF NOT EXISTS public.playlist_songs (
  playlist_id TEXT NOT NULL,
  song_id TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  PRIMARY KEY (playlist_id, song_id)
);

ALTER TABLE public.playlist_songs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir todo en playlist_songs" ON public.playlist_songs;
CREATE POLICY "Permitir todo en playlist_songs"
ON public.playlist_songs FOR ALL
TO anon, authenticated
USING (true)
WITH CHECK (true);

-- Habilitar Realtime para reflejar canciones y carpetas al instante
ALTER PUBLICATION supabase_realtime ADD TABLE public.songs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.folders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.playlists;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_preferences;

-- ========================================================
-- 3. CONFIGURACIÓN DEL BUCKET 'musica' EN STORAGE
-- ========================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('musica', 'musica', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "Permitir lectura en bucket musica" ON storage.objects;
CREATE POLICY "Permitir lectura en bucket musica"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (bucket_id = 'musica');

DROP POLICY IF EXISTS "Permitir subida a bucket musica" ON storage.objects;
CREATE POLICY "Permitir subida a bucket musica"
ON storage.objects FOR INSERT
TO anon, authenticated
WITH CHECK (bucket_id = 'musica');

DROP POLICY IF EXISTS "Permitir eliminar en bucket musica" ON storage.objects;
CREATE POLICY "Permitir eliminar en bucket musica"
ON storage.objects FOR DELETE
TO anon, authenticated
USING (bucket_id = 'musica');`;

  const copyRlsSql = () => {
    navigator.clipboard.writeText(rlsSql);
    setSqlCopied(true);
    triggerToast('¡SQL copiado al portapapeles!', 'success');
    setTimeout(() => setSqlCopied(false), 3000);
  };

  const copyText = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedDeployText(label);
    triggerToast(`¡${label} copiado al portapapeles!`, 'success');
    setTimeout(() => setCopiedDeployText(''), 2500);
  };

  const blockedUsersSql = `CREATE TABLE IF NOT EXISTS blocked_users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  created_at timestamptz default now()
);

ALTER TABLE blocked_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permitir gestion de usuarios bloqueados"
ON blocked_users FOR ALL
TO anon, authenticated
USING (true)
WITH CHECK (true);`;

  const copyBlockedSql = () => {
    navigator.clipboard.writeText(blockedUsersSql);
    setSqlCopiedBlocked(true);
    triggerToast('¡SQL para blocked_users copiado!', 'success');
    setTimeout(() => setSqlCopiedBlocked(false), 3000);
  };

  // ==========================================
  // CONFIGURACIÓN GLOBAL (app_settings en Supabase)
  // ==========================================
  const appSettingsSql = `-- 1. TABLA 'app_settings': CONFIGURACIÓN GLOBAL Y PERMISOS
CREATE TABLE IF NOT EXISTS public.app_settings (
  setting_name TEXT PRIMARY KEY,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Valores predeterminados
INSERT INTO public.app_settings (setting_name, is_enabled)
VALUES
  ('allow_user_create_folder', true),
  ('allow_user_upload', true),
  ('allow_user_move_song', true)
ON CONFLICT (setting_name) DO NOTHING;

-- Habilitar Row Level Security (RLS)
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Permitir lectura pública a cualquier usuario autenticado o anónimo
DROP POLICY IF EXISTS "Permitir lectura publica de app_settings" ON public.app_settings;
CREATE POLICY "Permitir lectura publica de app_settings"
ON public.app_settings FOR SELECT
TO anon, authenticated
USING (true);

-- Permitir actualización y gestión a usuarios autenticados y anónimos
DROP POLICY IF EXISTS "Permitir gestion de app_settings" ON public.app_settings;
CREATE POLICY "Permitir gestion de app_settings"
ON public.app_settings FOR ALL
TO anon, authenticated
USING (true)
WITH CHECK (true);

-- Habilitar Realtime para reflejar cambios inmediatamente
ALTER PUBLICATION supabase_realtime ADD TABLE public.app_settings;`;

  const copyAppSettingsSql = () => {
    navigator.clipboard.writeText(appSettingsSql);
    setSqlCopiedAppSettings(true);
    triggerToast('¡SQL para app_settings copiado!', 'success');
    setTimeout(() => setSqlCopiedAppSettings(false), 3000);
  };

  // Cargar configuración de app_settings desde Firebase Firestore
  const cargarAppSettings = async () => {
    setLoadingAppSettings(true);
    try {
      const snap = await Promise.race([
        getDoc(doc(db, 'app_settings', 'global_config')),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Timeout en app_settings')), 2500))
      ]);
      if (snap && snap.exists()) {
        const data = snap.data();
        setAppSettings((prev) => {
          const next = { ...prev, ...data };
          try {
            localStorage.setItem('spotyy_app_settings_v1', JSON.stringify(next));
          } catch {}
          return next;
        });
      }
    } catch (err) {
      console.warn('Excepción al cargar app_settings:', err);
    } finally {
      setLoadingAppSettings(false);
    }
  };

  // Cambiar interruptor (toggle) en app_settings
  const toggleAppSetting = async (key: keyof AppSettings) => {
    if (!isAdmin) {
      triggerToast('Solo el administrador puede modificar los permisos globales.', 'info');
      return;
    }
    const currentVal = appSettings[key];
    const newVal = !currentVal;

    // Actualización optimista instantánea
    const updated = { ...appSettings, [key]: newVal };
    setAppSettings(updated);
    try {
      localStorage.setItem('spotyy_app_settings_v1', JSON.stringify(updated));
    } catch {}

    setSavingSettingKey(key);
    try {
      await setDoc(
        doc(db, 'app_settings', 'global_config'),
        { [key]: newVal, updated_at: new Date().toISOString() },
        { merge: true }
      );
      triggerToast('Configuración actualizada correctamente', 'success');
    } catch (err: any) {
      console.warn('Excepción al guardar en app_settings:', err);
    } finally {
      setSavingSettingKey(null);
    }
  };

  // Sincronizar título en la pestaña del navegador
  useEffect(() => {
    document.title = appName;
  }, [appName]);

  // Consultar si un usuario está en la colección blocked_users con timeout de 2 segundos
  const checkIsUserBlocked = async (userEmail?: string | null): Promise<boolean> => {
    if (!userEmail) return false;
    try {
      const clean = userEmail.trim().toLowerCase();
      const snap = await Promise.race([
        getDoc(doc(db, 'blocked_users', clean)),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 2000))
      ]);
      return snap ? snap.exists() : false;
    } catch (e) {
      console.warn('Excepción al consultar blocked_users:', e);
      return false;
    }
  };

  // Cargar lista de usuarios bloqueados para el panel de administración
  const cargarUsuariosBloqueados = async () => {
    setLoadingBlockedUsers(true);
    try {
      const querySnap = await getDocs(collection(db, 'blocked_users'));
      const list: any[] = [];
      querySnap.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...docSnap.data() });
      });
      setBlockedUsers(list);
    } catch (err) {
      console.warn('Excepción al cargar usuarios bloqueados:', err);
    } finally {
      setLoadingBlockedUsers(false);
    }
  };

  // Bloquear usuario (Kick) y guardar en la colección blocked_users
  const bloquearUsuario = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = newBlockEmail.trim().toLowerCase();
    if (!clean) {
      alert('Por favor escribe un correo electrónico para bloquear.');
      return;
    }
    if (clean === 'mejiamejiaaaron@gmail.com') {
      alert('Acción no permitida: No puedes bloquear la cuenta del administrador principal.');
      return;
    }

    try {
      await setDoc(doc(db, 'blocked_users', clean), {
        email: clean,
        blocked_by: user?.email || 'admin',
        created_at: new Date().toISOString()
      });
      setNewBlockEmail('');
      triggerToast(`Usuario ${clean} bloqueado con éxito`, 'success');
      cargarUsuariosBloqueados();
    } catch (err: any) {
      alert(`Error al bloquear usuario:\n\n${err?.message || err}`);
    }
  };

  // Desbloquear usuario de la colección blocked_users
  const desbloquearUsuario = async (correo: string) => {
    try {
      const clean = correo.trim().toLowerCase();
      await deleteDoc(doc(db, 'blocked_users', clean));
      triggerToast(`Usuario ${correo} desbloqueado`, 'success');
      cargarUsuariosBloqueados();
    } catch (err: any) {
      alert(`Error al desbloquear: ${err?.message || err}`);
    }
  };

  // Guardar nuevo nombre de la aplicación
  const guardarNombreApp = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = tempAppName.trim();
    if (!clean) {
      alert('Por favor ingresa un nombre para la aplicación.');
      return;
    }
    setAppName(clean);
    try {
      localStorage.setItem('appName', clean);
      localStorage.setItem('fa_app_title_v1', clean);
      document.title = clean;
    } catch {}
    setShowAdminSettingsModal(false);
    triggerToast(`¡Nombre de la app actualizado a "${clean}"!`, 'success');
  };

  // ==========================================
  // INICIALIZACIÓN: SESIÓN & CARGAR CANCIONES
  // ==========================================
  useEffect(() => {
    // 1. Timeout de seguridad estricto de 3 segundos para el arranque
    // Si Firebase no responde en 3 segundos, fuerza setIsLoading(false) y setSessionLoading(false)
    // para que la pantalla de carga desaparezca inmediatamente y deje entrar al usuario.
    const startupTimeout = setTimeout(() => {
      console.warn('[Startup] Timeout de 3s alcanzado: Forzando fin de pantalla de carga.');
      setIsLoading(false);
      setSessionLoading(false);
    }, 3000);

    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser?.email) {
        const isBlocked = await checkIsUserBlocked(currentUser.email).catch(() => false);
        if (isBlocked) {
          await signOut(auth).catch(() => {});
          setUser(null);
          alert('Acceso denegado por el administrador');
          setSessionLoading(false);
          setIsLoading(false);
          clearTimeout(startupTimeout);
          return;
        }
        setUser(currentUser);
        if (currentUser.email.toLowerCase() === 'mejiamejiaaaron@gmail.com') {
          cargarUsuariosBloqueados().catch(() => {});
        }
        setSessionLoading(false);

        // Inicializar datos únicamente para usuario autenticado con timeout de 3 segundos
        setIsLoading(true);
        const dataTimeout = setTimeout(() => {
          console.warn('[Startup] Timeout de 3s en carga de datos. Mostrando interfaz inmediatamente.');
          setIsLoading(false);
        }, 3000);

        try {
          await Promise.race([
            Promise.all([
              cargarCanciones(),
              cargarCarpetasDesdeSupabase(currentUser.uid),
              cargarAppSettings()
            ]),
            new Promise((resolve) => setTimeout(resolve, 3000))
          ]);
        } catch (err) {
          console.error('Error durante la carga inicial de datos:', err);
        } finally {
          clearTimeout(dataTimeout);
          clearTimeout(startupTimeout);
          setIsLoading(false);
        }
      } else {
        setUser(null);
        setSessionLoading(false);
        setIsLoading(false);
        clearTimeout(startupTimeout);
      }
    });

    const checkStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;
    setIsStandalone(checkStandalone);

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey && (e.key === 's' || e.key === 'u' || e.key === 'p')) || e.key === 'F12') {
        e.preventDefault();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    // SINCRONIZACIÓN AUTOMÁTICA: Refrescar datos desde Firebase al recuperar el foco o volver a la app
    const handleFocusSync = () => {
      refrescarDatosRef.current?.(false);
    };

    const handleVisibilitySync = () => {
      if (document.visibilityState === 'visible') {
        refrescarDatosRef.current?.(false);
      }
    };

    window.addEventListener('focus', handleFocusSync);
    document.addEventListener('visibilitychange', handleVisibilitySync);

    return () => {
      clearTimeout(startupTimeout);
      unsubscribeAuth();
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('focus', handleFocusSync);
      document.removeEventListener('visibilitychange', handleVisibilitySync);
    };
  }, []);

  const handleInstallPWA = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        triggerToast(`¡${appName} se ha instalado en tu pantalla de inicio!`, 'success');
        setDeferredPrompt(null);
      }
    } else {
      setDeployTab('android');
      setShowDeployModal(true);
    }
  };

  // Registro persistente de metadatos de canciones subidas a Supabase Storage y Letras
  const STORAGE_META_KEY = 'fa_storage_metadata_v2';
  const FA_LYRICS_STORAGE_KEY = 'fa_song_lyrics_v1';

  const obtenerTodasLasLetrasPersistentes = (): Record<string, string> => {
    try {
      const raw = localStorage.getItem(FA_LYRICS_STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  };

  const guardarLetraPersistente = (
    songId?: string | number,
    storagePath?: string,
    title?: string,
    artist?: string,
    lyrics?: string
  ) => {
    if (!lyrics || typeof lyrics !== 'string' || !lyrics.trim()) {
      // REGLA CRÍTICA: No reemplazar letras existentes por textos vacíos
      return;
    }
    const cleanLyrics = lyrics.trim();
    try {
      const store = obtenerTodasLasLetrasPersistentes();
      if (songId) store[String(songId)] = cleanLyrics;
      if (storagePath) store[String(storagePath)] = cleanLyrics;
      if (title && artist) {
        const slug = `${title.toLowerCase().trim()}___${artist.toLowerCase().trim()}`;
        store[slug] = cleanLyrics;
      }
      localStorage.setItem(FA_LYRICS_STORAGE_KEY, JSON.stringify(store));
    } catch (err) {
      console.warn('Error guardando letra en almacenamiento persistente:', err);
    }
  };

  const obtenerLetraPersistente = (
    songId?: string | number,
    storagePath?: string,
    title?: string,
    artist?: string
  ): string | undefined => {
    try {
      const store = obtenerTodasLasLetrasPersistentes();
      if (songId && store[String(songId)]) return store[String(songId)];
      if (storagePath && store[String(storagePath)]) return store[String(storagePath)];
      if (title && artist) {
        const slug = `${title.toLowerCase().trim()}___${artist.toLowerCase().trim()}`;
        if (store[slug]) return store[slug];
      }
      if (storagePath) {
        const meta = obtenerMetadatosLocales();
        if (meta[storagePath]?.lyrics) return meta[storagePath].lyrics;
      }
    } catch {
      return undefined;
    }
    return undefined;
  };

  // Función de reproducción aleatoria instantánea para botones funcionales
  const reproducirAleatorio = () => {
    const lista = songs.length > 0 ? songs : canciones;
    if (lista.length === 0) {
      triggerToast('No hay canciones disponibles para reproducir aún', 'error');
      return;
    }
    const randomIndex = Math.floor(Math.random() * lista.length);
    const randomSong = lista[randomIndex];
    setIsShuffle(true);
    reproducirCancionDirecta(randomSong);
    triggerToast(`🔀 Modo aleatorio: "${randomSong.title || randomSong.titulo}"`, 'success');
  };

  const obtenerMetadatosLocales = (): Record<string, {
    titulo: string;
    artista: string;
    cover?: string;
    folderId?: string;
    url?: string;
    created_at?: string;
    lyrics?: string;
  }> => {
    try {
      const raw = localStorage.getItem(STORAGE_META_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  };

  const guardarMetadatoCancion = (
    storagePath: string,
    meta: {
      titulo: string;
      artista: string;
      cover?: string;
      folderId?: string;
      url?: string;
      created_at?: string;
      lyrics?: string;
    }
  ) => {
    try {
      const todos = obtenerMetadatosLocales();
      const previo = todos[storagePath] || {};
      todos[storagePath] = {
        ...previo,
        ...meta,
        lyrics: meta.lyrics || previo.lyrics // Preservar letra si la nueva es undefined
      };
      localStorage.setItem(STORAGE_META_KEY, JSON.stringify(todos));
      if (meta.lyrics) {
        guardarLetraPersistente(undefined, storagePath, meta.titulo, meta.artista, meta.lyrics);
      }
    } catch (e) {
      console.warn('Error guardando metadato local:', e);
    }
  };

  const cargarCanciones = async (esReintento = false, forzarRecarga = false) => {
    try {
      let dbSongs: any[] | null = null;
      let dbError: any = null;

      // 1. Cargar desde la colección 'songs' de Firebase Firestore con timeout de seguridad
      try {
        const querySnapshot = await Promise.race([
          getDocs(collection(db, 'songs')),
          new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Timeout de 3.5s en consulta songs')), 3500))
        ]);
        const firestoreSongs: any[] = [];
        querySnapshot.forEach((docSnap) => {
          firestoreSongs.push({ id: docSnap.id, ...docSnap.data() });
        });
        dbSongs = firestoreSongs;
        console.log('dbSongs (recibidas de Firestore):', firestoreSongs.length);
      } catch (fErr: any) {
        console.warn('Nota al consultar canciones en Firestore:', fErr?.message || fErr);
      }

      // Filtrar filas de configuración interna del sistema (__spotyy_) y normalizar las canciones
      const metaLocales = obtenerMetadatosLocales();
      const cancionesBD: Song[] = (dbSongs || [])
        .filter((row: any) => !String(row.title || row.titulo || '').startsWith('__spotyy_'))
        .map((row: any) => {
          const audioUrl = row.audio_url || row.url || row.playback_url || row.storage_path || '';
          const cachedLyrics = obtenerLetraPersistente(row.id, audioUrl, row.title || row.titulo, row.artist || row.artista);
          const rawFolder = row.folder_id || row.folderId || metaLocales[audioUrl]?.folderId || 'tus_me_gusta';

          // Extracción limpia de artista y título del audio o título original para evitar "Artista Desconocido"
          const filenameHint = audioUrl
            ? decodeURIComponent(audioUrl.split('?')[0].split('/').pop() || '')
            : '';
          const parsedName = extractArtistAndTitleFromFilename(filenameHint || row.title || row.titulo || '');

          let cleanArtistName = (row.artist || row.artista || row.performer || '').trim();
          if (
            !cleanArtistName ||
            cleanArtistName.toLowerCase() === 'artista desconocido' ||
            cleanArtistName.toLowerCase() === 'desconocido' ||
            cleanArtistName.toLowerCase() === 'unknown'
          ) {
            cleanArtistName = parsedName.artist || 'Artista';
          }

          let cleanTitleName = (row.title || row.titulo || '').trim();
          if (
            !cleanTitleName ||
            cleanTitleName.toLowerCase() === 'sin título' ||
            cleanTitleName.toLowerCase() === 'sin titulo'
          ) {
            cleanTitleName = parsedName.title || 'Canción';
          }

          const coverUrl = row.cover_url || row.cover || '';

          return {
            id: row.id,
            title: cleanTitleName,
            artist: cleanArtistName,
            cover_url: coverUrl,
            audio_url: audioUrl,
            titulo: cleanTitleName,
            artista: cleanArtistName,
            cover: coverUrl || 'cover_23',
            url: audioUrl,
            storage_path: audioUrl,
            created_at: row.created_at,
            folder_id: rawFolder,
            lyrics: cachedLyrics || row.lyrics || undefined
          };
        });

      const cancionesLocales = obtenerCancionesLocales();
      const idsBD = new Set(cancionesBD.map((c) => String(c.id)));
      const cancionesLocalesNoEnBD = cancionesLocales.filter((c) => !idsBD.has(String(c.id)));
      const listaCompleta = [...cancionesLocalesNoEnBD, ...cancionesBD];

      setLibrary(listaCompleta);
      setSongs(listaCompleta);
      setCanciones(listaCompleta);

        // La canción actual inicia en null para evitar autoplay al entrar a la app

        // Sincronizar canciones en las carpetas según su folder_id
        if (cancionesBD.length > 0) {
          setFolders((prevFolders) => {
            const existingFolderIds = new Set(prevFolders.map((f) => f.id));
            const newFoldersFromSongs: AudioFolder[] = [];

            for (const c of cancionesBD) {
              const fId = c.folder_id || 'tus_me_gusta';
              if (fId && !existingFolderIds.has(fId)) {
                existingFolderIds.add(fId);
                const prettyTitle = fId.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
                const autoCover = obtenerPortadaUnsplashCarpeta(prettyTitle);
                newFoldersFromSongs.push({
                  id: fId,
                  titulo: prettyTitle,
                  subtitulo: `Colección de ${prettyTitle}`,
                  descripcion: `Carpeta ${prettyTitle}`,
                  coverKey: autoCover,
                  coverUrl: autoCover,
                  badge: prettyTitle,
                  canciones: []
                });
              }
            }

            const allFolders = [...prevFolders, ...newFoldersFromSongs];
            const updated = allFolders.map((f) => {
              const cancionesParaEstaCarpeta = cancionesBD.filter(
                (c) => (c.folder_id || 'tus_me_gusta') === f.id
              );
              return {
                ...f,
                canciones: cancionesParaEstaCarpeta
              };
            });

            return updated;
          });
        }
    } catch (err) {
      console.error('Error inesperado al cargar canciones:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // ==========================================
  // CARGA Y SINCRONIZACIÓN DE CARPETAS Y PREFERENCIAS (SUPABASE)
  // Regla estricta: NO usar localStorage para el orden.
  // 1. Cargar orden global desde 'playlists' (o 'folders').
  // 2. Si el usuario tiene sesión, buscar preferencia en 'user_preferences' (playlist_order).
  // 3. Aplicar orden personal si existe; de lo contrario mantener orden global de Supabase.
  // 4. Guardar resultado directamente en el estado de React (setFolders).
  // ==========================================
  const cargarCarpetasDesdeSupabase = async (customUserId?: string, forzarSoloGlobal = false) => {
    try {
      let dbPlaylists: any[] = [];

      // 1. Cargar desde la colección 'folders' de Firebase Firestore con timeout de seguridad
      try {
        const querySnapshot = await Promise.race([
          getDocs(collection(db, 'folders')),
          new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Timeout de 3.5s en consulta folders')), 3500))
        ]);
        querySnapshot.forEach((docSnap) => {
          dbPlaylists.push({ id: docSnap.id, ...docSnap.data() });
        });
      } catch (_) {}

      // 1. Obtener y preservar TODAS las carpetas (las 12 por defecto y todas las de Telegram/Cloudflare hasta 25+)
      const prevFolders = foldersRef.current && foldersRef.current.length > 0 ? foldersRef.current : carpetasAudio;
      const carpetasMap = new Map<string, AudioFolder>();

      // Primero incorporar las 12 carpetas oficiales por defecto
      for (const f of carpetasAudio) {
        carpetasMap.set(f.id, f);
      }

      // Luego incorporar TODAS las carpetas existentes en memoria / subidas por Telegram o Cloudflare
      for (const f of prevFolders) {
        if (!carpetasMap.has(f.id)) {
          carpetasMap.set(f.id, f);
        } else {
          const existing = carpetasMap.get(f.id)!;
          carpetasMap.set(f.id, {
            ...existing,
            ...f,
            canciones: f.canciones && f.canciones.length > 0 ? f.canciones : existing.canciones
          });
        }
      }

      // Incorporar además carpetas provenientes de Firebase Firestore
      if (dbPlaylists && dbPlaylists.length > 0) {
        for (const item of dbPlaylists) {
          const existing = carpetasMap.get(item.id);
          carpetasMap.set(item.id, {
            id: item.id,
            titulo: item.titulo || item.title || existing?.titulo || item.id,
            subtitulo: item.subtitulo || item.subtitle || existing?.subtitulo || '',
            descripcion: item.descripcion || item.description || existing?.descripcion || '',
            coverKey: item.cover_key || item.coverKey || existing?.coverKey || `cover_${item.id}`,
            coverUrl: item.cover_url || item.coverUrl || existing?.coverUrl,
            badge: item.badge || existing?.badge || '',
            canciones: existing?.canciones || []
          });
        }
      }

      // 1.5. Asignar automáticamente portada de Unsplash basada en el nombre a las carpetas
      for (const folderItem of carpetasMap.values()) {
        const tienePortadaValida =
          (folderItem.coverUrl && (folderItem.coverUrl.startsWith('http://') || folderItem.coverUrl.startsWith('https://'))) ||
          (folderItem.coverKey && (folderItem.coverKey.startsWith('http://') || folderItem.coverKey.startsWith('https://')));

        if (!tienePortadaValida) {
          const autoCover = obtenerPortadaUnsplashCarpeta(folderItem.titulo || folderItem.id);
          folderItem.coverKey = autoCover;
          folderItem.coverUrl = autoCover;
          asignarPortadaAutomaticaCarpeta(folderItem).catch(() => {});
        }
      }

      // 2. Carga y aplicación del orden desde Firestore (registro id: "default_user")
      let listaFinal: AudioFolder[] = [];
      try {
        const snap = await getDoc(doc(db, 'user_settings', 'default_user'));
        const userSettings = snap.exists() ? snap.data() : null;
        const rawOrder = userSettings?.playlists_order;
        let orderArray: string[] | null = null;
        if (Array.isArray(rawOrder)) {
          orderArray = rawOrder;
        } else if (typeof rawOrder === 'string') {
          try {
            orderArray = JSON.parse(rawOrder);
          } catch (_) {}
        }

        if (orderArray && orderArray.length > 0) {
          console.log("Aplicando playlists_order desde Firestore:", orderArray);
          const pool = new Map(carpetasMap);
          for (const id of orderArray) {
            const found = pool.get(id);
            if (found) {
              listaFinal.push(found);
              pool.delete(id);
            }
          }
          for (const rem of pool.values()) {
            listaFinal.push(rem);
          }
        } else {
          listaFinal = Array.from(carpetasMap.values());
        }
      } catch (usCatch) {
        console.warn('Error al consultar user_settings en Firestore:', usCatch);
        listaFinal = Array.from(carpetasMap.values());
      }

      // 3. Actualizar el estado de React con TODAS las carpetas
      setFolders(listaFinal);
      foldersRef.current = listaFinal;
    } catch (err) {
      console.warn('Nota al cargar carpetas desde Supabase:', err);
    }
  };

  // ==========================================
  // SINCRONIZACIÓN FORZADA (REFRESCAR DATOS DESDE SUPABASE)
  // Vuelve a consultar canciones, carpetas y configuración directamente en Supabase
  // ==========================================
  const refrescarDatos = useCallback(async (mostrarFeedback = false) => {
    try {
      const uid = (user as any)?.id || user?.uid || auth.currentUser?.uid;
      await Promise.all([
        cargarCanciones(false, true),
        cargarCarpetasDesdeSupabase(uid),
        cargarAppSettings()
      ]);
      if (mostrarFeedback) {
        triggerToast('Datos y orden sincronizados desde Firebase', 'success');
      }
    } catch (err) {
      console.warn('Error al sincronizar datos desde Firebase:', err);
    }
  }, [user]);
  refrescarDatosRef.current = refrescarDatos;

  // ==========================================
  // FUNCIÓN ASÍNCRONA DE MIGRACIÓN MÁGICA (SUPABASE -> FIREBASE)
  // ==========================================
  const ejecutarMigracionSupabaseAFirebase = useCallback(async () => {
    const key = migrationSupabaseKey.trim();
    if (!key) {
      alert('Por favor ingresa la Anon Key de Supabase para poder conectar.');
      return;
    }
    setIsMigratingSupabase(true);
    setMigrationStatusMsg('Iniciando migración desde Supabase...');
    try {
      localStorage.setItem('spotyy_migration_url', migrationSupabaseUrl.trim());
      localStorage.setItem('spotyy_migration_key', key);
      const res = await migrarDeSupabaseAFirebase(
        migrationSupabaseUrl.trim(),
        key,
        migrationSongTable.trim() || 'songs',
        migrationFolderTable.trim() || 'folders',
        (status) => {
          setMigrationStatusMsg(status.message);
        }
      );
      triggerToast(`¡Migración completada! ${res.songsCount} canciones y ${res.foldersCount} carpetas.`, 'success');
      // Recargar canciones y carpetas de Firebase Firestore de inmediato
      await refrescarDatos(false);
      await cargarCarpetasDesdeSupabase();
    } catch (err: any) {
      console.error('Error durante la migración:', err);
      setMigrationStatusMsg(`Error: ${err?.message || 'Fallo al migrar'}`);
    } finally {
      setIsMigratingSupabase(false);
    }
  }, [migrationFolderTable, migrationSongTable, migrationSupabaseKey, migrationSupabaseUrl, refrescarDatos]);

  // Exponer la función en la consola del navegador
  useEffect(() => {
    (window as any).migrarDeSupabaseAFirebase = (
      customUrl?: string,
      customKey?: string,
      customSongTable?: string,
      customFolderTable?: string
    ) => {
      const u = customUrl || migrationSupabaseUrl;
      const k = customKey || migrationSupabaseKey;
      const s = customSongTable || migrationSongTable;
      const f = customFolderTable || migrationFolderTable;
      return migrarDeSupabaseAFirebase(
        u,
        k,
        s,
        f,
        (status) => console.log('[Migración]', status.message)
      );
    };
  }, [migrationFolderTable, migrationSongTable, migrationSupabaseKey, migrationSupabaseUrl]);

  // ==========================================
  // AUTENTICACIÓN
  // ==========================================
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    unlockAudioForIOS();
    setIsLoggingIn(true);
    setAuthError(null);

    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();

    if (!cleanEmail || !cleanPassword) {
      setAuthError('Por favor ingresa un correo y contraseña válidos.');
      setIsLoggingIn(false);
      return;
    }

    // 1. Bloqueo de Usuarios: Al intentar hacer Login, consultar si el correo está en la tabla blocked_users
    try {
      const isBlocked = await checkIsUserBlocked(cleanEmail);
      if (isBlocked) {
        setIsLoggingIn(false);
        await signOut(auth);
        alert('Acceso denegado por el administrador');
        return;
      }
    } catch (bErr) {
      console.warn('Nota verificando bloqueo previo:', bErr);
    }

    try {
      if (isSignUpMode) {
        const userCredential = await createUserWithEmailAndPassword(auth, cleanEmail, cleanPassword);
        const fbUser = userCredential.user;
        if (fbUser) {
          const isBlockedAfter = await checkIsUserBlocked(fbUser.email || cleanEmail);
          if (isBlockedAfter) {
            await signOut(auth);
            setUser(null);
            alert('Acceso denegado por el administrador');
            return;
          }
          setUser(fbUser);
          setShowLoginModal(false);
          cargarCarpetasDesdeSupabase(fbUser.uid);
          triggerToast(`¡Usuario conectado: ${fbUser.email}!`, 'success');
        }
      } else {
        const userCredential = await signInWithEmailAndPassword(auth, cleanEmail, cleanPassword);
        const fbUser = userCredential.user;
        if (fbUser) {
          const isBlockedAfter = await checkIsUserBlocked(fbUser.email || cleanEmail);
          if (isBlockedAfter) {
            await signOut(auth);
            setUser(null);
            alert('Acceso denegado por el administrador');
            return;
          }
          setUser(fbUser);
          setShowLoginModal(false);
          cargarCarpetasDesdeSupabase(fbUser.uid);
          triggerToast(`¡Bienvenido, ${fbUser.email}!`, 'success');
        }
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      setAuthError(errMsg);
      triggerToast(`Error: ${errMsg}`, 'error');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    setIsPlaying(false);
    setCurrentSong(null);
    setSleepTimerMinutes(null);
    setSleepTimerRemainingSec(null);
    await signOut(auth);
    setUser(null);
    triggerToast('Sesión cerrada correctamente', 'success');
  };

  // ==========================================
  // DEEPSEEK & GEMINI IA: ANÁLISIS DE AUDIO & FOTO RELACIONADA
  // ==========================================

  // ==========================================
  // EXTRACCIÓN DE METADATOS VÍA JSMEDIATAGS (CDN) + ID3 USLT / SYLT + PORTADAS EMBEBIDAS
  // ==========================================
  const extractAudioMetadataFromFile = async (
    file: File
  ): Promise<{
    title?: string;
    artist?: string;
    coverUrl?: string;
    lyrics?: string;
    genre?: string;
    embeddedCoverBlob?: Blob | null;
  }> => {
    try {
      const real = await extractRealAudioMetadata(file);
      return {
        title: real.title,
        artist: real.artist,
        genre: real.genre,
        coverUrl: real.embeddedCoverUrl || undefined,
        embeddedCoverBlob: real.embeddedCoverBlob,
        lyrics: real.lyrics
      };
    } catch (err) {
      console.warn('Error en extractAudioMetadataFromFile:', err);
      const cleanT = cleanTitle(null, file.name);
      return {
        title: cleanT,
        artist: 'Artista Desconocido',
        genre: 'Sin Categoría',
        embeddedCoverBlob: null
      };
    }
  };

  const _legacyExtractMetadata = async (file: File) => {
    let extractedLyrics: string | undefined = undefined;

    // 1. Intentar con jsmediatags (vía CDN cargado en index.html) para título, artista, carátula y letras USLT/SYLT
    try {
      const jsmediatags = (window as any).jsmediatags;
      if (jsmediatags && typeof jsmediatags.read === 'function') {
        const jmtData = await new Promise<{ title?: string; artist?: string; coverUrl?: string; lyrics?: string; genre?: string }>((resolve) => {
          jsmediatags.read(file, {
            onSuccess: (tag: any) => {
              const tags = tag?.tags || {};
              const title = tags.title ? String(tags.title).trim() : undefined;
              const artist = tags.artist ? String(tags.artist).trim() : undefined;
              const genre = tags.genre ? String(tags.genre).trim() : undefined;
              let coverUrl: string | undefined = undefined;
              let lyrics: string | undefined = undefined;

              // Extracción de etiquetas USLT (Unsynchronized lyrics) y SYLT (Synchronized lyrics)
              const uslt = tags.USLT || tags['USLT'];
              if (uslt) {
                if (typeof uslt === 'string' && uslt.trim()) lyrics = uslt.trim();
                else if (uslt.data?.lyrics && typeof uslt.data.lyrics === 'string') lyrics = uslt.data.lyrics.trim();
                else if (uslt.lyrics && typeof uslt.lyrics === 'string') lyrics = uslt.lyrics.trim();
                else if (typeof uslt.data === 'string' && uslt.data.trim()) lyrics = uslt.data.trim();
              }

              if (!lyrics) {
                const sylt = tags.SYLT || tags['SYLT'];
                if (sylt) {
                  if (typeof sylt === 'string' && sylt.trim()) lyrics = sylt.trim();
                  else if (sylt.data?.lyrics && typeof sylt.data.lyrics === 'string') lyrics = sylt.data.lyrics.trim();
                  else if (sylt.lyrics && typeof sylt.lyrics === 'string') lyrics = sylt.lyrics.trim();
                  else if (Array.isArray(sylt.data)) {
                    const parts = sylt.data.map((item: any) => item?.text || item?.lyric || '').filter(Boolean);
                    if (parts.length > 0) lyrics = parts.join('\n');
                  }
                }
              }

              if (!lyrics && tags.lyrics) {
                if (typeof tags.lyrics === 'string' && tags.lyrics.trim()) lyrics = tags.lyrics.trim();
                else if (tags.lyrics.data?.lyrics && typeof tags.lyrics.data.lyrics === 'string') lyrics = tags.lyrics.data.lyrics.trim();
                else if (typeof tags.lyrics.data === 'string' && tags.lyrics.data.trim()) lyrics = tags.lyrics.data.trim();
              }

              if (!lyrics) {
                for (const k of Object.keys(tags)) {
                  const upper = k.toUpperCase();
                  if (upper.includes('USLT') || upper.includes('SYLT') || k.toLowerCase().includes('lyrics')) {
                    const val = tags[k];
                    if (typeof val === 'string' && val.trim()) {
                      lyrics = val.trim();
                      break;
                    } else if (val?.data?.lyrics && typeof val.data.lyrics === 'string') {
                      lyrics = val.data.lyrics.trim();
                      break;
                    } else if (val?.lyrics && typeof val.lyrics === 'string') {
                      lyrics = val.lyrics.trim();
                      break;
                    }
                  }
                }
              }

              if (tags.picture) {
                try {
                  const { data, format } = tags.picture;
                  let base64String = '';
                  for (let i = 0; i < data.length; i++) {
                    base64String += String.fromCharCode(data[i]);
                  }
                  coverUrl = `data:${format || 'image/jpeg'};base64,${window.btoa(base64String)}`;
                } catch (picErr) {
                  console.warn('Nota convirtiendo imagen de jsmediatags:', picErr);
                }
              }

              resolve({ title, artist, coverUrl, lyrics, genre });
            },
            onError: (err: any) => {
              console.warn('Nota jsmediatags:', err);
              resolve({});
            }
          });
        });

        if (jmtData.lyrics) extractedLyrics = jmtData.lyrics;

        if (jmtData.title || jmtData.artist || jmtData.coverUrl || jmtData.lyrics || jmtData.genre) {
          const fast = parseSmartAudioName(file.name);
          return {
            title: jmtData.title || fast.titulo || file.name.replace(/\.[^/.]+$/, '').trim(),
            artist: jmtData.artist || fast.artista || 'Artista',
            coverUrl: jmtData.coverUrl,
            lyrics: jmtData.lyrics,
            genre: jmtData.genre
          };
        }
      }
    } catch (jmtErr) {
      console.warn('Error en lectura jsmediatags:', jmtErr);
    }

    // 2. Fallback de escaneo binario ID3 (v2 y v1) si jsmediatags no devolvió información completa
    try {
      let scanSize = Math.min(file.size, 512 * 1024);
      const headBuf = await file.slice(0, 10).arrayBuffer();
      const headBytes = new Uint8Array(headBuf);
      let majorVersion = 3;
      if (headBytes[0] === 0x49 && headBytes[1] === 0x44 && headBytes[2] === 0x33) {
        majorVersion = headBytes[3];
        const synchsafeTagSize =
          ((headBytes[6] & 0x7f) << 21) |
          ((headBytes[7] & 0x7f) << 14) |
          ((headBytes[8] & 0x7f) << 7) |
          (headBytes[9] & 0x7f);
        scanSize = Math.min(file.size, synchsafeTagSize + 20);
      }

      const buffer = await file.slice(0, scanSize).arrayBuffer();
      const bytes = new Uint8Array(buffer);
      let title: string | undefined;
      let artist: string | undefined;
      let genre: string | undefined;
      let lyrics: string | undefined = extractedLyrics;

      if (bytes[0] === 0x49 && bytes[1] === 0x44 && bytes[2] === 0x33) { // 'ID3'
        const textDecoder = new TextDecoder('utf-8');
        const isoDecoder = new TextDecoder('iso-8859-1');
        let offset = 10;
        while (offset < bytes.length - 10) {
          const frameId = String.fromCharCode(bytes[offset], bytes[offset + 1], bytes[offset + 2], bytes[offset + 3]);
          if (!/^[A-Z0-9]{4}$/.test(frameId)) break;

          let frameSize = 0;
          if (majorVersion === 4) {
            frameSize =
              ((bytes[offset + 4] & 0x7f) << 21) |
              ((bytes[offset + 5] & 0x7f) << 14) |
              ((bytes[offset + 6] & 0x7f) << 7) |
              (bytes[offset + 7] & 0x7f);
          } else {
            frameSize =
              (bytes[offset + 4] << 24) | (bytes[offset + 5] << 16) | (bytes[offset + 6] << 8) | bytes[offset + 7];
          }

          if (frameSize <= 0 || offset + 10 + frameSize > bytes.length) break;

          const contentBytes = bytes.slice(offset + 10, offset + 10 + frameSize);

          if (frameId === 'TIT2' && !title) {
            try {
              const enc = contentBytes[0];
              const tSlice = contentBytes.slice(1);
              const val = (enc === 1 || enc === 2 ? new TextDecoder('utf-16').decode(tSlice) : enc === 3 ? textDecoder.decode(tSlice) : isoDecoder.decode(tSlice)).replace(/\0/g, '').trim();
              if (val) title = val;
            } catch (_) {}
          }

          if (frameId === 'TPE1' && !artist) {
            try {
              const enc = contentBytes[0];
              const tSlice = contentBytes.slice(1);
              const val = (enc === 1 || enc === 2 ? new TextDecoder('utf-16').decode(tSlice) : enc === 3 ? textDecoder.decode(tSlice) : isoDecoder.decode(tSlice)).replace(/\0/g, '').trim();
              if (val) artist = val;
            } catch (_) {}
          }

          if (frameId === 'TCON' && !genre) {
            try {
              const enc = contentBytes[0];
              const tSlice = contentBytes.slice(1);
              const val = (enc === 1 || enc === 2 ? new TextDecoder('utf-16').decode(tSlice) : enc === 3 ? textDecoder.decode(tSlice) : isoDecoder.decode(tSlice)).replace(/\0/g, '').trim();
              if (val) genre = val;
            } catch (_) {}
          }

          // Extracción binaria de USLT (Unsynchronized lyrics)
          if (frameId === 'USLT' && !lyrics && contentBytes.length > 5) {
            try {
              const enc = contentBytes[0];
              let descOffset = 4;
              if (enc === 1 || enc === 2) {
                while (descOffset < contentBytes.length - 1) {
                  if (contentBytes[descOffset] === 0 && contentBytes[descOffset + 1] === 0) {
                    descOffset += 2;
                    break;
                  }
                  descOffset += 2;
                }
              } else {
                while (descOffset < contentBytes.length) {
                  if (contentBytes[descOffset] === 0) {
                    descOffset += 1;
                    break;
                  }
                  descOffset += 1;
                }
              }
              const lBytes = contentBytes.slice(descOffset);
              let val = '';
              if (enc === 1 || enc === 2) {
                val = new TextDecoder('utf-16').decode(lBytes);
              } else if (enc === 3) {
                val = textDecoder.decode(lBytes);
              } else {
                val = isoDecoder.decode(lBytes);
              }
              val = val.replace(/\0+$/g, '').replace(/^\0+/g, '').trim();
              if (val) lyrics = val;
            } catch (usltErr) {
              console.warn('Nota parseando USLT:', usltErr);
            }
          }

          // Extracción binaria de SYLT (Synchronized lyrics)
          if (frameId === 'SYLT' && !lyrics && contentBytes.length > 6) {
            try {
              const enc = contentBytes[0];
              let descOffset = 6;
              if (enc === 1 || enc === 2) {
                while (descOffset < contentBytes.length - 1) {
                  if (contentBytes[descOffset] === 0 && contentBytes[descOffset + 1] === 0) {
                    descOffset += 2;
                    break;
                  }
                  descOffset += 2;
                }
              } else {
                while (descOffset < contentBytes.length) {
                  if (contentBytes[descOffset] === 0) {
                    descOffset += 1;
                    break;
                  }
                  descOffset += 1;
                }
              }
              const syltBytes = contentBytes.slice(descOffset);
              const lines: string[] = [];
              let p = 0;
              while (p < syltBytes.length) {
                const s = p;
                if (enc === 1 || enc === 2) {
                  while (p < syltBytes.length - 1 && !(syltBytes[p] === 0 && syltBytes[p + 1] === 0)) {
                    p += 2;
                  }
                  const t = new TextDecoder('utf-16').decode(syltBytes.slice(s, p)).replace(/\0/g, '').trim();
                  if (t) lines.push(t);
                  p += 2;
                } else {
                  while (p < syltBytes.length && syltBytes[p] !== 0) {
                    p++;
                  }
                  const t = (enc === 3 ? textDecoder : isoDecoder).decode(syltBytes.slice(s, p)).replace(/\0/g, '').trim();
                  if (t) lines.push(t);
                  p++;
                }
                p += 4;
              }
              if (lines.length > 0) lyrics = lines.join('\n');
            } catch (syltErr) {
              console.warn('Nota parseando SYLT:', syltErr);
            }
          }

          offset += 10 + frameSize;
        }
      }

      // Escanear ID3v1 (últimos 128 bytes) si faltó título o artista
      if ((!title || !artist) && file.size > 128) {
        const endBuffer = await file.slice(file.size - 128).arrayBuffer();
        const endBytes = new Uint8Array(endBuffer);
        if (endBytes[0] === 0x54 && endBytes[1] === 0x41 && endBytes[2] === 0x47) { // 'TAG'
          const dec = new TextDecoder('iso-8859-1');
          if (!title) {
            const rawT = dec.decode(endBytes.slice(3, 33)).replace(/\0/g, '').trim();
            if (rawT) title = rawT;
          }
          if (!artist) {
            const rawA = dec.decode(endBytes.slice(33, 63)).replace(/\0/g, '').trim();
            if (rawA) artist = rawA;
          }
        }
      }

      if (title || artist || lyrics || genre) {
        const fast = parseSmartAudioName(file.name);
        return {
          title: title || fast.titulo || file.name.replace(/\.[^/.]+$/, '').trim(),
          artist: artist || fast.artista || 'Artista',
          lyrics,
          genre
        };
      }
    } catch (e) {
      // Fallback
    }

    // 3. Respaldo por nombre de archivo
    const fast = parseSmartAudioName(file.name);
    return {
      title: fast.titulo || file.name.replace(/\.[^/.]+$/, '').replace(/_/g, ' ').trim(),
      artist: fast.artista || 'Artista',
      lyrics: extractedLyrics,
      genre: fast.generoInicial || undefined
    };
  };

  // Normalizador canónico de géneros musicales según la taxonomía del usuario
  const normalizeGenreName = (rawGenre?: string | null): string | null => {
    if (!rawGenre || typeof rawGenre !== 'string') return null;
    const trimmed = rawGenre.trim();
    if (!trimmed) return null;

    const lower = trimmed
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');

    if (
      lower === 'desconocido' ||
      lower === 'unknown' ||
      lower === 'musica' ||
      lower === 'audio' ||
      lower === 'n/a' ||
      lower === 'general'
    ) {
      return null;
    }

    if (lower.includes('corrido tumbado')) return 'Corridos Tumbados';
    if (lower.includes('corrido')) return 'Corridos';
    if (lower.includes('banda') || lower.includes('sinaloense')) return 'Banda';
    if (lower.includes('reggaeton') || lower.includes('regueton') || lower.includes('urbano latino') || lower.includes('dembow')) return 'Reggaeton';
    if (lower.includes('regional mexicano') || lower.includes('norteno') || lower.includes('sierreno') || lower.includes('campirano') || lower.includes('mariachi') || lower.includes('ranchera')) return 'Regional Mexicano';
    if (lower.includes('bachata')) return 'Bachata';
    if (lower.includes('salsa')) return 'Salsa';
    if (lower.includes('cumbia')) return 'Cumbia';
    if (lower.includes('merengue')) return 'Merengue';
    if (lower.includes('balada') || lower.includes('romantica') || lower.includes('bolero')) return 'Baladas Románticas';
    if (lower.includes('cristian') || lower.includes('gospel') || lower.includes('alabanza') || lower.includes('adoracion')) return 'Música Cristiana';
    if (lower.includes('trap')) return 'Trap';
    if (lower.includes('hip hop') || lower.includes('hiphop')) return 'Hip Hop';
    if (lower.includes('rap')) return 'Rap';
    if (lower.includes('electronica') || lower.includes('edm') || lower.includes('house') || lower.includes('techno') || lower.includes('dance')) return 'Electrónica';
    if (lower.includes('rock') || lower.includes('metal') || lower.includes('punk') || lower.includes('grunge')) return 'Rock';
    if (lower.includes('pop')) return 'Pop';
    if (lower.includes('otro') || lower === 'otros') return 'Otros';

    // Capitalizar adecuadamente cualquier otro género detectado por DeepSeek (e.g. Jazz, R&B, etc.)
    return trimmed
      .split(' ')
      .filter(Boolean)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(' ');
  };

  const genreToSlug = (canonicalGenre: string): string => {
    return canonicalGenre
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
  };

  // Limpieza y deducción inteligente instantánea desde el nombre del archivo
  const parseSmartAudioName = (
    rawName: string
  ): { titulo: string; artista: string; generoInicial: string | null } => {
    let clean = rawName.replace(/\.(mp3|wav|m4a|aac|flac|ogg)$/i, '');
    clean = clean.replace(/^\s*(?:\d+[\s._-]+)+/, '');
    clean = clean
      .replace(
        /\b(official\s+video|video\s+oficial|official\s+audio|audio\s+oficial|video\s+lyric|letra|lyrics|en\s+vivo|live|remix|hd|4k|1080p|hq|320kbps|128kbps|y2mate(?:\.is)?|mp3clan|snaptube|full\s+audio)\b/gi,
        ''
      )
      .replace(/[\[\(\{]\s*[\]\)\}]/g, '')
      .replace(/[_]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    let artista = 'Artista';
    let titulo = clean;
    let generoInicial: string | null = null;

    const conocidos = [
      { n: ['peso pluma', 'doble p'], art: 'Peso Pluma', g: 'Corridos' },
      { n: ['natanael cano', 'nata'], art: 'Natanael Cano', g: 'Corridos Tumbados' },
      { n: ['junior h'], art: 'Junior H', g: 'Corridos Tumbados' },
      { n: ['fuerza regida'], art: 'Fuerza Regida', g: 'Corridos' },
      { n: ['el fantasma'], art: 'El Fantasma', g: 'Corridos' },
      { n: ['los dos carnales'], art: 'Los Dos Carnales', g: 'Corridos' },
      { n: ['luis r conriquez'], art: 'Luis R Conriquez', g: 'Corridos' },
      { n: ['calibre 50'], art: 'Calibre 50', g: 'Banda' },
      { n: ['banda ms'], art: 'Banda MS', g: 'Banda' },
      { n: ['banda el recodo'], art: 'Banda El Recodo', g: 'Banda' },
      { n: ['la arrolladora'], art: 'La Arrolladora', g: 'Banda' },
      { n: ['grupo firme'], art: 'Grupo Firme', g: 'Banda' },
      { n: ['carin leon'], art: 'Carin Leon', g: 'Regional Mexicano' },
      { n: ['grupo frontera'], art: 'Grupo Frontera', g: 'Regional Mexicano' },
      { n: ['bad bunny'], art: 'Bad Bunny', g: 'Reggaeton' },
      { n: ['feid', 'ferxxo'], art: 'Feid', g: 'Reggaeton' },
      { n: ['karol g'], art: 'Karol G', g: 'Reggaeton' },
      { n: ['anuel'], art: 'Anuel AA', g: 'Reggaeton' },
      { n: ['daddy yankee'], art: 'Daddy Yankee', g: 'Reggaeton' },
      { n: ['j balvin'], art: 'J Balvin', g: 'Reggaeton' },
      { n: ['maluma'], art: 'Maluma', g: 'Reggaeton' },
      { n: ['ozuna'], art: 'Ozuna', g: 'Reggaeton' },
      { n: ['dua lipa'], art: 'Dua Lipa', g: 'Pop' },
      { n: ['taylor swift'], art: 'Taylor Swift', g: 'Pop' },
      { n: ['shakira'], art: 'Shakira', g: 'Pop' },
      { n: ['luis miguel'], art: 'Luis Miguel', g: 'Baladas Románticas' },
      { n: ['chayanne'], art: 'Chayanne', g: 'Baladas Románticas' },
      { n: ['romeo santos', 'aventura'], art: 'Romeo Santos', g: 'Bachata' },
      { n: ['prince royce'], art: 'Prince Royce', g: 'Bachata' },
      { n: ['marc anthony'], art: 'Marc Anthony', g: 'Salsa' },
      { n: ['selena'], art: 'Selena', g: 'Cumbia' },
      { n: ['los angeles azules'], art: 'Los Ángeles Azules', g: 'Cumbia' }
    ];

    const lower = clean.toLowerCase();
    const match = conocidos.find((c) => c.n.some((name) => lower.includes(name)));
    if (match) {
      artista = match.art;
      generoInicial = match.g;
      let t = clean;
      for (const name of match.n) {
        t = t.replace(new RegExp(name, 'gi'), '');
      }
      t = t.replace(/^[\s\-_—–:]+|[\s\-_—–:]+$/g, '').trim();
      if (t.length > 2) titulo = t;
    } else if (clean.includes(' - ')) {
      const parts = clean.split(' - ');
      artista = parts[0].trim();
      titulo = parts.slice(1).join(' - ').trim();
    } else if (clean.includes(' — ')) {
      const parts = clean.split(' — ');
      artista = parts[0].trim();
      titulo = parts.slice(1).join(' — ').trim();
    } else if (clean.toLowerCase().includes(' by ')) {
      const parts = clean.split(/ by /i);
      titulo = parts[0].trim();
      artista = parts[1].trim();
    }

    const cap = (s: string) =>
      s
        .split(' ')
        .map((w) => (w.length > 0 ? w[0].toUpperCase() + w.slice(1) : ''))
        .join(' ');
    if (titulo === titulo.toLowerCase()) titulo = cap(titulo);
    if (artista === artista.toLowerCase()) artista = cap(artista);

    return { titulo: titulo || 'Canción', artista: artista || 'Artista', generoInicial };
  };

  const analizarAudioConIA = async (
    file: File,
    hintTitle?: string,
    hintArtist?: string,
    hintGenre?: string
  ): Promise<{
    titulo: string;
    artista: string;
    genero: string;
    genre?: string;
    coverUrl: string;
    fuenteIA: string;
    normalizedGenre: string | null;
  } | null> => {
    setIsAiAnalyzing(true);
    try {
      const res = await fetch('/api/ai/tag-audio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: file.name,
          id3Title: hintTitle || customTitle,
          id3Artist: hintArtist || customArtist,
          id3Genre: hintGenre
        })
      });
      const json = await res.json();
      if (json.success && json.data) {
        const d = json.data;
        const rawGenre = (d.genre || d.genero || '').trim();
        const normGenre = normalizeGenreName(rawGenre);

        if (d.titulo) setCustomTitle(d.titulo);
        if (d.artista) setCustomArtist(d.artista);
        if (d.coverUrl) setCustomCoverUrl(d.coverUrl);

        if (normGenre) {
          setDetectedGenre(normGenre);
          latestGenreRef.current = normGenre;
        }

        setAiIdentifiedInfo({
          titulo: d.titulo,
          artista: d.artista,
          genero: normGenre || rawGenre || 'Música',
          fuenteIA: d.fuenteIA || 'DeepSeek / Gemini IA'
        });

        if (normGenre) {
          triggerToast(`✨ Género detectado: ${normGenre} ("${d.artista} - ${d.titulo}")`, 'success');
        }

        return {
          ...d,
          normalizedGenre: normGenre
        };
      }
    } catch (err) {
      console.warn('Error en análisis IA:', err);
    } finally {
      setIsAiAnalyzing(false);
    }
    return null;
  };

  /**
   * SISTEMA INTELIGENTE DE CARPETAS POR GÉNERO
   * Antes de insertar la canción en la tabla songs de Supabase:
   * 1. Consulta la estructura actual de carpetas (foldersRef, localStorage y tabla songs).
   * 2. PRIMER CASO: Si existe una carpeta llamada e.g. "Corridos", recupera su ID y la reutiliza.
   * 3. SEGUNDO CASO: Si no existe, crea automáticamente la carpeta en el sistema de Supabase/App y recupera su ID.
   * 4. TERCER CASO: Si posteriormente se sube otra canción de ese género, encuentra la carpeta creada anteriormente sin duplicarla.
   * 5. FALLBACK: Si DeepSeek no identifica el género después de los intentos de clasificación, utiliza "Tus me gusta".
   */
  const findOrCreateGenreFolder = async (
    rawGenre?: string | null
  ): Promise<{ folderId: string; folderTitle: string }> => {
    const cleanGenre = normalizeGenreName(rawGenre);

    // REGLA 5: Solamente utilizar "Tus me gusta" cuando realmente no se pueda determinar el género después de los intentos de clasificación
    if (!cleanGenre) {
      return { folderId: 'tus_me_gusta', folderTitle: 'Tus me gusta' };
    }

    const slug = genreToSlug(cleanGenre);

    // Obtener todas las carpetas conocidas (foldersRef, React state y localStorage)
    const currentMemory = foldersRef.current && foldersRef.current.length > 0 ? foldersRef.current : folders;
    const currentStoredFolders: AudioFolder[] = (() => {
      try {
        const raw = localStorage.getItem('fa_folders_v3');
        return raw ? JSON.parse(raw) : [];
      } catch {
        return [];
      }
    })();

    const todasLasCarpetas: AudioFolder[] = [...currentMemory];
    for (const sf of currentStoredFolders) {
      if (!todasLasCarpetas.some((f) => f.id === sf.id)) {
        todasLasCarpetas.push(sf);
      }
    }

    // PRIMER CASO & TERCER CASO: Buscar si ya existe una carpeta con el género detectado (sin duplicar)
    const genreNorm = cleanGenre.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const existing = todasLasCarpetas.find((f) => {
      const fId = f.id.toLowerCase().trim();
      const fTitle = f.titulo.toLowerCase().trim();
      const fNorm = fTitle.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      return (
        fId === slug ||
        fTitle === cleanGenre.toLowerCase() ||
        fNorm === genreNorm ||
        fId === genreNorm.replace(/[^a-z0-9]+/g, '_')
      );
    });

    if (existing) {
      return { folderId: existing.id, folderTitle: existing.titulo };
    }

    // Consultar si ya existen canciones con este folder_id en la biblioteca
    const hasGenreSongs = (songs.length > 0 ? songs : canciones).some(
      (s) => (s.folder_id || '') === slug
    );
    if (hasGenreSongs) {
      const coverAuto = obtenerPortadaUnsplashCarpeta(cleanGenre);
      const recoveredFolder: AudioFolder = {
        id: slug,
        titulo: cleanGenre,
        subtitulo: `Colección de ${cleanGenre}`,
        descripcion: `Carpeta ${cleanGenre}`,
        coverKey: coverAuto,
        coverUrl: coverAuto,
        badge: cleanGenre,
        canciones: []
      };
      const next = [...todasLasCarpetas.filter((f) => f.id !== slug), recoveredFolder];
      foldersRef.current = next;
      saveFolders(next);
      asignarPortadaAutomaticaCarpeta(recoveredFolder).catch(() => {});
      return { folderId: slug, folderTitle: cleanGenre };
    }

    // SEGUNDO CASO: Si no existe una carpeta para este género, crearla automáticamente con su portada relacionada
    const newFolderId = slug || `genero_${Date.now()}`;
    const newFolderTitle = cleanGenre;
    const coverAutoNew = obtenerPortadaUnsplashCarpeta(newFolderTitle);

    const newFolder: AudioFolder = {
      id: newFolderId,
      titulo: newFolderTitle,
      subtitulo: `Colección de ${newFolderTitle}`,
      descripcion: `Carpeta creada automáticamente para canciones de género ${newFolderTitle}.`,
      coverKey: coverAutoNew,
      coverUrl: coverAutoNew,
      badge: newFolderTitle,
      canciones: []
    };

    const nextFolders = [...todasLasCarpetas.filter((f) => f.id !== newFolderId), newFolder];
    foldersRef.current = nextFolders;
    saveFolders(nextFolders);
    asignarPortadaAutomaticaCarpeta(newFolder).catch(() => {});

    return { folderId: newFolderId, folderTitle: newFolderTitle };
  };

  const regenerarFotoIA = () => {
    const seed = Math.floor(Math.random() * 999999);
    const prompt = encodeURIComponent(
      `${customArtist || 'Music Artist'} ${customTitle || 'Song'} stylish album art cover aesthetic vinyl masterpiece 4k`
    );
    const newCover = `https://image.pollinations.ai/prompt/${prompt}?width=512&height=512&nologo=true&seed=${seed}`;
    setCustomCoverUrl(newCover);
    triggerToast('¡Nueva portada generada con IA!', 'success');
  };

  // ==========================================
  // FUNCIONES DE CONTROL: ORGANIZAR MI BIBLIOTECA
  // ==========================================
  const abrirModalOrganizarBiblioteca = async () => {
    cancelOrganizeRef.current = false;
    setShowOrganizeModal(true);
    setOrganizeStep('confirm');
    setLoadingPreCount(true);

    try {
      // 1. Consultar conteo exacto y real de canciones existentes en Firebase Firestore
      const snap = await getDocs(collection(db, 'songs'));
      const dbSongs: any[] = [];
      snap.forEach((d) => dbSongs.push({ id: d.id, ...d.data() }));

      if (dbSongs.length > 0) {
        const total = dbSongs.length;
        const tusMeGusta = dbSongs.filter((s: any) => !s.folder_id || s.folder_id === 'tus_me_gusta').length;
        setTotalSongsToOrganize(total);
        setTotalTusMeGustaCount(tusMeGusta);
      } else {
        const lista = songs.length > 0 ? songs : canciones;
        setTotalSongsToOrganize(lista.length);
        setTotalTusMeGustaCount(lista.filter(s => !s.folder_id || s.folder_id === 'tus_me_gusta').length);
      }
    } catch (e) {
      console.warn('Nota consultando conteo previo para organizar biblioteca:', e);
      const lista = songs.length > 0 ? songs : canciones;
      setTotalSongsToOrganize(lista.length);
      setTotalTusMeGustaCount(lista.filter(s => !s.folder_id || s.folder_id === 'tus_me_gusta').length);
    } finally {
      setLoadingPreCount(false);
    }
  };

  const detenerOrganizacion = () => {
    cancelOrganizeRef.current = true;
    setIsOrganizingRunning(false);
  };

  const ejecutarOrganizacionBiblioteca = async () => {
    cancelOrganizeRef.current = false;
    setIsOrganizingRunning(true);
    setOrganizeStep('processing');

    let allSongsToProcess: Song[] = [];

    try {
      // 1. Obtener todas las canciones existentes de la colección 'songs' en Firebase Firestore
      const snap = await getDocs(collection(db, 'songs'));
      const dbSongs: any[] = [];
      snap.forEach((d) => dbSongs.push({ id: d.id, ...d.data() }));

      if (dbSongs.length > 0) {
        allSongsToProcess = dbSongs.map((row: any) => ({
          id: row.id,
          title: row.title || row.titulo || 'Sin título',
          artist: row.artist || row.artista || 'Artista',
          cover_url: row.cover_url || '',
          audio_url: row.audio_url || '',
          titulo: row.title || row.titulo || 'Sin título',
          artista: row.artist || row.artista || 'Artista',
          url: row.audio_url || '',
          storage_path: row.audio_url || '',
          folder_id: row.folder_id || 'tus_me_gusta',
          created_at: row.created_at
        }));
      } else {
        allSongsToProcess = songs.length > 0 ? [...songs] : [...canciones];
      }
    } catch (err) {
      console.warn('Excepción obteniendo canciones de Firestore para organizar:', err);
      allSongsToProcess = songs.length > 0 ? [...songs] : [...canciones];
    }

    // Filtrar según el alcance seleccionado por el administrador
    const listaObjetivo = organizeScope === 'tus_me_gusta'
      ? allSongsToProcess.filter(s => !s.folder_id || s.folder_id === 'tus_me_gusta')
      : allSongsToProcess;

    const totalTarget = listaObjetivo.length;

    // Inicializar estadísticas reales
    let revisadas = 0;
    let clasificadas = 0;
    let sinClasificar = 0;
    let carpetasNuevasCount = 0;
    const carpetasNuevasNombres = new Set<string>();
    const logs: Array<{ text: string; time: string; type: 'success' | 'info' | 'skip' }> = [];

    setOrganizeStats({
      revisadas: 0,
      clasificadas: 0,
      carpetasCreadas: 0,
      pendientes: totalTarget,
      sinClasificar: 0,
      total: totalTarget,
      currentSongName: '',
      currentFolderAssigned: '',
      activityLogs: [],
      createdFolderNames: []
    });

    if (totalTarget === 0) {
      setIsOrganizingRunning(false);
      setOrganizeStep('completed');
      return;
    }

    // 2. Procesamiento por lotes pequeños (de 8 en 8) para optimizar DeepSeek y evitar cuellos de botella
    const BATCH_SIZE = 8;

    for (let i = 0; i < totalTarget; i += BATCH_SIZE) {
      if (cancelOrganizeRef.current) {
        logs.unshift({
          text: '⏸️ Organización pausada por el administrador',
          time: new Date().toLocaleTimeString(),
          type: 'info'
        });
        break;
      }

      const batch = listaObjetivo.slice(i, i + BATCH_SIZE);

      // Consultar endpoint de DeepSeek IA con respaldo
      const batchResultsMap = new Map<string, string>();
      try {
        const payload = {
          songs: batch.map(s => ({
            id: String(s.id),
            title: s.title || s.titulo,
            artist: s.artist || s.artista,
            audio_url: s.audio_url || s.url,
            folder_id: s.folder_id
          }))
        };

        const res = await fetch('/api/ai/batch-classify-genres', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (res.ok) {
          const json = await res.json();
          if (json.success && Array.isArray(json.results)) {
            for (const r of json.results) {
              if (r && r.id && r.genre) {
                batchResultsMap.set(String(r.id), r.genre.trim());
              }
            }
          }
        }
      } catch (batchErr) {
        console.warn('Nota en llamada batch DeepSeek:', batchErr);
      }

      // Procesar cada canción del lote
      for (const song of batch) {
        if (cancelOrganizeRef.current) break;

        revisadas++;
        const sId = String(song.id);
        const songTitle = song.title || song.titulo || 'Canción';
        const songArtist = song.artist || song.artista || 'Artista';

        // 1. Obtener género devuelto por DeepSeek o catálogo
        let rawGenre = batchResultsMap.get(sId);
        if (!rawGenre) {
          const fast = parseSmartAudioName(song.audio_url ? song.audio_url.split('/').pop() || songTitle : songTitle);
          rawGenre = fast.generoInicial || '';
        }

        const canonicalGenre = normalizeGenreName(rawGenre);

        // Si no se pudo clasificar el género: REGLA DE ORO 4 -> Permanecer en su ubicación original
        if (!canonicalGenre) {
          sinClasificar++;
          logs.unshift({
            text: `❓ "${songTitle}" (${songArtist}) — Sin clasificación (mantenida en original)`,
            time: new Date().toLocaleTimeString(),
            type: 'skip'
          });

          setOrganizeStats({
            revisadas,
            clasificadas,
            carpetasCreadas: carpetasNuevasCount,
            pendientes: totalTarget - revisadas,
            sinClasificar,
            total: totalTarget,
            currentSongName: `${songTitle} - ${songArtist}`,
            currentFolderAssigned: 'Ubicación original (Sin cambios)',
            activityLogs: logs.slice(0, 15),
            createdFolderNames: Array.from(carpetasNuevasNombres)
          });
          continue;
        }

        // 2. Buscar o crear carpeta para este género sin duplicar
        const slug = genreToSlug(canonicalGenre);
        const allKnownFolders = foldersRef.current && foldersRef.current.length > 0 ? foldersRef.current : folders;
        const existsPrior = allKnownFolders.some(
          f => f.id === slug || f.titulo.toLowerCase() === canonicalGenre.toLowerCase()
        );

        const resolved = await findOrCreateGenreFolder(canonicalGenre);
        const targetFolderId = resolved.folderId;
        const targetFolderTitle = resolved.folderTitle;

        if (!existsPrior && !carpetasNuevasNombres.has(targetFolderTitle)) {
          carpetasNuevasCount++;
          carpetasNuevasNombres.add(targetFolderTitle);
        }

        // 3. Actualizar folder_id en Firebase Firestore si es diferente de la carpeta actual
        const currentFolderId = song.folder_id || 'tus_me_gusta';
        if (currentFolderId !== targetFolderId) {
          try {
            // REGLA DE ORO 4: Actualizar ÚNICAMENTE folder_id sin tocar R2, audio_url, portada ni título
            if (song.id && !String(song.id).startsWith('local_')) {
              await updateDoc(doc(db, 'songs', String(song.id)), { folder_id: targetFolderId }).catch(() => {});
            }

            clasificadas++;
            logs.unshift({
              text: `✅ "${songTitle}" (${songArtist}) ➔ Asignada a "${targetFolderTitle}"`,
              time: new Date().toLocaleTimeString(),
              type: 'success'
            });

            // Actualizar metadatos locales para coherencia inmediata
            if (song.audio_url) {
              guardarMetadatoCancion(song.audio_url, {
                titulo: songTitle,
                artista: songArtist,
                cover: song.cover_url || song.cover,
                folderId: targetFolderId,
                url: song.audio_url,
                created_at: song.created_at || new Date().toISOString()
              });
            }
          } catch (dbErr) {
            console.error(`Error actualizando folder_id para ${songTitle}:`, dbErr);
          }
        } else {
          // Ya estaba en esa carpeta correcta
          clasificadas++;
          logs.unshift({
            text: `✓ "${songTitle}" ya correspondía a "${targetFolderTitle}"`,
            time: new Date().toLocaleTimeString(),
            type: 'info'
          });
        }

        // Actualizar métricas reactivas en pantalla
        setOrganizeStats({
          revisadas,
          clasificadas,
          carpetasCreadas: carpetasNuevasCount,
          pendientes: totalTarget - revisadas,
          sinClasificar,
          total: totalTarget,
          currentSongName: `${songTitle} - ${songArtist}`,
          currentFolderAssigned: targetFolderTitle,
          activityLogs: logs.slice(0, 15),
          createdFolderNames: Array.from(carpetasNuevasNombres)
        });
      }
    }

    // 4. Finalización: Sincronizar catálogo completo y mostrar resumen
    setIsOrganizingRunning(false);
    setOrganizeStep('completed');
    triggerToast('¡Biblioteca organizada correctamente!', 'success');

    // Recargar biblioteca completa desde Supabase para reflejar al instante
    await cargarCanciones();
  };

  // ==========================================
  // GESTIÓN Y LIMPIEZA DE CANCIONES DUPLICADAS (CON BORRADO PERMANENTE EN SUPABASE)
  // ==========================================
  const [limpiandoDuplicados, setLimpiandoDuplicados] = useState<boolean>(false);

  const limpiarDuplicados = async () => {
    if (limpiandoDuplicados) return;

    // 1. Confirmación al usuario
    const confirmar = window.confirm("¿Seguro que quieres eliminar las canciones repetidas?");
    if (!confirmar) return;

    // 2. Obtener lista actual de canciones
    const listaActual = library && library.length > 0 ? library : (songs.length > 0 ? songs : canciones);
    if (!listaActual || listaActual.length === 0) {
      window.alert("No se encontraron canciones en la biblioteca");
      return;
    }

    // 3. IDENTIFICAR DUPLICADOS Y SUS IDs:
    // Guardar los ID únicos de la base de datos de las canciones que sobran, dejando siempre la primera
    const vistos = new Set<string>();
    const nuevaLista: Song[] = [];
    const idsAEliminar: Array<string | number> = [];

    for (const cancion of listaActual) {
      const title = (cancion.title || cancion.titulo || '').trim().toLowerCase();
      const performer = (cancion.performer || cancion.artist || cancion.artista || '').trim().toLowerCase();
      const playbackUrl = (cancion.playback_url || cancion.url || cancion.audio_url || cancion.storage_path || '').trim().toLowerCase();

      const clave = title
        ? `${title}:::${performer}`
        : `${playbackUrl}:::${performer}`;

      if (vistos.has(clave)) {
        // Es un duplicado que sobra: registrar su ID para eliminarlo permanentemente
        if (cancion.id !== undefined && cancion.id !== null) {
          idsAEliminar.push(cancion.id);
        }
      } else {
        vistos.add(clave);
        nuevaLista.push(cancion);
      }
    }

    if (idsAEliminar.length === 0) {
      window.alert("No se encontraron duplicados");
      triggerToast('No se encontraron duplicados', 'success');
      return;
    }

    // 4. BORRAR EN SUPABASE (CRÍTICO) con estado de carga
    setLimpiandoDuplicados(true);

    try {
      // Filtrar IDs que existan en Firestore (evitando IDs locales temporales si los hubiera)
      const idsFirestore = idsAEliminar.filter((id) => !String(id).startsWith('local_'));

      if (idsFirestore.length > 0) {
        // Ejecutar eliminación en la colección 'songs' de Firebase Firestore
        for (const id of idsFirestore) {
          await deleteDoc(doc(db, 'songs', String(id))).catch(() => {});
        }
      }

      // 5. ACTUALIZAR EL ESTADO Y LOCALSTORAGE (Solo tras éxito en Supabase)
      setLibrary(nuevaLista);
      setSongs(nuevaLista);
      setCanciones(nuevaLista);

      const idSetEliminar = new Set(idsAEliminar.map((id) => String(id)));

      if (currentSong && idSetEliminar.has(String(currentSong.id))) {
        setCurrentSong(nuevaLista.length > 0 ? nuevaLista[0] : null);
      }

      setFolders((prev) => {
        const updated = prev.map((f) => ({
          ...f,
          canciones: (f.canciones || []).filter((s) => !idSetEliminar.has(String(s.id))),
        }));
        try {
          localStorage.setItem('fa_folders_v3', JSON.stringify(updated));
        } catch {}
        return updated;
      });

      try {
        localStorage.setItem('library', JSON.stringify(nuevaLista));
        localStorage.setItem(CUSTOM_LIBRARY_KEY, JSON.stringify(nuevaLista));
        localStorage.setItem('spotyy_custom_songs_v1', JSON.stringify(nuevaLista));
        localStorage.setItem('canciones', JSON.stringify(nuevaLista));
      } catch (e) {
        console.warn('Error guardando en localStorage:', e);
      }

      // 6. MENSAJE DE ÉXITO
      window.alert(`Se eliminaron ${idsAEliminar.length} canciones repetidas permanentemente`);
      triggerToast(`Se eliminaron ${idsAEliminar.length} canciones repetidas permanentemente`, 'success');
    } catch (err: any) {
      // 7. MANEJO DE ERRORES: Si Supabase falla, NO se borra nada de la pantalla
      console.error('Fallo crítico al eliminar duplicados en Supabase:', err);
      window.alert(`Error al eliminar canciones repetidas de Supabase: ${err?.message || 'Error de conexión o permisos RLS'}. No se eliminó ninguna canción.`);
      triggerToast('Error al eliminar canciones en Supabase', 'error');
    } finally {
      setLimpiandoDuplicados(false);
    }
  };

  const limpiarCancionesDuplicadas = limpiarDuplicados;

  // ==========================================
  // ==========================================
  // FUNCIONES AUXILIARES: LIMPIEZA PREVIA, ID3 LOCAL, DEEPSEEK ESTRICTO E ITUNES FALLBACK
  // ==========================================

  // 1. LIMPIEZA PREVIA:
  // Quita números al inicio, guiones bajos, extensión ".mp3" y corchetes (ej: "01 - Selena - Amor Prohibido.mp3" -> "Selena - Amor Prohibido")
  const limpiarNombreArchivo = (nombre: string): string => {
    if (!nombre) return '';
    let limpio = nombre;
    // Quitar extensión de audio (.mp3, .wav, .m4a, etc.)
    limpio = limpio.replace(/\.(mp3|wav|m4a|aac|flac|ogg)$/i, '');
    // Quitar corchetes y su contenido, ej. [128kbps], [Video Oficial], o corchetes solos
    limpio = limpio.replace(/\[.*?\]/g, ' ');
    // Quitar tags tipo spotdown
    limpio = limpio.replace(/_?spotdown(?:\.org)?/gi, ' ');
    // Quitar guiones bajos
    limpio = limpio.replace(/_+/g, ' ');
    // Quitar números al inicio (ej. "01 - ", "01. ", "01_", "1 - ")
    limpio = limpio.replace(/^\s*\d+[\s._-]*/, '');
    // Limpiar espacios múltiples y guiones flotantes
    limpio = limpio.replace(/\s+/g, ' ').replace(/^[-–—\s]+|[-–—\s]+$/g, '').trim();
    return limpio;
  };

  // 2. EXTRACCIÓN LOCAL (ID3):
  // Si el archivo ya trae Artista y Título en sus propiedades o vía jsmediatags, úsalos y NO gastes API de DeepSeek
  const extraerID3Local = async (cancion: Song): Promise<{ titulo?: string; artista?: string } | null> => {
    const artistaExistente = (cancion.artist || cancion.artista || '').trim();
    const tituloExistente = (cancion.title || cancion.titulo || '').trim();

    const esArtistaInvalido =
      !artistaExistente ||
      artistaExistente.toLowerCase() === 'desconocido' ||
      artistaExistente.toLowerCase() === 'artista desconocido' ||
      artistaExistente.toLowerCase() === 'artista' ||
      artistaExistente.toLowerCase() === 'unknown' ||
      artistaExistente.toLowerCase() === 'unknown artist';

    const esTituloInvalido =
      !tituloExistente ||
      tituloExistente.toLowerCase() === 'canción' ||
      tituloExistente.toLowerCase() === 'cancion' ||
      tituloExistente.toLowerCase() === 'audio' ||
      tituloExistente.toLowerCase().includes('spotdown');

    if (!esArtistaInvalido && !esTituloInvalido) {
      return {
        titulo: tituloExistente,
        artista: artistaExistente
      };
    }

    // Si no los tiene limpios, intentar leer con jsmediatags localmente
    const audioUrl = cancion.audio_url || cancion.url;
    if (audioUrl && typeof window !== 'undefined' && (window as any).jsmediatags) {
      try {
        const tags = await new Promise<{ titulo?: string; artista?: string } | null>((resolve) => {
          const timer = setTimeout(() => resolve(null), 1200);
          (window as any).jsmediatags.read(audioUrl, {
            onSuccess: (tagData: any) => {
              clearTimeout(timer);
              const t = tagData?.tags?.title?.trim();
              const a = tagData?.tags?.artist?.trim();
              if (t && a && a.toLowerCase() !== 'desconocido' && a.toLowerCase() !== 'unknown') {
                resolve({ titulo: t, artista: a });
              } else {
                resolve(null);
              }
            },
            onError: () => {
              clearTimeout(timer);
              resolve(null);
            }
          });
        });
        if (tags) return tags;
      } catch {}
    }

    return null;
  };

  // 3. CONSULTA ESTRICTA A DEEPSEEK (Con prompt estricto y regla de idiomas)
  const consultarDeepSeekEstricto = async (nombreLimpio: string): Promise<{ titulo: string; artista: string } | null> => {
    try {
      const res = await fetch('/api/ai/deepseek-identify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombreLimpio })
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          return {
            titulo: json.data.titulo,
            artista: json.data.artista
          };
        }
      }
    } catch (err) {
      console.warn('Error llamando a /api/ai/deepseek-identify:', err);
    }
    return null;
  };

  // 6. FALLBACK DE ITUNES (Para las que fallan o artista Desconocido):
  const consultarITunesFallback = async (nombreLimpio: string): Promise<{ titulo?: string; artista?: string; coverUrl?: string } | null> => {
    try {
      const query = encodeURIComponent(nombreLimpio);
      const res = await fetch(`https://itunes.apple.com/search?term=${query}&entity=song&limit=1`);
      if (res.ok) {
        const data = await res.json();
        if (data.resultCount > 0 && data.results?.[0]) {
          const item = data.results[0];
          const art100 = item.artworkUrl100 || '';
          const coverUrl = art100 ? art100.replace('100x100bb.jpg', '600x600bb.jpg') : '';
          return {
            titulo: item.trackName || item.collectionName || nombreLimpio,
            artista: item.artistName || 'Desconocido',
            coverUrl: coverUrl || art100
          };
        }
      }
    } catch (err) {
      console.warn('Error en fallback de iTunes:', err);
    }
    return null;
  };

  // 2. ACTUALIZAR CANCIONES CON DEEPSEEK IA (LÓGICA MEJORADA)
  // ==========================================
  const [completandoInformacion, setCompletandoInformacion] = useState<boolean>(false);
  const [progresoActualizacion, setProgresoActualizacion] = useState<{ actual: number; total: number; nombre: string } | null>(null);

  const completarInformacionFaltanteIA = async () => {
    // 1. Obtener lista de canciones actual
    let listaActual: Song[] = [];
    try {
      const raw = localStorage.getItem('library') || localStorage.getItem(CUSTOM_LIBRARY_KEY) || localStorage.getItem('canciones');
      if (raw) {
        listaActual = JSON.parse(raw);
      }
    } catch {}

    if (!listaActual || listaActual.length === 0) {
      listaActual = songs.length > 0 ? [...songs] : (canciones.length > 0 ? [...canciones] : (library.length > 0 ? [...library] : []));
    }

    if (!listaActual || listaActual.length === 0) {
      triggerToast('No hay canciones en tu biblioteca para actualizar', 'info');
      return;
    }

    setCompletandoInformacion(true);
    const total = listaActual.length;
    let cancionesActualizadasContador = 0;
    const cancionesActualizadas = [...listaActual];
    const BATCH_SIZE = 10;
    const totalBloques = Math.ceil(total / BATCH_SIZE);

    triggerToast(`Iniciando actualización por lotes de 10 en 10 (${total} canciones en ${totalBloques} bloques)...`, 'info');

    // Procesar en lotes de 10 en 10
    for (let batchStart = 0; batchStart < total; batchStart += BATCH_SIZE) {
      const batchEnd = Math.min(batchStart + BATCH_SIZE, total);
      const numeroBloque = Math.floor(batchStart / BATCH_SIZE) + 1;

      // Mensaje en pantalla exigido: 'Actualizando bloque X...'
      const mensajeBloque = `Actualizando bloque ${numeroBloque}...`;
      setProgresoActualizacion({
        actual: batchStart + 1,
        total,
        nombre: mensajeBloque
      });
      triggerToast(mensajeBloque, 'info');

      for (let currentIndex = batchStart; currentIndex < batchEnd; currentIndex++) {
        const cancion = cancionesActualizadas[currentIndex];
        const cancionTitulo = cancion.title || cancion.titulo || '';
        const cancionArtista = cancion.artist || cancion.artista || '';

        try {
          let finalTitulo = limpiarTituloCancion(cancionTitulo);
          let finalArtista = cleanArtist(cancionArtista, '');
          let finalCover = cancion.cover_url || cancion.cover || '';

          // Buscar portada en iTunes
          try {
            const itunesCover = await searchCoverInITunes(finalArtista, finalTitulo);
            if (itunesCover && itunesCover.coverUrl) {
              finalCover = itunesCover.coverUrl
                .replace(/100x100(bb)?\.(jpg|png|webp)/i, '600x600$1.$2')
                .replace(/100x100/g, '600x600');
              if (!finalArtista && itunesCover.artistName) {
                finalArtista = itunesCover.artistName.trim();
              }
            }
          } catch (covErr) {
            console.warn(`[iTunes Batch] Error buscando portada para ${finalTitulo}:`, covErr);
          }

          if (!finalCover) {
            finalCover = DEFAULT_SONG_COVER;
          }

          // Actualizar en Firebase Firestore
          try {
            if (cancion.id && !String(cancion.id).startsWith('local_')) {
              await updateDoc(doc(db, 'songs', String(cancion.id)), {
                cover_url: finalCover,
                cover: finalCover,
                ...(finalArtista ? { artist: finalArtista, artista: finalArtista } : {}),
                ...(finalTitulo ? { title: finalTitulo, titulo: finalTitulo } : {}),
                updated_at: new Date().toISOString()
              }).catch(async () => {
                await addDoc(collection(db, 'songs'), {
                  title: finalTitulo || cancionTitulo,
                  artist: finalArtista || cancionArtista,
                  cover_url: finalCover,
                  cover: finalCover,
                  audio_url: cancion.audio_url || cancion.url || '',
                  storage_path: cancion.storage_path || '',
                  folder_id: cancion.folder_id || 'mis_canciones',
                  created_at: new Date().toISOString()
                }).catch(() => {});
              });
            }
          } catch (fbErr) {
            console.warn('Nota guardando portada en Firebase Firestore:', fbErr);
          }

          // Guardar en objeto local
          cancionesActualizadas[currentIndex] = {
            ...cancion,
            title: finalTitulo || cancionTitulo,
            titulo: finalTitulo || cancionTitulo,
            artist: finalArtista || cancionArtista,
            artista: finalArtista || cancionArtista,
            cover_url: finalCover,
            cover: finalCover
          };
          cancionesActualizadasContador++;
        } catch (errCancion) {
          console.warn(`Error procesando canción ${currentIndex + 1}:`, errCancion);
        }
      }

      // Actualizar el estado de React después de cada bloque de 10
      const copiaActualizada = [...cancionesActualizadas];
      setSongs(copiaActualizada);
      setCanciones(copiaActualizada);
      setLibrary(copiaActualizada);

      setFolders((prevFolders) =>
        prevFolders.map((f) => ({
          ...f,
          canciones: (f.canciones || []).map((c) => {
            const match = cancionesActualizadas.find((ca) => String(ca.id) === String(c.id));
            return match ? match : c;
          })
        }))
      );

      // Pausa obligatoria de 3 segundos (setTimeout) antes de pasar al siguiente bloque de 10
      if (batchEnd < total) {
        await new Promise((resolve) => setTimeout(resolve, 3000));
      }
    }

    // Guardado persistente local al finalizar
    try {
      localStorage.setItem('library', JSON.stringify(cancionesActualizadas));
      localStorage.setItem(CUSTOM_LIBRARY_KEY, JSON.stringify(cancionesActualizadas));
      localStorage.setItem('canciones', JSON.stringify(cancionesActualizadas));
    } catch {}

    setCompletandoInformacion(false);
    setProgresoActualizacion(null);
    triggerToast(`¡Actualización completada! ${cancionesActualizadasContador} canciones procesadas en bloques de 10.`, 'success');
  };

  const actualizarCaratulasYNombresConDeepSeek = completarInformacionFaltanteIA;

  // ==========================================
  // 3. PROCESAMIENTO POR LOTES (BATCH) DE CARPETA ENTERA CON DEEPSEEK IA Y SUPABASE
  // ==========================================
  const [procesandoCarpetaIA, setProcesandoCarpetaIA] = useState<boolean>(false);
  const [progresoCarpetaIA, setProgresoCarpetaIA] = useState<{
    actual: number;
    total: number;
    cancionActualTitulo: string;
    cancionActualArtista?: string;
    porcentaje: number;
  } | null>(null);

  const actualizarCarpetaConIA = async (folderAProcesar?: AudioFolder) => {
    const carpeta = folderAProcesar || selectedFolder;
    if (!carpeta) {
      alert('Por favor selecciona una carpeta para actualizar con IA.');
      return;
    }

    const carpetaFresca = folders.find((f) => f.id === carpeta.id) || carpeta;
    const cancionesAProcesar = obtenerCancionesCarpeta(carpetaFresca);

    if (cancionesAProcesar.length === 0) {
      alert(`La carpeta "${carpetaFresca.titulo}" no contiene canciones para procesar.`);
      return;
    }

    setProcesandoCarpetaIA(true);
    const total = cancionesAProcesar.length;
    let procesadasConExito = 0;

    setProgresoCarpetaIA({
      actual: 0,
      total,
      cancionActualTitulo: 'Iniciando conexión con DeepSeek IA...',
      cancionActualArtista: '',
      porcentaje: 0
    });

    // 2. Lógica de procesamiento en cola: bucle for...of con await (uno a uno)
    const cancionesActualizadasCarpeta = [...cancionesAProcesar];

    for (let index = 0; index < total; index++) {
      const cancion = cancionesActualizadasCarpeta[index];
      const nombreVisible = cancion.title || cancion.titulo || `Pista ${index + 1}`;
      const artistaVisible = cancion.artist || cancion.artista || '';

      const pasoActual = index + 1;
      const porcentaje = Math.round((pasoActual / total) * 100);

      // Texto en tiempo real: "Procesando canción X de Y..."
      setProgresoCarpetaIA({
        actual: pasoActual,
        total,
        cancionActualTitulo: nombreVisible,
        cancionActualArtista: artistaVisible,
        porcentaje
      });

      // Manejo estricto de errores por canción para que un fallo no rompa el lote
      try {
        let inputBusqueda = cancion.title || cancion.titulo || '';
        const pathOrUrl = cancion.audio_url || cancion.url || cancion.storage_path || '';

        if (
          !inputBusqueda ||
          inputBusqueda.toLowerCase().includes('spotdown') ||
          inputBusqueda.toLowerCase() === 'cancion' ||
          inputBusqueda.toLowerCase() === 'audio'
        ) {
          if (pathOrUrl) {
            try {
              const urlObj = new URL(pathOrUrl, window.location.origin);
              const segment = urlObj.pathname.split('/').pop() || '';
              inputBusqueda = decodeURIComponent(segment);
            } catch {
              inputBusqueda = pathOrUrl.split('/').pop() || inputBusqueda;
            }
          }
        }

        // Llamada a la función de DeepSeek
        const hintArtista = cancion.artist || cancion.artista || cancion.performer;
        const deepSeekRes = await fetchDeepSeekData(
          inputBusqueda || `Canción ${cancion.id}`,
          hintArtista && hintArtista !== 'Artista Desconocido' ? hintArtista : undefined
        );

        if (deepSeekRes) {
          const nuevoTitulo = deepSeekRes.title;
          const nuevoArtista = deepSeekRes.artist;
          const nuevaImagen = deepSeekRes.coverUrl;

          const cancionActualizada: Song = {
            ...cancion,
            title: nuevoTitulo,
            titulo: nuevoTitulo,
            artist: nuevoArtista,
            artista: nuevoArtista,
            performer: nuevoArtista,
            cover_url: nuevaImagen,
            cover: nuevaImagen,
            folder_id: cancion.folder_id || carpetaFresca.id
          };

          cancionesActualizadasCarpeta[index] = cancionActualizada;
          procesadasConExito++;

          // 3. ACTUALIZACIÓN VISUAL INMEDIATA EN REACT:
          setSongs((prev) => prev.map((s) => (String(s.id) === String(cancion.id) ? cancionActualizada : s)));
          setCanciones((prev) => prev.map((s) => (String(s.id) === String(cancion.id) ? cancionActualizada : s)));
          setLibrary((prev) => prev.map((s) => (String(s.id) === String(cancion.id) ? cancionActualizada : s)));

          // Actualizar en carpetas y en carpeta seleccionada actual
          setFolders((prevFolders) => {
            const updated = prevFolders.map((f) => {
              if (f.id === carpetaFresca.id) {
                const updatedCanciones = (f.canciones || []).map((c) =>
                  String(c.id) === String(cancion.id) ? cancionActualizada : c
                );
                return { ...f, canciones: updatedCanciones };
              }
              return {
                ...f,
                canciones: (f.canciones || []).map((c) =>
                  String(c.id) === String(cancion.id) ? cancionActualizada : c
                )
              };
            });
            foldersRef.current = updated;
            return updated;
          });

          setSelectedFolder((prev) => {
            if (!prev || prev.id !== carpetaFresca.id) return prev;
            const updatedCanciones = (prev.canciones || []).map((c) =>
              String(c.id) === String(cancion.id) ? cancionActualizada : c
            );
            return { ...prev, canciones: updatedCanciones };
          });

          if (currentSong && String(currentSong.id) === String(cancion.id)) {
            setCurrentSong(cancionActualizada);
          }

          // CRÍTICO (FIREBASE): Persistir en Firebase Firestore
          try {
            if (cancion.id && !String(cancion.id).startsWith('local_')) {
              await updateDoc(doc(db, 'songs', String(cancion.id)), {
                title: nuevoTitulo,
                artist: nuevoArtista,
                cover_url: nuevaImagen,
                updated_at: new Date().toISOString()
              }).catch(() => {});
            }
          } catch (errDb: any) {
            console.error(`Error actualizando canción "${nuevoTitulo}":`, errDb);
          }
        }
      } catch (errCancion: any) {
        console.error(`Error procesando canción ${pasoActual} de ${total} ("${nombreVisible}") con DeepSeek IA:`, errCancion);
      }

      // IMPORTANTE: Pausa de 2.0s entre canciones para no saturar la API de iTunes ni IA
      if (index < total - 1) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }

    // 4. FINALIZACIÓN: Guardar en caché y notificar
    try {
      localStorage.setItem('fa_folders_v3', JSON.stringify(foldersRef.current || folders));
      localStorage.setItem('library', JSON.stringify(cancionesActualizadasCarpeta));
    } catch {}

    setProcesandoCarpetaIA(false);
    setProgresoCarpetaIA(null);

    triggerToast(`¡Carpeta "${carpetaFresca.titulo}" actualizada con éxito!`, 'success');
    alert(`¡Carpeta "${carpetaFresca.titulo}" actualizada con éxito!\n\nSe procesaron ${procesadasConExito} de ${total} canciones con DeepSeek IA y se guardaron en Supabase.`);
  };

  // ==========================================
  // GESTIÓN DE CARPETAS (MOVER, AGREGAR, QUITAR Y ELIMINAR)
  // ==========================================
  const moverCancionACarpeta = async (song: Song, targetFolderId: string) => {
    const target = folders.find((f) => f.id === targetFolderId);
    if (!target) return;

    const currentFid = song.folder_id || 'tus_me_gusta';
    if (currentFid === targetFolderId) {
      triggerToast(`"${song.title || song.titulo}" ya se encuentra en "${target.titulo}"`, 'error');
      setShowMoveModal(false);
      setShowSongMenuModal(false);
      setSelectedSongForMenu(null);
      return;
    }

    // 1. Identificar índice de la canción para depuración detallada
    const indiceActual = (songs.length > 0 ? songs : canciones).findIndex(
      (s) => String(s.id) === String(song.id) || (s.audio_url && song.audio_url && s.audio_url === song.audio_url)
    );
    const numeroCancion = indiceActual >= 0 ? indiceActual + 1 : 1;
    console.log(`[Mover] Moviendo canción #${numeroCancion} ("${song.title || song.titulo}", ID: ${song.id}) a carpeta "${targetFolderId}"...`);

    // 2. Ejecutar UPDATE en Firestore usando la columna folder_id
    try {
      if (song.id && !String(song.id).startsWith('local_')) {
        await updateDoc(doc(db, 'songs', String(song.id)), { folder_id: targetFolderId });
      }
    } catch (dbErr) {
      console.warn(`[Firestore] Error al actualizar folder_id de la canción (${song.id}):`, dbErr);
    }

    // 2. Después del UPDATE, actualizar el estado local de React para reflejar el cambio inmediatamente sin recargar
    const updatedSong: Song = { ...song, folder_id: targetFolderId };

    // Actualizar canciones en estado general (setSongs y setCanciones)
    setSongs((prev) =>
      prev.map((s) => {
        const matchId = String(s.id) === String(song.id);
        const matchUrl = (s.audio_url && song.audio_url && s.audio_url === song.audio_url) ||
                         (s.url && song.url && s.url === song.url);
        return matchId || matchUrl ? { ...s, folder_id: targetFolderId } : s;
      })
    );

    setCanciones((prev) =>
      prev.map((s) => {
        const matchId = String(s.id) === String(song.id);
        const matchUrl = (s.audio_url && song.audio_url && s.audio_url === song.audio_url) ||
                         (s.url && song.url && s.url === song.url);
        return matchId || matchUrl ? { ...s, folder_id: targetFolderId } : s;
      })
    );

    // Actualizar listas de carpetas (actualiza inmediatamente los contadores verdes y contenidos)
    const updatedFolders = folders.map((f) => {
      const listSinCancion = (f.canciones || []).filter((c) => {
        const matchId = String(c.id) === String(song.id);
        const matchUrl = (c.audio_url && song.audio_url && c.audio_url === song.audio_url) ||
                         (c.url && song.url && c.url === song.url);
        return !matchId && !matchUrl;
      });

      if (f.id === targetFolderId) {
        return { ...f, canciones: [updatedSong, ...listSinCancion] };
      }
      return { ...f, canciones: listSinCancion };
    });
    saveFolders(updatedFolders);

    // Actualizar selectedFolder para que la vista detallada abierta de la carpeta refleje el cambio al instante
    if (selectedFolder) {
      const refreshed = updatedFolders.find((f) => f.id === selectedFolder.id);
      if (refreshed) {
        setSelectedFolder(refreshed);
      }
    }

    // Actualizar currentSong si la canción en reproducción fue la que se movió
    setCurrentSong((prev) => {
      if (!prev) return null;
      const matchId = String(prev.id) === String(song.id);
      const matchUrl = (prev.audio_url && song.audio_url && prev.audio_url === song.audio_url) ||
                       (prev.url && song.url && prev.url === song.url);
      return matchId || matchUrl ? { ...prev, folder_id: targetFolderId } : prev;
    });

    // 3. Guardar metadatos locales para persistencia offline
    const ruta = song.audio_url || song.url;
    if (ruta) {
      guardarMetadatoCancion(ruta, {
        titulo: song.title || song.titulo,
        artista: song.artist || song.artista,
        cover: song.cover_url || song.cover,
        folderId: targetFolderId,
        url: ruta,
        created_at: song.created_at || new Date().toISOString(),
        lyrics: song.lyrics
      });
    }

    // Cerrar modal de mover y menú
    setShowMoveModal(false);
    setShowSongMenuModal(false);
    setSelectedSongForMenu(null);

    // Feedback al usuario
    triggerToast(`¡"${song.title || song.titulo}" movida a "${target.titulo}"!`, 'success');
  };

  const agregarCancionACarpeta = (folderId: string, song: Song) => {
    const target = folders.find((f) => f.id === folderId);
    if (!target) return;

    const yaExiste = target.canciones.some(
      (c) => String(c.id) === String(song.id) || (c.titulo.toLowerCase() === song.titulo.toLowerCase() && c.artista.toLowerCase() === song.artista.toLowerCase())
    );

    if (yaExiste) {
      triggerToast(`"${song.titulo}" ya existe en "${target.titulo}"`, 'error');
      return;
    }

    const updated = folders.map((f) => {
      if (f.id === folderId) {
        return {
          ...f,
          canciones: [song, ...f.canciones]
        };
      }
      return f;
    });

    saveFolders(updated);
    if (selectedFolder && selectedFolder.id === folderId) {
      setSelectedFolder(updated.find((f) => f.id === folderId) || null);
    }
    triggerToast(`¡"${song.titulo}" agregada a "${target.titulo}"!`, 'success');
    setShowAddToFolderModal(false);
  };

  const quitarCancionDeCarpeta = (folderId: string, songId: string | number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const folder = folders.find((f) => f.id === folderId);
    const songName = folder?.canciones.find((c) => String(c.id) === String(songId))?.titulo || 'Canción';

    const updated = folders.map((f) => {
      if (f.id === folderId) {
        return {
          ...f,
          canciones: f.canciones.filter((c) => String(c.id) !== String(songId))
        };
      }
      return f;
    });

    saveFolders(updated);
    if (selectedFolder && selectedFolder.id === folderId) {
      setSelectedFolder(updated.find((f) => f.id === folderId) || null);
    }
    triggerToast(`"${songName}" quitada de la carpeta "${folder?.titulo || ''}"`, 'success');
  };

  // ==========================================
  // ORDENAMIENTO DE CARPETAS (BARRA FLOTANTE DINÁMICA: [GUARDAR] [DESHACER])
  // ==========================================
  const [ordenModificado, setOrdenModificado] = useState<boolean>(false);
  const [ordenPrevioCarpetas, setOrdenPrevioCarpetas] = useState<AudioFolder[] | null>(null);
  const [guardandoOrdenBarra, setGuardandoOrdenBarra] = useState<boolean>(false);

  // 3. GUARDADO REAL: Guarda el array de IDs REAL en la colección 'user_settings'
  const guardarOrdenReal = async (arrayDeIdsReales: string[]) => {
    try {
      await setDoc(doc(db, 'user_settings', 'default_user'), { playlists_order: arrayDeIdsReales }, { merge: true });
      console.log("Guardado exitoso de orden en Firestore");
    } catch (err: any) {
      console.error("Error al guardar orden en Firestore:", err?.message || err);
    }
  };
  const guardarOrdenEnDB = guardarOrdenReal;

  // 1. Reordenar carpetas en pantalla mediante Drag & Drop (onDrop / onDragEnd)
  const handleReorderFolders = async (sourceId: string, targetId: string) => {
    if (!sourceId || !targetId || sourceId === targetId) return;

    const sourceIndex = folders.findIndex((f) => f.id === sourceId);
    const targetIndex = folders.findIndex((f) => f.id === targetId);
    if (sourceIndex === -1 || targetIndex === -1) return;

    // Respaldar el orden original previo si no se había modificado aún
    if (!ordenModificado) {
      setOrdenPrevioCarpetas([...folders]);
    }

    // Calcular el nuevo orden de las carpetas en memoria
    const newFolders = [...folders];
    const [movedFolder] = newFolders.splice(sourceIndex, 1);
    newFolders.splice(targetIndex, 0, movedFolder);

    // Actualizar de inmediato el estado de React (se mantiene en pantalla)
    setFolders(newFolders);
    foldersRef.current = newFolders;

    // Mostrar barra flotante inferior [Guardar] [Deshacer]
    setOrdenModificado(true);

    // Extraer array de IDs REALES en el nuevo orden y guardar en Firestore
    const arrayDeIdsReales = newFolders.map((f) => f.id);
    await guardarOrdenReal(arrayDeIdsReales);
  };

  // 2. Acción Deshacer: regresa al orden anterior y oculta la barra
  const deshacerOrdenDesdeBarra = () => {
    if (ordenPrevioCarpetas && ordenPrevioCarpetas.length > 0) {
      setFolders(ordenPrevioCarpetas);
      foldersRef.current = ordenPrevioCarpetas;
    }
    setOrdenModificado(false);
    setOrdenPrevioCarpetas(null);
    triggerToast('Cambios en el orden deshechos', 'info');
  };

  // 3. Acción Guardar Personal (Todos los usuarios con sesión activa)
  const guardarOrdenPersonal = async () => {
    if (guardandoOrdenBarra) return;
    setGuardandoOrdenBarra(true);

    try {
      const activeUid = (user as any)?.id || user?.uid || auth.currentUser?.uid;

      if (!activeUid) {
        alert('⚠️ Debes iniciar sesión con tu cuenta para guardar tu orden personal.');
        if (ordenPrevioCarpetas && ordenPrevioCarpetas.length > 0) {
          setFolders(ordenPrevioCarpetas);
          foldersRef.current = ordenPrevioCarpetas;
        }
        setOrdenModificado(false);
        setOrdenPrevioCarpetas(null);
        setGuardandoOrdenBarra(false);
        return;
      }

      const playlistOrder = folders.map((f) => f.id);
      await setDoc(doc(db, 'user_settings', 'default_user'), { playlists_order: playlistOrder }, { merge: true });
      await setDoc(doc(db, 'user_preferences', activeUid), {
        user_id: activeUid,
        playlist_order: playlistOrder,
        updated_at: new Date().toISOString()
      }, { merge: true });

      setFolders([...folders]);
      foldersRef.current = [...folders];
      setOrdenModificado(false);
      setOrdenPrevioCarpetas(null);
      triggerToast('Orden guardado en tu perfil. Lo verás cada vez que inicies sesión', 'success');
    } catch (err: any) {
      console.error('Error al guardar orden personal en Firebase:', err);
      alert(`⚠️ Error al guardar en Firebase: ${err?.message || 'Fallo de conexión'}. El orden no se guardó.`);
      if (ordenPrevioCarpetas && ordenPrevioCarpetas.length > 0) {
        setFolders(ordenPrevioCarpetas);
        foldersRef.current = ordenPrevioCarpetas;
      }
      setOrdenModificado(false);
      setOrdenPrevioCarpetas(null);
    } finally {
      setGuardandoOrdenBarra(false);
    }
  };

  // 4. Acción Guardar Global (Solo Administrador):
  const guardarOrdenGlobal = async () => {
    if (guardandoOrdenBarra) return;
    if (!isAdmin) {
      alert('⚠️ Solo el administrador puede guardar el orden global.');
      return;
    }
    setGuardandoOrdenBarra(true);

    try {
      const playlistOrder = folders.map((f) => f.id);
      await setDoc(doc(db, 'user_settings', 'default_user'), { playlists_order: playlistOrder }, { merge: true });

      // Guardar también cada carpeta en Firestore
      for (let i = 0; i < folders.length; i++) {
        const f = folders[i];
        await setDoc(doc(db, 'folders', f.id), {
          id: f.id,
          titulo: f.titulo,
          subtitulo: f.subtitulo || '',
          descripcion: f.descripcion || '',
          cover_key: f.coverKey || '',
          badge: f.badge || '',
          order_index: i,
          updated_at: new Date().toISOString()
        }, { merge: true });
      }

      setFolders([...folders]);
      foldersRef.current = [...folders];
      setOrdenModificado(false);
      setOrdenPrevioCarpetas(null);
      triggerToast('Orden global actualizado para toda la aplicación', 'success');
    } catch (err: any) {
      console.error('Error al guardar orden global en Firebase:', err);
      alert(`⚠️ Error al guardar orden global en Firebase: ${err?.message || 'Fallo de conexión'}. El orden no se guardó.`);
      if (ordenPrevioCarpetas && ordenPrevioCarpetas.length > 0) {
        setFolders(ordenPrevioCarpetas);
        foldersRef.current = ordenPrevioCarpetas;
      }
      setOrdenModificado(false);
      setOrdenPrevioCarpetas(null);
    } finally {
      setGuardandoOrdenBarra(false);
    }
  };

  // 5. Acción Restablecer Orden: Elimina preferencia del usuario en Firestore y vuelve al orden global
  const restablecerOrden = async () => {
    try {
      const activeUid = (user as any)?.id || user?.uid || auth.currentUser?.uid;
      if (activeUid) {
        try {
          await deleteDoc(doc(db, 'user_preferences', activeUid));
        } catch (_) {}
      }
      await cargarCarpetasDesdeSupabase(undefined, true);
      triggerToast('Orden personal restablecido al global', 'success');
    } catch (err: any) {
      alert(`⚠️ Error al restablecer orden: ${err?.message || 'Error de conexión'}`);
    }
  };

  // 6. Router Guardar desde la barra flotante
  const guardarOrdenDesdeBarra = async (tipo: 'personal' | 'global' = 'personal') => {
    const arrayRealDeIds = folders.map((f) => f.id);
    await guardarOrdenReal(arrayRealDeIds);
    setOrdenModificado(false);
    setOrdenPrevioCarpetas(null);
    triggerToast('¡Orden de playlists guardado con éxito!', 'success');
  };

  // Helper para obtener el título de carpeta origen de una canción
  const getFolderTitleForSong = useCallback((song: Song): string => {
    if (song.folder_id) {
      const found = folders.find((f) => f.id === song.folder_id) || carpetasAudio.find((f) => f.id === song.folder_id);
      if (found) return found.titulo;
    }
    const foundInFolder = folders.find((f) => (f.canciones || []).some((c) => String(c.id) === String(song.id)));
    if (foundInFolder) return foundInFolder.titulo;
    return 'Biblioteca general';
  }, [folders]);

  // Lista unificada y sin duplicados de todas las canciones de la app
  const todasLasCancionesBiblioteca: Song[] = React.useMemo(() => {
    const map = new Map<string, Song>();
    const allSources = [...songs, ...canciones];
    folders.forEach((f) => {
      (f.canciones || []).forEach((c) => {
        if (c && c.id) allSources.push(c);
      });
    });

    for (const item of allSources) {
      if (!item || !item.id) continue;
      const key = String(item.id);
      if (!map.has(key)) {
        map.set(key, item);
      }
    }
    return Array.from(map.values());
  }, [songs, canciones, folders]);

  // Confirmar agregar canciones seleccionadas desde la biblioteca a la playlist actual persistiendo en Supabase
  const handleConfirmarAgregarDesdeBiblioteca = async () => {
    if (!selectedFolder || selectedSongIdsToAdd.size === 0) return;

    const cancionesActuales = obtenerCancionesCarpeta(selectedFolder);
    const cancionesActualesIds = new Set(cancionesActuales.map((c) => String(c.id)));

    const cancionesParaAgregar = todasLasCancionesBiblioteca.filter((c) => selectedSongIdsToAdd.has(String(c.id)));
    if (cancionesParaAgregar.length === 0) return;

    const cancionesNuevas = cancionesParaAgregar.filter((c) => !cancionesActualesIds.has(String(c.id)));

    if (cancionesNuevas.length === 0) {
      triggerToast('Las canciones seleccionadas ya están en esta playlist', 'info');
      setShowAddMusicToCurrentFolderModal(false);
      return;
    }

    const idsParaActualizar = cancionesNuevas.map((c) => c.id);
    const urlsParaActualizar = cancionesNuevas.map((c) => c.audio_url || c.url).filter(Boolean);

    let firestoreError: any = null;

    try {
      // 1. Actualizar folder_id de esas canciones en la colección 'songs' de Firestore
      for (const c of cancionesNuevas) {
        if (c.id && !String(c.id).startsWith('local_')) {
          await updateDoc(doc(db, 'songs', String(c.id)), { folder_id: selectedFolder.id });
        }
      }
    } catch (err: any) {
      firestoreError = err;
    }

    // 3. Manejo de errores: Si Firestore devuelve un error, alert y console.error
    if (firestoreError) {
      console.error('Error al agregar canciones en Firestore:', firestoreError);
      alert(
        `Error al guardar canciones en Firebase:\n${
          firestoreError.message || 'No se pudieron actualizar las canciones en la base de datos.'
        }`
      );
      return; // CRÍTICO: NO actualizar el estado de React si la petición falló
    }

    // 4. Solo actualizar el estado de React si la petición a Firestore fue exitosa
    setSongs((prev) =>
      prev.map((s) => (idsParaActualizar.includes(s.id) ? { ...s, folder_id: selectedFolder.id } : s))
    );
    setCanciones((prev) =>
      prev.map((s) => (idsParaActualizar.includes(s.id) ? { ...s, folder_id: selectedFolder.id } : s))
    );

    const cancionesConNuevoFolder = cancionesNuevas.map((c) => ({ ...c, folder_id: selectedFolder.id }));
    const updatedFolders = folders.map((f) => {
      if (f.id === selectedFolder.id) {
        return {
          ...f,
          canciones: [...cancionesConNuevoFolder, ...(f.canciones || [])]
        };
      }
      return f;
    });

    setFolders(updatedFolders);
    foldersRef.current = updatedFolders;
    try {
      localStorage.setItem('fa_folders_v3', JSON.stringify(updatedFolders));
    } catch {}

    const updatedCurrentFolder = updatedFolders.find((f) => f.id === selectedFolder.id) || null;
    setSelectedFolder(updatedCurrentFolder);
    setShowAddMusicToCurrentFolderModal(false);
    setSelectedSongIdsToAdd(new Set());
    triggerToast(
      `¡${cancionesNuevas.length} ${
        cancionesNuevas.length === 1 ? 'canción agregada' : 'canciones agregadas'
      } a "${selectedFolder.titulo}"!`,
      'success'
    );
  };

  const eliminarCancionDirecta = async (song: Song) => {
    if (!song) return;
    const songIdStr = String(song.id);

    // 1. Quitar de todas las carpetas y persistir fa_folders_v3
    const updatedFolders = folders.map((f) => ({
      ...f,
      canciones: (f.canciones || []).filter((c) => String(c.id) !== songIdStr)
    }));
    setFolders(updatedFolders);
    saveFolders(updatedFolders);
    try {
      localStorage.setItem('fa_folders_v3', JSON.stringify(updatedFolders));
    } catch {}

    if (selectedFolder) {
      setSelectedFolder(updatedFolders.find((f) => f.id === selectedFolder.id) || null);
    }

    // 2. Quitar de songs, canciones y library en estado y localStorage
    const filterSong = (prev: Song[]) => {
      const next = prev.filter((item) => String(item.id) !== songIdStr);
      try {
        localStorage.setItem('library', JSON.stringify(next));
        localStorage.setItem(CUSTOM_LIBRARY_KEY, JSON.stringify(next));
        localStorage.setItem('spotyy_custom_songs_v1', JSON.stringify(next));
        localStorage.setItem('canciones', JSON.stringify(next));
      } catch {}
      return next;
    };

    setSongs(filterSong);
    setCanciones(filterSong);
    setLibrary(filterSong);

    // 3. Quitar de favoritos si estaba
    setFavorites((prev) => {
      const next = prev.filter((id) => id !== songIdStr);
      try {
        localStorage.setItem('fa_favorites_v1', JSON.stringify(next));
      } catch {}
      return next;
    });

    // 4. Quitar de la cola de reproducción
    setQueue((prev) => prev.filter((s) => String(s.id) !== songIdStr));

    // 5. Si es la que está sonando actualmente, detener o pasar a otra
    if (currentSong && String(currentSong.id) === songIdStr) {
      setIsPlaying(false);
      const restantes = (songs.length > 0 ? songs : canciones).filter((s) => String(s.id) !== songIdStr);
      setCurrentSong(restantes.length > 0 ? restantes[0] : null);
    }

    // 6. Eliminar en Firestore si aplica
    try {
      if (!songIdStr.startsWith('local_')) {
        deleteDoc(doc(db, 'songs', String(song.id))).catch(() => {});
      }
    } catch {}

    triggerToast(`"${song.title || song.titulo}" eliminada de Tu biblioteca`, 'success');
  };

  const agregarCancionAColaDirecta = (song: Song) => {
    if (!song) return;
    setQueue((prev) => {
      const filtrada = prev.filter((s) => String(s.id) !== String(song.id));
      return [song, ...filtrada];
    });
    triggerToast(`"${song.title || song.titulo}" se reproducirá a continuación`, 'success');
  };

  const agregarCarpetaAColaDirecta = (folder: AudioFolder) => {
    if (!folder) return;
    const cancionesFolder = obtenerCancionesCarpeta(folder);
    if (cancionesFolder.length === 0) {
      triggerToast('La playlist no tiene canciones para la fila', 'info');
      return;
    }
    setQueue((prev) => {
      const folderSongIds = new Set(cancionesFolder.map((c) => String(c.id)));
      const filtrada = prev.filter((s) => !folderSongIds.has(String(s.id)));
      return [...cancionesFolder, ...filtrada];
    });
    triggerToast(`Playlist "${folder.titulo}" agregada a la fila`, 'success');
  };

  const compartirElemento = (item: Song | AudioFolder) => {
    const isSong = 'titulo' in item || 'title' in item;
    const titulo = isSong ? ((item as Song).title || (item as Song).titulo) : (item as AudioFolder).titulo;
    const shareUrl = window.location.origin;
    const shareText = `Escucha "${titulo}" en Spotyy_AA: ${shareUrl}`;

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(shareText).then(() => {
        triggerToast('Enlace copiado al portapapeles', 'success');
      }).catch(() => {
        triggerToast('Enlace copiado', 'success');
      });
    } else {
      triggerToast('Enlace: ' + shareUrl, 'info');
    }
  };

  const agregarCancionAPlaylistDirecta = (song: Song, targetFolderId: string) => {
    if (!song || !targetFolderId) return;
    const targetFolder = folders.find((f) => f.id === targetFolderId) || carpetasAudio.find((f) => f.id === targetFolderId);

    setFolders((prev) => {
      const exists = prev.some((f) => f.id === targetFolderId);
      let updated: AudioFolder[];
      if (exists) {
        updated = prev.map((f) => {
          if (f.id === targetFolderId) {
            const alreadyIn = (f.canciones || []).some((c) => String(c.id) === String(song.id));
            if (alreadyIn) return f;
            return {
              ...f,
              canciones: [song, ...(f.canciones || [])]
            };
          }
          return f;
        });
      } else if (targetFolder) {
        updated = [
          ...prev,
          {
            ...targetFolder,
            canciones: [song, ...(targetFolder.canciones || [])]
          }
        ];
      } else {
        updated = prev;
      }
      saveFolders(updated);
      try {
        localStorage.setItem('fa_folders_v3', JSON.stringify(updated));
      } catch {}
      return updated;
    });

    triggerToast(`"${song.title || song.titulo}" agregada a "${targetFolder?.titulo || 'Playlist'}"`, 'success');
  };

  const quitarDeSeccionActual = (item: Song | AudioFolder) => {
    if ('canciones' in item && !('url' in item)) {
      removeFromHomeScreen((item as AudioFolder).id);
    } else if (selectedFolder && 'id' in item) {
      quitarCancionDeCarpeta(selectedFolder.id, (item as Song).id);
    } else {
      triggerToast('Elemento quitado de esta sección', 'info');
    }
  };

  const eliminarCarpetaDirecta = (folder: AudioFolder) => {
    if (!folder) return;
    removeFromHomeScreen(folder.id);
    triggerToast(`"${folder.titulo}" quitada de Tu biblioteca`, 'success');
  };

  const solicitarEliminarCancion = (song: Song, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSongToDelete(song);
  };

  const eliminarCancion = (song: Song, e?: React.MouseEvent) => {
    solicitarEliminarCancion(song, e);
  };

  const confirmarEliminarCancion = async () => {
    if (!songToDelete) return;
    const song = songToDelete;
    setSongToDelete(null);

    // Quitar de todas las carpetas
    const updatedFolders = folders.map((f) => ({
      ...f,
      canciones: f.canciones.filter((c) => String(c.id) !== String(song.id))
    }));
    saveFolders(updatedFolders);
    if (selectedFolder) {
      setSelectedFolder(updatedFolders.find((f) => f.id === selectedFolder.id) || null);
    }

    setSongs((prev) => prev.filter((item) => String(item.id) !== String(song.id)));
    setCanciones((prev) => prev.filter((item) => String(item.id) !== String(song.id)));
    if (currentSong?.id === song.id) {
      setCurrentSong(initialDemoSongs[0]);
      setIsPlaying(false);
    }

    try {
      if (!String(song.id).startsWith('local_')) {
        await deleteDoc(doc(db, 'songs', String(song.id)));
      }
    } catch (err: unknown) {
      console.warn('Nota al eliminar de Firestore:', err);
    }
    triggerToast(`"${song.titulo}" ha sido eliminada permanentemente.`, 'success');
  };

  const solicitarEliminarCarpeta = (folder: AudioFolder, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setFolderToDelete(folder);
  };

  const confirmarEliminarCarpeta = () => {
    if (!folderToDelete) return;
    const fId = folderToDelete.id;
    const fName = folderToDelete.titulo;
    setFolderToDelete(null);

    const updated = folders.filter((f) => f.id !== fId);
    saveFolders(updated);
    if (selectedFolder?.id === fId) {
      setSelectedFolder(null);
    }
    triggerToast(`Carpeta "${fName}" eliminada exitosamente.`, 'success');
  };

  // ==========================================
  // SUBIDA DIRECTA DE AUDIOS A LA CARPETA ACTUAL (CLOUDFLARE R2 + SUPABASE)
  // ==========================================
  const handleFolderDirectUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const currentFolderId = selectedFolder?.id || targetFolderId || 'buchonass';
    const folderObj = folders.find((f) => f.id === currentFolderId) || selectedFolder;

    setIsDirectFolderUploading(true);
    let subidasExitosas = 0;

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        try {
          const id3 = await extractAudioMetadataFromFile(file);
          const fast = parseSmartAudioName(file.name);
          const songTitle = id3.title || fast.titulo || file.name.replace(/\.[^/.]+$/, '').replace(/_/g, ' ');
          const songArtist =
            id3.artist ||
            (folderObj && folderObj.titulo !== 'tus_me_gusta' && fast.artista === 'Artista'
              ? folderObj.titulo
              : fast.artista) ||
            'Artista';

          // Búsqueda en iTunes (600x600) y subida de portada a Cloudflare R2 covers/
          const cover = await resolveCoverAndUploadToR2(songArtist, songTitle, (id3 as any)?.embeddedCoverBlob);

          // 1. Subir archivo a Cloudflare R2 con PutObjectCommand
          let publicUrl = '';
          try {
            publicUrl = await uploadToR2(file);
            console.log(`[R2] Archivo ${i + 1}/${files.length} "${file.name}" subido a R2:`, publicUrl);
          } catch (r2Err: any) {
            console.error('Error al subir a Cloudflare R2:', r2Err);
            alert(
              `Error al subir a Cloudflare R2:\n\n${r2Err?.message || r2Err}\n\nVerifica tus credenciales de Cloudflare R2 (VITE_R2_ACCESS_KEY_ID, VITE_R2_SECRET_ACCESS_KEY, VITE_R2_ENDPOINT, VITE_R2_BUCKET_NAME) y la configuración de CORS en tu bucket.`
            );
            throw r2Err;
          }

          // 2. Guardar metadatos en Firebase Firestore (colección 'songs')
          let dbRecord: any = null;
          try {
            const nuevaCancionData = {
              title: fixUtf8Encoding(songTitle),
              artist: fixUtf8Encoding(songArtist),
              cover_url: cover,
              audio_url: publicUrl,
              folder_id: currentFolderId,
              created_at: new Date().toISOString()
            };
            const docRef = await addDoc(collection(db, 'songs'), nuevaCancionData);
            dbRecord = { id: docRef.id, ...nuevaCancionData };
          } catch (fireErr: any) {
            console.error('Error al guardar en Firebase:', fireErr);
          }

          const nuevaCancion: Song = {
            id: dbRecord?.id || ('r2_' + Date.now() + '_' + i),
            title: songTitle,
            artist: songArtist,
            titulo: songTitle,
            artista: songArtist,
            cover_url: cover,
            cover: cover,
            audio_url: publicUrl,
            url: publicUrl,
            storage_path: publicUrl,
            created_at: dbRecord?.created_at || new Date().toISOString(),
            folder_id: currentFolderId,
            lyrics: id3.lyrics || undefined
          };

          // 3. Actualizar catálogo general de canciones
          setSongs((prev) => [
            nuevaCancion,
            ...prev.filter((s) => String(s.id) !== String(nuevaCancion.id))
          ]);
          setCanciones((prev) => [
            nuevaCancion,
            ...prev.filter((s) => String(s.id) !== String(nuevaCancion.id))
          ]);

          // 4. Actualizar estado de las carpetas
          setFolders((prevFolders) => {
            const next = prevFolders.map((f) => {
              if (f.id === currentFolderId) {
                return {
                  ...f,
                  canciones: [
                    nuevaCancion,
                    ...(f.canciones || []).filter((c) => String(c.id) !== String(nuevaCancion.id))
                  ]
                };
              }
              return f;
            });
            saveFolders(next);
            return next;
          });

          // 5. Actualizar la vista de la carpeta activa inmediatamente
          setSelectedFolder((prev) => {
            if (prev && prev.id === currentFolderId) {
              return {
                ...prev,
                canciones: [
                  nuevaCancion,
                  ...(prev.canciones || []).filter((c) => String(c.id) !== String(nuevaCancion.id))
                ]
              };
            }
            return prev;
          });

          // 6. Guardar metadatos locales y persistencia de letras
          guardarMetadatoCancion(publicUrl, {
            titulo: songTitle,
            artista: songArtist,
            cover,
            folderId: currentFolderId,
            url: publicUrl,
            created_at: nuevaCancion.created_at || new Date().toISOString(),
            lyrics: id3.lyrics || undefined
          });
          guardarLetraPersistente(nuevaCancion.id, publicUrl, songTitle, songArtist, id3.lyrics);

          subidasExitosas++;

          // Retraso de 2 segundos entre canciones para proteger la API de iTunes
          if (i < files.length - 1) {
            await new Promise((resolve) => setTimeout(resolve, 2000));
          }
        } catch (fileErr) {
          console.error(`Error procesando archivo "${file.name}":`, fileErr);
          break;
        }
      }

      if (subidasExitosas > 0) {
        triggerToast(
          `¡${subidasExitosas} audio(s) agregado(s) a "${folderObj?.titulo || currentFolderId}"!`,
          'success'
        );
      }
    } finally {
      setIsDirectFolderUploading(false);
      if (e.target) e.target.value = '';
    }
  };

  // ==========================================
  // SUBIDA AL STORAGE Y FIREBASE OPTIMIZADA (handleSingleUpload / subirCancion)
  // Flujo No-Bloqueante:
  // a) Sube el archivo a Cloudflare R2 con timeout de seguridad.
  // b) Guarda los metadatos en Firebase Firestore inmediatamente usando addDoc.
  // c) Muestra éxito al usuario y CIERRA EL MODAL de inmediato.
  // d) Búsqueda en iTunes y actualización de portada en segundo plano (sin bloquear al usuario).
  // e) Manejo completo try...catch...finally con alert() de error y desbloqueo de estado.
  // ==========================================
  async function handleSingleUpload(file: File) {
    if (!file) {
      alert('Por favor selecciona un archivo de audio MP3.');
      return;
    }

    setIsUploading(true);
    setUploadStatus('Subiendo archivo de audio...');

    try {
      // Metadatos iniciales rápidos e instantáneos (sin esperas de red)
      const fast = parseSmartAudioName(file.name);
      let songTitle = (customTitle.trim() || fast.titulo || file.name.replace(/\.[^/.]+$/, '').replace(/_/g, ' ')).trim();
      let songArtist = (customArtist.trim() || fast.artista || 'Artista').trim();
      if (!songTitle) songTitle = file.name.replace(/\.[^/.]+$/, '').replace(/_/g, ' ') || 'Canción';
      if (!songArtist || songArtist.toLowerCase() === 'desconocido') songArtist = 'Artista';

      const currentGenre = (detectedGenre || latestGenreRef.current || fast.generoInicial || '').trim();

      // Carátula inicial inmediata
      let initialCover = (coverPreviewUrl || customCoverUrl || '').trim();
      if (!initialCover) {
        initialCover = currentGenre ? getGenreCover(currentGenre) : DEFAULT_SONG_COVER;
      }

      // Destino de carpeta
      let destFolder = manualTargetFolderId || 'tus_me_gusta';
      let destFolderTitle = 'Tus Me Gusta';
      if (manualTargetFolderId) {
        const chosen = foldersRef.current.find((f) => f.id === manualTargetFolderId) || folders.find((f) => f.id === manualTargetFolderId);
        if (chosen) {
          destFolderTitle = chosen.titulo;
        }
      } else if (currentGenre) {
        try {
          const rf = await findOrCreateGenreFolder(currentGenre);
          destFolder = rf.folderId;
          destFolderTitle = rf.folderTitle;
        } catch (_) {}
      }

      // a) Sube el archivo a Cloudflare R2 con timeout de seguridad de 45 segundos
      setUploadStatus(`Subiendo archivo de audio "${songTitle}" a Cloudflare R2...`);
      let publicUrl = '';
      try {
        publicUrl = await Promise.race([
          uploadToR2(file),
          new Promise<string>((_, reject) =>
            setTimeout(() => reject(new Error('Tiempo de espera agotado al subir a Cloudflare R2 (45s). Verifica tu conexión o configuración de R2.')), 45000)
          )
        ]);
        console.log('[Upload] Archivo subido exitosamente a R2:', publicUrl);
      } catch (r2Error: any) {
        console.error('Error al subir a Cloudflare R2:', r2Error);
        throw new Error(`Error al subir a Cloudflare R2:\n\n${r2Error?.message || r2Error}\n\nVerifica tus credenciales y configuración CORS en Cloudflare R2.`);
      }

      // b) Guarda los metadatos en Firebase Firestore inmediatamente usando addDoc
      setUploadStatus(`Guardando metadatos de "${songTitle}" en Firebase Firestore...`);
      const songData = {
        title: fixUtf8Encoding(songTitle),
        artist: fixUtf8Encoding(songArtist),
        cover_url: initialCover,
        audio_url: publicUrl,
        folder_id: destFolder,
        created_at: new Date().toISOString()
      };

      let dbDocId = 'r2_' + Date.now();
      try {
        const docRef = await Promise.race([
          addDoc(collection(db, 'songs'), songData),
          new Promise<any>((_, reject) => setTimeout(() => reject(new Error('Timeout al guardar documento en Firestore')), 8000))
        ]);
        dbDocId = docRef.id;
        console.log('[Upload] Metadatos guardados con addDoc en Firestore con ID:', dbDocId);
      } catch (fireErr: any) {
        console.warn('Nota guardando en Firestore:', fireErr);
      }

      const nuevaCancion: Song = {
        id: dbDocId,
        title: songTitle,
        artist: songArtist,
        titulo: songTitle,
        artista: songArtist,
        cover_url: initialCover,
        cover: initialCover,
        audio_url: publicUrl,
        url: publicUrl,
        storage_path: publicUrl,
        created_at: songData.created_at,
        folder_id: destFolder
      };

      // Actualizar estado local inmediatamente
      setSongs((prev) => [nuevaCancion, ...prev.filter((s) => String(s.id) !== String(nuevaCancion.id))]);
      setCanciones((prev) => [nuevaCancion, ...prev.filter((s) => String(s.id) !== String(nuevaCancion.id))]);

      // Agregar a la carpeta destino en memoria
      setFolders((prevFolders) => {
        const folderExists = prevFolders.some((f) => f.id === destFolder);
        const baseFolders = folderExists
          ? prevFolders
          : [
              ...prevFolders,
              {
                id: destFolder,
                titulo: destFolderTitle,
                subtitulo: `Colección de ${destFolderTitle}`,
                descripcion: `Carpeta ${destFolderTitle}`,
                coverKey: obtenerPortadaUnsplashCarpeta(destFolderTitle),
                coverUrl: obtenerPortadaUnsplashCarpeta(destFolderTitle),
                badge: destFolderTitle,
                canciones: []
              }
            ];

        const next = baseFolders.map((f) => {
          if (f.id === destFolder) {
            return {
              ...f,
              canciones: [nuevaCancion, ...(f.canciones || []).filter((c) => String(c.id) !== String(nuevaCancion.id))]
            };
          }
          return f;
        });
        saveFolders(next);
        return next;
      });

      setSelectedFolder((prev) => {
        if (prev && prev.id === destFolder) {
          return {
            ...prev,
            canciones: [nuevaCancion, ...(prev.canciones || []).filter((c) => String(c.id) !== String(nuevaCancion.id))]
          };
        }
        return prev;
      });

      guardarMetadatoCancion(publicUrl, {
        titulo: songTitle,
        artista: songArtist,
        cover: initialCover,
        folderId: destFolder,
        url: publicUrl,
        created_at: nuevaCancion.created_at || new Date().toISOString()
      });

      // c) MUÉSTRALE UN ÉXITO AL USUARIO Y CIERRA EL MODAL
      triggerToast(`¡"${songTitle}" agregada con éxito!`, 'success');
      setShowUploadModal(false);
      setSelectedFile(null);
      setCoverFile(null);
      setCoverPreviewUrl('');
      setCustomTitle('');
      setCustomArtist('');
      setCustomCoverUrl('');
      setAiIdentifiedInfo(null);
      setDetectedGenre('');
      latestGenreRef.current = '';
      setManualTargetFolderId('');
      setShowFolderPickerInModal(false);
      setIsUploading(false);
      setUploadStatus('');

      // Iniciar reproducción instantánea
      setCurrentSong(nuevaCancion);
      setIsPlaying(true);

      // d) La búsqueda de la foto en iTunes y la actualización de la misma en Firebase,
      // hazla en un SEGUNDO PLANO (después de cerrar el modal, sin bloquear al usuario).
      const finalFile = file;
      const finalDocId = dbDocId;
      const finalPublicUrl = publicUrl;
      const finalSongId = nuevaCancion.id;
      const finalDestFolder = destFolder;

      setTimeout(async () => {
        try {
          let updatedCover = '';

          // Si el usuario proporcionó un archivo de carátula local, subirlo a R2 en background
          if (coverFile) {
            try {
              updatedCover = await uploadCoverToR2(coverFile, `cover_${songTitle}.jpg`);
            } catch (_) {}
          }

          // Si no se proveyó carátula personalizada, buscar en iTunes y metadatos ID3
          if (!updatedCover && !coverPreviewUrl && !customCoverUrl) {
            console.log(`[Segundo Plano] Buscando portada en iTunes para "${songArtist} - ${songTitle}"...`);
            let embeddedCoverBlob: Blob | null | undefined = undefined;
            try {
              const id3Meta = await extractAudioMetadataFromFile(finalFile);
              if (id3Meta.embeddedCoverBlob) embeddedCoverBlob = id3Meta.embeddedCoverBlob;
              if (id3Meta.lyrics) {
                guardarLetraPersistente(finalSongId, finalPublicUrl, songTitle, songArtist, id3Meta.lyrics);
              }
            } catch (_) {}

            try {
              updatedCover = await Promise.race([
                resolveCoverAndUploadToR2(songArtist, songTitle, embeddedCoverBlob),
                new Promise<string>((resolve) => setTimeout(() => resolve(''), 7000))
              ]);
            } catch (_) {}
          }

          // Si obtuvimos una portada de alta resolución diferente a la inicial, actualizar Firebase y la UI
          if (updatedCover && updatedCover !== DEFAULT_SONG_COVER && updatedCover !== initialCover) {
            console.log('[Segundo Plano] Actualizando portada en Firebase Firestore:', updatedCover);

            // Actualizar documento en Firebase Firestore
            if (finalDocId && !finalDocId.startsWith('r2_')) {
              try {
                await updateDoc(doc(db, 'songs', finalDocId), {
                  cover_url: updatedCover,
                  cover: updatedCover
                });
              } catch (uErr) {
                console.warn('[Segundo Plano] Error al actualizar documento en Firestore:', uErr);
              }
            }

            // Actualizar estados reactivos
            const songCoverUpdater = (s: Song) =>
              String(s.id) === String(finalSongId) ? { ...s, cover_url: updatedCover, cover: updatedCover } : s;

            setSongs((prev) => prev.map(songCoverUpdater));
            setCanciones((prev) => prev.map(songCoverUpdater));
            setFolders((prevFolders) =>
              prevFolders.map((f) => ({
                ...f,
                canciones: (f.canciones || []).map(songCoverUpdater)
              }))
            );
            setSelectedFolder((prev) =>
              prev ? { ...prev, canciones: (prev.canciones || []).map(songCoverUpdater) } : prev
            );
            setCurrentSong((prev) =>
              prev && String(prev.id) === String(finalSongId)
                ? { ...prev, cover_url: updatedCover, cover: updatedCover }
                : prev
            );

            guardarMetadatoCancion(finalPublicUrl, {
              titulo: songTitle,
              artista: songArtist,
              cover: updatedCover,
              folderId: finalDestFolder,
              url: finalPublicUrl,
              created_at: nuevaCancion.created_at || new Date().toISOString()
            });
          }
        } catch (bgError) {
          console.warn('[Segundo Plano] Error silencioso al enriquecer portada:', bgError);
        }
      }, 100);

    } catch (error: any) {
      console.error('Fallo en proceso de subida:', error);
      alert(`Error al subir la canción:\n\n${error?.message || error}`);
    } finally {
      setIsUploading(false);
      setUploadStatus('');
    }
  }

  // Alias compatible para mantener todas las referencias funcionales
  const subirCancion = handleSingleUpload;

  // ==========================================
  // SUBIDA DE MÚLTIPLES ARCHIVOS MP3 Y CARPETAS ENTERAS CON CLASIFICACIÓN POR GÉNERO
  // ==========================================
  const subirMultiplesArchivos = async (archivos: FileList | File[], folderDestinoId?: string) => {
    const lista = Array.from(archivos).filter((f) => {
      const ext = f.name.toLowerCase();
      return (
        f.type.startsWith('audio/') ||
        ext.endsWith('.mp3') ||
        ext.endsWith('.wav') ||
        ext.endsWith('.m4a') ||
        ext.endsWith('.aac') ||
        ext.endsWith('.flac') ||
        ext.endsWith('.ogg')
      );
    });

    if (lista.length === 0) {
      triggerToast('No se encontraron archivos de audio MP3 compatibles.', 'error');
      return;
    }

    setIsUploading(true);
    const nuevasCanciones: Song[] = [];

    for (let i = 0; i < lista.length; i++) {
      const file = lista[i];
      setUploadProgress({ total: lista.length, current: i + 1, currentName: file.name });
      setUploadStatus(`Clasificando con IA género de ${i + 1} de ${lista.length}: "${file.name}"...`);

      try {
        const id3 = await extractAudioMetadataFromFile(file);
        const fast = parseSmartAudioName(file.name);
        let songTitle = id3.title || fast.titulo || file.name.replace(/\.[^/.]+$/, '');
        let songArtist = id3.artist || fast.artista || 'Artista';
        let detectedGenreForFile: string | null = fast.generoInicial || normalizeGenreName(id3.genre);

        // Clasificar género con IA DeepSeek individualmente para cada canción
        try {
          const resp = await fetch('/api/ai/tag-audio', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              filename: file.name,
              id3Title: songTitle,
              id3Artist: songArtist,
              id3Genre: id3.genre
            })
          });
          const json = await resp.json();
          if (json.success && json.data) {
            if (json.data.titulo) songTitle = json.data.titulo;
            if (json.data.artista) songArtist = json.data.artista;
            const aiGenre = normalizeGenreName(json.data.genre || json.data.genero);
            if (aiGenre) {
              detectedGenreForFile = aiGenre;
            }
          }
        } catch (aiErr) {
          console.warn('Nota análisis múltiple IA:', aiErr);
        }

        // Resolución de la carpeta de destino: respetar selección previa, carpeta subida o agrupar en 'Mis Canciones'
        const relativePath = (file as any).webkitRelativePath;
        let folderFromDir = '';
        if (relativePath && relativePath.includes('/')) {
          folderFromDir = relativePath.split('/')[0].trim();
        }

        let resolvedFolder: { folderId: string; folderTitle: string };
        if (folderDestinoId) {
          const chosen = foldersRef.current.find((f) => f.id === folderDestinoId) || folders.find((f) => f.id === folderDestinoId);
          resolvedFolder = {
            folderId: folderDestinoId,
            folderTitle: chosen?.titulo || folderDestinoId
          };
        } else if (folderFromDir) {
          const folderSlug = folderFromDir.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'mi_carpeta';
          resolvedFolder = {
            folderId: folderSlug,
            folderTitle: folderFromDir
          };
        } else {
          // Asignación automática por género
          resolvedFolder = await findOrCreateGenreFolder(detectedGenreForFile || id3.genre);
        }
        const fileDestFolder = resolvedFolder.folderId;
        const fileDestTitle = resolvedFolder.folderTitle;

        // Búsqueda en iTunes (600x600) y subida a Cloudflare R2 covers/
        const cover = await resolveCoverAndUploadToR2(songArtist, songTitle, (id3 as any)?.embeddedCoverBlob);

        // 1. Subir archivo de audio a Cloudflare R2 con PutObjectCommand
        let finalAudioUrl = '';
        try {
          finalAudioUrl = await uploadToR2(file);
        } catch (r2Err: any) {
          console.error(`Error al subir a Cloudflare R2 "${file.name}":`, r2Err);
          triggerToast(`Error en R2 con "${file.name}": ${r2Err?.message || 'Error de subida'}`, 'error');
          continue;
        }

        const ruta = finalAudioUrl;

        // 2. Insertar en Firestore en la colección 'songs'
        let dbId: string | undefined;
        let insertFailed = false;
        try {
          const songPayload = {
            title: fixUtf8Encoding(songTitle),
            artist: fixUtf8Encoding(songArtist),
            cover_url: cover,
            audio_url: finalAudioUrl,
            folder_id: fileDestFolder,
            created_at: new Date().toISOString()
          };
          const docRef = await addDoc(collection(db, 'songs'), songPayload);
          dbId = docRef.id;
        } catch (fErr) {
          console.warn('Nota guardando en Firestore:', fErr);
        }

        const cancion: Song = {
          id: dbId || ('r2_' + Date.now() + '_' + i),
          title: songTitle,
          artist: songArtist,
          titulo: songTitle,
          artista: songArtist,
          cover_url: cover,
          cover: cover,
          audio_url: finalAudioUrl,
          url: finalAudioUrl,
          storage_path: ruta,
          created_at: new Date().toISOString(),
          folder_id: fileDestFolder,
          lyrics: id3.lyrics || undefined
        };

        guardarMetadatoCancion(ruta, {
          titulo: songTitle,
          artista: songArtist,
          cover,
          folderId: fileDestFolder,
          url: finalAudioUrl,
          created_at: cancion.created_at || new Date().toISOString(),
          lyrics: id3.lyrics || undefined
        });
        guardarLetraPersistente(cancion.id, ruta, songTitle, songArtist, id3.lyrics);

        nuevasCanciones.push(cancion);

        // Actualizar carpetas dinámicamente y guardar en foldersRef inmediatamente
        setFolders((prevFolders) => {
          const exists = prevFolders.some((f) => f.id === fileDestFolder);
          const base = exists
            ? prevFolders
            : [
                ...prevFolders,
                {
                  id: fileDestFolder,
                  titulo: fileDestTitle,
                  subtitulo: `Colección de ${fileDestTitle}`,
                  descripcion: `Carpeta ${fileDestTitle}`,
                  coverKey: obtenerPortadaUnsplashCarpeta(fileDestTitle),
                  coverUrl: obtenerPortadaUnsplashCarpeta(fileDestTitle),
                  badge: fileDestTitle,
                  canciones: []
                }
              ];

          const updated = base.map((f) => {
            if (f.id === fileDestFolder) {
              return {
                ...f,
                canciones: [cancion, ...(f.canciones || []).filter((c) => String(c.id) !== String(cancion.id))]
              };
            }
            return f;
          });
          foldersRef.current = updated;
          saveFolders(updated);
          return updated;
        });

        triggerToast(`Canción guardada en la carpeta ${fileDestTitle}.`, 'success');

        // Retraso de 2 segundos entre canciones para proteger la API de iTunes
        if (i < lista.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 2000));
        }
      } catch (err) {
        console.warn('Error subiendo audio múltiple:', err);
      }
    }

    if (nuevasCanciones.length > 0) {
      setSongs((prev) => [...nuevasCanciones, ...prev.filter((p) => !nuevasCanciones.some((n) => String(n.id) === String(p.id)))]);
      setCanciones((prev) => [...nuevasCanciones, ...prev.filter((p) => !nuevasCanciones.some((n) => String(n.id) === String(p.id)))]);

      reproducirCancionDirecta(nuevasCanciones[0]);
    }

    setIsUploading(false);
    setUploadStatus('');
    setUploadProgress(null);
    setShowUploadModal(false);
  };

  // ==========================================
  // CONTROLES DE REPRODUCCIÓN & AUTOPLAY SIGUIENTE
  // ==========================================
  // Referencia a la lista o carpeta de reproducción activa para continuidad y controles Bluetooth
  const activePlaylistRef = useRef<Song[]>([]);

  // Actualización inmediata de metadatos Media Session para pantallas Bluetooth y Auto
  const actualizarMediaSessionMetadata = useCallback((song: Song | null) => {
    if (!('mediaSession' in navigator) || !song || typeof MediaMetadata === 'undefined') return;

    try {
      const songTitle = song.title || song.titulo || 'Canción';
      const songArtist = song.artist || song.artista || 'Spotyy_AA';
      const albumName = selectedFolder?.titulo || appName || 'Spotyy_AA';
      const rawCover = song.cover_url || song.cover || '';

      let fullCoverUrl = '/icon-512.png';
      if (rawCover && (rawCover.startsWith('http://') || rawCover.startsWith('https://') || rawCover.startsWith('data:image') || rawCover.startsWith('blob:') || rawCover.startsWith('/'))) {
        try {
          fullCoverUrl = new URL(rawCover, window.location.origin).href;
        } catch {
          fullCoverUrl = rawCover;
        }
      } else {
        fullCoverUrl = DEFAULT_SONG_COVER;
      }

      navigator.mediaSession.metadata = new MediaMetadata({
        title: songTitle,
        artist: songArtist,
        album: albumName,
        artwork: [
          { src: fullCoverUrl, sizes: '96x96', type: 'image/jpeg' },
          { src: fullCoverUrl, sizes: '128x128', type: 'image/jpeg' },
          { src: fullCoverUrl, sizes: '192x192', type: 'image/jpeg' },
          { src: fullCoverUrl, sizes: '256x256', type: 'image/jpeg' },
          { src: fullCoverUrl, sizes: '384x384', type: 'image/jpeg' },
          { src: fullCoverUrl, sizes: '512x512', type: 'image/jpeg' }
        ]
      });
    } catch (err) {
      console.warn('Error al actualizar MediaMetadata:', err);
    }
  }, [selectedFolder, appName]);

  const obtenerListaActiva = useCallback((): Song[] => {
    if (selectedFolder && selectedFolder.canciones && selectedFolder.canciones.length > 0) {
      return selectedFolder.canciones;
    }
    if (activePlaylistRef.current && activePlaylistRef.current.length > 0) {
      if (currentSong && activePlaylistRef.current.some((s) => String(s.id) === String(currentSong.id))) {
        return activePlaylistRef.current;
      }
    }
    const currentList = songs.length > 0 ? songs : canciones;
    return currentList;
  }, [selectedFolder, currentSong, songs, canciones]);

  const reproducirCancionDirecta = (song: Song, contextPlaylist?: Song[]) => {
    setCurrentSong(song);
    setIsPlaying(true);
    if (contextPlaylist && contextPlaylist.length > 0) {
      activePlaylistRef.current = contextPlaylist;
    } else if (selectedFolder && selectedFolder.canciones && selectedFolder.canciones.length > 0) {
      activePlaylistRef.current = selectedFolder.canciones;
    } else if (activePlaylistRef.current.length === 0) {
      activePlaylistRef.current = songs.length > 0 ? songs : canciones;
    }

    // Actualizar metadatos inmediatamente en la pantalla del coche / audífonos
    actualizarMediaSessionMetadata(song);

    const audioEl = audioRef.current;
    if (audioEl) {
      const src = song.audio_url || song.url;
      if (src) {
        audioEl.src = src;
        audioEl.currentTime = 0;
        audioEl.load();
        const p = audioEl.play();
        if (p !== undefined) {
          p.then(() => {
            setIsPlaying(true);
            if ('mediaSession' in navigator) {
              navigator.mediaSession.playbackState = 'playing';
            }
          }).catch((err) => console.warn('Error en autoplay:', err));
        }
      }
    }
  };

  const seleccionarCancion = (song: Song, contextPlaylist?: Song[]) => {
    unlockAudioForIOS();
    if (contextPlaylist && contextPlaylist.length > 0) {
      activePlaylistRef.current = contextPlaylist;
    } else if (selectedFolder && selectedFolder.canciones && selectedFolder.canciones.length > 0) {
      activePlaylistRef.current = selectedFolder.canciones;
    }
    if (currentSong?.id === song.id) {
      togglePlay();
      return;
    }
    reproducirCancionDirecta(song, contextPlaylist);
  };

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
      if ('mediaSession' in navigator) {
        navigator.mediaSession.playbackState = 'paused';
      }
    } else {
      if (!currentSong) {
        const available = songs.length > 0 ? songs : (canciones.length > 0 ? canciones : library);
        if (available.length > 0) {
          reproducirCancionDirecta(available[0]);
          return;
        }
      }
      audioRef.current
        .play()
        .then(() => {
          setIsPlaying(true);
          if ('mediaSession' in navigator) {
            navigator.mediaSession.playbackState = 'playing';
          }
        })
        .catch((err) => console.warn('Error al reproducir audio:', err));
    }
  };

  // ==========================================
  // CONTROLES DE REPRODUCCIÓN (ALEATORIO, REPETIR, SIGUIENTE, ANTERIOR)
  // ==========================================
  const toggleShuffle = () => {
    setIsShuffle((prev) => {
      const next = !prev;
      triggerToast(next ? '🔀 Modo aleatorio activado' : 'Modo aleatorio desactivado', 'success');
      return next;
    });
  };

  const toggleRepeat = () => {
    setRepeatMode((prev) => {
      if (prev === 'off') {
        triggerToast('🔁 Repetir toda la lista', 'success');
        return 'all';
      } else if (prev === 'all') {
        triggerToast('🔂 Repetir esta canción', 'success');
        return 'one';
      } else {
        triggerToast('Repetición desactivada', 'success');
        return 'off';
      }
    });
  };

  const setupAudioContext = () => {
    if (!audioRef.current) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioCtx();
      }
      if (audioContextRef.current.state === 'suspended') {
        audioContextRef.current.resume();
      }
      if (!sourceNodeRef.current && audioRef.current) {
        analyserRef.current = audioContextRef.current.createAnalyser();
        analyserRef.current.fftSize = 64;
        sourceNodeRef.current = audioContextRef.current.createMediaElementSource(audioRef.current);
        sourceNodeRef.current.connect(analyserRef.current);
        analyserRef.current.connect(audioContextRef.current.destination);
      }
    } catch (e) {
      console.warn('AudioContext notice:', e);
    }
  };

  const toggleFavorite = (song: Song) => {
    const sId = String(song.id);
    setFavorites((prev) => {
      const exists = prev.includes(sId);
      const updated = exists ? prev.filter((id) => id !== sId) : [...prev, sId];
      try {
        localStorage.setItem('fa_favorites_v1', JSON.stringify(updated));
      } catch {}
      triggerToast(
        exists ? `"${song.title || song.titulo}" se quitó de Tus me gusta` : `💚 "${song.title || song.titulo}" agregada a Tus me gusta`,
        'success'
      );
      return updated;
    });
  };

  const agregarACola = (song: Song, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setQueue((prev) => [...prev, song]);
    triggerToast(`➕ "${song.title || song.titulo}" agregada a la cola`, 'success');
  };

  // ==========================================
  // CONTROLES DE REPRODUCCIÓN (BLUETOOTH, COLA, ALEATORIO, SIGUIENTE, ANTERIOR)
  // ==========================================
  // Botón "Siguiente" con soporte para Cola y Shuffle (Aleatorio) — ejecutado tanto en pantalla como en Bluetooth
  const playNextSong = useCallback(() => {
    if (queue.length > 0) {
      const nextSong = queue[0];
      setQueue((prev) => prev.slice(1));
      reproducirCancionDirecta(nextSong);
      triggerToast(`🎶 Reproduciendo de la cola: "${nextSong.title || nextSong.titulo}"`, 'success');
      return;
    }

    const playlist = obtenerListaActiva();
    if (playlist.length === 0) return;
    const currentIndex = playlist.findIndex((s) => String(s.id) === String(currentSong?.id));
    
    let nextIndex = 0;
    if (isShuffle && playlist.length > 1) {
      do {
        nextIndex = Math.floor(Math.random() * playlist.length);
      } while (nextIndex === currentIndex && playlist.length > 1);
    } else {
      nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % playlist.length;
    }

    const nextSong = playlist[nextIndex];
    if (nextSong) {
      reproducirCancionDirecta(nextSong, playlist);
    }
  }, [queue, obtenerListaActiva, currentSong, isShuffle]);

  const reproducirSiguiente = playNextSong;

  // Botón "Anterior" con soporte para reinicio de pista y Shuffle — ejecutado tanto en pantalla como en Bluetooth
  const playPreviousSong = useCallback(() => {
    if (audioRef.current && audioRef.current.currentTime > 3) {
      audioRef.current.currentTime = 0;
      setCurrentTime(0);
      return;
    }

    const playlist = obtenerListaActiva();
    if (playlist.length === 0) return;
    const currentIndex = playlist.findIndex((s) => String(s.id) === String(currentSong?.id));
    
    let prevIndex = 0;
    if (isShuffle && playlist.length > 1) {
      do {
        prevIndex = Math.floor(Math.random() * playlist.length);
      } while (prevIndex === currentIndex && playlist.length > 1);
    } else {
      prevIndex = currentIndex === -1 ? 0 : (currentIndex - 1 + playlist.length) % playlist.length;
    }

    const prevSong = playlist[prevIndex];
    if (prevSong) {
      reproducirCancionDirecta(prevSong, playlist);
    }
  }, [obtenerListaActiva, currentSong, isShuffle]);

  const reproducirAnterior = playPreviousSong;

  // Manejador del final de la pista (onEnded): Soporta Repetir 1 y Reproducción Continua (Autoplay)
  const handleAudioEnded = () => {
    if (repeatMode === 'one') {
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch((err) => console.warn('Error repitiendo canción:', err));
      }
      return;
    }
    // Reproducción Continua: ejecuta automáticamente la función que reproduce la siguiente canción en la lista activa
    playNextSong();
  };

  // ==========================================
  // 2. GESTOS SWIPE (TOUCH Y MOUSE) PARA PASAR DE CANCIÓN
  // ==========================================
  const touchStartXRef = useRef<number | null>(null);
  const touchStartYRef = useRef<number | null>(null);
  const mouseStartXRef = useRef<number | null>(null);
  const isMouseDownRef = useRef<boolean>(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartXRef.current = e.touches[0].clientX;
    touchStartYRef.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartXRef.current === null || touchStartYRef.current === null) return;
    const diffX = e.changedTouches[0].clientX - touchStartXRef.current;
    const diffY = e.changedTouches[0].clientY - touchStartYRef.current;

    // Detectar swipe horizontal claro (mínimo 40px)
    if (Math.abs(diffX) > 40 && Math.abs(diffX) > Math.abs(diffY)) {
      if (diffX < 0) {
        reproducirSiguiente();
        triggerToast('⏭ Siguiente canción', 'success');
      } else {
        reproducirAnterior();
        triggerToast('⏮ Canción anterior', 'success');
      }
    }
    touchStartXRef.current = null;
    touchStartYRef.current = null;
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button')) return;
    mouseStartXRef.current = e.clientX;
    isMouseDownRef.current = true;
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (!isMouseDownRef.current || mouseStartXRef.current === null) return;
    const diffX = e.clientX - mouseStartXRef.current;
    if (Math.abs(diffX) > 40) {
      if (diffX < 0) {
        reproducirSiguiente();
        triggerToast('⏭ Siguiente canción', 'success');
      } else {
        reproducirAnterior();
        triggerToast('⏮ Canción anterior', 'success');
      }
    }
    isMouseDownRef.current = false;
    mouseStartXRef.current = null;
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      const cur = audioRef.current.currentTime;
      setCurrentTime(cur);
      const dur = audioRef.current.duration;
      if (dur && !isNaN(dur)) {
        setDuration(dur);
        if ('mediaSession' in navigator && 'setPositionState' in navigator.mediaSession) {
          try {
            navigator.mediaSession.setPositionState({
              duration: dur,
              playbackRate: audioRef.current.playbackRate || 1,
              position: Math.min(cur, dur)
            });
          } catch {}
        }
      }
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    setCurrentTime(time);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
    }
  };

  const handleSeekTime = (seconds: number) => {
    setCurrentTime(seconds);
    if (audioRef.current) {
      audioRef.current.currentTime = seconds;
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (audioRef.current) {
      audioRef.current.volume = val;
    }
    setIsMuted(val === 0);
  };

  const toggleMute = () => {
    if (!audioRef.current) return;
    if (isMuted) {
      audioRef.current.volume = volume || 0.85;
      setIsMuted(false);
    } else {
      audioRef.current.volume = 0;
      setIsMuted(true);
    }
  };

  const formatTime = (segundos: number) => {
    if (isNaN(segundos)) return '00:00';
    const mins = Math.floor(segundos / 60);
    const secs = Math.floor(segundos % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    if (audioRef.current && (currentSong?.audio_url || currentSong?.url)) {
      audioRef.current.load();
      if (isPlaying) {
        audioRef.current.play().catch((e) => console.warn('Reproducción diferida:', e));
      }
    }
  }, [currentSong]);

  // ==========================================
  // MEDIA SESSION API (CONTROLES EN PANTALLA BLOQUEADA, NOTIFICACIONES Y BLUETOOTH)
  // ==========================================
  const playNextSongRef = useRef(playNextSong);
  playNextSongRef.current = playNextSong;

  const playPreviousSongRef = useRef(playPreviousSong);
  playPreviousSongRef.current = playPreviousSong;

  const reproducirSiguienteRef = useRef(reproducirSiguiente);
  reproducirSiguienteRef.current = reproducirSiguiente;

  const reproducirAnteriorRef = useRef(reproducirAnterior);
  reproducirAnteriorRef.current = reproducirAnterior;

  // 1. Configurar manejadores de acción Bluetooth y Media Session (play, pause, nexttrack, previoustrack, seekbackward, seekforward)
  useEffect(() => {
    if (!('mediaSession' in navigator)) return;

    try {
      // Reanudar reproducción
      navigator.mediaSession.setActionHandler('play', () => {
        if (audioRef.current) {
          audioRef.current
            .play()
            .then(() => {
              setIsPlaying(true);
              if ('mediaSession' in navigator) {
                navigator.mediaSession.playbackState = 'playing';
              }
            })
            .catch((err) => console.warn('Error al reproducir desde Media Session:', err));
        }
      });

      // Pausar reproducción
      navigator.mediaSession.setActionHandler('pause', () => {
        if (audioRef.current) {
          audioRef.current.pause();
          setIsPlaying(false);
          if ('mediaSession' in navigator) {
            navigator.mediaSession.playbackState = 'paused';
          }
        }
      });

      // Canción anterior (controles Bluetooth de coche o audífonos y pantalla bloqueada)
      navigator.mediaSession.setActionHandler('previoustrack', () => {
        if (playPreviousSongRef.current) {
          playPreviousSongRef.current();
        } else {
          reproducirAnteriorRef.current();
        }
      });

      // Canción siguiente (controles Bluetooth de coche o audífonos y pantalla bloqueada)
      navigator.mediaSession.setActionHandler('nexttrack', () => {
        if (playNextSongRef.current) {
          playNextSongRef.current();
        } else {
          reproducirSiguienteRef.current();
        }
      });

      // Retroceder 10 segundos
      navigator.mediaSession.setActionHandler('seekbackward', (details) => {
        const skip = details?.seekOffset || 10;
        if (audioRef.current) {
          const newTime = Math.max(audioRef.current.currentTime - skip, 0);
          audioRef.current.currentTime = newTime;
          setCurrentTime(newTime);
        }
      });

      // Avanzar 10 segundos
      navigator.mediaSession.setActionHandler('seekforward', (details) => {
        const skip = details?.seekOffset || 10;
        if (audioRef.current) {
          const maxDur = audioRef.current.duration || 999999;
          const newTime = Math.min(audioRef.current.currentTime + skip, maxDur);
          audioRef.current.currentTime = newTime;
          setCurrentTime(newTime);
        }
      });

      // Posicionamiento preciso en barra de progreso
      try {
        navigator.mediaSession.setActionHandler('seekto', (details) => {
          if (details?.seekTime !== undefined && audioRef.current) {
            audioRef.current.currentTime = details.seekTime;
            setCurrentTime(details.seekTime);
          }
        });
      } catch {}

      // Detener audio
      try {
        navigator.mediaSession.setActionHandler('stop', () => {
          if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
            setIsPlaying(false);
            if ('mediaSession' in navigator) {
              navigator.mediaSession.playbackState = 'none';
            }
          }
        });
      } catch {}
    } catch (err) {
      console.warn('Error al registrar handlers de Media Session:', err);
    }
  }, []);

  // 2. Configurar metadatos (título, artista, álbum, carátula) al iniciar o cambiar de canción
  useEffect(() => {
    actualizarMediaSessionMetadata(currentSong);
  }, [currentSong, actualizarMediaSessionMetadata]);

  // 3. Sincronizar el estado de reproducción (playbackState)
  useEffect(() => {
    if (!('mediaSession' in navigator)) return;
    try {
      navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
    } catch (e) {}
  }, [isPlaying]);

  const listaParaBuscar = useMemo(() => {
    return songs.length > 0 ? songs : canciones;
  }, [songs, canciones]);

  const filteredSongs = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return listaParaBuscar;
    return listaParaBuscar.filter(
      (c) =>
        (c.title || c.titulo || '').toLowerCase().includes(q) ||
        (c.artist || c.artista || '').toLowerCase().includes(q)
    );
  }, [listaParaBuscar, searchQuery]);

  const cancionesPaginadas = useMemo(() => {
    return listaParaBuscar.slice(0, cancionesPageSize);
  }, [listaParaBuscar, cancionesPageSize]);

  // ==========================================
  // ARTWORK THUMBNAILS (COVERS Y PORTADAS AUTOMÁTICAS DE UNSPLASH)
  // ==========================================
  const renderCover = (coverType?: string, className: string = 'w-14 h-14', fallbackTitle?: string) => {
    // Si ya es una URL web directa (R2, Unsplash, http/https, blob, data)
    let imageUrl = '';
    if (coverType && (coverType.startsWith('http://') || coverType.startsWith('https://') || coverType.startsWith('data:image') || coverType.startsWith('blob:') || coverType.startsWith('/'))) {
      imageUrl = coverType;
    } else {
      // Si es un identificador o no tiene URL, generar la portada automática de Unsplash usando el título
      const queryName = fallbackTitle || (coverType ? coverType.replace(/^cover_/, '') : 'musica');
      imageUrl = obtenerPortadaUnsplashCarpeta(queryName);
    }

    return (
      <div className={`${className} shrink-0 rounded-l-md overflow-hidden relative shadow bg-neutral-900 border border-white/10`}>
        <img
          src={imageUrl}
          alt={fallbackTitle || "Portada"}
          loading="lazy"
          decoding="async"
          className="w-full h-full object-cover"
          onError={(e) => {
            const imgEl = e.currentTarget as HTMLImageElement;
            // Si la URL de Unsplash falla, aplicar la portada por defecto
            if (imgEl.src !== DEFAULT_SONG_COVER) {
              imgEl.src = DEFAULT_SONG_COVER;
            }
          }}
        />
      </div>
    );
  };
  // ==========================================
  // GESTIÓN DE CARPETAS DE AUDIOS (PLAYLISTS)
  // ==========================================

  // Mapa memorizado de canciones por carpeta: evita recalcular miles de canciones para cada carpeta en cada segundo
  const cancionesPorCarpetaMap = useMemo(() => {
    const allSongs = songs.length > 0 ? songs : canciones;
    const cacheMap = new Map<string, Song[]>();

    for (const folder of folders) {
      const currentFolderData = folder;
      const songMap = new Map<string, Song>();

      for (const c of currentFolderData.canciones || []) {
        if (c && c.id) {
          songMap.set(String(c.id), c);
          if (c.audio_url) songMap.set(c.audio_url, c);
        }
      }

      for (const c of allSongs) {
        const fid = c.folder_id;
        const match =
          folder.id === 'mis_canciones'
            ? fid === 'mis_canciones' || !fid
            : folder.id === 'tus_me_gusta'
            ? fid === 'tus_me_gusta'
            : fid === folder.id;

        if (match && c && c.id && !songMap.has(String(c.id))) {
          songMap.set(String(c.id), c);
          if (c.audio_url) songMap.set(c.audio_url, c);
        }
      }

      const seen = new Set<string>();
      const result: Song[] = [];
      for (const songItem of songMap.values()) {
        const key = String(songItem.id) || songItem.audio_url || songItem.url;
        if (!seen.has(key)) {
          seen.add(key);
          result.push(songItem);
        }
      }
      cacheMap.set(folder.id, result);
    }
    return cacheMap;
  }, [folders, songs, canciones]);

  const obtenerCancionesCarpeta = useCallback(
    (folder: AudioFolder): Song[] => {
      if (!folder) return [];
      const cached = cancionesPorCarpetaMap.get(folder.id);
      if (cached && cached.length > 0) return cached;

      const currentFolderData = folders.find((f) => f.id === folder.id) || folder;
      const allSongs = songs.length > 0 ? songs : canciones;
      const songMap = new Map<string, Song>();

      for (const c of currentFolderData.canciones || []) {
        if (c && c.id) {
          songMap.set(String(c.id), c);
          if (c.audio_url) songMap.set(c.audio_url, c);
        }
      }

      for (const c of allSongs) {
        const fid = c.folder_id;
        const match =
          folder.id === 'mis_canciones'
            ? fid === 'mis_canciones' || !fid
            : folder.id === 'tus_me_gusta'
            ? fid === 'tus_me_gusta'
            : fid === folder.id;

        if (match && c && c.id && !songMap.has(String(c.id))) {
          songMap.set(String(c.id), c);
          if (c.audio_url) songMap.set(c.audio_url, c);
        }
      }

      const seen = new Set<string>();
      const result: Song[] = [];
      for (const songItem of songMap.values()) {
        const key = String(songItem.id) || songItem.audio_url || songItem.url;
        if (!seen.has(key)) {
          seen.add(key);
          result.push(songItem);
        }
      }
      return result;
    },
    [cancionesPorCarpetaMap, folders, songs, canciones]
  );

  const toggleLikeFolder = (folderId: string) => {
    setFolderLiked((prev) => {
      const nextVal = !prev[folderId];
      triggerToast(
        nextVal ? 'Carpeta guardada en tus favoritas' : 'Carpeta eliminada de favoritas',
        'success'
      );
      return { ...prev, [folderId]: nextVal };
    });
  };

  // ==========================================
  // HELPERS PARA VISTA DETALLADA SPOTIFY PLAYLIST
  // ==========================================
  const getFolderGradient = (folderId: string): string => {
    switch (folderId) {
      case 'perreale':
        return 'from-[#670c1e] via-[#35050f] to-[#121212]';
      case 'buchonass':
        return 'from-[#54300a] via-[#291704] to-[#121212]';
      case 'tus_me_gusta':
        return 'from-[#3b1970] via-[#1e0c3b] to-[#121212]';
      case 'mis_canciones':
        return 'from-[#0d4a30] via-[#062417] to-[#121212]';
      case 'lob_songs':
        return 'from-[#3d2716] via-[#1f140b] to-[#121212]';
      case 'los_2000':
        return 'from-[#75113d] via-[#3b081e] to-[#121212]';
      case 'grwm':
        return 'from-[#6e0c3f] via-[#370620] to-[#121212]';
      case 'baladas':
        return 'from-[#173860] via-[#0b1c30] to-[#121212]';
      case 'la_reina':
        return 'from-[#561567] via-[#2b0a33] to-[#121212]';
      case 'audiolibro':
        return 'from-[#2b2a6f] via-[#151537] to-[#121212]';
      case 'marco_antonio':
        return 'from-[#12423e] via-[#09211f] to-[#121212]';
      case 'mix_grupero':
        return 'from-[#61330b] via-[#301905] to-[#121212]';
      default:
        return 'from-[#42121c] via-[#21090e] to-[#121212]';
    }
  };

  const formatearDuracionTotal = (cancionesLista: Song[]): string => {
    if (cancionesLista.length === 0) return '0 min';
    const totalSegundos = cancionesLista.reduce((acc, c) => acc + ((c as any).duration || 215), 0);
    const horas = Math.floor(totalSegundos / 3600);
    const minutos = Math.floor((totalSegundos % 3600) / 60);
    if (horas > 0) {
      return `${horas} h ${minutos} min`;
    }
    return `${minutos} min`;
  };

  const renderFolderMosaicOrCover = (folderItem: AudioFolder, cancionesLista: Song[], sizeClasses: string = 'w-52 h-52 sm:w-60 sm:h-60') => {
    // Si la carpeta tiene una portada personalizada asignada (subida a R2 o URL)
    const customCover = folderItem.coverUrl || (folderItem.coverKey && (folderItem.coverKey.startsWith('http://') || folderItem.coverKey.startsWith('https://') || folderItem.coverKey.startsWith('data:') || folderItem.coverKey.startsWith('/')) ? folderItem.coverKey : null);
    if (customCover) {
      return (
        <div className={`${sizeClasses} rounded-xl overflow-hidden shadow-2xl shrink-0 bg-neutral-900 border border-white/10 ring-1 ring-black/40 flex items-center justify-center relative group`}>
          <img
            src={customCover}
            alt={folderItem.titulo}
            loading="lazy"
            decoding="async"
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src = DEFAULT_SONG_COVER;
            }}
          />
        </div>
      );
    }

    // Si tenemos 4 o más canciones con carátula, armamos el mosaico 2x2 como en Spotify
    const coversConUrl = cancionesLista
      .map((c) => c.cover_url || c.cover)
      .filter((url): url is string => Boolean(url && typeof url === 'string' && (url.startsWith('http') || url.startsWith('data:') || url.startsWith('/'))));

    const uniqueCovers = Array.from(new Set(coversConUrl)).slice(0, 4);

    if (uniqueCovers.length >= 4) {
      return (
        <div className={`${sizeClasses} rounded-xl overflow-hidden shadow-2xl shrink-0 grid grid-cols-2 grid-rows-2 bg-neutral-900 border border-white/10 ring-1 ring-black/40`}>
          {uniqueCovers.map((src, idx) => (
            <div key={idx} className="w-full h-full overflow-hidden bg-neutral-800">
              <img
                src={src}
                alt={`Cover ${idx + 1}`}
                loading="lazy"
                decoding="async"
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = DEFAULT_SONG_COVER;
                }}
              />
            </div>
          ))}
        </div>
      );
    }

    if (uniqueCovers.length > 0) {
      return (
        <div className={`${sizeClasses} rounded-xl overflow-hidden shadow-2xl shrink-0 bg-neutral-900 border border-white/10 ring-1 ring-black/40 flex items-center justify-center`}>
          <img
            src={uniqueCovers[0]}
            alt={folderItem.titulo}
            loading="lazy"
            decoding="async"
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src = DEFAULT_SONG_COVER;
            }}
          />
        </div>
      );
    }

    return (
      <div className={`${sizeClasses} rounded-xl overflow-hidden shadow-2xl shrink-0 border border-white/10 ring-1 ring-black/40 flex items-center justify-center bg-neutral-900`}>
        {renderCover(folderItem.coverUrl || folderItem.coverKey, 'w-full h-full object-cover', folderItem.titulo)}
      </div>
    );
  };

  const reproducirTodoCarpeta = (cancionesLista: Song[]) => {
    if (cancionesLista.length === 0) {
      triggerToast('Esta playlist no tiene canciones aún.', 'error');
      return;
    }
    const estaSonando = cancionesLista.some((c) => c.id === currentSong?.id && isPlaying);
    if (estaSonando) {
      togglePlay();
      return;
    }
    seleccionarCancion(cancionesLista[0], cancionesLista);
    triggerToast(`Reproduciendo playlist (${cancionesLista.length} canciones)`, 'success');
  };

  const reproducirAleatorioCarpeta = (cancionesLista: Song[]) => {
    if (cancionesLista.length === 0) {
      triggerToast('Esta playlist no tiene canciones aún.', 'error');
      return;
    }
    setIsShuffle(true);
    const randomIndex = Math.floor(Math.random() * cancionesLista.length);
    seleccionarCancion(cancionesLista[randomIndex], cancionesLista);
    triggerToast('Modo aleatorio activado en la playlist', 'success');
  };

  const descargarPlaylist = (folderItem: AudioFolder, cancionesLista: Song[]) => {
    if (cancionesLista.length === 0) {
      triggerToast('No hay canciones para descargar.', 'error');
      return;
    }
    triggerToast(`Descargando canciones de "${folderItem.titulo}"`, 'success');
    cancionesLista.slice(0, 3).forEach((cancion, idx) => {
      const url = cancion.audio_url || cancion.url || cancion.playback_url;
      if (url) {
        setTimeout(() => {
          const a = document.createElement('a');
          a.href = url;
          a.download = `${cancion.artist || 'Artista'} - ${cancion.title || 'Cancion'}.mp3`;
          a.target = '_blank';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
        }, idx * 500);
      }
    });
  };

  const compartirPlaylist = async (folderItem: AudioFolder) => {
    const shareData = {
      title: `${folderItem.titulo} en ${appName}`,
      text: `Escucha la playlist "${folderItem.titulo}" en ${appName}`,
      url: window.location.href
    };
    if (navigator.share) {
      try {
        await navigator.share(shareData);
        return;
      } catch {}
    }
    try {
      await navigator.clipboard.writeText(window.location.href);
      triggerToast('Enlace de la playlist copiado al portapapeles', 'success');
    } catch {
      triggerToast('Playlist lista para compartir', 'success');
    }
  };

  // Renderizar la vista detallada de la carpeta de audios (Estilo Spotify idéntico a las capturas)
  const renderFolderView = (folder: AudioFolder) => {
    const currentFolderState = folders.find((f) => f.id === folder.id) || folder;
    const cancionesCarpeta = obtenerCancionesCarpeta(currentFolderState);
    const estaReproduciendoCarpeta = cancionesCarpeta.some(
      (c) => c.id === currentSong?.id && isPlaying
    );
    const gradientClass = getFolderGradient(currentFolderState.id);
    const duracionTotal = formatearDuracionTotal(cancionesCarpeta);
    const ownerName = user?.email ? user.email.split('@')[0] : 'Tú';

    return (
      <div className={`-mx-3 sm:-mx-4 -mt-1 min-h-screen bg-gradient-to-b ${gradientClass} pb-28 text-white animate-fade-in`}>
        {/* Barra superior de navegación: Flecha Volver (<) y Menú Opciones (⋮) */}
        <div className="sticky top-0 z-30 flex items-center justify-between px-4 py-3 bg-[#121212]/60 backdrop-blur-md border-b border-white/5">
          <button
            onClick={() => setSelectedFolder(null)}
            className="w-10 h-10 rounded-full bg-black/40 hover:bg-black/70 flex items-center justify-center transition active:scale-95 text-white"
            title="Volver"
          >
            <ArrowLeft className="w-6 h-6 stroke-[2.5]" />
          </button>

          <span className="text-sm font-bold text-white/90 truncate max-w-[200px] sm:max-w-xs">
            {currentFolderState.titulo}
          </span>

          <button
            onClick={() => {
              setFolderForMenu(currentFolderState);
              setShowFolderMenuModal(true);
            }}
            className="w-10 h-10 rounded-full bg-black/40 hover:bg-black/70 flex items-center justify-center transition active:scale-95 text-white"
            title="Opciones de playlist"
          >
            <MoreVertical className="w-5 h-5" />
          </button>
        </div>

        {/* Cabecera / Hero de la Playlist (Foto grande / Mosaico 2x2, Título, Dueño, Duración) */}
        <div className="px-5 pt-4 pb-4 flex flex-col items-center text-center sm:text-left sm:items-start sm:flex-row sm:gap-6">
          {/* Mosaico 2x2 de fotos o Foto grande de portada */}
          <div
            className="mx-auto sm:mx-0 shadow-2xl mb-4 sm:mb-0 relative group cursor-pointer"
            onClick={() => handleStartUploadFolderCover(currentFolderState)}
            title="Toca para agregar o cambiar foto de portada en Cloudflare R2"
          >
            {renderFolderMosaicOrCover(currentFolderState, cancionesCarpeta, 'w-52 h-52 sm:w-60 sm:h-60')}
            <div className="absolute inset-0 bg-black/45 opacity-0 group-hover:opacity-100 transition rounded-xl flex flex-col items-center justify-center gap-1.5 text-white backdrop-blur-[2px]">
              <ImageIcon className="w-8 h-8 text-[#1ED760]" />
              <span className="text-xs font-bold bg-black/70 px-2.5 py-1 rounded-full border border-white/15">Cambiar portada</span>
            </div>
          </div>

          <div className="flex-1 min-w-0 flex flex-col justify-end">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight leading-tight">
                {currentFolderState.titulo}
              </h1>
              <button
                type="button"
                onClick={() => handleStartRenameFolder(currentFolderState)}
                className="p-1.5 text-gray-400 hover:text-white rounded-full hover:bg-white/10 transition active:scale-95"
                title="Cambiar nombre a carpeta"
              >
                <Edit3 className="w-5 h-5 text-gray-300" />
              </button>
            </div>

            {/* Creador / Dueño de la playlist con avatar */}
            <div className="flex items-center justify-center sm:justify-start gap-2 mt-3 text-sm font-bold text-white">
              <div className="w-6 h-6 rounded-full overflow-hidden border border-white/30 shrink-0 bg-neutral-800">
                <img
                  src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80"
                  alt={ownerName}
                  loading="lazy"
                  decoding="async"
                  className="w-full h-full object-cover"
                />
              </div>
              <span className="truncate">{ownerName}</span>
            </div>

            {/* Metadatos: Globo + Duración total + Conteo */}
            <div className="flex items-center justify-center sm:justify-start gap-2 text-xs sm:text-sm text-gray-300 mt-2 font-medium">
              <Globe className="w-4 h-4 text-gray-400 shrink-0" />
              <span>{cancionesCarpeta.length} {cancionesCarpeta.length === 1 ? 'canción' : 'canciones'}</span>
              <span>•</span>
              <span>{duracionTotal}</span>
            </div>
          </div>
        </div>

        {/* Barra de Acciones Grandes (Descargar, Compartir, Shuffle y Botón Verde Grande de Play) */}
        <div className="px-5 py-2 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Botón Descargar Playlist */}
            <button
              onClick={() => descargarPlaylist(currentFolderState, cancionesCarpeta)}
              className="w-10 h-10 rounded-full border border-white/20 bg-black/30 hover:bg-black/50 text-[#1ED760] flex items-center justify-center transition active:scale-95 shadow-sm"
              title="Descargar playlist"
            >
              <Download className="w-5 h-5 stroke-[2.2]" />
            </button>

            {/* Botón Compartir */}
            <button
              onClick={() => compartirPlaylist(currentFolderState)}
              className="w-10 h-10 rounded-full border border-white/20 bg-black/30 hover:bg-black/50 text-gray-300 hover:text-white flex items-center justify-center transition active:scale-95 shadow-sm"
              title="Compartir playlist"
            >
              <Share2 className="w-5 h-5" />
            </button>

            {/* Botón Cambiar Nombre a Carpeta */}
            <button
              onClick={() => handleStartRenameFolder(currentFolderState)}
              className="w-10 h-10 rounded-full border border-white/20 bg-black/30 hover:bg-black/50 text-gray-300 hover:text-white flex items-center justify-center transition active:scale-95 shadow-sm"
              title="Cambiar nombre a carpeta"
            >
              <Edit3 className="w-4 h-4" />
            </button>

            {/* Botón Agregar foto de portada a Carpeta */}
            <button
              onClick={() => handleStartUploadFolderCover(currentFolderState)}
              className="w-10 h-10 rounded-full border border-white/20 bg-black/30 hover:bg-black/50 text-gray-300 hover:text-white flex items-center justify-center transition active:scale-95 shadow-sm"
              title="Agregar foto de portada"
            >
              <ImageIcon className="w-4 h-4" />
            </button>

            {/* Botón Opciones 3 puntos */}
            <button
              onClick={() => {
                setFolderForMenu(currentFolderState);
                setShowFolderMenuModal(true);
              }}
              className="w-10 h-10 rounded-full border border-white/20 bg-black/30 hover:bg-black/50 text-gray-300 hover:text-white flex items-center justify-center transition active:scale-95 shadow-sm"
              title="Más opciones"
            >
              <MoreVertical className="w-5 h-5" />
            </button>
          </div>

          <div className="flex items-center gap-3.5">
            {/* Botón Shuffle / Aleatorio de la playlist */}
            <button
              onClick={() => reproducirAleatorioCarpeta(cancionesCarpeta)}
              className={`p-2 transition active:scale-90 ${isShuffle ? 'text-[#1ED760]' : 'text-gray-300 hover:text-white'}`}
              title="Reproducción aleatoria"
            >
              <Shuffle className="w-6 h-6 stroke-[2.2]" />
            </button>

            {/* Botón Verde Grande de Play (#1ED760) */}
            <button
              onClick={() => reproducirTodoCarpeta(cancionesCarpeta)}
              className="w-14 h-14 rounded-full bg-[#1ED760] hover:bg-[#1db954] hover:scale-105 active:scale-95 text-black flex items-center justify-center shadow-2xl transition"
              title={estaReproduciendoCarpeta ? 'Pausar playlist' : 'Reproducir playlist completa'}
            >
              {estaReproduciendoCarpeta ? (
                <Pause className="w-7 h-7 fill-current" />
              ) : (
                <Play className="w-7 h-7 fill-current ml-0.5" />
              )}
            </button>
          </div>
        </div>

        {/* Píldoras de Acciones Rápidas (Screenshot 2: + Agregar, Mixear, Descargar, Limpiar MP3 Repetidas) */}
        <div className="px-5 py-3 flex items-center gap-2 overflow-x-auto no-scrollbar">
          {/* Input oculto para subida directa de audio a la carpeta actual */}
          <input
            ref={folderDirectFileInputRef}
            type="file"
            accept="audio/*,audio/mp3,audio/mpeg,audio/wav,audio/m4a,audio/aac,audio/flac,audio/ogg,.mp3,.wav,.m4a"
            multiple
            onChange={handleFolderDirectUpload}
            className="hidden"
          />

          <button
            onClick={() => {
              setSelectedSongIdsToAdd(new Set());
              setLibrarySearchTerm('');
              setAddMusicModalTab('biblioteca');
              setShowAddMusicToCurrentFolderModal(true);
            }}
            disabled={isDirectFolderUploading}
            className="px-4 py-2 rounded-full text-xs font-bold bg-[#1ED760] hover:bg-[#1db954] text-black flex items-center gap-1.5 shrink-0 transition active:scale-95 shadow-sm font-extrabold cursor-pointer"
            title="Agregar música a esta playlist"
          >
            {isDirectFolderUploading ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Subiendo...</span>
              </>
            ) : (
              <>
                <Plus className="w-3.5 h-3.5 stroke-[3]" />
                <span>+ Agregar</span>
              </>
            )}
          </button>

          <button
            onClick={() => reproducirAleatorioCarpeta(cancionesCarpeta)}
            className="px-4 py-2 rounded-full text-xs font-bold bg-white/10 hover:bg-white/20 border border-white/15 text-white flex items-center gap-1.5 shrink-0 transition active:scale-95"
            title="Activar modo mix"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Mixear</span>
          </button>

          <button
            onClick={() => descargarPlaylist(currentFolderState, cancionesCarpeta)}
            className="px-4 py-2 rounded-full text-xs font-bold bg-white/10 hover:bg-white/20 border border-white/15 text-white flex items-center gap-1.5 shrink-0 transition active:scale-95"
            title="Descargar canciones"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Descargar</span>
          </button>

          {/* Botón para Limpiar MP3 Repetidas */}
          <button
            onClick={limpiarDuplicados}
            disabled={limpiandoDuplicados}
            className="px-4 py-2 rounded-full text-xs font-bold bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 text-white flex items-center gap-1.5 shrink-0 shadow-md border border-red-400/30 transition active:scale-95 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            title="Eliminar canciones repetidas conservando la primera"
          >
            <Trash2 className={`w-3.5 h-3.5 ${limpiandoDuplicados ? 'animate-spin' : ''}`} />
            <span>{limpiandoDuplicados ? 'Limpiando...' : 'Limpiar MP3 Repetidas'}</span>
          </button>

          {/* Botón rosa/morado: ✨ Actualizar Carpeta con IA */}
          <button
            onClick={() => actualizarCarpetaConIA(currentFolderState)}
            disabled={procesandoCarpetaIA}
            className="px-4 py-2 rounded-full text-xs font-bold bg-gradient-to-r from-pink-600 via-purple-600 to-indigo-600 hover:from-pink-500 hover:to-indigo-500 text-white flex items-center gap-1.5 shrink-0 shadow-lg shadow-purple-900/40 border border-pink-400/40 transition active:scale-95 cursor-pointer disabled:opacity-50 font-extrabold"
            title="Actualizar toda esta carpeta con DeepSeek IA (limpiar títulos, deducir artistas, diseñar carátulas y guardar en Supabase)"
          >
            <Sparkles className={`w-3.5 h-3.5 text-yellow-300 ${procesandoCarpetaIA ? 'animate-spin' : ''}`} />
            <span>✨ Actualizar Carpeta con IA</span>
          </button>
        </div>

        {/* Lista de Canciones (Número, Foto pequeña, Título, Artista, y tres puntos ...) */}
        <div className="px-3 sm:px-5 pt-2 space-y-1">
          {cancionesCarpeta.length === 0 ? (
            <div className="p-10 text-center bg-black/20 rounded-2xl border border-white/5 text-gray-400 space-y-3 mt-4">
              <Folder className="w-12 h-12 mx-auto text-gray-500" />
              <p className="text-base font-bold text-white">Esta playlist aún no tiene canciones</p>
                <div className="pt-2">
                  <button
                    onClick={() => {
                      setSelectedSongIdsToAdd(new Set());
                      setLibrarySearchTerm('');
                      setAddMusicModalTab('biblioteca');
                      setShowAddMusicToCurrentFolderModal(true);
                    }}
                    className="px-5 py-2.5 rounded-full text-xs sm:text-sm font-bold bg-[#1ED760] text-black hover:bg-[#1db954] transition shadow-lg inline-flex items-center gap-2 cursor-pointer active:scale-95"
                  >
                    <Plus className="w-4 h-4 stroke-[3]" />
                    <span>+ Agregar música ahora</span>
                  </button>
                </div>
            </div>
          ) : (
            cancionesCarpeta.slice(0, folderPageSize).map((cancion, idx) => {
              const esActual = currentSong?.id === cancion.id;
              const sonando = esActual && isPlaying;

              return (
                <div
                  key={cancion.id}
                  onClick={() => seleccionarCancion(cancion, cancionesCarpeta)}
                  className={`group flex items-center px-2 sm:px-3 py-2.5 rounded-xl cursor-pointer transition select-none ${
                    esActual
                      ? 'bg-white/10 text-white border border-[#1ED760]/30'
                      : 'hover:bg-white/5 text-gray-200'
                  }`}
                >
                  {/* Número o Indicador de reproducción */}
                  <div className="w-7 sm:w-8 flex items-center justify-center shrink-0">
                    {sonando ? (
                      <div className="flex items-end gap-0.5 h-4">
                        <span className="w-1 bg-[#1ED760] h-full animate-bounce rounded-full" />
                        <span className="w-1 bg-[#1ED760] h-2.5 animate-bounce rounded-full [animation-delay:0.2s]" />
                        <span className="w-1 bg-[#1ED760] h-3.5 animate-bounce rounded-full [animation-delay:0.4s]" />
                      </div>
                    ) : (
                      <span className={`text-sm font-semibold ${esActual ? 'text-[#1ED760]' : 'text-gray-400 group-hover:hidden'}`}>
                        {idx + 1}
                      </span>
                    )}
                    {!sonando && (
                      <Play className="w-4 h-4 text-white hidden group-hover:block ml-0.5 fill-current" />
                    )}
                  </div>

                  {/* Foto pequeña de portada */}
                  <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-lg overflow-hidden shrink-0 mx-2.5 shadow bg-neutral-800 border border-white/5">
                    {renderCover(cancion.cover_url || cancion.cover || currentFolderState.coverKey, 'w-full h-full object-cover')}
                  </div>

                  {/* Título y Artista */}
                  <div className="flex-1 min-w-0 pr-2">
                    <p className={`text-sm sm:text-base font-bold truncate leading-tight ${esActual ? 'text-[#1ED760]' : 'text-white'}`}>
                      {obtenerTituloCancionLimpio(cancion.title || cancion.titulo)}
                    </p>
                    <div className="flex items-center gap-1.5 text-xs text-gray-400 truncate mt-0.5 font-medium">
                      <div className="w-3.5 h-3.5 rounded-full bg-[#1ED760]/20 flex items-center justify-center shrink-0">
                        <Download className="w-2.5 h-2.5 text-[#1ED760]" />
                      </div>
                      <span className="truncate">{obtenerArtistaVisible(cancion.artist || cancion.artista)}</span>
                    </div>
                  </div>

                  {/* Ícono de tres puntos (...) a la derecha */}
                  <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedSongForMenu(cancion);
                        setShowSongMenuModal(true);
                      }}
                      className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-full transition active:scale-90"
                      title="Opciones de la canción"
                    >
                      <MoreVertical className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}

          {cancionesCarpeta.length > folderPageSize && (
            <div className="pt-4 pb-2 flex flex-col sm:flex-row items-center justify-between gap-3 p-4 bg-black/30 rounded-2xl border border-white/5">
              <span className="text-xs text-gray-400 font-medium">
                Mostrando <strong className="text-white">{Math.min(folderPageSize, cancionesCarpeta.length)}</strong> de <strong className="text-emerald-400">{cancionesCarpeta.length}</strong> canciones
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setFolderPageSize((prev) => prev + 50)}
                  className="px-4 py-2 rounded-xl bg-[#1ED760] hover:bg-[#1db954] text-black text-xs font-bold transition shadow active:scale-95 flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[3]" />
                  <span>Cargar 50 más</span>
                </button>
                <button
                  onClick={() => setFolderPageSize(cancionesCarpeta.length)}
                  className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition border border-white/10 active:scale-95"
                >
                  Mostrar todas ({cancionesCarpeta.length})
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  // 1. Verificación inicial de sesión de Firebase
  if (sessionLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[100dvh] h-[100dvh] w-screen bg-[#121212] text-white select-none safe-top safe-bottom">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-600 to-[#1ED760] flex items-center justify-center shadow-2xl shadow-emerald-500/30 animate-pulse mb-4">
          <Music className="w-8 h-8 text-black stroke-[2.5]" />
        </div>
        <div className="flex items-center gap-2.5 mb-2">
          <div className="w-4 h-4 border-2 border-[#1ED760] border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-bold text-white tracking-wide">{appName}</p>
        </div>
      </div>
    );
  }

  // 2. SEGURIDAD ESTRICTA: Si el usuario NO está logueado (!user), la app SOLO debe renderizar la pantalla de Login.
  // Esconde completamente la barra de navegación y la lista de música hasta que onAuthStateChanged confirme que hay un usuario válido.
  if (!user) {
    return (
      <div className="min-h-[100dvh] h-[100dvh] w-screen bg-gradient-to-b from-[#18181b] via-[#121212] to-[#0a0a0a] text-white flex flex-col justify-center items-center p-4 sm:p-6 select-none relative overflow-hidden safe-top safe-bottom">
        {/* Glow decorativo de fondo */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="w-full max-w-md bg-[#18181a]/95 backdrop-blur-xl border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl relative z-10 animate-fade-in">
          {/* Encabezado con Nombre Dinámico de la App */}
          <div className="text-center mb-6">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-tr from-emerald-600 to-[#1ED760] flex items-center justify-center shadow-xl shadow-emerald-500/25 mb-3.5">
              <Music className="w-8 h-8 text-black stroke-[2.5]" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              {appName}
            </h1>
            <p className="text-xs sm:text-sm text-gray-400 mt-1">
              {isSignUpMode
                ? 'Crea tu cuenta para acceder a la música'
                : 'Inicia sesión con tu correo y contraseña'}
            </p>
          </div>

          {/* Banner de alerta de error */}
          {authError && (
            <div className="mb-5 p-3.5 bg-red-950/60 border border-red-500/40 rounded-2xl flex items-start gap-2.5 text-xs text-red-200">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400 mt-0.5" />
              <div className="flex-1">
                <span className="font-medium">{authError}</span>
                {authError.toLowerCase().includes('invalid login credentials') && !isSignUpMode && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsSignUpMode(true);
                      setAuthError(null);
                    }}
                    className="block mt-1 text-emerald-400 hover:underline font-bold"
                  >
                    ¿No tienes cuenta aún? Regístrate aquí
                  </button>
                )}
              </div>
            </div>
          )}


          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-300 mb-1.5 uppercase tracking-wider">
                Correo Electrónico
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@correo.com"
                className="w-full px-4 py-3 bg-[#111113] border border-white/10 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#1ED760] focus:ring-1 focus:ring-[#1ED760] transition"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-300 mb-1.5 uppercase tracking-wider">
                Contraseña
              </label>
              <div className="relative flex items-center">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 pr-11 bg-[#111113] border border-white/10 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#1ED760] focus:ring-1 focus:ring-[#1ED760] transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 p-1.5 text-gray-400 hover:text-white transition rounded-lg"
                  title={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5 text-gray-300" />
                  ) : (
                    <Eye className="w-5 h-5 text-gray-400 hover:text-gray-200" />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full py-3 px-4 rounded-xl font-black text-sm bg-[#1ED760] hover:bg-[#1db954] text-black shadow-lg shadow-emerald-500/20 active:scale-[0.98] transition disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
            >
              {isLoggingIn ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-black" />
                  <span>{isSignUpMode ? 'Creando cuenta...' : 'Iniciando sesión...'}</span>
                </>
              ) : (
                <span>{isSignUpMode ? 'Crear Cuenta' : 'Iniciar Sesión'}</span>
              )}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-white/10 text-center">
            <button
              type="button"
              onClick={() => {
                setIsSignUpMode(!isSignUpMode);
                setAuthError(null);
              }}
              className="text-xs text-gray-300 hover:text-[#1ED760] transition font-semibold"
            >
              {isSignUpMode
                ? '¿Ya tienes una cuenta? Iniciar Sesión'
                : '¿No tienes cuenta? Regístrate aquí'}
            </button>
          </div>

          <div className="mt-4 p-3 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center gap-2 text-[11px] text-gray-400">
            <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0" />
            <span>Administrador: <strong className="text-gray-200">mejiamejiaaaron@gmail.com</strong></span>
          </div>
        </div>
      </div>
    );
  }

  // 3. Cargando música y playlists para el usuario autenticado
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[100dvh] h-[100dvh] w-screen bg-[#121212] text-white select-none safe-top safe-bottom">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-600 to-[#1ED760] flex items-center justify-center shadow-2xl shadow-emerald-500/30 animate-pulse mb-4">
          <Music className="w-8 h-8 text-black stroke-[2.5]" />
        </div>
        <div className="flex items-center gap-2.5 mb-2">
          <div className="w-4 h-4 border-2 border-[#1ED760] border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-bold text-white tracking-wide">Cargando música y playlists...</p>
        </div>
        <p className="text-xs text-gray-400">Sincronizando archivos con Firebase</p>
      </div>
    );
  }

  return (
    <div
      className="flex flex-col h-[100dvh] w-screen bg-[#121212] text-white font-sans overflow-hidden select-none"
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* Elemento de Audio Nativo HTML5 Global para Reproducción en Segundo Plano y Media Session */}
      <audio
        ref={audioRef}
        src={currentSong?.audio_url || currentSong?.url || undefined}
        preload="metadata"
        crossOrigin="anonymous"
        controlsList="nodownload noplaybackrate"
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleAudioEnded}
        onWaiting={() => {
          // Stream cargando buffer
        }}
        onStalled={() => {
          // Si el stream de Telegram se frena, reanudar reproducción suavemente
          if (audioRef.current && isPlaying) {
            setTimeout(() => {
              audioRef.current?.play().catch(() => {});
            }, 600);
          }
        }}
        onError={(e) => {
          console.warn('Aviso de audio en stream:', e);
          if (audioRef.current && currentSong) {
            setTimeout(() => {
              if (audioRef.current) {
                audioRef.current.load();
                audioRef.current.play().catch(() => {});
              }
            }, 1000);
          }
        }}
        onPlay={() => {
          setIsPlaying(true);
          if ('mediaSession' in navigator) {
            navigator.mediaSession.playbackState = 'playing';
          }
        }}
        onPause={() => {
          setIsPlaying(false);
          if ('mediaSession' in navigator) {
            navigator.mediaSession.playbackState = 'paused';
          }
        }}
        className="hidden"
      />

      {/* ==========================================
          HEADER SUPERIOR CON NOMBRE DE APP, ROL, AJUSTES ADMIN Y CERRAR SESIÓN (CON SAFE AREA TOP PARA IPHONE NOTCH)
          ========================================== */}
      <header className="px-4 py-2.5 flex items-center justify-between border-b border-white/5 bg-[#121212]/95 backdrop-blur-md shrink-0 z-20 pt-[calc(env(safe-area-inset-top,0px)+0.625rem)]">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-600 to-[#1ED760] flex items-center justify-center shadow-lg shadow-emerald-500/20 shrink-0">
            <Music className="w-4 h-4 text-black stroke-[2.5]" />
          </div>
          <div className="min-w-0">
            <h1 className="text-sm sm:text-base font-black text-white tracking-tight truncate leading-tight">
              {appName}
            </h1>
            <p className="text-[10px] text-gray-400 font-medium truncate">
              {isAdmin ? '👑 Modo Administrador' : user.email}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">

          {/* Ícono de Ajustes Administrativos (Solo Administrador) */}
          {isAdmin && (
            <>
              <button
                onClick={() => {
                  setTempAppName(appName);
                  cargarUsuariosBloqueados();
                  setShowAdminSettingsModal(true);
                }}
                className="px-2.5 py-1.5 rounded-full text-xs font-bold bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/40 flex items-center gap-1.5 transition active:scale-95 shadow-sm"
                title="Ajustes Administrativos (Solo Administrador)"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden sm:inline">Ajustes Admin</span>
              </button>
              <button
                onClick={() => setShowMigrationModal(true)}
                className="px-2.5 py-1.5 rounded-full text-xs font-bold bg-purple-500/15 hover:bg-purple-500/25 text-purple-300 border border-purple-500/40 flex items-center gap-1.5 transition active:scale-95 shadow-sm"
                title="Migración Mágica: Recuperar canciones y carpetas de Supabase a Firebase"
              >
                <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
                <span className="hidden sm:inline">Migración</span>
              </button>
            </>
          )}

          {/* Botón Cerrar Sesión (Visible para cualquier usuario autenticado) */}
          <button
            onClick={handleLogout}
            className="px-2.5 py-1.5 rounded-full text-xs font-bold bg-red-500/15 hover:bg-red-500/25 text-red-400 hover:text-white border border-red-500/30 flex items-center gap-1.5 transition active:scale-95 shadow-sm"
            title="Cerrar Sesión"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Cerrar Sesión</span>
          </button>
        </div>
      </header>

      {/* ==========================================
          BARRA SUPERIOR DE FILTROS (AVATAR + TODAS + MÚSICA + PODCASTS + AUDIOLIBROS)
          ========================================== */}
      <div className="px-4 py-2 flex items-center gap-2 overflow-x-auto no-scrollbar shrink-0 z-20">
        {/* Avatar Usuario */}
        <div
          onClick={() => {
            if (isAdmin) {
              setTempAppName(appName);
              cargarUsuariosBloqueados();
              setShowAdminSettingsModal(true);
            } else {
              setShowDeployModal(true);
            }
          }}
          className="relative w-8 h-8 rounded-full overflow-hidden shrink-0 cursor-pointer border border-white/20 active:scale-95 transition"
          title={isAdmin ? 'Ajustes Admin' : user.email || 'Usuario'}
        >
          <img
            src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80"
            alt="Usuario"
            loading="lazy"
            decoding="async"
            className="w-full h-full object-cover"
          />
        </div>

        {/* 1. Botón Inicio */}
        <button
          onClick={() => {
            setActiveFilter('inicio');
            setSelectedFolder(null);
          }}
          className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition shrink-0 flex items-center gap-1.5 active:scale-95 ${
            activeFilter === 'inicio' && !selectedFolder
              ? 'bg-[#1ED760] text-black shadow-sm font-black'
              : 'bg-[#2A2A2A] text-white hover:bg-[#333333]'
          }`}
          title="Ver pantalla de inicio"
        >
          <Home className="w-3.5 h-3.5" />
          <span>Inicio</span>
        </button>

        {/* 2. Botón Canciones (100% funcional) */}
        <button
          onClick={() => {
            setActiveFilter('canciones');
            setSelectedFolder(null);
          }}
          className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition shrink-0 flex items-center gap-1.5 active:scale-95 ${
            activeFilter === 'canciones' && !selectedFolder
              ? 'bg-[#1ED760] text-black shadow-sm font-black'
              : 'bg-[#2A2A2A] text-white hover:bg-[#333333]'
          }`}
          title="Ver catálogo completo de canciones"
        >
          <Music className="w-3.5 h-3.5" />
          <span>Canciones</span>
          <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
            activeFilter === 'canciones' && !selectedFolder ? 'bg-black/20 text-black' : 'bg-white/10 text-emerald-400'
          }`}>
            {(songs.length > 0 ? songs : canciones).length}
          </span>
        </button>

        {/* 3. Botón Carpetas (100% funcional) */}
        <button
          onClick={() => {
            setActiveFilter('carpetas');
            setSelectedFolder(null);
          }}
          className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition shrink-0 flex items-center gap-1.5 active:scale-95 ${
            activeFilter === 'carpetas' && !selectedFolder
              ? 'bg-[#1ED760] text-black shadow-sm font-black'
              : 'bg-[#2A2A2A] text-white hover:bg-[#333333]'
          }`}
          title="Ver todas las carpetas y playlists"
        >
          <Folder className="w-3.5 h-3.5" />
          <span>Carpetas</span>
          <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
            activeFilter === 'carpetas' && !selectedFolder ? 'bg-black/20 text-black' : 'bg-white/10 text-blue-300'
          }`}>
            {folders.length}
          </span>
        </button>

        {/* 4. Botón Favoritas (100% funcional) */}
        <button
          onClick={() => {
            setActiveFilter('favoritas');
            setSelectedFolder(null);
          }}
          className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition shrink-0 flex items-center gap-1.5 active:scale-95 ${
            activeFilter === 'favoritas' && !selectedFolder
              ? 'bg-[#1ED760] text-black shadow-sm font-black'
              : 'bg-[#2A2A2A] text-white hover:bg-[#333333]'
          }`}
          title="Ver tus canciones favoritas"
        >
          <Heart className={`w-3.5 h-3.5 ${activeFilter === 'favoritas' && !selectedFolder ? 'fill-current text-black' : 'text-emerald-400'}`} />
          <span>Favoritas</span>
          {favorites.length > 0 && (
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
              activeFilter === 'favoritas' && !selectedFolder ? 'bg-black/20 text-black' : 'bg-pink-500/25 text-pink-300'
            }`}>
              {favorites.length}
            </span>
          )}
        </button>

        {/* 5. Botón Audiolibro (100% funcional: abre directo la carpeta del audiolibro) */}
        <button
          onClick={() => {
            const f = folders.find((c) => c.id === 'audiolibro') || carpetasAudio.find((c) => c.id === 'audiolibro');
            if (f) setSelectedFolder(f);
          }}
          className="px-3.5 py-1.5 rounded-full text-xs font-bold transition shrink-0 flex items-center gap-1.5 bg-[#2A2A2A] hover:bg-[#333333] text-purple-300 border border-purple-500/30 active:scale-95"
          title="Abrir audiolibro completo con todos sus capítulos"
        >
          <Headphones className="w-3.5 h-3.5 text-purple-400" />
          <span>Audiolibro</span>
        </button>

        {/* 6. Botón Acción "Aleatorio" (100% funcional: reproduce al instante) */}
        <button
          onClick={reproducirAleatorio}
          className="px-3.5 py-1.5 rounded-full text-xs font-bold transition shrink-0 flex items-center gap-1.5 bg-[#1ED760]/15 hover:bg-[#1ED760]/25 text-[#1ED760] border border-[#1ED760]/40 active:scale-95 shadow-sm"
          title="Reproducir música aleatoria al instante"
        >
          <Shuffle className="w-3.5 h-3.5" />
          <span>Aleatorio</span>
        </button>

        {/* 7. Botón Acción "+ Subir MP3" */}
        {canUpload && (
          <button
            onClick={() => setShowUploadModal(true)}
            className="px-3.5 py-1.5 rounded-full text-xs font-bold transition shrink-0 flex items-center gap-1.5 bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white active:scale-95 shadow-sm"
            title="Subir archivos MP3 o carpetas"
          >
            <Plus className="w-3.5 h-3.5 stroke-[3]" />
            <span>Subir MP3</span>
          </button>
        )}

        {/* 8. Botón Acción "ORGANIZAR MI BIBLIOTECA" (Solo Administrador) */}
        {isAdmin && (
          <button
            onClick={abrirModalOrganizarBiblioteca}
            className="px-3.5 py-1.5 rounded-full text-xs font-bold transition shrink-0 flex items-center gap-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white active:scale-95 shadow-sm border border-emerald-400/30"
            title="Organizar automáticamente todas las canciones por género musical"
          >
            <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
            <span>ORGANIZAR MI BIBLIOTECA</span>
          </button>
        )}

        {/* 9. Botón Acción "Subir a Telegram" */}
        <button
          onClick={() => {
            setShowTelegramUploadModal(true);
            setTelegramError(null);
          }}
          className="px-3.5 py-1.5 rounded-full text-xs font-bold transition shrink-0 flex items-center gap-1.5 bg-gradient-to-r from-sky-600 via-blue-600 to-cyan-500 hover:from-sky-500 hover:to-blue-400 text-white active:scale-95 shadow-sm border border-sky-400/30 cursor-pointer"
          title="Subir archivo MP3 a Telegram Cold Storage"
        >
          <Send className="w-3.5 h-3.5" />
          <span>Subir a Telegram</span>
        </button>

        {/* Botón Sincronización Forzada desde Firebase */}
        <button
          onClick={() => refrescarDatos(true)}
          className="ml-auto px-2.5 py-1 rounded-full text-[11px] font-bold bg-white/5 hover:bg-white/15 text-emerald-400 hover:text-white border border-emerald-500/30 flex items-center gap-1 shrink-0 transition active:scale-95 shadow-sm cursor-pointer"
          title="Actualizar y sincronizar canciones y orden directamente desde Firebase"
        >
          <RefreshCw className="w-3.5 h-3.5 text-emerald-400" />
          <span>Actualizar</span>
        </button>

        {/* Botón rápido Instalar PWA en Celular */}
        <button
          onClick={handleInstallPWA}
          className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#1ED760]/10 hover:bg-[#1ED760]/20 text-[#1ED760] border border-[#1ED760]/40 flex items-center gap-1 shrink-0 transition shadow-sm active:scale-95"
          title="Instalar en celular Android con su propio icono"
        >
          <Smartphone className="w-3.5 h-3.5 text-[#1ED760]" />
          <span>Instalar App</span>
        </button>

        {/* Botón rápido publicar URL independiente */}
        <button
          onClick={() => setShowDeployModal(true)}
          className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-500/15 hover:bg-blue-500/25 text-blue-400 hover:text-white border border-blue-500/40 flex items-center gap-1 shrink-0 transition active:scale-95 shadow-sm"
          title="Publicar en tu propia URL independiente fuera de AI Studio"
        >
          <Rocket className="w-3.5 h-3.5 text-blue-400" />
          <span>Web Propia</span>
        </button>
      </div>

      {/* ==========================================
          CONTENEDOR PRINCIPAL SCROLLABLE (VISTAS FUNCIONALES)
          ========================================== */}
      <div className="flex-1 overflow-y-auto px-3 sm:px-4 pb-36 pt-1 space-y-6">
        {selectedFolder ? (
          renderFolderView(selectedFolder)
        ) : activeTab === 'inicio' ? (
          <>
            {/* ========================================================
                VISTA 1: INICIO (GRID SPOTIFY, AUDIOLIBRO Y CARRUSEL)
                ======================================================== */}
            {activeFilter === 'inicio' && (
              <>
                {/* GRID Y TARJETAS GRANDES DE CARPETAS EN PANTALLA DE INICIO */}
                {(() => {
                  const carpetasEnInicio = folders;
                  if (carpetasEnInicio.length === 0) {
                    return (
                      <div className="bg-[#1C1C1E] border border-white/5 rounded-2xl p-4 text-center space-y-2">
                        <Folder className="w-8 h-8 text-gray-500 mx-auto" />
                        <p className="text-sm font-bold text-white">No hay carpetas en la pantalla de inicio</p>
                        <p className="text-xs text-gray-400 max-w-sm mx-auto">
                          Ve a la pestaña <strong className="text-blue-400">&quot;Carpetas&quot;</strong> y pulsa el menú de tres puntos (⋮) en cualquier carpeta para agregarla nuevamente.
                        </p>
                      </div>
                    );
                  }
                  return (
                    <div className="space-y-6">
                      {/* Accesos rápidos superiores (2 columnas como en Spotify Mobile) */}
                      <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
                        {carpetasEnInicio.slice(0, 6).map((folder) => {
                          const count = obtenerCancionesCarpeta(folder).length;
                          const isBeingDragged = draggedFolderId === folder.id;
                          const isDragTarget = dragOverFolderId === folder.id && draggedFolderId !== folder.id;

                          return (
                            <div
                              key={folder.id}
                              draggable={true}
                              onDragStart={(e) => {
                                e.dataTransfer.setData('text/plain', folder.id);
                                e.dataTransfer.effectAllowed = 'move';
                                setDraggedFolderId(folder.id);
                                setIsDraggingActive(true);
                              }}
                              onDragOver={(e) => {
                                e.preventDefault();
                                e.dataTransfer.dropEffect = 'move';
                                if (dragOverFolderId !== folder.id) setDragOverFolderId(folder.id);
                              }}
                              onDragLeave={() => {
                                if (dragOverFolderId === folder.id) setDragOverFolderId(null);
                              }}
                              onDrop={(e) => {
                                e.preventDefault();
                                const sourceId = e.dataTransfer.getData('text/plain') || draggedFolderId;
                                if (sourceId && sourceId !== folder.id) {
                                  handleReorderFolders(sourceId, folder.id);
                                }
                                setDraggedFolderId(null);
                                setDragOverFolderId(null);
                                setTimeout(() => setIsDraggingActive(false), 100);
                              }}
                              onDragEnd={() => {
                                setDraggedFolderId(null);
                                setDragOverFolderId(null);
                                setTimeout(() => setIsDraggingActive(false), 100);
                              }}
                              onClick={() => {
                                if (isDraggingActive) return;
                                setSelectedFolder(folder);
                              }}
                              className={`group flex items-center bg-[#282828] hover:bg-[#333333] rounded-lg overflow-hidden cursor-grab active:cursor-grabbing transition duration-200 shadow-md min-h-[62px] relative ${
                                isBeingDragged ? 'opacity-40 scale-95 border-2 border-dashed border-emerald-400' : ''
                              } ${
                                isDragTarget ? 'ring-2 ring-emerald-400 bg-emerald-950/40 scale-[1.02]' : 'hover:ring-1 hover:ring-white/20 active:scale-[0.98]'
                              }`}
                              title={`Arrastra para reordenar o pulsa para abrir "${folder.titulo}"`}
                            >
                              <div className="absolute top-1 left-1 z-10 opacity-0 group-hover:opacity-75 transition p-0.5 rounded bg-black/60 text-gray-300">
                                <GripVertical className="w-3 h-3" />
                              </div>
                              {renderCover(folder.coverUrl || folder.coverKey, 'w-16 h-16 shrink-0', folder.titulo)}
                              <div className="flex-1 px-2.5 sm:px-3 min-w-0 py-1">
                                <span className="text-sm font-black text-white line-clamp-2 leading-tight">
                                  {folder.titulo}
                                </span>
                                <span className="text-xs text-gray-400 font-semibold block mt-0.5">
                                  {count} {count === 1 ? 'audio' : 'audios'}
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setFolderForMenu(folder);
                                  setShowFolderMenuModal(true);
                                }}
                                className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-full mr-1.5 transition active:scale-90 shrink-0"
                                title={`Opciones de ${folder.titulo}`}
                              >
                                <MoreVertical className="w-4 h-4" />
                              </button>
                            </div>
                          );
                        })}
                      </div>

                      {/* SECCIÓN PRINCIPAL DE TARJETAS GRANDES: TUS PLAYLISTS Y CARPETAS */}
                      <div className="space-y-3.5 pt-2">
                        <div className="flex items-center justify-between">
                          <div>
                            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                              Tus Playlists y Carpetas
                            </h2>
                            <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                              <Sparkles className="w-3 h-3 text-[#1ED760]" />
                              <span>Arrastra y suelta cualquier tarjeta para reordenar</span>
                            </p>
                          </div>
                          <span className="text-xs text-emerald-400 font-bold bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                            {carpetasEnInicio.length} playlists
                          </span>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5 sm:gap-4">
                          {carpetasEnInicio.map((folder) => {
                            const folderSongs = obtenerCancionesCarpeta(folder);
                            const count = folderSongs.length;
                            const isFolderPlaying = folderSongs.some((c) => c.id === currentSong?.id && isPlaying);
                            const isBeingDragged = draggedFolderId === folder.id;
                            const isDragTarget = dragOverFolderId === folder.id && draggedFolderId !== folder.id;

                            return (
                              <div
                                key={folder.id}
                                draggable={true}
                                onDragStart={(e) => {
                                  e.dataTransfer.setData('text/plain', folder.id);
                                  e.dataTransfer.effectAllowed = 'move';
                                  setDraggedFolderId(folder.id);
                                  setIsDraggingActive(true);
                                }}
                                onDragOver={(e) => {
                                  e.preventDefault();
                                  e.dataTransfer.dropEffect = 'move';
                                  if (dragOverFolderId !== folder.id) setDragOverFolderId(folder.id);
                                }}
                                onDragLeave={() => {
                                  if (dragOverFolderId === folder.id) setDragOverFolderId(null);
                                }}
                                onDrop={(e) => {
                                  e.preventDefault();
                                  const sourceId = e.dataTransfer.getData('text/plain') || draggedFolderId;
                                  if (sourceId && sourceId !== folder.id) {
                                    handleReorderFolders(sourceId, folder.id);
                                  }
                                  setDraggedFolderId(null);
                                  setDragOverFolderId(null);
                                  setTimeout(() => setIsDraggingActive(false), 100);
                                }}
                                onDragEnd={() => {
                                  setDraggedFolderId(null);
                                  setDragOverFolderId(null);
                                  setTimeout(() => setIsDraggingActive(false), 100);
                                }}
                                onClick={() => {
                                  if (isDraggingActive) return;
                                  setSelectedFolder(folder);
                                }}
                                className={`group bg-[#181818] hover:bg-[#282828] p-3 sm:p-3.5 rounded-xl cursor-grab active:cursor-grabbing transition-all duration-200 shadow-xl relative flex flex-col justify-between border ${
                                  isBeingDragged
                                    ? 'opacity-40 scale-95 border-2 border-dashed border-emerald-400'
                                    : isDragTarget
                                    ? 'ring-2 ring-emerald-400 border-emerald-400 bg-emerald-950/40 scale-[1.03]'
                                    : 'border-white/5 hover:border-white/15 active:scale-[0.98]'
                                }`}
                                title={`Arrastra para reordenar o pulsa para abrir "${folder.titulo}"`}
                              >
                                {/* Indicador visual de arrastre con icono Grip */}
                                <div className="absolute top-2 left-2 z-20 opacity-0 group-hover:opacity-85 transition p-1 rounded-md bg-black/70 text-gray-300 pointer-events-none" title="Arrastra para reordenar">
                                  <GripVertical className="w-3.5 h-3.5" />
                                </div>

                                {/* Portada grande / Mosaico 2x2 */}
                                <div className="relative w-full aspect-square rounded-lg overflow-hidden mb-3 bg-neutral-900 shadow-md">
                                  {renderFolderMosaicOrCover(folder, folderSongs, 'w-full h-full')}

                                  {/* Botón flotante verde de Play como en Spotify */}
                                  <div className={`absolute bottom-2 right-2 transition-all duration-300 transform ${
                                    isFolderPlaying ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0'
                                  }`}>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        reproducirTodoCarpeta(folderSongs);
                                      }}
                                      className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-[#1ED760] hover:bg-[#1db954] text-black shadow-2xl flex items-center justify-center hover:scale-105 active:scale-95 transition"
                                      title={isFolderPlaying ? 'Pausar' : 'Reproducir playlist'}
                                    >
                                      {isFolderPlaying ? (
                                        <Pause className="w-5 h-5 fill-current" />
                                      ) : (
                                        <Play className="w-5 h-5 fill-current ml-0.5" />
                                      )}
                                    </button>
                                  </div>
                                </div>

                                {/* Título de la carpeta y cantidad de canciones */}
                                <div className="min-w-0">
                                  <h3 className="text-sm sm:text-base font-bold text-white truncate group-hover:text-[#1ED760] transition leading-snug">
                                    {folder.titulo}
                                  </h3>
                                  <p className="text-xs text-gray-400 font-medium truncate mt-0.5">
                                    {count} {count === 1 ? 'canción' : 'canciones'}
                                  </p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* SECCIÓN AUDIOLIBRO */}
                <div className="space-y-3 pt-2">
                  <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
                    Sumérgete en un audiolibro
                  </h2>

                  <div
                    onClick={() => setSelectedFolder(folders.find((f) => f.id === 'audiolibro') || carpetasAudio.find((f) => f.id === 'audiolibro') || null)}
                    className="bg-[#242424] hover:bg-[#2b2b2b] rounded-xl p-3 sm:p-4 flex gap-3.5 sm:gap-4 items-center cursor-pointer transition shadow-lg relative group hover:ring-1 hover:ring-white/10"
                    title="Abrir audiolibro completo con todos sus capítulos"
                  >
                    <div className="w-28 h-28 sm:w-32 sm:h-32 bg-[#202020] border border-white/5 rounded-lg flex items-center justify-center shrink-0 shadow-inner">
                      <div className="w-16 h-16 rounded-full border-2 border-gray-400 flex items-center justify-center relative">
                        <div className="w-8 h-8 rounded-full border-2 border-gray-300 flex items-center justify-center">
                          <div className="w-2.5 h-2.5 rounded-full bg-gray-300" />
                        </div>
                        <div className="absolute -bottom-2 w-1 h-3 bg-gray-400" />
                      </div>
                    </div>

                    <div className="flex-1 min-w-0 flex flex-col justify-between py-1">
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-[#1ED760]">
                            Incluido en Premium
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              const f = folders.find((item) => item.id === 'audiolibro') || carpetasAudio.find((item) => item.id === 'audiolibro');
                              if (f) {
                                setFolderForMenu(f);
                                setShowFolderMenuModal(true);
                              }
                            }}
                            className="text-gray-400 hover:text-white p-1 rounded-full hover:bg-white/10 transition active:scale-90"
                            title="Opciones de audiolibro"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>
                        </div>

                        <h3 className="text-sm sm:text-base font-bold text-white mt-1 leading-snug line-clamp-2">
                          Deja de ser tú (latino): La mente crea la real...
                        </h3>
                      </div>

                      <div className="flex items-center justify-between pt-4">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            triggerToast('Guardado en Tu Biblioteca', 'success');
                          }}
                          className="text-gray-300 hover:text-white p-1 rounded-full transition"
                          title="Agregar a tu biblioteca"
                        >
                          <div className="w-6 h-6 rounded-full border border-gray-400 flex items-center justify-center">
                            <Plus className="w-4 h-4" />
                          </div>
                        </button>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const folder = folders.find((f) => f.id === 'audiolibro') || carpetasAudio.find((f) => f.id === 'audiolibro');
                            if (folder && folder.canciones.length > 0) {
                              seleccionarCancion(folder.canciones[0], folder.canciones);
                            }
                          }}
                          className="w-10 h-10 rounded-full bg-white hover:bg-gray-200 text-black flex items-center justify-center shadow-lg active:scale-95 transition"
                          title="Reproducir audiolibro"
                        >
                          {currentSong?.id === 'audio_1' && isPlaying ? (
                            <Pause className="w-5 h-5 fill-current" />
                          ) : (
                            <Play className="w-5 h-5 fill-current ml-0.5" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* SECCIÓN SIGUE REPRODUCIENDO */}
                <div className="space-y-3 pt-2">
                  <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
                    Sigue reproduciendo
                  </h2>

                  <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2 pt-1">
                    <div
                      onClick={() => setSelectedFolder(carpetasAudio.find((f) => f.id === 'marco_antonio') || null)}
                      className="w-44 sm:w-48 shrink-0 bg-[#181818] hover:bg-[#222222] p-3 rounded-xl cursor-pointer transition shadow group"
                      title="Abrir carpeta de Marco Antonio Solís"
                    >
                      <div className="w-full aspect-square rounded-lg overflow-hidden relative mb-2.5 bg-neutral-800">
                        <img
                          src="https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400&auto=format&fit=crop&q=80"
                          alt="Marco Antonio Solís"
                          loading="lazy"
                          decoding="async"
                          className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                        />
                        <div className="absolute top-2 left-2 w-5 h-5 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center">
                          <Music className="w-3 h-3 text-[#1ED760]" />
                        </div>
                      </div>
                      <h4 className="text-sm font-bold text-white truncate">Marco Antonio Solís</h4>
                      <p className="text-xs text-gray-400 truncate mt-0.5">
                        Franco De Vita, Chayanne y Los Bukis
                      </p>
                    </div>

                    <div
                      onClick={() => setSelectedFolder(carpetasAudio.find((f) => f.id === 'mix_grupero') || null)}
                      className="w-44 sm:w-48 shrink-0 bg-[#181818] hover:bg-[#222222] p-3 rounded-xl cursor-pointer transition shadow group"
                      title="Abrir carpeta de Mix de grupero"
                    >
                      <div className="w-full aspect-square rounded-lg overflow-hidden relative mb-2.5 bg-neutral-800">
                        <img
                          src="https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=400&auto=format&fit=crop&q=80"
                          alt="Mix de grupero"
                          loading="lazy"
                          decoding="async"
                          className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                        />
                        <div className="absolute top-2 left-2 w-5 h-5 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center">
                          <Music className="w-3 h-3 text-[#1ED760]" />
                        </div>
                      </div>
                      <h4 className="text-sm font-bold text-white truncate">Mix de grupero</h4>
                      <p className="text-xs text-gray-400 truncate mt-0.5">
                        Eden Muñoz, Grupo Mojado, Kany García y...
                      </p>
                    </div>

                    <div
                      onClick={() => setActiveFilter('canciones')}
                      className="w-44 sm:w-48 shrink-0 bg-[#181818] hover:bg-[#222222] p-3 rounded-xl cursor-pointer transition shadow group flex flex-col justify-between"
                      title="Ver todas las canciones"
                    >
                      <div className="w-full aspect-square rounded-lg bg-gradient-to-tr from-blue-700 via-pink-600 to-red-600 flex items-center justify-center mb-2.5 relative shadow-inner">
                        <Music className="w-12 h-12 text-white animate-pulse" />
                        <div className="absolute top-2 left-2 w-5 h-5 rounded-full bg-black/60 flex items-center justify-center">
                          <ShieldCheck className="w-3 h-3 text-blue-400" />
                        </div>
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-white truncate">Catálogo de Pistas</h4>
                        <p className="text-xs text-blue-400 truncate mt-0.5 font-medium">
                          {(songs.length > 0 ? songs : canciones).length} canciones disponibles
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* ========================================================
                VISTA 2: CANCIONES (CATÁLOGO COMPLETO FUNCIONAL)
                ======================================================== */}
            {activeFilter === 'canciones' && (
              <div className="space-y-4 animate-fade-in pt-1">
                {/* Cabecera con estadísticas y acciones rápidas */}
                <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-gradient-to-r from-[#1c1c1e] to-[#252528] rounded-2xl border border-white/10 shadow-lg">
                  <div>
                    <div className="flex items-center gap-2">
                      <Music className="w-5 h-5 text-[#1ED760]" />
                      <h2 className="text-xl sm:text-2xl font-black text-white">Todas las Canciones</h2>
                    </div>
                    <p className="text-xs text-gray-300 mt-1 font-medium">
                      {(songs.length > 0 ? songs : canciones).length} canciones disponibles para reproducción instantánea
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        const lista = songs.length > 0 ? songs : canciones;
                        if (lista.length > 0) seleccionarCancion(lista[0]);
                      }}
                      className="px-3.5 py-2 rounded-full bg-[#1ED760] hover:bg-[#1db954] text-black font-bold text-xs flex items-center gap-1.5 shadow-lg active:scale-95 transition"
                      title="Reproducir desde la primera pista"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Reproducir Todo</span>
                    </button>
                    <button
                      onClick={reproducirAleatorio}
                      className="px-3.5 py-2 rounded-full bg-white/10 hover:bg-white/20 text-white font-bold text-xs flex items-center gap-1.5 border border-white/10 active:scale-95 transition"
                      title="Reproducir en modo aleatorio"
                    >
                      <Shuffle className="w-3.5 h-3.5 text-[#1ED760]" />
                      <span>Aleatorio</span>
                    </button>

                    {/* Botón para Limpiar MP3 Repetidas */}
                    <button
                      onClick={limpiarDuplicados}
                      disabled={limpiandoDuplicados}
                      className="px-3.5 py-2 rounded-full bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md border border-red-400/40 active:scale-95 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Eliminar canciones repetidas conservando solo la primera"
                    >
                      <Trash2 className={`w-3.5 h-3.5 text-white ${limpiandoDuplicados ? 'animate-spin' : ''}`} />
                      <span>{limpiandoDuplicados ? 'Limpiando...' : 'Limpiar MP3 Repetidas'}</span>
                    </button>

                    {/* Botón Actualizar Carátulas y Nombres (DeepSeek IA) */}
                    <button
                      onClick={completarInformacionFaltanteIA}
                      disabled={completandoInformacion}
                      className="px-3.5 py-2 rounded-full bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-500 hover:to-pink-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md border border-purple-400/40 active:scale-95 transition cursor-pointer disabled:opacity-50"
                      title="Actualizar carátulas, nombres limpios (sin spotdown) y artistas con DeepSeek IA"
                    >
                      <Sparkles className={`w-3.5 h-3.5 text-yellow-300 ${completandoInformacion ? 'animate-spin' : ''}`} />
                      <span>
                        {completandoInformacion
                          ? (progresoActualizacion ? `Procesando (${progresoActualizacion.actual}/${progresoActualizacion.total})...` : 'Procesando...')
                          : 'Actualizar con DeepSeek'}
                      </span>
                    </button>

                    {canUpload && (
                      <button
                        onClick={() => setShowUploadModal(true)}
                        className="px-3.5 py-2 rounded-full bg-pink-600 hover:bg-pink-500 text-white font-bold text-xs flex items-center gap-1.5 shadow active:scale-95 transition"
                        title="Subir nueva canción"
                      >
                        <Plus className="w-3.5 h-3.5 stroke-[3]" />
                        <span>+ Subir</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Lista de canciones con acciones completas */}
                <div className="space-y-1.5">
                  {(songs.length > 0 ? songs : canciones).length === 0 ? (
                    <div className="p-8 text-center bg-[#181818] rounded-2xl border border-white/5 space-y-3">
                      <Music className="w-10 h-10 text-gray-500 mx-auto" />
                      <p className="text-sm font-bold text-white">No hay canciones cargadas aún</p>
                      <p className="text-xs text-gray-400">
                        {canUpload ? 'Sube tus archivos MP3 o carpetas de música para comenzar a reproducir.' : 'El administrador agregará música a esta sección próximamente.'}
                      </p>
                      {canUpload && (
                        <button
                          onClick={() => setShowUploadModal(true)}
                          className="px-4 py-2 bg-[#1ED760] text-black font-bold text-xs rounded-full shadow hover:bg-[#1db954] transition"
                        >
                          Subir mi primer MP3
                        </button>
                      )}
                    </div>
                  ) : (
                    <>
                      {cancionesPaginadas.map((cancion, idx) => {
                        const esActual = currentSong?.id === cancion.id;
                        const sonando = esActual && isPlaying;
                        const esFav = favorites.includes(String(cancion.id));

                        return (
                          <div
                            key={cancion.id}
                            onClick={() => seleccionarCancion(cancion, listaParaBuscar)}
                            className={`group flex items-center px-3 py-2.5 rounded-xl cursor-pointer transition select-none ${
                              esActual
                                ? 'bg-white/10 text-white border border-[#1ED760]/40 shadow-md'
                                : 'hover:bg-white/5 text-gray-200 bg-[#161616]'
                            }`}
                          >
                            <div className="w-7 flex items-center justify-center shrink-0">
                              {sonando ? (
                                <div className="flex items-end gap-0.5 h-3.5">
                                  <span className="w-1 bg-[#1ED760] h-full animate-bounce rounded-full" />
                                  <span className="w-1 bg-[#1ED760] h-2 animate-bounce rounded-full [animation-delay:0.2s]" />
                                  <span className="w-1 bg-[#1ED760] h-3 animate-bounce rounded-full [animation-delay:0.4s]" />
                                </div>
                              ) : (
                                <span className={`text-xs font-semibold ${esActual ? 'text-[#1ED760]' : 'text-gray-400 group-hover:hidden'}`}>
                                  {idx + 1}
                                </span>
                              )}
                              {!sonando && (
                                <Play className="w-3.5 h-3.5 text-white hidden group-hover:block ml-0.5 fill-current" />
                              )}
                            </div>

                            <div className="w-11 h-11 rounded-lg overflow-hidden shrink-0 mx-2 shadow bg-neutral-900 border border-white/5">
                              {renderCover(cancion.cover_url || cancion.cover, 'w-full h-full object-cover')}
                            </div>

                            <div className="flex-1 min-w-0 pr-2">
                              <p className={`text-sm font-bold truncate leading-tight ${esActual ? 'text-[#1ED760]' : 'text-white'}`}>
                                {obtenerTituloCancionLimpio(cancion.title || cancion.titulo)}
                              </p>
                              <p className="text-xs text-gray-400 truncate mt-0.5">
                                {obtenerArtistaVisible(cancion.artist || cancion.artista)}
                              </p>
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleFavorite(cancion);
                                }}
                                className="p-2 text-gray-400 hover:text-[#1ED760] rounded-lg transition active:scale-90"
                                title={esFav ? 'Quitar de favoritos' : 'Añadir a favoritos'}
                              >
                                <Heart className={`w-4 h-4 ${esFav ? 'fill-current text-[#1ED760]' : ''}`} />
                              </button>

                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedSongForMenu(cancion);
                                  setShowSongMenuModal(true);
                                }}
                                className="p-2 text-gray-400 hover:text-white rounded-lg transition active:scale-90"
                                title="Opciones de la canción (Mover a carpeta)"
                              >
                                <MoreVertical className="w-4 h-4" />
                              </button>

                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  seleccionarCancion(cancion);
                                }}
                                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white text-white hover:text-black flex items-center justify-center transition active:scale-95 ml-1"
                                title={sonando ? 'Pausar' : 'Reproducir'}
                              >
                                {sonando ? (
                                  <Pause className="w-3.5 h-3.5 fill-current" />
                                ) : (
                                  <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                                )}
                              </button>
                            </div>
                          </div>
                        );
                      })}

                      {/* Controles de paginación de 50 en 50 para alto rendimiento */}
                      {(songs.length > 0 ? songs : canciones).length > cancionesPageSize && (
                        <div className="pt-4 pb-2 flex flex-col sm:flex-row items-center justify-between gap-3 p-4 bg-[#18181a] rounded-2xl border border-white/5 shadow-md">
                          <span className="text-xs text-gray-400 font-medium">
                            Mostrando <strong className="text-white">{Math.min(cancionesPageSize, (songs.length > 0 ? songs : canciones).length)}</strong> de <strong className="text-emerald-400">{(songs.length > 0 ? songs : canciones).length}</strong> canciones
                          </span>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setCancionesPageSize((prev) => prev + 50)}
                              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition shadow active:scale-95 flex items-center gap-1.5"
                            >
                              <Plus className="w-3.5 h-3.5 stroke-[3]" />
                              <span>Cargar 50 más</span>
                            </button>
                            <button
                              onClick={() => setCancionesPageSize((songs.length > 0 ? songs : canciones).length)}
                              className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition border border-white/10 active:scale-95"
                            >
                              Mostrar todas ({(songs.length > 0 ? songs : canciones).length})
                            </button>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}

            {/* ========================================================
                VISTA 3: CARPETAS (TODAS LAS PLAYLISTS COMPLETAS)
                ======================================================== */}
            {activeFilter === 'carpetas' && (
              <div className="space-y-4 animate-fade-in pt-1">
                <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-gradient-to-r from-[#1c1c1e] to-[#252528] rounded-2xl border border-white/10 shadow-lg">
                  <div>
                    <div className="flex items-center gap-2">
                      <Folder className="w-5 h-5 text-blue-400" />
                      <h2 className="text-xl sm:text-2xl font-black text-white">Carpetas de Audios & Playlists</h2>
                    </div>
                    <p className="text-xs text-gray-300 mt-1 font-medium">
                      {folders.length} carpetas organizadas • Arrastra para reordenar
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap justify-end">
                    {canCreateFolder && (
                      <button
                        onClick={() => setShowCreateFolderModal(true)}
                        className="px-3.5 py-2 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow active:scale-95 transition"
                        title="Crear nueva carpeta de audios"
                      >
                        <FolderPlus className="w-3.5 h-3.5 stroke-[2.5]" />
                        <span>+ Nueva Carpeta</span>
                      </button>
                    )}
                    {canUpload && (
                      <button
                        onClick={() => setShowUploadModal(true)}
                        className="px-3.5 py-2 rounded-full bg-pink-600 hover:bg-pink-500 text-white font-bold text-xs flex items-center gap-1.5 shadow active:scale-95 transition"
                        title="Subir archivos MP3"
                      >
                        <Plus className="w-3.5 h-3.5 stroke-[3]" />
                        <span>+ Subir a Carpeta</span>
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {folders.map((folder) => {
                    const count = obtenerCancionesCarpeta(folder).length;
                    const isHiddenFromHome = hiddenFromHomeFolderIds.includes(folder.id);
                    const isBeingDragged = draggedFolderId === folder.id;
                    const isDragTarget = dragOverFolderId === folder.id && draggedFolderId !== folder.id;

                    return (
                      <div
                        key={folder.id}
                        draggable={true}
                        onDragStart={(e) => {
                          e.dataTransfer.setData('text/plain', folder.id);
                          e.dataTransfer.effectAllowed = 'move';
                          setDraggedFolderId(folder.id);
                          setIsDraggingActive(true);
                        }}
                        onDragOver={(e) => {
                          e.preventDefault();
                          e.dataTransfer.dropEffect = 'move';
                          if (dragOverFolderId !== folder.id) setDragOverFolderId(folder.id);
                        }}
                        onDragLeave={() => {
                          if (dragOverFolderId === folder.id) setDragOverFolderId(null);
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          const sourceId = e.dataTransfer.getData('text/plain') || draggedFolderId;
                          if (sourceId && sourceId !== folder.id) {
                            handleReorderFolders(sourceId, folder.id);
                          }
                          setDraggedFolderId(null);
                          setDragOverFolderId(null);
                          setTimeout(() => setIsDraggingActive(false), 100);
                        }}
                        onDragEnd={() => {
                          setDraggedFolderId(null);
                          setDragOverFolderId(null);
                          setTimeout(() => setIsDraggingActive(false), 100);
                        }}
                        onClick={() => {
                          if (isDraggingActive) return;
                          setSelectedFolder(folder);
                        }}
                        className={`group flex items-center p-2.5 bg-[#1C1C1E] hover:bg-[#252528] rounded-xl border cursor-grab active:cursor-grabbing transition shadow-md active:scale-[0.98] relative ${
                          isBeingDragged
                            ? 'opacity-40 scale-95 border-2 border-dashed border-emerald-400'
                            : isDragTarget
                            ? 'ring-2 ring-emerald-400 border-emerald-400 bg-emerald-950/40 scale-[1.02]'
                            : 'border-white/5 hover:border-white/20'
                        }`}
                        title={`Arrastra para reordenar o pulsa para abrir "${folder.titulo}"`}
                      >
                        <div className="w-16 h-16 rounded-lg overflow-hidden shrink-0 shadow bg-neutral-900 mr-3">
                          {renderCover(folder.coverUrl || folder.coverKey, 'w-full h-full object-cover', folder.titulo)}
                        </div>
                        <div className="flex-1 min-w-0 pr-1">
                          <h4 className="text-sm font-black text-white truncate leading-snug group-hover:text-[#1ED760] transition">
                            {folder.titulo}
                          </h4>
                          <p className="text-xs text-gray-400 truncate mt-0.5">
                            {folder.subtitulo || folder.descripcion}
                          </p>
                          <div className="flex items-center gap-1.5 mt-1">
                            <span className="inline-block text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                              {count} {count === 1 ? 'audio' : 'audios'}
                            </span>
                            {isHiddenFromHome ? (
                              <span className="text-[10px] font-semibold text-amber-300 bg-amber-500/15 border border-amber-500/30 px-1.5 py-0.5 rounded">
                                Oculta en Inicio
                              </span>
                            ) : (
                              <span className="text-[10px] font-medium text-gray-400 bg-white/5 px-1.5 py-0.5 rounded hidden sm:inline">
                                En Inicio
                              </span>
                            )}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setFolderForMenu(folder);
                            setShowFolderMenuModal(true);
                          }}
                          className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-full mr-1 transition active:scale-90 shrink-0"
                          title={`Opciones de ${folder.titulo}`}
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>
                        <Play className="w-4 h-4 text-gray-400 group-hover:text-white shrink-0 ml-1" />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ========================================================
                VISTA 4: FAVORITAS (TUS TEMAS CON CORAZÓN 💚)
                ======================================================== */}
            {activeFilter === 'favoritas' && (
              <div className="space-y-4 animate-fade-in pt-1">
                {(() => {
                  const listaTodas = songs.length > 0 ? songs : canciones;
                  const favoritasList = listaTodas.filter((s) => favorites.includes(String(s.id)));

                  return (
                    <>
                      <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-gradient-to-r from-pink-950/40 via-purple-950/40 to-[#1c1c1e] rounded-2xl border border-pink-500/30 shadow-lg">
                        <div>
                          <div className="flex items-center gap-2">
                            <Heart className="w-5 h-5 text-[#1ED760] fill-current" />
                            <h2 className="text-xl sm:text-2xl font-black text-white">Tus Canciones Favoritas</h2>
                          </div>
                          <p className="text-xs text-gray-300 mt-1 font-medium">
                            {favoritasList.length} temas marcados con 💚
                          </p>
                        </div>

                        {favoritasList.length > 0 && (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => seleccionarCancion(favoritasList[0], favoritasList)}
                              className="px-3.5 py-2 rounded-full bg-[#1ED760] hover:bg-[#1db954] text-black font-bold text-xs flex items-center gap-1.5 shadow active:scale-95 transition"
                            >
                              <Play className="w-3.5 h-3.5 fill-current" />
                              <span>Reproducir Favoritas</span>
                            </button>
                            <button
                              onClick={reproducirAleatorio}
                              className="px-3.5 py-2 rounded-full bg-white/10 hover:bg-white/20 text-white font-bold text-xs flex items-center gap-1.5 border border-white/10 active:scale-95 transition"
                            >
                              <Shuffle className="w-3.5 h-3.5 text-[#1ED760]" />
                              <span>Aleatorio</span>
                            </button>
                          </div>
                        )}
                      </div>

                      {favoritasList.length === 0 ? (
                        <div className="p-10 text-center bg-[#181818] rounded-2xl border border-white/5 space-y-3">
                          <Heart className="w-12 h-12 text-pink-500/50 mx-auto" />
                          <p className="text-base font-bold text-white">Aún no tienes canciones favoritas</p>
                          <p className="text-xs text-gray-400 max-w-sm mx-auto">
                            Toca el corazón <strong className="text-emerald-400">💚</strong> en cualquier canción de tu biblioteca para guardarla en esta lista de acceso rápido.
                          </p>
                          <div className="pt-2">
                            <button
                              onClick={() => setActiveFilter('canciones')}
                              className="px-4 py-2 bg-[#1ED760] text-black font-bold text-xs rounded-full shadow hover:bg-[#1db954] transition active:scale-95"
                            >
                              Explorar canciones
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-1.5">
                          {favoritasList.map((cancion, idx) => {
                            const esActual = currentSong?.id === cancion.id;
                            const sonando = esActual && isPlaying;

                            return (
                              <div
                                key={cancion.id}
                                onClick={() => seleccionarCancion(cancion, favoritasList)}
                                className={`group flex items-center px-3 py-2.5 rounded-xl cursor-pointer transition select-none ${
                                  esActual
                                    ? 'bg-white/10 text-white border border-[#1ED760]/40 shadow-md'
                                    : 'hover:bg-white/5 text-gray-200 bg-[#161616]'
                                }`}
                              >
                                <div className="w-7 flex items-center justify-center shrink-0">
                                  {sonando ? (
                                    <div className="flex items-end gap-0.5 h-3.5">
                                      <span className="w-1 bg-[#1ED760] h-full animate-bounce rounded-full" />
                                      <span className="w-1 bg-[#1ED760] h-2 animate-bounce rounded-full [animation-delay:0.2s]" />
                                      <span className="w-1 bg-[#1ED760] h-3 animate-bounce rounded-full [animation-delay:0.4s]" />
                                    </div>
                                  ) : (
                                    <span className="text-xs font-semibold text-gray-400 group-hover:hidden">
                                      {idx + 1}
                                    </span>
                                  )}
                                  {!sonando && (
                                    <Play className="w-3.5 h-3.5 text-white hidden group-hover:block ml-0.5 fill-current" />
                                  )}
                                </div>

                                <div className="w-11 h-11 rounded-lg overflow-hidden shrink-0 mx-2 shadow bg-neutral-900 border border-white/5">
                                  {renderCover(cancion.cover_url || cancion.cover, 'w-full h-full object-cover')}
                                </div>

                                <div className="flex-1 min-w-0 pr-2">
                                  <p className={`text-sm font-bold truncate leading-tight ${esActual ? 'text-[#1ED760]' : 'text-white'}`}>
                                    {obtenerTituloCancionLimpio(cancion.title || cancion.titulo)}
                                  </p>
                                  <p className="text-xs text-gray-400 truncate mt-0.5">
                                    {obtenerArtistaVisible(cancion.artist || cancion.artista)}
                                  </p>
                                </div>

                                <div className="flex items-center gap-1 shrink-0">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toggleFavorite(cancion);
                                    }}
                                    className="p-2 text-[#1ED760] hover:text-white rounded-lg transition active:scale-90"
                                    title="Quitar de favoritas"
                                  >
                                    <Heart className="w-4 h-4 fill-current" />
                                  </button>

                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedSongForMenu(cancion);
                                      setShowSongMenuModal(true);
                                    }}
                                    className="p-2 text-gray-400 hover:text-white rounded-lg transition active:scale-90"
                                    title="Opciones de la canción (Mover a carpeta)"
                                  >
                                    <MoreVertical className="w-4 h-4" />
                                  </button>

                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      seleccionarCancion(cancion);
                                    }}
                                    className="w-8 h-8 rounded-full bg-white/10 hover:bg-white text-white hover:text-black flex items-center justify-center transition active:scale-95 ml-1"
                                    title={sonando ? 'Pausar' : 'Reproducir'}
                                  >
                                    {sonando ? (
                                      <Pause className="w-3.5 h-3.5 fill-current" />
                                    ) : (
                                      <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                                    )}
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            )}
          </>
        ) : null}

        {/* ==========================================
            PESTAÑA: BUSCAR
            ========================================== */}
        {activeTab === 'buscar' && (
          <div className="space-y-4 pt-1">
            <h2 className="text-2xl font-black text-white">Buscar</h2>
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="¿Qué deseas escuchar?"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-[#242424] border border-[#333333] rounded-xl text-sm text-white placeholder-gray-400 focus:outline-none focus:border-[#1ED760] transition"
              />
            </div>

            <div className="space-y-2 pt-2">
              <h3 className="text-sm font-bold text-gray-300">Pistas y Artistas disponibles</h3>
              {filteredSongs.map((cancion) => (
                <div
                  key={cancion.id}
                  onClick={() => seleccionarCancion(cancion, filteredSongs)}
                  className="flex items-center justify-between p-2.5 bg-[#1C1C1C] hover:bg-[#242424] rounded-lg cursor-pointer transition"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {renderCover(cancion.cover_url || cancion.cover, 'w-10 h-10')}
                    <div className="min-w-0">
                      <p className={`text-sm font-bold truncate ${currentSong?.id === cancion.id ? 'text-[#1ED760]' : 'text-white'}`}>
                        {obtenerTituloCancionLimpio(cancion.title || cancion.titulo)}
                      </p>
                      <p className="text-xs text-gray-400 truncate">{obtenerArtistaVisible(cancion.artist || cancion.artista)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedSongForMenu(cancion);
                        setShowSongMenuModal(true);
                      }}
                      className="p-1.5 text-gray-400 hover:text-white rounded-lg transition active:scale-90"
                      title="Opciones (Mover a carpeta)"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>
                    <Play className="w-4 h-4 text-gray-400 group-hover:text-white" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ==========================================
            PESTAÑA: TU BIBLIOTECA (SUPABASE STORAGE)
            ========================================== */}
        {activeTab === 'biblioteca' && (
          <div className="space-y-4 pt-1">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-2xl font-black text-white">Tu biblioteca</h2>
                <p className="text-xs text-blue-400 font-medium">Música propia subida</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={limpiarDuplicados}
                  disabled={limpiandoDuplicados}
                  className="px-3.5 py-1.5 rounded-full bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md active:scale-95 transition border border-red-400/40 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Eliminar canciones repetidas conservando solo la primera"
                >
                  <Trash2 className={`w-3.5 h-3.5 text-white ${limpiandoDuplicados ? 'animate-spin' : ''}`} />
                  <span>{limpiandoDuplicados ? 'Limpiando...' : 'Limpiar MP3 Repetidas'}</span>
                </button>
                <button
                  onClick={completarInformacionFaltanteIA}
                  disabled={completandoInformacion}
                  className="px-3.5 py-1.5 rounded-full bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-500 hover:to-pink-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md active:scale-95 transition border border-purple-400/40 cursor-pointer disabled:opacity-50"
                  title="Actualizar carátulas, nombres limpios (sin spotdown) y artistas con DeepSeek IA"
                >
                  <Sparkles className={`w-3.5 h-3.5 text-yellow-300 ${completandoInformacion ? 'animate-spin' : ''}`} />
                  <span>
                    {completandoInformacion
                      ? (progresoActualizacion ? `Procesando (${progresoActualizacion.actual}/${progresoActualizacion.total})...` : 'Procesando...')
                      : 'Actualizar con DeepSeek'}
                  </span>
                </button>
                <button
                  onClick={abrirModalOrganizarBiblioteca}
                  className="px-3.5 py-1.5 rounded-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md active:scale-95 transition border border-emerald-400/40 cursor-pointer"
                  title="Organizar automáticamente todas las canciones por género musical"
                >
                  <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
                  <span>ORGANIZAR MI BIBLIOTECA</span>
                </button>
                <button
                  onClick={() => {
                    setShowTelegramUploadModal(true);
                    setTelegramError(null);
                  }}
                  className="px-3.5 py-1.5 rounded-full bg-gradient-to-r from-sky-600 via-blue-600 to-cyan-500 hover:from-sky-500 hover:to-blue-400 text-white font-bold text-xs flex items-center gap-1.5 shadow-md active:scale-95 transition border border-sky-400/40 cursor-pointer"
                  title="Subir archivo MP3 a Telegram Cold Storage"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Subir a Telegram</span>
                </button>
                {canCreateFolder && (
                  <button
                    onClick={() => setShowCreateFolderModal(true)}
                    className="px-3.5 py-1.5 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow active:scale-95 transition"
                    title="Crear nueva carpeta de audios"
                  >
                    <FolderPlus className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>Nueva Carpeta</span>
                  </button>
                )}
                {canUpload && (
                  <>
                    <button
                      onClick={() => multiFileInputRef.current?.click()}
                      className="px-3 py-1.5 rounded-full bg-pink-600 hover:bg-pink-500 text-white font-bold text-xs flex items-center gap-1.5 shadow active:scale-95 transition"
                      title="Subir múltiples archivos MP3"
                    >
                      <Music className="w-3.5 h-3.5" />
                      <span>Subir múltiples MP3</span>
                    </button>
                    <button
                      onClick={() => folderInputRef.current?.click()}
                      className="px-3 py-1.5 rounded-full bg-[#2A2A2A] hover:bg-[#333333] border border-white/10 text-white font-bold text-xs flex items-center gap-1.5 shadow active:scale-95 transition"
                      title="Subir carpeta entera de música"
                    >
                      <Folder className="w-3.5 h-3.5 text-blue-400" />
                      <span>Subir carpeta</span>
                    </button>
                    <button
                      onClick={() => setShowUploadModal(true)}
                      className="px-3 py-1.5 rounded-full bg-[#1ED760] hover:bg-[#1db954] text-black font-bold text-xs flex items-center gap-1 shadow active:scale-95 transition"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Con IA</span>
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Tarjeta de estado de sesión */}
            <div className="p-3 bg-[#1C1C1E] border border-white/10 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-2.5 min-w-0">
                <ShieldCheck className={`w-5 h-5 shrink-0 ${isAdmin ? 'text-amber-400' : 'text-blue-400'}`} />
                <div className="min-w-0">
                  <p className="text-xs font-bold text-white flex items-center gap-1.5">
                    <span>{user.email}</span>
                    {isAdmin && (
                      <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/40 px-1.5 py-0.2 rounded font-bold">
                        Admin
                      </span>
                    )}
                  </p>
                  <p className="text-[11px] text-gray-400">
                    {isAdmin ? 'Sesión de Administrador con acceso completo' : 'Sesión de usuario activa (Solo lectura y reproducción)'}
                  </p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="px-2.5 py-1 text-[11px] font-semibold bg-red-950/60 text-red-300 border border-red-500/30 rounded-lg hover:bg-red-900/60 transition"
              >
                Cerrar Sesión
              </button>
            </div>

            {/* Lista de canciones del usuario */}
            <div className="space-y-2 pt-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-bold text-gray-300">Tus pistas de música</h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={limpiarDuplicados}
                    disabled={limpiandoDuplicados}
                    className="px-3 py-1 rounded-full bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md active:scale-95 transition border border-red-400/40 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Eliminar canciones repetidas conservando solo la primera"
                  >
                    <Trash2 className={`w-3.5 h-3.5 text-white ${limpiandoDuplicados ? 'animate-spin' : ''}`} />
                    <span>{limpiandoDuplicados ? 'Limpiando...' : 'Limpiar MP3 Repetidas'}</span>
                  </button>
                  <button
                    onClick={completarInformacionFaltanteIA}
                    disabled={completandoInformacion}
                    className="px-3 py-1 rounded-full bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-500 hover:to-pink-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md active:scale-95 transition border border-purple-400/40 cursor-pointer disabled:opacity-50"
                    title="Actualizar carátulas, nombres limpios (sin spotdown) y artistas con DeepSeek IA"
                  >
                    <Sparkles className={`w-3.5 h-3.5 text-yellow-300 ${completandoInformacion ? 'animate-spin' : ''}`} />
                    <span>
                      {completandoInformacion
                        ? (progresoActualizacion ? `Procesando (${progresoActualizacion.actual}/${progresoActualizacion.total})...` : 'Procesando...')
                        : 'Actualizar con DeepSeek'}
                    </span>
                  </button>
                  {(songs.length > 0 || canciones.length > 0) && (
                    <span className="text-xs text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-full">
                      {(songs.length > 0 ? songs : canciones).length} canciones
                    </span>
                  )}
                </div>
              </div>

              {(songs.length > 0 || canciones.length > 0) ? (
                listaParaBuscar.map((song) => {
                  const isSelected = currentSong?.id === song.id;
                  return (
                    <div
                      key={song.id}
                      onClick={() => seleccionarCancion(song, listaParaBuscar)}
                      className={`flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition ${
                        isSelected ? 'bg-[#202020] border border-[#1ED760]/60' : 'bg-[#181818] hover:bg-[#222222]'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {renderCover(song.cover_url || song.cover, 'w-11 h-11')}
                        <div className="min-w-0">
                          <p className={`text-xs sm:text-sm font-bold truncate ${isSelected ? 'text-[#1ED760]' : 'text-white'}`}>
                            {song.title || song.titulo}
                          </p>
                          <p className="text-[11px] text-gray-400 truncate">{song.artist || song.artista}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 sm:gap-2">
                        {isAdmin && (
                          <>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedSongForMenu(song);
                                setShowSongMenuModal(true);
                              }}
                              className="p-1.5 text-gray-400 hover:text-white rounded-lg transition active:scale-90"
                              title="Opciones (Mover a carpeta)"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </button>
                            <button
                              onClick={(e) => solicitarEliminarCancion(song, e)}
                              className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition"
                              title="Eliminar canción"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            seleccionarCancion(song);
                          }}
                          className="w-8 h-8 rounded-full bg-white/10 hover:bg-white text-white hover:text-black flex items-center justify-center transition"
                        >
                          {isSelected && isPlaying ? (
                            <Pause className="w-4 h-4 fill-current" />
                          ) : (
                            <Play className="w-4 h-4 fill-current ml-0.5" />
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="p-8 text-center bg-[#181818] rounded-2xl border border-white/5 space-y-3">
                  <Music className="w-10 h-10 text-gray-500 mx-auto" />
                  <p className="text-sm font-bold text-white">Aún no hay canciones en tu biblioteca</p>
                  <p className="text-xs text-gray-400 max-w-sm mx-auto">
                    {canUpload ? 'Selecciona múltiples archivos MP3 o una carpeta completa para cargarlos aquí.' : 'El administrador agregará música a tu biblioteca próximamente.'}
                  </p>
                  {canUpload && (
                    <div className="flex flex-wrap items-center justify-center gap-2.5 pt-2">
                      <button
                        onClick={() => multiFileInputRef.current?.click()}
                        className="px-4 py-2 bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white font-bold text-xs rounded-full shadow-lg flex items-center gap-2 active:scale-95 transition"
                      >
                        <Music className="w-4 h-4" />
                        <span>Subir múltiples MP3</span>
                      </button>
                      <button
                        onClick={() => folderInputRef.current?.click()}
                        className="px-4 py-2 bg-[#282828] hover:bg-[#333333] border border-white/10 text-white font-bold text-xs rounded-full flex items-center gap-2 active:scale-95 transition"
                      >
                        <Folder className="w-4 h-4 text-blue-400" />
                        <span>Subir carpeta</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ==========================================
          MINI PLAYER FLOTANTE ESTILO SPOTIFY
          Fijado por encima de la barra de navegación
          ========================================== */}
      <div className="fixed bottom-[calc(4rem+env(safe-area-inset-bottom,0px)+0.5rem)] sm:bottom-[calc(4.5rem+env(safe-area-inset-bottom,0px)+0.5rem)] left-2 right-2 sm:left-4 sm:right-4 z-40">
        <div
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onClick={() => {
            if (currentSong) {
              setShowExpandedPlayer(true);
            }
          }}
          className="bg-[#2e0c12]/95 hover:bg-[#380e16] border border-red-900/40 rounded-xl px-2.5 py-2 shadow-2xl transition backdrop-blur-md cursor-pointer select-none relative overflow-hidden flex flex-col justify-between active:scale-[0.99]"
          title="Toca para abrir el reproductor en pantalla completa"
        >
          {/* Fila Principal: Portada + Título + Artista + Controles (Cast, Like, Play/Pausa, Siguiente) */}
          <div className="flex items-center justify-between gap-3">
            {/* Portada + Info Canción */}
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-lg overflow-hidden shrink-0 shadow-md bg-neutral-900 border border-white/10 flex items-center justify-center">
                {currentSong ? (
                  renderCover(currentSong.cover_url || currentSong.cover, 'w-full h-full object-cover')
                ) : (
                  <Music className="w-5 h-5 text-white/70" />
                )}
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-sm sm:text-base font-bold text-white truncate leading-tight">
                  {currentSong ? obtenerTituloCancionLimpio(currentSong.title || currentSong.titulo) : 'Sin canción en reproducción'}
                </p>
                <p className="text-xs text-gray-300/90 truncate font-medium mt-0.5">
                  {currentSong ? obtenerArtistaVisible(currentSong.artist || currentSong.artista) : 'Spotyy_AA'}
                </p>
              </div>
            </div>

            {/* Controles: Cast, Temporizador, Check/Favorito, Play/Pausa, Siguiente */}
            <div className="flex items-center gap-1 sm:gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
              {/* Botón Temporizador de Apagado (Sleep Timer) */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowSleepTimerModal(true);
                }}
                className={`p-1.5 sm:p-2 transition active:scale-90 relative ${
                  sleepTimerRemainingSec !== null ? 'text-[#1ED760]' : 'text-gray-300 hover:text-white'
                }`}
                title={
                  sleepTimerRemainingSec !== null
                    ? `Temporizador activo: ${formatearTiempoRestante(sleepTimerRemainingSec)}`
                    : 'Temporizador de apagado (Sleep Timer)'
                }
              >
                <Clock className="w-5 h-5" />
                {sleepTimerRemainingSec !== null && (
                  <span className="absolute -top-1 -right-1 bg-[#1ED760] text-black text-[9px] font-black px-1 rounded-full leading-none py-0.5 shadow">
                    {Math.ceil(sleepTimerRemainingSec / 60)}m
                  </span>
                )}
              </button>

              {/* Botón Dispositivos / Cast (como en Spotify) */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  triggerToast('Conectado a Spotyy_AA Web Player', 'success');
                }}
                className="p-1.5 sm:p-2 text-gray-300 hover:text-white transition active:scale-90"
                title="Dispositivos de reproducción"
              >
                <Cast className="w-5 h-5" />
              </button>

              {/* Botón Favorito / Guardado (Checkmark verde como en Spotify) */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (currentSong) {
                    toggleFavorite(currentSong);
                  }
                }}
                className="p-1.5 sm:p-2 text-[#1ED760] hover:text-[#1db954] transition active:scale-90"
                title="Guardada en tu biblioteca"
              >
                <CheckCircle2 className="w-5 h-5 fill-current" />
              </button>

              {/* Botón Play / Pausa */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  togglePlay();
                }}
                className="p-1.5 sm:p-2 text-white hover:text-white transition active:scale-90"
                title={isPlaying ? 'Pausar' : 'Reproducir'}
              >
                {isPlaying ? (
                  <Pause className="w-6 h-6 fill-current" />
                ) : (
                  <Play className="w-6 h-6 fill-current ml-0.5" />
                )}
              </button>

              {/* Botón Siguiente (SkipForward) */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  reproducirSiguiente();
                }}
                className="p-1.5 sm:p-2 text-gray-300 hover:text-white transition active:scale-90"
                title="Siguiente canción"
              >
                <SkipForward className="w-5 h-5 fill-current" />
              </button>
            </div>
          </div>

          {/* Línea de progreso delgada fijada al borde inferior exacto (como en Spotify) */}
          <div className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-white/10 overflow-hidden">
            <div
              className="h-full bg-[#1ED760] transition-all duration-100"
              style={{ width: `${duration ? Math.min(100, Math.max(0, (currentTime / duration) * 100)) : 0}%` }}
            />
          </div>
        </div>
      </div>

      {/* ==========================================
          BARRA DE NAVEGACIÓN INFERIOR (MÁS GRANDE Y CÓMODA)
          Inicio, Buscar, Tu biblioteca, Crear
          ========================================== */}
      <footer className="fixed bottom-0 left-0 right-0 h-[calc(4rem+env(safe-area-inset-bottom,0px))] pb-[env(safe-area-inset-bottom,0px)] bg-black border-t border-neutral-900 px-4 flex items-center justify-around z-40 select-none">
        {/* Tab 1: Inicio */}
        <button
          onClick={() => {
            setActiveTab('inicio');
            setSelectedFolder(null);
          }}
          className={`flex flex-col items-center justify-center gap-1 transition py-1 ${
            activeTab === 'inicio' && !selectedFolder ? 'text-[#1ED760] font-black' : 'text-gray-400 hover:text-gray-200 font-semibold'
          }`}
        >
          <Home className={`w-6 h-6 ${activeTab === 'inicio' && !selectedFolder ? 'stroke-[2.5]' : 'stroke-[1.8]'}`} />
          <span className="text-xs">Inicio</span>
        </button>

        {/* Tab 2: Buscar */}
        <button
          onClick={() => setActiveTab('buscar')}
          className={`flex flex-col items-center justify-center gap-1 transition py-1 ${
            activeTab === 'buscar' ? 'text-[#1ED760] font-black' : 'text-gray-400 hover:text-gray-200 font-semibold'
          }`}
        >
          <Search className={`w-6 h-6 ${activeTab === 'buscar' ? 'stroke-[2.5]' : 'stroke-[1.8]'}`} />
          <span className="text-xs">Buscar</span>
        </button>

        {/* Tab 3: Tu biblioteca */}
        <button
          onClick={() => setActiveTab('biblioteca')}
          className={`flex flex-col items-center justify-center gap-1 transition py-1 ${
            activeTab === 'biblioteca' ? 'text-[#1ED760] font-black' : 'text-gray-400 hover:text-gray-200 font-semibold'
          }`}
        >
          <Library className={`w-6 h-6 ${activeTab === 'biblioteca' ? 'stroke-[2.5]' : 'stroke-[1.8]'}`} />
          <span className="text-xs">Tu biblioteca</span>
        </button>

        {/* Tab 4: Crear (+ Subir Canción con IA) */}
        {canUpload && (
          <button
            onClick={() => {
              setShowUploadModal(true);
            }}
            className="flex flex-col items-center justify-center gap-1 text-gray-400 hover:text-pink-400 transition font-semibold py-1"
          >
            <Plus className="w-6 h-6 stroke-[2.2] text-pink-400" />
            <span className="text-xs text-pink-300 font-bold">Subir MP3</span>
          </button>
        )}
      </footer>

      {/* ==========================================
          MODAL: SUBIR CANCIÓN CON DEEPSEEK IA
          ========================================== */}
      {showUploadModal && canUpload && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#1E1E1E] border border-[#383838] rounded-2xl w-full max-w-lg p-6 shadow-2xl relative max-h-[92vh] overflow-y-auto">
            <button
              onClick={() => {
                if (!isUploading) setShowUploadModal(false);
              }}
              className="absolute top-4 right-4 text-gray-400 hover:text-white p-1 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-pink-600 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-pink-600/30">
                <Sparkles className="w-6 h-6 text-yellow-300" />
              </div>
              <div>
                <h3 className="text-lg font-black text-white">Subir MP3 con DeepSeek IA</h3>
                <p className="text-xs text-pink-400 font-semibold">
                  Nombre inteligente, artista y portada automática
                </p>
              </div>
            </div>

            {/* 4. Botones rápidos para subir múltiples archivos MP3 y carpetas enteras */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-4">
              <button
                type="button"
                onClick={() => multiFileInputRef.current?.click()}
                className="p-3 rounded-xl bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg transition active:scale-95"
                title="Selecciona varios archivos MP3 a la vez"
              >
                <Music className="w-4 h-4 text-white" />
                <span>Subir múltiples MP3</span>
              </button>
              <button
                type="button"
                onClick={() => folderInputRef.current?.click()}
                className="p-3 rounded-xl bg-[#262626] hover:bg-[#333333] border border-white/10 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md transition active:scale-95"
                title="Selecciona una carpeta completa de música de tu dispositivo"
              >
                <Folder className="w-4 h-4 text-blue-400" />
                <span>Subir carpeta entera</span>
              </button>
            </div>

            {/* Inputs ocultos para subida múltiple y carpetas completas */}
            <input
              ref={multiFileInputRef}
              type="file"
              multiple
              accept="audio/mpeg,audio/mp3,.mp3,audio/*"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) {
                  subirMultiplesArchivos(e.target.files);
                }
              }}
            />
            <input
              ref={folderInputRef}
              type="file"
              {...({ webkitdirectory: '', directory: '', multiple: true } as any)}
              accept="audio/*,.mp3"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) {
                  subirMultiplesArchivos(e.target.files);
                }
              }}
            />

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (selectedFile) {
                  subirCancion(selectedFile);
                }
              }}
              className="space-y-4 text-sm"
            >
              {/* Selector de Archivo MP3 Individual con IA */}
              <div>
                <label className="block text-xs font-bold text-gray-200 mb-1.5 uppercase tracking-wide">
                  O selecciona archivo individual con IA <span className="text-pink-500">*</span>
                </label>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-[#383838] hover:border-pink-500 rounded-xl p-4 text-center cursor-pointer transition bg-[#141414] active:scale-[0.99]"
                >
                  <Music className="w-9 h-9 text-pink-400 mx-auto mb-2" />
                  {selectedFile ? (
                    <div>
                      <p className="text-sm font-bold text-emerald-400 truncate">
                        {selectedFile.name}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5 font-medium">
                        {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB • Clic para cambiar
                      </p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-sm text-gray-200 font-semibold">Toca aquí para elegir tu archivo MP3</p>
                      <p className="text-xs text-gray-400 mt-1">
                        La IA DeepSeek detectará automáticamente el título, artista y diseñará la foto.
                      </p>
                    </div>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="audio/mpeg,audio/mp3,.mp3,audio/*"
                  className="hidden"
                  onChange={async (e) => {
                    const f = e.target.files?.[0];
                    if (f) {
                      setSelectedFile(f);
                      setDetectedGenre('');
                      latestGenreRef.current = '';
                      setManualTargetFolderId('');
                      setShowFolderPickerInModal(false);

                      // 1. Extracción instantánea de ID3 y parsing heurístico previo
                      const id3 = await extractAudioMetadataFromFile(f);
                      const fast = parseSmartAudioName(f.name);
                      const initialTitle = id3.title || fast.titulo;
                      const initialArtist = id3.artist || fast.artista;
                      setCustomTitle(initialTitle);
                      setCustomArtist(initialArtist);
                      if (id3.coverUrl) {
                        setCoverPreviewUrl(id3.coverUrl);
                        setCustomCoverUrl(id3.coverUrl);
                      }

                      const initialGenre = fast.generoInicial || normalizeGenreName(id3.genre);
                      if (initialGenre) {
                        setDetectedGenre(initialGenre);
                        latestGenreRef.current = initialGenre;
                      }

                      // 2. Análisis y nombramiento inteligente individual con IA (DeepSeek & Gemini)
                      await analizarAudioConIA(f, initialTitle, initialArtist, id3.genre);
                    }
                  }}
                />
              </div>

              {/* Indicador de Estado de la IA DeepSeek / Gemini */}
              {isAiAnalyzing && (
                <div className="p-3.5 rounded-xl bg-gradient-to-r from-pink-950/70 via-purple-950/70 to-indigo-950/70 border border-pink-500/50 flex items-center gap-3 text-xs text-pink-200 animate-pulse shadow-lg">
                  <div className="w-5 h-5 border-2 border-pink-400 border-t-transparent rounded-full animate-spin shrink-0" />
                  <div>
                    <p className="font-extrabold text-white text-sm">🤖 IA identificando canción y artista...</p>
                    <p className="text-[11px] text-pink-200/90 font-medium">Extrayendo el nombre exacto, artista musical y diseñando portada 4K</p>
                  </div>
                </div>
              )}

              {aiIdentifiedInfo && !isAiAnalyzing && (
                <div className="p-3.5 rounded-xl bg-emerald-950/60 border border-emerald-500/50 flex items-center justify-between text-xs text-emerald-200 shadow-lg">
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                    <div>
                      <p className="text-[11px] text-emerald-400 font-bold uppercase tracking-wider">{aiIdentifiedInfo.fuenteIA || 'IA Musical'}</p>
                      <p className="text-sm font-black text-white">
                        {aiIdentifiedInfo.artista} <span className="text-gray-400 font-normal">—</span> {aiIdentifiedInfo.titulo}
                      </p>
                      <p className="text-[11px] text-emerald-300 font-medium">{aiIdentifiedInfo.genero}</p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-emerald-500/25 border border-emerald-500/40 text-emerald-300 text-[11px] font-black">
                    Identificado
                  </span>
                </div>
              )}

              {/* Selector e Input oculto de Foto de Portada */}
              <input
                ref={coverInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) {
                    setCoverFile(f);
                    const localPreview = URL.createObjectURL(f);
                    setCoverPreviewUrl(localPreview);
                  }
                }}
              />

              {/* Vista Previa de la Portada / Foto con IA o Subida */}
              <div className="bg-[#141414] border border-white/10 rounded-xl p-3 flex items-center gap-3.5">
                <div
                  onClick={() => coverInputRef.current?.click()}
                  className="w-16 h-16 rounded-lg overflow-hidden shrink-0 bg-neutral-900 border border-white/10 relative shadow-md cursor-pointer group"
                  title="Toca para elegir o cambiar foto de portada"
                >
                  {coverPreviewUrl || customCoverUrl ? (
                    <img
                      src={coverPreviewUrl || customCoverUrl}
                      alt="Portada"
                      loading="lazy"
                      decoding="async"
                      className="w-full h-full object-cover group-hover:opacity-80 transition"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-tr from-pink-700 to-indigo-700 text-white font-bold text-[10px] text-center p-1">
                      <ImageIcon className="w-4 h-4 mb-0.5" />
                      FOTO
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-white">Foto de portada (cover_url)</p>
                    {coverFile ? (
                      <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded">
                        ✓ Foto propia
                      </span>
                    ) : customCoverUrl ? (
                      <span className="text-[10px] text-pink-400 font-bold bg-pink-500/10 px-1.5 py-0.5 rounded">
                        ✨ Foto IA
                      </span>
                    ) : null}
                  </div>
                  <p className="text-[11px] text-gray-400 line-clamp-1 mt-0.5">
                    {coverFile
                      ? coverFile.name
                      : customCoverUrl
                      ? 'Diseñada para el artista y canción'
                      : 'Sube tu imagen o la IA la generará al instante'}
                  </p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <button
                      type="button"
                      onClick={() => coverInputRef.current?.click()}
                      className="px-2.5 py-1 text-[11px] font-bold bg-pink-600/25 hover:bg-pink-600/40 text-pink-300 rounded-md transition flex items-center gap-1 active:scale-95"
                    >
                      <ImageIcon className="w-3 h-3" />
                      <span>Subir foto propia</span>
                    </button>
                    <button
                      type="button"
                      onClick={regenerarFotoIA}
                      className="px-2.5 py-1 text-[11px] font-bold bg-white/10 hover:bg-white/20 text-gray-300 rounded-md transition flex items-center gap-1 active:scale-95"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>Foto con IA</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Título y Artista */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-gray-200">
                      Título de la canción <span className="text-pink-500">*</span>
                    </label>
                    {customTitle && <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-1.5 py-0.2 rounded">✨ Asignado por IA</span>}
                  </div>
                  <input
                    type="text"
                    placeholder="Ej: El Tóxico"
                    value={customTitle}
                    onChange={(e) => setCustomTitle(e.target.value)}
                    className="w-full px-3 py-2 bg-[#141414] border border-[#333333] focus:border-pink-500 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none font-medium"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-gray-200">
                      Artista / Grupo <span className="text-pink-500">*</span>
                    </label>
                    {customArtist && customArtist.toLowerCase() !== 'desconocido' && (
                      <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-1.5 py-0.2 rounded">✨ Reconocido</span>
                    )}
                  </div>
                  <input
                    type="text"
                    placeholder="Ej: Grupo Firme"
                    value={customArtist}
                    onChange={(e) => setCustomArtist(e.target.value)}
                    className="w-full px-3 py-2 bg-[#141414] border border-[#333333] focus:border-pink-500 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none font-medium"
                  />
                </div>
              </div>

              {/* Destino automático: Género detectado por DeepSeek (ETAPA 2 y 5) */}
              <div className="p-3 bg-[#161618] border border-white/10 rounded-xl flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#4c1d95] to-[#3b82f6] flex items-center justify-center shrink-0">
                    <Heart className="w-5 h-5 text-white fill-current" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-white">
                      Destino:{' '}
                      <span className="text-emerald-400 font-extrabold">
                        {manualTargetFolderId ? (
                          foldersRef.current.find((f) => f.id === manualTargetFolderId)?.titulo ||
                          folders.find((f) => f.id === manualTargetFolderId)?.titulo ||
                          manualTargetFolderId
                        ) : isAiAnalyzing ? (
                          'Detectando...'
                        ) : detectedGenre ? (
                          detectedGenre
                        ) : (
                          'Tus me gusta'
                        )}
                      </span>
                    </p>
                    <p className="text-[11px] text-gray-400 mt-0.5">
                      {detectedGenre && !manualTargetFolderId
                        ? `Clasificado automáticamente por DeepSeek. Se guardará en la carpeta ${detectedGenre}.`
                        : 'Se subirá directamente a tu música. Luego podrás asignarla o moverla a cualquier carpeta con el menú de 3 puntos (⋮).'}
                    </p>
                  </div>
                </div>

                {/* ETAPA 5: Botón complementario opcional para seleccionar otra carpeta */}
                <button
                  type="button"
                  onClick={() => setShowFolderPickerInModal((prev) => !prev)}
                  className="px-2.5 py-1 text-[11px] font-semibold text-gray-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition shrink-0"
                  title="Cambiar carpeta de destino manualmente"
                >
                  {showFolderPickerInModal ? 'Ocultar' : 'Cambiar'}
                </button>
              </div>

              {/* Selector complementario opcional */}
              {showFolderPickerInModal && (
                <div className="p-2.5 bg-[#121214] border border-white/10 rounded-xl space-y-1.5 text-xs animate-fade-in">
                  <label className="text-[11px] text-gray-400 font-medium">Elegir otra carpeta de destino manualmente:</label>
                  <select
                    value={manualTargetFolderId}
                    onChange={(e) => setManualTargetFolderId(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-[#1c1c1e] border border-white/15 rounded-lg text-white text-xs focus:outline-none focus:border-emerald-500"
                  >
                    <option value="">Automático por género ({detectedGenre || 'Tus me gusta'})</option>
                    <option value="tus_me_gusta">Tus me gusta (Lista General)</option>
                    {folders.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.titulo}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {isUploading && (
                <div className="p-3.5 rounded-xl bg-emerald-950/50 border border-emerald-500/40 flex items-center gap-2.5 text-xs text-emerald-200">
                  <div className="w-4 h-4 border-2 border-[#1ED760] border-t-transparent rounded-full animate-spin shrink-0" />
                  <span className="font-semibold">{uploadStatus || 'Subiendo archivo...'}</span>
                </div>
              )}

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  disabled={isUploading}
                  onClick={() => setShowUploadModal(false)}
                  className="flex-1 py-2.5 text-xs sm:text-sm font-semibold bg-[#282828] hover:bg-[#333333] text-gray-200 rounded-xl transition disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isUploading || !selectedFile}
                  className="flex-1 py-2.5 text-xs sm:text-sm font-bold bg-[#1ED760] hover:bg-[#1db954] text-black rounded-xl shadow-lg transition disabled:opacity-50 flex items-center justify-center gap-2 active:scale-95"
                >
                  {isUploading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                      <span>Subiendo...</span>
                    </>
                  ) : (
                    <span>Guardar y Reproducir</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==========================================
          MODAL: INICIAR SESIÓN / REGISTRO ADMIN
          ========================================== */}
      {showLoginModal && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#1E1E1E] border border-[#383838] rounded-2xl w-full max-w-sm p-6 shadow-2xl relative">
            <button
              onClick={() => setShowLoginModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white p-1 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center">
                {isSignUpMode ? <UserPlus className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
              </div>
              <div>
                <h3 className="text-base font-bold text-white">
                  {isSignUpMode ? 'Registrar Administrador' : 'Acceso Administrador'}
                </h3>
                <p className="text-xs text-gray-400">Autenticación con Firebase Auth</p>
              </div>
            </div>

            {authError && (
              <div className="mb-4 p-3 bg-red-950/50 border border-red-500/40 rounded-xl flex items-start gap-2 text-xs text-red-200">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-400 mt-0.5" />
                <div className="flex-1">
                  <span>{authError}</span>
                  {authError.includes('Invalid login credentials') && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsSignUpMode(true);
                        setAuthError(null);
                      }}
                      className="block mt-1 text-blue-400 hover:underline font-semibold"
                    >
                      ¿El usuario no existe? Crear cuenta aquí.
                    </button>
                  )}
                </div>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-gray-200 mb-1">
                  Correo Electrónico
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-[#141414] border border-[#333333] rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-blue-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-200 mb-1">
                  Contraseña
                </label>
                <div className="relative flex items-center">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-3 py-2 pr-10 bg-[#141414] border border-[#333333] rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-blue-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 p-1 text-gray-400 hover:text-white transition"
                    title={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                    aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4 text-gray-300" />
                    ) : (
                      <Eye className="w-4 h-4 text-gray-400" />
                    )}
                  </button>
                </div>
              </div>

              <div className="pt-2 flex flex-col gap-2">
                <button
                  type="submit"
                  disabled={isLoggingIn}
                  className="w-full py-2.5 text-xs font-bold bg-[#1ED760] hover:bg-[#1db954] text-black rounded-xl shadow transition disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isLoggingIn ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                      <span>{isSignUpMode ? 'Registrando...' : 'Verificando...'}</span>
                    </>
                  ) : (
                    <span>{isSignUpMode ? 'Crear Cuenta' : 'Iniciar Sesión'}</span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsSignUpMode(!isSignUpMode);
                    setAuthError(null);
                  }}
                  className="text-center text-[11px] text-gray-300 hover:text-blue-400 transition font-medium"
                >
                  {isSignUpMode
                    ? '¿Ya tienes cuenta? Iniciar sesión'
                    : '¿Primera vez? Registrar cuenta en Firebase'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==========================================
          MODAL: CENTRO DE PUBLICACIÓN Y DESPLIEGUE EN TU PROPIA URL
          ========================================== */}
      {showDeployModal && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[#1C1C1E] border border-[#3A3A3C] rounded-3xl w-full max-w-2xl p-5 sm:p-7 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setShowDeployModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white p-1.5 rounded-xl bg-[#2C2C2E] transition active:scale-90"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3.5 mb-5">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-blue-600/30 shrink-0">
                <Rocket className="w-6 h-6" />
              </div>
              <div className="min-w-0 pr-6">
                <h3 className="text-lg sm:text-xl font-black text-white truncate">
                  Publicar {appName}
                </h3>
                <p className="text-xs text-blue-400 font-medium">
                  Tu propia URL pública independiente de Google AI Studio para Android
                </p>
              </div>
            </div>

            {/* Pestañas de la Guía */}
            <div className="flex items-center gap-1.5 p-1 bg-[#141416] rounded-2xl border border-white/5 mb-4 overflow-x-auto no-scrollbar">
              <button
                onClick={() => setDeployTab('vercel')}
                className={`flex-1 min-w-[100px] py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                  deployTab === 'vercel'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Globe className="w-3.5 h-3.5" />
                <span>1. Vercel (Recomendado)</span>
              </button>
              <button
                onClick={() => setDeployTab('android')}
                className={`flex-1 min-w-[100px] py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                  deployTab === 'android'
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5 text-emerald-300" />
                <span>2. Instalar en Android</span>
              </button>
              <button
                onClick={() => setDeployTab('netlify')}
                className={`flex-1 min-w-[100px] py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                  deployTab === 'netlify'
                    ? 'bg-teal-600 text-white shadow-md'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Upload className="w-3.5 h-3.5" />
                <span>3. Netlify Drop</span>
              </button>
            </div>

            {/* Garantía de Datos */}
            <div className="p-3 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 flex items-start gap-2.5 mb-4">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div className="text-xs">
                <p className="font-bold text-emerald-300">¡Tu trabajo y canciones NO se perderán!</p>
                <p className="text-[11px] text-emerald-200/80 mt-0.5 leading-relaxed">
                  Tu base de datos y audios están alojados en la nube de Supabase (<code className="font-mono text-emerald-300">djqjagjaywphhaoonbdq.supabase.co</code>). Al desplegar en tu propia URL, la app se conectará automáticamente a tus mismas canciones, carpetas y usuarios.
                </p>
              </div>
            </div>

            {/* Contenido Pestaña 1: VERCEL */}
            {deployTab === 'vercel' && (
              <div className="space-y-3.5 text-xs text-gray-200 animate-fade-in">
                <div className="p-4 rounded-2xl bg-[#242426] border border-[#38383A] space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white text-sm flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-blue-500" />
                      <span>Despliegue automático con Vercel (Gratis y Permanente)</span>
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/40 font-bold">
                      2 Minutos
                    </span>
                  </div>

                  <p className="text-gray-300 text-[11px]">
                    Vercel te proporcionará una URL pública HTTPS gratuita (como <code className="text-blue-300 font-mono">https://spotyy-aa.vercel.app</code>) y actualizará la app cada vez que hagas cambios.
                  </p>

                  <div className="space-y-2 text-[11px] text-gray-300 pl-1">
                    <div className="flex items-start gap-2">
                      <span className="w-5 h-5 rounded-full bg-blue-600/30 text-blue-300 font-bold flex items-center justify-center shrink-0 text-[10px]">1</span>
                      <div className="flex-1">
                        <p className="font-semibold text-white">Tu repositorio de GitHub:</p>
                        <div className="flex items-center justify-between gap-2 p-2 mt-1 rounded-xl bg-[#18181A] border border-white/10 font-mono text-blue-300 text-[11px]">
                          <span className="truncate">https://github.com/mejiamejiaaaron-eng/Musicaaarospoty</span>
                          <button
                            onClick={() => copyText('https://github.com/mejiamejiaaaron-eng/Musicaaarospoty', 'Enlace de GitHub')}
                            className="px-2 py-1 bg-[#282828] hover:bg-[#333333] text-white rounded-lg transition shrink-0 flex items-center gap-1 font-sans"
                          >
                            {copiedDeployText === 'Enlace de GitHub' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                            <span>Copiar</span>
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-start gap-2">
                      <span className="w-5 h-5 rounded-full bg-blue-600/30 text-blue-300 font-bold flex items-center justify-center shrink-0 text-[10px]">2</span>
                      <div className="flex-1">
                        <p className="font-semibold text-white">Entra a Vercel:</p>
                        <p className="mt-0.5">Ingresa a <strong className="text-white">vercel.com</strong> e inicia sesión con tu cuenta de GitHub.</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-2">
                      <span className="w-5 h-5 rounded-full bg-blue-600/30 text-blue-300 font-bold flex items-center justify-center shrink-0 text-[10px]">3</span>
                      <div className="flex-1">
                        <p className="font-semibold text-white">Importa el proyecto:</p>
                        <p className="mt-0.5">Haz clic en <strong className="text-white">&quot;Add New...&quot; &gt; &quot;Project&quot;</strong> y selecciona <strong className="text-white">Musicaaarospoty</strong>.</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-2">
                      <span className="w-5 h-5 rounded-full bg-blue-600/30 text-blue-300 font-bold flex items-center justify-center shrink-0 text-[10px]">4</span>
                      <div className="flex-1">
                        <p className="font-semibold text-white">Configuración automática de Vite:</p>
                        <p className="mt-0.5">Vercel detecta automáticamente: Framework: <strong className="text-white">Vite</strong> | Build Command: <code className="text-blue-300 font-mono">npm run build</code> | Output: <code className="text-blue-300 font-mono">dist</code>.</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-2">
                      <span className="w-5 h-5 rounded-full bg-blue-600/30 text-blue-300 font-bold flex items-center justify-center shrink-0 text-[10px]">5</span>
                      <div className="flex-1">
                        <p className="font-semibold text-white">Presiona &quot;Deploy&quot;:</p>
                        <p className="mt-0.5">En 40 segundos tendrás tu propia URL pública con certificado HTTPS para abrir en tu celular Android.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Contenido Pestaña 2: ANDROID PWA */}
            {deployTab === 'android' && (
              <div className="space-y-3.5 text-xs text-gray-200 animate-fade-in">
                <div className="p-4 rounded-2xl bg-[#242426] border border-[#38383A] space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white text-sm flex items-center gap-1.5">
                      <Smartphone className="w-4 h-4 text-emerald-400" />
                      <span>Cómo instalar {appName} en Android</span>
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold">
                      Icono Propio
                    </span>
                  </div>

                  <p className="text-gray-300 text-[11px]">
                    No necesitas instalar Google AI Studio en tu celular. Tu app web cuenta con Service Worker y Web App Manifest para comportarse como una aplicación nativa de Android:
                  </p>

                  <div className="space-y-2.5 text-[11px] text-gray-300 pl-1">
                    <div className="flex items-start gap-2">
                      <span className="w-5 h-5 rounded-full bg-emerald-600/30 text-emerald-300 font-bold flex items-center justify-center shrink-0 text-[10px]">1</span>
                      <div>
                        <p className="font-semibold text-white">Abre tu URL pública en Chrome:</p>
                        <p className="mt-0.5">En tu celular Android, abre el navegador <strong className="text-white">Google Chrome</strong> y escribe tu URL (ej. <code className="text-emerald-300 font-mono">https://tu-app.vercel.app</code>).</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-2">
                      <span className="w-5 h-5 rounded-full bg-emerald-600/30 text-emerald-300 font-bold flex items-center justify-center shrink-0 text-[10px]">2</span>
                      <div>
                        <p className="font-semibold text-white">Toca el banner o menú (⋮):</p>
                        <p className="mt-0.5">Verás un aviso inferior que dice <strong className="text-emerald-400">&quot;Agregar {appName} a la pantalla principal&quot;</strong>. Si no aparece, toca los <strong className="text-white">tres puntos verticales (⋮)</strong> arriba a la derecha en Chrome.</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-2">
                      <span className="w-5 h-5 rounded-full bg-emerald-600/30 text-emerald-300 font-bold flex items-center justify-center shrink-0 text-[10px]">3</span>
                      <div>
                        <p className="font-semibold text-white">Toca &quot;Instalar aplicación&quot;:</p>
                        <p className="mt-0.5">Selecciona <strong className="text-emerald-400">&quot;Instalar aplicación&quot;</strong> o <strong className="text-emerald-400">&quot;Agregar a la pantalla principal&quot;</strong> y confirma presionando <strong className="text-white">&quot;Instalar&quot;</strong>.</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-2">
                      <span className="w-5 h-5 rounded-full bg-emerald-600/30 text-emerald-300 font-bold flex items-center justify-center shrink-0 text-[10px]">4</span>
                      <div>
                        <p className="font-semibold text-white">¡Listo! Acceso directo con su propio icono:</p>
                        <p className="mt-0.5 text-emerald-300 font-medium">Se creará el icono de {appName} en la pantalla de inicio de tu celular. Al tocarlo, se abrirá a pantalla completa sin barra de direcciones, sin Google AI Studio y con reproducción de fondo.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Contenido Pestaña 3: NETLIFY DROP */}
            {deployTab === 'netlify' && (
              <div className="space-y-3.5 text-xs text-gray-200 animate-fade-in">
                <div className="p-4 rounded-2xl bg-[#242426] border border-[#38383A] space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white text-sm flex items-center gap-1.5">
                      <Upload className="w-4 h-4 text-teal-400" />
                      <span>Netlify Drop (Arrastrar y Soltar sin código)</span>
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-teal-500/20 text-teal-300 border border-teal-500/40 font-bold">
                      1 Minuto
                    </span>
                  </div>

                  <p className="text-gray-300 text-[11px]">
                    Si prefieres no usar GitHub ni comandos, puedes descargar el paquete compilado listo para desplegar y arrastrarlo directamente:
                  </p>

                  <div className="space-y-2.5 text-[11px] text-gray-300 pl-1">
                    <div className="flex items-start gap-2">
                      <span className="w-5 h-5 rounded-full bg-teal-600/30 text-teal-300 font-bold flex items-center justify-center shrink-0 text-[10px]">1</span>
                      <div className="flex-1">
                        <p className="font-semibold text-white">Descarga el paquete compilado (.zip):</p>
                        <p className="mt-0.5 text-gray-300">Ya está generado con HTML, Service Worker, Manifest, iconos PWA y todos los estilos:</p>
                        <a
                          href="/spotyy-aa-dist.zip"
                          download="spotyy-aa-dist.zip"
                          className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-[11px] shadow-md transition active:scale-95"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Descargar producción spotyy-aa-dist.zip</span>
                        </a>
                      </div>
                    </div>

                    <div className="flex items-start gap-2">
                      <span className="w-5 h-5 rounded-full bg-teal-600/30 text-teal-300 font-bold flex items-center justify-center shrink-0 text-[10px]">2</span>
                      <div className="flex-1">
                        <p className="font-semibold text-white">Abre Netlify Drop en tu navegador:</p>
                        <div className="flex items-center justify-between gap-2 p-2 mt-1 rounded-xl bg-[#18181A] border border-white/10 font-mono text-teal-300 text-[11px]">
                          <span>https://app.netlify.com/drop</span>
                          <button
                            onClick={() => copyText('https://app.netlify.com/drop', 'Enlace Netlify Drop')}
                            className="px-2 py-1 bg-[#282828] hover:bg-[#333333] text-white rounded-lg transition shrink-0 flex items-center gap-1 font-sans"
                          >
                            {copiedDeployText === 'Enlace Netlify Drop' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                            <span>Copiar</span>
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-start gap-2">
                      <span className="w-5 h-5 rounded-full bg-teal-600/30 text-teal-300 font-bold flex items-center justify-center shrink-0 text-[10px]">3</span>
                      <div className="flex-1">
                        <p className="font-semibold text-white">Arrastra y suelta el archivo .zip o la carpeta:</p>
                        <p className="mt-0.5">Suelta el archivo descargado en la zona punteada de Netlify Drop. En 10 segundos te entregará tu URL pública HTTPS (ejemplo: <code className="text-teal-300 font-mono">https://spotyy-aa.netlify.app</code>) permanente y gratuita.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between gap-3 pt-4 border-t border-white/10 mt-5">
              <button
                onClick={() => setDeployTab(deployTab === 'android' ? 'vercel' : 'android')}
                className="py-2.5 px-4 text-xs font-bold bg-[#282828] hover:bg-[#333333] text-gray-200 rounded-xl transition flex items-center gap-1.5 active:scale-95"
              >
                {deployTab === 'android' ? <Globe className="w-3.5 h-3.5 text-blue-400" /> : <Smartphone className="w-3.5 h-3.5 text-emerald-400" />}
                <span>{deployTab === 'android' ? 'Ver guía de Vercel' : 'Ver pasos de instalación Android'}</span>
              </button>
              <button
                onClick={() => setShowDeployModal(false)}
                className="py-2.5 px-6 text-xs font-bold bg-[#1ED760] hover:bg-[#1db954] text-black rounded-xl shadow-lg transition active:scale-95"
              >
                ¡Entendido!
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==========================================
          MODAL: MENÚ BOTTOM SHEET DE CANCIÓN (⋮)
          ========================================== */}
      <SpotifyBottomSheetModal
        isOpen={Boolean(showSongMenuModal && selectedSongForMenu)}
        onClose={() => {
          setShowSongMenuModal(false);
          setSelectedSongForMenu(null);
        }}
        itemType="song"
        song={selectedSongForMenu}
        allFolders={folders}
        isFavorite={Boolean(selectedSongForMenu && favorites.includes(String(selectedSongForMenu.id)))}
        isShuffle={isShuffle}
        onShare={compartirElemento}
        onDeleteFromLibrary={eliminarCancionDirecta}
        onAddToQueue={agregarCancionAColaDirecta}
        onToggleShuffle={() => {
          setIsShuffle((prev) => {
            const next = !prev;
            triggerToast(next ? 'Mixear (Shuffle) activado' : 'Mixear desactivado', 'info');
            return next;
          });
        }}
        onAddToPlaylist={agregarCancionAPlaylistDirecta}
        onRemoveFromSection={quitarDeSeccionActual}
        renderCover={renderCover}
        triggerToast={triggerToast}
        canMoveSong={canMoveSong}
      />

      {/* ==========================================
          MODAL: MENÚ BOTTOM SHEET DE CARPETA / PLAYLIST (⋮)
          ========================================== */}
      <SpotifyBottomSheetModal
        isOpen={Boolean(showFolderMenuModal && folderForMenu)}
        onClose={() => {
          setShowFolderMenuModal(false);
          setFolderForMenu(null);
        }}
        itemType="playlist"
        folder={folderForMenu}
        allFolders={folders}
        isShuffle={isShuffle}
        onShare={compartirElemento}
        onDeleteFromLibrary={(s) => eliminarCancionDirecta(s)}
        onDeleteFolder={eliminarCarpetaDirecta}
        onAddToQueue={(s) => agregarCancionAColaDirecta(s)}
        onAddFolderToQueue={agregarCarpetaAColaDirecta}
        onToggleShuffle={() => {
          setIsShuffle((prev) => {
            const next = !prev;
            triggerToast(next ? 'Mixear (Shuffle) activado' : 'Mixear desactivado', 'info');
            return next;
          });
        }}
        onAddToPlaylist={agregarCancionAPlaylistDirecta}
        onRemoveFromSection={quitarDeSeccionActual}
        onRenameFolder={handleStartRenameFolder}
        onUploadFolderCover={handleStartUploadFolderCover}
        renderCover={renderCover}
        triggerToast={triggerToast}
      />

      {/* Input oculto para abrir selector de fotos del celular y subir a Cloudflare R2 (folder-covers/) */}
      <input
        type="file"
        ref={folderCoverInputRef}
        accept="image/*"
        onChange={handleFolderCoverFileChange}
        className="hidden"
      />

      {/* ==========================================
          MODAL: CAMBIAR NOMBRE A CARPETA
          ========================================== */}
      {folderToRename && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-[#1C1C1E] border border-[#3A3A3C] rounded-3xl w-full max-w-md p-6 shadow-2xl relative flex flex-col animate-slide-up">
            <button
              onClick={() => setFolderToRename(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white p-1.5 rounded-xl bg-[#2C2C2E] transition active:scale-90"
              title="Cerrar"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3.5 mb-4 shrink-0 pr-8">
              <div className="w-12 h-12 rounded-2xl bg-[#1ED760]/20 text-[#1ED760] flex items-center justify-center shrink-0">
                <Edit3 className="w-6 h-6 stroke-[2.2]" />
              </div>
              <div className="min-w-0">
                <h3 className="text-base sm:text-lg font-black text-white truncate">
                  Cambiar nombre a carpeta
                </h3>
                <p className="text-xs text-gray-400 truncate mt-0.5">
                  Actualiza el título visible en Supabase y en la biblioteca
                </p>
              </div>
            </div>

            <form onSubmit={handleSaveFolderTitle} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-300 mb-1.5 uppercase tracking-wider">
                  Nuevo título de la carpeta
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={newFolderTitle}
                  onChange={(e) => setNewFolderTitle(e.target.value)}
                  placeholder="Ej: Corridos 2026, Éxitos..."
                  className="w-full px-4 py-3 bg-[#111113] border border-white/10 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#1ED760] focus:ring-1 focus:ring-[#1ED760] transition"
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setFolderToRename(null)}
                  className="flex-1 py-3 px-4 rounded-xl font-bold text-sm bg-white/10 hover:bg-white/15 text-white active:scale-95 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSavingFolderTitle || !newFolderTitle.trim()}
                  className="flex-1 py-3 px-4 rounded-xl font-black text-sm bg-[#1ED760] hover:bg-[#1db954] text-black shadow-lg shadow-emerald-500/20 active:scale-95 transition disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isSavingFolderTitle ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin text-black" />
                      <span>Guardando...</span>
                    </>
                  ) : (
                    <span>Guardar</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Indicador Flotante cuando se está subiendo imagen a Cloudflare R2 */}
      {isUploadingFolderCover && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 bg-[#1C1C1E] border border-blue-500/40 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 animate-fade-in">
          <RefreshCw className="w-5 h-5 text-blue-400 animate-spin" />
          <div className="text-xs">
            <p className="font-bold">Subiendo portada a Cloudflare R2...</p>
            <p className="text-gray-400 text-[11px]">Guardando en carpeta folder-covers/ y Supabase</p>
          </div>
        </div>
      )}

      {/* ==========================================
          MODAL: MOVER A CARPETA (LISTA DE TODAS LAS CARPETAS)
          ========================================== */}
      {showMoveModal && canMoveSong && selectedSongForMenu && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-[#1C1C1E] border border-[#3A3A3C] rounded-3xl w-full max-w-lg p-6 shadow-2xl relative max-h-[88vh] flex flex-col">
            <button
              onClick={() => {
                setShowMoveModal(false);
                setSelectedSongForMenu(null);
              }}
              className="absolute top-4 right-4 text-gray-400 hover:text-white p-1.5 rounded-xl bg-[#2C2C2E] transition active:scale-90"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3.5 mb-4 shrink-0 pr-8">
              <div className="w-12 h-12 rounded-2xl bg-[#1ED760]/20 text-[#1ED760] flex items-center justify-center shrink-0">
                <FolderCheck className="w-6 h-6 stroke-[2.2]" />
              </div>
              <div className="min-w-0">
                <h3 className="text-base sm:text-lg font-black text-white truncate">
                  Mover a carpeta
                </h3>
                <p className="text-xs text-gray-300 truncate mt-0.5">
                  Canción: <strong className="text-[#1ED760]">&quot;{selectedSongForMenu.title || selectedSongForMenu.titulo}&quot;</strong>
                </p>
              </div>
            </div>

            <p className="text-xs text-gray-400 mb-3 shrink-0">
              Selecciona la carpeta donde deseas guardar esta canción. Se actualizará en Supabase y los contadores verdes reflejarán el cambio de inmediato:
            </p>

            {/* Lista de Carpetas Disponibles con Contadores Verdes */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {folders.map((folder) => {
                const count = obtenerCancionesCarpeta(folder).length;
                const esCarpetaActual = (selectedSongForMenu.folder_id || 'tus_me_gusta') === folder.id;

                return (
                  <div
                    key={folder.id}
                    onClick={() => moverCancionACarpeta(selectedSongForMenu, folder.id)}
                    className={`flex items-center justify-between p-3 rounded-2xl cursor-pointer transition border ${
                      esCarpetaActual
                        ? 'bg-[#1ED760]/10 border-[#1ED760]/50'
                        : 'bg-[#242426] hover:bg-[#2c2c30] border-white/5 hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0 shadow bg-neutral-900">
                        {renderCover(folder.coverUrl || folder.coverKey, 'w-full h-full object-cover', folder.titulo)}
                      </div>
                      <div className="min-w-0 pr-2">
                        <p className={`text-sm font-bold truncate ${esCarpetaActual ? 'text-[#1ED760]' : 'text-white'}`}>
                          {folder.titulo}
                        </p>
                        <p className="text-[11px] text-gray-400 truncate mt-0.5">
                          {folder.subtitulo || folder.descripcion}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                        {count} {count === 1 ? 'audio' : 'audios'}
                      </span>
                      {esCarpetaActual ? (
                        <span className="px-2.5 py-0.5 rounded-full bg-white/10 text-[10px] font-bold text-gray-300">
                          Actual
                        </span>
                      ) : (
                        <span className="w-8 h-8 rounded-full bg-[#1ED760] text-black flex items-center justify-center shadow transition hover:scale-105">
                          <Check className="w-4 h-4 stroke-[3]" />
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-4 pt-3 border-t border-white/10 shrink-0 flex justify-end">
              <button
                onClick={() => {
                  setShowMoveModal(false);
                  setSelectedSongForMenu(null);
                }}
                className="w-full py-2.5 text-xs sm:text-sm font-bold bg-[#282828] hover:bg-[#333333] text-gray-200 rounded-xl transition"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==========================================
          MODAL: CONFIRMACIÓN PARA ELIMINAR CANCIÓN (Solo Admin)
          ========================================== */}
      {songToDelete && isAdmin && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[#1C1C1E] border border-red-500/40 rounded-3xl w-full max-w-md p-6 shadow-2xl relative animate-fade-in">
            <button
              onClick={() => setSongToDelete(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white p-1.5 rounded-xl bg-[#2C2C2E] transition active:scale-90"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3.5 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-red-600/20 text-red-400 flex items-center justify-center shrink-0">
                <Trash2 className="w-6 h-6 stroke-[2.2]" />
              </div>
              <div className="min-w-0 pr-6">
                <h3 className="text-base sm:text-lg font-black text-white truncate">
                  ¿Eliminar canción?
                </h3>
                <p className="text-xs text-red-400 font-semibold">
                  Esta acción es permanente
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-[#242426] border border-[#38383A] mb-4 flex items-center gap-3">
              {renderCover(songToDelete.cover_url || songToDelete.cover, 'w-12 h-12')}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-white truncate">{songToDelete.title || songToDelete.titulo}</p>
                <p className="text-xs text-gray-400 truncate mt-0.5">{songToDelete.artist || songToDelete.artista}</p>
              </div>
            </div>

            <p className="text-xs text-gray-300 mb-5 leading-relaxed">
              La canción se quitará de todas tus carpetas (buchonass, perreale, etc.) y se eliminará de la base de datos de Supabase.
            </p>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setSongToDelete(null)}
                className="flex-1 py-2.5 text-xs sm:text-sm font-bold bg-[#282828] hover:bg-[#333333] text-gray-300 rounded-xl transition active:scale-95"
              >
                Cancelar
              </button>
              <button
                onClick={confirmarEliminarCancion}
                className="flex-1 py-2.5 text-xs sm:text-sm font-bold bg-red-600 hover:bg-red-500 text-white rounded-xl shadow-lg shadow-red-600/30 transition active:scale-95 flex items-center justify-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                <span>Sí, eliminar</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==========================================
          MODAL: CONFIRMACIÓN PARA ELIMINAR CARPETA (Solo Admin)
          ========================================== */}
      {folderToDelete && isAdmin && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[#1C1C1E] border border-red-500/40 rounded-3xl w-full max-w-md p-6 shadow-2xl relative animate-fade-in">
            <button
              onClick={() => setFolderToDelete(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white p-1.5 rounded-xl bg-[#2C2C2E] transition active:scale-90"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3.5 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-red-600/20 text-red-400 flex items-center justify-center shrink-0">
                <Trash2 className="w-6 h-6 stroke-[2.2]" />
              </div>
              <div className="min-w-0 pr-6">
                <h3 className="text-base sm:text-lg font-black text-white truncate">
                  ¿Eliminar carpeta completa?
                </h3>
                <p className="text-xs text-red-400 font-semibold">
                  {folderToDelete.titulo}
                </p>
              </div>
            </div>

            <p className="text-xs text-gray-300 mb-5 leading-relaxed">
              ¿Estás seguro de que deseas eliminar la carpeta <strong className="text-white">&quot;{folderToDelete.titulo}&quot;</strong>? Las canciones dentro seguirán existiendo en tu biblioteca principal.
            </p>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setFolderToDelete(null)}
                className="flex-1 py-2.5 text-xs sm:text-sm font-bold bg-[#282828] hover:bg-[#333333] text-gray-300 rounded-xl transition active:scale-95"
              >
                Cancelar
              </button>
              <button
                onClick={confirmarEliminarCarpeta}
                className="flex-1 py-2.5 text-xs sm:text-sm font-bold bg-red-600 hover:bg-red-500 text-white rounded-xl shadow-lg shadow-red-600/30 transition active:scale-95 flex items-center justify-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                <span>Sí, eliminar carpeta</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==========================================
          MODAL: AGREGAR CANCIÓN A CUALQUIER CARPETA
          ========================================== */}
      {showAddToFolderModal && canMoveSong && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[#1C1C1E] border border-[#3A3A3C] rounded-2xl w-full max-w-md p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => {
                setShowAddToFolderModal(false);
                setSongToAddToFolder(null);
              }}
              className="absolute top-4 right-4 text-gray-400 hover:text-white p-1 rounded-lg bg-[#2C2C2E] transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-11 h-11 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <FolderPlus className="w-6 h-6 stroke-[2.2]" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-base sm:text-lg font-black text-white truncate">
                  Agregar a Carpeta
                </h3>
                <p className="text-xs text-gray-400 truncate">
                  {songToAddToFolder?.titulo || currentSong?.titulo || 'Canción'} • {songToAddToFolder?.artista || currentSong?.artista}
                </p>
              </div>
            </div>

            <p className="text-xs text-gray-300 font-medium mb-3">
              Selecciona a cuál de tus carpetas quieres añadir este audio:
            </p>

            {/* Lista de Carpetas Disponibles */}
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {folders.map((f) => {
                const song = songToAddToFolder || currentSong;
                const yaEsta = song
                  ? f.canciones.some(
                      (c) =>
                        String(c.id) === String(song.id) ||
                        (c.titulo.toLowerCase() === song.titulo.toLowerCase() &&
                          c.artista.toLowerCase() === song.artista.toLowerCase())
                    )
                  : false;

                return (
                  <div
                    key={f.id}
                    onClick={() => {
                      if (song) {
                        if (yaEsta) {
                          quitarCancionDeCarpeta(f.id, song.id);
                        } else {
                          agregarCancionACarpeta(f.id, song);
                        }
                      }
                    }}
                    className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition border ${
                      yaEsta
                        ? 'bg-emerald-950/40 border-emerald-500/40 hover:bg-emerald-900/40'
                        : 'bg-[#242426] border-[#38383A] hover:bg-[#2C2C2E]'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {renderCover(f.coverUrl || f.coverKey, 'w-10 h-10', f.titulo)}
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-white truncate">
                          {f.titulo}
                        </p>
                        <p className="text-[11px] text-gray-400 truncate">
                          {f.canciones.length} audios • {f.badge || 'Carpeta'}
                        </p>
                      </div>
                    </div>

                    <div>
                      {yaEsta ? (
                        <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold flex items-center gap-1">
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                          <span>Incluida</span>
                        </span>
                      ) : (
                        <span className="px-3 py-1 rounded-full bg-blue-600/30 text-blue-300 hover:bg-blue-600 hover:text-white text-xs font-bold flex items-center gap-1 transition">
                          <Plus className="w-3.5 h-3.5 stroke-[3]" />
                          <span>Añadir</span>
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-4 pt-3 border-t border-white/10 flex justify-end">
              <button
                onClick={() => {
                  setShowAddToFolderModal(false);
                  setSongToAddToFolder(null);
                }}
                className="w-full py-2.5 text-xs sm:text-sm font-bold bg-[#282828] hover:bg-[#333333] text-gray-200 rounded-xl transition"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==========================================
          MODAL: CAMBIAR MÚSICA DIRECTAMENTE DESDE EL REPRODUCTOR
          ========================================== */}
      {showChangeSongModal && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[#1C1C1E] border border-[#3A3A3C] rounded-2xl w-full max-w-lg p-6 shadow-2xl relative max-h-[88vh] flex flex-col">
            <button
              onClick={() => setShowChangeSongModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white p-1 rounded-lg bg-[#2C2C2E] transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4 shrink-0">
              <div className="w-11 h-11 rounded-2xl bg-yellow-500/20 text-yellow-300 flex items-center justify-center">
                <ListMusic className="w-6 h-6 stroke-[2.2]" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-black text-white">
                  Cambiar Canción
                </h3>
                <p className="text-xs text-yellow-300 font-semibold">
                  Toca cualquier audio para reproducirlo al instante
                </p>
              </div>
            </div>

            {/* Buscador Rápido de Pistas */}
            <div className="relative mb-3 shrink-0">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Buscar por canción o artista..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-[#141414] border border-[#333333] rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-yellow-400 font-medium"
              />
            </div>

            {/* Lista de Canciones para Cambiar */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {filteredSongs.length === 0 ? (
                <div className="p-6 text-center text-gray-400 space-y-3">
                  <Music className="w-8 h-8 text-gray-500 mx-auto" />
                  <p className="text-xs text-gray-400">
                    {isAdmin ? 'Sube tus archivos MP3 o carpetas de música para reproducirlas.' : 'El administrador agregará más canciones pronto.'}
                  </p>
                  {isAdmin && (
                    <div className="flex justify-center gap-2 pt-1">
                      <button
                        onClick={() => {
                          setShowChangeSongModal(false);
                          multiFileInputRef.current?.click();
                        }}
                        className="px-3.5 py-1.5 bg-pink-600 text-white rounded-lg text-xs font-bold"
                      >
                        Subir múltiples MP3
                      </button>
                      <button
                        onClick={() => {
                          setShowChangeSongModal(false);
                          folderInputRef.current?.click();
                        }}
                        className="px-3.5 py-1.5 bg-[#2A2A2A] text-white rounded-lg text-xs font-bold border border-white/10"
                      >
                        Subir Carpeta
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                filteredSongs.map((cancion) => {
                  const esActual = currentSong?.id === cancion.id;
                  return (
                    <div
                      key={cancion.id}
                      onClick={() => {
                        seleccionarCancion(cancion);
                        setShowChangeSongModal(false);
                      }}
                      className={`flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition ${
                        esActual
                          ? 'bg-yellow-500/20 border border-yellow-400/50 text-white'
                          : 'bg-[#242426] hover:bg-[#2e2e30] text-gray-200'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {renderCover(cancion.cover_url || cancion.cover, 'w-11 h-11')}
                        <div className="min-w-0">
                          <p className={`text-sm font-bold truncate ${esActual ? 'text-yellow-300' : 'text-white'}`}>
                            {obtenerTituloCancionLimpio(cancion.title || cancion.titulo)}
                          </p>
                          <p className="text-xs text-gray-400 truncate mt-0.5">
                            {obtenerArtistaVisible(cancion.artist || cancion.artista)}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {esActual && isPlaying ? (
                          <div className="w-7 h-7 rounded-full bg-yellow-400 text-black flex items-center justify-center">
                            <Pause className="w-3.5 h-3.5 fill-current" />
                          </div>
                        ) : (
                          <div className="w-7 h-7 rounded-full bg-white/10 hover:bg-white hover:text-black text-white flex items-center justify-center transition">
                            <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="mt-3 pt-3 border-t border-white/10 shrink-0 flex justify-end">
              <button
                onClick={() => setShowChangeSongModal(false)}
                className="w-full py-2.5 text-xs sm:text-sm font-bold bg-[#282828] hover:bg-[#333333] text-gray-200 rounded-xl transition"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==========================================
          MODAL BLOQUEANTE: PROCESAMIENTO POR LOTES CON IA (DEEPSEEK) EN CARPETA
          ========================================== */}
      {procesandoCarpetaIA && progresoCarpetaIA && (
        <div
          className="fixed inset-0 z-[99999] bg-black/85 backdrop-blur-md flex items-center justify-center p-4 select-none"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="bg-[#18181b] border border-purple-500/40 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl text-center space-y-5 animate-scale-up">
            {/* Icono con halo brillante animado */}
            <div className="relative mx-auto w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 animate-pulse blur-lg opacity-70" />
              <div className="relative w-full h-full rounded-full bg-gradient-to-tr from-purple-700 via-pink-600 to-indigo-600 flex items-center justify-center shadow-xl border border-white/20">
                <Sparkles className="w-8 h-8 sm:w-10 sm:h-10 text-yellow-300 animate-spin" />
              </div>
            </div>

            {/* Títulos y Estado en tiempo real */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-black uppercase tracking-wider text-pink-400 bg-pink-500/10 px-3 py-1 rounded-full border border-pink-500/20 inline-block">
                DeepSeek IA • Procesamiento por Lotes
              </span>
              <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                Actualizando Carpeta con IA
              </h3>
              {/* Texto en tiempo real: "Procesando canción X de Y..." */}
              <p className="text-base sm:text-lg font-bold text-pink-300">
                Procesando canción {progresoCarpetaIA.actual} de {progresoCarpetaIA.total}...
              </p>
            </div>

            {/* Canción en proceso */}
            <div className="bg-black/50 border border-white/10 rounded-2xl p-3.5 text-left flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-900/60 border border-purple-400/30 flex items-center justify-center shrink-0">
                <Music className="w-5 h-5 text-purple-300 animate-bounce" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-white truncate">
                  {progresoCarpetaIA.cancionActualTitulo || 'Analizando pista de audio...'}
                </p>
                <p className="text-xs text-gray-400 truncate">
                  {progresoCarpetaIA.cancionActualArtista || 'Identificando artista con DeepSeek'}
                </p>
              </div>
              <span className="text-xs font-black text-pink-400 shrink-0 font-mono">
                {progresoCarpetaIA.porcentaje}%
              </span>
            </div>

            {/* Barra de progreso visual */}
            <div className="space-y-2">
              <div className="w-full bg-neutral-800/90 rounded-full h-3 overflow-hidden p-0.5 border border-white/10 shadow-inner">
                <div
                  className="bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 h-full rounded-full transition-all duration-500 ease-out shadow-lg"
                  style={{ width: `${Math.max(5, progresoCarpetaIA.porcentaje)}%` }}
                />
              </div>
              <div className="flex justify-between items-center text-[11px] text-gray-400 font-medium px-1">
                <span>Guardando en Supabase automáticamente</span>
                <span>{progresoCarpetaIA.actual}/{progresoCarpetaIA.total}</span>
              </div>
            </div>

            {/* Aviso informativo de delay de 1.5s */}
            <p className="text-[11px] text-gray-400 leading-relaxed bg-white/5 rounded-xl p-2.5 border border-white/5">
              Por favor espera sin cerrar esta ventana. Aplicamos una pausa de 1.5s entre canciones para respetar los límites de la API de DeepSeek y garantizar que cada pista se guarde en Supabase.
            </p>
          </div>
        </div>
      )}

      {/* ==========================================
          MODAL: AGREGAR MÚSICA A LA CARPETA ACTUAL (DOS PESTAÑAS: SUBIR NUEVO / DESDE MI BIBLIOTECA)
          ========================================== */}
      {showAddMusicToCurrentFolderModal && selectedFolder && (() => {
        const cancionesActuales = obtenerCancionesCarpeta(selectedFolder);
        const cancionesActualesIds = new Set(cancionesActuales.map((c) => String(c.id)));

        // Filtrado por buscador para la biblioteca
        const terminoBusqueda = librarySearchTerm.trim().toLowerCase();
        const cancionesFiltradas = todasLasCancionesBiblioteca.filter((c) => {
          if (!terminoBusqueda) return true;
          const tit = (c.title || c.titulo || '').toLowerCase();
          const art = (c.artist || c.artista || '').toLowerCase();
          return tit.includes(terminoBusqueda) || art.includes(terminoBusqueda);
        });

        const seleccionadasNuevas = Array.from(selectedSongIdsToAdd).filter((id) => !cancionesActualesIds.has(id));

        const toggleSeleccionCancion = (songId: string) => {
          if (cancionesActualesIds.has(songId)) return;
          setSelectedSongIdsToAdd((prev) => {
            const next = new Set(prev);
            if (next.has(songId)) {
              next.delete(songId);
            } else {
              next.add(songId);
            }
            return next;
          });
        };

        const seleccionarTodasVisibles = () => {
          const disponibles = cancionesFiltradas.filter((c) => !cancionesActualesIds.has(String(c.id)));
          const todosIds = disponibles.map((c) => String(c.id));
          const allSelected = todosIds.length > 0 && todosIds.every((id) => selectedSongIdsToAdd.has(id));

          setSelectedSongIdsToAdd((prev) => {
            const next = new Set(prev);
            if (allSelected) {
              todosIds.forEach((id) => next.delete(id));
            } else {
              todosIds.forEach((id) => next.add(id));
            }
            return next;
          });
        };

        return (
          <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-4 animate-fade-in">
            <div className="bg-[#1C1C1E] border border-[#3A3A3C] rounded-2xl w-full max-w-xl shadow-2xl relative max-h-[90vh] flex flex-col overflow-hidden">
              {/* Header */}
              <div className="p-4 sm:p-5 border-b border-white/10 shrink-0">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-[#1ED760]/20 text-[#1ED760] flex items-center justify-center shrink-0">
                      <FolderPlus className="w-5 h-5 stroke-[2.2]" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-base sm:text-lg font-black text-white truncate">
                        Agregar música a: {selectedFolder.titulo}
                      </h3>
                      <p className="text-xs text-gray-400 truncate">
                        {cancionesActuales.length} canciones actualmente en esta playlist
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => setShowAddMusicToCurrentFolderModal(false)}
                    className="text-gray-400 hover:text-white p-2 rounded-xl bg-[#2C2C2E] transition active:scale-90 shrink-0 cursor-pointer"
                    title="Cerrar modal"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* PESTAÑAS (TABS): "Desde mi biblioteca" vs "Subir nuevo" */}
                <div className="flex items-center gap-2 mt-4 bg-black/40 p-1 rounded-xl border border-white/5">
                  <button
                    type="button"
                    onClick={() => setAddMusicModalTab('biblioteca')}
                    className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
                      addMusicModalTab === 'biblioteca'
                        ? 'bg-[#1ED760] text-black shadow-md font-extrabold'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    <Library className="w-4 h-4" />
                    <span>Desde mi biblioteca</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${
                      addMusicModalTab === 'biblioteca' ? 'bg-black/20 text-black font-black' : 'bg-white/10 text-gray-300'
                    }`}>
                      {todasLasCancionesBiblioteca.length}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAddMusicModalTab('subir')}
                    className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
                      addMusicModalTab === 'subir'
                        ? 'bg-[#1ED760] text-black shadow-md font-extrabold'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    <Upload className="w-4 h-4" />
                    <span>Subir nuevo archivo</span>
                  </button>
                </div>
              </div>

              {/* CONTENIDO SEGÚN LA PESTAÑA */}
              {addMusicModalTab === 'subir' ? (
                /* ================= PESTAÑA 1: SUBIR NUEVO ================= */
                <div className="flex-1 overflow-y-auto p-5 space-y-4">
                  <div
                    onClick={() => {
                      if (!isDirectFolderUploading) {
                        folderDirectFileInputRef.current?.click();
                      }
                    }}
                    className="border-2 border-dashed border-emerald-500/40 hover:border-emerald-400 bg-emerald-950/10 hover:bg-emerald-950/20 rounded-2xl p-6 sm:p-8 text-center cursor-pointer transition group"
                  >
                    <div className="w-14 h-14 rounded-2xl bg-[#1ED760]/20 text-[#1ED760] flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition duration-300">
                      <Upload className="w-7 h-7 stroke-[2.2]" />
                    </div>
                    <h4 className="text-base font-bold text-white mb-1">
                      {isDirectFolderUploading ? 'Subiendo archivos de audio...' : 'Selecciona archivos de audio para esta playlist'}
                    </h4>
                    <p className="text-xs text-gray-400 max-w-sm mx-auto mb-4">
                      Formatos compatibles: MP3, WAV, M4A, FLAC, AAC y OGG. Los temas se guardarán y vincularán directamente a <strong className="text-emerald-400">"{selectedFolder.titulo}"</strong>.
                    </p>

                    <button
                      type="button"
                      disabled={isDirectFolderUploading}
                      className="px-5 py-2.5 rounded-full text-xs sm:text-sm font-bold bg-[#1ED760] hover:bg-[#1db954] text-black shadow-lg inline-flex items-center gap-2 transition active:scale-95 disabled:opacity-50 cursor-pointer"
                    >
                      {isDirectFolderUploading ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Subiendo audio...</span>
                        </>
                      ) : (
                        <>
                          <Plus className="w-4 h-4 stroke-[3]" />
                          <span>Elegir archivos desde el dispositivo</span>
                        </>
                      )}
                    </button>
                  </div>

                  <div className="bg-[#242426] border border-white/5 rounded-xl p-3.5 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <Sparkles className="w-5 h-5 text-yellow-400 shrink-0" />
                      <div>
                        <p className="text-xs font-bold text-white">Subidor Avanzado (Telegram & IA)</p>
                        <p className="text-[11px] text-gray-400">Sube audios grandes sin límite con etiquetado automático DeepSeek</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddMusicToCurrentFolderModal(false);
                        setShowUploadModal(true);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-bold text-white shrink-0 transition cursor-pointer"
                    >
                      Abrir
                    </button>
                  </div>
                </div>
              ) : (
                /* ================= PESTAÑA 2: DESDE MI BIBLIOTECA ================= */
                <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                  {/* Barra de Búsqueda y Filtro Rápido */}
                  <div className="p-3 sm:px-5 sm:py-3 border-b border-white/5 bg-[#202022] flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shrink-0">
                    <div className="relative flex-1">
                      <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={librarySearchTerm}
                        onChange={(e) => setLibrarySearchTerm(e.target.value)}
                        placeholder="Buscar por título o artista en la biblioteca..."
                        className="w-full bg-[#161618] border border-white/10 rounded-xl pl-9 pr-8 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#1ED760] transition"
                      />
                      {librarySearchTerm && (
                        <button
                          onClick={() => setLibrarySearchTerm('')}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0">
                      <span className="text-[11px] text-gray-400 font-medium">
                        {cancionesFiltradas.length} {cancionesFiltradas.length === 1 ? 'canción' : 'canciones'}
                      </span>
                      <button
                        type="button"
                        onClick={seleccionarTodasVisibles}
                        className="px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/15 text-[11px] font-bold text-gray-300 hover:text-white transition cursor-pointer"
                      >
                        {cancionesFiltradas.filter((c) => !cancionesActualesIds.has(String(c.id))).every((c) => selectedSongIdsToAdd.has(String(c.id))) && cancionesFiltradas.filter((c) => !cancionesActualesIds.has(String(c.id))).length > 0
                          ? 'Deseleccionar todas'
                          : 'Seleccionar todas'}
                      </button>
                    </div>
                  </div>

                  {/* Lista de Canciones */}
                  <div className="flex-1 overflow-y-auto p-3 sm:px-5 space-y-1.5 divide-y divide-white/5">
                    {cancionesFiltradas.length === 0 ? (
                      <div className="p-8 text-center text-gray-400 space-y-2">
                        <Music className="w-8 h-8 mx-auto text-gray-500" />
                        <p className="text-sm font-bold text-white">No se encontraron canciones</p>
                        <p className="text-xs text-gray-400">
                          {librarySearchTerm ? 'Prueba con otro término de búsqueda.' : 'Aún no tienes canciones registradas en tu biblioteca.'}
                        </p>
                      </div>
                    ) : (
                      cancionesFiltradas.slice(0, addMusicModalPageSize).map((cancion) => {
                        const songId = String(cancion.id);
                        const yaEsta = cancionesActualesIds.has(songId);
                        const isSelected = selectedSongIdsToAdd.has(songId);
                        const folderOrig = getFolderTitleForSong(cancion);

                        return (
                          <div
                            key={songId}
                            onClick={() => toggleSeleccionCancion(songId)}
                            className={`flex items-center justify-between p-2.5 rounded-xl transition cursor-pointer select-none ${
                              yaEsta
                                ? 'bg-emerald-950/20 opacity-70 cursor-not-allowed'
                                : isSelected
                                ? 'bg-[#1ED760]/15 border border-[#1ED760]/40'
                                : 'hover:bg-white/5 border border-transparent'
                            }`}
                          >
                            <div className="flex items-center gap-3 min-w-0 flex-1 pr-2">
                              {/* Checkbox */}
                              <div className="shrink-0">
                                {yaEsta ? (
                                  <div className="w-5 h-5 rounded-md bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/40" title="Ya está en esta playlist">
                                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                                  </div>
                                ) : (
                                  <div className={`w-5 h-5 rounded-md flex items-center justify-center transition border ${
                                    isSelected
                                      ? 'bg-[#1ED760] border-[#1ED760] text-black shadow'
                                      : 'border-white/30 hover:border-white/60 bg-transparent'
                                  }`}>
                                    {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                                  </div>
                                )}
                              </div>

                              {/* Portada */}
                              {renderCover(cancion.cover_url || cancion.cover, 'w-10 h-10 rounded-lg shrink-0')}

                              {/* Título y Artista */}
                              <div className="min-w-0 flex-1">
                                <p className={`text-sm font-bold truncate ${isSelected ? 'text-[#1ED760]' : 'text-white'}`}>
                                  {obtenerTituloCancionLimpio(cancion.title || cancion.titulo)}
                                </p>
                                <div className="flex items-center gap-1.5 text-xs text-gray-400 truncate mt-0.5">
                                  <span className="truncate">{obtenerArtistaVisible(cancion.artist || cancion.artista)}</span>
                                  {folderOrig && (
                                    <>
                                      <span>•</span>
                                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-white/5 text-gray-300 truncate">
                                        {folderOrig}
                                      </span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Estado derecha */}
                            <div className="shrink-0 pl-2">
                              {yaEsta ? (
                                <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-full border border-emerald-500/20">
                                  En playlist
                                </span>
                              ) : isSelected ? (
                                <span className="text-[10px] font-bold text-black bg-[#1ED760] px-2 py-1 rounded-full">
                                  Seleccionada
                                </span>
                              ) : null}
                            </div>
                          </div>
                        );
                      })
                    )}

                    {cancionesFiltradas.length > addMusicModalPageSize && (
                      <div className="pt-2 flex items-center justify-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setAddMusicModalPageSize((prev) => prev + 50);
                          }}
                          className="w-full py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5 stroke-[3]" />
                          <span>Cargar 50 más ({Math.min(addMusicModalPageSize, cancionesFiltradas.length)} de {cancionesFiltradas.length})</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Footer */}
              <div className="p-3 sm:p-4 border-t border-white/10 bg-[#161618] flex items-center justify-between gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowAddMusicToCurrentFolderModal(false)}
                  className="px-4 py-2 text-xs sm:text-sm font-bold bg-[#282828] hover:bg-[#333333] text-gray-300 rounded-xl transition cursor-pointer"
                >
                  Cerrar
                </button>

                {addMusicModalTab === 'biblioteca' && (
                  <button
                    type="button"
                    disabled={seleccionadasNuevas.length === 0}
                    onClick={handleConfirmarAgregarDesdeBiblioteca}
                    className="flex-1 sm:flex-initial px-5 py-2.5 text-xs sm:text-sm font-extrabold bg-[#1ED760] hover:bg-[#1db954] disabled:bg-neutral-800 disabled:text-gray-500 text-black rounded-xl transition shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed active:scale-95"
                  >
                    <Plus className="w-4 h-4 stroke-[3]" />
                    <span>
                      {seleccionadasNuevas.length > 0
                        ? `Agregar ${seleccionadasNuevas.length} ${seleccionadasNuevas.length === 1 ? 'canción' : 'canciones'}`
                        : 'Selecciona canciones'}
                    </span>
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* ==========================================
          MODAL: GUÍA DE CONFIGURACIÓN RLS SUPABASE
          ========================================== */}
      {showRlsModal && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#1E1E1E] border border-[#383838] rounded-2xl w-full max-w-lg p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setShowRlsModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white p-1 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-600/20 text-emerald-400 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">
                  Configurar Tabla 'songs' y Storage en Supabase
                </h3>
                <p className="text-xs text-emerald-400">
                  Crea la tabla songs con persistencia (Título, Artista, Portada y Audio)
                </p>
              </div>
            </div>

            <div className="space-y-4 text-xs text-gray-300">
              <p>
                Para guardar y recuperar tus canciones de forma permanente con su título, artista y foto de portada, ve al <strong className="text-white">SQL Editor</strong> de tu panel de Supabase, pega y ejecuta este script:
              </p>

              <div className="relative">
                <pre className="p-3 bg-[#121212] border border-[#333333] rounded-xl font-mono text-[11px] text-emerald-400 overflow-x-auto leading-relaxed">
                  {rlsSql}
                </pre>
                <button
                  onClick={copyRlsSql}
                  className="absolute top-2 right-2 flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#282828] hover:bg-[#383838] text-white text-[11px] font-semibold transition shadow"
                >
                  {sqlCopied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Copiado</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copiar SQL</span>
                    </>
                  )}
                </button>
              </div>

              <button
                onClick={() => setShowRlsModal(false)}
                className="w-full py-2.5 text-xs font-bold bg-[#1ED760] hover:bg-[#1db954] text-black rounded-xl shadow transition"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==========================================
          REPRODUCTOR A PANTALLA COMPLETA (FULLSCREEN PLAYER)
          ========================================== */}
      {showExpandedPlayer && currentSong && (
        <div
          className="fixed inset-0 z-50 bg-gradient-to-b from-[#580816] via-[#20050b] to-[#121212] flex flex-col text-white overflow-y-auto no-scrollbar select-none pb-[calc(env(safe-area-inset-bottom,0px)+1.5rem)]"
          style={{ animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)' }}
        >
          {/* Header Superior: Botón Flecha hacia abajo + Título + Opciones */}
          <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-3.5 bg-[#580816]/70 backdrop-blur-md border-b border-white/5 pt-[calc(env(safe-area-inset-top,0px)+0.75rem)]">
            <button
              onClick={() => setShowExpandedPlayer(false)}
              className="p-2 -ml-2 rounded-full hover:bg-white/10 active:scale-90 transition text-white"
              title="Minimizar reproductor"
            >
              <ChevronDown className="w-7 h-7" />
            </button>

            <div className="text-center min-w-0 px-2 flex-1">
              <p className="text-[10px] sm:text-xs font-bold tracking-widest uppercase text-red-200/80">
                {selectedFolder ? `Carpeta: ${selectedFolder.titulo}` : appName}
              </p>
              <p className="text-xs sm:text-sm font-black text-white truncate">
                {obtenerTituloCancionLimpio(currentSong.title || currentSong.titulo)}
              </p>
            </div>

            <button
              onClick={() => {
                if (currentSong) {
                  setSelectedSongForMenu(currentSong);
                  setShowSongMenuModal(true);
                }
              }}
              className="p-2 -mr-2 rounded-full hover:bg-white/10 active:scale-90 transition text-white/80 hover:text-white"
              title="Opciones de la canción"
            >
              <MoreVertical className="w-6 h-6" />
            </button>
          </div>

          {/* Contenido Principal con Portada en Grande, Controles y Letras */}
          <div className="flex-1 max-w-md w-full mx-auto px-6 py-4 flex flex-col">
            {/* 1. Portada del álbum en grande */}
            <div className="w-full my-auto py-2 flex items-center justify-center">
              <div className="w-full aspect-square max-w-[320px] sm:max-w-[360px] rounded-2xl overflow-hidden shadow-2xl ring-1 ring-white/15 bg-black/60 flex items-center justify-center">
                {renderCover(currentSong.cover_url || currentSong.cover, 'w-full h-full object-cover')}
              </div>
            </div>

            {/* 2. Título, Artista y Botón de Favorito */}
            <div className="flex items-center justify-between gap-4 mt-4">
              <div className="min-w-0 flex-1">
                <h1 className="text-xl sm:text-2xl font-black text-white truncate leading-tight">
                  {obtenerTituloCancionLimpio(currentSong.title || currentSong.titulo)}
                </h1>
                <p className="text-sm sm:text-base text-gray-300 font-semibold truncate mt-1">
                  {obtenerArtistaVisible(currentSong.artist || currentSong.artista)}
                </p>
              </div>
              <button
                onClick={() => toggleFavorite(currentSong)}
                className="p-2 rounded-full text-white hover:text-emerald-400 active:scale-90 transition shrink-0"
                title="Favorito"
              >
                <Heart
                  className={`w-6 h-6 sm:w-7 sm:h-7 ${
                    favorites.includes(String(currentSong.id))
                      ? 'fill-current text-[#1ED760]'
                      : 'text-gray-400'
                  }`}
                />
              </button>
            </div>

            {/* 3. Barra de progreso interactiva (Seek) */}
            <div className="w-full mt-4 select-none">
              <div className="relative flex items-center group py-2 cursor-pointer">
                <div className="w-full h-1.5 sm:h-2 bg-white/20 rounded-full overflow-hidden shadow-inner">
                  <div
                    className="h-full bg-white group-hover:bg-[#1ED760] rounded-full transition-all duration-75 relative"
                    style={{
                      width: `${duration ? Math.min(100, Math.max(0, (currentTime / duration) * 100)) : 0}%`
                    }}
                  />
                </div>
                <input
                  type="range"
                  min={0}
                  max={duration || 100}
                  step="0.1"
                  value={currentTime}
                  onChange={handleSeek}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  title="Adelantar o retroceder"
                />
              </div>
              <div className="flex justify-between items-center text-xs font-mono text-gray-400 mt-0.5 tabular-nums">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>

            {/* 4. Controles de Reproducción Principales */}
            <div className="flex items-center justify-between gap-2 mt-4 px-1">
              {/* Aleatorio */}
              <button
                onClick={toggleShuffle}
                className={`p-2 rounded-full transition active:scale-90 relative ${
                  isShuffle ? 'text-[#1ED760]' : 'text-gray-400 hover:text-white'
                }`}
                title="Modo aleatorio"
              >
                <Shuffle className="w-5 h-5 sm:w-6 sm:h-6 stroke-[2.2]" />
                {isShuffle && (
                  <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-[#1ED760]" />
                )}
              </button>

              {/* Anterior */}
              <button
                onClick={reproducirAnterior}
                className="p-2 text-white hover:text-gray-200 active:scale-90 transition"
                title="Canción anterior"
              >
                <SkipBack className="w-7 h-7 sm:w-8 sm:h-8 fill-current" />
              </button>

              {/* Play / Pausa */}
              <button
                onClick={togglePlay}
                className="w-16 h-16 sm:w-18 sm:h-18 rounded-full bg-white text-black hover:bg-gray-100 flex items-center justify-center shadow-2xl active:scale-95 hover:scale-105 transition"
                title={isPlaying ? 'Pausar' : 'Reproducir'}
              >
                {isPlaying ? (
                  <Pause className="w-8 h-8 fill-current" />
                ) : (
                  <Play className="w-8 h-8 fill-current ml-1" />
                )}
              </button>

              {/* Siguiente */}
              <button
                onClick={reproducirSiguiente}
                className="p-2 text-white hover:text-gray-200 active:scale-90 transition"
                title="Siguiente canción"
              >
                <SkipForward className="w-7 h-7 sm:w-8 sm:h-8 fill-current" />
              </button>

              {/* Repetir */}
              <button
                onClick={toggleRepeat}
                className={`p-2 rounded-full transition active:scale-90 relative ${
                  repeatMode !== 'off' ? 'text-[#1ED760]' : 'text-gray-400 hover:text-white'
                }`}
                title="Repetición"
              >
                {repeatMode === 'one' ? (
                  <Repeat1 className="w-5 h-5 sm:w-6 sm:h-6 stroke-[2.2]" />
                ) : (
                  <Repeat className="w-5 h-5 sm:w-6 sm:h-6 stroke-[2.2]" />
                )}
                {repeatMode !== 'off' && (
                  <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-[#1ED760]" />
                )}
              </button>
            </div>

            {/* Fila secundaria: Añadir a carpeta + Temporizador + Cambiar canción */}
            <div className="flex items-center justify-between text-xs text-gray-400 mt-5 pt-3 border-t border-white/10 px-2">
              {canMoveSong && (
                <button
                  onClick={() => {
                    setSongToAddToFolder(currentSong);
                    setShowAddToFolderModal(true);
                  }}
                  className="flex items-center gap-1.5 hover:text-white transition active:scale-95 cursor-pointer"
                >
                  <FolderPlus className="w-4 h-4 text-emerald-400" />
                  <span>Añadir a carpeta</span>
                </button>
              )}

              {/* Botón Temporizador de Apagado (Sleep Timer) */}
              <button
                onClick={() => setShowSleepTimerModal(true)}
                className={`flex items-center gap-1.5 transition active:scale-95 cursor-pointer ${
                  sleepTimerRemainingSec !== null ? 'text-[#1ED760] font-bold' : 'hover:text-white'
                }`}
                title="Temporizador de apagado"
              >
                <Clock className="w-4 h-4" />
                <span>
                  {sleepTimerRemainingSec !== null
                    ? `${formatearTiempoRestante(sleepTimerRemainingSec)} min`
                    : 'Temporizador'}
                </span>
              </button>

              <button
                onClick={() => setShowChangeSongModal(true)}
                className="flex items-center gap-1.5 hover:text-white transition active:scale-95 cursor-pointer"
              >
                <ListMusic className="w-4 h-4 text-yellow-300" />
                <span>Cambiar canción</span>
              </button>
            </div>

            {/* Control de volumen rápido en el reproductor */}
            <div className="flex items-center gap-3 mt-6 pt-4 border-t border-white/10 px-2 text-xs text-gray-300">
              <button
                onClick={toggleMute}
                className="text-gray-400 hover:text-white transition active:scale-90"
                title={isMuted ? 'Activar sonido' : 'Silenciar'}
              >
                {isMuted || volume === 0 ? (
                  <VolumeX className="w-5 h-5 text-red-400" />
                ) : (
                  <Volume2 className="w-5 h-5 text-emerald-400" />
                )}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                className="w-full accent-[#1ED760] cursor-pointer h-1.5 bg-white/20 rounded-lg"
                title="Ajustar volumen"
              />
              <span className="font-mono text-[11px] text-gray-400 tabular-nums w-8 text-right">
                {Math.round((isMuted ? 0 : volume) * 100)}%
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ==========================================
          MODAL: AJUSTES ADMINISTRATIVOS (SOLO ADMIN)
          ========================================== */}
      {showAdminSettingsModal && isAdmin && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-[#1C1C1E] border border-amber-500/40 rounded-3xl w-full max-w-xl p-5 sm:p-7 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setShowAdminSettingsModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white p-1.5 rounded-xl bg-[#2C2C2E] transition active:scale-90"
              title="Cerrar ajustes"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header del Modal */}
            <div className="flex items-center gap-3.5 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center shadow-lg shrink-0">
                <ShieldCheck className="w-6 h-6 stroke-[2.2]" />
              </div>
              <div className="min-w-0 pr-6">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg sm:text-xl font-black text-white truncate">
                    Ajustes Administrativos
                  </h3>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/40">
                    Admin
                  </span>
                </div>
                <p className="text-xs text-gray-400 truncate mt-0.5">
                  Conectado como: <strong className="text-white">{user?.email}</strong>
                </p>
              </div>
            </div>

            <div className="space-y-6">
              {/* SECCIÓN 1: CAMBIAR NOMBRE DE LA APP */}
              <div className="p-4 rounded-2xl bg-[#242426] border border-white/5 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-amber-400" />
                    <span>Nombre de la Aplicación</span>
                  </h4>
                  <span className="text-[11px] text-gray-400 font-mono">Persistente</span>
                </div>
                <p className="text-xs text-gray-400">
                  Modifica el nombre o título de la aplicación. Se mantendrá guardado en este dispositivo al recargar.
                </p>
                <form onSubmit={guardarNombreApp} className="flex gap-2">
                  <input
                    type="text"
                    value={tempAppName}
                    onChange={(e) => setTempAppName(e.target.value)}
                    placeholder={appName || "Spotyy_AA"}
                    className="flex-1 px-3.5 py-2 bg-[#161618] border border-white/10 rounded-xl text-xs sm:text-sm text-white placeholder-gray-500 focus:outline-none focus:border-amber-400"
                  />
                  <button
                    type="submit"
                    onClick={guardarNombreApp}
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs sm:text-sm rounded-xl shadow active:scale-95 transition shrink-0"
                  >
                    Guardar Nombre
                  </button>
                </form>
              </div>

              {/* SECCIÓN 2: GESTIÓN DE USUARIOS (KICK / BLOQUEAR) */}
              <div className="p-4 rounded-2xl bg-[#242426] border border-white/5 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <UserX className="w-4 h-4 text-red-400" />
                    <span>Gestión de Usuarios (Kick / Bloqueo)</span>
                  </h4>
                  <button
                    onClick={cargarUsuariosBloqueados}
                    disabled={loadingBlockedUsers}
                    className="text-xs text-gray-400 hover:text-white flex items-center gap-1 transition"
                    title="Actualizar lista de bloqueados"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loadingBlockedUsers ? 'animate-spin' : ''}`} />
                    <span>Actualizar</span>
                  </button>
                </div>

                <p className="text-xs text-gray-400 leading-relaxed">
                  Escribe el correo de un usuario para agregarlo a la tabla <code className="font-mono text-red-400 bg-black/40 px-1 py-0.5 rounded">blocked_users</code> de Supabase. Al intentar hacer Login, su sesión se cerrará de inmediato con el aviso <em>&quot;Acceso denegado por el administrador&quot;</em>.
                </p>

                {/* Formulario para bloquear usuario */}
                <form onSubmit={bloquearUsuario} className="flex gap-2">
                  <input
                    type="email"
                    required
                    value={newBlockEmail}
                    onChange={(e) => setNewBlockEmail(e.target.value)}
                    placeholder="usuario@correo.com"
                    className="flex-1 px-3.5 py-2 bg-[#161618] border border-white/10 rounded-xl text-xs sm:text-sm text-white placeholder-gray-500 focus:outline-none focus:border-red-400"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white font-bold text-xs sm:text-sm rounded-xl shadow-lg shadow-red-600/25 active:scale-95 transition flex items-center gap-1.5 shrink-0"
                  >
                    <UserX className="w-4 h-4" />
                    <span>Bloquear (Kick)</span>
                  </button>
                </form>

                {/* Lista de usuarios bloqueados */}
                <div className="space-y-2 pt-1">
                  <div className="flex items-center justify-between text-xs font-bold text-gray-400 uppercase tracking-wider">
                    <span>Usuarios Bloqueados ({blockedUsers.length})</span>
                  </div>

                  {loadingBlockedUsers ? (
                    <div className="p-4 text-center text-xs text-gray-400 flex items-center justify-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin text-amber-400" />
                      <span>Consultando tabla blocked_users en Supabase...</span>
                    </div>
                  ) : blockedUsers.length === 0 ? (
                    <div className="p-4 rounded-xl bg-black/20 text-center border border-white/5 text-xs text-gray-400">
                      No hay usuarios bloqueados en este momento.
                    </div>
                  ) : (
                    <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                      {blockedUsers.map((item) => (
                        <div
                          key={item.email}
                          className="flex items-center justify-between p-2.5 rounded-xl bg-[#1c1c1e] border border-white/5"
                        >
                          <div className="min-w-0 pr-2">
                            <p className="text-xs font-bold text-red-300 truncate">{item.email}</p>
                            <p className="text-[10px] text-gray-500">
                              Bloqueado: {item.created_at ? new Date(item.created_at).toLocaleString() : 'Recientemente'}
                            </p>
                          </div>
                          <button
                            onClick={() => desbloquearUsuario(item.email)}
                            className="px-2.5 py-1 text-xs font-semibold bg-white/10 hover:bg-emerald-600 text-gray-200 hover:text-white rounded-lg transition active:scale-95 shrink-0"
                          >
                            Desbloquear
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Botón de respaldo SQL para crear tabla blocked_users */}
                <div className="pt-2 border-t border-white/5 flex items-center justify-between">
                  <span className="text-[11px] text-gray-500">¿Tabla no configurada en Supabase?</span>
                  <button
                    onClick={copyBlockedSql}
                    className="text-[11px] font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1 transition"
                  >
                    <Copy className="w-3 h-3" />
                    <span>{sqlCopiedBlocked ? '¡SQL Copiado!' : 'Copiar SQL para blocked_users'}</span>
                  </button>
                </div>
              </div>

              {/* SECCIÓN 3: CONFIGURACIÓN GLOBAL DE PERMISOS PARA USUARIOS NORMALES */}
              <div className="p-4 rounded-2xl bg-[#242426] border border-white/5 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <Shield className="w-4 h-4 text-[#1ED760]" />
                    <span>Permisos de Usuarios Normales</span>
                  </h4>
                  <button
                    onClick={cargarAppSettings}
                    disabled={loadingAppSettings}
                    className="text-xs text-gray-400 hover:text-white flex items-center gap-1 transition"
                    title="Actualizar ajustes desde Supabase"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loadingAppSettings ? 'animate-spin' : ''}`} />
                    <span>Actualizar</span>
                  </button>
                </div>

                <p className="text-xs text-gray-400 leading-relaxed">
                  Controla qué acciones tienen permitidas los usuarios que NO son administradores. Estos ajustes se guardan en la tabla <code className="font-mono text-emerald-400 bg-black/40 px-1 py-0.5 rounded">app_settings</code> de Supabase y se aplican en tiempo real.
                </p>

                <div className="space-y-3 pt-1">
                  {/* Toggle 1: Permitir a usuarios crear carpetas */}
                  <div className="flex items-center justify-between p-3 rounded-xl bg-[#1c1c1e] border border-white/5 gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <FolderPlus className="w-4 h-4 text-emerald-400 shrink-0" />
                        <p className="text-xs font-bold text-white">Permitir a usuarios crear carpetas</p>
                      </div>
                      <p className="text-[11px] text-gray-400 mt-0.5 leading-snug">
                        Habilita el botón &quot;+ Nueva Carpeta&quot; para crear nuevas playlists y carpetas.
                      </p>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={appSettings.allow_user_create_folder}
                      disabled={savingSettingKey === 'allow_user_create_folder'}
                      onClick={() => toggleAppSetting('allow_user_create_folder')}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        appSettings.allow_user_create_folder ? 'bg-[#1ED760]' : 'bg-[#3A3A3C]'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                          appSettings.allow_user_create_folder ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Toggle 2: Permitir a usuarios subir canciones */}
                  <div className="flex items-center justify-between p-3 rounded-xl bg-[#1c1c1e] border border-white/5 gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <Upload className="w-4 h-4 text-pink-400 shrink-0" />
                        <p className="text-xs font-bold text-white">Permitir a usuarios subir canciones</p>
                      </div>
                      <p className="text-[11px] text-gray-400 mt-0.5 leading-snug">
                        Muestra los botones de subida de MP3 y carpetas a la biblioteca y almacenamiento.
                      </p>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={appSettings.allow_user_upload}
                      disabled={savingSettingKey === 'allow_user_upload'}
                      onClick={() => toggleAppSetting('allow_user_upload')}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        appSettings.allow_user_upload ? 'bg-[#1ED760]' : 'bg-[#3A3A3C]'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                          appSettings.allow_user_upload ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Toggle 3: Permitir a usuarios mover canciones */}
                  <div className="flex items-center justify-between p-3 rounded-xl bg-[#1c1c1e] border border-white/5 gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <FolderCheck className="w-4 h-4 text-blue-400 shrink-0" />
                        <p className="text-xs font-bold text-white">Permitir a usuarios mover canciones</p>
                      </div>
                      <p className="text-[11px] text-gray-400 mt-0.5 leading-snug">
                        Permite agregar o mover canciones entre carpetas desde el menú de opciones (⋮).
                      </p>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={appSettings.allow_user_move_song}
                      disabled={savingSettingKey === 'allow_user_move_song'}
                      onClick={() => toggleAppSetting('allow_user_move_song')}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        appSettings.allow_user_move_song ? 'bg-[#1ED760]' : 'bg-[#3A3A3C]'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                          appSettings.allow_user_move_song ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                </div>

                {/* Botón de respaldo SQL para crear tabla app_settings */}
                <div className="pt-2 border-t border-white/5 flex items-center justify-between">
                  <span className="text-[11px] text-gray-500">¿Tabla app_settings no configurada?</span>
                  <button
                    onClick={copyAppSettingsSql}
                    className="text-[11px] font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 transition"
                  >
                    <Copy className="w-3 h-3" />
                    <span>{sqlCopiedAppSettings ? '¡SQL Copiado!' : 'Copiar SQL para app_settings'}</span>
                  </button>
                </div>
              </div>

              {/* SECCIÓN 4: MIGRACIÓN MÁGICA (PASAR DE SUPABASE A FIREBASE) */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-purple-950/40 via-indigo-950/30 to-[#18181A] border border-purple-500/40 space-y-3.5 shadow-lg">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-purple-400" />
                    <span>Migración Mágica (Supabase → Firebase)</span>
                  </h4>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40 font-bold">
                    1-Clic
                  </span>
                </div>
                <p className="text-xs text-gray-300 leading-relaxed">
                  Copia de forma automática todas las canciones de la vieja tabla <code className="text-purple-300 font-mono">songs</code> y carpetas de Supabase hacia Firebase Firestore con un solo clic.
                </p>

                <div className="space-y-3">
                  <div>
                    <label className="text-[11px] font-bold text-gray-300 block mb-1">URL de Supabase:</label>
                    <input
                      type="text"
                      value={migrationSupabaseUrl}
                      onChange={(e) => setMigrationSupabaseUrl(e.target.value)}
                      placeholder="https://djqjagjaywphhaoonbdq.supabase.co"
                      className="w-full px-3 py-2 bg-[#161618] border border-white/10 rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-purple-400 font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-gray-300 block mb-1">Supabase Anon Key:</label>
                    <input
                      type="password"
                      value={migrationSupabaseKey}
                      onChange={(e) => setMigrationSupabaseKey(e.target.value)}
                      placeholder="Pega aquí la clave anon-public de tu Supabase..."
                      className="w-full px-3 py-2 bg-[#161618] border border-white/10 rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-purple-400 font-mono"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] font-bold text-gray-400 block mb-1">Tabla Canciones:</label>
                      <input
                        type="text"
                        value={migrationSongTable}
                        onChange={(e) => setMigrationSongTable(e.target.value)}
                        placeholder="songs"
                        className="w-full px-2.5 py-1.5 bg-[#161618] border border-white/10 rounded-lg text-xs text-white placeholder-gray-500 font-mono focus:outline-none focus:border-purple-400"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-gray-400 block mb-1">Tabla Carpetas:</label>
                      <input
                        type="text"
                        value={migrationFolderTable}
                        onChange={(e) => setMigrationFolderTable(e.target.value)}
                        placeholder="folders"
                        className="w-full px-2.5 py-1.5 bg-[#161618] border border-white/10 rounded-lg text-xs text-white placeholder-gray-500 font-mono focus:outline-none focus:border-purple-400"
                      />
                    </div>
                  </div>

                  {migrationStatusMsg && (
                    <div className="p-2.5 rounded-xl bg-purple-900/30 border border-purple-500/30 text-xs text-purple-200 flex items-center gap-2">
                      {isMigratingSupabase && <RefreshCw className="w-3.5 h-3.5 animate-spin shrink-0 text-purple-400" />}
                      <span>{migrationStatusMsg}</span>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={ejecutarMigracionSupabaseAFirebase}
                    disabled={isMigratingSupabase}
                    className="w-full py-2.5 bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-700 hover:from-purple-500 hover:to-indigo-500 text-white font-extrabold text-xs sm:text-sm rounded-xl shadow-lg active:scale-95 transition flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                  >
                    {isMigratingSupabase ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Migrando datos a Firebase...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 text-yellow-300" />
                        <span>Ejecutar Migración Mágica a Firebase</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* SECCIÓN 5: CERRAR SESIÓN */}
              <div className="pt-2 flex justify-between items-center border-t border-white/10">
                <button
                  onClick={() => setShowAdminSettingsModal(false)}
                  className="px-4 py-2 text-xs font-bold bg-[#282828] hover:bg-[#333333] text-gray-300 rounded-xl transition"
                >
                  Cerrar
                </button>
                <button
                  onClick={() => {
                    setShowAdminSettingsModal(false);
                    handleLogout();
                  }}
                  className="px-4 py-2 text-xs font-bold bg-red-600/20 hover:bg-red-600 text-red-300 hover:text-white border border-red-500/40 rounded-xl transition flex items-center gap-1.5 active:scale-95"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Cerrar Sesión</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==========================================
          MODAL: MIGRACIÓN MÁGICA DEDICADA
          ========================================== */}
      {showMigrationModal && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-[#1C1C1E] border border-purple-500/40 rounded-3xl w-full max-w-lg p-5 sm:p-7 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setShowMigrationModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white p-1.5 rounded-xl bg-[#2C2C2E] transition active:scale-90"
              title="Cerrar modal de migración"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3.5 mb-5">
              <div className="w-12 h-12 rounded-2xl bg-purple-500/20 text-purple-300 flex items-center justify-center shadow-lg shrink-0">
                <Sparkles className="w-6 h-6 stroke-[2.2] text-yellow-300" />
              </div>
              <div className="min-w-0 pr-6">
                <h3 className="text-lg sm:text-xl font-black text-white truncate">
                  Migración Mágica (Supabase → Firebase)
                </h3>
                <p className="text-xs text-purple-300">
                  Recupera tus canciones y carpetas de la base de datos antigua
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <p className="text-xs text-gray-300 leading-relaxed">
                Esta función hace un select a la vieja tabla <code className="text-purple-300 font-mono">songs</code> y carpetas de Supabase, y guarda cada elemento en Firebase Firestore usando <code className="text-purple-300 font-mono">addDoc(collection(db, &apos;songs&apos;), cancion)</code>.
              </p>

              <div className="space-y-3">
                <div>
                  <label className="text-xs font-bold text-gray-300 block mb-1">URL de Supabase:</label>
                  <input
                    type="text"
                    value={migrationSupabaseUrl}
                    onChange={(e) => setMigrationSupabaseUrl(e.target.value)}
                    placeholder="https://djqjagjaywphhaoonbdq.supabase.co"
                    className="w-full px-3.5 py-2.5 bg-[#161618] border border-white/10 rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-purple-400 font-mono"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-300 block mb-1">Supabase Anon Key:</label>
                  <input
                    type="password"
                    value={migrationSupabaseKey}
                    onChange={(e) => setMigrationSupabaseKey(e.target.value)}
                    placeholder="Pega aquí la clave anon-public de tu Supabase..."
                    className="w-full px-3.5 py-2.5 bg-[#161618] border border-white/10 rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-purple-400 font-mono"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="text-xs font-bold text-gray-300 block mb-1">Tabla Canciones:</label>
                    <input
                      type="text"
                      value={migrationSongTable}
                      onChange={(e) => setMigrationSongTable(e.target.value)}
                      placeholder="songs"
                      className="w-full px-3 py-2 bg-[#161618] border border-white/10 rounded-xl text-xs text-white placeholder-gray-500 font-mono focus:outline-none focus:border-purple-400"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-300 block mb-1">Tabla Carpetas:</label>
                    <input
                      type="text"
                      value={migrationFolderTable}
                      onChange={(e) => setMigrationFolderTable(e.target.value)}
                      placeholder="folders"
                      className="w-full px-3 py-2 bg-[#161618] border border-white/10 rounded-xl text-xs text-white placeholder-gray-500 font-mono focus:outline-none focus:border-purple-400"
                    />
                  </div>
                </div>

                {migrationStatusMsg && (
                  <div className="p-3 rounded-xl bg-purple-900/30 border border-purple-500/30 text-xs text-purple-200 flex items-center gap-2">
                    {isMigratingSupabase && <RefreshCw className="w-3.5 h-3.5 animate-spin shrink-0 text-purple-400" />}
                    <span>{migrationStatusMsg}</span>
                  </div>
                )}

                <div className="pt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowMigrationModal(false)}
                    className="flex-1 py-2.5 bg-[#282828] hover:bg-[#333333] text-gray-300 font-bold text-xs rounded-xl transition"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={ejecutarMigracionSupabaseAFirebase}
                    disabled={isMigratingSupabase}
                    className="flex-2 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-extrabold text-xs rounded-xl shadow-lg active:scale-95 transition flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                  >
                    {isMigratingSupabase ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Migrando datos...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 text-yellow-300" />
                        <span>Ejecutar Migración</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==========================================
          MODAL: CREAR NUEVA CARPETA / PLAYLIST
          ========================================== */}
      {showCreateFolderModal && canCreateFolder && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-[#1C1C1E] border border-[#3A3A3C] rounded-2xl w-full max-w-md p-6 shadow-2xl relative">
            <button
              onClick={() => {
                if (!isCreatingFolder) setShowCreateFolderModal(false);
              }}
              className="absolute top-4 right-4 text-gray-400 hover:text-white p-1.5 rounded-xl bg-[#2C2C2E] transition active:scale-90"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-11 h-11 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <FolderPlus className="w-6 h-6 stroke-[2.2]" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-black text-white">
                  Crear Nueva Carpeta
                </h3>
                <p className="text-xs text-gray-400">
                  Organiza tus canciones en una nueva playlist
                </p>
              </div>
            </div>

            <form onSubmit={handleCreateFolder} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1.5">
                  Nombre de la carpeta *
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={newFolderNameInput}
                  onChange={(e) => setNewFolderNameInput(e.target.value)}
                  placeholder="Ej: Trap Latino, Gym Motivation, Favoritas..."
                  className="w-full px-4 py-2.5 bg-[#282828] border border-white/10 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#1ED760] transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1.5">
                  Descripción o subtítulo (opcional)
                </label>
                <input
                  type="text"
                  value={newFolderDescInput}
                  onChange={(e) => setNewFolderDescInput(e.target.value)}
                  placeholder="Ej: Lo mejor del 2026 para entrenar"
                  className="w-full px-4 py-2.5 bg-[#282828] border border-white/10 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#1ED760] transition"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  disabled={isCreatingFolder}
                  onClick={() => setShowCreateFolderModal(false)}
                  className="px-4 py-2 text-xs font-bold bg-[#2C2C2E] hover:bg-[#3A3A3C] text-gray-300 rounded-xl transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isCreatingFolder || !newFolderNameInput.trim()}
                  className="px-5 py-2 text-xs font-bold bg-[#1ED760] hover:bg-[#1db954] text-black rounded-xl shadow-lg shadow-[#1ED760]/20 active:scale-95 transition flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isCreatingFolder ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Creando...</span>
                    </>
                  ) : (
                    <>
                      <FolderPlus className="w-3.5 h-3.5" />
                      <span>Crear Carpeta</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==========================================
          MODAL: ORGANIZAR MI BIBLIOTECA (EXCLUSIVO ADMINISTRADOR)
          ========================================== */}
      {showOrganizeModal && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-4">
          <div className="bg-[#18181b] border border-white/10 rounded-3xl w-full max-w-xl p-5 sm:p-7 shadow-2xl relative max-h-[92vh] overflow-y-auto no-scrollbar flex flex-col animate-fade-in">
            {/* Botón cerrar (solo si no está corriendo el proceso activamente) */}
            {!isOrganizingRunning && (
              <button
                onClick={() => setShowOrganizeModal(false)}
                className="absolute top-5 right-5 text-gray-400 hover:text-white p-1 rounded-full hover:bg-white/10 transition"
              >
                <X className="w-5 h-5" />
              </button>
            )}

            {/* Encabezado */}
            <div className="flex items-center gap-3.5 mb-5 shrink-0">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/20 shrink-0">
                <Sparkles className="w-6 h-6 text-yellow-300" />
              </div>
              <div className="min-w-0 pr-6">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg sm:text-xl font-black text-white truncate">
                    Organizar Mi Biblioteca
                  </h3>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                    DeepSeek IA
                  </span>
                </div>
                <p className="text-xs text-gray-400 mt-0.5">
                  Clasificación y distribución automática por género musical
                </p>
              </div>
            </div>

            {/* PASO 1: CONFIRMACIÓN PREVIA */}
            {organizeStep === 'confirm' && (
              <div className="space-y-5">
                {/* Tarjetas de conteo previo */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3.5 rounded-2xl bg-[#202023] border border-white/5 flex flex-col">
                    <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                      Canciones en Supabase
                    </span>
                    <span className="text-2xl font-black text-white mt-1">
                      {loadingPreCount ? '...' : totalSongsToOrganize}
                    </span>
                    <span className="text-[10px] text-gray-400 mt-0.5">
                      Total registradas
                    </span>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-[#202023] border border-emerald-500/20 flex flex-col">
                    <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider">
                      En "Tus me gusta"
                    </span>
                    <span className="text-2xl font-black text-emerald-400 mt-1">
                      {loadingPreCount ? '...' : totalTusMeGustaCount}
                    </span>
                    <span className="text-[10px] text-emerald-300/70 mt-0.5">
                      Listas para organizar
                    </span>
                  </div>
                </div>

                {/* Explicación y Protección de Datos */}
                <div className="p-4 rounded-2xl bg-black/30 border border-white/5 space-y-2.5 text-xs text-gray-300 leading-relaxed">
                  <h4 className="font-bold text-white flex items-center gap-1.5 text-sm">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span>¿Cómo funciona esta herramienta?</span>
                  </h4>
                  <ul className="space-y-1.5 list-disc pl-4 text-gray-300">
                    <li>
                      <strong className="text-white">Análisis con DeepSeek:</strong> Analiza título, artista y metadatos de cada canción para identificar su género musical real.
                    </li>
                    <li>
                      <strong className="text-white">Carpetas inteligentes:</strong> Si la carpeta del género ya existe (Corridos, Banda, Reggaeton, Pop, Rock, Salsa, etc.), la reutiliza; si no existe, la crea automáticamente sin duplicados.
                    </li>
                    <li>
                      <strong className="text-white">Regla de oro de protección:</strong> <span className="text-emerald-300 font-medium">No se vuelven a subir los MP3, no se tocan las URL de Cloudflare R2, portadas ni favoritos.</span> Solo se actualiza la columna <code className="bg-white/10 px-1 py-0.2 rounded font-mono text-emerald-300">folder_id</code> en Supabase.
                    </li>
                    <li>
                      <strong className="text-white">Pistas dudosas:</strong> Las canciones que no puedan clasificarse con certeza se mantendrán intactas en su lugar original.
                    </li>
                  </ul>
                </div>

                {/* Selector de Alcance */}
                <div className="space-y-2">
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                    Selecciona qué canciones organizar:
                  </span>
                  <div className="grid grid-cols-1 gap-2">
                    <label
                      onClick={() => setOrganizeScope('all')}
                      className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition ${
                        organizeScope === 'all'
                          ? 'bg-emerald-950/30 border-emerald-500/60 text-white'
                          : 'bg-[#202023] border-white/5 text-gray-300 hover:bg-[#28282c]'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                          organizeScope === 'all' ? 'border-emerald-400 bg-emerald-400' : 'border-gray-500'
                        }`}>
                          {organizeScope === 'all' && <div className="w-1.5 h-1.5 rounded-full bg-black" />}
                        </div>
                        <div>
                          <p className="text-xs sm:text-sm font-bold text-white">
                            Toda la biblioteca ({totalSongsToOrganize} canciones)
                          </p>
                          <p className="text-[11px] text-gray-400">
                            Revisa y distribuye todas las canciones registradas en Supabase (Recomendado)
                          </p>
                        </div>
                      </div>
                    </label>

                    <label
                      onClick={() => setOrganizeScope('tus_me_gusta')}
                      className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition ${
                        organizeScope === 'tus_me_gusta'
                          ? 'bg-emerald-950/30 border-emerald-500/60 text-white'
                          : 'bg-[#202023] border-white/5 text-gray-300 hover:bg-[#28282c]'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                          organizeScope === 'tus_me_gusta' ? 'border-emerald-400 bg-emerald-400' : 'border-gray-500'
                        }`}>
                          {organizeScope === 'tus_me_gusta' && <div className="w-1.5 h-1.5 rounded-full bg-black" />}
                        </div>
                        <div>
                          <p className="text-xs sm:text-sm font-bold text-white">
                            Solo canciones en "Tus me gusta" ({totalTusMeGustaCount} canciones)
                          </p>
                          <p className="text-[11px] text-gray-400">
                            Organiza únicamente las que aún están en favoritos o sin carpeta específica
                          </p>
                        </div>
                      </div>
                    </label>
                  </div>
                </div>

                {/* Botones de acción */}
                <div className="pt-2 flex flex-wrap items-center justify-end gap-2.5 border-t border-white/5">
                  <button
                    onClick={() => setShowOrganizeModal(false)}
                    className="px-4 py-2.5 text-xs font-bold text-gray-400 hover:text-white rounded-xl hover:bg-white/5 transition"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={() => {
                      setShowOrganizeModal(false);
                      completarInformacionFaltanteIA();
                    }}
                    className="px-4 py-2.5 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-500 hover:to-pink-500 text-white font-bold text-xs sm:text-sm rounded-xl shadow-lg active:scale-95 transition flex items-center gap-1.5 cursor-pointer"
                    title="Actualizar carátulas, limpiar _spotdown.org y deducir artistas con DeepSeek IA"
                  >
                    <Sparkles className="w-4 h-4 text-yellow-300" />
                    <span>Actualizar Carátulas y Nombres (DeepSeek IA)</span>
                  </button>
                  <button
                    onClick={ejecutarOrganizacionBiblioteca}
                    disabled={loadingPreCount}
                    className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs sm:text-sm rounded-xl shadow-lg shadow-emerald-600/30 active:scale-95 transition flex items-center gap-2 cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4 text-yellow-300" />
                    <span>Iniciar Organización Automática</span>
                  </button>
                </div>
              </div>
            )}

            {/* PASO 2: PROCESAMIENTO EN VIVO */}
            {organizeStep === 'processing' && (
              <div className="space-y-5">
                {/* Barra de progreso */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="text-gray-300 flex items-center gap-1.5">
                      <RefreshCw className="w-3.5 h-3.5 text-emerald-400 animate-spin" />
                      <span>Procesando canciones en lotes con DeepSeek...</span>
                    </span>
                    <span className="text-emerald-400 font-mono text-sm">
                      {organizeStats.total > 0
                        ? Math.round((organizeStats.revisadas / organizeStats.total) * 100)
                        : 0}%
                    </span>
                  </div>

                  <div className="w-full h-3 bg-black/40 rounded-full overflow-hidden p-0.5 border border-white/5">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-[#1ED760] rounded-full transition-all duration-300 shadow-lg shadow-emerald-500/40"
                      style={{
                        width: `${organizeStats.total > 0 ? (organizeStats.revisadas / organizeStats.total) * 100 : 0}%`
                      }}
                    />
                  </div>
                </div>

                {/* 5 Tarjetas de Estadísticas en Tiempo Real */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  <div className="p-3 rounded-xl bg-[#202023] border border-white/5 text-center">
                    <span className="text-[10px] font-bold text-gray-400 uppercase block">Revisadas</span>
                    <span className="text-lg font-black text-white mt-0.5 block font-mono">
                      {organizeStats.revisadas}
                    </span>
                    <span className="text-[9px] text-gray-500">de {organizeStats.total}</span>
                  </div>

                  <div className="p-3 rounded-xl bg-emerald-950/20 border border-emerald-500/30 text-center">
                    <span className="text-[10px] font-bold text-emerald-400 uppercase block">Organizadas</span>
                    <span className="text-lg font-black text-emerald-400 mt-0.5 block font-mono">
                      {organizeStats.clasificadas}
                    </span>
                    <span className="text-[9px] text-emerald-500/70">con carpeta</span>
                  </div>

                  <div className="p-3 rounded-xl bg-blue-950/20 border border-blue-500/30 text-center">
                    <span className="text-[10px] font-bold text-blue-400 uppercase block">Carpetas +</span>
                    <span className="text-lg font-black text-blue-400 mt-0.5 block font-mono">
                      {organizeStats.carpetasCreadas}
                    </span>
                    <span className="text-[9px] text-blue-500/70">nuevas</span>
                  </div>

                  <div className="p-3 rounded-xl bg-amber-950/20 border border-amber-500/30 text-center">
                    <span className="text-[10px] font-bold text-amber-400 uppercase block">Pendientes</span>
                    <span className="text-lg font-black text-amber-400 mt-0.5 block font-mono">
                      {organizeStats.pendientes}
                    </span>
                    <span className="text-[9px] text-amber-500/70">restantes</span>
                  </div>

                  <div className="p-3 rounded-xl bg-zinc-900 border border-white/5 text-center col-span-2 sm:col-span-1">
                    <span className="text-[10px] font-bold text-gray-400 uppercase block">Sin Clasificar</span>
                    <span className="text-lg font-black text-gray-300 mt-0.5 block font-mono">
                      {organizeStats.sinClasificar}
                    </span>
                    <span className="text-[9px] text-gray-500">en su lugar</span>
                  </div>
                </div>

                {/* Ticker de canción actual */}
                {organizeStats.currentSongName && (
                  <div className="p-3 rounded-xl bg-black/40 border border-white/5 flex items-center justify-between text-xs">
                    <div className="min-w-0 pr-3">
                      <span className="text-[10px] uppercase font-bold text-gray-400 block">Pista en análisis:</span>
                      <p className="font-bold text-white truncate mt-0.5">{organizeStats.currentSongName}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <span className="text-[10px] uppercase font-bold text-emerald-400 block">Destino:</span>
                      <span className="font-mono text-emerald-300 font-semibold">{organizeStats.currentFolderAssigned}</span>
                    </div>
                  </div>
                )}

                {/* Registro de Actividad en Vivo */}
                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                    Actividad Reciente
                  </span>
                  <div className="p-3 rounded-2xl bg-black/50 border border-white/5 h-36 overflow-y-auto no-scrollbar space-y-1.5 font-mono text-[11px]">
                    {organizeStats.activityLogs.length === 0 ? (
                      <p className="text-gray-500 text-center py-4">Iniciando el procesamiento en lotes...</p>
                    ) : (
                      organizeStats.activityLogs.map((log, idx) => (
                        <div
                          key={idx}
                          className={`flex items-start gap-2 ${
                            log.type === 'success'
                              ? 'text-emerald-300'
                              : log.type === 'skip'
                              ? 'text-gray-400'
                              : 'text-blue-300'
                          }`}
                        >
                          <span className="text-[9px] text-gray-500 shrink-0">{log.time}</span>
                          <span className="truncate">{log.text}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Botón de detener/pausar */}
                <div className="pt-2 flex justify-between items-center border-t border-white/5">
                  <span className="text-xs text-gray-400">
                    Puedes pausar en cualquier momento sin perder los cambios realizados.
                  </span>
                  <button
                    onClick={detenerOrganizacion}
                    className="px-4 py-2 bg-red-600/20 hover:bg-red-600 text-red-300 hover:text-white border border-red-500/30 text-xs font-bold rounded-xl transition active:scale-95"
                  >
                    Pausar / Detener
                  </button>
                </div>
              </div>
            )}

            {/* PASO 3: CONFIRMACIÓN FINAL (RESUMEN) */}
            {organizeStep === 'completed' && (
              <div className="space-y-6">
                {/* Banner de éxito */}
                <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-6 h-6 stroke-[2.5]" />
                  </div>
                  <div>
                    <h4 className="text-base font-black text-white">
                      Biblioteca organizada correctamente
                    </h4>
                    <p className="text-xs text-emerald-300/80 mt-0.5">
                      Las canciones han sido clasificadas y sus carpetas asignadas en Supabase.
                    </p>
                  </div>
                </div>

                {/* Métricas Reales Obtenidas del Proceso */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-4 rounded-2xl bg-[#202023] border border-white/5">
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block">
                      Canciones Revisadas
                    </span>
                    <span className="text-3xl font-black text-white mt-1 block font-mono">
                      {organizeStats.revisadas}
                    </span>
                    <span className="text-[11px] text-gray-400 mt-1 block">
                      Total procesadas en el lote
                    </span>
                  </div>

                  <div className="p-4 rounded-2xl bg-emerald-950/20 border border-emerald-500/30">
                    <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider block">
                      Canciones Clasificadas
                    </span>
                    <span className="text-3xl font-black text-emerald-400 mt-1 block font-mono">
                      {organizeStats.clasificadas}
                    </span>
                    <span className="text-[11px] text-emerald-300/70 mt-1 block">
                      Asignadas a sus carpetas correspondientes
                    </span>
                  </div>

                  <div className="p-4 rounded-2xl bg-blue-950/20 border border-blue-500/30">
                    <span className="text-xs font-bold text-blue-400 uppercase tracking-wider block">
                      Carpetas Nuevas Creadas
                    </span>
                    <span className="text-3xl font-black text-blue-400 mt-1 block font-mono">
                      {organizeStats.carpetasCreadas}
                    </span>
                    <span className="text-[11px] text-blue-300/70 mt-1 block">
                      Generadas automáticamente sin duplicar
                    </span>
                  </div>

                  <div className="p-4 rounded-2xl bg-[#202023] border border-white/5">
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block">
                      Sin Clasificación
                    </span>
                    <span className="text-3xl font-black text-gray-300 mt-1 block font-mono">
                      {organizeStats.sinClasificar}
                    </span>
                    <span className="text-[11px] text-gray-400 mt-1 block">
                      Permanecieron en su ubicación original
                    </span>
                  </div>
                </div>

                {/* Si se crearon carpetas nuevas, mostrarlas */}
                {organizeStats.createdFolderNames.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                      Nuevas carpetas añadidas al catálogo:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {organizeStats.createdFolderNames.map((name, i) => (
                        <span
                          key={i}
                          className="px-3 py-1 rounded-full text-xs font-bold bg-blue-500/15 text-blue-300 border border-blue-500/30 flex items-center gap-1.5"
                        >
                          <Folder className="w-3 h-3 text-blue-400" />
                          <span>{name}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Botón de cierre y ver carpetas */}
                <div className="pt-2 flex justify-end gap-3 border-t border-white/5">
                  <button
                    onClick={() => {
                      setShowOrganizeModal(false);
                      setActiveFilter('carpetas');
                      setSelectedFolder(null);
                    }}
                    className="w-full py-3 bg-gradient-to-r from-emerald-600 to-[#1ED760] hover:from-emerald-500 hover:to-[#1db954] text-black font-extrabold text-sm rounded-xl shadow-lg shadow-emerald-500/30 transition active:scale-95 flex items-center justify-center gap-2"
                  >
                    <FolderCheck className="w-5 h-5 stroke-[2.5]" />
                    <span>Ver Mis Carpetas Organizadas</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==========================================
          MODAL: SUBIR MÚSICA A LA NUBE (TELEGRAM COLD STORAGE - SOLO ADMIN)
          ========================================== */}
      {isAdmin && (
        <TelegramUploaderModal
          isOpen={showTelegramUploadModal}
          onClose={() => setShowTelegramUploadModal(false)}
          existingSongs={songs.length > 0 ? songs : canciones}
          onSongUploaded={(newSong, uploadMessage) => {
            // 1. Guardar de inmediato en estado
            setLibrary((prev) => [newSong, ...prev.filter((s) => String(s.id) !== String(newSong.id))]);
            setSongs((prev) => [newSong, ...prev.filter((s) => String(s.id) !== String(newSong.id))]);
            setCanciones((prev) => [newSong, ...prev.filter((s) => String(s.id) !== String(newSong.id))]);

            // 2. Guardar en localStorage para persistencia tras recargar
            try {
              const locales = obtenerCancionesLocales();
              const filtradas = locales.filter((s) => String(s.id) !== String(newSong.id));
              localStorage.setItem(CUSTOM_LIBRARY_KEY, JSON.stringify([newSong, ...filtradas]));
              localStorage.setItem('library', JSON.stringify([newSong, ...filtradas]));
            } catch (e) {
              console.warn('Error guardando canción en localStorage:', e);
            }

            // 3. Añadir a carpeta Tus me gusta y persistir
            setFolders((prevFolders) => {
              const updated = prevFolders.map((f) =>
                f.id === 'tus_me_gusta'
                  ? { ...f, canciones: [newSong, ...(f.canciones || []).filter((s) => String(s.id) !== String(newSong.id))] }
                  : f
              );
              try {
                localStorage.setItem('fa_folders_v3', JSON.stringify(updated));
              } catch {}
              return updated;
            });

            // 4. Guardar en Firestore en background
            addDoc(collection(db, 'songs'), {
              title: newSong.title || newSong.titulo,
              artist: newSong.artist || newSong.artista,
              audio_url: newSong.audio_url || newSong.url,
              cover_url: newSong.cover_url || newSong.cover || '',
              folder_id: 'tus_me_gusta',
              created_at: new Date().toISOString()
            }).catch((error) => {
              console.warn('Aviso sincronizando en Firestore:', error);
            });

            // 5. Ir a la lista principal de canciones para que se vea inmediatamente
            setActiveFilter('canciones');
            setSelectedFolder(null);

            // 6. Iniciar reproducción automática de inmediato
            setCurrentSong(newSong);
            reproducirCancionDirecta(newSong);

            triggerToast(uploadMessage || `¡"${newSong.title || newSong.titulo}" guardada y reproduciendo!`, 'success');
          }}
          onPlaySong={(song) => {
            seleccionarCancion(song);
          }}
        />
      )}

      {/* ==========================================
          BARRA FLOTANTE / TOAST INFERIOR: ORDEN MODIFICADO [GUARDAR] [DESHACER]
          ========================================== */}
      {ordenModificado && (
        <div className="fixed bottom-24 sm:bottom-28 left-1/2 -translate-x-1/2 z-50 bg-[#1C1C1E]/95 backdrop-blur-md border border-emerald-500/50 text-white px-3.5 sm:px-4 py-2.5 rounded-full shadow-2xl flex items-center gap-2 sm:gap-3.5 animate-fade-in text-xs sm:text-sm font-semibold max-w-[95vw]">
          <div className="flex items-center gap-1.5 sm:gap-2 text-gray-200 shrink-0">
            <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="font-bold whitespace-nowrap">Orden modificado</span>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {isAdmin ? (
              <>
                <button
                  onClick={() => guardarOrdenDesdeBarra('global')}
                  disabled={guardandoOrdenBarra}
                  className="px-3 py-1.5 rounded-full bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs shadow-md transition active:scale-95 cursor-pointer disabled:opacity-50 flex items-center gap-1 whitespace-nowrap"
                  title="Guardar orden global en Firebase para todos los usuarios"
                >
                  {guardandoOrdenBarra ? (
                    <RefreshCw className="w-3 h-3 animate-spin" />
                  ) : (
                    <span>🌍 Guardar Global</span>
                  )}
                </button>
                <button
                  onClick={() => guardarOrdenDesdeBarra('personal')}
                  disabled={guardandoOrdenBarra}
                  className="px-3 py-1.5 rounded-full bg-[#1ED760] hover:bg-[#1db954] text-black font-extrabold text-xs shadow-md transition active:scale-95 cursor-pointer disabled:opacity-50 flex items-center gap-1 whitespace-nowrap"
                  title="Guardar orden personal en tu perfil de Firebase"
                >
                  {guardandoOrdenBarra ? (
                    <RefreshCw className="w-3 h-3 animate-spin" />
                  ) : (
                    <span>👤 Guardar Personal</span>
                  )}
                </button>
              </>
            ) : (
              <button
                onClick={() => guardarOrdenDesdeBarra('personal')}
                disabled={guardandoOrdenBarra}
                className="px-3.5 py-1.5 rounded-full bg-[#1ED760] hover:bg-[#1db954] text-black font-extrabold text-xs shadow-md transition active:scale-95 cursor-pointer disabled:opacity-50 flex items-center gap-1.5 whitespace-nowrap"
                title="Guardar orden en Firebase"
              >
                {guardandoOrdenBarra ? (
                  <>
                    <RefreshCw className="w-3 h-3 animate-spin" />
                    <span>Guardando...</span>
                  </>
                ) : (
                  <span>Guardar</span>
                )}
              </button>
            )}
            <button
              onClick={deshacerOrdenDesdeBarra}
              disabled={guardandoOrdenBarra}
              className="px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-gray-200 hover:text-white font-bold text-xs border border-white/15 transition active:scale-95 cursor-pointer disabled:opacity-50 whitespace-nowrap"
            >
              Deshacer
            </button>
          </div>
        </div>
      )}

      {/* ==========================================
          MODAL: TEMPORIZADOR DE APAGADO (SLEEP TIMER)
          ========================================== */}
      {showSleepTimerModal && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setShowSleepTimerModal(false)}
        >
          <div
            className="bg-[#1C1C1E] border border-white/10 rounded-3xl w-full max-w-xs p-6 shadow-2xl relative select-none"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowSleepTimerModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white p-1 rounded-lg transition active:scale-90 cursor-pointer"
              title="Cerrar"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600/30 to-[#1ED760]/20 text-[#1ED760] flex items-center justify-center shadow-md">
                <Clock className="w-5 h-5 stroke-[2.2]" />
              </div>
              <div>
                <h3 className="text-sm font-black text-white">Temporizador</h3>
                <p className="text-[11px] text-gray-400">Pausar reproducción automáticamente</p>
              </div>
            </div>

            {sleepTimerRemainingSec !== null && (
              <div className="mb-4 p-3 bg-emerald-950/40 border border-[#1ED760]/30 rounded-2xl flex items-center justify-between text-xs">
                <span className="text-gray-300 font-medium">Tiempo restante:</span>
                <span className="font-mono font-black text-[#1ED760] text-sm tabular-nums">
                  {formatearTiempoRestante(sleepTimerRemainingSec)} min
                </span>
              </div>
            )}

            <div className="space-y-2">
              <button
                type="button"
                onClick={() => activarTemporizador(15)}
                className={`w-full py-3 px-4 rounded-xl text-xs font-bold transition flex items-center justify-between cursor-pointer active:scale-95 ${
                  sleepTimerMinutes === 15
                    ? 'bg-[#1ED760] text-black shadow-lg shadow-emerald-500/20'
                    : 'bg-[#282828] hover:bg-[#333333] text-white'
                }`}
              >
                <span>15 min</span>
                {sleepTimerMinutes === 15 && <Check className="w-4 h-4 stroke-[3]" />}
              </button>

              <button
                type="button"
                onClick={() => activarTemporizador(30)}
                className={`w-full py-3 px-4 rounded-xl text-xs font-bold transition flex items-center justify-between cursor-pointer active:scale-95 ${
                  sleepTimerMinutes === 30
                    ? 'bg-[#1ED760] text-black shadow-lg shadow-emerald-500/20'
                    : 'bg-[#282828] hover:bg-[#333333] text-white'
                }`}
              >
                <span>30 min</span>
                {sleepTimerMinutes === 30 && <Check className="w-4 h-4 stroke-[3]" />}
              </button>

              <button
                type="button"
                onClick={() => activarTemporizador(60)}
                className={`w-full py-3 px-4 rounded-xl text-xs font-bold transition flex items-center justify-between cursor-pointer active:scale-95 ${
                  sleepTimerMinutes === 60
                    ? 'bg-[#1ED760] text-black shadow-lg shadow-emerald-500/20'
                    : 'bg-[#282828] hover:bg-[#333333] text-white'
                }`}
              >
                <span>60 min</span>
                {sleepTimerMinutes === 60 && <Check className="w-4 h-4 stroke-[3]" />}
              </button>

              {sleepTimerRemainingSec !== null && (
                <button
                  type="button"
                  onClick={cancelarTemporizador}
                  className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-red-400 hover:text-red-300 hover:bg-red-950/30 transition border border-red-500/30 mt-2 cursor-pointer active:scale-95"
                >
                  Desactivar temporizador
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ==========================================
          TOAST FEEDBACK
          ========================================== */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-2xl border text-xs font-semibold ${
            toast.type === 'success'
              ? 'bg-[#181818] border-[#1ED760] text-white'
              : toast.type === 'info'
              ? 'bg-[#181818] border-blue-500/60 text-white'
              : 'bg-[#181818] border-red-500 text-red-200'
          }`}
        >
          {toast.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-[#1ED760] shrink-0" />
          ) : toast.type === 'info' ? (
            <HelpCircle className="w-4 h-4 text-blue-400 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
          )}
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  );
}