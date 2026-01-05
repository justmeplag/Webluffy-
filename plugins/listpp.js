const fs = require("fs");
const path = require("path");

const ppFile = path.join(__dirname, "../pp.json");

const handlerListpp = async (m, { plag }) => {
  try {
    // Charger la liste depuis le fichier pour être sûr qu'elle est à jour
    if (fs.existsSync(ppFile)) {
      global.ppList = JSON.parse(fs.readFileSync(ppFile));
    } else {
      global.ppList = [];
    }

    if (!global.ppList || global.ppList.length === 0) {
      return plag.sendMessage(m.chat, {
        text: "💀 [LUFFY-XMD] Aucune image enregistrée. Utilise .setppadd d’abord."
      }, { quoted: m });
    }

    let text = "⚡ [LUFFY-XMD] Liste des images enregistrées :\n\n";
    global.ppList.forEach((url, i) => {
      text += `${i + 1}. 🖼️ ${url}\n`;
    });

    await plag.sendMessage(m.chat, {
      text: `${text}\n\n🔖 LUFFY-XMD BY PLAG`
    }, { quoted: m });

  } catch (err) {
    console.error("LISTPP ERROR:", err);
    await plag.sendMessage(m.chat, {
      text: "💀 [LUFFY-XMD] Erreur lors de l’affichage de la liste PP."
    }, { quoted: m });
  }
};

handlerListpp.command = ["listpp"];
handlerListpp.help = ["listpp (affiche toutes les images enregistrées)"];
handlerListpp.tags = ["owner"];

module.exports = handlerListpp;