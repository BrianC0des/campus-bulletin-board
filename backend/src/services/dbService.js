import { pool, query } from '../config/db.js';

// insert a new display after pairing
export async function pairNewDisplay(pairingCode, name, location) {
  const result = await query(
    `INSERT INTO displays (name, location, pairing_code, is_paired, paired_at)
     VALUES ($1, $2, $3, TRUE, CURRENT_TIMESTAMP)
     ON CONFLICT (pairing_code) DO UPDATE
     SET name = EXCLUDED.name, is_paired = TRUE, paired_at = CURRENT_TIMESTAMP
     RETURNING *`,
    [name, location || null, pairingCode]
  );
  return result.rows[0];
}

// save announcement and link it to selected displays in one go
export async function saveAnnouncementWithDisplays(announcementData, displayIds, actorId) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { title, body, starts_at, ends_at, image_url } = announcementData;
    const ann = await client.query(
      `INSERT INTO announcements (title, body, starts_at, ends_at, image_url, created_by, publish_status)
       VALUES ($1, $2, $3, $4, $5, $6, 'published')
       RETURNING *`,
      [title, body || null, starts_at, ends_at, image_url || null, actorId]
    );

    const annId = ann.rows[0].id;

    for (const displayId of displayIds) {
      await client.query(
        `INSERT INTO announcement_displays (announcement_id, display_id, assigned_by)
         VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
        [annId, displayId, actorId]
      );
    }

    await client.query('COMMIT');
    return ann.rows[0];
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
