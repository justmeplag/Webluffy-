const axios = require("axios");

const API_URL = "https://anabot.my.id/api/ai/suno";

const API_KEY = "freeApikey";

const handler = async (m, { plag, text }) => {

  try {

    // Format attendu: .iasong <titre> | <style> | <lyrics>

    const parts = text.split("|").map(p => p.trim());

    if (parts.length < 3) {

      return plag.sendMessage(m.chat, {

        text: "❌ Format invalide.\nExemple: .iasong MonTitre | Pop, Rock | Voici mes paroles..."

      });

    }

    const [title, style, lyrics] = parts;

    await plag.sendMessage(m.chat, { react: { text: "⏳", key: m.key } });

    await plag.sendMessage(m.chat, { text: `🎶 Génération en cours...\nTitre: *${title}*\nStyle: *${style}*` });

    // Appel API

    const res = await axios.get(API_URL, {

      params: {

        lyrics,

        instrumen: "no",

        style,

        apikey: API_KEY

      }

    });

    const data = res.data;

    if (!data.success || !data.data || !data.data.result || !data.data.result[0]) {

      return plag.sendMessage(m.chat, { text: "❌ Erreur API: " + (data.message || "Réponse invalide") });

    }

    const song = data.data.result[0];

    const audioUrl = song.audio_url;

    if (!audioUrl) {

      return plag.sendMessage(m.chat, { text: "❌ Audio URL manquant dans la réponse." });

    }

    // Téléchargement du buffer audio

    const audioRes = await axios.get(audioUrl, { responseType: "arraybuffer" });

    const audioBuffer = Buffer.from(audioRes.data);

    // Envoi du fichier audio

    await plag.sendMessage(m.chat, {

      audio: audioBuffer,

      mimetype: "audio/mpeg",

      fileName: `${title}.mp3`,

      caption: `✅ *${title}*\nStyle: ${style}\nLyrics: ${lyrics.substring(0, 50)}...`

    }, { quoted: m });

    await plag.sendMessage(m.chat, { react: { text: "☑️", key: m.key } });

  } catch (err) {

    console.error("IASONG ERROR:", err);

    await plag.sendMessage(m.chat, { react: { text: "❌", key: m.key } });

    await plag.sendMessage(m.chat, { text: "❌ Échec de génération de la chanson." });

  }

};

handler.command = ["iasong"];

handler.usePrefix = true;

module.exports = handler;