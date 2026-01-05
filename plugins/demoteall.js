// Code pour /plugins/demoteall.js

const handler = async (m, { plag, participants, isGroup, isBotAdmins, isAdmins, groupOwner }) => {
    if (!isGroup) return m.reply(global.mess.group);
    if (!isAdmins) return m.reply(global.mess.admin);
    if (!isBotAdmins) return m.reply(global.mess.botAdmin);

    await m.reply("Rétrogradation de tous les admins en cours...");
    
    // Filtre pour ne garder que les admins (exclut le créateur et le bot)
    let admins = participants.filter(p => p.admin && p.id !== groupOwner && p.id !== plag.user.id).map(p => p.id);
    if (admins.length === 0) return m.reply("Aucun admin à rétrograder.");

    try {
        for (let user of admins) {
            await plag.groupParticipantsUpdate(m.chat, [user], 'demote');
            await new Promise(resolve => setTimeout(resolve, 500)); 
        }
        await m.reply(`✅ Rétrogradation de ${admins.length} admins terminée.`);
    } catch (e) {
        await m.reply(`❌ Une erreur est survenue : ${e.message}`);
    }
};
handler.command = ["demoteall"];
module.exports = handler;