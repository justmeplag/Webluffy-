const crypto = require("crypto");
const FormData = require("form-data");
const axios = require("axios");
const fileType = require("file-type");
const { uploadFile: uploadCloudku } = require("cloudku-uploader");
const fetch = require("node-fetch");

const handler = async (m, { plag }) => {
  const q = m.quoted ? m.quoted : m;
  const mime = q.mimetype || "";
  if (!mime || !/image|video/.test(mime)) {
    return plag.sendMessage(m.chat, { text: "❌ Veuillez répondre à une image ou une vidéo." }, { quoted: m });
  }

  await plag.sendMessage(m.chat, { react: { text: "📥", key: m.key } });

  const buffer = await plag.downloadMediaMessage(q);
  if (!buffer) return plag.sendMessage(m.chat, { text: "❌ Impossible de télécharger le média." }, { quoted: m });
  if (buffer.length > 20 * 1024 * 1024) return plag.sendMessage(m.chat, { text: "❌ Fichier trop grand ! Max 20 MB." }, { quoted: m });

  const { ext } = await fileType.fromBuffer(buffer) || { ext: "bin" };
  const filename = `upload-${Date.now()}.${ext}`;

  const results = await Promise.allSettled([
    uploadCloudku(buffer, filename),
    uploadToZen(buffer, filename),
    uploadToTop4Top(buffer)
  ]);

  let text = "";
  if (results[0].status === "fulfilled" && results[0].value?.status === "success") text += `*Cloudku :* ${results[0].value.data.url}\n`;
  if (results[1].status === "fulfilled") text += `*ZenZxz :* ${results[1].value}\n`;
  if (results[2].status === "fulfilled") text += `*Top4Top :* ${results[2].value}\n`;

  if (!text) return plag.sendMessage(m.chat, { text: "❌ Échec du téléversement sur tous les services." }, { quoted: m });

  const caption = `
✦━━━━━━━━━━━━━━━━━━━━✦
📤 *T O U R L* 📤
✦━━━━━━━━━━━━━━━━━━━━✦

📁 *Type:* ${mime}
📦 *Size:* ${formatBytes(buffer.length)}

${text}

✦━━━━━━━━━━━━━━━━━━━━✦
✨ Mugiwara no plag – LUFFY‑XMD ✦
`;

  await plag.sendMessage(m.chat, {
    text: caption,
    contextInfo: {
      externalAdReply: {
        title: "📤 Tourl Generator",
        body: "Convertir vos fichiers en lien direct",
        thumbnailUrl: "https://uploader.zenzxz.dpdns.org/uploads/1763300804728.jpeg",
        sourceUrl: results[0]?.value?.data?.url || results[1]?.value || results[2]?.value,
        mediaType: 1,
        renderLargerThumbnail: true
      }
    }
  }, { quoted: m });
};

handler.command = ["tourl", "tolink"];
handler.help = ["tourl", "tolink"];
handler.tags = ["tools"];
handler.limit = true;
handler.register = true;

module.exports = handler;

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

// --- Formatage ---
function formatBytes(bytes) {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / 1024 ** i).toFixed(2)} ${units[i]}`;
}