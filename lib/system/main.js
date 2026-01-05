/** 
 # ============================ #
 • Author : anggara z
 • Type : plugin n case
 • Java script : cjs
 # ============================ #
**/

const fs = require('fs');
const {
    useMultiFileAuthState
} = require('@rexxhayanasi/elaina-baileys');
const path = require('path');
const {
    spawn
} = require('child_process');
const chalk = require('chalk')
const lolcatjs = require('lolcatjs');
const sesidump = './lib/system/session';

const init = async () => {
    const {
        state
    } = await useMultiFileAuthState('./lib/system/session');

    if (!state.creds.registered) {
        if (fs.existsSync(sesidump)) {
            fs.rmSync(sesidump, {
                recursive: true,
                force: true
            });
        }
        lolcatjs.fromString('[ Info ] Session Tak terdeteksi, membuat session...');
        const sessionMaker = spawn('node', ['./lib/session-maker.js'], {
            stdio: 'inherit',
            shell: true
        });


const ppFile = path.join(__dirname, "pp.json");
global.ppList = [];

if (fs.existsSync(ppFile)) {
  try {
    global.ppList = JSON.parse(fs.readFileSync(ppFile));
    console.log("✅ [LUFFY-XMD] Liste PP restaurée depuis pp.json");
  } catch (e) {
    console.error("💀 [LUFFY-XMD] Erreur de lecture pp.json :", e);
  }
}
        sessionMaker.on('exit', (code) => {
            if (code === 0) {
                console.clear()
                console.log('[ Info ] Session berhasil dibuat. Tunggu merestart...');
                setTimeout(() => {
                    process.send('reset')
                }, 3000)
            } else {
                console.log(chalk.red('[ Error ] Gagal menautkan...'));
            }
        });
    } else {
        lolcatjs.fromString('[ Info ] Session Terdeteksi, memulai index.js...');
        spawn('node', ['./lib/system/index.js'], {
            stdio: 'inherit',
            shell: true
        });
    }
}

init()