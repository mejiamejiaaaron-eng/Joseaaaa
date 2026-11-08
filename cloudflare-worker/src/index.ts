/**
 * Cloudflare Worker: Cache Tier (R2) + Cold Storage Tier (Telegram Bot API)
 *
 * Arquitectura:
 * 1. Cache Hit (R2): Si el archivo existe en R2, se sirve de inmediato con soporte HTTP Range.
 * 2. Cache Miss (Telegram): Si no existe en R2, se descarga de Telegram Bot mediante streaming,
 *    se almacena automáticamente en R2 (vía ctx.waitUntil para cero latencia) y se sirve al usuario.
 */

export interface R2Object {
  key: string;
  version: string;
  size: number;
  etag: string;
  httpEtag: string;
  httpMetadata?: Record<string, string>;
  customMetadata?: Record<string, string>;
  range?: { offset: number; length: number };
  writeHttpMetadata: (headers: Headers) => void;
}

export interface R2ObjectBody extends R2Object {
  body: ReadableStream;
}

export interface R2Bucket {
  get(key: string, options?: any): Promise<R2ObjectBody | R2Object | null>;
  put(key: string, value: ReadableStream | ArrayBuffer | string | null, options?: any): Promise<R2Object>;
  head(key: string): Promise<R2Object | null>;
  delete(key: string | string[]): Promise<void>;
}

export interface ExecutionContext {
  waitUntil(promise: Promise<any>): void;
  passThroughOnException(): void;
}

