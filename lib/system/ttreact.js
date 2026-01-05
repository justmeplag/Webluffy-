// lib/system/ttreact.js
const { games } = require("../../plugins/tictactoe");

const emojiMap = ["1⃣","2⃣","3⃣","4⃣","5⃣","6⃣","7⃣","8⃣","9⃣"];
const winPatterns = [
  [0,1,2],[3,4,5],[6,7,8],
  [0,3,6],[1,4,7],[2,5,8],
  [0,4,8],[2,4,6]
];

function checkWin(board, symbol) {
  return winPatterns.some(p => p.every(i => board[i] === symbol));
}

function isDraw(board) {
  return board.every(c => c !== "⬛");
}

function renderBoard(game) {
  return `
🎮 *TICTACTOE – LUFFY-XMD*
${game.board[0]} ${game.board[1]} ${game.board[2]}
${game.board[3]} ${game.board[4]} ${game.board[5]}
${game.board[6]} ${game.board[7]} ${game.board[8]}

Tour actuel: ${game.turn} @${(game.turn === "❌" ? game.players.x : game.players.o).split("@")[0]}
`;
}

function victoryMessageBoldFuturiste(winnerJid) {
  const tag = `@${winnerJid.split("@")[0]}`;
  return `
🏴‍☠️ 𝗟𝗨𝗙𝗙𝗬-𝗫𝗠𝗗 𝗖𝗥𝗜𝗘 𝗩𝗜𝗖𝗧𝗢𝗜𝗥𝗘 !
🎉 ${tag} 𝗮 𝗰𝗼𝗻𝗾𝘂𝗶𝘀 𝗹𝗮 𝗺𝗲𝗿 𝗱𝘂 𝗧𝗜𝗖𝗧𝗔𝗖𝗧𝗢𝗘
⚓ 𝗟𝗲𝘀 𝗰𝗮𝘀𝗲𝘀 𝘀𝗲 𝗽𝗿𝗼𝘀𝘁𝗲𝗿𝗻𝗲𝗻𝘁 𝗱𝗲𝘃𝗮𝗻𝘁 𝘁𝗼𝗶 !
`;
}

async function ttReactHandler(m, { plag }) {
  const chatId = m.chat;
  const emoji = m.reaction;
  const user = m.sender;

  if (!games[chatId]) return;
  const game = games[chatId];

  // Join with 👍
  if (emoji === "👍") {
    if (!game.players.o) {
      game.players.o = user;
      game.started = true;

      await plag.sendMessage(chatId, {
        text: `⚡ [LUFFY-XMD] Joueur 2 ⭕ ajouté : @${user.split("@")[0]}\n\nLa partie commence !`,
        mentions: [user]
      });

      const intro = renderBoard(game);
      return plag.sendMessage(chatId, { text: intro, mentions: [game.players.x, game.players.o] });
    } else {
      return plag.sendMessage(chatId, { text: "💀 [LUFFY-XMD] Partie pleine, impossible de rejoindre." });
    }
  }

  // Moves 1⃣–9⃣
  const index = emojiMap.indexOf(emoji);
  if (index !== -1 && game.started) {
    const currentPlayer = game.turn === "❌" ? game.players.x : game.players.o;
    if (user !== currentPlayer) return;

    if (game.board[index] !== "⬛") {
      return plag.sendMessage(chatId, { text: "💀 [LUFFY-XMD] Case déjà occupée." });
    }

    game.board[index] = game.turn;

    // Check victory
    const symbol = game.turn;
    const winnerJid = symbol === "❌" ? game.players.x : game.players.o;

    if (checkWin(game.board, symbol)) {
      // React 🎉 (si ton framework supporte les réactions sortantes)
      try {
        await plag.sendMessage(chatId, { react: { text: "🎉", key: m.key } });
      } catch (e) { /* silencieux si non supporté */ }

      const msg = victoryMessageBoldFuturiste(winnerJid);
      await plag.sendMessage(chatId, { text: msg, mentions: [winnerJid] });

      delete games[chatId];
      return;
    }

    // Check draw
    if (isDraw(game.board)) {
      await plag.sendMessage(chatId, { text: "🟨 [LUFFY-XMD] Match nul. Les mers restent indomptées." });
      delete games[chatId];
      return;
    }

    // Next turn
    game.turn = game.turn === "❌" ? "⭕" : "❌";
    const boardText = renderBoard(game);
    await plag.sendMessage(chatId, { text: boardText, mentions: [game.players.x, game.players.o] });
  }
}

module.exports = { ttReactHandler };