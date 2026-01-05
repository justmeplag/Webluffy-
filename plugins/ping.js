// /plugins/ping.js

const handler = async (m, { plag }) => {
  const startTime = new Date();
  const userTime = new Date(m.messageTimestamp * 1000);

  const processingSpeed = new Date() - startTime;
  const totalLatency = new Date() - userTime;

  const uptimeMilliseconds = process.uptime() * 1000;
  const formattedUptime = formatTime(uptimeMilliseconds);

  const styledText = `
✦━━━━━━━━━━━━━━━━━━━━✦
             ♛ 𝐋 𝐔 𝐅 𝐅 𝐘 ‑ 𝐗 𝐌 𝐃 ♛
✦━━━━━━━━━━━━━━━━━━━━✦

🏓 𝙋 𝙊 𝙉 𝙂
📡 Latence : ${totalLatency} ms
⚙️ Traitement : ${processingSpeed} ms
⏱️ Uptime : ${formattedUptime}

✦━━━━━━━━━━━━━━━━━━━━✦
✨ Mugiwara no plag – LUFFY‑XMD ✦
`;

  // 🔹 Faux quoted simulant une réponse à un statut WhatsApp vérifié
  const quotedStatusLUFFYXMD = {
    key: {
      remoteJid: 'status@broadcast',
      fromMe: false,
      id: 'LUFFY-XMD-FAUX-STATUS'
    },
    message: {
      extendedTextMessage: {
        text: "Statut officiel\nRéponse • LUFFY‑XMD",
        contextInfo: {
          externalAdReply: {
            title: "Statut officiel • Verified",
            body: "Réponse • LUFFY‑XMD",
            thumbnailUrl: "https://files.cloudkuimages.guru/images/a9ceb14ceff2.jpg", // miniature stylisée
            sourceUrl: "https://whatsapp.com",
            mediaType: 1,
            showAdAttribution: true,
            renderLargerThumbnail: false
          }
        }
      }
    }
  };

  await plag.sendMessage(m.chat, {
    text: styledText,
    contextInfo: {
      externalAdReply: {
        title: "♛ LUFFY‑XMD PING ♛",
        body: "Statut et latence du bot",
        thumbnailUrl: "https://files.cloudkuimages.guru/images/a9ceb14ceff2.jpg",
        sourceUrl: "https://example.com/faux-lien",
        mediaType: 1,
        renderLargerThumbnail: true
      }
    }
  }, { quoted: quotedStatusLUFFYXMD });
};

handler.command = ["ping", "speed"];
module.exports = handler;

// Fonction locale pour formater l’uptime
function formatTime(ms) {
  let seconds = Math.floor(ms / 1000);
  let minutes = Math.floor(seconds / 60);
  let hours = Math.floor(minutes / 60);
  let days = Math.floor(hours / 24);

  seconds %= 60;
  minutes %= 60;
  hours %= 24;

  return `${days}j ${hours}h ${minutes}m ${seconds}s`;
}