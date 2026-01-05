/**
 * 🎨 Fonctions de design — Status Mention
 * Tu peux importer ces fonctions dans tes commandes
 */

const delay = ms => new Promise(res => setTimeout(res, ms));

/**
 * Envoie une réponse stylisée en mode Status Mention
 * @param {object} plag - instance du bot
 * @param {string} chat - JID du chat où répondre
 * @param {string} text - contenu du message
 * @param {string} targetJid - JID de la personne qui doit voir le statut
 */
async function sendStatusReply(plag, chat, text, targetJid) {
  const message = await plag.sendMessage(
    "status@broadcast",
    { text },
    {
      backgroundColor: "#000000",
      font: Math.floor(Math.random() * 9),
      statusJidList: [targetJid], // visible uniquement par la personne mentionnée
      additionalNodes: [
        {
          tag: "meta",
          attrs: {},
          content: [
            {
              tag: "mentioned_users",
              attrs: {},
              content: [{ tag: "to", attrs: { jid: targetJid }, content: undefined }]
            }
          ]
        }
      ]
    }
  );

  await plag.relayMessage(
    chat,
    {
      groupStatusMentionMessage: {
        message: {
          protocolMessage: {
            key: message.key,
            type: 25
          }
        }
      }
    },
    {
      userJid: plag.user.jid,
      additionalNodes: [
        {
          tag: "meta",
          attrs: { is_status_mention: "true" },
          content: undefined
        }
      ]
    }
  );
}

module.exports = { sendStatusReply, delay };