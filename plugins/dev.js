// Code pour /plugins/dev.js

const handler = async (m, { plag } = {}) => {
    
    // Vérifie si les variables globales sont définies
    if (!global.dev || !global.devname) {
        return m.reply("Le numéro ou le nom du développeur n'est pas configuré dans `secrets.js`.");
    }

    try {
        // Crée les données de la vCard
        const vcardData = [
            [global.dev, global.devname] // [numéro, nom]
        ];
        
        // Envoie le contact
        await plag.sendContact(m.chat, vcardData, m);
        
    } catch (e) {
        console.log(e);
        m.reply("Impossible d'envoyer la vCard du développeur.");
    }
};

// Commandes pour activer ce plugin
handler.command = ["dev", "developpeur", "developer"];

// Exporter le handler
module.exports = handler;