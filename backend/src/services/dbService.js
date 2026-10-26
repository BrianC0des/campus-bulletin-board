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

    // Target specified displays, or auto-assign to all paired displays if none specified
    let targets = displayIds;
    if (!targets || !Array.isArray(targets) || targets.length === 0) {
      const allPaired = await client.query('SELECT id FROM displays WHERE is_paired = TRUE');
      targets = allPaired.rows.map((r) => r.id);
    }

    for (const displayId of targets) {
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

// update existing announcement and refresh display links
export async function updateAnnouncementWithDisplays(id, announcementData, displayIds, actorId) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { title, body, starts_at, ends_at, image_url } = announcementData;

    let updateQuery = `
      UPDATE announcements
      SET title = $1, body = $2, starts_at = $3, ends_at = $4, updated_at = CURRENT_TIMESTAMP
    `;
    const params = [title, body || null, starts_at, ends_at];

    if (image_url !== undefined) {
      params.push(image_url);
      updateQuery += `, image_url = $${params.length}`;
    }

    params.push(id);
    updateQuery += ` WHERE id = $${params.length} RETURNING *`;

    const ann = await client.query(updateQuery, params);

    if (displayIds && Array.isArray(displayIds)) {
      await client.query('DELETE FROM announcement_displays WHERE announcement_id = $1', [id]);
      let targets = displayIds;
      if (targets.length === 0) {
        const allPaired = await client.query('SELECT id FROM displays WHERE is_paired = TRUE');
        targets = allPaired.rows.map((r) => r.id);
      }
      for (const displayId of targets) {
        await client.query(
          `INSERT INTO announcement_displays (announcement_id, display_id, assigned_by)
           VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
          [id, displayId, actorId]
        );
      }
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

