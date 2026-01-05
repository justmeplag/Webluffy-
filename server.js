const express = require("express");
const bodyParser = require("body-parser");
const path = require("path");
const { createSession } = require("./lib/session-maker");

const app = express();
app.use(bodyParser.json());

// Sert le fichier HTML
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "connect.html"));
});

// API pour créer une session et obtenir le code
app.post("/api/pair", async (req, res) => {
  const { number } = req.body;
  if (!number) return res.json({ error: "Numéro requis" });

  try {
    const sock = await createSession(number);
    const code = await sock.requestPairingCode(number.trim(), global.pairkey);
    res.json({ code });
  } catch (e) {
    res.json({ error: e.message });
  }
});

// Render utilisera PORT fourni par l'environnement
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Serveur lancé sur http://localhost:${PORT}`));