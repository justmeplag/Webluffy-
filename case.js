/** # ============================ #
 • Author : anggara z (Modifié par Mugiwara no plag)
 • Type : plugin n case
 • Java script : cjs
 # ============================ #
**/

require('./lib/system/config');
const { exec, spawn, execSync } = require("child_process");
const fs = require('fs');
const fsx = require('fs-extra');
const util = require('util');
const path = require("path");
const chalk = require("chalk");
const { performance } = require("perf_hooks");
const process = require('process');
const moment = require("moment-timezone");
const { addExif } = require('./lib/exif');
const axios = require('axios')
const { 
    bytesToSize, checkBandwidth, getBuffer, isUrl, jsonformat, fetchData, nganuin, 
    pickRandom, runtime, shorturl, color, getGroupAdmins, getQuoted, getQmsg, getMime 
} = require("./lib/function"); 
const { remini, jarak, ssweb, quote, tiktok, PlayStore, BukaLapak, pinterest, stickersearch, lirik } = require("./lib/scraper");

module.exports = plag = async (plag, m, chatUpdate, store) => {
    let command = '';
try {
    // --- Logique de base pour analyser le message ---
    const body = (m.mtype === 'conversation') ? m.message.conversation 
                 : (m.mtype == 'imageMessage') ? m.message.imageMessage.caption 
                 : (m.mtype == 'videoMessage') ? m.message.videoMessage.caption 
                 : (m.mtype == 'extendedTextMessage') ? m.message.extendedTextMessage.text 
                 : (m.mtype == 'buttonsResponseMessage') ? m.message.buttonsResponseMessage.selectedButtonId 
                 : (m.mtype == 'listResponseMessage') ? m.message.listResponseMessage.singleSelectReply.selectedRowId 
                 : (m.mtype == 'templateButtonReplyMessage') ? m.message.templateButtonReplyMessage.selectedId 
                 : (m.mtype === 'messageContextInfo') ? (m.message.buttonsResponseMessage?.selectedButtonId || m.message.listResponseMessage?.singleSelectReply?.selectedRowId || m.text) 
                 : '';

    const budy = (typeof m.text == 'string' ? m.text : '');
    const prefix = /^[°zZ#@*+,.?''():√%!¢£¥€π¤ΠΦ_&<`™©®Δ^βα~¦|/\\©^]/.test(body) ? body.match(/^[°zZ#@*+,.?''():√%¢£¥€π¤ΠΦ_&<!`™©®Δ^βα~¦|/\\©^]/gi) : '.';
    const isCmd = body.startsWith(prefix);
    const command = isCmd ? body.slice(prefix.length).trim().split(' ').shift().toLowerCase() : '';
    const args = body.trim().split(/ +/).slice(1);
    const full_args = body.replace(command, '').slice(1).trim();
    const text = q = args.join(" ");

    // ✅ MODIFICATION : autoriser le bot à traiter ses propres messages
    if (m.key.fromMe) {
        console.log(chalk.blue(`[INFO] Message du bot détecté, on le traite aussi : ${body}`));
        m.sender = plag.user.id; // force l’expéditeur à être le bot lui-même
    }

    // --- Bases de données (owner) ---
    const owner = JSON.parse(fs.readFileSync('./lib/database/owner.json'));

    // --- Variables utiles ---
    const botNumber = await plag.decodeJid(plag.user.id);
    const ownerList = [botNumber, global.owner, ...owner].map(v => v.replace(/[^0-9]/g, '') + '@s.whatsapp.net');
    const isOwner = ownerList.includes(m.sender);
    const pushname = m.pushName || "Sans Nom";
    
    const quoted = getQuoted(m);
    const qmsg = getQmsg(m);
    const mime = getMime(m);
    const isMedia = /image|video|sticker|audio/.test(mime);

    const prem = JSON.parse(fs.readFileSync("./lib/database/premium.json"));
    const isPremium = prem.includes(m.sender);

    const settingdb = global.db.data.settings[botNumber] || {};
    const chatdb = global.db.data.chats[m.chat] || {};
    const isBan = chatdb.isBanned;
    
    const isGroup = m.isGroup;
    const groupMetadata = isGroup ? await plag.groupMetadata(m.chat).catch(e => {}) : {};
    const participants = isGroup ? groupMetadata.participants : [];
    const groupAdmins = isGroup ? getGroupAdmins(participants) : [];
    const isBotAdmins = isGroup ? groupAdmins.includes(botNumber) : false;
    const isAdmins = isGroup ? groupAdmins.includes(m.sender) : false;
    const groupOwner = isGroup ? groupMetadata.owner : '';
    const isGroupOwner = isGroup ? (groupOwner ? groupOwner : groupAdmins).includes(m.sender) : false;

    if (settingdb.autoread) {
        plag.readMessages([m.key]);
    }

    

    // --- GESTIONNAIRE DE PLUGINS ---
    // --- CORRECTION DU CHEMIN "EROFS" ---
    // path.resolve(__dirname, "plugins") pointe maintenant vers /home/container/plugins
    const pluginCjsDir = path.resolve(__dirname, "plugins"); 
    const helper = { 
        plag, isOwner, pushname, command, isCmd, text, q, runtime, qmsg, mime, prefix, botNumber, isPremium, isBan, chatdb, settingdb,
        isGroup, participants, groupAdmins, isBotAdmins, isAdmins, groupOwner, isGroupOwner, groupMetadata
    };

    const pluginsLoader = async (directory) => {
      const plugins = [];
      if (!fs.existsSync(directory)) {
          console.log(chalk.yellow(`[ Luffy-XMD ] Dossier plugins introuvable à la racine. Création...`));
          try {
              fs.mkdirSync(directory); // Tente de créer /home/container/plugins
          } catch (e) {
              console.log(chalk.red(`[ ERREUR FATALE ] Impossible de créer le dossier plugins. Vérifiez les permissions.`));
              console.log(e);
              return []; // Stoppe le chargement si impossible de créer
          }
      }
      const files = fs.readdirSync(directory);
      for (let file of files) {
        const plugdir = path.join(directory, file);
        if (plugdir.endsWith(".js")) {
          try {
            const resolvedPath = require.resolve(plugdir);
            if (require.cache[resolvedPath]) delete require.cache[resolvedPath];
            const plugin = require(plugdir);
            plugins.push(plugin);
          } catch (err) {
            console.log(chalk.red(`[ ERREUR PLUGIN ] Échec du chargement de '${file}': ${err.message}`));
          }
        }
      }
      return plugins;
    };

    let pluginsDisable = true;
    const cjsPlugins = await pluginsLoader(pluginCjsDir);
    for (let plugin of cjsPlugins) {
      if (!plugin.command?.find(e => e === command.toLowerCase())) continue;
      pluginsDisable = false;
      if (typeof plugin !== "function") continue;
      await plugin(m, helper);
    }
    if (!pluginsDisable) return;
    // --- FIN DU GESTIONNAIRE DE PLUGINS ---


    // --- COMMANDES INTERNES (le "switch" original) ---
    switch (command) {
    
    // --- Commandes PROPRIÉTAIRE ---
    case 'autoread': {
        if (!isOwner) return m.reply(mess.owner);
        if (args.length < 1) return m.reply(`Exemple: ${prefix + command} on/off`);
        if (q === 'on') {
            if (settingdb.autoread) return m.reply("Déjà activé !");
            settingdb.autoread = true;
            m.reply(`Auto-lecture activée.`);
        } else if (q === 'off') {
            if (!settingdb.autoread) return m.reply("Déjà désactivé !");
            settingdb.autoread = false;
            m.reply(`Auto-lecture désactivée.`);
        }
    }
    break;

    case 'restart': case 'shutdown':
        if (!isOwner) return m.reply(mess.owner);
        await m.reply(command === 'restart' ? 'Redémarrage du bot...' : 'Arrêt du bot...');
        setTimeout(() => {
            if (command === "restart") {
                process.send("reset");
            } else {
                process.exit(2);
            }
        }, 3000);
    break;

    case "addprem": {
        if (!isOwner) return m.reply(mess.owner);
        if (!args[0]) return m.reply(`Usage : ${prefix+command} [numero]`);
        let userepu = q.split("|")[0].replace(/[^0-9]/g, '');
        let ceknya = await plag.onWhatsApp(userepu);
        if (ceknya.length == 0) return m.reply(`Numéro invalide ou non enregistré sur WhatsApp.`);
        prem.push(userepu);
        fs.writeFileSync("./lib/database/premium.json", JSON.stringify(prem));
        m.reply(`Le numéro ${userepu} est maintenant premium !`);
    }
    break;
    
    case "delprem": {
        if (!isOwner) return m.reply(mess.owner);
        if (!args[0]) return m.reply(`Usage : ${prefix+command} [numero]`);
        let userepu = q.split("|")[0].replace(/[^0-9]/g, '') + `@s.whatsapp.net`;
        let unp = prem.indexOf(userepu);
        prem.splice(unp, 1);
        fs.writeFileSync("./lib/database/premium.json", JSON.stringify(prem));
        m.reply(`Le numéro ${userepu} n'est plus premium.`);
    }
    break;

    case 'listprem': {
        m.reply(`*LISTE DES UTILISATEURS PREMIUM :*\n\n- ${prem.join('\n- ')}`);
    }
    break;

    case 'addowner': {
        if (!isOwner) return m.reply(mess.owner);
        if (!args[0]) return m.reply(`Usage : ${prefix+command} [numero]`);
        let userepu = text.replace(/[^0-9]/g, '');
        let cek1 = await plag.onWhatsApp(userepu + `@s.whatsapp.net`);
        if (cek1.length == 0) return (`Numéro invalide ou non enregistré sur WhatsApp.`);
        owner.push(userepu);
        fs.writeFileSync('./lib/database/owner.json', JSON.stringify(owner));
        if (!prem.includes(userepu)) {
            prem.push(userepu);
            fs.writeFileSync("./lib/database/premium.json", JSON.stringify(prem));
        }
        m.reply(`*${userepu}* est maintenant propriétaire et premium !`);
    }
    break;

    case 'delowner': {
        if (!isOwner) return m.reply(mess.owner);
        if (!args[0]) return m.reply(`Usage : ${prefix+command} [numero]`);
        let userepu = text.replace(/[^0-9]/g, '');
        let unp = owner.indexOf(userepu);
        owner.splice(unp, 1);
        fs.writeFileSync('./lib/database/owner.json', JSON.stringify(owner));
        if (prem.includes(userepu)) {
            let uunp = prem.indexOf(userepu);
            prem.splice(uunp, 1);
            fs.writeFileSync("./lib/database/premium.json", JSON.stringify(prem));
        }
        m.reply(`*${userepu}* n'est plus propriétaire (ni premium).`);
    }
    break;
    
    case "dev": case 'owner': case 'creator': {
        m.reply(`*Propriétaire Principal :* @${global.owner}\n*Autres Propriétaires :*\n${owner.map(v => `- @${v}`).join('\n')}`, {
             mentions: [global.owner + '@s.whatsapp.net', ...owner.map(v => v + '@s.whatsapp.net')]
        });
    }
    break;

    case 'banned': {
        if (!isOwner) return m.reply(mess.owner);
        if (args[0] === "add") {
            if (isBan) return m.reply('*Ce chat est déjà banni.*');
            chatdb.isBanned = true;
            m.reply(`Bannissement de ce chat réussi.`);
        } else if (args[0] === "remove") {
            if (!isBan) return m.reply('*Ce chat n\'est pas banni.*');
            chatdb.isBanned = false;
            m.reply(`Bannissement de ce chat retiré.`);
        } else {
            m.reply("Usage: .banned [add/remove]");
        }
    }
    break;

    // --- Commandes GESTION PLUGINS (CHEMINS CORRIGÉS) ---
    case 'addcase': case 'addplugin': {
        if (!isOwner) return m.reply(mess.owner);
        if (!text) return m.reply(`Usage : ${prefix+command} [nom] (répondez à un texte contenant le code)`);
        if (!m.quoted || !m.quoted.text) return m.reply(`Veuillez citer le code que vous souhaitez enregistrer.`);
        let pluginName = text.trim().toLowerCase();
        if (!pluginName.endsWith('.js')) pluginName += '.js';
        // CHEMIN CORRIGÉ
        let pluginPath = path.join(__dirname, 'plugins', pluginName);
        let pluginCode = m.quoted.text;
        fs.writeFileSync(pluginPath, pluginCode);
        m.reply(`Plugin '${pluginName}' enregistré avec succès dans /plugins/`);
    }
    break;
    
    case 'delcase': case 'delplugin': {
        if (!isOwner) return m.reply(mess.owner);
        if (!text) return m.reply(`Usage : ${prefix+command} [nomduplugin.js]`);
        let pluginName = text.trim().toLowerCase();
        if (!pluginName.endsWith('.js')) pluginName += '.js';
        // CHEMIN CORRIGÉ
        let pluginPath = path.join(__dirname, 'plugins', pluginName);
        if (!fs.existsSync(pluginPath)) return m.reply(`Plugin '${pluginName}' introuvable.`);
        fs.unlinkSync(pluginPath);
        m.reply(`Plugin '${pluginName}' supprimé avec succès.`);
    }
    break;
    
    case 'listcase': case 'listplugin': {
        if (!isOwner) return m.reply(mess.owner);
        // CHEMIN CORRIGÉ
        const pluginDir = path.join(__dirname, 'plugins');
        if (!fs.existsSync(pluginDir)) return m.reply("Le dossier /plugins/ n'existe pas encore.");
        const files = fs.readdirSync(pluginDir).filter(file => file.endsWith('.js'));
        if (files.length === 0) return m.reply("Aucun plugin trouvé dans /plugins/");
        m.reply(`*LISTE DES PLUGINS :*\n\n- ${files.join('\n- ')}`);
    }
    break;
    
    // --- Commandes GROUPE ---
    case "add": {
        if (!isGroup) return m.reply(mess.group);
        if (!isBotAdmins) return m.reply(mess.botAdmin);
        if (!isAdmins) return m.reply(mess.admin);
        if (!text && !m.quoted) return m.reply('Entrez le numéro que vous souhaitez ajouter.');
        let users = m.quoted ? m.quoted.sender : text.replace(/[^0-9]/g, '') + '@s.whatsapp.net';
        await plag.groupParticipantsUpdate(m.chat, [users], 'add').catch(e => m.reply(`Erreur: ${e.message}`));
    }
    break;
    
    case "kick": {
        if (!isGroup) return m.reply(mess.group);
        if (!isBotAdmins) return m.reply(mess.botAdmin);
        if (!isAdmins) return m.reply(mess.admin);
        if (!text && !m.quoted) return m.reply('Entrez le numéro que vous souhaitez exclure.');
        let users = m.quoted ? m.quoted.sender : text.replace(/[^0-9]/g, '') + '@s.whatsapp.net';
        await plag.groupParticipantsUpdate(m.chat, [users], 'remove').catch(e => m.reply(`Erreur: ${e.message}`));
    }
    break;

    case "promote": {
        if (!isGroup) return m.reply(mess.group);
        if (!isBotAdmins) return m.reply(mess.botAdmin);
        if (!isAdmins) return m.reply(mess.admin);
        if (!text && !m.quoted) return m.reply('Entrez le numéro que vous souhaitez promouvoir.');
        let users = m.quoted ? m.quoted.sender : text.replace(/[^0-9]/g, '') + '@s.whatsapp.net';
        await plag.groupParticipantsUpdate(m.chat, [users], 'promote').catch(e => m.reply(`Erreur: ${e.message}`));
    }
    break;

    case "demote": {
        if (!isGroup) return m.reply(mess.group);
        if (!isBotAdmins) return m.reply(mess.botAdmin);
        if (!isAdmins) return m.reply(mess.admin);
        if (!text && !m.quoted) return m.reply('Entrez le numéro que vous souhaitez rétrograder.');
        let users = m.quoted ? m.quoted.sender : text.replace(/[^0-9]/g, '') + '@s.whatsapp.net';
        await plag.groupParticipantsUpdate(m.chat, [users], 'demote').catch(e => m.reply(`Erreur: ${e.message}`));
    }
    break;

    // --- Commandes STICKER ---
    case 'sticker': case 'stiker': case 's': {
        if (!quoted) return m.reply(`Répondez à une image ou une vidéo avec la commande ${prefix + command}`);
        m.reply(mess.wait);
        if (/image/.test(mime)) {
            let media = await quoted.download();
            let encmedia = await plag.sendImageAsSticker(m.chat, media, m, {
                packname: global.packname,
                author: global.author
            });
        } else if (/video/.test(mime)) {
            if ((quoted.msg || quoted).seconds > 11) return m.reply('Maximum 10 secondes !');
            let media = await quoted.download();
            let encmedia = await plag.sendVideoAsSticker(m.chat, media, m, {
                packname: global.packname,
                author: global.author
            });
        } else {
            return m.reply(`Envoyez une image/vidéo avec la commande ${prefix + command}\nDurée vidéo 1-9 secondes`);
        }
    }
    break;
    
    case 'swm': {
        let [teks1, teks2] = text.split`|`;
        if (!quoted) return m.reply(`Répondez à une image/vidéo avec la commande ${prefix + command} [pack]|[auteur]`);
        if (!teks1) return m.reply(`Format: ${prefix + command} [pack]|[auteur]`);
        if (!teks2) return m.reply(`Format: ${prefix + command} [pack]|[auteur]`);
        m.reply(mess.wait);
        if (/image/.test(mime)) {
            let media = await quoted.download();
            let encmedia = await plag.sendImageAsSticker(m.chat, media, m, {
                packname: teks1,
                author: teks2
            });
        } else if (/video/.test(mime)) {
            if ((quoted.msg || quoted).seconds > 11) return m.reply('Maximum 10 secondes !');
            let media = await quoted.download();
            let encmedia = await plag.sendVideoAsSticker(m.chat, media, m, {
                packname: teks1,
                author: teks2
            });
        } else {
            return m.reply(`Envoyez une image/vidéo avec la commande ${prefix + command}\nDurée vidéo 1-9 secondes`);
        }
    }
    break;
    
    
      
  // --- Commandes OUTILS ---
    case 'hd': case 'remini': {
        if (!/image/.test(mime)) return m.reply(`Répondez à une photo avec la commande : ${prefix + command}`);
        m.reply(mess.wait);
        let media = await quoted.download();
        let proses = await remini(media, "enhance");
        let proses2 = proses;
        let hade = await remini(proses2, "enhance"); // Double amélioration
        plag.sendMessage(m.chat, {
            image: hade,
            caption: mess.succes
        }, {
            quoted: m
        });
    }
    break;
    
    case "trt": {
        let lang, text;
        if (args.length >= 2) {
            lang = args[0] ? args[0] : 'fr', text = args.slice(1).join(' ');
        } else if (m.quoted && m.quoted.text) {
            lang = args[0] ? args[0] : 'fr', text = m.quoted.text;
        } else throw `Ex: ${prefix + command} fr Hello, how are you?`;
        
        const translate = require('@vitalets/google-translate-api');
        m.reply(mess.wait);
        let res = await translate(text, {
            to: lang,
            autoCorrect: true
        }).catch(_ => null);
        if (!res) return m.reply(`Erreur : La langue "${lang}" n'est pas supportée.`);
        m.reply(`*Langue détectée:* ${res.from.language.iso}\n*Traduit en:* ${lang}\n\n*Résultat:* ${res.text}`.trim());
    }
    break;
   
    
    case 'tts': {
        if (!text) return m.reply(`Ex: ${prefix}${command} fr Salut le monde`);
        m.reply(mess.wait);
        const a = await (await axios.post("https://gesserit.co/api/tiktok-tts", {
            text: text,
            voice: "id_001" // Note: La voix est en indonésien, à changer si possible
        }, {
            headers: {
                Referer: "https://gesserit.co/tiktok",
                "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
                responseType: "arraybuffer"
            }
        })).data;
        plag.sendMessage(m.chat, {
            audio: Buffer.from(a.audioUrl.split("base64,")[1], "base64"),
            mimetype: "audio/mpeg"
        }, { quoted: m });
    }
    break;
    

    
    case 'readvo':
    case 'readviewonce': {
        if (!m.quoted) return m.reply('Répondez à une image/vidéo en vue unique.');
        if (m.quoted.mtype !== 'viewOnceMessageV2') return m.reply('Ce n\'est pas un message en vue unique.');
        m.reply(mess.wait);
        let msg = m.quoted.message;
        let type = Object.keys(msg)[0];
        let media = await downloadContentFromMessage(msg[type], type == 'imageMessage' ? 'image' : 'video');
        let buffer = Buffer.from([]);
        for await (const chunk of media) {
            buffer = Buffer.concat([buffer, chunk]);
        }
        if (/video/.test(type)) {
            return plag.sendMessage(m.chat, { video: buffer, caption: msg[type].caption || '' }, { quoted: m });
        } else if (/image/.test(type)) {
            return plag.sendMessage(m.chat, { image: buffer, caption: msg[type].caption || '' }, { quoted: m });
        }
    }
    break;
    

    // --- DEFAULT (Commandes Owner Eval) ---
    default:
        if (budy.startsWith('=>') && isOwner) {
            try {
                let evaled = await eval(`(async () => { return ${budy.slice(3)} })()`);
                m.reply(util.format(evaled));
            } catch (e) {
                m.reply(util.format(e));
            }
        }
        
        if (budy.startsWith('>') && isOwner) {
             try {
                let evaled = await eval(`(async () => { ${budy.slice(2)} })()`);
                m.reply(util.format(evaled));
            } catch (e) {
                m.reply(util.format(e));
            }
        }

        if (budy.startsWith('$') && isOwner) {
            exec(budy.slice(2), (err, stdout) => {
                if (err) return m.reply(`${err}`);
                if (stdout) return m.reply(stdout);
            });
        }
    }

} catch (err) {
    // --- GESTION D'ERREURS ---
    console.log(chalk.red('[ ERREUR DANS CASE.JS ]'), err);
    if (global.dev) {
        const errorText = `*-- RAPPORT D'ERREUR [Luffy-XMD] --*\n\n` +
                          `*Commande:* ${command || 'Aucune (erreur générale)'}\n` +
                          `*Utilisateur:* ${m.sender}\n` +
                          `*Discussion:* ${m.chat}\n` +
                          `*Erreur:*\n\`\`\`${util.format(err)}\`\`\``;
        plag.sendMessage(global.dev.replace(/[^0-9]/g, '') + '@s.whatsapp.net', { text: errorText });
    }
}
}