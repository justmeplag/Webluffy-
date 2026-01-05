// multiBot.js

const { default: makeWASocket, useMultiFileAuthState, Browsers } = require("@rexxhayanasi/elaina-baileys");

const path = require("path");

const fs = require("fs");

const pino = require("pino");

// 🔕 Logger silencieux

const logger = pino({ level: "silent" });

// 🔢 Limite de sessions par owner

const MAX_SESSIONS_PER_OWNER = 4;

// 🗂️ Registry des sessions

const registry = new Map(); // ownerJid -> { sessions: Map, info: Map }

// 📦 Charge tous les plugins dynamiquement

function loadHandlers(sock, ownerJid, isReplica = false) {

  const pluginsDir = path.join(__dirname, "plugins");

  const pluginFiles = fs

    .readdirSync(pluginsDir)

    .filter((f) => f.endsWith(".js"));

  for (const file of pluginFiles) {

    const plugin = require(path.join(pluginsDir, file));

    if (!plugin?.command) continue;

    sock.ev.on("messages.upsert", async ({ messages }) => {

      const m = messages[0];

      if (!m?.message) return;

      const body = m.message.conversation || m.message.extendedTextMessage?.text || "";

      const prefix = body.startsWith(".") ? "." : null;

      if (!prefix) return;

      const [cmd, ...args] = body.slice(1).trim().split(/\s+/);

      const command = cmd.toLowerCase();

      // 🔒 Blocage de .pair sur les répliques

      if (isReplica && command === "pair") {

        return sock.sendMessage(m.key.remoteJid, {

          text: "❌ La commande .pair est désactivée sur cette instance répliquée.",

        }, { quoted: m });

      }

      const context = {

        command,

        args,

        usedPrefix: prefix,

        plag: sock,

      };

      try {

        if (plugin.command.includes(command)) {

          global.isReplicaSession = isReplica;

          await plugin(m, context);

          global.isReplicaSession = false;

        }

      } catch (err) {

        sock.sendMessage(m.key.remoteJid, {

          text: `❌ Erreur plugin : ${err.message}`,

        }, { quoted: m });

      }

    });

  }

  // ⚡ Déclare owner local

  global.owner = [ownerJid];

}

// 📁 Dossier d’auth par session

function getAuthDir(ownerJid, sessionId) {

  return path.join(process.cwd(), "sessions", ownerJid.replace(/[:@]/g, "_"), sessionId);

}

// 🚀 Crée une session

async function createSession(ownerJid, label = "", isReplica = false) {

  const bucket = registry.get(ownerJid) || { sessions: new Map(), info: new Map() };

  if (bucket.sessions.size >= MAX_SESSIONS_PER_OWNER) {

    throw new Error(`Limite atteinte : ${MAX_SESSIONS_PER_OWNER} sessions pour ${ownerJid}`);

  }

  const sessionId = `sess_${Date.now()}`;

  const authDir = getAuthDir(ownerJid, sessionId);

  fs.mkdirSync(authDir, { recursive: true });

  const { state, saveCreds } = await useMultiFileAuthState(authDir);

  const sock = makeWASocket({

    auth: state,

    printQRInTerminal: false,

    browser: Browsers.windows("LUFFY‑XMD"),

    logger,

  });

  sock.ev.on("creds.update", saveCreds);

  // 🔍 Log et diagnostic WebSocket

  sock.ev.on("connection.update", (update) => {

    const { connection, lastDisconnect } = update;

    if (connection === "close") {

      const reason = lastDisconnect?.error?.message || "Déconnexion inconnue";

      console.log(`❌ Session ${sessionId} fermée : ${reason}`);

      bucket.sessions.delete(sessionId);

      bucket.info.delete(sessionId);

      sock.sendMessage(ownerJid, {

        text: `⚠️ Ton bot LUFFY‑XMD a été déconnecté.\nRaison : ${reason}`,

      }).catch(() => {});

    }

    if (connection === "open") {

      console.log(`✅ Session ${sessionId} connectée`);

    }

  });

  bucket.sessions.set(sessionId, sock);

  bucket.info.set(sessionId, {

    authDir,

    label,

    createdAt: Date.now(),

    isReplica,

  });

  registry.set(ownerJid, bucket);

  loadHandlers(sock, ownerJid, isReplica);

  return { sessionId, sock };

}

// 📋 Liste les sessions

function listSessions(ownerJid) {

  const bucket = registry.get(ownerJid);

  if (!bucket) return [];

  return Array.from(bucket.info.entries()).map(([id, meta]) => ({ id, ...meta }));

}

// 🛑 Stoppe une session

async function stopSession(ownerJid, sessionId) {

  const bucket = registry.get(ownerJid);

  if (!bucket) throw new Error("Owner inconnu");

  const sock = bucket.sessions.get(sessionId);

  if (!sock) throw new Error("Session introuvable");

  try { await sock.logout(); } catch {}

  try { sock.end?.(); } catch {}

  bucket.sessions.delete(sessionId);

  bucket.info.delete(sessionId);

}

module.exports = {

  createSession,

  listSessions,

  stopSession,

  MAX_SESSIONS_PER_OWNER,

};