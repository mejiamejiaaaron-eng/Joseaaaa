# Arquitectura de Almacenamiento: Cloudflare R2 (Caché Principal) + Telegram Bot API (Cold Storage)

Este módulo implementa una arquitectura híbrida de almacenamiento en la nube donde:
1. **Cloudflare R2** actúa como **Caché Caliente (Hot Cache)** y reproductor de alta velocidad con soporte de streaming HTTP Range.
2. **Telegram Bot API** actúa como **Almacenamiento en Frío (Cold Storage)** ilimitado y gratuito para resguardar los archivos MP3 originales.

---

## Flujo de Ejecución (Lógica Implementada)

```
                       [Reproductor de Música]
                                  │
                                  ▼
                    GET /audio/cancion_123.mp3
                                  │
                                  ▼
                   ¿Existe en Cloudflare R2?
                         │             │
                [SÍ] ────┘             └──── [NO]
                 │                            │
                 ▼                            ▼
          (Cache Hit)                  (Cache Miss)
   Sirve directo desde R2             Consulta Telegram Bot API
   con HTTP Range (200 / 206)                 │
                                              ▼
                                   Descarga Stream de Telegram
                                              │
                                   ┌──────────┴──────────┐
                                   ▼                     ▼
                             Guarda en R2         Sirve al usuario
                            (ctx.waitUntil)      (Reproducción inmediata)
```

---

## Despliegue en Cloudflare Workers

1. Entra a la carpeta del Worker:
   ```bash
   cd cloudflare-worker
   ```

2. Configura tu token de Telegram de manera segura:
   ```bash
   npx wrangler secret put TELEGRAM_BOT_TOKEN
   # Introduce tu token de Bot de Telegram (obtenido con @BotFather)
   ```

3. Despliega el Worker:
   ```bash
   npx wrangler deploy
   ```

4. Obtendrás una URL como:
   `https://spotyy-r2-telegram-cache.<tu-subdominio>.workers.dev`

---

## Cómo usarlo con tu App actual (Cero cambios en UI ni reproductor)

Para que tu reproductor de música actual use esta caché automática, simplemente apunta la variable `VITE_R2_PUBLIC_URL` a la URL de tu Worker:

```env
VITE_R2_PUBLIC_URL=https://spotyy-r2-telegram-cache.<tu-subdominio>.workers.dev
```

Cuando registres o reproduzcas una canción:
- **Canción estándar en R2:** `https://spotyy-r2-telegram-cache.../1741234567-cancion.mp3`
- **Canción con respaldo en Telegram:** `https://spotyy-r2-telegram-cache.../1741234567-cancion.mp3?tg_id=<TELEGRAM_FILE_ID>`

El reproductor HTML5 simplemente cargará esa URL sin notar ninguna diferencia. Si el archivo ya está en R2, se reproduce en milisegundos. Si no está en R2, el Worker lo descarga de Telegram, lo guarda en R2 y lo reproduce de inmediato.

---

## Consideración Técnica: Límite de 20 MB de la API Pública de Telegram

- **Límite estándar de la API Pública (`api.telegram.org`):** Los bots solo pueden descargar archivos de hasta **20 MB**. La mayoría de canciones MP3 pesan entre 3 MB y 12 MB, por lo que funcionan directamente.
- **Para archivos grandes (> 20 MB hasta 2000 MB / 2 GB, ej. audiolibros o sets completos):**
  Debes ejecutar una instancia propia del servidor oficial de Telegram Bot API en modo local:
  ```bash
  docker run -d -p 8081:8081 --name telegram-bot-api \
    -v telegram-bot-api-data:/var/lib/telegram-bot-api \
    aiogram/telegram-bot-api:latest \
    --local --api-id=<TU_API_ID> --api-hash=<TU_API_HASH>
  ```
  Y luego configurar en tu Worker o en `.env`:
  ```env
  TELEGRAM_API_ROOT=https://tu-servidor-local-telegram:8081
  ```
