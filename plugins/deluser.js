/*
 • Commande DelUser
 • Supprime un utilisateur par ID + tous ses serveurs associés (via listing global)
 • Usage :
   .deluser 49
*/

const fetch = require("node-fetch");

async function fetchAllServers(domain, apikey) {
  const servers = [];
  let page = 1;
  const perPage = 50;

  while (true) {
    const res = await fetch(`${domain}/api/application/servers?page=${page}&per_page=${perPage}`, {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: "Bearer " + apikey,
      },
    });

    if (!res.ok) {
      let msg = `HTTP ${res.status}`;
      try {
        const err = await res.json();
        msg = err?.errors?.[0]?.detail || msg;
      } catch (_) {}
      throw new Error(`Liste serveurs échouée → ${msg}`);
    }

    const data = await res.json();
    const batch = Array.isArray(data.data) ? data.data : [];
    servers.push(...batch);

    const meta = data?.meta?.pagination;
    const totalPages = meta?.total_pages || 1;
    if (page >= totalPages) break;
    page++;
  }

  return servers;
}

const handler = async (m, { conn, plag }) => {
  const bot = conn || plag;

  // Parse m.text to avoid args[0] issues
  const raw = m.text.trim().replace(/^[.\-_/\\]?deluser\s*/i, "");
  const parts = raw.split(/\s+/).filter(Boolean);
  const id = parts[0];

  if (!id) {
    return m.reply("❌ Donne l’ID de l’utilisateur à supprimer.\nEx: .deluser 49");
  }

  let success = [];
  let failed = [];

  try {
    // 1) Lister tous les serveurs et filtrer par user
    const allServers = await fetchAllServers(global.domain, global.apikey);
    const userServers = allServers.filter(s => s?.attributes?.user === Number(id));

    // 2) Supprimer les serveurs de l'utilisateur
    for (const srv of userServers) {
      const srvId = srv.attributes.id;
      try {
        const delSrv = await fetch(`${global.domain}/api/application/servers/${srvId}`, {
          method: "DELETE",
          headers: {
            Accept: "application/json",
            Authorization: "Bearer " + global.apikey,
          },
        });
        if (delSrv.status === 204) {
          success.push(`Serveur ${srvId}`);
        } else {
          let errMsg = `HTTP ${delSrv.status}`;
          try {
            const err = await delSrv.json();
            errMsg = err?.errors?.[0]?.detail || errMsg;
          } catch (_) {}
          failed.push(`Serveur ${srvId} → ${errMsg}`);
        }
      } catch (e) {
        failed.push(`Serveur ${srvId} → ${e.message}`);
      }
    }

    // 3) Supprimer l'utilisateur
    const resUser = await fetch(`${global.domain}/api/application/users/${id}`, {
      method: "DELETE",
      headers: {
        Accept: "application/json",
        Authorization: "Bearer " + global.apikey,
      },
    });

    if (resUser.status === 204) {
      success.push(`Utilisateur ${id}`);
    } else {
      let errMsg = `HTTP ${resUser.status}`;
      try {
        const err = await resUser.json();
        errMsg = err?.errors?.[0]?.detail || errMsg;
      } catch (_) {}
      failed.push(`Utilisateur ${id} → ${errMsg}`);
    }

  } catch (e) {
    failed.push(`Utilisateur ${id} → ${e.message}`);
  }

  // 4) Rapport dramatique
  let teks = "🗑️ *Résultat suppression utilisateur + serveurs*\n\n";
  if (success.length) teks += `✅ Supprimés: ${success.join(", ")}\n`;
  if (failed.length) {
    teks += `❌ Échecs:\n`;
    for (let f of failed) {
      teks += `   • ${f}\n`;
    }
  }

  await bot.sendMessage(m.chat, { text: teks }, { quoted: m });
};

handler.command = ["deluser"];
handler.tags = ["pterodactyl"];
handler.help = ["deluser <id>"];

module.exports = handler;