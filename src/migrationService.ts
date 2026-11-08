import { createClient } from '@supabase/supabase-js';
import { collection, doc, writeBatch } from 'firebase/firestore';
import { db } from './firebase';

export interface MigrationStatus {
  isRunning: boolean;
  songsCount: number;
  foldersCount: number;
  message: string;
  error: string | null;
}

/**
 * Normaliza cualquier formato de URL de Supabase para evitar errores de ruta en PostgREST
 * (ej: quita /rest/v1, trailing slashes, comillas, URLs del dashboard, o añade https:// si falta)
 */
export function normalizeSupabaseUrl(rawUrl: string): string {
  let url = (rawUrl || '').trim();
  // Quitar comillas accidentales
  url = url.replace(/^["']+|["']+$/g, '').trim();

  // Si el usuario pegó la URL del panel de control de Supabase:
  // https://supabase.com/dashboard/project/djqjagjaywphhaoonbdq
  const dashboardMatch = url.match(/supabase\.com\/dashboard\/project\/([a-zA-Z0-9_-]+)/i);
  if (dashboardMatch && dashboardMatch[1]) {
    return `https://${dashboardMatch[1]}.supabase.co`;
  }

  // Si solo introdujo el ID o subdominio del proyecto (ej: djqjagjaywphhaoonbdq)
  if (/^[a-zA-Z0-9_-]{15,35}$/.test(url)) {
    return `https://${url}.supabase.co`;
  }

  // Asegurar protocolo https://
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = `https://${url}`;
  }

  // Quitar endpoints como /rest/v1, /rest, /auth/v1, etc.
  url = url.replace(/\/(rest|auth|storage|graphql)(?:\/v\d+)?(?:\/.*)?$/i, '');

  // Quitar barras finales
  url = url.replace(/\/+$/, '');

  return url;
}

/**
 * Función asíncrona de Migración Mágica (Supabase -> Firebase Firestore)
 * Optimizada con Escrituras por Lotes (writeBatch):
 * 1. Trae canciones y carpetas de Supabase con .limit(500).
 * 2. Usa writeBatch(db) y batch.set(doc(collection(db, 'songs')), cancion).
 * 3. Ejecuta batch.commit() para inserciones casi instantáneas.
 * 4. Aplica el mismo procedimiento para las carpetas en 'folders'.
 * 5. Manejo completo de errores con try...catch...finally.
 * 6. Muestra un alert('Migración completada').
 */
export async function migrarDeSupabaseAFirebase(
  customSupabaseUrl?: string,
  customSupabaseKey?: string,
  customSongTableOrProgress?: string | ((status: { message: string; songsCount: number; foldersCount: number }) => void),
  customFolderTable?: string | ((status: { message: string; songsCount: number; foldersCount: number }) => void),
  progressCallback?: (status: { message: string; songsCount: number; foldersCount: number }) => void
): Promise<{ songsCount: number; foldersCount: number }> {
  // Manejo polimórfico de argumentos: permite migrarDeSupabaseAFirebase(url, key, onProgress)
  // o migrarDeSupabaseAFirebase(url, key, 'songs', 'folders', onProgress)
  let actualSongTable = 'songs';
  let actualFolderTable = 'folders';
  let onProgress: ((status: { message: string; songsCount: number; foldersCount: number }) => void) | undefined = progressCallback;

  if (typeof customSongTableOrProgress === 'function') {
    onProgress = customSongTableOrProgress;
    actualSongTable = 'songs';
    actualFolderTable = 'folders';
  } else if (typeof customSongTableOrProgress === 'string' && customSongTableOrProgress.trim()) {
    actualSongTable = customSongTableOrProgress.trim();
  }

  if (typeof customFolderTable === 'function') {
    onProgress = customFolderTable;
    actualFolderTable = 'folders';
  } else if (typeof customFolderTable === 'string' && customFolderTable.trim()) {
    actualFolderTable = customFolderTable.trim();
  }

  const rawUrl =
    (customSupabaseUrl && customSupabaseUrl.trim()) ||
    import.meta.env.VITE_SUPABASE_URL ||
    'https://djqjagjaywphhaoonbdq.supabase.co';

  const supabaseUrl = normalizeSupabaseUrl(rawUrl);

  const rawKey =
    (customSupabaseKey && customSupabaseKey.trim()) ||
    import.meta.env.VITE_SUPABASE_ANON_KEY ||
    '';

  const supabaseKey = rawKey.replace(/^["']+|["']+$/g, '').trim();

  if (!supabaseKey) {
    const errorMsg =
      'Por favor proporciona la Supabase Anon Key para poder conectar con la base de datos antigua.';
    alert(errorMsg);
    throw new Error(errorMsg);
  }

  let songsCount = 0;
  let foldersCount = 0;

  try {
    onProgress?.({
      message: `Conectando con Supabase (${supabaseUrl})...`,
      songsCount: 0,
      foldersCount: 0
    });

    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false }
    });

    // 1. DESCUBRIMIENTO DE TABLAS MEDIANTE OPENAPI DE SUPABASE
    const candidateSongTables = Array.from(
      new Set([actualSongTable || 'songs', 'songs', 'canciones', 'tracks', 'audios', 'musica'])
    );
    const candidateFolderTables = Array.from(
      new Set([actualFolderTable || 'folders', 'folders', 'playlists', 'carpetas'])
    );

    try {
      const openApiUrl = `${supabaseUrl}/rest/v1/?apikey=${encodeURIComponent(supabaseKey)}`;
      const openApiRes = await fetch(openApiUrl, {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`
        }
      });

      if (openApiRes.ok) {
        const openApiJson = (await openApiRes.json()) as any;
        const availablePaths = Object.keys(openApiJson?.paths || {}).map((p) => p.replace(/^\//, ''));
        console.log('[Migración] Tablas detectadas en el proyecto Supabase:', availablePaths);

        for (const t of availablePaths) {
          if (candidateSongTables.includes(t)) {
            candidateSongTables.splice(candidateSongTables.indexOf(t), 1);
            candidateSongTables.unshift(t);
          }
          if (candidateFolderTables.includes(t)) {
            candidateFolderTables.splice(candidateFolderTables.indexOf(t), 1);
            candidateFolderTables.unshift(t);
          }
        }
      }
    } catch (schemaErr) {
      console.warn('[Migración] No se pudo consultar el esquema OpenAPI previo:', schemaErr);
    }

    // 2. CONSULTAR TABLA DE CANCIONES EN SUPABASE CON .limit(500)
    let songsData: any[] = [];
    let foundSongTable = '';
    let lastSongError: any = null;

    for (const tableName of candidateSongTables) {
      onProgress?.({
        message: `Buscando canciones en la tabla "${tableName}" (límite 500)...`,
        songsCount: 0,
        foldersCount: 0
      });

      try {
        const { data, error } = await supabase.from(tableName).select('*').limit(500);
        if (!error && Array.isArray(data)) {
          songsData = data;
          foundSongTable = tableName;
          console.log(`[Migración] Éxito: ${data.length} canciones encontradas en tabla "${tableName}"`);
          break;
        } else if (error) {
          lastSongError = error;
        }
      } catch (errCatch: any) {
        lastSongError = errCatch;
      }
    }

    if (!foundSongTable && lastSongError) {
      const isInvalidPath = String(lastSongError.message || lastSongError).includes('Invalid path');
      const hint = isInvalidPath
        ? ` No se encontró ninguna tabla coincidente (${candidateSongTables.join(', ')}). Si tu tabla tiene otro nombre en Supabase, indícalo en el campo "Tabla Canciones".`
        : '';
      const msg = `Error al consultar canciones en Supabase: ${lastSongError.message || lastSongError}.${hint}`;
      alert(msg);
      throw new Error(msg);
    }

    // 3. GUARDAR CANCIONES MEDIANTE ESCRITURA POR LOTES (writeBatch)
    if (songsData && songsData.length > 0) {
      onProgress?.({
        message: `Preparando lote de ${songsData.length} canciones para Firebase Firestore...`,
        songsCount: 0,
        foldersCount: 0
      });

      // Firebase Firestore permite un máximo de 500 operaciones por lote
      const BATCH_LIMIT = 450;
      for (let i = 0; i < songsData.length; i += BATCH_LIMIT) {
        const chunk = songsData.slice(i, i + BATCH_LIMIT);
        const batch = writeBatch(db);

        for (const cancion of chunk) {
          const songDocRef = doc(collection(db, 'songs'));
          batch.set(songDocRef, {
            ...cancion,
            migrated_from_supabase: true,
            migrated_at: new Date().toISOString()
          });
        }

        onProgress?.({
          message: `Escribiendo lote de ${chunk.length} canciones en Firebase Firestore...`,
          songsCount: i,
          foldersCount: 0
        });

        await batch.commit();
        songsCount += chunk.length;
      }

      console.log(`[Migración] ${songsCount} canciones guardadas instantáneamente mediante writeBatch.`);
    }

    // 4. CONSULTAR Y GUARDAR CARPETAS EN FIREBASE FIRESTORE MEDIANTE writeBatch
    let foldersData: any[] = [];
    let foundFolderTable = '';

    for (const tableName of candidateFolderTables) {
      try {
        const { data, error } = await supabase.from(tableName).select('*').limit(500);
        if (!error && Array.isArray(data) && data.length > 0) {
          foldersData = data;
          foundFolderTable = tableName;
          console.log(`[Migración] Éxito: ${data.length} carpetas encontradas en tabla "${tableName}"`);
          break;
        }
      } catch (_) {}
    }

    if (foldersData && foldersData.length > 0) {
      onProgress?.({
        message: `Guardando ${foldersData.length} carpetas de "${foundFolderTable}" en lote...`,
        songsCount,
        foldersCount: 0
      });

      const folderBatch = writeBatch(db);
      for (const folder of foldersData) {
        const folderRef = folder.id
          ? doc(db, 'folders', String(folder.id))
          : doc(collection(db, 'folders'));

        folderBatch.set(folderRef, {
          ...folder,
          migrated_from_supabase: true,
          migrated_at: new Date().toISOString()
        }, { merge: true });
      }

      await folderBatch.commit();
      foldersCount = foldersData.length;
      console.log(`[Migración] ${foldersCount} carpetas guardadas instantáneamente mediante writeBatch.`);
    }

    onProgress?.({
      message: `¡Migración completada! ${songsCount} canciones y ${foldersCount} carpetas guardadas en Firebase.`,
      songsCount,
      foldersCount
    });

    // 5. MUESTRA UN ALERT AL TERMINAR QUE DIGA 'Migración completada'
    alert('Migración completada');

    return { songsCount, foldersCount };
  } catch (error: any) {
    console.error('[Migración] Error fatal durante la migración por lotes:', error);
    onProgress?.({
      message: `Error en la migración: ${error?.message || 'Fallo inesperado'}`,
      songsCount,
      foldersCount
    });
    throw error;
  } finally {
    console.log('[Migración] Proceso de migración por lotes finalizado.');
  }
}
