import fs from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';
import { fileURLToPath } from 'url';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const LOCAL_UPLOAD_DIR = path.join(__dirname, '../../uploads');

// Env is read lazily (not at import time) so dotenv can load first.
function readConfig() {
  const {
    R2_ACCOUNT_ID,
    R2_ACCESS_KEY_ID,
    R2_SECRET_ACCESS_KEY,
    R2_BUCKET,
    R2_PUBLIC_URL,
  } = process.env;
  return {
    accountId: (R2_ACCOUNT_ID || '').trim(),
    accessKeyId: (R2_ACCESS_KEY_ID || '').trim(),
    secretAccessKey: (R2_SECRET_ACCESS_KEY || '').trim(),
    bucket: (R2_BUCKET || '').trim(),
    publicUrl: (R2_PUBLIC_URL || '').trim().replace(/\/+$/, ''),
  };
}

export function isR2Configured() {
  const c = readConfig();
  return Boolean(c.accountId && c.accessKeyId && c.secretAccessKey && c.bucket && c.publicUrl);
}

let cachedClient = null;
let cachedClientKey = '';

function getClient(c) {
  const cacheKey = `${c.accountId}:${c.accessKeyId}:${c.secretAccessKey}`;
  if (!cachedClient || cachedClientKey !== cacheKey) {
    cachedClient = new S3Client({
      region: 'auto',
      endpoint: `https://${c.accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: c.accessKeyId,
        secretAccessKey: c.secretAccessKey,
      },
    });
    cachedClientKey = cacheKey;
  }
  return cachedClient;
}

function safeExt(ext) {
  const clean = String(ext || '').replace(/^\./, '').toLowerCase();
  return /^[a-z0-9]{1,8}$/.test(clean) ? clean : 'bin';
}

/**
 * Stores an already-validated image buffer.
 * - R2 configured: uploads to the bucket and returns `${R2_PUBLIC_URL}/${key}`.
 * - Otherwise: writes to backend/uploads/ and returns `/uploads/${filename}`.
 */
export async function uploadImageBuffer({ buffer, contentType, ext }) {
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
    throw new Error('uploadImageBuffer: buffer is required');
  }

  const name = `${Date.now()}-${randomUUID()}.${safeExt(ext)}`;

  if (isR2Configured()) {
    const c = readConfig();
    const key = `announcements/${name}`;
    await getClient(c).send(
      new PutObjectCommand({
        Bucket: c.bucket,
        Key: key,
        Body: buffer,
        ContentType: contentType,
        CacheControl: 'public, max-age=31536000, immutable',
      })
    );
    return `${c.publicUrl}/${key}`;
  }

  await fs.mkdir(LOCAL_UPLOAD_DIR, { recursive: true });
  await fs.writeFile(path.join(LOCAL_UPLOAD_DIR, name), buffer);
  return `/uploads/${name}`;
}
