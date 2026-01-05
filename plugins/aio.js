// Code pour /plugins/aio.js

const axios = require('axios');

// Fonction d'assistance AIO
async function downr(url) {
  try {
    if (!url.includes('https://')) throw new Error('URL invalide.');
    const { data } = await axios.post(
      'https://downr.org/.netlify/functions/download',
      { url },
      {
        headers: {
          'content-type': 'application/json',
          origin: 'https://downr.org',
          referer: 'https://downr.org/',
          'user-agent': 'Mozilla/5.0 (Linux; Android 15; SM-F958 Build/AP3A.240905.015) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.6723.86 Mobile Safari/537.36',
        },
      }
    );
    return data;
  } catch (error) {
    throw new Error(error.response ? error.response.data.message : error.message);
  }
};

// Handler principal du plugin
const handler = async (m, { plag, text, prefix, command }) => {
  if (!text) return m.reply(`Veuillez fournir un lien (TikTok, X, Instagram, etc.).\n\n*Exemple :* ${prefix + command} https://vt.tiktok.com/ZSygRMVNM/`);

  try {
    await m.reply(global.mess.wait);
    const result = await downr(text);

    if (!result || (!result.media && !result.photo)) { // Vérifie .media ou .photo
      throw new Error('Impossible de trouver un média téléchargeable dans ce lien.');
    }

    let mediaUrl, mediaType, caption;

    // Logique pour Twitter (qui utilise .photo)
    if (result.photo && result.photo.length > 0) {
        mediaUrl = result.photo[0].url;
        mediaType = 'image';
    } 
    // Logique pour AIO (TikTok, Insta, etc. qui utilise .media)
    else if (result.media && result.media.length > 0) {
        // Tente de trouver sans watermak (pour TikTok)
        const media = result.media.find(v => v.quality === 'hd_no_watermark') || result.media[0];
        mediaUrl = media.url;
        mediaType = media.type || (mediaUrl.includes('.mp4') ? 'video' : 'image');
    } else {
        throw new Error('Aucun média trouvé.');
    }

    // --- Réponse Stylée ---
    caption = `
╔═══════ • 🎬 • ═══════╗
     ♛ *A I O - D O W N L O A D* ♛
╚═══════ • 🎬 • ═══════╝

*Titre :* ${result.title || 'Média Téléchargé'}
*Source :* ${result.author || 'Inconnue'}

*${global.nom}*
`;

    if (mediaType === 'video') {
        await plag.sendMessage(m.chat, {
            video: { url: mediaUrl },
            caption: caption,
            mimetype: 'video/mp4'
          }, { quoted: m });
    } else {
        await plag.sendMessage(m.chat, {
            image: { url: mediaUrl },
            caption: caption
          }, { quoted: m });
    }

  } catch (e) {
    console.error('Erreur AIO Downloader:', e);
    m.reply(`🚨 Erreur : ${e.message}`);
  }
};

handler.command = ['aio', 'dl', 'download', 'downr'];
module.exports = handler;