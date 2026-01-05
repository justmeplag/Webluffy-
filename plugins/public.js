// Code pour /plugins/public.js

const handler = async (m, { plag, command, text, isOwner }) => {
    
    if (!isOwner) {
        return m.reply(global.mess.owner);
    }

    let newStatus;
    if (text.toLowerCase() === 'on' || text === '1') {
        newStatus = true;
    } else if (text.toLowerCase() === 'off' || text === '0') {
        newStatus = false;
    } else {
        return m.reply(`*Usage :* ${prefix + command} [on/off]\n\n*Actuellement :* ${plag.public ? 'ON' : 'OFF'}`);
    }

    if (plag.public === newStatus) {
        return m.reply(`Le mode public est déjà *${newStatus ? 'activé' : 'désactivé'}*`);
    }

    plag.public = newStatus;
    await m.reply(`✅ Le mode public est maintenant *${newStatus ? 'activé' : 'désactivé'}*.\n\nLe bot répondra à *${newStatus ? 'tout le monde' : 'vous (le propriétaire) uniquement'}* dans les groupes.`);
};

handler.command = ["public", "mode"];
module.exports = handler;