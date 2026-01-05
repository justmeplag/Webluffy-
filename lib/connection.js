// connection.js
const lolcatjs = require("lolcatjs");
const chalk = require("chalk");
const { DisconnectReason } = require("@rexxhayanasi/elaina-baileys");
const { Boom } = require("@hapi/boom");
const fs = require("fs");

exports.connect = async (update, sock, restartFn, number) => {
  const { connection, lastDisconnect, qr } = update;

  try {
    if (connection === "close") {
      let reason = new Boom(lastDisconnect?.error)?.output.statusCode;

      switch (reason) {
        case DisconnectReason.badSession:
          const sessionPath = `./lib/system/session_${number}`;
          if (fs.existsSync(sessionPath)) {
            console.log(chalk.red(`[ ${number} ] Session invalide. Rescan nécessaire.`));
            await sock.logout();
          }
          break;
        case DisconnectReason.connectionClosed:
        case DisconnectReason.connectionLost:
        case DisconnectReason.restartRequired:
        case DisconnectReason.timedOut:
          console.log(chalk.yellow(`[ ${number} ] Reconnexion...`));
          restartFn(number);
          break;
        case DisconnectReason.connectionReplaced:
          console.log(chalk.red(`[ ${number} ] Connexion remplacée. Reset.`));
          process.send("reset");
          break;
        case DisconnectReason.loggedOut:
          console.log(chalk.red(`[ ${number} ] Déconnecté. Rescan nécessaire.`));
          await sock.logout();
          break;
        default:
          console.log(chalk.red(`[ ${number} ] Erreur inconnue : ${reason}|${connection}`));
          restartFn(number);
      }
    }

    if (update.connection === "open") {
      lolcatjs.fromString(`[ ${number} ] Connecté avec succès !`);
    }
  } catch (err) {
    console.log(chalk.red(`[ ${number} ] [ ERREUR CRITIQUE ] connection.js : ${err}`));
  }
};