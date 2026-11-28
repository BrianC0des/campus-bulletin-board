import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { query } from '../config/db.js';
import { normalizeCollege } from '../utils/scope.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOADS_ROOT = path.resolve(__dirname, '../../uploads');
const GRAPH_API = 'https://graph.facebook.com/v19.0';
const FB_DEFAULT_TIMEOUT_MS = parseInt(process.env.FB_TIMEOUT_MS, 10) || 45000;
const FB_UPLOAD_TIMEOUT_MS = parseInt(process.env.FB_UPLOAD_TIMEOUT_MS, 10) || 120000;

// Graph API request with a hard timeout. The timer also covers reading the response body, so a stalled
// connection can never hang a request handler. Resolves to { res, data } (data is {} for non-JSON bodies).
async function fbRequest(url, options = {}) {
  const timeoutMs = options.timeoutMs || FB_DEFAULT_TIMEOUT_MS;
  const { timeoutMs: _, ...fetchOptions } = options;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...fetchOptions, signal: controller.signal });
    const data = await res.json().catch(() => ({}));
    return { res, data };
  } catch (err) {
    if (err?.name === 'AbortError') {
      throw new Error(`Facebook Graph API did not respond within ${Math.round(timeoutMs / 1000)} seconds.`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

function pageProfileUrl(pageId, token) {
  return `${GRAPH_API}/${encodeURIComponent(pageId)}?fields=id,name&access_token=${encodeURIComponent(token)}`;
}

function formatFbError(msg, fallback) {
  const text = String(msg || fallback || 'Facebook Graph API error');
  if (text.includes('publish_actions is deprecated')) {
    return 'Facebook rejected this because the ID or token is a User account instead of a Page Access Token. In Graph API Explorer, select "Get Page Access Token" for your Page (with pages_manage_posts & pages_read_engagement) and use that Page ID.';
  }
  return text;
}

// --- Per-college Page configuration (college_facebook_pages) ---------------
// 'ALL' is the Campus-Wide official Page; every other key is an upper-cased college code.

export async function getFacebookPageConfig(collegeCode) {
  const code = normalizeCollege(collegeCode);
  const result = await query(
    `SELECT college_code, page_id, page_name, page_access_token
     FROM college_facebook_pages
     WHERE college_code = $1`,
    [code]
  );
  const row = result.rows[0];
  if (!row) return null;
  return {
    collegeCode: row.college_code,
    pageId: row.page_id,
    pageName: row.page_name,
    token: row.page_access_token,
  };
}

export async function getFacebookStatus(collegeCode = 'ALL') {
  const college = normalizeCollege(collegeCode);
  const config = await getFacebookPageConfig(college);
  if (!config) {
    return { connected: false, mode: 'demo', college, pageId: null, pageName: null };
  }
  try {
    const { res, data } = await fbRequest(pageProfileUrl(config.pageId, config.token));
    if (!res.ok || data.error) {
      return {
        connected: false,
        mode: 'error',
        college,
        pageId: config.pageId,
        pageName: null,
        error: data?.error?.message || 'Invalid Facebook Page token',
      };
    }
    return { connected: true, mode: 'live', college, pageId: data.id, pageName: data.name };
  } catch (err) {
    return { connected: false, mode: 'error', college, pageId: config.pageId, pageName: null, error: err.message };
  }
}

export async function verifyAndSaveFacebookConfig({ collegeCode = 'ALL', pageId, accessToken, updatedBy = null }) {
  const college = normalizeCollege(collegeCode);
  const cleanId = String(pageId || '').trim();
  const cleanToken = String(accessToken || '').trim();
  if (!cleanId || !cleanToken) {
    throw new Error('Both Facebook Page ID and Page Access Token are required.');
  }
  if (cleanId.length > 120) {
    throw new Error('Facebook Page ID is too long.');
  }

  const { res, data } = await fbRequest(pageProfileUrl(cleanId, cleanToken));
  if (!res.ok || data.error) {
    throw new Error(data?.error?.message || 'Facebook Graph API rejected the Page ID or Access Token.');
  }

  const verifiedId = String(data.id || cleanId);
  const verifiedName = String(data.name || verifiedId).slice(0, 255);
  // If the user pasted a User Access Token, try /me/accounts to upgrade to the matching Page Access Token
  let resolvedToken = cleanToken;
  try {
    const { res: acctRes, data: acctData } = await fbRequest(
      `${GRAPH_API}/me/accounts?fields=id,name,access_token&access_token=${encodeURIComponent(cleanToken)}`
    );
    if (acctRes.ok && Array.isArray(acctData?.data)) {
      const match = acctData.data.find((p) => String(p.id) === verifiedId);
      if (match?.access_token) {
        resolvedToken = match.access_token;
      }
    }
  } catch {
    // Already a Page Access Token (or /me/accounts unavailable) — keep cleanToken
  }
  await query(
    `INSERT INTO college_facebook_pages (college_code, page_id, page_name, page_access_token, updated_by, updated_at)
     VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
     ON CONFLICT (college_code) DO UPDATE SET
       page_id = EXCLUDED.page_id,
       page_name = EXCLUDED.page_name,
       page_access_token = EXCLUDED.page_access_token,
       updated_by = EXCLUDED.updated_by,
       updated_at = CURRENT_TIMESTAMP`,
    [college, verifiedId, verifiedName, resolvedToken, updatedBy]
  );

  return { connected: true, mode: 'live', college, pageId: verifiedId, pageName: verifiedName };
}

export async function disconnectFacebookConfig(collegeCode = 'ALL') {
  const college = normalizeCollege(collegeCode);
  await query('DELETE FROM college_facebook_pages WHERE college_code = $1', [college]);
  return { connected: false, mode: 'demo', college, pageId: null, pageName: null };
}

export function buildDefaultFbMessage(ann) {
  const lines = [];
  const rawTitle = typeof ann?.title === 'string' ? ann.title.trim() : '';
  if (rawTitle && rawTitle !== 'Graphic Poster') {
    lines.push(rawTitle.toUpperCase());
  }
  const rawBody = typeof ann?.body === 'string' ? ann.body.trim() : '';
  if (rawBody) {
    lines.push(lines.length > 0 ? `\n${rawBody}` : rawBody);
  }

  const data = ann?.template_data && typeof ann.template_data === 'object' ? ann.template_data : {};
  const meta = [];
  if (data.event_date) meta.push(`📅 Date: ${data.event_date}`);
  if (data.event_time) meta.push(`🕒 Time: ${data.event_time}`);
  if (data.venue) meta.push(`📍 Venue: ${data.venue}`);
  if (data.deadline_date) meta.push(`⏳ Due: ${data.deadline_date}${data.deadline_time ? ` at ${data.deadline_time}` : ''}`);
  if (data.recipient) meta.push(`🏆 Recipient: ${data.recipient}${data.award ? ` — ${data.award}` : ''}`);
  if (meta.length > 0) lines.push(lines.length > 0 ? `\n${meta.join('\n')}` : meta.join('\n'));

  return lines.join('\n');
}

async function uploadBufferToFacebook({ pageId, token, buffer, filename = 'announcement.png', caption, published }) {
  const form = new FormData();
  form.append('access_token', token);
  form.append('published', published ? 'true' : 'false');
  if (caption) form.append('caption', caption);
  form.append('source', new Blob([buffer], { type: 'image/png' }), filename);

  const { res, data } = await fbRequest(`${GRAPH_API}/${encodeURIComponent(pageId)}/photos`, {
    method: 'POST',
    body: form,
    timeoutMs: FB_UPLOAD_TIMEOUT_MS,
  });
  if (!res.ok || data?.error) {
    throw new Error(formatFbError(data?.error?.message, 'Facebook photo upload failed'));
  }
  return data;
}

async function uploadPhotoToFacebook({ pageId, token, localPath, caption, published }) {
  const fileBuffer = await fs.readFile(localPath);
  return uploadBufferToFacebook({
    pageId,
    token,
    buffer: fileBuffer,
    filename: path.basename(localPath),
    caption,
    published,
  });
}

function decodeBase64Png(dataUrl) {
  if (!dataUrl || typeof dataUrl !== 'string') return null;
  const match = /^data:image\/[a-zA-Z0-9+.-]+;base64,(.+)$/.exec(dataUrl.trim());
  if (!match) return null;
  return Buffer.from(match[1], 'base64');
}

function resolveUploadPath(url) {
  if (!url || typeof url !== 'string' || !url.startsWith('/uploads/')) return null;
  const filename = path.basename(url);
  return path.join(UPLOADS_ROOT, filename);
}

/**
 * Publish an announcement to the Facebook Page configured for `collegeCode` ('ALL' = Campus-Wide)
 * via Graph API v19.0. When no Page is connected for that scope, returns a clean simulated response
 * (simulated: true, sim_* IDs) so local testing and demos succeed; callers must not persist those IDs.
 */
export async function publishToFacebookPage({
  collegeCode = 'ALL',
  message,
  imageUrls = [],
  generatedImageBase64 = null,
  orientation = 'landscape',
  published = true,
  includeMedia = true,
}) {
  const config = await getFacebookPageConfig(collegeCode);
  const pageId = config?.pageId;
  const token = config?.token;

  if (!pageId || !token) {
    const err = new Error('Facebook Page is not connected for this scope. Configure your Page credentials in Settings first.');
    err.status = 400;
    throw err;
  }

  const localPaths = includeMedia
    ? (Array.isArray(imageUrls) ? imageUrls : []).map(resolveUploadPath).filter(Boolean)
    : [];

  if (localPaths.length === 0) {
    const generatedBuffer = includeMedia ? decodeBase64Png(generatedImageBase64) : null;
    if (generatedBuffer) {
      if (published) {
        const data = await uploadBufferToFacebook({
          pageId,
          token,
          buffer: generatedBuffer,
          filename: 'paskil-announcement.png',
          caption: message,
          published: true,
        });
        const postId = data.post_id || data.id;
        return {
          fb_post_id: postId,
          fb_post_url: `https://www.facebook.com/${postId}`,
          simulated: false,
          published: true,
          orientation,
        };
      }
      // Draft mode: upload photo unpublished then attach to an unpublished Page feed draft
      const photo = await uploadBufferToFacebook({
        pageId,
        token,
        buffer: generatedBuffer,
        filename: 'paskil-announcement.png',
        published: false,
      });
      const draftBody = {
        message,
        attached_media: photo?.id ? [{ media_fbid: photo.id }] : [],
        access_token: token,
        published: false,
        unpublished_content_type: 'DRAFT',
      };
      const { res: draftRes, data: draftData } = await fbRequest(`${GRAPH_API}/${encodeURIComponent(pageId)}/feed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draftBody),
        timeoutMs: FB_UPLOAD_TIMEOUT_MS,
      });
      if (!draftRes.ok || draftData?.error) throw new Error(formatFbError(draftData?.error?.message, 'Facebook draft creation failed'));
      return {
        fb_post_id: draftData.id,
        fb_post_url: `https://www.facebook.com/${draftData.id}`,
        simulated: false,
        published: false,
        orientation,
      };
    }

    const body = { message, access_token: token, published };
    if (!published) body.unpublished_content_type = 'DRAFT';
    const { res, data } = await fbRequest(`${GRAPH_API}/${encodeURIComponent(pageId)}/feed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok || data?.error) throw new Error(formatFbError(data?.error?.message, 'Facebook API error'));
    return {
      fb_post_id: data.id,
      fb_post_url: `https://www.facebook.com/${data.id}`,
      simulated: false,
      published,
      orientation,
    };
  }

  if (localPaths.length === 1 && published) {
    const data = await uploadPhotoToFacebook({
      pageId,
      token,
      localPath: localPaths[0],
      caption: message,
      published: true,
    });
    const postId = data.post_id || data.id;
    return {
      fb_post_id: postId,
      fb_post_url: `https://www.facebook.com/${postId}`,
      simulated: false,
      published,
      orientation,
    };
  }

  const attachedMedia = [];
  for (const filePath of localPaths.slice(0, 10)) {
    const photo = await uploadPhotoToFacebook({
      pageId,
      token,
      localPath: filePath,
      published: false,
    });
    if (photo.id) attachedMedia.push({ media_fbid: photo.id });
  }

  const feedBody = {
    message,
    attached_media: attachedMedia,
    access_token: token,
    published,
  };
  if (!published) feedBody.unpublished_content_type = 'DRAFT';

  const { res, data } = await fbRequest(`${GRAPH_API}/${encodeURIComponent(pageId)}/feed`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(feedBody),
    timeoutMs: FB_UPLOAD_TIMEOUT_MS,
  });
  if (!res.ok || data?.error) throw new Error(formatFbError(data?.error?.message, 'Facebook multi-photo post failed'));
  return {
    fb_post_id: data.id,
    fb_post_url: `https://www.facebook.com/${data.id}`,
    simulated: false,
    published,
    orientation,
  };
}
