// /plugins/creategroup.js

const handler = async (m, { plag, text, prefix, command, mime }) => {
    if (!text) {
        return m.reply(
            `Usage: ${prefix + command} [Nom du groupe]\n\nVous pouvez aussi répondre à une image pour l'utiliser comme photo de profil.`
        );
    }

    try {
        await m.reply(global.mess.wait);

        // Crée le groupe avec le nom donné et ajoute le créateur
        const group = await plag.groupCreate(text, [m.sender]);

        let response = `✅ Groupe "${text}" créé avec succès !`;

        // ✅ Promotion automatique du créateur en admin
        try {
            await plag.groupParticipantsUpdate(group.id, [m.sender], "promote");
            response += `\n\n👑 ${m.sender.split("@")[0]} a été promu admin automatiquement.`;
        } catch (e) {
            console.log(e);
            response += `\n\n(Échec de la promotion automatique en admin.)`;
        }

        // Génère le lien d'invitation
        try {
            const code = await plag.groupInviteCode(group.id);
            const inviteLink = `https://chat.whatsapp.com/${code}`;
            response += `\n\n*Lien d'invitation :* ${inviteLink}`;
        } catch (e) {
            response += `\n\n(Impossible de générer un lien d'invitation.)`;
        }

        // Gère la photo de profil (si l'utilisateur a répondu à une image)
        if (m.quoted && /image/.test(mime)) {
            try {
                let media = await m.quoted.download();
                await plag.updateProfilePicture(group.id, media);
                response += `\n\n🖼️ Photo de profil mise à jour !`;
            } catch (e) {
                console.log(e);
                response += `\n\n(Échec de la mise à jour de la photo de profil.)`;
            }
        }

        await m.reply(response);

    } catch (e) {
        console.log(e);
        m.reply(`❌ Erreur lors de la création du groupe : ${e.message}`);
    }
};

handler.command = ["creategroup", "cgroup"];
module.exports = handler;