export interface Env {
  R2_BUCKET: R2Bucket;
  TELEGRAM_BOT_TOKEN: string;
  TELEGRAM_API_ROOT?: string; // Por defecto https://api.telegram.org o http://host:8081 (servidor local para >20MB)
  TELEGRAM_CHAT_ID?: string;  // Chat ID por defecto: "-1003870072472"
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    // 1. Manejo de cabeceras CORS para streaming en navegador y reproductores HTML5
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, HEAD, OPTIONS',
          'Access-Control-Allow-Headers': '*',
          'Access-Control-Max-Age': '86400',
        },
      });
    }

    const url = new URL(request.url);

    // ========================================================
    // RUTA POST: SUBIR O RESPALDAR DIRECTAMENTE A TELEGRAM COLD STORAGE
    // ========================================================
    if (request.method === 'POST' && (url.pathname === '/upload-cold-storage' || url.pathname === '/api/upload-cold-storage')) {
      if (!env.TELEGRAM_BOT_TOKEN) {
        return new Response('Error: TELEGRAM_BOT_TOKEN no configurado en el Worker.', {
          status: 500,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        });
      }

      const chatId = env.TELEGRAM_CHAT_ID || '-1003870072472';
      const apiBase = (env.TELEGRAM_API_ROOT || 'https://api.telegram.org').replace(/\/+$/, '');

      try {
        const formData = await request.formData();
        const audioFile = formData.get('audio') || formData.get('file');

        if (!audioFile || !(audioFile instanceof File)) {
          return new Response(JSON.stringify({ error: 'Se requiere un archivo en el campo "audio" o "file"' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
          });
        }

        const title = (formData.get('title') as string) || audioFile.name.replace(/\.[^/.]+$/, '');
        const performer = (formData.get('performer') as string) || (formData.get('artist') as string) || 'Artista';

        // Preparar FormData para la API de Telegram sendAudio
        const tgFormData = new FormData();
        tgFormData.append('chat_id', chatId);
        tgFormData.append('audio', audioFile, audioFile.name);
        tgFormData.append('title', title);
        tgFormData.append('performer', performer);

        // Si se envió una portada extraída (thumbnail), adjuntarla a sendAudio de Telegram
        const thumbnailFile = formData.get('thumbnail') || formData.get('thumb');
        if (thumbnailFile && thumbnailFile instanceof File) {
          tgFormData.append('thumbnail', thumbnailFile, 'cover.jpg');
        }

        const tgSendUrl = `${apiBase}/bot${env.TELEGRAM_BOT_TOKEN}/sendAudio`;
        const tgRes = await fetch(tgSendUrl, {
          method: 'POST',
          body: tgFormData,
        });

        const tgJson = (await tgRes.json()) as any;
        if (!tgJson.ok) {
          return new Response(
            JSON.stringify({
              error: 'Error de Telegram al guardar en Cold Storage',
              description: tgJson.description,
              chat_id: chatId,
            }),
            {
              status: 502,
              headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
            }
          );
        }

        const audioResult = tgJson.result?.audio || tgJson.result?.document;
        const fileId = audioResult?.file_id;
        const fileUniqueId = audioResult?.file_unique_id;
        const messageId = tgJson.result?.message_id;

        // Parámetro para guardar o no en R2 (por defecto true)
        const saveToR2Raw = formData.get('save_to_r2');
        const saveToR2 = saveToR2Raw !== 'false';

        let sanitizedKey: string | null = null;
        if (saveToR2) {
          // Subir inmediatamente a R2 con ArrayBuffer para evitar corrupción de stream
          sanitizedKey = `${Date.now()}-${audioFile.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
          const audioBuffer = await audioFile.arrayBuffer();
          await env.R2_BUCKET.put(sanitizedKey, audioBuffer, {
            httpMetadata: { 
              contentType: 'audio/mpeg',
              cacheControl: 'public, max-age=31536000, immutable',
            },
            customMetadata: {
              telegram_file_id: fileId,
              telegram_chat_id: chatId,
              telegram_message_id: String(messageId),
              source: 'telegram-cold-storage',
            },
          });
        }

        const playbackKey = sanitizedKey || encodeURIComponent(audioFile.name.replace(/[^a-zA-Z0-9._-]/g, '_'));
        const responseMessage = saveToR2
          ? 'Canción guardada en Telegram y Caché (Máxima velocidad)'
          : 'Canción guardada solo en Telegram (Ahorro de espacio activado)';

        return new Response(
          JSON.stringify({
            success: true,
            message: responseMessage,
            save_to_r2: saveToR2,
            chat_id: chatId,
            file_id: fileId,
            file_unique_id: fileUniqueId,
            message_id: messageId,
            r2_key: sanitizedKey,
            playback_url: `${url.origin}/${playbackKey}?tg_id=${fileId}`,
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
          }
        );
      } catch (err: any) {
        return new Response(JSON.stringify({ error: err?.message || String(err) }), {
          status: 500,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        });
      }
    }

    if (request.method !== 'GET' && request.method !== 'HEAD') {
      return new Response('Method Not Allowed', { status: 405 });
    }

    // Obtener la clave única del archivo a partir de la ruta (ej: /cancion_123.mp3 o /audio/cancion_123.mp3)
    let key = decodeURIComponent(url.pathname.replace(/^\/+/, ''));
    if (key.startsWith('audio/')) key = key.replace(/^audio\//, '');
    if (key.startsWith('stream/')) key = key.replace(/^stream\//, '');

    if (!key) {
      return new Response('Error: Se requiere el identificador o nombre de archivo de audio.', {
        status: 400,
        headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Access-Control-Allow-Origin': '*' },
      });
    }

    // Identificador de Telegram: puede recibirse como parámetro URL (?tg_id=... o ?file_id=...) o en cabecera
    const telegramFileId =
      url.searchParams.get('tg_id') ||
      url.searchParams.get('file_id') ||
      request.headers.get('x-telegram-file-id');

    // ========================================================
    // PASO 1: BUSCAR PRIMERO EN CLOUDFLARE R2 (Caché Principal)
    // ========================================================
    const rangeHeader = request.headers.get('range');
    let r2Object: R2ObjectBody | R2Object | null = null;

    try {
      if (rangeHeader) {
        // Soporte de Range Requests (búsqueda y adelantado de audio en reproductores)
        r2Object = await env.R2_BUCKET.get(key, {
          range: request.headers,
          onlyIf: request.headers,
        });
      } else {
        r2Object = await env.R2_BUCKET.get(key);
      }
    } catch (err: any) {
      console.warn(`[R2] Nota al consultar clave "${key}":`, err?.message || err);
    }

    // ========================================================
    // PASO 2: CACHE HIT EN R2
    // ========================================================
    if (r2Object && 'body' in r2Object && r2Object.body) {
      const headers = new Headers();
      r2Object.writeHttpMetadata(headers);
      headers.set('etag', r2Object.httpEtag);
      headers.set('Accept-Ranges', 'bytes');
      headers.set('Access-Control-Allow-Origin', '*');
      headers.set('Access-Control-Expose-Headers', 'Content-Range, Content-Length, Accept-Ranges, ETag');
      headers.set('Cache-Control', 'public, max-age=31536000, immutable');
      headers.set('X-Storage-Tier', 'R2-Cache-Hit');

      if (!headers.has('Content-Type')) {
        headers.set('Content-Type', 'audio/mpeg');
      }

      const status = r2Object.range ? 206 : 200;
      return new Response(r2Object.body, { status, headers });
    }

    // ========================================================
    // PASO 3: CACHE MISS (DESCARGAR DE TELEGRAM COLD STORAGE)
    // ========================================================
    if (!telegramFileId) {
      return new Response(
        `El archivo "${key}" no existe en el almacenamiento R2 y no se proporcionó telegram_file_id (?tg_id=...) para recuperarlo del almacenamiento en frío.`,
        {
          status: 404,
          headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Access-Control-Allow-Origin': '*' },
        }
      );
    }

    if (!env.TELEGRAM_BOT_TOKEN) {
      return new Response(
        'Error de configuración: TELEGRAM_BOT_TOKEN no está definido en el Cloudflare Worker.',
        {
          status: 500,
          headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Access-Control-Allow-Origin': '*' },
        }
      );
    }

    const cleanToken = env.TELEGRAM_BOT_TOKEN.trim().replace(/^bot/i, '');
    const cleanFileId = telegramFileId.trim();

    try {
      const apiBase = (env.TELEGRAM_API_ROOT || 'https://api.telegram.org').trim().replace(/\/+$/, '');

      // 3.a Obtener la ruta de descarga mediante getFile
      const fileInfoUrl = `${apiBase}/bot${cleanToken}/getFile?file_id=${encodeURIComponent(cleanFileId)}`;
      const fileInfoRes = await fetch(fileInfoUrl);

      if (!fileInfoRes.ok) {
        const errorText = await fileInfoRes.text().catch(() => '');
        return new Response(
          JSON.stringify({
            error: `Error al consultar Telegram Bot API: HTTP ${fileInfoRes.status}`,
            telegram_response: errorText ? JSON.parse(errorText).catch?.(() => errorText) || errorText : null,
            tested_file_id: cleanFileId,
            consejo: 'Si la respuesta dice "Wrong file identifier" o "Wrong persistent file_id", verifica que el file_id pertenezca exactamente a este mismo Bot y no a otro bot o canal.',
          }, null, 2),
          {
            status: 502,
            headers: { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*' },
          }
        );
      }

      const fileInfo = (await fileInfoRes.json()) as {
        ok: boolean;
        description?: string;
        result?: { file_id: string; file_unique_id: string; file_size?: number; file_path?: string };
      };

      if (!fileInfo.ok || !fileInfo.result?.file_path) {
        return new Response(
          `Telegram Bot API no pudo resolver el archivo: ${fileInfo.description || 'file_id no encontrado'}`,
          {
            status: 404,
            headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Access-Control-Allow-Origin': '*' },
          }
        );
      }

      const filePath = fileInfo.result.file_path;
      const fileSize = fileInfo.result.file_size;

      // -----------------------------------------------------------------
      // MANEJO DEL LÍMITE DE 20 MB DE LA API PÚBLICA DE TELEGRAM:
      // Si usas api.telegram.org público, Telegram rechaza descargas > 20 MB.
      // Para audiolibros o archivos grandes > 20 MB hasta 2 GB:
      // Debes desplegar un contenedor de 'telegram-bot-api --local' y
      // configurar TELEGRAM_API_ROOT = "https://tu-servidor-local-telegram"
      // -----------------------------------------------------------------
      const isPublicTelegram = apiBase.includes('api.telegram.org');
      if (isPublicTelegram && fileSize && fileSize > 20 * 1024 * 1024) {
        return new Response(
          JSON.stringify({
            error: 'Telegram API 20MB Download Limit Exceeded',
            file_size_bytes: fileSize,
            file_size_mb: Number((fileSize / (1024 * 1024)).toFixed(2)),
            solucion:
              'Para archivos de audio superiores a 20 MB (hasta 2000 MB / 2 GB), configura un servidor local oficial de Telegram Bot API (telegram-bot-api --local) y asigna su URL en la variable TELEGRAM_API_ROOT.',
          }, null, 2),
          {
            status: 413,
            headers: {
              'Content-Type': 'application/json; charset=utf-8',
              'Access-Control-Allow-Origin': '*',
            },
          }
        );
      }

      // 3.b Descargar el archivo desde Telegram como un Stream
      const downloadUrl = `${apiBase}/file/bot${cleanToken}/${filePath}`;
      const telegramDownloadRes = await fetch(downloadUrl);

      if (!telegramDownloadRes.ok || !telegramDownloadRes.body) {
        return new Response(
          `Error al descargar stream de audio desde Telegram: HTTP ${telegramDownloadRes.status}`,
          { status: 502, headers: { 'Access-Control-Allow-Origin': '*' } }
        );
      }

      // 3.c Duplicar el stream mediante .tee() para no consumir memoria RAM
      // - streamForR2: Se envía directamente a R2 en segundo plano
      // - streamForUser: Se envía de inmediato al reproductor del usuario
      const [streamForR2, streamForUser] = telegramDownloadRes.body.tee();

      // Guardar automáticamente en Cloudflare R2 sin bloquear la reproducción inmediata
      const r2PutPromise = env.R2_BUCKET.put(key, streamForR2, {
        httpMetadata: {
          contentType: 'audio/mpeg',
          cacheControl: 'public, max-age=31536000, immutable',
        },
        customMetadata: {
          telegram_file_id: telegramFileId,
          cached_at: new Date().toISOString(),
          source: 'telegram-cold-storage',
        },
      });

      // ctx.waitUntil permite que la subida a R2 continúe en background sin retrasar la respuesta al usuario
      ctx.waitUntil(r2PutPromise);

      // 3.d Servir inmediatamente el stream de audio al reproductor
      const responseHeaders = new Headers();
      responseHeaders.set('Content-Type', 'audio/mpeg');
      responseHeaders.set('Accept-Ranges', 'bytes');
      responseHeaders.set('Access-Control-Allow-Origin', '*');
      responseHeaders.set('Access-Control-Expose-Headers', 'Content-Range, Content-Length, Accept-Ranges');
      responseHeaders.set('Cache-Control', 'public, max-age=31536000, immutable');
      responseHeaders.set('X-Storage-Tier', 'Telegram-Cold-Storage-Miss');

      if (fileSize) {
        responseHeaders.set('Content-Length', String(fileSize));
      }

      return new Response(streamForUser, {
        status: 200,
        headers: responseHeaders,
      });
    } catch (err: any) {
      console.error('[Worker] Excepción en Telegram Cold Storage:', err);
      return new Response(`Error interno al procesar audio: ${err?.message || err}`, {
        status: 500,
        headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Access-Control-Allow-Origin': '*' },
      });
    }
  },
};
