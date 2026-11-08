import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

// Variables de entorno de Cloudflare R2
export const R2_ACCESS_KEY_ID = import.meta.env.VITE_R2_ACCESS_KEY_ID || '';
export const R2_SECRET_ACCESS_KEY = import.meta.env.VITE_R2_SECRET_ACCESS_KEY || '';
export const R2_ENDPOINT = import.meta.env.VITE_R2_ENDPOINT || '';
export const R2_BUCKET_NAME = import.meta.env.VITE_R2_BUCKET_NAME || '';
export const R2_PUBLIC_URL = import.meta.env.VITE_R2_PUBLIC_URL || '';

// Inicialización del cliente S3 para Cloudflare R2
export const r2Client = new S3Client({
  region: 'auto',
  ...(R2_ENDPOINT ? { endpoint: R2_ENDPOINT } : {}),
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID || 'placeholder',
    secretAccessKey: R2_SECRET_ACCESS_KEY || 'placeholder',
  },
});

export { PutObjectCommand };

/**
 * Sube un archivo a Cloudflare R2 con PutObjectCommand y devuelve su URL pública.
 * Nombre único: Date.now() + "-" + nombreArchivo
 */
export async function uploadToR2(file: File): Promise<string> {
  if (!R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_ENDPOINT || !R2_BUCKET_NAME) {
    throw new Error(
      'Variables de Cloudflare R2 incompletas. Asegúrate de configurar VITE_R2_ACCESS_KEY_ID, VITE_R2_SECRET_ACCESS_KEY, VITE_R2_ENDPOINT y VITE_R2_BUCKET_NAME.'
    );
  }

  // Nombre único para el archivo
  const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const nombreUnico = `${Date.now()}-${sanitizedName}`;

  // Conversión a Uint8Array para compatibilidad en el navegador
  const arrayBuffer = await file.arrayBuffer();
  const fileBytes = new Uint8Array(arrayBuffer);

  const command = new PutObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: nombreUnico,
    Body: fileBytes,
    ContentType: file.type || 'audio/mpeg',
  });

  await r2Client.send(command);

  // Construcción de la URL pública
  let publicBase = (R2_PUBLIC_URL || '').trim();
  if (publicBase.endsWith('/')) {
    publicBase = publicBase.slice(0, -1);
  }

  const publicUrl = publicBase
    ? `${publicBase}/${nombreUnico}`
    : `${R2_ENDPOINT}/${R2_BUCKET_NAME}/${nombreUnico}`;

  return publicUrl;
}

/**
 * Sube una imagen de portada al bucket de Cloudflare R2 dentro de la carpeta covers/
 * y devuelve la URL pública correspondiente.
 */
export async function uploadCoverToR2(
  imageBlobOrFile: Blob | File,
  filename: string = 'cover.jpg'
): Promise<string> {
  if (!R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_ENDPOINT || !R2_BUCKET_NAME) {
    throw new Error(
      'Variables de Cloudflare R2 incompletas para subir portada. Verifica VITE_R2_ACCESS_KEY_ID, VITE_R2_SECRET_ACCESS_KEY, VITE_R2_ENDPOINT y VITE_R2_BUCKET_NAME.'
    );
  }

  const sanitized = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
  const key = `covers/${Date.now()}-${sanitized}`;

  const arrayBuffer = await imageBlobOrFile.arrayBuffer();
  const fileBytes = new Uint8Array(arrayBuffer);

  const command = new PutObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: key,
    Body: fileBytes,
    ContentType: imageBlobOrFile.type || 'image/jpeg',
  });

  await r2Client.send(command);

  let publicBase = (R2_PUBLIC_URL || '').trim();
  if (publicBase.endsWith('/')) {
    publicBase = publicBase.slice(0, -1);
  }

  const publicUrl = publicBase
    ? `${publicBase}/${key}`
    : `${R2_ENDPOINT}/${R2_BUCKET_NAME}/${key}`;

  return publicUrl;
}

/**
 * Sube una imagen de portada de carpeta al bucket de Cloudflare R2 dentro de folder-covers/
 * y devuelve la URL pública correspondiente.
 */
export async function uploadFolderCoverToR2(
  imageBlobOrFile: Blob | File,
  filename: string = 'folder_cover.jpg'
): Promise<string> {
  if (!R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_ENDPOINT || !R2_BUCKET_NAME) {
    throw new Error(
      'Variables de Cloudflare R2 incompletas para subir portada. Verifica VITE_R2_ACCESS_KEY_ID, VITE_R2_SECRET_ACCESS_KEY, VITE_R2_ENDPOINT y VITE_R2_BUCKET_NAME.'
    );
  }

  const sanitized = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
  const key = `folder-covers/${Date.now()}-${sanitized}`;

  const arrayBuffer = await imageBlobOrFile.arrayBuffer();
  const fileBytes = new Uint8Array(arrayBuffer);

  const command = new PutObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: key,
    Body: fileBytes,
    ContentType: imageBlobOrFile.type || 'image/jpeg',
  });

  await r2Client.send(command);

  let publicBase = (R2_PUBLIC_URL || '').trim();
  if (publicBase.endsWith('/')) {
    publicBase = publicBase.slice(0, -1);
  }

  const publicUrl = publicBase
    ? `${publicBase}/${key}`
    : `${R2_ENDPOINT}/${R2_BUCKET_NAME}/${key}`;

  return publicUrl;
}


