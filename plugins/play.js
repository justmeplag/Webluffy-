/*
 • Commande Play YouTube avec boutons
 • Fusion Audio / Vidéo / PTT
 • Conversion directe en mémoire avec ffmpeg
*/

const axios = require("axios");
const ffmpeg = require("fluent-ffmpeg");
const { PassThrough } = require("stream");

async function convertToAudio(videoUrl, asPTT = false, title = "") {
  const response = await axios.get(videoUrl, { responseType: "stream" });
  const inputStream = response.data;
  const outputStream = new PassThrough();

  ffmpeg(inputStream)
    .audioCodec("libmp3lame")
    .format("mp3")
    .pipe(outputStream);

  return new Promise((resolve, reject) => {
    let chunks = [];
    outputStream.on("data", (chunk) => chunks.push(chunk));
    outputStream.on("end", () => {
      const audioBuffer = Buffer.concat(chunks);
      resolve({ audioBuffer, asPTT, title });
    });
    outputStream.on("error", reject);
  });
}

const handler = async (m, { plag, text, prefix, command, args }) => {
  if (!text) {
    return plag.sendMessage(m.chat, {
      text: `❌ Utilisation incorrecte.\n\n📌 Exemple:\n${prefix + command} Alan Walker Faded`
    }, { quoted: m });
  }

  // Cas 1 : menu principal
  if (command === "play") {
    await plag.sendMessage(m.chat, { react: { text: "✨", key: m.key } });

    try {
      const { data } = await axios.get("https://api-faa.my.id/faa/ytplayvid", { params: { q: text } });
      if (!data?.status) return plag.sendMessage(m.chat, { text: "❌ Vidéo introuvable." }, { quoted: m });

      const res = data.result;

      await plag.sendMessage(m.chat, {
        text: `🎶 *Lecture YouTube*\n\n📌 Titre: *${res.searched_title}*\n🔗 Lien: ${res.searched_url}\n\nChoisis le format à télécharger :`,
        footer: "Sélectionne un bouton ci-dessous",
        buttons: [
          { buttonId: `${prefix}playaudio ${text}`, buttonText: { displayText: "🎵 Audio" }, type: 1 },
          { buttonId: `${prefix}playvideo ${text}`, buttonText: { displayText: "🎬 Vidéo" }, type: 1 },
          { buttonId: `${prefix}playptt ${text}`, buttonText: { displayText: "🎤 PTT (Vocal)" }, type: 1 }
        ],
        headerType: 4
      }, { quoted: m });

      await plag.sendMessage(m.chat, { react: { text: "✅", key: m.key } });
    } catch (e) {
      console.error("PLAY MENU ERROR:", e);
      await plag.sendMessage(m.chat, { text: "❌ Erreur lors de la requête." }, { quoted: m });
    }
  }

  // Cas 2 : audio
  if (command === "playaudio") {
    await plag.sendMessage(m.chat, { react: { text: "🎵", key: m.key } });
    try {
      const { data } = await axios.get("https://api-faa.my.id/faa/ytplayvid", { params: { q: text } });
      if (!data?.status) return plag.sendMessage(m.chat, { text: "❌ Vidéo introuvable." }, { quoted: m });

      const res = data.result;
      const { audioBuffer } = await convertToAudio(res.download_url, false, res.searched_title);

      await plag.sendMessage(m.chat, {
        audio: audioBuffer,
        mimetype: "audio/mpeg",
        ptt: false,
        caption: `🎶 *Audio YouTube*\n📌 Titre: *${res.searched_title}*`
      }, { quoted: m });

      await plag.sendMessage(m.chat, { react: { text: "✅", key: m.key } });
    } catch (e) {
      console.error("PLAYAUDIO ERROR:", e);
      await plag.sendMessage(m.chat, { text: "❌ Erreur lors du téléchargement audio." }, { quoted: m });
    }
  }

  // Cas 3 : vidéo
  if (command === "playvideo") {
    await plag.sendMessage(m.chat, { react: { text: "🎬", key: m.key } });
    try {
      const { data } = await axios.get("https://api-faa.my.id/faa/ytplayvid", { params: { q: text } });
      if (!data?.status) return plag.sendMessage(m.chat, { text: "❌ Vidéo introuvable." }, { quoted: m });

      const res = data.result;
      await plag.sendMessage(m.chat, {
        video: { url: res.download_url },
        caption: `🎬 *Vidéo YouTube*\n📌 Titre: *${res.searched_title}*`
      }, { quoted: m });

      await plag.sendMessage(m.chat, { react: { text: "✅", key: m.key } });
    } catch (e) {
      console.error("PLAYVIDEO ERROR:", e);
      await plag.sendMessage(m.chat, { text: "❌ Erreur lors du téléchargement vidéo." }, { quoted: m });
    }
  }

  // Cas 4 : PTT
  if (command === "playptt") {
    await plag.sendMessage(m.chat, { react: { text: "🎤", key: m.key } });
    try {
      const { data } = await axios.get("https://api-faa.my.id/faa/ytplayvid", { params: { q: text } });
      if (!data?.status) return plag.sendMessage(m.chat, { text: "❌ Vidéo introuvable." }, { quoted: m });

      const res = data.result;
      const { audioBuffer } = await convertToAudio(res.download_url, true, res.searched_title);

      await plag.sendMessage(m.chat, {
        audio: audioBuffer,
        mimetype: "audio/mpeg",
        ptt: true,
        caption: `🎤 *PTT YouTube*\n📌 Titre: *${res.searched_title}*`
      }, { quoted: m });

      await plag.sendMessage(m.chat, { react: { text: "✅", key: m.key } });
    } catch (e) {
      console.error("PLAYPTT ERROR:", e);
      await plag.sendMessage(m.chat, { text: "❌ Erreur lors du téléchargement PTT." }, { quoted: m });
    }
  }
};

handler.help = ["play <titre>", "playaudio <titre>", "playvideo <titre>", "playptt <titre>"];
handler.tags = ["downloader"];
handler.command = ["play", "playaudio", "playvideo", "playptt"];
handler.limit = true;

module.exports = handler;