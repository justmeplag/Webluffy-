const axios = require("axios");

const fs = require("fs");

const PATH_FILE = "./auto_download.json";

const API_URL = "https://auto-download-all-in-one.p.rapidapi.com/v1/social/autolink";

const RAPID_KEY = "1dda0d29d3mshc5f2aacec619c44p16f219jsn99a62a516f98";

const RAPID_HOST = "auto-download-all-in-one.p.rapidapi.com";

// --------- Store ----------

function readStore() {

  if (!fs.existsSync(PATH_FILE)) return { enabled: false, seen: {} };

  try {

    const data = JSON.parse(fs.readFileSync(PATH_FILE, "utf8"));

    return { enabled: !!data.enabled, seen: data.seen || {} };

  } catch {

    return { enabled: false, seen: {} };

  }

}

function writeStore(store) {

  fs.writeFileSync(PATH_FILE, JSON.stringify(store, null, 2));

}

function setEnabled(enabled) {

  const s = readStore();

  s.enabled = enabled;

  writeStore(s);

}

function markSeen(msgKey) {

  const s = readStore();

  s.seen[msgKey] = Date.now();

  const cutoff = Date.now() - 12 * 60 * 60 * 1000;

  for (const k of Object.keys(s.seen)) {

    if (s.seen[k] < cutoff) delete s.seen[k];

  }

  writeStore(s);

}

function hasSeen(msgKey) {

  const s = readStore();

  return !!s.seen[msgKey];

}

// --------- Utils ----------

const URL_REGEX = /\bhttps?:\/\/[^\s<>()]+/gi;

function getTextCandidates(m) {

  const out = [];

  try {

    const msg = m.message || m.msg || {};

    if (m.text) out.push(m.text);

    if (m.body) out.push(m.body);

    if (msg.conversation) out.push(msg.conversation);

    if (msg.extendedTextMessage && msg.extendedTextMessage.text) out.push(msg.extendedTextMessage.text);

    if (msg.imageMessage && msg.imageMessage.caption) out.push(msg.imageMessage.caption);

    if (msg.videoMessage && msg.videoMessage.caption) out.push(msg.videoMessage.caption);

    if (m.quoted) {

      const q = m.quoted.message || m.quoted.msg || {};

      if (m.quoted.text) out.push(m.quoted.text);

      if (m.quoted.body) out.push(m.quoted.body);

      if (q.conversation) out.push(q.conversation);

      if (q.extendedTextMessage && q.extendedTextMessage.text) out.push(q.extendedTextMessage.text);

      if (q.imageMessage && q.imageMessage.caption) out.push(q.imageMessage.caption);

      if (q.videoMessage && q.videoMessage.caption) out.push(q.videoMessage.caption);

    }

  } catch (e) {

    console.error("AUTO-DL getTextCandidates error:", e);

  }

  return out.filter(Boolean);

}

function extractUrlsFromMessage(m) {

  const texts = getTextCandidates(m);

  const all = texts.join("\n");

  const urls = (all.match(URL_REGEX) || []).map(u => u.trim());

  return Array.from(new Set(urls));

}

async function resolveMedias(url) {

  const res = await axios.post(API_URL, { url }, {

    headers: {

      "content-type": "application/json; charset=utf-8",

      "x-rapidapi-host": RAPID_HOST,

      "x-rapidapi-key": RAPID_KEY,

      "user-agent": "Mozilla/5.0",

    },

    timeout: 30000,

  });

  const data = res.data || {};

  const medias = data.medias || (data.data && data.data.medias) || (data.result && data.result.links) || [];

  const title = data.title || "Downloaded_Media";

  return medias.map(v => {

    const raw = (v.type || v.mime || v.extension || "").toLowerCase();

    let type = "document", ext = "bin";

    if (raw.includes("video") || raw.includes("mp4")) { type = "video"; ext = "mp4"; }

    else if (raw.includes("audio") || raw.includes("mp3")) { type = "audio"; ext = "mp3"; }

    else if (raw.includes("image") || raw.includes("jpg") || raw.includes("png")) { type = "image"; ext = raw.includes("png") ? "png" : "jpg"; }

    return {

      url: v.url || v.link,

      type, ext,

      title,

      quality: v.quality || v.resolution || "HD",

      size: v.formattedSize || v.size || null

    };

  }).filter(m => !!m.url);

}

