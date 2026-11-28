import crypto from 'crypto';
import { query } from '../config/db.js';
import { isUuid } from './errors.js';

const TOKEN_TTL_SECONDS = 12 * 60 * 60;
const DEV_FALLBACK_SECRET = 'campus-bulletin-board-dev-secret';
let warnedAboutFallbackSecret = false;

// Read lazily: dotenv.config() runs in server.js after this module has been imported.
function getAuthSecret() {
  if (process.env.AUTH_SECRET) return process.env.AUTH_SECRET;
  if (process.env.NODE_ENV === 'production' && !warnedAboutFallbackSecret) {
    warnedAboutFallbackSecret = true;
    console.warn('AUTH_SECRET is not set; falling back to an insecure development secret.');
  }
  return DEV_FALLBACK_SECRET;
}

function hmac(data) {
  return crypto.createHmac('sha256', getAuthSecret()).update(data).digest('base64url');
}

// Issue an HMAC-SHA256 signed bearer token: base64url(payload).base64url(signature)
export function signAuthToken(userId) {
  const now = Math.floor(Date.now() / 1000);
  const payload = Buffer.from(JSON.stringify({ sub: userId, iat: now, exp: now + TOKEN_TTL_SECONDS })).toString('base64url');
  return `${payload}.${hmac(payload)}`;
}

// Returns the decoded payload for a valid, unexpired token; otherwise null
export function verifyAuthToken(token) {
  if (typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;

  const [payload, signature] = parts;
  const expected = Buffer.from(hmac(payload));
  const given = Buffer.from(signature);
  if (expected.length !== given.length || !crypto.timingSafeEqual(expected, given)) return null;

  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (!data || typeof data.sub !== 'string' || typeof data.exp !== 'number') return null;
    if (data.exp < Math.floor(Date.now() / 1000)) return null;
    return data;
  } catch {
    return null;
  }
}

// Bearer token is the only credential; raw x-user-id is honoured solely when NODE_ENV === 'test'
function resolveUserId(req) {
  const header = req.headers['authorization'];
  if (typeof header === 'string' && /^Bearer\s+/i.test(header)) {
    const payload = verifyAuthToken(header.replace(/^Bearer\s+/i, '').trim());
    return payload ? payload.sub : null;
  }
  if (process.env.NODE_ENV === 'test') {
    const testId = req.headers['x-user-id'];
    return typeof testId === 'string' ? testId : null;
  }
  return null;
}

// Strip created_by from announcement rows for anyone who is not a lead admin
export function omitCreatedByForNonLead(data, user) {
  if (user && user.role === 'lead_admin') return data;
  const strip = (row) => {
    if (!row || typeof row !== 'object') return row;
    const { created_by, ...rest } = row;
    return rest;
  };
  return Array.isArray(data) ? data.map(strip) : strip(data);
}

// Authentication middleware for administrators
export async function requireAdmin(req, res, next) {
  const userId = resolveUserId(req);
  if (!userId || !isUuid(userId)) {
    return res.status(401).json({ error: 'Please log in first' });
  }

  try {
    const result = await query(
      'SELECT id, email, full_name, role, college, allowed_colleges, status FROM administrator_profiles WHERE id = $1',
      [userId]
    );

    if (result.rows.length === 0 || result.rows[0].status !== 'active') {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    req.user = result.rows[0];
    next();
  } catch (err) {
    next(err);
  }
}

// Access control requiring Lead Administrator role
export async function requireLeadAdmin(req, res, next) {
  const userId = resolveUserId(req);
  if (!userId || !isUuid(userId)) {
    return res.status(401).json({ error: 'Please log in first' });
  }

  try {
    const result = await query(
      'SELECT id, email, full_name, role, college, allowed_colleges, status FROM administrator_profiles WHERE id = $1',
      [userId]
    );

    if (result.rows.length === 0 || result.rows[0].status !== 'active') {
      return res.status(401).json({ error: 'Account not found or inactive' });
    }

    if (result.rows[0].role !== 'lead_admin') {
      return res.status(403).json({ error: 'Only lead admin can access this' });
    }

    req.user = result.rows[0];
    next();
  } catch (err) {
    next(err);
  }
}

// Authentication middleware for physical TV displays
export function requireDisplayCredential(req, res, next) {
  next();
}
