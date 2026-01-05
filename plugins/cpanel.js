// /plugins/cpanel.js
const crypto = require("crypto");
const fetch = require("node-fetch");

const handler = async (m, { plag, text, prefix, command }) => {
  // ✅ Vérification admin (owner ou premium)
  const sender = m.sender;
  const isOwner = sender.includes(global.owner);
  const isPremium = global.premium.includes(sender);
  if (!isOwner && !isPremium) {
    return m.reply("❌ Cette commande est réservée aux administrateurs.");
  }

  if (!text) {
    return plag.sendMessage(m.chat, {
      text: "📌 Choisis une configuration RAM pour ton serveur.\nExemple: .cpanel 2gb",
      footer: `© 2025 ${global.nom}`,
      buttons: [
        { buttonId: ".cpanel 1gb", buttonText: { displayText: "1GB" }, type: 1 },
        { buttonId: ".cpanel 2gb", buttonText: { displayText: "2GB" }, type: 1 },
        { buttonId: ".cpanel 4gb", buttonText: { displayText: "4GB" }, type: 1 },
        { buttonId: ".cpanel unlimited", buttonText: { displayText: "Unlimited" }, type: 1 },
      ],
      headerType: 1
    }, { quoted: m });
  }

  let Obj = {};
  const cmd = text.toLowerCase();

  if (cmd === "1gb") Obj = { ram: "1000", disk: "1000", cpu: "40" };
  else if (cmd === "2gb") Obj = { ram: "2000", disk: "2000", cpu: "60" };
  else if (cmd === "4gb") Obj = { ram: "4000", disk: "4000", cpu: "100" };
  else if (cmd === "unli" || cmd === "unlimited") Obj = { ram: "0", disk: "0", cpu: "0" };
  else return m.reply("❌ Configuration inconnue.");

  try {
    // 🔑 Génération d’un username aléatoire avec branding LUFFY
    const randomHex = crypto.randomBytes(3).toString("hex");
    const username = `luffy${randomHex}`;
    const email = `${username}@gmail.com`;
    const password = username + crypto.randomBytes(2).toString("hex");

    // Création utilisateur
    const f = await fetch(global.domain + "/api/application/users", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: "Bearer " + global.apikey,
      },
      body: JSON.stringify({
        email,
        username,
        first_name: "LUFFY",
        last_name: "XMD",
        language: "en",
        password,
      }),
    });
    const data = await f.json();
    if (data.errors) return m.reply(JSON.stringify(data.errors[0], null, 2));
    const user = data.attributes;

    // Récupération egg
    const f1 = await fetch(global.domain + `/api/application/nests/${global.nestid}/eggs/${global.egg}`, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: "Bearer " + global.apikey,
      },
    });
    const data2 = await f1.json();
    const startup_cmd = data2.attributes.startup;

    // Création serveur
    const f2 = await fetch(global.domain + "/api/application/servers", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: "Bearer " + global.apikey,
      },
      body: JSON.stringify({
        name: `${username}-server`,
        description: `𝐏𝐎𝐖𝐄𝐑𝐄𝐃 𝐁𝐘 ${global.nom} 😇`,
        user: user.id,
        egg: parseInt(global.egg),
        docker_image: "ghcr.io/parkervcp/yolks:nodejs_18",
        startup: startup_cmd,
        environment: {
          INST: "npm",
          USER_UPLOAD: "0",
          AUTO_UPDATE: "0",
          CMD_RUN: "npm start",
        },
        limits: {
          memory: Obj.ram,
          swap: 0,
          disk: Obj.disk,
          io: 500,
          cpu: Obj.cpu,
        },
        feature_limits: {
          databases: 5,
          backups: 5,
          allocations: 5,
        },
        deploy: {
          locations: [parseInt(global.loc)],
          dedicated_ip: false,
          port_range: [],
        },
      }),
    });
    const result = await f2.json();
    if (result.errors) return m.reply(JSON.stringify(result.errors[0], null, 2));
    const server = result.attributes;

    // 🎉 Message stylisé LUFFY-XMD
    const tekspanel = `
╔══✦✦✦✦✦✦✦✦✦✦══╗
      𝐏𝐎𝐖𝐄𝐑𝐄𝐃 𝐁𝐘  
       ${global.nom} 😇
╚══✦✦✦✦✦✦✦✦✦✦══╝

🎉 *Panel créé avec succès !* 🎉

👤 *Username :* ${user.username}
🔐 *Password :* ${password}
📡 *ID Server :* ${server.id}

⚡ *Spécifications Serveur* ⚡
🖥️ RAM : ${Obj.ram == "0" ? "Unlimited" : Obj.ram + "MB"}
💾 Disk : ${Obj.disk == "0" ? "Unlimited" : Obj.disk + "MB"}
🧮 CPU : ${Obj.cpu == "0" ? "Unlimited" : Obj.cpu + "%"}
🌐 Panel : ${global.domain}

📜 *Conditions :*
- Expiration : 1 mois
- Garanti : 15 jours (1x remplacement)
- Sauvegarde ce message précieusement !
`;

    if (m.isGroup) {
      // ✅ Specs en DM au sender
      const sentDM = await plag.sendMessage(sender, { text: tekspanel });
      await plag.sendMessage(sender, { react: { text: "🎉", key: sentDM.key } });

      // ✅ Confirmation dans le groupe
      await plag.sendMessage(m.chat, { text: `✅ Panel créé pour @${sender.split("@")[0]}.\nLes détails ont été envoyés en DM.`, mentions: [sender] }, { quoted: m });
    } else {
      // ✅ Specs directement dans la conversation privée
      const sent = await plag.sendMessage(m.chat, { text: tekspanel }, { quoted: m });
      await plag.sendMessage(m.chat, { react: { text: "🎉", key: sent.key } });
    }

  } catch (e) {
    console.log(e);
    return m.reply("❌ Erreur lors de la création du serveur: " + e.message);
  }
};

handler.command = ["cpanel"];
handler.tags = ["pterodactyl"];
handler.help = ["cpanel <ram>"];

module.exports = handler;