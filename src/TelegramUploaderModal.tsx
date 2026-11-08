import React, { useState, useRef } from 'react';
import { Send, Upload, Music, X, AlertCircle, CheckCircle2, RefreshCw, Folder, FileAudio, Check, AlertTriangle, Image as ImageIcon, Sparkles } from 'lucide-react';
import * as mm from 'music-metadata-browser';
import { Song } from './App';
import {
  extractRealAudioMetadata,
  resolveCoverAndUploadToR2,
  searchCoverInITunes,
  downloadImageBlob,
  cleanArtist,
  cleanGenre,
  cleanTitle,
  fixUtf8Encoding,
  extractArtistAndTitleFromFilename,
} from './audioMetadataService';
import { uploadCoverToR2 } from './r2Client';

interface TelegramUploaderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSongUploaded?: (song: Song, message?: string) => void;
  onPlaySong?: (song: Song) => void;
  existingSongs?: Song[];
}

interface ArchivoProcesado {
  file: File;
  nombre: string;
  pesoMB: number;
}

interface ArchivoFallido {
  nombre: string;
  motivo: string;
  tamanoMB?: number;
}

// ----------------------------------------------------------------------------
// FUNCIÓN AUXILIAR: GENERAR COVER BLOB DE RESPALDO (CANVAS SPOTIFY STYLE)
// ----------------------------------------------------------------------------
export async function generarCoverBlobFallback(titulo: string, artista: string): Promise<Blob> {
  return new Promise((resolve) => {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 512;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(new Blob([new Uint8Array([0xFF, 0xD8, 0xFF, 0xE0])], { type: 'image/jpeg' }));
        return;
      }

      // Fondo degradado
      const grad = ctx.createLinearGradient(0, 0, 512, 512);
      const hash = (titulo + artista).split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
      const hues = [
        ['#1DB954', '#121212'],
        ['#E91E63', '#1A001F'],
        ['#3F51B5', '#0B1021'],
        ['#FF5722', '#1C0D00'],
        ['#9C27B0', '#12001F'],
        ['#00BCD4', '#001A1F'],
      ];
      const selected = hues[hash % hues.length];
      grad.addColorStop(0, selected[0]);
      grad.addColorStop(1, selected[1]);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 512, 512);

      // Círculos de disco de vinilo
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.lineWidth = 2;
      for (let r = 80; r < 240; r += 28) {
        ctx.beginPath();
        ctx.arc(256, 220, r, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Centro
      ctx.fillStyle = '#121212';
      ctx.beginPath();
      ctx.arc(256, 220, 75, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.lineWidth = 3;
      ctx.stroke();

      // Icono
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 50px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('🎵', 256, 220);

      // Título y artista
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 28px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.textAlign = 'center';
      const cleanTitle = titulo.length > 24 ? titulo.substring(0, 24) + '...' : titulo;
      ctx.fillText(cleanTitle, 256, 420);

      ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
      ctx.font = '600 20px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      const cleanArtist = artista.length > 28 ? artista.substring(0, 28) + '...' : artista;
      ctx.fillText(cleanArtist, 256, 458);

      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else resolve(new Blob([new Uint8Array([0xFF, 0xD8, 0xFF, 0xE0])], { type: 'image/jpeg' }));
      }, 'image/jpeg', 0.9);
    } catch {
      resolve(new Blob([new Uint8Array([0xFF, 0xD8, 0xFF, 0xE0])], { type: 'image/jpeg' }));
    }
  });
}

// ----------------------------------------------------------------------------
// FUNCIÓN AUXILIAR: CONVERTIR URL DE IMAGEN A ARCHIVO FÍSICO (File) PARA TELEGRAM
// ----------------------------------------------------------------------------
export async function convertImageUrlToFile(
  coverUrl: string | null | undefined,
  title: string = 'Canción',
  artist: string = 'Artista'
): Promise<File> {
  // 1. Si es Data URL base64
  if (coverUrl && coverUrl.startsWith('data:')) {
    try {
      const res = await fetch(coverUrl);
      const b = await res.blob();
      if (b && b.size > 0) {
        return new File([b], 'cover.jpg', { type: b.type || 'image/jpeg' });
      }
    } catch (e) {
      console.warn('Nota convirtiendo data URL a File:', e);
    }
  } else if (coverUrl && coverUrl.startsWith('http')) {
    // 2. Descarga directa en navegador
    try {
      const imgRes = await fetch(coverUrl);
      if (imgRes.ok) {
        const b = await imgRes.blob();
        if (b && b.size > 0) {
          return new File([b], 'cover.jpg', { type: b.type || 'image/jpeg' });
        }
      }
    } catch {
      // 3. Si CORS bloquea la descarga en cliente, pasar por el proxy del backend
      try {
        const proxyRes = await fetch(`/api/proxy-image?url=${encodeURIComponent(coverUrl)}`);
        if (proxyRes.ok) {
          const b = await proxyRes.blob();
          if (b && b.size > 0) {
            return new File([b], 'cover.jpg', { type: b.type || 'image/jpeg' });
          }
        }
      } catch (proxyErr) {
        console.warn('Nota en proxy de imagen para Telegram:', proxyErr);
      }
    }
  }

  // 4. Fallback de emergencia: generar imagen con Canvas y convertir a File
  const fallbackBlob = await generarCoverBlobFallback(title, artist);
  return new File([fallbackBlob], 'cover.jpg', { type: 'image/jpeg' });
}

