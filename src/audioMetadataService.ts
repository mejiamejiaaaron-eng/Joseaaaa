import * as mm from 'music-metadata-browser';
import { uploadCoverToR2 } from './r2Client';
import { doc, setDoc } from 'firebase/firestore';
import { db } from './firebase';

// Portada por defecto de alta fidelidad para canciones sin portada en iTunes
export const DEFAULT_SONG_COVER = 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80';

// Catálogo de portadas de alta fidelidad por género musical
export const GENRE_COVERS: Record<string, string> = {
  'Corridos': 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=600&auto=format&fit=crop&q=80',
  'Corridos Tumbados': 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&auto=format&fit=crop&q=80',
  'Banda': 'https://images.unsplash.com/photo-1511192336575-5a79af67a629?w=600&auto=format&fit=crop&q=80',
  'Regional Mexicano': 'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?w=600&auto=format&fit=crop&q=80',
  'Reggaeton': 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=600&auto=format&fit=crop&q=80',
  'Pop': 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=600&auto=format&fit=crop&q=80',
  'Rock': 'https://images.unsplash.com/photo-1498038432885-c6f3f1b912ee?w=600&auto=format&fit=crop&q=80',
  'Salsa': 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=600&auto=format&fit=crop&q=80',
  'Bachata': 'https://images.unsplash.com/photo-1445985543470-41fdd5c31447?w=600&auto=format&fit=crop&q=80',
  'Cumbia': 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&auto=format&fit=crop&q=80',
  'Merengue': 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=600&auto=format&fit=crop&q=80',
  'Baladas Románticas': 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=600&auto=format&fit=crop&q=80',
  'Música Cristiana': 'https://images.unsplash.com/photo-1438232992991-995b7058bbb3?w=600&auto=format&fit=crop&q=80',
  'Trap': 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=600&auto=format&fit=crop&q=80',
  'Hip Hop': 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=600&auto=format&fit=crop&q=80',
  'Rap': 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=600&auto=format&fit=crop&q=80',
  'Electrónica': 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=600&auto=format&fit=crop&q=80',
  'Sin Categoría': 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80',
  'Otros': 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80',
};

/**
 * 1. Corrección de Encoding UTF-8:
 * Corrige problemas de mojibake (caracteres mal decodificados como 'MÃºsica' o tildes eliminadas como 'M sica').
 */
