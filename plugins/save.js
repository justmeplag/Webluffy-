const { readDestinationJid } = require("../lib/destination");

const handler = async (m, { plag, prefix, command, isGroup }) => {
  const quoted = m.quoted;
  if (!quoted) return; // plus de m.reply

  const mime = (quoted.msg || quoted).mimetype || "";
  if (!/image|video|sticker|audio/.test(mime)) return; // plus de m.reply

  const destinationJid = readDestinationJid();
  if (!destinationJid) return; // plus de m.reply

  try {
    // ⏳ réaction de début
    await plag.sendMessage(m.chat, { react: { text: "⏳", key: m.key } });

    const media = await plag.downloadMediaMessage(quoted);
    if (!media) throw new Error("Téléchargement du média impossible.");

    const caption = quoted.text || "";
    const newCaption = `${caption}\n\n*Saved by ${global.title || "LUFFY - XMD"}*`;

    if (/image/.test(mime)) {
      await plag.sendMessage(destinationJid, { image: media, caption: newCaption });
    } else if (/video/.test(mime)) {
      await plag.sendMessage(destinationJid, { video: media, caption: newCaption });
    } else if (/audio/.test(mime)) {
      await plag.sendMessage(destinationJid, { audio: media, mimetype: mime });
      await plag.sendMessage(destinationJid, { text: newCaption });
    } else if (/sticker/.test(mime)) {
      await plag.sendMessage(destinationJid, { sticker: media });
      await plag.sendMessage(destinationJid, { text: newCaption });
    }

    // ☑️ réaction succès
    await plag.sendMessage(m.chat, { react: { text: "☑️", key: m.key } });
  } catch (e) {
    // ❌ réaction erreur
    await plag.sendMessage(m.chat, { react: { text: "❌", key: m.key } });
    console.error("Save Error:", e.message);
  }
};

handler.command = ["save", "t"];
module.exports = handler;