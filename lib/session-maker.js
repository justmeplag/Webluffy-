/**
 # ============================ #
 • Author : anggara z (modifié par Michou & Copilot)
 • Type : multi-instance session maker
 • JavaScript : CommonJS
 # ============================ #
**/

require('./system/config');
const { Boom } = require("@hapi/boom");
const qrcode = require("qrcode-terminal");
const readline = require("readline");
const {
  default: makeWASocket,
  makeCacheableSignalKeyStore,
  useMultiFileAuthState,
  DisconnectReason
} = require('@rexxhayanasi/elaina-baileys');
const chalk = require('chalk');
const { store, logger } = require("./store.js");
const { connect } = require("./connection");

// Map des sessions actives
const sessions = {};

// Méthode utilitaire pour demander un numéro en terminal
const question = (text) => {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => rl.question(text, (answer) => { rl.close(); resolve(answer); }));
};

// Création d'une session pour un numéro donné
async function createSession(number, sesipath = `./lib/system/session_${number}`) {
  const { state, saveCreds } = await useMultiFileAuthState(sesipath);
  const auth = {
    creds: state.creds,
    keys: makeCacheableSignalKeyStore(state.keys, logger),
  };

  const sock = makeWASocket({
    printQRInTerminal: true,
    browser: ["Ubuntu", "Chrome", "20.0.04"],
    auth,
    logger,
  });

  sock.ev.on("connection.update", (update) => {
    connect(update, sock, restartSession, number);
  });

  sock.ev.on("creds.update", saveCreds);

  // Auto-owner : ce numéro est propriétaire de sa session
  sock.global = {};
  sock.global.owner = [number];

  sessions[number] = sock;

  // Confirmation dramatique
  console.log(chalk.blue(`
╔══✦✦✦✦✦✦✦✦✦✦══╗
   ✅ Session créée
   pour ${number}
╚══✦✦✦✦✦✦✦✦✦✦══╝
`));

  return sock;
}

// Redémarrage d'une session spécifique
function restartSession(number) {
  console.log(chalk.yellow(`🔄 Redémarrage de la session ${number}...`));
  if (sessions[number]) {
    try { sessions[number].end(); } catch (e) { console.error(e); }
    delete sessions[number];
  }
  return createSession(number);
}

// Liste des sessions actives
function listSessions() {
  return Object.keys(sessions);
}

// ⚡ Mode terminal : si lancé directement, demander un numéro
if (require.main === module) {
  (async () => {
    console.log(chalk.green("=== Création de session via terminal ==="));
    const num = await question("📱 Entrer votre numéro de téléphone (ex: 509XXXXXXXX): ");
    await createSession(num.trim());
  })();
}

module.exports = { createSession, restartSession, listSessions, sessions };