export function fixUtf8Encoding(text: string | null | undefined): string {
  if (!text) return '';
  let str = String(text).trim();

  // Eliminar caracteres nulos o de control ilegibles
  str = str.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

  // Corregir mojibake típico UTF-8 mal interpretado como ISO-8859-1 / Windows-1252
  if (/[\u00C2\u00C3\u00E0-\u00FF]/.test(str)) {
    try {
      const bytes = new Uint8Array(Array.from(str).map((c) => c.charCodeAt(0) & 0xff));
      const recovered = new TextDecoder('utf-8', { fatal: false }).decode(bytes);
      if (recovered && !recovered.includes('\uFFFD') && recovered.length <= str.length) {
        str = recovered;
      }
    } catch (_) {}
  }

  // Corregir palabras en español donde la vocal con tilde fue convertida erróneamente en espacio o carácter perdido
  str = str.replace(/\bC\s+mo\b/g, 'Cómo');
  str = str.replace(/\bc\s+mo\b/g, 'cómo');
  str = str.replace(/\bD\s+nde\b/g, 'Dónde');
  str = str.replace(/\bd\s+nde\b/g, 'dónde');
  str = str.replace(/\bM\s+sica\b/g, 'Música');
  str = str.replace(/\bm\s+sica\b/g, 'música');
  str = str.replace(/\bCu\s+ndo\b/g, 'Cuándo');
  str = str.replace(/\bcu\s+ndo\b/g, 'cuándo');
  str = str.replace(/\bPor\s+qu\s+\b/g, 'Por qué ');
  str = str.replace(/\bpor\s+qu\s+\b/g, 'por qué ');
  str = str.replace(/\bQu\s+\b/g, 'Qué ');
  str = str.replace(/\bqu\s+\b/g, 'qué ');
  str = str.replace(/\bcanci\s+n\b/gi, 'canción');
  str = str.replace(/\bCanci\s+n\b/gi, 'Canción');
  str = str.replace(/\bcoraz\s+n\b/gi, 'corazón');
  str = str.replace(/\bCoraz\s+n\b/gi, 'Corazón');
  str = str.replace(/\bacci\s+n\b/gi, 'acción');
  str = str.replace(/\bAcci\s+n\b/gi, 'Acción');
  str = str.replace(/\btambi\s+n\b/gi, 'también');
  str = str.replace(/\bTambi\s+n\b/gi, 'También');
  str = str.replace(/\badi\s+s\b/gi, 'adiós');
  str = str.replace(/\bAdi\s+s\b/gi, 'Adiós');
  str = str.replace(/\best\s+s\b/gi, 'estás');
  str = str.replace(/\bEst\s+s\b/gi, 'Estás');
  str = str.replace(/\bm\s+s\b/gi, 'más');
  str = str.replace(/\bM\s+s\b/gi, 'Más');
  str = str.replace(/\bs\s+lo\b/gi, 'sólo');
  str = str.replace(/\bS\s+lo\b/gi, 'Sólo');
  str = str.replace(/\bt\s+tulo\b/gi, 'título');
  str = str.replace(/\bT\s+tulo\b/gi, 'Título');
  str = str.replace(/\bedici\s+n\b/gi, 'edición');
  str = str.replace(/\bEdici\s+n\b/gi, 'Edición');
  str = str.replace(/\bversi\s+n\b/gi, 'versión');
  str = str.replace(/\bVersi\s+n\b/gi, 'Versión');
  str = str.replace(/\bilusi\s+n\b/gi, 'ilusión');
  str = str.replace(/\bIlusi\s+n\b/gi, 'Ilusión');
  str = str.replace(/\btraici\s+n\b/gi, 'traición');
  str = str.replace(/\bTraici\s+n\b/gi, 'Traición');
  str = str.replace(/\bpasi\s+n\b/gi, 'pasión');
  str = str.replace(/\bPasi\s+n\b/gi, 'Pasión');
  str = str.replace(/\b\s*xito\b/gi, 'Éxito');
  str = str.replace(/\bRom\s+ntica\b/gi, 'Romántica');
  str = str.replace(/\brom\s+ntica\b/gi, 'romántica');
  str = str.replace(/\bElectr\s+nica\b/gi, 'Electrónica');
  str = str.replace(/\belectr\s+nica\b/gi, 'electrónica');
  str = str.replace(/\bReggaet\s+n\b/gi, 'Reggaetón');
  str = str.replace(/\breggaet\s+n\b/gi, 'reggaetón');

  // Normalizar Unicode estándar NFC
  try {
    str = str.normalize('NFC');
  } catch (_) {}

  return str.trim();
}

/**
 * Función que limpia y recupera tildes y caracteres perdidos en títulos de canciones.
 * Reemplaza vocales perdidas ('C mo' -> 'Cómo', 'D nde' -> 'Dónde', 'M sica' -> 'Música')
 * y quita extensiones, marcas de descargas (_spotdown) y metadatos de rippers.
 */
export function limpiarTituloCancion(rawTitle: string | null | undefined): string {
  if (!rawTitle) return 'Canción';
  let str = fixUtf8Encoding(rawTitle);
  // Quitar extensiones de audio
  str = str.replace(/\.(mp3|wav|m4a|aac|flac|ogg)$/i, '');
  // Quitar tags tipo spotdown
  str = str.replace(/_?spotdown(?:\.org)?/gi, '');
  // Quitar números al inicio de pista (ej. "01 - ", "12. ", "03_")
  str = str.replace(/^\s*(?:\d+[\s._-]+)+/, '');
  // Quitar corchetes de calidad [128kbps], [Video Oficial], etc.
  str = str.replace(/\[.*?\]/g, ' ');
  // Quitar textos de rippers / YouTube
  str = str.replace(
    /\b(official\s+video|video\s+oficial|official\s+audio|audio\s+oficial|video\s+lyric|letra|lyrics|en\s+vivo|live|remix|hd|4k|1080p|hq|320kbps|128kbps|y2mate(?:\.is)?|mp3clan|snaptube|full\s+audio)\b/gi,
    ''
  );
  // Re-aplicar fixUtf8Encoding para normalizar vocales con tildes
  str = fixUtf8Encoding(str);
  str = str.replace(/[_]+/g, ' ').replace(/\s+/g, ' ').replace(/^[-–—\s]+|[-–—\s]+$/g, '').trim();
  return str || 'Canción';
}

