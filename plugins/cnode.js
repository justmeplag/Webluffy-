const fetch = require("node-fetch");

const handler = async (m, { plag }) => {
  try {
    const domain = global.domain;
    const apikey = global.apikey;

    // 🔍 Récupérer les nodes
    const resNodes = await fetch(`${domain}/api/application/nodes`, {
      headers: {
        Authorization: `Bearer ${apikey}`,
        Accept: "application/json",
      },
    });
    const nodes = await resNodes.json();

    if (nodes.errors) {
      return plag.reply(m.chat, JSON.stringify(nodes.errors[0], null, 2), m);
    }

    let teks = "*LUFFY‑XMD PANEL DIAGNOSTIC ⚡*\n\n";

    for (const node of nodes.data || []) {
      const nodeId = node.attributes.id;
      const nodeName = node.attributes.name;
      const locationId = node.attributes.location_id;

      teks += `🖥️ Node ID: ${nodeId}\n📍 Nom: ${nodeName}\n🏠 Location: ${locationId}\n`;

      // 🔍 Récupérer les allocations pour ce node
      const resAlloc = await fetch(`${domain}/api/application/nodes/${nodeId}/allocations`, {
        headers: {
          Authorization: `Bearer ${apikey}`,
          Accept: "application/json",
        },
      });
      const allocs = await resAlloc.json();

      if (allocs.errors) {
        teks += `❌ Erreur allocations: ${JSON.stringify(allocs.errors[0])}\n\n`;
        continue;
      }

      const libres = allocs.data.filter(a => !a.attributes.assigned);
      teks += `🔌 Allocations libres: ${libres.length}\n`;
      if (libres.length > 0) {
        libres.slice(0, 5).forEach(a => {
          teks += `   • ${a.attributes.ip}:${a.attributes.port}\n`;
        });
      }
      teks += "\n";
    }

    plag.reply(m.chat, teks, m);
  } catch (err) {
    plag.reply(m.chat, "❌ Erreur API: " + err.message, m);
  }
};

handler.command = ["cpaneldiag"];
handler.tags = ["panel"];
handler.help = ["cpaneldiag"];
handler.owner = true; // réservé owner

module.exports = handler;