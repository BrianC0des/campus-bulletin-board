import { pool, query } from '../config/db.js';

/**
 * Raw PostgreSQL database query helpers (Zero-BaaS)
 */

/**
 * Pair a new display using an 8-character pairing code
 */
export async function pairNewDisplay(pairingCode, name, location) {
  const text = `
    UPDATE displays
    SET name = $1,
        location = $2,
        is_paired = TRUE,
        is_online = TRUE,
        last_seen_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
    WHERE pairing_code = $3 AND is_paired = FALSE
    RETURNING *;
  `;
  const res = await query(text, [name, location, pairingCode]);
  return res.rows[0] || null;
}

/**
 * Save an announcement and link it to displays inside a transaction
 */
export async function saveAnnouncementWithDisplays(announcementData, displayIds, actorId) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Insert announcement
    const insertAnnQuery = `
      INSERT INTO announcements (
        title, body, publish_status, starts_at, ends_at, image_url, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *;
    `;
    const annValues = [
      announcementData.title,
      announcementData.body,
      announcementData.publish_status || 'draft',
      announcementData.starts_at,
      announcementData.ends_at,
      announcementData.image_url || null,
      actorId
    ];
    const annResult = await client.query(insertAnnQuery, annValues);
    const savedAnnouncement = annResult.rows[0];

    // 2. Insert display junction rows
    if (Array.isArray(displayIds) && displayIds.length > 0) {
      for (const displayId of displayIds) {
        await client.query(`
          INSERT INTO announcement_displays (announcement_id, display_id, assigned_by)
          VALUES ($1, $2, $3)
          ON CONFLICT (announcement_id, display_id) DO NOTHING;
        `, [savedAnnouncement.id, displayId, actorId]);
      }
    }

    await client.query('COMMIT');
    return savedAnnouncement;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
