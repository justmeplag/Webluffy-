const fs = require("fs");
const path = require("path");

const ppFile = path.join(__dirname, "../pp.json");

const handlerPpClear = async (m, { plag }) => {
  try {
    if (!global.ppList || global.ppList.length === 0) {
      return plag.sendMessage(m.chat, { text: "💀 [LUFFY-XMD] La liste PP est déjà vide." }, { quoted: m });
    }

    global.ppList = [];

    if (global.ppInterval) {
      clearInterval(global.ppInterval);
      global.ppInterval = null;
    }

    // Sauvegarde persistante
    fs.writeFileSync(ppFile, JSON.stringify(global.ppList, null, 2));

    await plag.sendMessage(m.chat, { react: { text: "🗑️", key: m.key } });
    await plag.sendMessage(m.chat, {
      text: "⚡ [LUFFY-XMD] Liste PP vidée avec succès.\n\n🔖 LUFFY-XMD BY PLAG"
    }, { quoted: m });

  } catch (err) {
    console.error("PPCLEAR ERROR:", err);
    await plag.sendMessage(m.chat, { text: "💀 [LUFFY-XMD] Erreur lors du nettoyage de la liste PP." }, { quoted: m });
  }
};

handlerPpClear.command = ["ppclear"];
handlerPpClear.help = ["ppclear (vide la liste PP et stoppe l’intervalle)"];
handlerPpClear.tags = ["owner"];

module.exports = handlerPpClear;