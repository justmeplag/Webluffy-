const { AddMp3Meta } = require("../lib/audioTools");
const axios = require("axios");

const handler = async (m, { plag, text }) => {
  const quoted = m.quoted;
  if (!quoted || !/audio/.test(quoted.mtype)) {
    return plag.sendMessage(m.chat, { react: { text: "❌", key: m.key } });
  }

  // Extraire titre et artiste depuis le texte
  const [title, artist] = text.split(",").map(t => t.trim());
  if (!title || !artist) {
    return plag.sendMessage(m.chat, { react: { text: "❌", key: m.key } });
  }

  // Télécharger l’audio et une image de cover (logo par défaut)
  const audio = await plag.downloadMediaMessage(quoted);
  const coverUrl = "https://i.imgur.com/abcd123.jpg"; // mets ton logo
  const cover = Buffer.from((await axios.get(coverUrl, { responseType: "arraybuffer" })).data);

  try {
    const enriched = await AddMp3Meta(audio, cover, { title, artist });

    await plag.sendMessage(
      m.chat,
      { audio: enriched, mimetype: "audio/mpeg" },
      { quoted: m }
    );

    await plag.sendMessage(m.chat, { react: { text: "☑️", key: m.key } });
  } catch (e) {
    console.error(e);
    await plag.sendMessage(m.chat, { react: { text: "❌", key: m.key } });
  }
};

handler.command = ["meta"];
module.exports = handler;