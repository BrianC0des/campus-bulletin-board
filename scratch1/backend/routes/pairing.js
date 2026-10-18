const express = require("express");
const { randomInt } = require("crypto");
const db = require("../database");

const router = express.Router();

function generatePairingCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let result = "";

  for (let i = 0; i < 8; i++) {
    const index = randomInt(0, chars.length);
    result += chars.charAt(index);
  }

  return result.slice(0, 4) + "-" + result.slice(4);
}

router.post("/code", (req, res) => {
  const now = Date.now();
  const expiresInSeconds = 600;
  const expiresAt = now + expiresInSeconds * 1000;

  let code = generatePairingCode();
  while (db.prepare("SELECT code FROM pairing_codes WHERE code = ?").get(code)) {
    code = generatePairingCode();
  }

  db.prepare(
    "INSERT INTO pairing_codes (code, created_at, expires_at) VALUES (?, ?, ?)"
  ).run(code, now, expiresAt);

  res.status(200).json({ pairingCode: code, expiresInSeconds: expiresInSeconds });
});

router.get("/status/:code", (req, res) => {
  const row = db
    .prepare("SELECT * FROM pairing_codes WHERE code = ?")
    .get(req.params.code);

  if (!row) {
    return res.status(404).json({ message: "Code not found." });
  }

  if (row.claimed_at) {
    const screen = db
      .prepare("SELECT * FROM screens WHERE id = ?")
      .get(row.screen_id);
    return res.json({ status: "claimed", screen });
  }

  if (Date.now() > row.expires_at) {
    return res.json({ status: "expired" });
  }

  res.json({ status: "pending" });
});

router.post("/pair", (req, res) => {
  const { code, name, location } = req.body;

  if (!code || !name || !location) {
    return res.status(400).json({
      success: false,
      message: "Code, name, and location are required."
    });
  }

  const clean = code.replace("-", "").trim().toUpperCase();
  const formattedCode = clean.slice(0, 4) + "-" + clean.slice(4);

  const row = db
    .prepare("SELECT * FROM pairing_codes WHERE code = ?")
    .get(formattedCode);

  if (!row) {
    return res.status(404).json({ success: false, message: "Code not found." });
  }

  if (row.claimed_at) {
    return res.status(400).json({ success: false, message: "This code was already used." });
  }

  if (Date.now() > row.expires_at) {
    return res.status(400).json({ success: false, message: "This code has expired." });
  }

  const duplicate = db
    .prepare("SELECT id FROM screens WHERE LOWER(name) = LOWER(?)")
    .get(name.trim());

  if (duplicate) {
    return res.status(400).json({
      success: false,
      message: "this name already exists."
    });
  }

  const result = db
    .prepare("INSERT INTO screens (name, location, status) VALUES (?, ?, ?)")
    .run(name.trim(), location.trim(), "Online");

  db.prepare("UPDATE pairing_codes SET claimed_at = ?, screen_id = ? WHERE code = ?")
    .run(Date.now(), result.lastInsertRowid, row.code);

  const screen = db
    .prepare("SELECT * FROM screens WHERE id = ?")
    .get(result.lastInsertRowid);

  res.status(200).json({
    success: true,
    message: "Display paired successfully",
    screen
  });
});

module.exports = router;