export async function getCoverBlobFromUrlOrFallback(
  coverUrl: string | null | undefined,
  title: string,
  artist: string
): Promise<Blob> {
  return convertImageUrlToFile(coverUrl, title, artist);
}

// ----------------------------------------------------------------------------
// 1. REUTILIZAR FUNCIÓN DE DEEPSEEK IA (LIMPIEZA SIN _spotdown.org Y GENERADOR DE IMAGEN)
// ----------------------------------------------------------------------------
export async function fetchDeepSeekData(
  rawTitleOrFilename: string,
  hintArtist?: string
): Promise<{
  title: string;
  artist: string;
  coverUrl: string;
  genre?: string;
  coverBlob?: Blob;
  coverFile?: File;
}> {
  // Limpieza inicial estricta de "_spotdown.org", extensiones de audio y rippers
  let rawClean = (rawTitleOrFilename || '')
    .replace(/\.(mp3|wav|m4a|aac|flac|ogg)$/i, '')
    .replace(/_?spotdown(?:\.org)?/gi, '')
    .replace(/\b(spotdown(?:\.org)?)\b/gi, '')
    .replace(/^\s*(?:\d+[\s._-]+)+/, '')
    .replace(
      /\b(official\s+video|video\s+oficial|official\s+audio|audio\s+oficial|video\s+lyric|letra|lyrics|en\s+vivo|live|remix|hd|4k|1080p|hq|320kbps|128kbps|y2mate(?:\.is)?|mp3clan|snaptube|full\s+audio)\b/gi,
      ''
    )
    .replace(/[\[\(\{]\s*[\]\)\}]/g, '')
    .replace(/[_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  let fallbackTitle = rawClean || 'Canción';
  let fallbackArtist = (hintArtist && hintArtist !== 'Desconocido' && hintArtist !== 'Artista Desconocido') ? hintArtist.trim() : '';

  if (!fallbackArtist && rawClean.includes(' - ')) {
    const parts = rawClean.split(' - ');
    fallbackArtist = parts[0].trim();
    fallbackTitle = parts.slice(1).join(' - ').trim();
  }

  if (!fallbackArtist) fallbackArtist = 'Artista';

  // Intentar consultar al endpoint backend con DeepSeek AI
  try {
    const response = await fetch('/api/ai/tag-audio', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        filename: rawClean,
        id3Title: fallbackTitle,
        id3Artist: fallbackArtist !== 'Artista' ? fallbackArtist : ''
      })
    });

    if (response.ok) {
      const json = await response.json();
      if (json.success && json.data) {
        const d = json.data;
        const cleanTitle = String(d.titulo || fallbackTitle)
          .replace(/_?spotdown(?:\.org)?/gi, '')
          .replace(/\.(mp3|wav|m4a|aac|flac|ogg)$/i, '')
          .trim();
        const cleanArtist = String(d.artista || fallbackArtist)
          .replace(/_?spotdown(?:\.org)?/gi, '')
          .trim();

        // 1. Buscar portada oficial en alta resolución en iTunes API (600x600) y subir a R2
        let coverUrl = d.coverUrl || '';
        try {
          const itunesRes = await searchCoverInITunes(cleanArtist, cleanTitle);
          if (itunesRes && itunesRes.coverUrl) {
            const blob = await downloadImageBlob(itunesRes.coverUrl);
            const sanitized = (cleanTitle || 'cover').replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
            coverUrl = await uploadCoverToR2(blob, `${sanitized}-itunes.jpg`);
          }
        } catch (itunesErr) {
          console.warn('Nota buscando portada en iTunes:', itunesErr);
        }

        if (!coverUrl) {
          const promptClean = encodeURIComponent(`${cleanArtist} ${cleanTitle} music album art cover 4k`);
          coverUrl = `https://image.pollinations.ai/prompt/${promptClean}?width=512&height=512&nologo=true`;
        }

        const coverFile = await convertImageUrlToFile(coverUrl, cleanTitle, cleanArtist);

        return {
          title: cleanTitle || fallbackTitle,
          artist: cleanArtist || fallbackArtist,
          coverUrl,
          coverBlob: coverFile,
          coverFile,
          genre: d.genre || d.genero
        };
      }
    }
  } catch (err) {
    console.warn('Nota en llamada a DeepSeek IA:', err);
  }

  // Fallback seguro si hay timeout o fallo de red: buscar en iTunes
  let fallbackCoverUrl = '';
  try {
    const itunesRes = await searchCoverInITunes(fallbackArtist, fallbackTitle);
    if (itunesRes && itunesRes.coverUrl) {
      const blob = await downloadImageBlob(itunesRes.coverUrl);
      const sanitized = (fallbackTitle || 'cover').replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
      fallbackCoverUrl = await uploadCoverToR2(blob, `${sanitized}-itunes.jpg`);
    }
  } catch (_) {}

  if (!fallbackCoverUrl) {
    const promptClean = encodeURIComponent(`${fallbackArtist} ${fallbackTitle} music album art cover 4k`);
    fallbackCoverUrl = `https://image.pollinations.ai/prompt/${promptClean}?width=512&height=512&nologo=true`;
  }
  const coverFile = await convertImageUrlToFile(fallbackCoverUrl, fallbackTitle, fallbackArtist);

  return {
    title: fallbackTitle,
    artist: fallbackArtist,
    coverUrl: fallbackCoverUrl,
    coverBlob: coverFile,
    coverFile,
    genre: 'Música'
  };
}

