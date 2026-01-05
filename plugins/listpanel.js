// /plugins/ptero-listpanel.js
const fetch = require("node-fetch");
const normalizeJid = (jid) => jid.endsWith("@s.whatsapp.net") ? jid : `${jid}@s.whatsapp.net`;

const handler = async (m, { conn, plag }) => {
  const bot = conn || plag;
  const senderJid = normalizeJid(m.sender);
  const isOwner = senderJid.includes(global.owner);
  const isPremium = (global.premium || []).includes(senderJid);
  if (!isOwner && !isPremium) return m.reply("❌ Cette commande est réservée aux administrateurs.");

  try {
    const f = await fetch(global.domain + "/api/application/servers", {
      method: "GET",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: "Bearer " + global.apikey,
      },
    });
    const data = await f.json();
    if (data.errors) return m.reply(JSON.stringify(data.errors[0], null, 2));

    let teks = `╔══✦✦✦✦✦✦✦✦✦✦══╗
     𝐋𝐈𝐒𝐓 𝐏𝐀𝐍𝐄𝐋𝐒
╚══✦✦✦✦✦✦✦✦✦✦══╝\n`;

    for (let srv of data.data) {
      const a = srv.attributes;
      teks += `📡 ID: ${a.id}\n🖥️ Nom: ${a.name}\n👤 User: ${a.user}\n💾 RAM: ${a.limits.memory} MB\n💽 Disk: ${a.limits.disk} MB\n⚙️ CPU: ${a.limits.cpu}%\n\n`;
    }

    // 🔥 Correction : envoie directement dans la conversation où la commande est passée
    await bot.sendMessage(m.chat, { text: teks }, { quoted: m });

  } catch (e) {
    console.log(e);
    return m.reply("❌ Erreur lors de la récupération des panels: " + e.message);
  }
};

handler.command = ["listpanel"];
handler.tags = ["pterodactyl"];
handler.help = ["listpanel"];
module.exports = handler;