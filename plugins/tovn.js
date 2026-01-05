// tovn.js (ou ta base tovn/toptt)

const { toPTT } = require('../lib/converter');

const handler = async (m, { plag, prefix, command }) => {

  const mime = (m.quoted?.mimetype || '');

  if (!/video/.test(mime) && !/audio/.test(mime)) {

    return plag.sendMessage(m.chat, { text: `Reply à une vidéo/audio avec ${prefix + command}` }, { quoted: m });

  }

  plag.sendMessage(m.chat, { text: '⏳ Conversion en cours...' }, { quoted: m });

  try {

    const media = await plag.downloadMediaMessage(m.quoted);

    // Si c'est une vidéo en entrée, mets 'mp4'; si c'est un audio, mets 'ogg' ou 'mp3'

    const isVideo = /video/.test(mime);

    const audio = await toPTT(media, isVideo ? 'mp4' : 'ogg');

    await plag.sendMessage(m.chat, {

      audio,

      mimetype: 'audio/ogg; codecs=opus',

      ptt: true

    }, { quoted: m });

    plag.sendMessage(m.chat, { react: { text: '✅', key: m.key } });

  } catch (e) {

    plag.sendMessage(m.chat, { text: `❌ Erreur conversion: ${e.message}` }, { quoted: m });

  }

};

handler.command = ['tovn', 'toptt'];

module.exports = handler;