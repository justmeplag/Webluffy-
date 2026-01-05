/** # ============================ #

 • Author : Mugiwara no plag

 • Type : plugin x case

 • Java script : cjs

 # ============================ #

**/

const { spawn } = require('child_process');

const path = require('path');

const fs = require('fs');

const chalk = require('chalk');
// --- LIGNE POUR LE RUNTIME ---

// Enregistre l'heure de démarrage exacte pour la commande .runtime

global.startTime = new Date();

// -----------------------------
function run() {

  let args = [path.join(__dirname, '/lib/system/main.js'), ...process.argv.slice(2)]

  let p = spawn(process.argv[0], args, {

    stdio: ['inherit', 'inherit', 'inherit', 'ipc']

  })

  p.on('message', data => {

    if (data == 'reset') {

      console.log(chalk.green('[ Info ] : Redémarrage du Bot...'))

      console.clear()

      p.kill()

      run()

    }

  }).on('exit', code => {

    console.log(chalk.red('[ Info ] : Bot arrêté avec le code:', code))

    if (code == 0 || code == 1) run()

  })

}

run()