/**
 * Extrae limpiamente artista y título a partir del nombre del archivo (ej: "Bad Bunny - Tití Me Preguntó.mp3")
 */
export function extractArtistAndTitleFromFilename(fileName: string): { artist: string; title: string } {
  const clean = (fileName || '')
    .replace(/\.[^/.]+$/, '')
    .replace(/_?spotdown(?:\.org)?/gi, '')
    .replace(/^\s*(?:\d+[\s._-]+)+/, '')
    .replace(
      /\b(official\s+video|video\s+oficial|official\s+audio|audio\s+oficial|video\s+lyric|letra|lyrics|en\s+vivo|live|remix|hd|4k|1080p|hq|320kbps|128kbps|y2mate(?:\.is)?|mp3clan|snaptube|full\s+audio)\b/gi,
      ''
    )
    .replace(/[\[\(\{]\s*[\]\)\}]/g, '')
    .replace(/[_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  let artist = '';
  let title = clean || 'Canción';

  if (clean.includes(' - ')) {
    const parts = clean.split(' - ');
    artist = parts[0].trim();
    title = parts.slice(1).join(' - ').trim();
  } else if (clean.includes(' — ')) {
    const parts = clean.split(' — ');
    artist = parts[0].trim();
    title = parts.slice(1).join(' — ').trim();
  } else if (clean.includes(' – ')) {
    const parts = clean.split(' – ');
    artist = parts[0].trim();
    title = parts.slice(1).join(' – ').trim();
  } else if (clean.toLowerCase().includes(' by ')) {
    const parts = clean.split(/ by /i);
    title = parts[0].trim();
    artist = parts[1].trim();
  }

  return {
    artist: fixUtf8Encoding(artist),
    title: fixUtf8Encoding(title) || 'Canción'
  };
}

/**
 * Filtro y normalización para Artista:
 * Si el campo dice literalmente 'Artista', 'Desconocido', etc., devuelve 'Artista Desconocido'.
 */
export function cleanArtist(rawArtist: string | null | undefined, fallback: string = 'Artista Desconocido'): string {
  const fixed = fixUtf8Encoding(rawArtist);
  const normalized = fixed.toLowerCase().replace(/[\s._\-]+/g, '');
  if (
    !fixed ||
    normalized === 'artista' ||
    normalized === 'musica' ||
    normalized === 'msica' ||
    normalized === 'music' ||
    normalized === 'unknown' ||
    normalized === 'unknownartist' ||
    normalized === 'desconocido' ||
    normalized === 'artistadesconocido'
  ) {
    return 'Artista Desconocido';
  }
  return fixed;
}

/**
 * Filtro de basura para Género:
 * Si es simplemente 'Música', 'Music', 'Unknown', etc., devuelve 'Sin Categoría'.
 */
export function cleanGenre(rawGenre: string | null | undefined, fallback: string = 'Sin Categoría'): string {
  const fixed = fixUtf8Encoding(rawGenre);
  // Eliminar números ID3 como "(13)" o "13"
  const stripped = fixed.replace(/^\(\d+\)/, '').trim();
  const normalized = stripped.toLowerCase().replace(/[\s._\-]+/g, '');

  if (
    !stripped ||
    normalized === 'musica' ||
    normalized === 'msica' ||
    normalized === 'music' ||
    normalized === 'unknown' ||
    normalized === 'other' ||
    normalized === 'otros' ||
    normalized === 'none' ||
    normalized === 'general' ||
    normalized === 'audio' ||
    normalized === 'sincategoria'
  ) {
    return fallback;
  }
  return stripped;
}

/**
 * Limpieza de Título con fallback al nombre de archivo limpio
 */
export function cleanTitle(rawTitle: string | null | undefined, fileName: string): string {
  const fixed = fixUtf8Encoding(rawTitle);
  const normalized = fixed.toLowerCase().replace(/[\s._\-]+/g, '');

  if (fixed && normalized !== 'musica' && normalized !== 'msica' && normalized !== 'music' && normalized !== 'audio' && normalized !== 'track') {
    return fixed;
  }

  // Fallback: nombre del archivo sin extensiones ni marcas de rippers
  const parsed = extractArtistAndTitleFromFilename(fileName);
  return parsed.title || 'Canción';
}

export interface ExtractedAudioMetadata {
  title: string;
  artist: string;
  genre: string;
  embeddedCoverBlob: Blob | null;
  embeddedCoverUrl: string | null;
  lyrics?: string;
}

/**
 * Extracción de metadatos reales de audio (Título, Artista, Género, Carátula, Letras)
 * utilizando music-metadata-browser con soporte nativo de UTF-8 y decodificación ID3.
 */
export async function extractRealAudioMetadata(
  file: File | Blob,
  fileName: string = 'audio.mp3'
): Promise<ExtractedAudioMetadata> {
  const effectiveName = file instanceof File ? file.name : fileName;
  let rawTitle: string | undefined;
  let rawArtist: string | undefined;
  let rawGenre: string | undefined;
  let embeddedCoverBlob: Blob | null = null;
  let embeddedCoverUrl: string | null = null;
  let lyrics: string | undefined;

  try {
    const metadata = await mm.parseBlob(file);
    const common = metadata.common || {};

    if (common.title) rawTitle = common.title;
    if (common.artist) rawArtist = common.artist;
    else if (common.artists && common.artists.length > 0) rawArtist = common.artists.join(', ');

    if (common.genre && common.genre.length > 0) {
      rawGenre = common.genre.join(', ');
    }

    if (common.lyrics && common.lyrics.length > 0) {
      lyrics = common.lyrics.join('\n');
    }

    const picture = mm.selectCover(common.picture);
    if (picture && picture.data && picture.data.length > 0) {
      const u8 = new Uint8Array(picture.data);
      embeddedCoverBlob = new Blob([u8], { type: picture.format || 'image/jpeg' });
      embeddedCoverUrl = URL.createObjectURL(embeddedCoverBlob);
    }
  } catch (err) {
    console.warn('[Metadata] Error con music-metadata-browser, usando fallback:', err);
  }

  // Aplicar extracción inteligente de título y artista si no vienen en ID3
  const fromFilename = extractArtistAndTitleFromFilename(effectiveName);

  let finalTitle = cleanTitle(rawTitle, effectiveName);
  if ((!rawTitle || finalTitle === 'Canción') && fromFilename.title) {
    finalTitle = fromFilename.title;
  }

  let finalArtist = cleanArtist(rawArtist, '');
  if (!finalArtist || finalArtist === 'Artista Desconocido' || finalArtist === 'Desconocido') {
    finalArtist = fromFilename.artist || 'Artista';
  }

  const finalGenre = cleanGenre(rawGenre, 'Sin Categoría');

  return {
    title: finalTitle,
    artist: finalArtist,
    genre: finalGenre,
    embeddedCoverBlob,
    embeddedCoverUrl,
    lyrics,
  };
}

/**
 * 2. Búsqueda Automática de Portadas en Internet (iTunes API):
 * Consulta https://itunes.apple.com/search?term={artista}+{titulo}&entity=song&limit=1
 * Devuelve la URL en alta resolución (600x600) y género si existe.
 */
export async function searchCoverInITunes(
  artist: string,
  title: string
): Promise<{ coverUrl: string; genre?: string; trackName?: string; artistName?: string } | null> {
  const cleanA = artist && artist !== 'Artista Desconocido' && artist !== 'Artista' ? artist.trim() : '';
  const cleanT = title ? title.trim() : '';

  const searchTerms = [
    cleanA && cleanT ? `${cleanA} ${cleanT}` : cleanT || cleanA,
    cleanT, // intento con solo título si falla la combinación
  ].filter(Boolean);

  for (const term of searchTerms) {
    try {
      const termEncoded = encodeURIComponent(term).replace(/%20/g, '+');
      const itunesUrl = `https://itunes.apple.com/search?term=${termEncoded}&entity=song&limit=1`;
      const res = await fetch(itunesUrl, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(3500)
      });

      if (!res.ok) continue;

      const data = await res.json();
      if (data && data.results && data.results.length > 0) {
        const item = data.results[0];
        if (item.artworkUrl100) {
          // Reemplazar 100x100 por 600x600 en alta resolución
          const highRes = item.artworkUrl100
            .replace(/100x100(bb)?\.(jpg|png|webp)/i, '600x600$1.$2')
            .replace(/100x100/g, '600x600');

          return {
            coverUrl: highRes,
            genre: item.primaryGenreName ? fixUtf8Encoding(item.primaryGenreName) : undefined,
            trackName: item.trackName ? fixUtf8Encoding(item.trackName) : undefined,
            artistName: item.artistName ? fixUtf8Encoding(item.artistName) : undefined,
          };
        }
      }
    } catch (e) {
      console.warn(`[iTunes API] Error buscando "${term}":`, e);
    }
  }

  return null;
}

/**
 * Descarga una imagen remota y devuelve su Blob (con fallback por proxy del backend o Canvas si hay CORS).
 */
export async function downloadImageBlob(imageUrl: string): Promise<Blob> {
  // 1. Intento directo por fetch con timeout de 4 segundos
  try {
    const res = await fetch(imageUrl, { mode: 'cors', signal: AbortSignal.timeout(4000) });
    if (res.ok) {
      return await res.blob();
    }
  } catch (_) {}

  // 2. Intento por proxy del backend con timeout de 4 segundos
  try {
    const proxyUrl = `/api/proxy-image?url=${encodeURIComponent(imageUrl)}`;
    const proxyRes = await fetch(proxyUrl, { signal: AbortSignal.timeout(4000) });
    if (proxyRes.ok) {
      return await proxyRes.blob();
    }
  } catch (_) {}

  // 3. Intento vía Image + Canvas
  if (typeof document !== 'undefined') {
    try {
      const blob = await new Promise<Blob>((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = img.naturalWidth || 600;
          canvas.height = img.naturalHeight || 600;
          const ctx = canvas.getContext('2d');
          if (!ctx) return reject(new Error('Canvas 2D context no disponible'));
          ctx.drawImage(img, 0, 0);
          canvas.toBlob((b) => {
            if (b) resolve(b);
            else reject(new Error('Error convirtiendo canvas a blob'));
          }, 'image/jpeg', 0.95);
        };
        img.onerror = () => reject(new Error('Error cargando imagen en elemento Image'));
        img.src = imageUrl;
      });
      return blob;
    } catch (_) {}
  }

  throw new Error(`No se pudo descargar la portada de "${imageUrl}".`);
}

