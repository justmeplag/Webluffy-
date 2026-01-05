// Code pour /plugins/mp3.js

const fs = require('fs');
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');

const handler = async (m, { plag, prefix, command }) => {
    
    const quoted = m.quoted ? m.quoted : m;
    const mime = (quoted.msg || quoted).mimetype || '';

    if (!/video/.test(mime)) {
        return m.reply(`Répondez à une vidéo avec la commande *${prefix + command}*`);
    }

    try {
        await m.reply(global.mess.wait);
        
        const media = await quoted.download();
        
        // Définir les chemins temporaires
        const inPath = path.join(__dirname, '../tmp', `${Date.now()}_input.mp4`);
        const outPath = path.join(__dirname, '../tmp', `${Date.now()}_output.mp3`);
        
        // Écrire le média téléchargé dans un fichier temporaire
        fs.writeFileSync(inPath, media);

        // Exécuter la conversion ffmpeg
        ffmpeg(inPath)
            .outputOptions([
                '-vn', // Extraire l'audio (pas de vidéo)
                '-acodec', 'libmp3lame', // Codec MP3
                '-b:a', '192k', // Bitrate de 192kbps
                '-ar', '44100', // Fréquence d'échantillonnage
                '-ac', '2' // Stéréo
            ])
            .save(outPath)
            .on('end', async () => {
                // Envoyer le fichier MP3
                await plag.sendMessage(m.chat, { 
                    audio: fs.readFileSync(outPath), 
                    mimetype: 'audio/mpeg' 
                }, { quoted: m });
                
                // Nettoyer les fichiers temporaires
                fs.unlinkSync(inPath);
                fs.unlinkSync(outPath);
            })
            .on('error', (err) => {
                console.log(err);
                m.reply(`Erreur lors de la conversion FFMPEG: ${err.message}`);
                // Nettoyer en cas d'erreur
                fs.unlinkSync(inPath);
                if (fs.existsSync(outPath)) fs.unlinkSync(outPath);
            });

    } catch (e) {
        console.log(e);
        await m.reply(`❌ Une erreur est survenue : ${e.message}`);
    }
};

handler.command = ["mp3", "toaudio"];
module.exports = handler;