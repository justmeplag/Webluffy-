/*
 • Commande Anime
 • Recherche un épisode et propose des boutons pour choisir la qualité
 • Usage :
   .anime us 1
*/

const fetch = require("node-fetch");

const handler = async (m, { conn, plag, args }) => {
  const bot = conn || plag;
  if (!args.length) return m.reply("❌ Donne le nom d’un anime ou film.\nEx: .anime us 1");

  const query = args[0];
  const episodeNum = args[1] || "1";

  try {
    // Exemple : appel API Omegatech
    const res = await fetch(`https://omegatech-api.dixonomega.tech/api/movie/moviebox-sources?info=5663745836052799496`);
    const json = await res.json();

    if (!json.result || !json.result.downloads) {
      return m.reply("❌ Ressource introuvable.");
    }

    // Construire les boutons pour chaque qualité dispo
    const buttons = json.result.downloads.map(v => ({
      buttonId: `.getanime ${query} ${episodeNum} ${v.quality}`,
      buttonText: { displayText: `${v.quality}p (${(v.size/1024/1024).toFixed(1)} Mo)` },
      type: 1
    }));

    const teks = `🎬 *${query}* - Épisode ${episodeNum}\n\nChoisis la qualité de la vidéo :`;

    await bot.sendMessage(m.chat, {
      text: teks,
      footer: "Luffy XMD",
      buttons,
      headerType: 1
    }, { quoted: m });

  } catch (e) {
    console.error(e);
    m.reply("❌ Erreur lors de la récupération.");
  }
};

// Commande secondaire pour envoyer la vidéo choisie
const getHandler = async (m, { conn, plag, args }) => {
  const bot = conn || plag;
  const query = args[0];
  const episodeNum = args[1];
  const quality = parseInt(args[2]);

  try {
    const res = await fetch(`https://omegatech-api.dixonomega.tech/api/movie/moviebox-sources?info=5663745836052799496`);
    const json = await res.json();

    const video = json.result.downloads.find(v => v.quality === quality);
    if (!video) return m.reply("❌ Qualité introuvable.");

    // Sous-titres FR
    const subFr = json.result.captions.find(c => c.lan === "fr");

    let teks = `🎬 *${query}* - Épisode ${episodeNum}\nQualité: ${video.quality}p\nFormat: ${video.format}`;

    await bot.sendMessage(m.chat, {
      video: { url: video.directUrl },
      caption: teks
    }, { quoted: m });

    if (subFr) {
      await bot.sendMessage(m.chat, {
        document: { url: subFr.url },
        mimetype: "application/x-subrip",
        fileName: `${query}-ep${episodeNum}-FR.srt`,
        caption: "📑 Sous-titres Français"
      }, { quoted: m });
    }

  } catch (e) {
    console.error(e);
    m.reply("❌ Erreur lors de l’envoi de la vidéo.");
  }
};

handler.command = ["anime"];
handler.tags = ["video"];
handler.help = ["anime <titre> <episode>"];

getHandler.command = ["getanime"];
getHandler.tags = ["video"];
getHandler.help = ["getanime <titre> <episode> <qualité>"];

module.exports = [handler, getHandler];