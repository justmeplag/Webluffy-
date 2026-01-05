/*
 • Commande PlayPTT YouTube
 • Télécharge l'audio et l’envoie en mode vocal (PTT)
*/

const axios = require("axios");

const handler = async (m, { plag, text, prefix, command }) => {
  if (!text) {
    return plag.sendMessage(m.chat, { text: `❌ Donne un titre ou un lien YouTube.\nEx: ${prefix + command} Alan Walker Faded` }, { quoted: m });
  }

  await plag.sendMessage(m.chat, { react: { text: "🎤", key: m.key } });

  try {
    const { data } = await axios.get("https://api-faa.my.id/faa/ytplaymp3", { params: { q: text } });
    if (!data?.status) return plag.sendMessage(m.chat, { text: "❌ Audio introuvable." }, { quoted: m });

    const res = data.result;
    if (!res?.download_url) return plag.sendMessage(m.chat, { text: "❌ Lien audio indisponible." }, { quoted: m });

    await plag.sendMessage(m.chat, {
      audio: { url: res.download_url },
      mimetype: "audio/mpeg",
      ptt: true,
      caption: `🎤 *PTT YouTube*\n📌 Titre: *${res.searched_title}*`
    }, { quoted: m });

    await plag.sendMessage(m.chat, { react: { text: "✅", key: m.key } });
  } catch (e) {
    console.error("PLAYPTT ERROR:", e);
    await plag.sendMessage(m.chat, { text: "❌ Erreur lors du téléchargement PTT." }, { quoted: m });
  }
};

handler.help = ["playptt <titre>"];
handler.tags = ["downloader"];
handler.command = ["playptt"];
handler.limit = true;

module.exports = handler;