// lib/channelStore.js

const fs = require("fs");

const PATH_FILE = "./channel_jid.json";

function readChannelJid() {

  if (!fs.existsSync(PATH_FILE)) return null;

  try {

    const data = JSON.parse(fs.readFileSync(PATH_FILE, "utf8"));

    return data.jid || null;

  } catch {

    return null;

  }

}

function writeChannelJid(jid) {

  fs.writeFileSync(PATH_FILE, JSON.stringify({ jid }, null, 2));

}

module.exports = { readChannelJid, writeChannelJid };