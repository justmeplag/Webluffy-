const yts = require("yt-search");
const axios = require("axios");
const fs = require("fs");
const path = require("path");
const ffmpeg = require("fluent-ffmpeg");
const ffmpegInstaller = require("@ffmpeg-installer/ffmpeg");
const fetch = require("node-fetch");

ffmpeg.setFfmpegPath(ffmpegInstaller.path);

/**
 * Utilitaires texte
 */
function getText(m) {
  return (
    m.text ||
    m.body ||
    m.message?.conversation ||
    m.message?.extendedTextMessage?.text ||
    m.quoted?.text ||
    ""
  );
}

function parseCommand(prefixCmd, text) {
  // Ex: ".yts Bella Ciao" -> "Bella Ciao"
  return text.replace(new RegExp(`^(\\${prefixCmd})\\s*`, "i"), "").trim();
}

function buildListSections(results, query) {
  return results.map((v, i) => ({
    title: `⚡ ${i + 1}. ${v.title}`,
    rows: [
      { title: "🎧 Télécharger en Audio", rowId: `.ytsdl ${i} audio ${query}` },
      { title: "🎬 Télécharger en Vidéo", rowId: `.ytsdl ${i} video ${query}` },
      { title: "🎤 Télécharger en Note Vocale", rowId: `.ytsdl ${i} ptt ${query}` },
    ],
  }));
}

/**
 * Handler de recherche: .yts <titre>
 */
const searchHandler = async (m, { plag }) => {
  try {
    const fullText = getText(m);
    const query = parseCommand(".yts", fullText);

    if (!query) {
      return plag.reply(
        m.chat,
        "⚡ LUFFY‑XMD | Recherche YouTube\n\nUtilisation : `.yts <titre>`\nExemple : `.yts Bella Ciao`",
        m
      );
    }

    await plag.reply(m.chat, "🔎 LUFFY‑XMD recherche ta musique...", m);

    const s = await yts(query);
    const results = (s.videos || []).slice(0, 5);

    if (!results.length) {
      return plag.reply(m.chat, "❌ Aucun résultat trouvé.", m);
    }

    const sections = buildListSections(results, query);

    await plag.sendMessage(
      m.chat,
      {
        text: "*🎶 Résultats YouTube (LUFFY‑XMD)*\n\nChoisis ton format préféré ci‑dessous :",
        footer: "⚡ LUFFY‑XMD BOT",
        title: "🎬 Sélection YouTube",
        buttonText: "📂 Voir les options",
        sections,
      },
      { quoted: m }
    );
  } catch (e) {
    console.error("YTS Search Error:", e);
    await plag.reply(m.chat, "❌ Une erreur est survenue, réessaie plus tard.", m);
  }
};

/**
 * Handler de téléchargement: .ytsdl <index> <format> <titre>
 * Exemple automatique depuis les boutons: ".ytsdl 1 audio Bella Ciao"
 */
