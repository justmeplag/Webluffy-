// Code pour /plugins/kickall.js

const handler = async (m, { plag, participants, isGroup, isBotAdmins, isAdmins }) => {
    if (!isGroup) return m.reply(global.mess.group);
    if (!isAdmins) return m.reply(global.mess.admin);
    if (!isBotAdmins) return m.reply(global.mess.botAdmin);

    await m.reply("⚠️ *KICK ALL EN COURS !* ⚠️\nExclusion de tous les membres...");
    
    // Ne peut pas kicker le créateur, le bot, ou d'autres admins
    let members = participants.filter(p => !p.admin && p.id !== plag.user.id).map(p => p.id);
    if (members.length === 0) return m.reply("Aucun membre à exclure.");

    try {
        for (let user of members) {
            await plag.groupParticipantsUpdate(m.chat, [user], 'remove');
            await new Promise(resolve => setTimeout(resolve, 300)); // Plus rapide
        }
        await m.reply(`✅ Exclusion de ${members.length} membres terminée.`);
    } catch (e) {
        await m.reply(`❌ Une erreur est survenue : ${e.message}`);
    }
};
handler.command = ["kickall", "byebye"];
module.exports = handler;