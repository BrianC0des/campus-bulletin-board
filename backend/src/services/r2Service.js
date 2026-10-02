import { PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { r2Client, R2_BUCKET, R2_PUBLIC_URL } from '../config/r2.js';

/**
 * Uploads an announcement image to Cloudflare R2
 * Key format: announcements/{announcement-id}/{image-version}
 */
export async function uploadAnnouncementImage(key, buffer, mimeType) {
  // TODO: PutObjectCommand
  return { key, url: `${R2_PUBLIC_URL}/${key}` };
}

/**
 * Deletes an announcement image from Cloudflare R2
 */
export async function deleteAnnouncementImage(key) {
  // TODO: DeleteObjectCommand
  return { success: true };
}