/**
 * Resuelve la portada de la canción buscando en iTunes, descargándola y subiéndola a Cloudflare R2
 * en la carpeta covers/. Si no se encuentra, usa fallback a R2 con imagen embebida o portada por defecto.
 */
export async function resolveCoverAndUploadToR2(
  artist: string,
  title: string,
  embeddedCoverBlob?: Blob | null
): Promise<string> {
  const sanitizedTitle = (title || 'cover').replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();

  // 1. Buscar portada en la API de iTunes en alta resolución (600x600)
  try {
    const itunesResult = await searchCoverInITunes(artist, title);

    if (itunesResult && itunesResult.coverUrl) {
      try {
        const blob = await downloadImageBlob(itunesResult.coverUrl);
        const r2Url = await uploadCoverToR2(blob, `${sanitizedTitle}-itunes.jpg`);
        return r2Url;
      } catch (r2Err) {
        console.warn('[Cover] Error subiendo portada de iTunes a R2, usando URL directa de iTunes:', r2Err);
        return itunesResult.coverUrl;
      }
    }
  } catch (itunesErr) {
    console.warn('[Cover] Error consultando iTunes API:', itunesErr);
  }

  // 2. Si no se encuentra en iTunes, usar carátula ID3 embebida si existe y subir a R2
  if (embeddedCoverBlob) {
    try {
      const r2Url = await uploadCoverToR2(embeddedCoverBlob, `${sanitizedTitle}-id3.jpg`);
      return r2Url;
    } catch (id3Err) {
      console.warn('[Cover] Error subiendo carátula embebida a R2:', id3Err);
    }
  }

  // 3. Fallback a portada por defecto
  return DEFAULT_SONG_COVER;
}

