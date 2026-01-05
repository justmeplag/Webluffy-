const path = require("path");

const { tmpdir } = require("os");

const fs = require("fs");

const { spawn } = require("child_process");

const NodeID3 = require("node-id3");

// ⚡ Utilitaire générique FFmpeg

function ffmpeg(buffer, args = [], ext = "", ext2 = "") {

  return new Promise(async (resolve, reject) => {

    try {

      let tmp = path.join(tmpdir(), `${Date.now()}.${ext}`);

      let out = tmp + "." + ext2;

      await fs.promises.writeFile(tmp, buffer);

      const ffmpegProcess = spawn("ffmpeg", ["-y", "-i", tmp, ...args, out])

        .on("error", reject)

        .on("close", async (code) => {

          try {

            await fs.promises.unlink(tmp);

            if (code !== 0) {

              reject(new Error(`FFmpeg process exited with code ${code}`));

              return;

            }

            const processedData = await fs.promises.readFile(out);

            await fs.promises.unlink(out);

            resolve(processedData);

          } catch (e) {

            reject(e);

          }

        });

    } catch (e) {

      reject(e);

    }

  });

}

// 🎵 Conversion audio

function toAudio(buffer, ext) {

  return ffmpeg(

    buffer,

    ["-vn", "-ac", "2", "-b:a", "128k", "-ar", "44100", "-f", "mp3"],

    ext,

    "mp3"

  );

}

function toPTT(buffer, ext) {

  return ffmpeg(

    buffer,

    [

      "-vn",

      "-c:a",

      "libopus",

      "-b:a",

      "128k",

      "-vbr",

      "on",

      "-compression_level",

      "10",

    ],

    ext,

    "opus"

  );

}

function toVideo(buffer, ext) {

  return ffmpeg(

    buffer,

    [

      "-c:v",

      "libx264",

      "-c:a",

      "aac",

      "-ab",

      "128k",

      "-ar",

      "44100",

      "-crf",

      "32",

      "-preset",

      "slow",

    ],

    ext,

    "mp4"

  );

}

// 🏷️ Ajout de métadonnées ID3 avec node-id3

async function AddMp3Meta(

  songbuffer,

  coverBuffer,

  options = { title: "Bot Audio", artist: "Bot" }

) {

  if (!Buffer.isBuffer(songbuffer)) throw new Error("songbuffer doit être un Buffer");

  if (!Buffer.isBuffer(coverBuffer)) throw new Error("coverBuffer doit être un Buffer");

  const tags = {

    title: options.title,

    artist: options.artist,

    APIC: {

      mime: "image/png",

      type: { id: 3, name: "front cover" },

      description: "Cover",

      imageBuffer: coverBuffer,

    },

  };

  const taggedBuffer = NodeID3.update(tags, songbuffer);

  return taggedBuffer;

}

module.exports = {

  ffmpeg,

  toAudio,

  toPTT,

  toVideo,

  AddMp3Meta,

};