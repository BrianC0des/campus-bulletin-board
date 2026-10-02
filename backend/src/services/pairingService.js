/**
 * Pairing Service - Demonstrates clean Express SQL transactions
 * for student defense and implementation
 */

/**
 * Consumes an open pairing session and registers a new display atomically
 * @param {import('pg').PoolClient} client - Dedicated PostgreSQL transaction client
 * @param {string} sessionId - UUID of the pairing session
 * @param {string} name - Display name
 * @param {string} location - Campus location
 * @param {string} credentialHash - SHA-256 hash of the generated display token
 */
export async function pairNewDisplayTransaction(client, sessionId, name, location, credentialHash) {
  try {
    await client.query('BEGIN');

    // 1. Lock the pairing session and verify it is open and unexpired
    const sessionResult = await client.query(
      `
        SELECT *
        FROM public.pairing_sessions
        WHERE id = $1
          AND closed_at IS NULL
          AND expires_at > NOW()
        FOR UPDATE
      `,
      [sessionId]
    );

    if (sessionResult.rowCount !== 1) {
      throw new Error('Pairing session is invalid, expired, or already used');
    }

    // 2. Create the logical display record
    const displayResult = await client.query(
      `
        INSERT INTO public.displays (name, location, registration_status, registered_at)
        VALUES ($1, $2, 'registered', NOW())
        RETURNING *
      `,
      [name.trim(), location.trim()]
    );
    const display = displayResult.rows[0];

    // 3. Issue the persistent display credential
    const credResult = await client.query(
      `
        INSERT INTO public.display_credentials (display_id, credential_hash, issued_at)
        VALUES ($1, $2, NOW())
        RETURNING id
      `,
      [display.id, credentialHash]
    );

    // 4. Atomically consume and close the pairing session
    const closeResult = await client.query(
      `
        UPDATE public.pairing_sessions
        SET
          consumed_at = NOW(),
          closed_at = NOW(),
          close_reason = 'paired',
          display_id = $1
        WHERE id = $2
          AND closed_at IS NULL
        RETURNING id
      `,
      [display.id, sessionId]
    );

    if (closeResult.rowCount !== 1) {
      throw new Error('Pairing session could not be consumed');
    }

    await client.query('COMMIT');
    return { display, credentialId: credResult.rows[0].id };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  }
}

/**
 * Gets active session or creates replacement, handling race conditions via error 23505
 * @param {import('pg').PoolClient} client
 * @param {string} browserSessionHash
 * @param {string} codeHmac
 * @param {string} codeCiphertext
 * @param {Date} expiresAt
 */
export async function getOrCreatePairingSessionSafe(client, browserSessionHash, codeHmac, codeCiphertext, expiresAt) {
  // 1. Check for existing open session
  const existing = await client.query(
    `
      SELECT *
      FROM public.pairing_sessions
      WHERE browser_session_hash = $1
        AND closed_at IS NULL
    `,
    [browserSessionHash]
  );

  if (existing.rowCount > 0) {
    const session = existing.rows[0];
    if (new Date(session.expires_at) > new Date()) {
      // Re-use active unexpired session
      await client.query(
        'UPDATE public.pairing_sessions SET last_requested_at = NOW() WHERE id = $1',
        [session.id]
      );
      return session;
    } else {
      // Expired: close it out
      await client.query(
        "UPDATE public.pairing_sessions SET closed_at = NOW(), close_reason = 'expired' WHERE id = $1",
        [session.id]
      );
    }
  }

  // 2. Try inserting new replacement session; catch race condition (error 23505)
  try {
    const newSession = await client.query(
      `
        INSERT INTO public.pairing_sessions (
          browser_session_hash, code_hmac, code_ciphertext, expires_at, last_requested_at
        )
        VALUES ($1, $2, $3, $4, NOW())
        RETURNING *
      `,
      [browserSessionHash, codeHmac, codeCiphertext, expiresAt]
    );
    return newSession.rows[0];
  } catch (err) {
    if (err.code === '23505') {
      // Unique violation race: another tab just inserted an open session, return that one
      const winner = await client.query(
        `SELECT * FROM public.pairing_sessions WHERE browser_session_hash = $1 AND closed_at IS NULL`,
        [browserSessionHash]
      );
      return winner.rows[0];
    }
    throw err;
  }
}
