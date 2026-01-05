/**
 # ============================ #
 • Author : anggara z (modifié par Michou & Copilot)
 • Type : bot multi‑instances
 • JavaScript : CommonJS
 # ============================ #
**/

require('./config');
require('../../handler.js');
const fs = require("fs");
const lolcatjs = require('lolcatjs');
const path = require('path');
const express = require("express");
const bodyParser = require("body-parser");
const { createSession } = require("../lib/sessionmaker");

// Création du dossier tmp si nécessaire
const folderName = "../../tmp";
const folderPath = path.join(__dirname, folderName);

if (!fs.existsSync(folderPath)) {
    fs.mkdirSync(folderPath);
    lolcatjs.fromString(`📂 Le dossier '${folderName}' a été créé.`);
} else {
    lolcatjs.fromString(`📂 Le dossier '${folderName}' existe déjà.`);
}

// ⚡ Serveur Express pour Render
const app = express();
app.use(bodyParser.json());

// Sert la page HTML de connexion
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

// Lancement du serveur
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    lolcatjs.fromString(`🚀 Bot et serveur lancés sur http://localhost:${PORT}`);
});