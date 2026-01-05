const axios = require("axios");

const handlerPpInterval = async (m, { plag, args }) => {
  try {
    // Sécuriser args
    const parts = (args && args.length) ? args : m.text.split(" ").slice(1);
    const minutes = parts[0] ? parseInt(parts[0]) : null;

    if (!minutes || isNaN(minutes) || minutes <= 0) {
      return plag.sendMessage(m.chat, {
        text: "💀 [LUFFY-XMD] Fournis un intervalle en minutes (>0)."
      }, { quoted: m });
    }

    if (!global.ppList || global.ppList.length === 0) {
      return plag.sendMessage(m.chat, {
        text: "💀 [LUFFY-XMD] Aucune image enregistrée. Utilise .setppadd d’abord."
      }, { quoted: m });
    }

    if (global.ppInterval) clearInterval(global.ppInterval);

    global.ppInterval = setInterval(async () => {
      try {
        const randomUrl = global.ppList[Math.floor(Math.random() * global.ppList.length)];
        const { data } = await axios.get(randomUrl, { responseType: "arraybuffer" });
        await plag.updateProfilePicture(plag.user.id, data);
        console.log(`⚡ [LUFFY-XMD] PP changée automatiquement → ${randomUrl}`);
      } catch (err) {
        console.error("AUTO-PP ERROR:", err);
      }
    }, minutes * 60 * 1000);

    await plag.sendMessage(m.chat, { react: { text: "☑️", key: m.key } });
    await plag.sendMessage(m.chat, {
      text: `⚡ [LUFFY-XMD] Intervalle défini : ${minutes} min.\nPP changera aléatoirement parmi ${global.ppList.length} images.\n\n🔖 LUFFY-XMD BY PLAG`
    }, { quoted: m });

  } catch (err) {
    console.error("PPINTERVAL ERROR:", err);
    await plag.sendMessage(m.chat, {
      text: "💀 [LUFFY-XMD] Erreur lors de la configuration de l’intervalle."
    }, { quoted: m });
  }
};

handlerPpInterval.command = ["ppinterval"];
handlerPpInterval.help = ["ppinterval <minutes>"];
handlerPpInterval.tags = ["owner"];

module.exports = handlerPpInterval;