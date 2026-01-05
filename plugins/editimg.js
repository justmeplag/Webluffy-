/*
 • NanoBanana AI Image Edit
 • Corrigé pour LUFFY‑XMD : conversion en JPEG
*/

const axios = require("axios");
const crypto = require("crypto");
const sharp = require("sharp"); // librairie pour convertir en JPEG

async function nanobanana(prompt, image) {
  try {
    if (!prompt) throw new Error("❌ Prompt requis.");
    if (!Buffer.isBuffer(image)) throw new Error("❌ L'image doit être un buffer.");

    // 🔄 Conversion en JPEG pour éviter les erreurs 400
    const jpegBuffer = await sharp(image).jpeg().toBuffer();

    const inst = axios.create({
      baseURL: "https://image-editor.org/api",
      headers: {
        origin: "https://image-editor.org",
        referer: "https://image-editor.org/editor",
        "user-agent":
          "Mozilla/5.0 (Linux; Android 15; SM-F958 Build/AP3A.240905.015) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.6723.86 Mobile Safari/537.36",
      },
    });

    // Pré-signed upload
    const { data: up } = await inst.post("/upload/presigned", {
      filename: `${Date.now()}_luffy.jpg`,
      contentType: "image/jpeg",
    });

    if (!up?.data?.uploadUrl) throw new Error("❌ Upload URL introuvable.");
    await axios.put(up.data.uploadUrl, jpegBuffer);

    // Bypass CF Turnstile
    const { data: cf } = await axios.post("https://api.nekolabs.web.id/tools/bypass/cf-turnstile", {
      url: "https://image-editor.org/editor",
      siteKey: "0x4AAAAAAB8ClzQTJhVDd_pU",
    });

    if (!cf?.result) throw new Error("❌ Échec du token CF.");

    // Créer la tâche
    const { data: task } = await inst.post("/edit", {
      prompt,
      image_urls: [up.data.fileUrl],
      image_size: "auto",
      turnstileToken: cf.result,
      uploadIds: [up.data.uploadId],
      userUUID: crypto.randomUUID(),
      imageHash: crypto.createHash("sha256").update(jpegBuffer).digest("hex").substring(0, 64),
    });

    if (!task?.data?.taskId) throw new Error("❌ Task ID introuvable.");

    // Polling du résultat
    while (true) {
      const { data } = await inst.get(`/task/${task.data.taskId}`);
      if (data?.data?.status === "completed") return data.data.result;
      if (data?.data?.status === "failed") throw new Error("❌ Échec de l'édition.");
      await new Promise((res) => setTimeout(res, 2000));
    }
  } catch (error) {
    throw new Error(error.message);
  }
}

const handler = async (m, { plag, args }) => {
  const q = m.quoted ? m.quoted : m;
  const mime = q.mimetype || "";
  if (!mime || !mime.startsWith("image/")) {
    return plag.sendMessage(m.chat, { text: "❌ Veuillez répondre à une image." }, { quoted: m });
  }

  const prompt = Array.isArray(args) && args.length > 0 ? args.join(" ") : "enhance image";

  await plag.sendMessage(m.chat, { react: { text: "⚙️", key: m.key } });

  const buffer = await plag.downloadMediaMessage(q);
  if (!buffer) return plag.sendMessage(m.chat, { text: "❌ Impossible de télécharger l'image." }, { quoted: m });

  try {
    const resultUrl = await nanobanana(prompt, buffer);

    await plag.sendMessage(m.chat, {
      image: { url: resultUrl },
      caption: `✅ Image éditée avec succès !\n\n📝 Prompt: ${prompt}\n🌐 Source: image-editor.org`,
    }, { quoted: m });
  } catch (e) {
    await plag.sendMessage(m.chat, { text: `❌ Erreur: ${e.message}` }, { quoted: m });
  }
};

handler.command = ["nanobanana", "editimg"];
handler.help = ["nanobanana <prompt>"];
handler.tags = ["ai"];

module.exports = handler;