// plugins/pair.js
const { createSession } = require("../lib/session-maker");

const handler = async (m, { args }) => {
  try {
    // Cas 1 : numéro fourni en argument
    let number = args && args[0] ? args[0].trim() : null;

    // Cas 2 : pas de numéro → on prend celui de l’expéditeur
    if (!number) {
      number = m.sender.split("@")[0]; // ex: "509XXXXXXXX"
    }

    // Vérification basique
    if (!number || number.length < 5) {
      return m.reply("❌ Numéro invalide. Exemple: .pair 509XXXXXXXX");
    }

    // Crée la session pour ce numéro
    const sock = await createSession(number);

    // Générer un code de pairing si nécessaire
    if (!sock.authState.creds.registered) {
      try {
        const code = await sock.requestPairingCode(number.trim(), global.pairkey);
        const teks = `
🔑 *Code de connexion généré !*

👤 Numéro : ${number}
📌 Code : ${code}

➡️ Utilise ce code dans ton WhatsApp pour connecter ta session.
`;
        await m.reply(teks);
      } catch (err) {
        console.error(err);
        return m.reply("❌ Erreur lors de la génération du code de connexion.");
      }
    } else {
      await m.reply(`✅ Session déjà active pour ${number}`);
    }
  } catch (e) {
    console.error(e);
    m.reply("❌ Erreur critique dans .pair : " + e.message);
  }
};

handler.command = ["pair"];
handler.tags = ["system"];
handler.help = ["pair [numéro]"];

module.exports = handler;