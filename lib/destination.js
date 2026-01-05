// lib/destination.js

const fs = require("fs");

const PATH_FILE = "./destination_jid.json";

function readDestinationJid() {

  if (!fs.existsSync(PATH_FILE)) return null;

  try {

    const data = JSON.parse(fs.readFileSync(PATH_FILE));

    return data.jid || null;

  } catch {

    return null;

  }

}

function writeDestinationJid(jid) {

  fs.writeFileSync(PATH_FILE, JSON.stringify({ jid }, null, 2));

}

module.exports = { readDestinationJid, writeDestinationJid };