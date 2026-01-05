/*
 • Commande DelPanel
 • Supprime un ou plusieurs panels (serveurs) par ID
 • Usage :
   .delpanel 12
   .delpanel 12,34,56
*/

const fetch = require("node-fetch");

const handler = async (m, { conn, plag, args }) => {
  const bot = conn || plag;
  const senderJid = m.sender;

  // Vérification des permissions
  const isOwner = Array.isArray(global.owner)
    ? global.owner.includes(senderJid)
    : (typeof global.owner === "string" ? senderJid.includes(global.owner) : false);
  const isPremium = Array.isArray(global.premium) ? global.premium.includes(senderJid) : false;

  if (!isOwner && !isPremium) {
    return m.reply("❌ Cette commande est réservée aux administrateurs.");
  }

  // Extraction des IDs depuis args ou m.text
  let raw = (args && args.length) ? args.join(" ") : m.text.replace(/^[.\-_/\\]?delpanel\s*/i, "");
  const ids = raw.split(",").map(id => id.trim()).filter(id => id);

  if (!ids.length) {
    return m.reply("❌ Donne l’ID du panel à supprimer.\nEx: .delpanel 12 ou .delpanel 12,34,56");
  }

  let success = [];
  let failed = [];

  for (let id of ids) {
    try {
      const res = await fetch(`${global.domain}/api/application/servers/${id}`, {
        method: "DELETE",
        headers: {
          Accept: "application/json",
          Authorization: "Bearer " + global.apikey,
        },
      });

      if (res.status === 204) {
        success.push(id);
      } else {
        let errMsg = `HTTP ${res.status}`;
        try {
          const err = await res.json();
          errMsg = err?.errors?.[0]?.detail || errMsg;
        } catch (_) {}
        failed.push({ id, error: errMsg });
      }
    } catch (e) {
      failed.push({ id, error: e.message });
    }
  }

  // Message de retour
  let teks = "🗑️ *Résultat suppression panels*\n\n";
  if (success.length) teks += `✅ Supprimés: ${success.join(", ")}\n`;
  if (failed.length) {
    teks += `❌ Échecs:\n`;
    for (let f of failed) {
      teks += `   • ID ${f.id} → ${f.error}\n`;
    }
  }

  await bot.sendMessage(m.chat, { text: teks }, { quoted: m });
};

handler.command = ["delpanel"];
handler.tags = ["pterodactyl"];
handler.help = ["delpanel <id>[,id2,id3...]"];

module.exports = handler;