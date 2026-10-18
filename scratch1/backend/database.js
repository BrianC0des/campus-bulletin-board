const Database = require("better-sqlite3");
const path = require("path");

const db = new Database(path.join(__dirname, "tv-pairing.db"));

db.exec(`
  CREATE TABLE IF NOT EXISTS screens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    location TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Offline'
  );

  CREATE TABLE IF NOT EXISTS pairing_codes (
    code TEXT PRIMARY KEY,
    created_at INTEGER NOT NULL,
    expires_at INTEGER NOT NULL,
    claimed_at INTEGER,
    screen_id INTEGER
  );
`);

console.log("SQLite database is ready!");

module.exports = db;