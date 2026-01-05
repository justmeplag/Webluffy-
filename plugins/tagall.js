// plugins/tagall.js
// Commande .tagall → annonce stylée avec mentions 1 par ligne

const handler = async (m, { plag, command, text }) => {
  const metadata = await plag.groupMetadata(m.chat);
  const participants = metadata.participants.map(p => p.id);
  const groupName = metadata.subject;
  const sender = m.sender.split('@')[0];

  // Construire la liste des @mentions numérotées, une par ligne
  const mentionLines = participants
    .map((jid, i) => `${(i + 1).toString().padStart(2, '0')}. @${jid.split('@')[0]}`)
    .join('\n');

  // Message stylé
  const caption = `
✦━━━━━━━━━━━━━━━━━━━━✦
         🔥 𝐋𝐔𝐅𝐅𝐘‑𝐗𝐌𝐃 𝐓𝐀𝐆 🔥
✦━━━━━━━━━━━━━━━━━━━━✦

📌 Groupe : ${groupName}
🏴 Tagged by : @${sender}

💬 ${text || "Appel général à tous les membres !"}
👥 Membres : ${participants.length}

${mentionLines}

✦━━━━━━━━━━━━━━━━━━━━✦
✨ Mugiwara no plag – LUFFY‑XMD ✦
`;

  // Faux aperçu de lien stylé
  await plag.sendMessage(m.chat, {
    text: caption,
    mentions: [sender, ...participants],
    contextInfo: {
      externalAdReply: {
        title: "🔥 LUFFY‑XMD TAG",
        body: "Annonce officielle du groupe",
        thumbnailUrl: "https://files.cloudkuimages.guru/images/a9ceb14ceff2.jpg", // image d’aperçu
        sourceUrl: "https://example.com/faux-lien", // faux lien
        mediaType: 1,
        renderLargerThumbnail: true
      }
    }
  });
};

handler.command = ['tagall'];
module.exports = handler;