const {
    default: makeWASocket,
    proto,
    useMultiFileAuthState,
    jidDecode,
    areJidsSameUser,
    generateForwardMessageContent,
    generateWAMessageFromContent,
    getContentType,
    makeCacheableSignalKeyStore,
    downloadContentFromMessage,
} = require('@rexxhayanasi/elaina-baileys')
const {
    toAudio,
    toPTT,
    toVideo
} = require('./converter')
const chalk = require('chalk')
const fetch = require("node-fetch")
const axios = require("axios")
const FileType = require('file-type')
const moment = require("moment-timezone")
const PhoneNumber = require('awesome-phonenumber')
const fs = require('fs')
const path = require('path')
let Jimp = require('jimp')
const pino = require('pino')
const { store, logger } = require('./store')
const {
    imageToWebp,
    videoToWebp,
    writeExifImg,
    writeExifVid
} = require('./exif')
const ephemeral = { ephemeralExpiration: 8600 }
const { sizeFormatter } = require('human-readable');
const { connect } = require("./connection")
const { Boom } = require("@hapi/boom");

// --- MODIFICATION DU FUSEAU HORAIRE ---
const heureLocale = moment.tz('America/Port-au-Prince').format('HH:mm:ss');
const dateLocale = moment.tz('America/Port-au-Prince').format('dddd, DD MMMM YYYY');
const hari = `${dateLocale} - ${heureLocale}`;
// --- FIN DE LA MODIFICATION ---

// --- TicTacToe réactions (intégré) ---
const games = {};
const ttReactHandler = async (m, { plag }) => {
  const chatId = m.key?.remoteJid || m.chat;
  if (!chatId || !games[chatId]) return;
  const emoji = m.message?.reactionMessage?.text || m.reaction;
  const mapping = { "1️⃣":1,"2️⃣":2,"3️⃣":3,"4️⃣":4,"5️⃣":5,"6️⃣":6,"7️⃣":7,"8️⃣":8,"9️⃣":9 };
  if (!mapping[emoji]) return;
  const pos = mapping[emoji] - 1;
  const game = games[chatId];
  if (game.board[pos] !== " ") return;
  game.board[pos] = game.turn;
  game.turn = game.turn === "X" ? "O" : "X";
  const board = `
🎮 TicTacToe
${game.board[0]} | ${game.board[1]} | ${game.board[2]}
---------
${game.board[3]} | ${game.board[4]} | ${game.board[5]}
---------
${game.board[6]} | ${game.board[7]} | ${game.board[8]}
`.trim();
  await plag.sendMessage(chatId, { text: board });
};

