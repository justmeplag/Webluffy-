// plugins/mode.js

const handler = async (m, { plag, text, prefix, command, isOwner }) => {
    if (!isOwner) return m.reply("❌ Seul le propriétaire peut changer le mode.");
    if (!text) return m.reply(`Usage : ${prefix + command} [pv/pc]`);

    let mode = text.trim().toLowerCase();

    if (mode === "pv") {
        plag.public = false;
        m.reply("🔒 Mode privé activé : le bot ne répond qu’à ses propres messages et aux owners.");
    } else if (mode === "pc") {
        plag.public = true;
        m.reply("🌍 Mode public activé : le bot répond à tout le monde.");
    } else {
        m.reply(`Option invalide. Utilisez : ${prefix + command} pv ou ${prefix + command} pc`);
    }
};

handler.command = ["mode"];
module.exports = handler;