const { generateWAMessageContent, generateWAMessageFromContent } = require("@rexxhayanasi/elaina-baileys");

const crypto = require("crypto");

/**

 * Fonction utilitaire pour envoyer un status de groupe

 */

async function groupStatus(plag, jid, content) {

  const { backgroundColor } = content;

  delete content.backgroundColor;

  const inside = await generateWAMessageContent(content, {

    upload: plag.waUploadToServer,

    backgroundColor

  });

  const messageSecret = crypto.randomBytes(32);

  const m = generateWAMessageFromContent(

    jid,

    {

      messageContextInfo: { messageSecret },

      groupStatusMessageV2: {

        message: {

          ...inside,

          messageContextInfo: { messageSecret }

        }

      }

    },

    {}

  );

  await plag.relayMessage(jid, m.message, { messageId: m.key.id });

  return m;

}

/**

 * Handler de commande

 */

const handler = async (m, { plag, prefix = ".", command }) => {

  const quoted = m.quoted ? m.quoted : m;

  const mime = (quoted.msg || quoted).mimetype || "";

  const textToParse = m.text || m.body || "";

  const caption = textToParse.replace(new RegExp(`^\\${prefix}${command}\\s*`, "i"), "").trim();

  const jid = m.chat;

  try {

    if (!mime && !caption) {

      return plag.sendMessage(m.chat, { text: `❌ Reply à un média ou ajoute du texte.\nExemple: ${prefix}${command} (reply image/video/audio) Salut tout le monde` });

    }

    let payload = {};

    if (/image/.test(mime)) {

      const buffer = await quoted.download();

      payload = { image: buffer, caption };

    } else if (/video/.test(mime)) {

      const buffer = await quoted.download();

      payload = { video: buffer, caption };

    } else if (/audio/.test(mime)) {

      const buffer = await quoted.download();

      payload = { audio: buffer, mimetype: "audio/mp4" };

    } else if (caption) {

      payload = { text: caption };

    } else {

      return plag.sendMessage(m.chat, { text: `❌ Reply à un média ou ajoute du texte.\nExemple: ${prefix}${command} (reply image/video/audio) Salut tout le monde` });

    }

    await plag.sendMessage(m.chat, { react: { text: "⏳", key: m.key } });

    await groupStatus(plag, jid, payload);

    await plag.sendMessage(m.chat, { react: { text: "☑️", key: m.key } });

    await plag.sendMessage(m.chat, { text: "✅ Status de groupe publié !" });

  } catch (err) {

    console.error("SWGC ERROR:", err);

    await plag.sendMessage(m.chat, { react: { text: "❌", key: m.key } });

    await plag.sendMessage(m.chat, { text: "❌ Échec de publication du status de groupe." });

  }

};

handler.command = ["upswgc", "swgc", "swgrup"];

handler.group = true;

handler.admin = true;

handler.botAdmin = true;

handler.usePrefix = true;

module.exports = handler;