export const generateImageWithDeepSeek = fetchDeepSeekData;

// ----------------------------------------------------------------------------
// FUNCIÓN AUXILIAR: EXTRACCIÓN DE METADATOS ID3 REALES + PORTADA ITUNES / R2
// ----------------------------------------------------------------------------
async function extraerMetadatosAudio(file: File): Promise<{
  title: string;
  artist: string;
  genre: string;
  coverBlob: Blob;
  coverUrl: string;
}> {
  try {
    const meta = await extractRealAudioMetadata(file);
    const coverUrl = await resolveCoverAndUploadToR2(meta.artist, meta.title, meta.embeddedCoverBlob);
    let coverBlob: Blob | null = meta.embeddedCoverBlob;
    if (!coverBlob) {
      try {
        coverBlob = await downloadImageBlob(coverUrl);
      } catch {
        coverBlob = await generarCoverBlobFallback(meta.title, meta.artist);
      }
    }
    return {
      title: meta.title,
      artist: meta.artist,
      genre: meta.genre,
      coverBlob: coverBlob || (await generarCoverBlobFallback(meta.title, meta.artist)),
      coverUrl,
    };
  } catch (err) {
    const parsed = extractArtistAndTitleFromFilename(file.name);
    const fallbackTitle = parsed.title || cleanTitle(null, file.name);
    const fallbackArtist = parsed.artist || 'Artista';
    const fallbackGenre = 'Sin Categoría';
    const fallbackBlob = await generarCoverBlobFallback(fallbackTitle, fallbackArtist);
    return {
      title: fallbackTitle,
      artist: fallbackArtist,
      genre: fallbackGenre,
      coverBlob: fallbackBlob,
      coverUrl: URL.createObjectURL(fallbackBlob),
    };
  }
}


