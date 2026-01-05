// Code pour /plugins/promoteall.js

const handler = async (m, { plag, participants, isGroup, isBotAdmins, isAdmins }) => {
    if (!isGroup) return m.reply(global.mess.group);
    if (!isAdmins) return m.reply(global.mess.admin);
    if (!isBotAdmins) return m.reply(global.mess.botAdmin);

    await m.reply("Promotion de tous les membres en cours...");
    let nonAdmins = participants.filter(p => !p.admin).map(p => p.id);
    if (nonAdmins.length === 0) return m.reply("Tout le monde est déjà admin !");

    try {
        for (let user of nonAdmins) {
            await plag.groupParticipantsUpdate(m.chat, [user], 'promote');
            await new Promise(resolve => setTimeout(resolve, 500)); // Évite le spam API
        }
        await m.reply(`✅ Promotion de ${nonAdmins.length} membres terminée.`);
    } catch (e) {
        await m.reply(`❌ Une erreur est survenue : ${e.message}`);
    }
};
handler.command = ["promoteall"];
module.exports = handler;