const downloadHandler = async (m, { plag }) => {
  try {
    const fullText = getText(m).trim();
    // Sécuriser le split sans dépendre de args
    // ".ytsdl 2 audio Bella Ciao" -> ["ytsdl","2","audio","Bella","Ciao"]
    const parts = fullText.split(/\s+/);

    // Vérification commande
    if (!parts.length || !/^\.ytsdl$/i.test(parts[0])) {
      return plag.reply(m.chat, "❌ Format attendu : `.ytsdl <numéro> <format> <titre>`", m);
    }

    const index = parseInt(parts[1], 10);
    const format = (parts[2] || "").toLowerCase();
    const query = parts.slice(3).join(" ");

    if (Number.isNaN(index) || index < 0 || index > 4) {
      return plag.reply(m.chat, "❌ Choisis un numéro entre 0 et 4 (correspondant à la liste affichée).", m);
    }
    if (!["audio", "video", "ptt"].includes(format)) {
      return plag.reply(m.chat, "❌ Formats valides : `audio`, `video`, `ptt`.", m);
    }
    if (!query) {
      return plag.reply(m.chat, "❌ Le titre est manquant. Exemple : `.ytsdl 1 audio Bella Ciao`", m);
    }

    // Rechercher à nouveau pour retrouver l’élément choisi
    const s = await yts(query);
    const results = (s.videos || []).slice(0, 5);
    const v = results[index];
    if (!v) {
      return plag.reply(m.chat, "❌ Résultat introuvable pour cet index.", m);
    }

    await plag.reply(m.chat, `📥 LUFFY‑XMD télécharge "${v.title}" en ${format}...`, m);

    if (format === "video") {
      // Envoi vidéo via URL. Si ton bot exige un fichier, il faudra télécharger/convertir en MP4.
      return plag.sendMessage(
        m.chat,
        {
          video: { url: v.url },
          caption: `🎬 ${v.title}\n👤 ${v.author?.name || "Inconnu"}\n⚡ LUFFY‑XMD`,
        },
        { quoted: m }
      );
    }

    // Audio / PTT: on télécharge l’audio via ytdlp.online puis on convertit en opus pour WhatsApp
    const cmd = encodeURIComponent(`-x --audio-format mp3 ${v.url}`);
    const r = await axios.get(`https://ytdlp.online/stream?command=${cmd}`, { responseType: "stream" });

    let dl = null;
    await new Promise((res, rej) => {
      r.data.on("data", chunk => {
        const text = chunk.toString();
        const match = text.match(/href="([^"]+\.(mp3|m4a|webm))"/);
        if (match) dl = `https://ytdlp.online${match[1]}`;
      });
      r.data.on("end", () => (dl ? res() : rej(new Error("Impossible de récupérer l’URL audio."))));
      r.data.on("error", rej);
    });

    if (!dl) {
      return plag.reply(m.chat, "⚠️ Échec de récupération de l’audio.", m);
    }

    const dir = "./Tmp";
    if (!fs.existsSync(dir)) fs.mkdirSync(dir);
    const inPath = path.join(dir, "in.mp3");
    const outPath = path.join(dir, "out.ogg");

    const resp = await fetch(dl);
    const buf = Buffer.from(await resp.arrayBuffer());
    fs.writeFileSync(inPath, buf);

    await new Promise((res, rej) => {
      ffmpeg(inPath)
        .toFormat("ogg")
        .audioCodec("libopus")
        .on("end", res)
        .on("error", rej)
        .save(outPath);
    });

    const opus = fs.readFileSync(outPath);

    await plag.sendMessage(
      m.chat,
      {
        audio: opus,
        mimetype: "audio/ogg; codecs=opus",
        ptt: format === "ptt", // true = note vocale
        contextInfo: {
          externalAdReply: {
            title: v.title,
            body: `Artiste : ${v.author?.name || "Inconnu"}`,
            thumbnailUrl: v.thumbnail,
            sourceUrl: v.url,
            mediaType: 1,
            renderLargerThumbnail: true,
          },
        },
      },
      { quoted: m }
    );

    // Nettoyage
    try { fs.unlinkSync(inPath); } catch {}
    try { fs.unlinkSync(outPath); } catch {}

    await plag.reply(m.chat, `✅ LUFFY‑XMD a envoyé "${v.title}" en ${format} 🎶`, m);
  } catch (e) {
    console.error("YTS Download Error:", e);
    await plag.reply(m.chat, "❌ Une erreur est survenue, réessaie plus tard.", m);
  }
};

searchHandler.command = ["yts"];
searchHandler.tags = ["musique"];
searchHandler.help = ["yts <titre>"];

downloadHandler.command = ["ytsdl"];
downloadHandler.tags = ["musique"];
downloadHandler.help = ["ytsdl <numéro> <format> <titre>"];

module.exports = [searchHandler, downloadHandler];