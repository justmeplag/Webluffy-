// Code pour /plugins/owner.js
const fs = require('fs');

const handler = async (m, { plag }) => {
    
    // Vérifie si la variable globale est définie
    if (!global.owner) {
        return m.reply("Le numéro du propriétaire n'est pas configuré dans `config.js`.");
    }

    try {
        // Crée la vCard pour le propriétaire principal
        const vcardData = [
            [global.owner, "Propriétaire Principal"] // [numéro, nom]
        ];
        
        // Envoie la fiche de contact
        await plag.sendContact(m.chat, vcardData, m);

        // Lit la liste des autres propriétaires (si elle existe)
        const otherOwners = JSON.parse(fs.readFileSync('./lib/database/owner.json'));
        if (otherOwners && otherOwners.length > 0) {
            await m.reply(`Voici la liste des autres propriétaires :\n${otherOwners.map(v => `- @${v}`).join('\n')}`, {
                mentions: otherOwners.map(v => v + '@s.whatsapp.net')
            });
        }
        
    } catch (e) {
        console.log(e);
        m.reply("Impossible d'envoyer la vCard du propriétaire.");
    }
};

handler.command = ["owner", "creator", "propriétaire"];

module.exports = handler;