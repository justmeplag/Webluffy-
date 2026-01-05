const handlerJoin = async (m, { plag, args }) => {
  try {
    // Sécurisation : args peut être undefined
    let link = (args && args[0]) ? args[0] : null;

    // Si pas d'argument, on tente de récupérer depuis le message cité
    if (!link && m.quoted && m.quoted.text) {
      link = m.quoted.text;
    }

    // Si toujours rien → erreur stylisée
    if (!link) {
      return plag.sendMessage(m.chat, {
        text: "💀 [LUFFY-XMD] Fournis ou réponds à un lien d'invitation de groupe.",
      }, { quoted: m });
    }

    // Extraction du code
    const match = link.match(/chat\.whatsapp\.com\/([0-9A-Za-z]{22})/);
    if (!match || !match[1]) {
      return plag.sendMessage(m.chat, {
        text: "💀 [LUFFY-XMD] Lien invalide ou code introuvable.",
      }, { quoted: m });
    }

    const code = match[1];
    await plag.groupAcceptInvite(code);

    // Feedback dramatique
    await plag.sendMessage(m.chat, { react: { text: "☑️", key: m.key } });
    await plag.sendMessage(m.chat, {
      text: `⚡ [LUFFY-XMD] Groupe rejoint avec succès !\n\n🔖 LUFFY-XMD BY PLAG`,
    }, { quoted: m });

  } catch (err) {
    console.error("JOIN ERROR:", err);
    await plag.sendMessage(m.chat, {
      text: "💀 [LUFFY-XMD] Erreur lors de la tentative de rejoindre le groupe.",
    }, { quoted: m });
  }
};

handlerJoin.command = ["join"];
handlerJoin.help = ["join <lien d'invitation> ou reply au lien"];
handlerJoin.tags = ["group"];

module.exports = handlerJoin;