const express = require("express");
const cors = require("cors");
const db = require("./database");
const pairingRoutes = require("./routes/pairing");

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/pairing", pairingRoutes);

app.get("/api/screens", (req, res) => {
  const screens = db.prepare("SELECT * FROM screens ORDER BY id").all();
  res.json(screens);
});

app.patch("/api/screens/:id", (req, res) => {
  const id = Number(req.params.id);
  const { name, location } = req.body;

  if (!name || !location) {
    return res.status(400).json({ message: "Name and location are required." });
  }

  const duplicate = db
    .prepare("SELECT id FROM screens WHERE LOWER(name) = LOWER(?) AND id != ?")
    .get(name.trim(), id);

  if (duplicate) {
    return res.status(400).json({ message: "this name already exists." });
  }

  db.prepare("UPDATE screens SET name = ?, location = ? WHERE id = ?")
    .run(name.trim(), location.trim(), id);

  const screen = db.prepare("SELECT * FROM screens WHERE id = ?").get(id);

  if (!screen) {
    return res.status(404).json({ message: "Screen not found." });
  }

  res.json({ message: "display updated successfully", screen });
});

app.delete("/api/screens/:id", (req, res) => {
  const id = Number(req.params.id);

  db.prepare("DELETE FROM screens WHERE id = ?").run(id);

  res.json({ message: "Screen deleted successfully" });
});

app.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});