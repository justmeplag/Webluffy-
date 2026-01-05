const store = require("../lib/aliasStore");

const handler = async (m, { plag }) => {
  const aliases = store.list();
  const keys = Object.keys(aliases);

  if (!keys.length) return plag.sendMessage(m.chat, { react: { text: "❌", key: m.key } });

  let teks = "⚡ *Liste des alias* ⚡\n\n";
  keys.forEach(a => {
    teks += `• ${a} → .${aliases[a]}\n`;
  });

  await plag.sendMessage(m.chat, { text: teks });
};

handler.command = ["listcmd"];
handler.tags = ["system"];
handler.help = ["listcmd"];

module.exports = handler;