export default function TelegramUploaderModal({
  isOpen,
  onClose,
  onSongUploaded,
  onPlaySong,
  existingSongs = [],
}: TelegramUploaderModalProps) {
  // Modo de selección: 'archivo' por defecto
  const [modoSubida, setModoSubida] = useState<'archivo' | 'carpeta'>('archivo');

  // Archivo individual con metadatos
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [title, setTitle] = useState<string>('');
  const [performer, setPerformer] = useState<string>('');
  const [genre, setGenre] = useState<string>('Sin Categoría');
  const [coverBlob, setCoverBlob] = useState<Blob | null>(null);
  const [coverImageFile, setCoverImageFile] = useState<File | null>(null);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [leyendoMetadatos, setLeyendoMetadatos] = useState<boolean>(false);

  // Carpeta de archivos
  const [carpetaArchivosValidos, setCarpetaArchivosValidos] = useState<ArchivoProcesado[]>([]);
  const [archivosFallidos, setArchivosFallidos] = useState<ArchivoFallido[]>([]);
  const [nombreCarpeta, setNombreCarpeta] = useState<string>('');

  // Selector de Destino de Subida: Opción A (R2 y Telegram) vs Opción B (Solo Telegram)
  const [destinoSubida, setDestinoSubida] = useState<'r2_telegram' | 'solo_telegram'>('r2_telegram');
  const saveToR2 = destinoSubida === 'r2_telegram';

  // Configuración de Worker
  const [workerUrl, setWorkerUrl] = useState<string>(() => {
    try {
      return localStorage.getItem('spotyy_worker_url') || 'https://musica-bot.perezperezaaron61.workers.dev';
    } catch {
      return 'https://musica-bot.perezperezaaron61.workers.dev';
    }
  });

  // Estados de subida y cola secuencial con metadatos
  const [uploading, setUploading] = useState<boolean>(false);
  const [indicadorCola, setIndicadorCola] = useState<{
    archivoActual: string;
    artistaActual?: string;
    coverUrlActual?: string | null;
    actual: number;
    total: number;
    porcentaje: number;
  } | null>(null);

  // Resumen final de subida
  const [resumenFinal, setResumenFinal] = useState<{
    exitosas: number;
    omitidasDuplicadas: number;
    fallidas: number;
    detallesFallidas: ArchivoFallido[];
  } | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const folderInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  const extensionesValidas = /\.(mp3|m4a|wav|ogg|flac|aac)$/i;

  // Manejador para archivo individual con extracción de metadatos reales y búsqueda iTunes (600x600)
  const handleSelectSingleFile = async (file: File) => {
    setError(null);
    setResumenFinal(null);

    const esAudio = file.type.startsWith('audio/') || extensionesValidas.test(file.name);
    if (!esAudio) {
      setError('El archivo seleccionado no es un formato de audio compatible (.mp3, .m4a, .wav, .ogg).');
      return;
    }

    const fileSizeMB = file.size / (1024 * 1024);
    if (fileSizeMB > 20) {
      setError(`El archivo pesa ${fileSizeMB.toFixed(2)} MB. Telegram rechaza descargas de más de 20 MB.`);
      setAudioFile(null);
      return;
    }

    setAudioFile(file);
    setLeyendoMetadatos(true);

    try {
      // 1. Extraer ID3 real, buscar portada en iTunes API (600x600) y subir a Cloudflare R2
      const meta = await extraerMetadatosAudio(file);

      setTitle(meta.title);
      setPerformer(meta.artist);
      setGenre(meta.genre);
      setCoverUrl(meta.coverUrl);

      // Convertir la imagen a archivo físico File para Telegram thumbnail
      const imgFile = await convertImageUrlToFile(meta.coverUrl, meta.title, meta.artist);
      setCoverImageFile(imgFile);
      setCoverBlob(imgFile);
    } catch (e) {
      console.warn('Error procesando archivo:', e);
      const parsed = extractArtistAndTitleFromFilename(file.name);
      const cleanFallback = parsed.title || cleanTitle(null, file.name);
      const fallbackArtist = parsed.artist || 'Artista';
      setTitle(cleanFallback);
      setPerformer(fallbackArtist);
      setGenre('Sin Categoría');
      const fallbackFile = await convertImageUrlToFile(null, cleanFallback, fallbackArtist);
      setCoverImageFile(fallbackFile);
      setCoverBlob(fallbackFile);
      setCoverUrl(URL.createObjectURL(fallbackFile));
    } finally {
      setLeyendoMetadatos(false);
    }
  };

  // Manejador para carpeta completa (webkitdirectory)
  const handleSelectFolder = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    setResumenFinal(null);
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const filesArray = Array.from(files);
    const validos: ArchivoProcesado[] = [];
    const fallidos: ArchivoFallido[] = [];

    // Extraer nombre de la carpeta raíz
    const primeraRuta = filesArray[0].webkitRelativePath || '';
    const rootName = primeraRuta.split('/')[0] || 'Carpeta de Música';
    setNombreCarpeta(rootName);

    for (const f of filesArray) {
      const pesoMB = f.size / (1024 * 1024);
      const esAudio = f.type.startsWith('audio/') || extensionesValidas.test(f.name);

      if (!esAudio) {
        if (!f.name.startsWith('.') && !f.name.endsWith('.ini')) {
          fallidos.push({
            nombre: f.name,
            motivo: 'Formato no compatible (no es audio)',
            tamanoMB: pesoMB,
          });
        }
        continue;
      }

      if (pesoMB > 20) {
        fallidos.push({
          nombre: f.name,
          motivo: `Excede el límite de 20 MB (${pesoMB.toFixed(1)} MB)`,
          tamanoMB: pesoMB,
        });
        continue;
      }

      validos.push({
        file: f,
        nombre: f.name,
        pesoMB,
      });
    }

    setCarpetaArchivosValidos(validos);
    setArchivosFallidos(fallidos);

    if (validos.length === 0 && fallidos.length > 0) {
      setError('No se encontraron archivos de audio aptos (menores a 20 MB) en la carpeta.');
    }
  };

  // --------------------------------------------------------------------------
  // SUBIDA SECUENCIAL CON BUCLE FOR...OF Y AWAIT (COLA REQUERIDA)
  // --------------------------------------------------------------------------
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setResumenFinal(null);

    const workerBase = workerUrl.trim().replace(/\/+$/, '');
    if (!workerBase) {
      setError('Por favor especifica la URL de tu Cloudflare Worker.');
      return;
    }

    const endpoint = `${workerBase}/upload-cold-storage`;

    // 1. Caso: Subida de archivo individual
    if (modoSubida === 'archivo') {
      if (!audioFile) {
        setError('Por favor selecciona un archivo de audio primero.');
        return;
      }

      // Huella digital y comprobación de duplicado previo
      const huella = `${audioFile.name}_${audioFile.size}`;
      const tituloFinal = title.trim() || audioFile.name.replace(/\.[^/.]+$/, '');
      const artistaFinal = performer.trim() || 'Artista';

      const yaExiste = existingSongs.some((s) => {
        const t = (s.title || s.titulo || '').trim().toLowerCase();
        const a = (s.artist || s.artista || '').trim().toLowerCase();
        const h = s.fingerprint;
        return (h && h === huella) || (t === tituloFinal.toLowerCase() && a === artistaFinal.toLowerCase());
      });

      if (yaExiste) {
        setError(`La canción "${tituloFinal}" ya existe en tu biblioteca. Se omitió para evitar duplicados.`);
        return;
      }

      setUploading(true);
      setIndicadorCola({
        archivoActual: tituloFinal,
        artistaActual: artistaFinal,
        coverUrlActual: coverUrl,
        actual: 1,
        total: 1,
        porcentaje: 50,
      });

      try {
        localStorage.setItem('spotyy_worker_url', workerBase);
        const formData = new FormData();
        formData.append('audio', audioFile);
        formData.append('title', tituloFinal);
        formData.append('performer', artistaFinal);
        formData.append('save_to_r2', saveToR2 ? 'true' : 'false');

        // 3. ENVÍO AL WORKER (FORMDATA): Añade la imagen convertida a archivo físico File
        let imagenFile = coverImageFile;
        if (!imagenFile || !(imagenFile instanceof File)) {
          imagenFile = await convertImageUrlToFile(coverUrl, tituloFinal, artistaFinal);
        }
        if (imagenFile instanceof File) {
          formData.append('thumbnail', imagenFile, 'cover.jpg');
        }

        let response: Response;
        try {
          response = await fetch(endpoint, {
            method: 'POST',
            body: formData,
          });
        } catch {
          // Si el worker remoto falla o no está disponible, intentar el endpoint del servidor
          response = await fetch('/api/upload-cold-storage', {
            method: 'POST',
            body: formData,
          });
        }

        const data = await response.json().catch(() => null);

        if (!response.ok || !data?.success) {
          throw new Error(data?.error || data?.description || 'Error al guardar en Telegram.');
        }

        const newSong: Song = {
          id: data.file_id || 'tg_' + Date.now(),
          titulo: fixUtf8Encoding(tituloFinal),
          title: fixUtf8Encoding(tituloFinal),
          artista: fixUtf8Encoding(artistaFinal),
          artist: fixUtf8Encoding(artistaFinal),
          url: data.playback_url,
          audio_url: data.playback_url,
          storage_path: data.playback_url,
          folder_id: 'tus_me_gusta',
          cover_url: coverUrl || '',
          cover: coverUrl || '',
          fingerprint: huella,
          created_at: new Date().toISOString(),
          genre: fixUtf8Encoding(genre || 'Sin Categoría'),
        };

        const resultMsg = data.message || (saveToR2
          ? 'Canción guardada en Telegram y Caché (Máxima velocidad)'
          : 'Canción guardada solo en Telegram (Ahorro de espacio activado)');

        if (onSongUploaded) {
          onSongUploaded(newSong, resultMsg);
        }

        setAudioFile(null);
        setCoverBlob(null);
        setCoverUrl(null);
        onClose();
      } catch (err: any) {
        setError(err?.message || 'Error de conexión con Cloudflare Worker.');
      } finally {
        setUploading(false);
        setIndicadorCola(null);
      }
      return;
    }

    // 2. Caso: Subida de CARPETA COMPLETA (Secuencial con for...of)
    if (carpetaArchivosValidos.length === 0) {
      setError('No hay archivos válidos para subir en la carpeta.');
      return;
    }

    setUploading(true);
    let subidasExitosas = 0;
    let omitidasPorDuplicado = 0;
    const fallidasDuranteEnvio: ArchivoFallido[] = [...archivosFallidos];
    const totalAProcesar = carpetaArchivosValidos.length;

    localStorage.setItem('spotyy_worker_url', workerBase);

    // Bucle secuencial for...of con await
    for (let i = 0; i < totalAProcesar; i++) {
      const item = carpetaArchivosValidos[i];
      const numeroActual = i + 1;

      // Huella digital del archivo
      const huella = `${item.file.name}_${item.file.size}`;

      // Extraer metadatos ID3 en tiempo real y buscar portada en iTunes / R2
      const meta = await extraerMetadatosAudio(item.file);

      // PREVENCIÓN AL MOMENTO DE SUBIR: Comprobar si ya existe en la biblioteca
      const yaExiste = existingSongs.some((s) => {
        const t = (s.title || s.titulo || '').trim().toLowerCase();
        const a = (s.artist || s.artista || '').trim().toLowerCase();
        const h = s.fingerprint;
        return (h && h === huella) || (t === meta.title.toLowerCase() && a === meta.artist.toLowerCase());
      });

      if (yaExiste) {
        omitidasPorDuplicado++;
        continue;
      }

      // Actualizar indicador visual obligatorio con portada y artista
      setIndicadorCola({
        archivoActual: meta.title,
        artistaActual: meta.artist,
        coverUrlActual: meta.coverUrl,
        actual: numeroActual,
        total: totalAProcesar,
        porcentaje: Math.round((numeroActual / totalAProcesar) * 100),
      });

      try {
        const formData = new FormData();
        formData.append('audio', item.file);
        formData.append('title', meta.title);
        formData.append('performer', meta.artist);
        formData.append('save_to_r2', saveToR2 ? 'true' : 'false');

        // Adjuntar miniatura convertida a archivo físico File para Telegram
        const thumbnailFile = await convertImageUrlToFile(meta.coverUrl, meta.title, meta.artist);
        formData.append('thumbnail', thumbnailFile, 'cover.jpg');

        let response: Response;
        try {
          response = await fetch(endpoint, {
            method: 'POST',
            body: formData,
          });
        } catch {
          response = await fetch('/api/upload-cold-storage', {
            method: 'POST',
            body: formData,
          });
        }

        const data = await response.json().catch(() => null);

        if (!response.ok || !data?.success) {
          throw new Error(data?.error || `Error HTTP ${response.status}`);
        }

        const cancionGuardada: Song = {
          id: data.file_id || 'tg_' + Date.now() + '_' + i,
          titulo: fixUtf8Encoding(meta.title),
          title: fixUtf8Encoding(meta.title),
          artista: fixUtf8Encoding(meta.artist),
          artist: fixUtf8Encoding(meta.artist),
          url: data.playback_url,
          audio_url: data.playback_url,
          storage_path: data.playback_url,
          folder_id: 'tus_me_gusta',
          cover_url: meta.coverUrl || '',
          cover: meta.coverUrl || '',
          fingerprint: huella,
          created_at: new Date().toISOString(),
          genre: fixUtf8Encoding(meta.genre || 'Sin Categoría'),
        };

        subidasExitosas++;

        // Agregar canción a la biblioteca en tiempo real
        if (onSongUploaded) {
          onSongUploaded(
            cancionGuardada,
            `Subida: ${cancionGuardada.titulo} (${subidasExitosas}/${totalAProcesar})`
          );
        }
      } catch (subErr: any) {
        console.warn(`Error al subir ${item.nombre}:`, subErr);
        fallidasDuranteEnvio.push({
          nombre: item.nombre,
          motivo: subErr?.message || 'Fallo de red o rechazo de API',
          tamanoMB: item.pesoMB,
        });
      }

      // Retraso de 2 segundos entre canciones para no saturar la API de iTunes ni Telegram
      if (i < totalAProcesar - 1) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }

    setUploading(false);
    setIndicadorCola(null);

    // Resumen final al terminar: "Subidas: X | Omitidas por duplicado: Y"
    setResumenFinal({
      exitosas: subidasExitosas,
      omitidasDuplicadas: omitidasPorDuplicado,
      fallidas: fallidasDuranteEnvio.length,
      detallesFallidas: fallidasDuranteEnvio,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-4 animate-fade-in overflow-y-auto">
      <div className="bg-[#151922] border border-[#232733] rounded-3xl w-full max-w-xl p-5 sm:p-7 shadow-2xl relative my-auto">
        {/* Botón Cerrar */}
        <button
          onClick={() => {
            if (!uploading) onClose();
          }}
          disabled={uploading}
          className="absolute top-4 right-4 text-gray-400 hover:text-white p-2 rounded-xl bg-[#222736] transition active:scale-90 z-10 disabled:opacity-40"
          title="Cerrar ventana"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Encabezado */}
        <div className="text-center mb-5 pr-6 sm:pr-0">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#1D88BC] to-[#2AABEE] text-white shadow-lg shadow-sky-500/25 mb-2.5">
            <Send className="w-6 h-6 ml-0.5" />
          </div>
          <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            Subir Música a la Nube (Telegram)
          </h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            Detección automática de carátulas ID3, Título y Artista
          </p>
        </div>

        {/* Selector de modo: Archivo Individual vs Carpeta Completa */}
        <div className="grid grid-cols-2 gap-2 p-1 bg-[#0B0E14] border border-[#222736] rounded-2xl mb-4">
          <button
            type="button"
            disabled={uploading}
            onClick={() => {
              setModoSubida('carpeta');
              setError(null);
            }}
            className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer ${
              modoSubida === 'carpeta'
                ? 'bg-sky-600 text-white shadow-md shadow-sky-600/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Folder className="w-4 h-4" />
            <span>Carpeta Completa</span>
          </button>
          <button
            type="button"
            disabled={uploading}
            onClick={() => {
              setModoSubida('archivo');
              setError(null);
            }}
            className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer ${
              modoSubida === 'archivo'
                ? 'bg-sky-600 text-white shadow-md shadow-sky-600/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <FileAudio className="w-4 h-4" />
            <span>Archivo Único</span>
          </button>
        </div>

        {error && (
          <div className="mb-4 bg-red-500/10 border border-red-500/30 text-red-400 p-3 rounded-xl text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* MODO CARPETA COMPLETA */}
          {modoSubida === 'carpeta' && (
            <div className="space-y-3">
              <input
                ref={folderInputRef}
                type="file"
                multiple
                // @ts-expect-error webkitdirectory es estándar en navegadores modernos
                webkitdirectory=""
                directory=""
                className="hidden"
                onChange={handleSelectFolder}
                disabled={uploading}
              />

              <div
                onClick={() => {
                  if (!uploading) folderInputRef.current?.click();
                }}
                className="border-2 border-dashed border-[#2F3649] hover:border-sky-400/70 bg-[#0B0E14]/60 hover:bg-[#151922] rounded-2xl p-6 text-center cursor-pointer transition flex flex-col items-center justify-center gap-2 group"
              >
                <div className="w-12 h-12 rounded-full bg-[#222736] group-hover:bg-sky-500/20 group-hover:text-sky-400 text-slate-400 flex items-center justify-center transition">
                  <Folder className="w-6 h-6" />
                </div>
                <p className="text-sm font-bold text-slate-200 group-hover:text-white transition">
                  {carpetaArchivosValidos.length > 0
                    ? `Carpeta: "${nombreCarpeta}"`
                    : 'Seleccionar Carpeta Completa'}
                </p>
                <p className="text-xs text-slate-400">
                  {carpetaArchivosValidos.length > 0
                    ? `${carpetaArchivosValidos.length} archivos de audio aptos encontrados`
                    : 'Haz clic para seleccionar una carpeta (incluye subcarpetas)'}
                </p>
                <span className="text-[10px] bg-[#222736] text-slate-300 px-2.5 py-0.5 rounded-full border border-white/5">
                  Extracción automática de carátulas ID3 activada
                </span>
              </div>

              {(carpetaArchivosValidos.length > 0 || archivosFallidos.length > 0) && (
                <div className="bg-[#0B0E14] border border-[#222736] rounded-2xl p-3.5 space-y-2">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-slate-300">Total detectados en carpeta:</span>
                    <span className="text-sky-400 font-mono">
                      {carpetaArchivosValidos.length + archivosFallidos.length} archivos
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-2 text-emerald-400">
                      <div className="font-bold">Aptos para subir:</div>
                      <div className="text-sm font-mono mt-0.5">{carpetaArchivosValidos.length} canciones</div>
                    </div>
                    <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-2 text-amber-400">
                      <div className="font-bold">Omitidos (+20MB o no audio):</div>
                      <div className="text-sm font-mono mt-0.5">{archivosFallidos.length} archivos</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* MODO ARCHIVO ÚNICO */}
          {modoSubida === 'archivo' && (
            <div className="space-y-3">
              <input
                ref={fileInputRef}
                type="file"
                accept="audio/*,.mp3,.m4a,.wav,.ogg"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files.length > 0) {
                    handleSelectSingleFile(e.target.files[0]);
                  }
                }}
                disabled={uploading}
              />

              <div
                onClick={() => {
                  if (!uploading) fileInputRef.current?.click();
                }}
                className="border-2 border-dashed border-[#2F3649] hover:border-sky-400/70 bg-[#0B0E14]/60 hover:bg-[#151922] rounded-2xl p-5 text-center cursor-pointer transition flex flex-col items-center justify-center gap-2"
              >
                {!audioFile ? (
                  <>
                    <div className="w-12 h-12 rounded-full bg-[#222736] text-slate-400 flex items-center justify-center">
                      <Upload className="w-6 h-6" />
                    </div>
                    <p className="text-sm font-bold text-slate-200">Seleccionar Archivo de Audio</p>
                    <span className="text-[10px] text-slate-400">Límite: 20 MB • Extrae carátula y tags automáticamente</span>
                  </>
                ) : (
                  <div className="w-full bg-[#222736] border border-sky-500/40 rounded-xl p-3 flex items-center justify-between gap-3 text-left">
                    <div className="flex items-center gap-3 overflow-hidden">
                      {/* Vista previa de carátula generada con DeepSeek o extraída */}
                      {coverUrl ? (
                        <img
                          src={coverUrl}
                          alt="Carátula"
                          loading="lazy"
                          decoding="async"
                          className="w-14 h-14 rounded-xl object-cover bg-neutral-900 border border-sky-400/50 shadow-md shrink-0"
                        />
                      ) : (
                        <div className="w-14 h-14 rounded-xl bg-[#0B0E14] text-sky-400 flex items-center justify-center shrink-0 border border-white/5">
                          <Music className="w-7 h-7" />
                        </div>
                      )}
                      <div className="truncate flex-1">
                        <div className="flex items-center gap-1.5">
                          <p className="text-xs sm:text-sm font-bold text-white truncate">{title || audioFile.name}</p>
                          <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded font-semibold border border-emerald-500/30 shrink-0">
                            DeepSeek IA
                          </span>
                        </div>
                        <p className="text-xs text-slate-300 truncate mt-0.5">{performer || 'Artista'}</p>
                        <p className="text-[10px] text-sky-400 font-mono mt-0.5">
                          {(audioFile.size / (1024 * 1024)).toFixed(2)} MB • Portada lista para Telegram
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setAudioFile(null);
                        setCoverBlob(null);
                        setCoverUrl(null);
                      }}
                      className="text-slate-400 hover:text-red-400 p-1"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              {leyendoMetadatos && (
                <div className="text-xs text-sky-400 flex items-center gap-2 justify-center py-1 bg-sky-950/40 border border-sky-500/30 rounded-xl px-3">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-sky-400" />
                  <span className="font-semibold">Extrayendo ID3 reales y buscando portada en iTunes HD...</span>
                </div>
              )}

              {coverUrl && !leyendoMetadatos && (
                <div className="flex items-center gap-2 text-[11px] text-emerald-400 font-semibold bg-emerald-500/10 border border-emerald-500/25 px-3 py-1.5 rounded-xl">
                  <Sparkles className="w-3.5 h-3.5 text-yellow-300 shrink-0" />
                  <span className="truncate">Metadatos reales extraídos y portada 600x600 guardada en Cloudflare R2</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Título</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Ej. Ella Baila Sola"
                    disabled={uploading}
                    className="w-full bg-[#0B0E14] border border-[#222736] focus:border-sky-400 rounded-xl px-3 py-2 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Artista</label>
                  <input
                    type="text"
                    value={performer}
                    onChange={(e) => setPerformer(e.target.value)}
                    placeholder="Ej. Peso Pluma"
                    disabled={uploading}
                    className="w-full bg-[#0B0E14] border border-[#222736] focus:border-sky-400 rounded-xl px-3 py-2 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Género</label>
                  <input
                    type="text"
                    value={genre}
                    onChange={(e) => setGenre(e.target.value)}
                    placeholder="Ej. Corridos, Pop, Rock"
                    disabled={uploading}
                    className="w-full bg-[#0B0E14] border border-[#222736] focus:border-sky-400 rounded-xl px-3 py-2 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Selector de Destino de Subida: Opción A vs Opción B */}
          <div className="bg-[#0B0E14] border border-[#222736] rounded-2xl p-3.5 space-y-2.5">
            <label className="block text-xs font-bold text-slate-300">
              Destino de Subida:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <label
                className={`p-3 rounded-xl border text-left transition cursor-pointer flex items-start gap-2.5 ${
                  destinoSubida === 'r2_telegram'
                    ? 'bg-sky-500/15 border-sky-400 text-white shadow-sm'
                    : 'bg-[#151922] border-[#2F3649] text-slate-400 hover:border-slate-500 hover:text-slate-200'
                }`}
              >
                <input
                  type="radio"
                  name="destinoSubida"
                  value="r2_telegram"
                  checked={destinoSubida === 'r2_telegram'}
                  onChange={() => setDestinoSubida('r2_telegram')}
                  disabled={uploading}
                  className="mt-0.5 text-sky-500 focus:ring-sky-400 cursor-pointer"
                />
                <div>
                  <div className="text-xs font-bold text-slate-100">
                    Opción A: Subir a Cloudflare R2 y Telegram
                  </div>
                  <div className="text-[10px] text-sky-400 font-medium mt-0.5">
                    Flujo normal (Caché rápida y respaldo)
                  </div>
                </div>
              </label>

              <label
                className={`p-3 rounded-xl border text-left transition cursor-pointer flex items-start gap-2.5 ${
                  destinoSubida === 'solo_telegram'
                    ? 'bg-cyan-500/15 border-cyan-400 text-white shadow-sm'
                    : 'bg-[#151922] border-[#2F3649] text-slate-400 hover:border-slate-500 hover:text-slate-200'
                }`}
              >
                <input
                  type="radio"
                  name="destinoSubida"
                  value="solo_telegram"
                  checked={destinoSubida === 'solo_telegram'}
                  onChange={() => setDestinoSubida('solo_telegram')}
                  disabled={uploading}
                  className="mt-0.5 text-cyan-500 focus:ring-cyan-400 cursor-pointer"
                />
                <div>
                  <div className="text-xs font-bold text-slate-100">
                    Opción B: Solo subir a Telegram
                  </div>
                  <div className="text-[10px] text-slate-400 font-medium mt-0.5">
                    No sube a R2, solo envía el archivo al bot
                  </div>
                </div>
              </label>
            </div>
          </div>

          {/* 3. INDICADOR VISUAL CON FOTO DE PORTADA EXTRAÍDA EN EL MODAL */}
          {indicadorCola && (
            <div className="bg-sky-950/40 border border-sky-500/40 rounded-2xl p-4 space-y-3">
              <div className="flex items-center gap-3">
                {indicadorCola.coverUrlActual ? (
                  <img
                    src={indicadorCola.coverUrlActual}
                    alt="Portada"
                    loading="lazy"
                    decoding="async"
                    className="w-12 h-12 rounded-xl object-cover bg-neutral-900 border border-sky-400/40 shadow-lg shrink-0"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-xl bg-[#0B0E14] border border-white/5 flex items-center justify-center text-sky-400 shrink-0">
                    <Music className="w-6 h-6" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-sky-200 text-xs truncate">
                    {indicadorCola.archivoActual}
                  </div>
                  <div className="text-[11px] text-slate-400 truncate">
                    {indicadorCola.artistaActual} • ({indicadorCola.actual} de {indicadorCola.total})
                  </div>
                </div>
                <span className="text-sky-400 font-mono font-bold text-xs">{indicadorCola.porcentaje}%</span>
              </div>

              <div className="w-full bg-[#151922] h-2.5 rounded-full overflow-hidden border border-sky-500/20">
                <div
                  className="bg-gradient-to-r from-sky-500 to-cyan-400 h-full transition-all duration-300 rounded-full"
                  style={{ width: `${indicadorCola.porcentaje}%` }}
                />
              </div>
            </div>
          )}

          {/* 4. RESUMEN FINAL AL TERMINAR */}
          {resumenFinal && (
            <div className="bg-[#0B0E14] border border-[#222736] rounded-2xl p-4 space-y-3">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Proceso de subida completado</span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 p-2.5 rounded-xl">
                  <div className="font-bold">Subidas: {resumenFinal.exitosas}</div>
                  <div className="text-[11px] text-emerald-400/80 mt-0.5">Guardadas con éxito</div>
                </div>
                <div className="bg-sky-500/10 border border-sky-500/30 text-sky-300 p-2.5 rounded-xl">
                  <div className="font-bold">Omitidas por duplicado: {resumenFinal.omitidasDuplicadas}</div>
                  <div className="text-[11px] text-sky-400/80 mt-0.5">Ya existían en la app</div>
                </div>
                <div className="bg-amber-500/10 border border-amber-500/30 text-amber-300 p-2.5 rounded-xl">
                  <div className="font-bold">Fallidas por peso: {resumenFinal.fallidas}</div>
                  <div className="text-[11px] text-amber-400/80 mt-0.5">Límite 20MB o formato</div>
                </div>
              </div>

              {resumenFinal.detallesFallidas.length > 0 && (
                <div className="max-h-28 overflow-y-auto rounded-xl bg-black/40 p-2.5 space-y-1 text-[11px] border border-white/5">
                  <p className="text-slate-400 font-semibold mb-1">Detalle de archivos omitidos:</p>
                  {resumenFinal.detallesFallidas.map((item, idx) => (
                    <div key={idx} className="flex justify-between text-slate-400 truncate">
                      <span className="truncate pr-2">• {item.nombre}</span>
                      <span className="text-amber-400 shrink-0">{item.motivo}</span>
                    </div>
                  ))}
                </div>
              )}

              <button
                type="button"
                onClick={onClose}
                className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Aceptar y ver en biblioteca
              </button>
            </div>
          )}

          {/* Botón de Envío */}
          {!resumenFinal && (
            <button
              type="submit"
              disabled={
                uploading ||
                leyendoMetadatos ||
                (modoSubida === 'archivo' && !audioFile) ||
                (modoSubida === 'carpeta' && carpetaArchivosValidos.length === 0)
              }
              className="w-full py-3.5 px-4 rounded-xl font-bold text-sm text-white shadow-lg transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed bg-gradient-to-r from-sky-600 via-[#1D88BC] to-cyan-500 hover:from-sky-500 hover:to-cyan-400 shadow-sky-600/30"
            >
              {uploading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-white" />
                  <span>Subiendo canciones a la nube...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>
                    {modoSubida === 'carpeta'
                      ? `Subir ${carpetaArchivosValidos.length} canciones con metadatos`
                      : 'Subir Canción a Telegram'}
                  </span>
                </>
              )}
            </button>
          )}
        </form>
      </div>
    </div>
  );
}
