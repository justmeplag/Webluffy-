const fetch = require("node-fetch");

const handler = async (m, { plag }) => {
  const sender = m.sender;
  const isOwner = sender.includes(global.owner);
  const isPremium = global.premium.includes(sender);
  if (!isOwner && !isPremium) {
    return m.reply("❌ Cette commande est réservée aux administrateurs.");
  }

  const raw = m.text.trim().replace(/^[.\-_/\\]?addpanel\s*/i, "");
  const parts = raw.split(/\s+/).filter(Boolean);

  const userId = parts[0];
  const config = parts[1] ? parts[1].toLowerCase() : null;

  if (!userId) {
    return m.reply("📌 Usage : .addpanel <iduser> [config]\n\nConfig dispo : 2gb, 4gb, unlimited");
  }

  // Si pas de config → afficher les boutons
  if (!config) {
    return plag.sendMessage(m.chat, {
      text: `🔧 Choisis une configuration RAM pour le panel de l’utilisateur ${userId}.`,
      footer: `© 2026 ${global.nom}`,
      buttons: [
        { buttonId: `.addpanel ${userId} 2gb`, buttonText: { displayText: "2GB" }, type: 1 },
        { buttonId: `.addpanel ${userId} 4gb`, buttonText: { displayText: "4GB" }, type: 1 },
        { buttonId: `.addpanel ${userId} unlimited`, buttonText: { displayText: "Unlimited" }, type: 1 },
      ],
      headerType: 1
    }, { quoted: m });
  }

  // Définir les specs selon la config
  let limits;
  if (config === "2gb") limits = { memory: 2000, disk: 2000, cpu: 60 };
  else if (config === "4gb") limits = { memory: 4000, disk: 4000, cpu: 100 };
  else if (config === "unlimited" || config === "unli") limits = { memory: 0, disk: 0, cpu: 0 };
  else return m.reply("❌ Configuration inconnue.\nOptions: 2gb, 4gb, unlimited");

  try {
    // Récupérer l’egg
    const eggRes = await fetch(`${global.domain}/api/application/nests/${global.nestid}/eggs/${global.egg}`, {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: "Bearer " + global.apikey,
      },
    });
    const eggData = await eggRes.json();
    const startupCmd = eggData.attributes.startup;

    // Créer le serveur pour l’utilisateur EXISTANT
    const res = await fetch(`${global.domain}/api/application/servers`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: "Bearer " + global.apikey,
      },
      body: JSON.stringify({
        name: `panel-${userId}`,
        description: `𝐏𝐎𝐖𝐄𝐑𝐄𝐃 𝐁𝐘 ${global.nom} 😇`,
        user: parseInt(userId), // ⚡ Ici on utilise l’ID fourni
        egg: parseInt(global.egg),
        docker_image: "ghcr.io/parkervcp/yolks:nodejs_18",
        startup: startupCmd,
        environment: {
          INST: "npm",
          USER_UPLOAD: "0",
          AUTO_UPDATE: "0",
          CMD_RUN: "npm start",
        },
        limits: {
          memory: limits.memory,
          swap: 0,
          disk: limits.disk,
          io: 500,
          cpu: limits.cpu,
        },
        feature_limits: {
          databases: 1,
          backups: 1,
          allocations: 1,
        },
        deploy: {
          locations: [parseInt(global.loc)],
          dedicated_ip: false,
          port_range: [],
        },
      }),
    });

    const data = await res.json();
    if (data.errors) {
      return m.reply(`❌ Erreur création panel → ${JSON.stringify(data.errors[0], null, 2)}`);
    }

    const server = data.attributes;

    const teks = `
✅ *Panel ajouté avec succès !*

👤 User ID: ${userId}
🖥️ Serveur ID: ${server.id}
⚡ Configuration: ${config.toUpperCase()}
🌐 Panel: ${global.domain}
`;

    if (m.isGroup) {
      await plag.sendMessage(m.chat, { text: `✅ Panel ajouté pour @${sender.split("@")[0]} (User ${userId}).`, mentions: [sender] }, { quoted: m });
      await plag.sendMessage(sender, { text: teks });
    } else {
      await plag.sendMessage(m.chat, { text: teks }, { quoted: m });
    }

  } catch (e) {
    console.error(e);
    m.reply("❌ Erreur lors de l’ajout du panel: " + e.message);
  }
};

handler.command = ["addpanel"];
handler.tags = ["pterodactyl"];
handler.help = ["addpanel <iduser> [config]"];

module.exports = handler;