const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

async function ensureDir(dir) {
  await fs.promises.mkdir(dir, { recursive: true });
}

function ffmpeg(buffer, args = [], ext = '', ext2 = '') {
  return new Promise(async (resolve, reject) => {
    try {
      const audioDir = path.join(__dirname, '../tmp/audio');
      await ensureDir(audioDir);

      const tmp = path.join(audioDir, Date.now() + '.' + ext);
      const out = tmp + '.' + ext2;

      await fs.promises.writeFile(tmp, buffer);

      const proc = spawn('ffmpeg', ['-y', '-i', tmp, ...args, out]);

      proc.on('error', reject);

      proc.on('close', async (code) => {
        try {
          await fs.promises.unlink(tmp); // supprime l’input
          if (code !== 0) return reject(new Error(`ffmpeg exited with code ${code}`));

          // ✅ lire le fichier converti avant suppression
          if (!fs.existsSync(out)) {
            return reject(new Error(`ffmpeg n'a pas généré le fichier de sortie (${out})`));
          }

          const result = await fs.promises.readFile(out);
          await fs.promises.unlink(out); // supprime l’output après lecture

          if (!result || result.length === 0) {
            return reject(new Error(`Le fichier converti est vide (${out})`));
          }

          resolve(result);
        } catch (e) {
          reject(e);
        }
      });
    } catch (e) {
      reject(e);
    }
  });
}

function toAudio(buffer, ext) {
  return ffmpeg(buffer, [
    '-vn',
    '-ac', '2',
    '-b:a', '128k',
    '-ar', '44100',
    '-f', 'mp3'
  ], ext, 'mp3');
}

function toPTT(buffer, ext) {
  return ffmpeg(buffer, [
    '-vn',
    '-c:a', 'libopus',
    '-b:a', '128k',
    '-vbr', 'on',
    '-compression_level', '10'
  ], ext, 'ogg'); // ✅ sortie en ogg pour WhatsApp vocal
}

function toVideo(buffer, ext) {
  return ffmpeg(buffer, [
    '-c:v', 'libx264',
    '-c:a', 'aac',
    '-ab', '128k',
    '-ar', '44100',
    '-crf', '32',
    '-preset', 'slow'
  ], ext, 'mp4');
}

module.exports = {
  toAudio,
  toPTT,
  toVideo,
  ffmpeg,
};