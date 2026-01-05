/*
 • Commande ListUser
 • Liste les utilisateurs avec une étoile devant les admins
 • Usage :
   .listuser
*/

const fetch = require("node-fetch");

const handler = async (m, { conn, plag }) => {
  const bot = conn || plag;
  try {
    const res = await fetch(`${global.domain}/api/application/users`, {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: "Bearer " + global.apikey,
      },
    });

    if (!res.ok) return m.reply(`❌ Erreur HTTP ${res.status}`);
    const data = await res.json();

    if (!data.data || !data.data.length) return m.reply("❌ Aucun utilisateur trouvé.");

    let teks = "👥 *Liste des utilisateurs*\n\n";
    for (let u of data.data) {
      const id = u.attributes.id;
      const username = u.attributes.username;
      const email = u.attributes.email;
      const isAdmin = u.attributes.root_admin;

      teks += `${isAdmin ? "⭐" : "•"} ID ${id} → ${username} (${email})\n`;
    }

    await bot.sendMessage(m.chat, { text: teks }, { quoted: m });
  } catch (e) {
    console.error(e);
    m.reply("❌ Erreur lors de la récupération des utilisateurs.");
  }
};

handler.command = ["listuser"];
handler.tags = ["pterodactyl"];
handler.help = ["listuser"];

module.exports = handler;