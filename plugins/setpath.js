// plugins/setpath.js
const { writeDestinationJid } = require("../lib/destination");

const handler = async (m, { plag }) => {
  const fullText =
    m.text ||
    m.body ||
    m.message?.conversation ||
    m.message?.extendedTextMessage?.text ||
    "";

  const jid = fullText.replace(/^(\.setpath)\s*/i, "").trim();

  if (!jid || !/@s\.whatsapp\.net$/.test(jid)) {
    return plag.reply(
      m.chat,
      "⚡ Utilisation : `.setpath <numéro@s.whatsapp.net>`\nExemple : `.setpath 225XXXXXXXX@s.whatsapp.net`",
      m
    );
  }

  try {
    writeDestinationJid(jid);
    await plag.reply(m.chat, `✅ JID de destination enregistré : ${jid}`, m);
  } catch (e) {
    console.error("Setpath Error:", e);
    await plag.reply(m.chat, "❌ Erreur lors de l’enregistrement du JID.", m);
  }
};

handler.command = ["setpath"];
handler.tags = ["system"];
handler.help = ["setpath <numéro@s.whatsapp.net>"];

module.exports = handler;