/**
 * Obtiene la portada representativa para una carpeta de género musical.
 */
export function getGenreCover(genreName: string): string {
  const normalized = cleanGenre(genreName);
  if (GENRE_COVERS[normalized]) {
    return GENRE_COVERS[normalized];
  }
  for (const [k, v] of Object.entries(GENRE_COVERS)) {
    if (normalized.toLowerCase().includes(k.toLowerCase()) || k.toLowerCase().includes(normalized.toLowerCase())) {
      return v;
    }
  }
  return DEFAULT_SONG_COVER;
}

/**
 * Obtiene automáticamente una URL de portada para una carpeta usando la API de Unsplash
 * basada en el nombre del género o título de la carpeta, con fallback a imagen por defecto.
 */
export function obtenerPortadaUnsplashCarpeta(nombreCarpeta: string): string {
  if (!nombreCarpeta || !nombreCarpeta.trim()) {
    return DEFAULT_SONG_COVER;
  }

  // Limpieza del nombre de la carpeta (quitar emojis, símbolos y guiones)
  const limpio = nombreCarpeta
    .replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '')
    .replace(/[._\-]+/g, ' ')
    .trim();

  // Formato Unsplash requerido: https://source.unsplash.com/400x400/?{nombre_carpeta},music
  const query = encodeURIComponent(limpio || 'music').replace(/%20/g, '+');
  return `https://source.unsplash.com/400x400/?${query},music`;
}

