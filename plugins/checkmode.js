// plugins/checkmode.js

const handler = async (m, { plag }) => {
    let status = plag.public ? "🌍 Public" : "🔒 Privé";
    m.reply(`⚙️ Le bot est actuellement en mode : *${status}*`);
};

handler.command = ["checkmode", "modestatus"];
module.exports = handler;