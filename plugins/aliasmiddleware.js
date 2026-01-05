const store = require("../lib/aliasStore");

const handler = async (m, { plag }) => {
  const fullText = m.text || "";
  const token = fullText.split(/\s+/)[0].toLowerCase();
  const aliases = store.load();

  if (aliases[token]) {
    const realCmd = `.${aliases[token]} ${fullText.split(/\s+/).slice(1).join(" ")}`;
    m.text = realCmd;
    m.body = realCmd;
  }
};

handler.command = [];
handler.tags = ["system"];
handler.help = ["alias automatique"];

module.exports = handler;