// Code pour /plugins/save.js

const handler = async (m, { plag, prefix, command }) => {
    
    const quoted = m.quoted ? m.quoted : null;

    if (!quoted) {
        return m.reply(`Veuillez répondre à un média (image, vidéo, sticker, audio) avec la commande *${prefix + command}*`);
    }

    const mime = (quoted.msg || quoted).mimetype || '';
    if (!/image|video|sticker|audio/.test(mime)) {
        return m.reply("Média non supporté. Seules les images, vidéos, stickers et audios peuvent être sauvegardés.");
    }

    try {
        // 1. Réaction "Sablier"
        await plag.sendMessage(m.chat, { react: { text: "⏳", key: m.key } });
        
        const media = await quoted.download();
        const caption = quoted.text || ''; // Récupère la légende originale

        // 2. Préparation de la nouvelle légende
        const newCaption = `${caption}\n\n*Saved by ${global.title || 'LUFFY - XMD'}*`;

        // 3. Renvoi du média
        if (/image/.test(mime)) {
            await plag.sendMessage(m.chat, { image: media, caption: newCaption }, { quoted: m });
        } else if (/video/.test(mime)) {
            await plag.sendMessage(m.chat, { video: media, caption: newCaption }, { quoted: m });
        } else if (/audio/.test(mime)) {
            await plag.sendMessage(m.chat, { audio: media, mimetype: mime, ptt: (mime === 'audio/ogg; codecs=opus') }, { quoted: m });
        } else if (/sticker/.test(mime)) {
            await plag.sendImageAsSticker(m.chat, media, m, { packname: global.packname, author: global.author });
        }
        
        // 4. Réaction "Succès" (remplace le sablier)
        await plag.sendMessage(m.chat, { react: { text: "☑️", key: m.key } });

    } catch (e) {
        console.log(e);
        // Réaction "Erreur"
        await plag.sendMessage(m.chat, { react: { text: "❌", key: m.key } });
        await m.reply(`❌ Une erreur est survenue lors de la sauvegarde : ${e.message}`);
    }
};

handler.command = ["rvo", "vv"];
module.exports = handler;