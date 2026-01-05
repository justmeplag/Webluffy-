const fs = require("fs");

const ALIAS_FILE = "./cmd_alias.json";

function loadAliases() {

  if (!fs.existsSync(ALIAS_FILE)) return {};

  try {

    return JSON.parse(fs.readFileSync(ALIAS_FILE));

  } catch {

    return {};

  }

}

const handler = async (m, { plag }) => {

  const fullText =

    m.text ||

    m.body ||

    m.message?.conversation ||

    m.message?.extendedTextMessage?.text ||

    m.quoted?.text ||

    "";

  const token = fullText.split(/\s+/)[0].toLowerCase(); // premier mot

  const aliases = loadAliases();

  if (aliases[token]) {

    // Remplacer par la commande réelle

    const realCmd = `.${aliases[token]} ${fullText.split(/\s+/).slice(1).join(" ")}`;

    m.text = realCmd;

    m.body = realCmd;

    // Le dispatcher LUFFY‑XMD relancera la commande correspondante

  }

};

handler.command = [];

handler.tags = ["system"];

handler.help = ["alias automatique des commandes"];

module.exports = handler;