export interface FolderLike {
  id: string;
  titulo?: string;
  subtitulo?: string;
  descripcion?: string;
  coverKey?: string;
  coverUrl?: string;
  badge?: string;
}

/**
 * Asigna automáticamente una imagen de portada a una carpeta basada en su nombre
 * consultando la API de Unsplash (https://source.unsplash.com/400x400/?{nombre_carpeta},music)
 * con fallback a imagen por defecto si falla.
 * Guarda la URL de la imagen en Firebase Firestore para mantenerla al recargar.
 */
export async function asignarPortadaAutomaticaCarpeta(folder: FolderLike): Promise<string> {
  if (!folder) return DEFAULT_SONG_COVER;

  const nombreCarpeta = folder.titulo || folder.id;

  // 1. Si la carpeta ya cuenta con una portada personalizada subida a R2, conservarla
  const tieneR2 =
    (folder.coverUrl && (folder.coverUrl.includes('folder-covers') || folder.coverUrl.includes('r2.cloudflarestorage'))) ||
    (folder.coverKey && (folder.coverKey.includes('folder-covers') || folder.coverKey.includes('r2.cloudflarestorage')));

  if (tieneR2) {
    return folder.coverUrl || folder.coverKey || DEFAULT_SONG_COVER;
  }

  // 2. Si ya tiene una URL web válida http/https asignada previamente que NO sea un placeholder viejo, respetarla
  if (folder.coverUrl && (folder.coverUrl.startsWith('http://') || folder.coverUrl.startsWith('https://'))) {
    return folder.coverUrl;
  }
  if (folder.coverKey && (folder.coverKey.startsWith('http://') || folder.coverKey.startsWith('https://'))) {
    return folder.coverKey;
  }

  // 3. Generar la URL de la portada de Unsplash basada en el nombre de la carpeta: https://source.unsplash.com/400x400/?{nombre_carpeta},music
  const portadaGenerada = obtenerPortadaUnsplashCarpeta(nombreCarpeta);

  // Actualizar en el objeto en memoria
  folder.coverKey = portadaGenerada;
  folder.coverUrl = portadaGenerada;

  // 4. Guardar en Firebase Firestore para persistencia al recargar
  try {
    const payload = {
      id: folder.id,
      titulo: folder.titulo || folder.id,
      cover_key: portadaGenerada,
      cover_url: portadaGenerada,
      subtitulo: folder.subtitulo || '',
      descripcion: folder.descripcion || '',
      badge: folder.badge || '',
      updated_at: new Date().toISOString()
    };

    await setDoc(doc(db, 'folders', folder.id), payload, { merge: true });
  } catch (errDb) {
    console.warn('Nota guardando portada automática de carpeta en Firebase:', errDb);
  }

  return portadaGenerada;
}

