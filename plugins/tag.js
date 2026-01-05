// Code pour /plugins/tag.js

const handler = async (m, { plag, participants, isGroup, text }) => {
    if (!isGroup) return m.reply(global.mess.group);
    
    let users = participants.map(u => u.id);
    let message = text || m.quoted?.text;
    
    if (!message) return m.reply("Veuillez fournir un message à taguer.");

    // Envoie le message avec les mentions, mais sans les afficher dans le texte
    await plag.sendMessage(m.chat, { text: message, mentions: users }, { quoted: m });
};
handler.command = ["tag", "hiddentag", "mention"];
module.exports = handler;