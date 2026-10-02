/**
 * Campus Bulletin Board Digital Signage System
 * JavaScript Database Models, JSDoc Types & Response Mappers
 */

// ============================================================================
// 1. APPLICATION CONSTANTS (Express Configuration defaults)
// ============================================================================
export const APP_CONFIG = {
  DISPLAY_POLL_SECONDS: 15,
  DISPLAY_ROTATION_SECONDS: 10,
  DISPLAY_MAX_ITEMS: 6,
  PAIRING_CODE_TTL_SECONDS: 600,
  DEFAULT_CAMPUS_TIMEZONE: 'Asia/Manila', // Asia/Manila (UTC+8) - Configurable via process.env.CAMPUS_TIMEZONE
};

// ============================================================================
// 2. JSDOC TYPE DEFINITIONS (Zero TS build step, 100% IDE Intellisense)
// ============================================================================

/**
 * @typedef {'scheduled' | 'active' | 'expired'} AnnouncementStatus
 */

/**
 * Database representation of an Administrator Profile (snake_case)
 * @typedef {Object} DbAdministratorProfile
 * @property {string} user_id - References auth.users.id
 * @property {string} first_name
 * @property {string|null} middle_name
 * @property {string} last_name
 * @property {'administrator'} role
 * @property {'active' | 'disabled'} account_status
 * @property {string} created_at
 * @property {string} updated_at
 */

/**
 * Application representation of an Administrator Profile (camelCase)
 * @typedef {Object} AdministratorProfile
 * @property {string} userId
 * @property {string} firstName
 * @property {string|null} middleName
 * @property {string} lastName
 * @property {string} fullName
 * @property {'administrator'} role
 * @property {'active' | 'disabled'} accountStatus
 * @property {string} createdAt
 * @property {string} updatedAt
 */

/**
 * Database representation of an Announcement
 * @typedef {Object} DbAnnouncement
 * @property {string} id
 * @property {string} title
 * @property {string} body
 * @property {string|null} image_object_key
 * @property {string|null} image_mime_type
 * @property {number} image_version
 * @property {string} starts_at
 * @property {string} ends_at
 * @property {string} created_by
 * @property {string} created_at
 * @property {string} updated_at
 */

/**
 * Application representation of an Announcement
 * @typedef {Object} Announcement
 * @property {string} id
 * @property {string} title
 * @property {string} body
 * @property {string|null} imageObjectKey
 * @property {string|null} imageMimeType
 * @property {number} imageVersion
 * @property {string} startsAt
 * @property {string} endsAt
 * @property {AnnouncementStatus} status
 * @property {string[]} [assignedDisplayIds]
 * @property {string} createdBy
 * @property {string} createdAt
 * @property {string} updatedAt
 */

/**
 * Database representation of a Display
 * @typedef {Object} DbDisplay
 * @property {string} id
 * @property {string} name
 * @property {string} location
 * @property {'registered' | 'unregistered'} registration_status
 * @property {string} registered_at
 * @property {string|null} unregistered_at
 * @property {string} created_at
 * @property {string} updated_at
 */

/**
 * Application representation of a Display
 * @typedef {Object} Display
 * @property {string} id
 * @property {string} name
 * @property {string} location
 * @property {'registered' | 'unregistered'} registrationStatus
 * @property {string} registeredAt
 * @property {string|null} unregisteredAt
 * @property {string} createdAt
 * @property {string} updatedAt
 */

/**
 * Announcement payload returned to physical display polling clients
 * @typedef {Object} DisplayAnnouncementItem
 * @property {string} id
 * @property {string} title
 * @property {string} body
 * @property {string|null} imageObjectKey
 * @property {string|null} imageMimeType
 * @property {number} imageVersion
 * @property {string} startsAt
 * @property {string} endsAt
 */

/**
 * Complete polling response payload for physical screens
 * @typedef {Object} DisplayAnnouncementResponse
 * @property {{ id: string, name: string, location: string }} display
 * @property {number} rotationSeconds
 * @property {DisplayAnnouncementItem[]} announcements
 * @property {string} serverTime
 */

// ============================================================================
// 3. UTILITY & BUSINESS LOGIC HELPERS
// ============================================================================

/**
 * Dynamically computes announcement status without mutable DB state
 * @param {string|Date} startsAt
 * @param {string|Date} endsAt
 * @param {Date} [now=new Date()]
 * @returns {AnnouncementStatus}
 */
export function computeAnnouncementStatus(startsAt, endsAt, now = new Date()) {
  const start = new Date(startsAt).getTime();
  const end = new Date(endsAt).getTime();
  const current = now.getTime();

  if (current < start) {
    return 'scheduled';
  }
  if (current >= end) {
    return 'expired';
  }
  return 'active';
}

/**
 * Normalizes user-entered pairing codes (removes spaces, uppercases, standardizes hyphen)
 * e.g. " 7k4p 92qm " -> "7K4P-92QM"
 * @param {string} rawCode
 * @returns {string}
 */
export function normalizePairingCode(rawCode) {
  if (!rawCode || typeof rawCode !== 'string') return '';
  const cleaned = rawCode.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (cleaned.length === 8) {
    return `${cleaned.slice(0, 4)}-${cleaned.slice(4)}`;
  }
  return cleaned;
}

// ============================================================================
// 4. DATA MAPPERS (PostgreSQL snake_case -> Express camelCase API)
// ============================================================================

/**
 * Maps raw database administrator profile to API object
 * @param {DbAdministratorProfile} row
 * @returns {AdministratorProfile}
 */
export function formatAdminProfile(row) {
  const middle = row.middle_name ? ` ${row.middle_name}` : '';
  const fullName = `${row.first_name}${middle} ${row.last_name}`;

  return {
    userId: row.user_id,
    firstName: row.first_name,
    middleName: row.middle_name || null,
    lastName: row.last_name,
    fullName,
    role: row.role,
    accountStatus: row.account_status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Maps raw database announcement to API object with computed status
 * @param {DbAnnouncement} row
 * @param {Date} [serverNow=new Date()]
 * @param {string[]} [assignedDisplayIds]
 * @returns {Announcement}
 */
export function formatAnnouncement(row, serverNow = new Date(), assignedDisplayIds = []) {
  return {
    id: row.id,
    title: row.title,
    body: row.body,
    imageObjectKey: row.image_object_key || null,
    imageMimeType: row.image_mime_type || null,
    imageVersion: row.image_version || 1,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    status: computeAnnouncementStatus(row.starts_at, row.ends_at, serverNow),
    assignedDisplayIds,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Maps raw database display row to API object
 * @param {DbDisplay} row
 * @returns {Display}
 */
export function formatDisplay(row) {
  return {
    id: row.id,
    name: row.name,
    location: row.location,
    registrationStatus: row.registration_status,
    registeredAt: row.registered_at,
    unregisteredAt: row.unregistered_at || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Maps raw query item to physical screen payload item
 * @param {any} row
 * @returns {DisplayAnnouncementItem}
 */
export function formatDisplayItem(row) {
  return {
    id: row.id,
    title: row.title,
    body: row.body,
    imageObjectKey: row.image_object_key || null,
    imageMimeType: row.image_mime_type || null,
    imageVersion: row.image_version || 1,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
  };
}
