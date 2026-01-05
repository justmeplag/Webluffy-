const handler = async (m, { plag, args }) => {
  try {
    // Déterminer la cible : soit le message cité, soit l'auteur de la commande
    const target = m.quoted ? m.quoted.sender : m.sender;
    const userId = target.split("@")[0];

    // Récupérer la photo de profil
    let ppUrl;
    try {
      ppUrl = await plag.profilePictureUrl(target, "image");
    } catch {
      ppUrl = "https://telegra.ph/file/3f1c3b3f3f1c3b3f3f1c.jpg"; // fallback si pas de photo
    }

    // Construire le message d'infos avec watermark
    let info = `⚡ [LUFFY-XMD WHOIS]\n\n`;
    info += `👤 ID: ${userId}\n`;
    info += `📱 JID: ${target}\n`;
    if (m.pushName) info += `🏷️ Nom: ${m.pushName}\n`;
    info += `💬 Chat: ${m.chat}\n\n`;
    info += `━━━━━━━━━━━━━━━━━━━━━━\n`;
    info += `🔖 LUFFY-XMD BY PLAG\n`;

    // Feedback dramatique
    await plag.sendMessage(m.chat, { react: { text: "☑️", key: m.key } });

    // Envoyer la photo + infos
    await plag.sendMessage(m.chat, {
      image: { url: ppUrl },
      caption: info
    }, { quoted: m });

  } catch (err) {
    console.error("WHOIS ERROR:", err);
    await plag.sendMessage(m.chat, { 
      text: "💀 [LUFFY-XMD WHOIS] Erreur lors de la récupération des infos." 
    }, { quoted: m });
  }
};

handler.command = ["whois"];
handler.help = ["whois (répondre à un message ou exécuter directement)"];
handler.tags = ["info"];

module.exports = handler;