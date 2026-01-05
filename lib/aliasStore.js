// lib/aliasStore.js

const fs = require("fs");

const FILE = "./cmd_alias.json";

function load() {

  if (!fs.existsSync(FILE)) return {};

  try {

    return JSON.parse(fs.readFileSync(FILE));

  } catch {

    return {};

  }

}

function save(data) {

  fs.writeFileSync(FILE, JSON.stringify(data, null, 2));

}

function set(alias, cmd) {

  const data = load();

  data[alias.toLowerCase()] = cmd.replace(/^\./, "");

  save(data);

}

function del(alias) {

  const data = load();

  delete data[alias.toLowerCase()];

  save(data);

}

function list() {

  return load();

}

module.exports = { load, save, set, del, list };