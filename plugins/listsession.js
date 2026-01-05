// listsession.js
const { listSessions } = require("../lib/session-maker");

const handler = async (m) => {
  const active = listSessions();
  let teks = "📊 *Sessions actives*\n\n";
  teks += `Total: ${active.length}\n`;
  teks += active.map(n => `• ${n}`).join("\n") || "Aucune session active.";
  m.reply(teks);
};

handler.command = ["listsession"];
handler.tags = ["system"];
handler.help = ["listsession"];

module.exports = handler;