// --- smsg consolidé ---
const smsg = async (plag, m) => {
    try {
        if (!m) return m;
        let M = proto.WebMessageInfo;
        if (m.key) {
            m.id = m.key.id;
            m.isBaileys = m.id?.startsWith('BAE5') && m.id.length === 16;
            m.chat = m.key.remoteJid;
            m.fromMe = m.key.fromMe;
            m.isGroup = !!(m.chat && m.chat.endsWith('@g.us'));
            m.sender = plag.decodeJid(
              m.isGroup
                ? (m.key.participant || m.participant || plag.user.id)
                : (m.fromMe ? plag.user.id : (m.key.participant || m.chat || ''))
            );
            if (m.isGroup) m.participant = plag.decodeJid(m.key.participant) || '';
        }
        if (m.message) {
            m.mtype = getContentType(m.message);
            m.msg = (m.mtype == 'viewOnceMessage'
              ? m.message[m.mtype].message[getContentType(m.message[m.mtype].message)]
              : m.message[m.mtype]);
            m.body = m.message.conversation
              || m.msg.caption
              || m.msg.text
              || (m.mtype == 'listResponseMessage' && m.msg.singleSelectReply?.selectedRowId)
              || (m.mtype == 'buttonsResponseMessage' && m.msg.selectedButtonId)
              || (m.mtype == 'viewOnceMessage' && m.msg.caption)
              || m.text;
            let quoted = m.quoted = m.msg.contextInfo ? m.msg.contextInfo.quotedMessage : null;
            m.mentionedJid = m.msg.contextInfo ? m.msg.contextInfo.mentionedJid : [];
            if (m.msg.caption) m.caption = m.msg.caption;

            if (m.quoted) {
                let type = Object.keys(m.quoted)[0];
                m.quoted = m.quoted[type];
                if (['productMessage'].includes(type)) {
                    type = Object.keys(m.quoted)[0];
                    m.quoted = m.quoted[type];
                }
                if (typeof m.quoted === 'string') m.quoted = { text: m.quoted };
                m.quoted.mtype = type;
                m.quoted.id = m.msg.contextInfo.stanzaId;
                m.quoted.chat = m.msg.contextInfo.remoteJid || m.chat;
                m.quoted.isBaileys = m.quoted.id ? m.quoted.id.startsWith('BAE5') && m.quoted.id.length === 16 : false;
                m.quoted.sender = plag.decodeJid(m.msg.contextInfo.participant);
                m.quoted.fromMe = m.quoted.sender === plag.decodeJid(plag.user.id);
                m.quoted.text = m.quoted.text || m.quoted.caption || m.quoted.conversation || m.quoted.contentText || m.quoted.selectedDisplayText || m.quoted.title || '';
                m.quoted.mentionedJid = m.msg.contextInfo ? m.msg.contextInfo.mentionedJid : [];
                m.getQuotedObj = m.getQuotedMessage = async () => {
                    if (!m.quoted.id) return false;
                    let q = await store.loadMessage(m.chat, m.quoted.id, plag);
                    return smsg(plag, q, store);
                };
                let vM = m.quoted.fakeObj = M.fromObject({
                    key: {
                        remoteJid: m.quoted.chat,
                        fromMe: m.quoted.fromMe,
                        id: m.quoted.id
                    },
                    message: quoted,
                    ...(m.isGroup ? { participant: m.quoted.sender } : {})
                });
                m.quoted.delete = () => plag.sendMessage(m.quoted.chat, { delete: vM.key });
                m.quoted.copyNForward = (jid, forceForward = false, options = {}) => plag.copyNForward(jid, vM, forceForward, options);
                m.quoted.download = () => plag.downloadMediaMessage(m.quoted);
            }
        }
        if (m.msg?.url) m.download = () => plag.downloadMediaMessage(m.msg);
        m.text = m.msg?.text || m.msg?.caption || m.message?.conversation || m.msg?.contentText || m.msg?.selectedDisplayText || m.msg?.title || '';
        m.reply = (text, chatId = m.chat, options = {}) => {
          if (Buffer.isBuffer(text)) {
            return plag.sendMedia(chatId, text, 'file', '', m, { ...options });
          }
          const safeText = typeof text === 'string' ? text : String(text);
          return plag.sendText(chatId, safeText, m, { ...options });
        };
        m.copy = () => smsg(plag, M.fromObject(M.toObject(m)));
        m.copyNForward = (jid = m.chat, forceForward = false, options = {}) => plag.copyNForward(jid, m, forceForward, options);
        plag.appenTextMessage = async (text, chatUpdate) => {
            let messages = await generateWAMessage(m.chat, {
                text: text,
                mentions: m.mentionedJid
            }, {
                userJid: plag.user.id,
                quoted: m.quoted && m.quoted.fakeObj
            });
            messages.key.fromMe = areJidsSameUser(m.sender, plag.user.id);
            messages.key.id = m.key.id;
            messages.pushName = m.pushName;
            if (m.isGroup) messages.participant = m.sender;
            let msg = {
                ...chatUpdate,
                messages: [proto.WebMessageInfo.fromObject(messages)],
                type: 'append'
            };
            plag.ev.emit('messages.upsert', msg);
        };

        return m;
    } catch (e) {
        console.log(chalk.red('[ ERREUR DANS SMSG ]'), e);
    }
};

const tocase = async (chatUpdate, plag) => {
    const mek = chatUpdate.messages[0]
    if (!mek.message) return
    mek.message = (Object.keys(mek.message)[0] === 'ephemeralMessage') ? mek.message.ephemeralMessage.message : mek.message
    if (mek.key && mek.key.remoteJid === 'status@broadcast') {
        await plag.readMessages([mek.key])
    }
    if (!plag.public && chatUpdate.type === 'notify') {
      const senderJid = mek.key.participant || mek.key.remoteJid || '';
      const senderNum = (senderJid || '').split('@')[0];
      const owners = (global.owner && Array.isArray(global.owner)) ? global.owner : [];
      const isOwner = owners.includes(senderNum);
      if (!mek.key.fromMe && !isOwner) return;
    }
    if (mek.key.id?.startsWith('BAE5') && mek.key.id.length === 16) return
    const m = await smsg(plag, mek, store)
    if (!m || !m.chat) return;
    require("../case")(plag, m, chatUpdate, store) 
}

