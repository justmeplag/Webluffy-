// Code pour /plugins/jid.js

const handler = async (m, { plag, text } = {}) => {
    
    let jid;
    
    if (m.quoted) {
        // Si le message cite quelqu'un, prend le JID de cette personne
        jid = m.quoted.sender;
    } else if (m.mentionedJid && m.mentionedJid[0]) {
        // Si un utilisateur est mentionné, prend le JID du premier mentionné
        jid = m.mentionedJid[0];
    } else {
        // Sinon, prend le JID du chat actuel (groupe ou privé)
        jid = m.chat;
    }
    
    // Répond avec le JID
    await m.reply(jid);
};

// Commandes pour activer ce plugin
handler.command = ["jid", "getjid"];

// Exporter le handler
module.exports = handler;