function pickBest(medias) {

  const order = { video: 0, audio: 1, image: 2, document: 3 };

  return medias.sort((a, b) => order[a.type] - order[b.type])[0];

}

// --------- Command handler ----------

const handler = async (m, { plag, text, prefix = ".", command }) => {

  const arg = (text || "").trim().toLowerCase();

  if (arg === "on" || arg === "off") {

    const enabled = arg === "on";

    setEnabled(enabled);

    await plag.sendMessage(m.chat, { react: { text: "☑️", key: m.key } });

    return plag.sendMessage(m.chat, { text: `✅ Auto-download ${enabled ? "activé" : "désactivé"}` });

  }

  if ((text || "").trim().startsWith("http")) {

    try {

      await plag.sendMessage(m.chat, { react: { text: "⏳", key: m.key } });

      const medias = await resolveMedias((text || "").trim());

      if (!medias.length) {

        await plag.sendMessage(m.chat, { react: { text: "❌", key: m.key } });

        return plag.sendMessage(m.chat, { text: "❌ Aucun média trouvé pour ce lien." });

      }

      const best = pickBest(medias);

      const fileRes = await axios.get(best.url, { responseType: "arraybuffer" });

      const buffer = Buffer.from(fileRes.data);

      let msg;

      if (best.type === "video") msg = { video: buffer, mimetype: "video/mp4", caption: `🎬 ${best.title} (${best.quality})` };

      else if (best.type === "audio") msg = { audio: buffer, mimetype: "audio/mpeg", fileName: `${best.title}.mp3`, caption: `🎵 ${best.title}` };

      else if (best.type === "image") msg = { image: buffer, caption: `🖼️ ${best.title}` };

      else msg = { document: buffer, fileName: `${best.title}.${best.ext}`, mimetype: "application/octet-stream" };

      await plag.sendMessage(m.chat, msg, { quoted: m });

      await plag.sendMessage(m.chat, { react: { text: "☑️", key: m.key } });

    } catch (err) {

      console.error("AUTO-DL MANUAL ERROR:", err);

      await plag.sendMessage(m.chat, { react: { text: "❌", key: m.key } });

      await plag.sendMessage(m.chat, { text: "❌ Erreur lors du téléchargement." });

    }

    return;

  }

  return plag.sendMessage(m.chat, { text: `❌ Utilisation:\n${prefix}${command} on | off\n${prefix}${command} <url>` });

};

handler.command = ["auto-download"];

handler.usePrefix = true;

// --------- Hook global ----------

async function before(m, { plag }) {

  const store = readStore();

  if (!store.enabled) return;

  // robustesse: proteger contre objets incomplets

  if (!m || !m.key || !m.chat) return;

  const body = (m.text || m.body || "").trim();

  if (body.startsWith(".")) return;

  const msgKey = `${m.chat}:${m.key.id || Date.now()}`;

  if (hasSeen(msgKey)) return;

  const urls = extractUrlsFromMessage(m);

  if (!urls.length) return;

  markSeen(msgKey);

  const slice = urls.slice(0, 2);

  for (const u of slice) {

    try {

      await plag.sendMessage(m.chat, { react: { text: "⏳", key: m.key } });

      const medias = await resolveMedias(u);

      if (!medias.length) continue;

      const best = pickBest(medias);

      const fileRes = await axios.get(best.url, { responseType: "arraybuffer" });

      const buffer = Buffer.from(fileRes.data);

      let msg;

      if (best.type === "video") msg = { video: buffer, mimetype: "video/mp4", caption: `🎬 ${best.title} (${best.quality})` };

      else if (best.type === "audio") msg = { audio: buffer, mimetype: "audio/mpeg", fileName: `${best.title}.mp3`, caption: `🎵 ${best.title}` };

      else if (best.type === "image") msg = { image: buffer, caption: `🖼️ ${best.title}` };

      else msg = { document: buffer, fileName: `${best.title}.${best.ext}`, mimetype: "application/octet-stream" };

      await plag.sendMessage(m.chat, msg, { quoted: m });

      await plag.sendMessage(m.chat, { react: { text: "☑️", key: m.key } });

    } catch (err) {

      console.error("AUTO-DL BEFORE ERROR:", err);

      await plag.sendMessage(m.chat, { react: { text: "❌", key: m.key } });

    }

  }

}

module.exports = { handler, before };