const newSockets = async (start, connectionOptions, options = {}) => {
    const { state, saveCreds } = await useMultiFileAuthState("./lib/system/session") 
    const auth = {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(state.keys, logger),
    }

    let Corener = { ...connectionOptions, auth, logger }
    let plag = await makeWASocket(Corener)

    plag.decodeJid = (jid) => {
        if (!jid) return jid;
        if (/:\d+@/gi.test(jid)) {
            let decode = jidDecode(jid) || {};
            return (decode.user && decode.server && decode.user + "@" + decode.server) || jid;
        } else return jid;
    };

    if (plag.user && plag.user.id) plag.user.jid = plag.decodeJid(plag.user.id)
    if (!plag.chats) plag.chats = {}

    function updateNameToDb(contacts) {
        if (!contacts) return
        for (const contact of contacts) {
            const id = plag.decodeJid(contact.id)
            if (!id) continue
            let chats = plag.chats[id]
            if (!chats) chats = plag.chats[id] = { id }
            plag.chats[id] = {
                ...chats,
                ...({
                    ...contact,
                    id,
                    ...(id.endsWith('@g.us') ? {
                        subject: contact.subject || chats.subject || ''
                    } : {
                        name: contact.notify || chats.name || chats.notify || ''
                    })
                } || {})
            }
        }
    }

    store.bind(plag.ev);

    // --- Listener fusionné: réactions + commandes ---
    plag.ev.on("messages.upsert", async (chatUpdate) => {
      const m = chatUpdate.messages && chatUpdate.messages[0]
      if (!m) return

      // Réactions
      if (m.message && m.message.reactionMessage) {
        await ttReactHandler(m, { plag })
        return
      }
      if (m.reaction) {
        await ttReactHandler(m, { plag })
        return
      }

      // Commandes classiques
      tocase(chatUpdate, plag, store)
    });

    // Démarrage TicTacToe via commande
    plag.ev.on("messages.upsert", async (chatUpdate) => {
      const m = chatUpdate.messages && chatUpdate.messages[0]
      if (!m || !m.message) return
      const msg = await smsg(plag, m, store)
      if (!msg) return
      if (msg.text && msg.text.startsWith(".tictactoe")) {
        const id = msg.chat
        if (games[id]) return msg.reply("⚠️ Une partie est déjà en cours !")
        games[id] = { board: [" "," "," "," "," "," "," "," "," "], turn: "X" }
        const board = `
🎮 TicTacToe
${games[id].board[0]} | ${games[id].board[1]} | ${games[id].board[2]}
---------
${games[id].board[3]} | ${games[id].board[4]} | ${games[id].board[5]}
---------
${games[id].board[6]} | ${games[id].board[7]} | ${games[id].board[8]}
`.trim()
        return msg.reply(board)
      }
    });

    plag.ev.on('contacts.update', (update) => {
        for (let contact of update) {
            let id = plag.decodeJid(contact.id);
            if (store && store.contacts) store.contacts[id] = { id, name: contact.notify };
        }
    });

    plag.ev.on('creds.update', saveCreds);
    plag.ev.on('connection.update', async (update) => { connect(update, plag, start) })
    plag.ev.on('contacts.upsert', updateNameToDb)
    plag.ev.on('groups.update', updateNameToDb)

    plag.ev.on('chats.set', async ({ chats }) => {
        for (let chat of chats) {
            let chatId = plag.decodeJid(chat.id)
            if (!chatId) continue
            const isGroup = chatId.endsWith('@g.us')
            let entry = plag.chats[chatId]
            if (!entry) entry = plag.chats[chatId] = { id: chatId }
            entry.isChats = !chat.readOnly
            if (chat.name) entry[isGroup ? 'subject' : 'name'] = chat.name
            if (isGroup) {
                const metadata = await plag.groupMetadata(chatId).catch(_ => null)
                if (!metadata) continue
                entry.subject = chat.name || metadata.subject
                entry.metadata = metadata
            }
        }
    })

    plag.ev.on('group-participants.update', async function updateParticipantsToDb({ id, participants, action }) {
        id = plag.decodeJid(id)
        if (!(id in plag.chats)) plag.chats[id] = { id }
        plag.chats[id].isChats = true
        const groupMetadata = await plag.groupMetadata(id).catch(_ => null)
        if (!groupMetadata) return
        plag.chats[id] = {
            ...plag.chats[id],
            subject: groupMetadata.subject,
            metadata: groupMetadata
        }
    })

    plag.ev.on('groups.update', async function groupUpdatePushToDb(groupsUpdates) {
        for (const update of groupsUpdates) {
            const id = plag.decodeJid(update.id)
            if (!id) continue
            const isGroup = id.endsWith('@g.us')
            if (!isGroup) continue
            let chats = plag.chats[id]
            if (!chats) chats = plag.chats[id] = { id }
            chats.isChats = true
            const metadata = await plag.groupMetadata(id).catch(_ => null)
            if (!metadata) continue
            chats.subject = metadata.subject
            chats.metadata = metadata
        }
    })

    plag.ev.on('chats.upsert', async function chatsUpsertPushToDb(chatsUpsert) {
        const { id, name } = chatsUpsert
        if (!id) return
        let chats = plag.chats[id] = {
            ...plag.chats[id],
            ...chatsUpsert,
            isChats: true
        }
        const isGroup = id.endsWith('@g.us')
        if (isGroup) {
            const metadata = await plag.groupMetadata(id).catch(_ => null)
            if (metadata) {
                chats.subject = name || metadata.subject
                chats.metadata = metadata
            }
            const groups = await plag.groupFetchAllParticipating().catch(_ => ({})) || {}
            for (const group in groups) plag.chats[group] = {
                id: group,
                subject: groups[group].subject,
                isChats: true,
                metadata: groups[group]
            }
        }
    })
// Écoute des réactions
plag.ev.on('messages.reaction', async (reaction) => {
    try {
        const m = {
            chat: reaction.key.remoteJid,       // le chat où la réaction a eu lieu
            sender: plag.decodeJid(reaction.sender), // l’utilisateur qui a réagi
            reaction: {
                text: reaction.text,            // l’emoji, ex: "1⃣"
                key: reaction.key               // le message ciblé par la réaction
            }
        }

        // Dispatch vers les plugins
        for (let plugin of plugins) {
            if (plugin.reaction) {
                await plugin.reaction(m, { plag })
            }
        }
    } catch (e) {
        console.error("Erreur dans messages.reaction:", e)
    }
})
    plag.ev.on('presence.update', async function presenceUpdatePushToDb({ id, presences }) {
        const sender = Object.keys(presences)[0] || id
        const _sender = plag.decodeJid(sender)
        const presence = presences[sender]['lastKnownPresence'] || 'composing'
        let chats = plag.chats[_sender]
        if (!chats) chats = plag.chats[_sender] = { id: sender }
        chats.presences = presence
        if (id.endsWith('@g.us')) {
            let gchats = plag.chats[id]
            if (!gchats) {
                const metadata = await plag.groupMetadata(id).catch(_ => null)
                if (metadata) gchats = plag.chats[id] = {
                    id,
                    subject: metadata.subject,
                    metadata
                }
            }
            gchats.isChats = true
        }
    })

    // --- Logger enrichi ---
    plag.logger = {
        ...plag.logger,
        info(...args) { console.log(chalk.cyan.bold(`INFO [${chalk.rgb(255, 255, 255)(hari)}]: `), chalk.cyan(...args)) },
        error(...args) { console.log(chalk.bold.rgb(247, 38, 33)(`ERROR [${chalk.rgb(255, 255, 255)(hari)}]: `), chalk.rgb(255, 38, 0)(...args)) },
        warn(...args) { console.log(chalk.bold.rgb(239, 225, 3)(`WARNING [${chalk.rgb(255, 255, 255)(hari)}]: `), chalk.keyword('orange')(...args)) }
    }

    // --- Utils & helpers ---
    plag.getFile = async (PATH, returnAsFilename) => {
        let res, filename
        const data = Buffer.isBuffer(PATH) ? PATH
          : /^data:.*?\/.*?;base64,/i.test(PATH) ? Buffer.from(PATH.split`,`[1], 'base64')
          : /^https?:\/\//.test(PATH) ? await (res = await fetch(PATH)).buffer()
          : fs.existsSync(PATH) ? (filename = PATH, fs.readFileSync(PATH))
          : typeof PATH === 'string' ? PATH
          : Buffer.alloc(0)
        if (!Buffer.isBuffer(data)) throw new TypeError('Result is not a buffer')
        const type = await FileType.fromBuffer(data) || { mime: 'application/octet-stream', ext: '.bin' }
        if (data && returnAsFilename && !filename) {
          filename = path.join(__dirname, '../tmp/' + (Date.now()) + '.' + type.ext)
          await fs.promises.writeFile(filename, data)
        }
        return {
            res,
            filename,
            ...type,
            data,
            deleteFile() { return filename && fs.promises.unlink(filename) }
        }
    }

    plag.waitEvent = (eventName, is = () => true, maxTries = 25) => {
        return new Promise((resolve, reject) => {
            let tries = 0
            let on = (...args) => {
                if (++tries > maxTries) reject('Max tries reached')
                else if (is()) {
                    plag.ev.off(eventName, on)
                    resolve(...args)
                }
            }
            plag.ev.on(eventName, on)
        })
    }
    
    plag.delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
     
    plag.filter = (text) => {
      let mati = ["q","w","r","t","y","p","s","d","f","g","h","j","k","l","z","x","c","v","b","n","m"]
      if (/[aiueo][aiueo]([qwrtypsdfghjklzxcvbnm])?$/i.test(text)) return text.substring(text.length - 1)
      else {
        let res = Array.from(text).filter(v => mati.includes(v))
        let resu = res[res.length - 1]
        for (let huruf of mati) {
            if (text.endsWith(huruf)) {
                resu = res[res.length - 2]
            }
        }
        let misah = text.split(resu)
        return resu + misah[misah.length - 1]
      }
    }
    
    plag.msToDate = (ms) => {
      let days = Math.floor(ms / (24 * 60 * 60 * 1000));
      let daysms = ms % (24 * 60 * 60 * 1000);
      let hours = Math.floor((daysms) / (60 * 60 * 1000));
      let hoursms = ms % (60 * 60 * 1000);
      let minutes = Math.floor((hoursms) / (60 * 1000));
      return days + " Hari " + hours + " Jam " + minutes + " Menit";
    }
    
    plag.rand = async (isi) => isi[Math.floor(Math.random() * isi.length)]
    
    plag.sendMedia = async (jid, path, quoted, options = {}) => {
        let { ext, mime, data } = await plag.getFile(path)
        const messageType = mime.split("/")[0]
        const pase = messageType.replace('application', 'document') || messageType
        return await plag.sendMessage(jid, { [`${pase}`]: data, mimetype: mime, ...options }, { quoted })
    }
    
    plag.adReply = (jid, text, title = '', body = '', buffer, source = '', quoted, options) => {
        return plag.sendMessage(jid, {
            text,
            contextInfo: {
                mentionedJid: plag.parseMention(text),
                externalAdReply: {
                    showAdAttribution: true,
                    mediaType: 1,
                    title,
                    body,
                    thumbnailUrl: 'https://telegra.ph/file/dc25ebc5fe9ccf01.jpg',
                    renderLargerThumbnail: true,
                    sourceUrl: source
                }
            }
        }, { quoted, ...options, ...ephemeral })
    }

    plag.sendFile = async (jid, path, filename = '', caption = '', quoted, ptt = false, options = {}) => {
        let type = await plag.getFile(path, true)
        let { res, data: file, filename: pathFile } = type
        if ((res && res.status !== 200) || file.length <= 65536) {
            try { throw { json: JSON.parse(file.toString()) } }
            catch (e) { if (e.json) throw e.json }
        }
        let opt = { filename }
        if (quoted) opt.quoted = quoted
        if (!type) options.asDocument = true
        let mtype = '', mimetype = type.mime, convert
        if (/webp/.test(type.mime) || (/image/.test(type.mime) && options.asSticker)) mtype = 'sticker'
        else if (/image/.test(type.mime) || (/webp/.test(type.mime) && options.asImage)) mtype = 'image'
        else if (/video/.test(type.mime)) mtype = 'video'
        else if (/audio/.test(type.mime)) (
            convert = await (ptt ? toPTT : toAudio)(file, type.ext),
            file = convert.data,
            pathFile = convert.filename,
            mtype = 'audio',
            mimetype = 'audio/ogg; codecs=opus'
        )
        else mtype = 'document'
        if (options.asDocument) mtype = 'document'

        let message = { ...options, caption, ptt, [mtype]: { url: pathFile }, mimetype }
        let m
        try {
            m = await plag.sendMessage(jid, message, { ...opt, ...options })
        } catch (e) {
            console.error(e)
            m = null
        } finally {
            if (!m) m = await plag.sendMessage(jid, { ...message, [mtype]: file }, { ...opt, ...options })
            return m
        }
    }

    plag.sendImageAsSticker = async (jid, path, quoted, options = {}) => {
        let buff = Buffer.isBuffer(path) ? path
          : /^data:.*?\/.*?;base64,/i.test(path) ? Buffer.from(path.split`,`[1], 'base64')
          : /^https?:\/\//.test(path) ? await (await fetch(path)).buffer()
          : fs.existsSync(path) ? fs.readFileSync(path)
          : Buffer.alloc(0)
        let buffer = (options && (options.packname || options.author))
          ? await writeExifImg(buff, options)
          : await imageToWebp(buff)
        await plag.sendMessage(jid, { sticker: buffer, ...options }, { quoted })
        return buffer
    }
    
    plag.sendContact = async (jid, data, quoted, options) => {
        if (!Array.isArray(data[0]) && typeof data[0] === 'string') data = [data]
        let contacts = []
        for (let [number, name] of data) {
            number = number.replace(/[^0-9]/g, '')
            let njid = number + '@s.whatsapp.net'
            let biz = await plag.getBusinessProfile(njid).catch(_ => null) || {}
            let vcard = `
BEGIN:VCARD
VERSION:3.0
FN:${name.replace(/\n/g, '\\n')}
ORG:
item1.TEL;waid=${number}:${PhoneNumber('+' + number).getNumber('international')}
item1.X-ABLabel:Ponsel${biz.description ? `
item2.EMAIL;type=INTERNET:${(biz.email || '').replace(/\n/g, '\\n')}
item2.X-ABLabel:Email
PHOTO;BASE64:${(await plag.getFile(await plag.profilePictureUrl(njid)).catch(_ => ({})) || {}).number?.toString('base64')}
X-WA-BIZ-DESCRIPTION:${(biz.description || '').replace(/\n/g, '\\n')}
X-WA-BIZ-NAME:${name.replace(/\n/g, '\\n')}
` : ''}
END:VCARD
`.trim()
            contacts.push({ vcard, displayName: name })
        }
        return plag.sendMessage(jid, {
            ...options,
            contacts: {
                ...options,
                displayName: (contacts.length >= 2 ? `${contacts.length} kontak` : contacts[0].displayName) || null,
                contacts,
            }
        }, { quoted, ...options })
    }

    plag.sendList = async (jid, header, footer, separate, buttons, rows, quoted, options) => {
        // Simplification: rows est un tableau d'objets {title,rowId,description}
        const flat = rows.flat().map(r => Array.isArray(r) ? { title: r[0], rowId: r[1], description: r[2] } : r)
        const teks = flat.map(v => `${v.title || ''}\n${v.rowId || ''}\n${v.description || ''}`.trim()).filter(Boolean).join("\n\n")
        return plag.sendMessage(jid, { ...options, text: teks }, { quoted, ...options })
    }

    plag.reply = (jid, text = '', quoted, options = {}) => {
      const mentions = plag.parseMention(text)
      if (Buffer.isBuffer(text)) {
          return plag.sendFile(jid, text, 'file', '', quoted, false, options)
      } else {
          return plag.sendMessage(jid, { text, mentions, ...options }, { quoted, ...options, mentions })
      }
    }

    plag.sendImage = async (jid, path, caption = '', quoted = '', options) => {
      let buffer = Buffer.isBuffer(path) ? path
        : /^data:.*?\/.*?;base64,/i.test(path) ? Buffer.from(path.split`,`[1], 'base64')
        : /^https?:\/\//.test(path) ? await plag.getBuffer(path)
        : fs.existsSync(path) ? fs.readFileSync(path)
        : Buffer.alloc(0)
      return await plag.sendMessage(jid, { image: buffer, caption, ...options }, { quoted })
    }
    
    plag.resize = async (image, width, height) => {
        let oyy = await Jimp.read(image)
        let kiyomasa = await oyy.resize(width, height).getBufferAsync(Jimp.MIME_JPEG)
        return kiyomasa
    }
    
    plag.fakeReply = (jid, text = '', fakeJid = plag.user.jid, fakeText = '', fakeGroupJid, options) => {
        return plag.sendMessage(jid, { text }, {
          ephemeralExpiration: 86400,
          quoted: {
            key: { fromMe: fakeJid == plag.user.jid, participant: fakeJid, ...(fakeGroupJid ? { remoteJid: fakeGroupJid } : {}) },
            message: { conversation: fakeText },
            ...options
          }
        })
    }
    
    plag.sendText = (jid, text, quoted = '', options) => plag.sendMessage(jid, { text, ...options }, { quoted })
    
    plag.sendGroupV4Invite = async (jid, participant, inviteCode, inviteExpiration, groupName = 'unknown subject', caption = 'Invitation to join my WhatsApp group', options = {}) => {
        const msg = generateWAMessageFromContent(participant, proto.Message.fromObject({
          groupInviteMessage: proto.GroupInviteMessage.fromObject({
            inviteCode,
            inviteExpiration: parseInt(inviteExpiration) || (Date.now() + (3 * 86400000)),
            groupJid: jid,
            groupName: groupName || (await plag.getName(jid)),
            caption
          })
        }), { userJid: plag.user.id, ...options })
        await plag.relayMessage(participant, msg.message, { messageId: msg.key.id })
        return msg
    }

    plag.cMod = (jid, message, text = '', sender = plag.user.jid, options = {}) => {
        let copy = message.toJSON()
        let mtype = Object.keys(copy.message || {})[0]
        let isEphemeral = false
        let msg = isEphemeral ? copy.message.ephemeralMessage.message : copy.message
        let content = msg[mtype]
        if (typeof content === 'string') msg[mtype] = text || content
        else if (content?.caption) content.caption = text || content.caption
        else if (content?.text) content.text = text || content.text
        if (typeof content !== 'string') msg[mtype] = { ...content, ...options }
        if (copy.participant) sender = copy.participant = sender || copy.participant
        else if (copy.key.participant) sender = copy.key.participant = sender || copy.key.participant
        if (copy.key.remoteJid.includes('@s.whatsapp.net')) sender = sender || copy.key.remoteJid
        else if (copy.key.remoteJid.includes('@broadcast')) sender = sender || copy.key.remoteJid
        copy.key.remoteJid = jid
        copy.key.fromMe = areJidsSameUser(sender, plag.user.id) || false
        return proto.WebMessageInfo.fromObject(copy)
    }

    plag.copyNForward = async (jid, message, forwardingScore = true, options = {}) => {
        let m = generateForwardMessageContent(message, !!forwardingScore)
        let mtype = Object.keys(m)[0]
        if (forwardingScore && typeof forwardingScore == 'number' && forwardingScore > 1) m[mtype].contextInfo.forwardingScore += forwardingScore
        m = generateWAMessageFromContent(jid, m, { ...options, userJid: plag.user.id })
        await plag.relayMessage(jid, m.message, { messageId: m.key.id, additionalAttributes: { ...options } })
        return m
    }
    
    plag.loadMessage = plag.loadMessage || (async (messageID) => {
        return Object.entries(plag.chats)
            .filter(([_, { messages }]) => typeof messages === 'object')
            .find(([_, { messages }]) => Object.entries(messages)
                .find(([k, v]) => (k === messageID || v.key?.id === messageID)))
            ?.[1].messages?.[messageID]
    })

    plag.downloadM = async (m, type, saveToFile) => {
        if (!m || !(m.url || m.directPath)) return Buffer.alloc(0)
        const stream = await downloadContentFromMessage(m, type)
        let buffer = Buffer.from([])
        for await (const chunk of stream) {
            buffer = Buffer.concat([buffer, chunk])
        }
        if (saveToFile) var { filename } = await plag.getFile(buffer, true)
        return saveToFile && fs.existsSync(filename) ? filename : buffer
    }
    
    plag.downloadAndSaveMediaMessage = async (message, filename, attachExtension = true) => {
        let quoted = message.msg ? message.msg : message
        let mime = (message.msg || message).mimetype || ''
        let messageType = message.mtype ? message.mtype.replace(/Message/gi, '') : mime.split('/')[0]
        const stream = await downloadContentFromMessage(quoted, messageType)
        let buffer = Buffer.from([])
        for await(const chunk of stream) {
            buffer = Buffer.concat([buffer, chunk])
        }
        let type = await FileType.fromBuffer(buffer)
        const trueFileName = attachExtension ? (filename + '.' + type.ext) : filename
        await fs.writeFileSync(trueFileName, buffer)
        return trueFileName
    }

    plag.parseMention = (text = '') => {
        return [...text.matchAll(/@([0-9]{5,16}|0)/g)].map(v => v[1] + '@s.whatsapp.net')
    }
    
    plag.chatRead = async (jid, participant = plag.user.jid, messageID) => {
        return await plag.sendReadReceipt(jid, participant, [messageID])
    }
    
    plag.sendStimg = async (jid, path, quoted, options = {}) => {
        let buff = Buffer.isBuffer(path) ? path
          : /^data:.*?\/.*?;base64,/i.test(path) ? Buffer.from(path.split`,`[1], 'base64')
          : /^https?:\/\//.test(path) ? await (await fetch(path)).buffer()
          : fs.existsSync(path) ? fs.readFileSync(path)
          : Buffer.alloc(0)
        let buffer = (options && (options.packname || options.author))
          ? await writeExifImg(buff, options)
          : await imageToWebp(buff)
        await plag.sendMessage(jid, { sticker: buffer, ...options }, { quoted })
        return buffer
    }

    plag.downloadMediaMessage = async (message) => {
        let mime = (message.msg || message).mimetype || ''
        let messageType = message.mtype ? message.mtype.replace(/Message/gi, '') : mime.split('/')[0]
        const stream = await downloadContentFromMessage(message, messageType)
        let buffer = Buffer.from([])
        for await (const chunk of stream) {
            buffer = Buffer.concat([buffer, chunk])
        }
        return buffer
    }
    
    plag.sendVideoAsSticker = async (jid, path, quoted, options = {}) => {
        let buff = Buffer.isBuffer(path) ? path
          : /^data:.*?\/.*?;base64,/i.test(path) ? Buffer.from(path.split`,`[1], 'base64')
          : /^https?:\/\//.test(path) ? await plag.getBuffer(path)
          : fs.existsSync(path) ? fs.readFileSync(path)
          : Buffer.alloc(0)
        let buffer = (options && (options.packname || options.author))
          ? await writeExifVid(buff, options)
          : await videoToWebp(buff)
        await plag.sendMessage(jid, { sticker: buffer, ...options }, { quoted })
        return buffer
    }

    plag.sendStvid = async (jid, path, quoted, options = {}) => {
        let buff = Buffer.isBuffer(path) ? path
          : /^data:.*?\/.*?;base64,/i.test(path) ? Buffer.from(path.split`,`[1], 'base64')
          : /^https?:\/\//.test(path) ? await plag.getBuffer(path)
          : fs.existsSync(path) ? fs.readFileSync(path)
          : Buffer.alloc(0)
        let buffer = (options && (options.packname || options.author))
          ? await writeExifVid(buff, options)
          : await videoToWebp(buff)
        await plag.sendMessage(jid, { sticker: buffer, ...options }, { quoted })
        return buffer
    }

    plag.sendTextWithMentions = async (jid, text, quoted, options = {}) =>
      plag.sendMessage(jid, {
        text,
        contextInfo: { mentionedJid: [...text.matchAll(/@(\d{0,16})/g)].map(v => v[1] + '@s.whatsapp.net') },
        ...options
      }, { quoted })

    plag.getName = (jid, withoutContact = false) => {
      const id = plag.decodeJid(jid);
      withoutContact = plag.withoutContact || withoutContact;
      let v;
      if (id.endsWith("@g.us")) {
        return new Promise(async (resolve) => {
          v = store.contacts[id] || {};
          if (!(v.name || v.subject)) v = await plag.groupMetadata(id).catch(_ => ({})) || {};
          resolve(v.name || v.subject || PhoneNumber("+" + id.replace("@s.whatsapp.net", "")).getNumber("international"));
        });
      } else {
        v = id === "0@s.whatsapp.net" ? { id, name: "WhatsApp" }
          : id === plag.decodeJid(plag.user.id) ? plag.user
          : store.contacts[id] || {};
        return (withoutContact ? "" : v.name) || v.subject || v.verifiedName || PhoneNumber("+" + jid.replace("@s.whatsapp.net", "")).getNumber("international");
      }
    };

    plag.sendPoll = async (jid, name = '', optiPoll, options) => {
        if (!Array.isArray(optiPoll[0]) && typeof optiPoll[0] === 'string') optiPoll = [optiPoll];
        if (!options) options = {};
        const pollMessage = {
            name,
            options: optiPoll.map(btn => ({ optionName: btn[0] || '' })),
            selectableOptionsCount: 1
        };
        return plag.relayMessage(jid, { pollCreationMessage: pollMessage }, { ...options });
    };

    plag.setBio = async (status) => {
        return await plag.query({
            tag: 'iq',
            attrs: { to: 's.whatsapp.net', type: 'set', xmlns: 'status' },
            content: [{ tag: 'status', attrs: {}, content: Buffer.from(status, 'utf-8') }]
        })
    }
    
    plag.format = (...args) => {
        return require('util').format(...args)
    }
    
    plag.getBuffer = async (url, options) => {
        try {
            const res = await axios({
                method: "get",
                url,
                headers: { 'DNT': 1, 'Upgrade-Insecure-Request': 1 },
                ...options,
                responseType: 'arraybuffer'
            })
            return res.data
        } catch (e) {
            console.log(`Error : ${e}`)
        }
    }

    plag.public = true;
    plag.serializeM = (m) => smsg(plag, m, store)

    return plag;
}

module.exports = {
    newSockets,
    smsg
};