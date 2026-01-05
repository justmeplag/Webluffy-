// plugins/getcase.js

const fs = require('fs');
const path = require('path');

const handler = async (m, { text, prefix, command }) => {
    // Vérifie si un nom de plugin est fourni
    if (!text) {
        return m.reply(`Usage : ${prefix + command} [nomduplugin.js]\n\nExemple : ${prefix + command} report.js`);
    }

    // Normalise le nom du plugin
    let pluginName = text.trim().toLowerCase();
    if (!pluginName.endsWith('.js')) pluginName += '.js';

    // Chemin du plugin
    let pluginPath = path.join(__dirname, pluginName);

    // Vérifie si le fichier existe
    if (!fs.existsSync(pluginPath)) {
        return m.reply(`❌ Plugin '${pluginName}' introuvable dans /plugins/`);
    }

    try {
        // Lit le contenu du plugin
        let pluginCode = fs.readFileSync(pluginPath, 'utf8');

        // Envoie le contenu dans la conversation
        await m.reply(`*Contenu du plugin : ${pluginName}*\n\n\`\`\`js\n${pluginCode}\n\`\`\``);

    } catch (e) {
        console.error(e);
        await m.reply("❌ Impossible de lire le plugin.");
    }
};

// Commandes pour activer ce plugin
handler.command = ["getcase", "getplugin", "getplugins"];

// Exporter le handler
module.exports = handler;