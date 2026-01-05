const handler = async (m, { plag, isAdmin, isOwner, isBotAdmin }) => {
  const text = m.text || m.message?.conversation || "";
  if (!text) return;

  const hasLink = /https?:\/\/|wa\.me\/|chat\.whatsapp\.com\/|t\.me\/|discord\.gg\//i.test(text);
  if (!hasLink) return;

  // Ignorer les admins/owner si tu le souhaites
  if (isAdmin || isOwner) return;

  // Message d’avertissement
  await plag.sendMessage(m.chat, {
    text: `
✦━━━━━━━━━━━━━━━━━━━━✦
🚫 𝐋𝐔𝐅𝐅𝐘‑𝐗𝐌𝐃 𝐀𝐍𝐓𝐈𝐋𝐈𝐍𝐊 🚫
✦━━━━━━━━━━━━━━━━━━━━✦

❌ Les liens ne sont pas autorisés ici.
👤 Auteur : @${m.sender.split('@')[0]}

✦━━━━━━━━━━━━━━━━━━━━✦
✨ Mugiwara no plag – LUFFY‑XMD ✦
`,
    mentions: [m.sender],
    contextInfo: {
      externalAdReply: {
        title: "🚫 Antilink activé",
        body: "Protection du groupe",
        thumbnailUrl: "https://files.cloudkuimages.guru/images/a9ceb14ceff2.jpg",
        sourceUrl: "https://example.com/faux-lien",
        mediaType: 1,
        renderLargerThumbnail: true
      }
    }
  });

  // Suppression du message si le bot est admin et si ton core expose la clé m.key
  if (isBotAdmin && m.key) {
    try { await plag.sendMessage(m.chat, { delete: m.key }); } catch {}
  }
};
handler.all = true;
module.exports = handler;