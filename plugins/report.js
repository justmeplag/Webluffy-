// plugins/report.js

const handler = async (m, { plag, text, prefix, command, pushname, isGroup }) => {
    
    // 1. Vérifie si l'utilisateur a écrit un message
    if (!text) {
        return m.reply(`Veuillez fournir un message pour signaler un bug ou faire une suggestion.\n\n*Exemple :* ${prefix + command} La commande .sticker ne fonctionne pas sur les vidéos.`);
    }
    
    // 2. Vérifie si VOUS avez configuré le numéro du dev
    if (!global.dev) {
        return m.reply("La fonction de rapport est désactivée car aucun numéro de développeur n'a été configuré.");
    }
    
    // 3. Prépare le message pour le développeur (AVEC LE NOM de l'utilisateur)
    const reportMessage = `*-- RAPPORT D'UTILISATEUR --*

*De :* ${pushname} (${m.sender.split('@')[0]})
*Groupe :* ${isGroup ? m.chat : 'Message Privé'}

*Message :*
${text}`;

    try {
        // 4. Le bot envoie le rapport en PM au développeur
        const devJid = global.dev.replace(/[^0-9]/g, '') + '@s.whatsapp.net';
        await plag.sendMessage(devJid, { text: reportMessage });
        
        // 5. Le bot confirme à l'utilisateur
        const confirmation = await m.reply("✅ Merci ! Votre rapport a été envoyé au développeur.");
        
        // 6. Supprime le message original de l'utilisateur (si fromMe = true)
        try {
            await plag.sendMessage(m.chat, { delete: m.key });
            console.log("Message original supprimé :", m.key.id);
        } catch (err) {
            console.error("Échec suppression du message original :", err);
        }

        // 7. Supprime aussi la confirmation après 5 secondes
        setTimeout(async () => {
            try {
                await plag.sendMessage(m.chat, { delete: confirmation.key });
                console.log("Confirmation supprimée :", confirmation.key.id);
            } catch (err) {
                console.error("Échec suppression confirmation :", err);
            }
        }, 5000);

    } catch (e) {
        console.log(e);
        await m.reply("❌ Impossible d'envoyer le rapport pour le moment. Veuillez réessayer plus tard.");
    }
};

// Commandes pour activer ce plugin
handler.command = ["report", "bug", "reporter", "suggestion"];

// Exporter le handler
module.exports = handler;