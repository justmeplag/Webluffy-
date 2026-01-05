const store = require("../lib/aliasStore");

const handler = async (m, { plag }) => {
  const parts = m.text.replace(/^(\.setcmd)\s*/i, "").split(",");
  if (parts.length < 2) return plag.sendMessage(m.chat, { react: { text: "❌", key: m.key } });

  const cmd = parts[0].trim().replace(/^\./, "");
  const alias = parts[1].trim().toLowerCase();

  store.set(alias, cmd);
  await plag.sendMessage(m.chat, { react: { text: "☑️", key: m.key } });
};

handler.command = ["setcmd"];
handler.tags = ["system"];
handler.help = ["setcmd <commande> , <alias>"];

module.exports = handler;