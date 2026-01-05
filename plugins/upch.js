const fs = require("fs");
const path = require("path");
const { toVideo } = require("../lib/converter");

const cjidPath = path.join(__dirname, "cjid.json");

function getChannelJid() {
  if (fs.existsSync(cjidPath)) {
    const data = JSON.parse(fs.readFileSync(cjidPath, "utf-8"));
    return data.jid || null;
  }
  return null;
}

function saveChannelJid(jid) {
  fs.writeFileSync(cjidPath, JSON.stringify({ jid }, null, 2));
}

const delay = ms => new Promise(res => setTimeout(res, ms));

const handler = async (m, { plag, text, prefix, command }) => {
  await plag.sendMessage(m.chat, { react: { text: "🕐", key: m.key } });

  let channelJid = getChannelJid();

  // Enregistrement initial du JID si absent
  if (!channelJid) {
    if (!text) {
      return plag.sendMessage(m.chat, {
        text: `❌ Aucun JID enregistré.\n\n📌 Utilisation:\n${prefix + command} <jid_channel>\nExemple: ${prefix + command} 120363025@newsletter`
      }, { quoted: m });
    }
    const jid = text.trim();
    saveChannelJid(jid);
    return plag.sendMessage(m.chat, {
      text: `✅ JID du channel enregistré: ${jid}`
    }, { quoted: m });
  }

  const quoted = m.quoted;
  const type = (quoted?.mimetype || "");
  const contentText = text?.trim();

  try {
    if (quoted && type) {
      // Télécharge le média en fichier temporaire
      const mediaPath = await plag.downloadAndSaveMediaMessage(quoted);

      if (/image/.test(type)) {
        await plag.sendMessage(channelJid, { image: { url: mediaPath }, caption: contentText || "" });

      } else if (/video/.test(type)) {
        await plag.sendMessage(channelJid, { video: { url: mediaPath }, caption: contentText || "" });

      } else if (/audio/.test(type)) {
        await plag.sendMessage(channelJid, { 
          audio: { url: mediaPath },
          mimetype: "audio/mp4",
          ptt: true
        });

      } else if (/sticker/.test(type)) {
        await plag.sendMessage(channelJid, { sticker: { url: mediaPath } });

      } else if (/application/.test(type)) {
        await plag.sendMessage(channelJid, { document: { url: mediaPath }, mimetype: type, fileName: "Fichier" });

      } else {
        return plag.sendMessage(m.chat, { text: `❌ Format non supporté (${type})` }, { quoted: m });
      }

    } else if (contentText) {
      await plag.sendMessage(channelJid, { text: contentText });

    } else {
      return plag.sendMessage(m.chat, { text: "❌ Envoie un texte ou réponds à un média." }, { quoted: m });
    }

    await delay(1000);
    await plag.sendMessage(m.chat, { react: { text: "✅", key: m.key } });

  } catch (e) {
    console.error("UPCH ERROR:", e);
    await plag.sendMessage(m.chat, { react: { text: "❌", key: m.key } });
    await plag.sendMessage(m.chat, { text: `❌ Erreur: ${e.message}` }, { quoted: m });
  }
};

handler.command = ["upch"];
handler.tags = ["channel"];
handler.help = ["upch <texte> ou reply à un média"];

module.exports = handler;