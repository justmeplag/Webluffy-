const fs = require("fs");
const path = require("path");
const fileType = require("file-type");
const { uploadFile: uploadCloudku } = require("cloudku-uploader");
const FormData = require("form-data");
const fetch = require("node-fetch");

const ppFile = path.join(__dirname, "../pp.json");

// --- Upload vers Top4Top ---
async function uploadToTop4Top(buffer) {
  const { ext } = await fileType.fromBuffer(buffer) || { ext: "bin" };
  const data = new FormData();
  data.append("file_1_", buffer, { filename: `upload.${ext}` });
  data.append("submitr", "[ رفع الملفات ]");
  const r = await fetch("https://top4top.io/index.php", { method: "POST", body: data });
  if (!r.ok) throw new Error(`Erreur Top4Top: ${r.statusText}`);
  const html = await r.text();
  const match = html.match(/<input.*?value="(.+?)"/);
  if (!match) throw new Error("Lien Top4Top non trouvé.");
  return match[1];
}

// --- Upload vers ZenZxz ---
async function uploadToZen(buffer, filename) {
  const form = new FormData();
  form.append("file", buffer, filename);
  const res = await fetch("https://uploader.zenzxz.dpdns.org/upload", { method: "POST", body: form });
  const html = await res.text();
  const match = html.match(/href="(https?:?:\/\/uploader\.zenzxz\.dpdns\.org\/uploads\/[^"]+)"/);
  if (!match) throw new Error("Lien ZenZxz non trouvé.");
  return match[1].startsWith("http") ? match[1] : "https:" + match[1];
}

const handlerSetppAdd = async (m, { plag }) => {
  try {
    const q = m.quoted ? m.quoted : m;
    const mime = q.mimetype || "";
    if (!mime || !/image/.test(mime)) {
      return plag.sendMessage(m.chat, { text: "💀 [LUFFY-XMD] Réponds à une image pour l’ajouter à la liste PP." }, { quoted: m });
    }

    await plag.sendMessage(m.chat, { react: { text: "📥", key: m.key } });

    const buffer = await plag.downloadMediaMessage(q);
    if (!buffer) return plag.sendMessage(m.chat, { text: "💀 [LUFFY-XMD] Impossible de télécharger l’image." }, { quoted: m });
    if (buffer.length > 20 * 1024 * 1024) return plag.sendMessage(m.chat, { text: "💀 [LUFFY-XMD] Fichier trop grand ! Max 20 MB." }, { quoted: m });

    const { ext } = await fileType.fromBuffer(buffer) || { ext: "bin" };
    const filename = `upload-${Date.now()}.${ext}`;

    const results = await Promise.allSettled([
      uploadCloudku(buffer, filename),
      uploadToZen(buffer, filename),
      uploadToTop4Top(buffer)
    ]);

    let imageUrl = null;
    if (results[0].status === "fulfilled" && results[0].value?.status === "success") imageUrl = results[0].value.data.url;
    else if (results[1].status === "fulfilled") imageUrl = results[1].value;
    else if (results[2].status === "fulfilled") imageUrl = results[2].value;

    if (!imageUrl) {
      return plag.sendMessage(m.chat, { text: "💀 [LUFFY-XMD] Échec du téléversement sur tous les services." }, { quoted: m });
    }

    if (!global.ppList) global.ppList = [];
    global.ppList.push(imageUrl);

    // Sauvegarde persistante
    fs.writeFileSync(ppFile, JSON.stringify(global.ppList, null, 2));

    await plag.sendMessage(m.chat, { react: { text: "☑️", key: m.key } });
    await plag.sendMessage(m.chat, {
      text: `⚡ [LUFFY-XMD] Image ajoutée à la liste PP.\n🖼️ ${imageUrl}\n\n🔖 LUFFY-XMD BY PLAG`
    }, { quoted: m });

  } catch (err) {
    console.error("SETPPADD ERROR:", err);
    await plag.sendMessage(m.chat, { text: "💀 [LUFFY-XMD] Erreur lors de l’ajout de l’image." }, { quoted: m });
  }
};

handlerSetppAdd.command = ["setppadd"];
handlerSetppAdd.help = ["setppadd (répondre à une photo)"];
handlerSetppAdd.tags = ["owner"];

module.exports = handlerSetppAdd;