const fs = require("fs");
const path = require("path");
const { toPTT, toAudio, toVideo, toMp3, toImg } = require("../lib/converter"); 

const handler = async (m, { fluxx, prefix, command }) => {
  if (!m.quoted) return m.reply("Reply audio/videonya");

  const mime = m.quoted.mimetype || "";
  const buffer = await m.quoted.download();
  const ext = mime.split("/")[1];

  try {
      let result;
   
      if (command === "toptt") {
          if (mime.startsWith("video/")) {
              result = await toPTT(buffer, ext);
              await fluxx.sendMessage(m.chat, {
                  audio: result.data,
                  mimetype: "audio/ogg; codecs=opus",
                  ptt: true
              }, {
                  quoted: m
              });
              await result.delete();
          } else if (mime.startsWith("audio/")) {
              await fluxx.sendMessage(m.chat, {
                  audio: buffer,
                  mimetype: "audio/ogg; codecs=opus",
                  ptt: true
              }, {
                  quoted: m
              });
          }
      } else if (command === "toaudio") {
          if (!mime.includes("video")) return m.reply("Reply vidnya");
          result = await toMp3(buffer, ext);

          await fluxx.sendMessage(m.chat, {
              audio: result.data,
              mimetype: "audio/mpeg",
              fileName: "converted.mp3",
              ptt: false
          }, {
              quoted: m
          });
      } else if (command === "tovid") {
          if (!/webp|image/.test(mime)) return m.reply("Reply sticker ny bung..");
          result = await toVideo(buffer, ext);

          await fluxx.sendMessage(m.chat, {
              video: result.data,
              mimetype: "video/mp4",
              caption: "Done.."
          }, {
              quoted: m
          });
      } else if (command === "toimg") {
          if (!/webp/.test(mime)) return m.reply("Reply stiker nya bung");
          result = await toImg(buffer, ext);

          await fluxx.sendMessage(m.chat, {
              image: result.data,
              mimetype: 'image/png',
              fileName: 'converted.png'
          }, {
              quoted: m
          });
      }
      
  } catch (e) {
      console.error(e);
      m.reply("FAIL. BEJAD");
  }
};

handler.command = ["toaudio", "toptt", "tovid", "toimg"];
module.exports = handler;