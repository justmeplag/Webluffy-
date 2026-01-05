// Code pour /plugins/sticker.js

const handler = async (m, { plag, prefix, command }) => {
    
    // On vérifie si un message est cité
    const quoted = m.quoted ? m.quoted : m;
    const mime = (quoted.msg || quoted).mimetype || '';

    if (!/image|video/.test(mime)) {
        return m.reply(`Répondez à une image ou une vidéo avec la commande *${prefix + command}*`);
    }

    try {
        await m.reply(global.mess.wait);
        
        // On télécharge le média directement
        const media = await quoted.download();

        if (/image/.test(mime)) {
            // Envoi du sticker image
            await plag.sendImageAsSticker(m.chat, media, m, {
                packname: global.packname,
                author: global.author
            });
        } else if (/video/.test(mime)) {
            // Vérification de la durée de la vidéo
            if ((quoted.msg || quoted).seconds > 10) {
                return m.reply('La vidéo ne doit pas dépasser 10 secondes.');
            }
            // Envoi du sticker vidéo
            await plag.sendVideoAsSticker(m.chat, media, m, {
                packname: global.packname,
                author: global.author
            });
        }
    } catch (e) {
        console.log(e);
        await m.reply("❌ Une erreur est survenue lors de la création du sticker.");
    }
};

handler.command = ["sticker", "s", "stiker"];

module.exports = handler;