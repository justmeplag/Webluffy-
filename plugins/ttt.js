// /plugins/tictactoe.js

global.tttGames = global.tttGames || {};

// Mapping des emojis vers numéros 1–9
const emojiMap = {
  "1⃣": 1, "2⃣": 2, "3⃣": 3,
  "4⃣": 4, "5⃣": 5, "6⃣": 6,
  "7⃣": 7, "8⃣": 8, "9⃣": 9
};

function renderBoard(board) {
  const s = board.map(c => c ? c : "⬜");
  return "```\n" +
    `${s[0]} | ${s[1]} | ${s[2]}\n` +
    "---------\n" +
    `${s[3]} | ${s[4]} | ${s[5]}\n` +
    "---------\n" +
    `${s[6]} | ${s[7]} | ${s[8]}\n` +
    "```";
}

function checkWinner(board) {
  const wins = [
    [0,1,2],[3,4,5],[6,7,8],
    [0,3,6],[1,4,7],[2,5,8],
    [0,4,8],[2,4,6]
  ];
  for (let [a,b,c] of wins) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) return board[a];
  }
  if (board.every(c => c)) return "draw";
  return null;
}

async function sendBoard(plag, chatId, game, quoted) {
  const msg = await plag.sendMessage(
    chatId,
    { text: `${renderBoard(game.board)}\n\nTour de @${game.turn.split("@")[0]}`, mentions: [game.turn] },
    { quoted }
  );
  // Stocker la clé du dernier board pour filtrer les réactions
  game.lastBoardKey = msg.key;
}

async function playMove(chatId, m, pos, plag) {
  const game = global.tttGames[chatId];
  if (!game) return;

  // Vérifier tour
  if (m.sender !== game.turn) {
    return plag.sendMessage(chatId, { text: `❌ Ce n'est pas ton tour @${m.sender.split("@")[0]}`, mentions: [m.sender] }, { quoted: m });
  }

  // Vérifier case libre
  if (game.board[pos]) {
    return plag.sendMessage(chatId, { text: "❌ Case déjà occupée." }, { quoted: m });
  }

  // Poser pion
  game.board[pos] = game.symbols[m.sender];
  const result = checkWinner(game.board);

  if (result) {
    if (result === "draw") {
      await plag.sendMessage(chatId, { text: `🤝 Match nul !\n${renderBoard(game.board)}` }, { quoted: m });
    } else {
      await plag.sendMessage(chatId, { text: `🎉 Victoire de @${m.sender.split("@")[0]} !\n${renderBoard(game.board)}`, mentions: [m.sender] }, { quoted: m });
      await plag.sendMessage(chatId, { react: { text: "🎉", key: m.key } });
    }
    delete global.tttGames[chatId];
    return;
  }

  // Tour suivant + nouveau board
  game.turn = game.players.find(p => p !== game.turn);
  await sendBoard(plag, chatId, game, m);
}

const handler = async (m, { plag, command }) => {
  const chatId = m.chat;
  const games = global.tttGames;

  if (command === "tttstart") {
    if (games[chatId]) return plag.sendMessage(chatId, { text: "❌ Partie déjà en cours." }, { quoted: m });
    games[chatId] = { board: Array(9).fill(null), players: [m.sender], symbols: {}, turn: null, lastBoardKey: null };
    return plag.sendMessage(chatId, { text: "🎮 Partie TicTacToe créée ! Attente d'un joueur avec .tttjoin" }, { quoted: m });
  }

  if (command === "tttjoin") {
    const game = games[chatId];
    if (!game) return plag.sendMessage(chatId, { text: "❌ Aucune partie en cours." }, { quoted: m });
    if (game.players.length >= 2) return plag.sendMessage(chatId, { text: "❌ Partie complète." }, { quoted: m });
    if (game.players.includes(m.sender)) return plag.sendMessage(chatId, { text: "❌ Tu es déjà dans la partie." }, { quoted: m });

    game.players.push(m.sender);
    game.symbols[game.players[0]] = "❌";
    game.symbols[game.players[1]] = "⭕";
    game.turn = game.players[0];

    await plag.sendMessage(chatId, {
      text: `✅ Partie prête !
@${game.players[0].split("@")[0]} = ❌
@${game.players[1].split("@")[0]} = ⭕
\nRéagissez avec 1⃣–9⃣ pour jouer.`,
      mentions: game.players
    }, { quoted: m });

    // ✅ Afficher immédiatement la grille et stocker la clé
    await sendBoard(plag, chatId, game, m);
    return;
  }

  if (command === "delttt") {
    if (!games[chatId]) return plag.sendMessage(chatId, { text: "❌ Aucune partie à supprimer." }, { quoted: m });
    delete games[chatId];
    return plag.sendMessage(chatId, { text: "🗑️ Partie TicTacToe supprimée." }, { quoted: m });
  }

  // Fallback coups sans préfixe (1–9) si réactions non capturées
  const text = (m.text || "").trim();
  if (/^[1-9]$/.test(text)) {
    const game = games[chatId];
    if (!game) return;
    const pos = parseInt(text, 10) - 1;
    return playMove(chatId, m, pos, plag);
  }
};

// Interception des réactions (appelé par plag.ev.on('messages.reaction', …))
handler.reaction = async (m, { plag }) => {
  const chatId = m.chat;
  const emoji = m.reaction?.text;
  const key = m.reaction?.key || {}; // sécurisation
  const game = global.tttGames[chatId];

  if (!game) return;
  if (!emojiMap.hasOwnProperty(emoji)) return;

  // ✅ Ne prendre en compte que les réactions sur le dernier board envoyé
  const isOnLastBoard =
    game.lastBoardKey &&
    key.id && game.lastBoardKey.id &&
    key.remoteJid && game.lastBoardKey.remoteJid &&
    key.id === game.lastBoardKey.id &&
    key.remoteJid === game.lastBoardKey.remoteJid;

  if (!isOnLastBoard) return; // réaction hors contexte → ignorée

  const pos = emojiMap[emoji] - 1;
  await playMove(chatId, m, pos, plag);
};

handler.help = ["tttstart", "tttjoin", "delttt"];
handler.tags = ["game"];
handler.command = ["tttstart", "tttjoin", "delttt"];

module.exports = handler;