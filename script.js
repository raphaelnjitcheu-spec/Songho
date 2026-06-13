// ==========================================
// 1. MOTEUR DE JEU (LOGIQUE ET RÈGLES OFFICIELLES)
// ==========================================
class SongoEngine {
  constructor() {
    this.resetGame();
  }

  resetGame() {
    this.board = Array(14).fill(5);
    this.scores = { p1: 0, p2: 0 };
    this.currentPlayer = 1;
    this.gameOver = false;
    this.endReason = "";
    this.alertMessage = "";
  }

  isValidMove(index) {
    if (this.gameOver) return false;
    if (this.currentPlayer === 1 && (index < 0 || index > 6)) return false;
    if (this.currentPlayer === 2 && (index < 7 || index > 13)) return false;
    if (this.board[index] === 0) return false;

    if (this.isOpponentStarved()) {
      return this.moveNourishes(index);
    }
    return true;
  }

  isOpponentStarved() {
    const oppPits =
      this.currentPlayer === 1
        ? this.board.slice(7, 14)
        : this.board.slice(0, 7);
    return oppPits.reduce((sum, val) => sum + val, 0) === 0;
  }

  moveNourishes(index) {
    let tempBoard = [...this.board];
    let seeds = tempBoard[index];
    const initialSeeds = seeds;
    let curr = index;
    let isGrenier = seeds > 13;

    tempBoard[index] = 0;
    while (seeds > 0) {
      curr = (curr - 1 + 14) % 14;
      if (curr === index) continue;
      if (
        isGrenier &&
        seeds < initialSeeds - 14 &&
        !this.isInAdverseCamp(curr, this.currentPlayer)
      )
        continue;
      tempBoard[curr]++;
      seeds--;
    }
    const oppSum =
      this.currentPlayer === 1
        ? tempBoard.slice(7, 14).reduce((a, b) => a + b, 0)
        : tempBoard.slice(0, 7).reduce((a, b) => a + b, 0);
    return oppSum > 0;
  }

  isInAdverseCamp(index, player) {
    return player === 1 ? index >= 7 && index <= 13 : index >= 0 && index <= 6;
  }

  getProtectedPit(player) {
    return player === 1 ? 7 : 0;
  }

  // Cette fonction génère les étapes théoriques du coup
  playMove(startIndex) {
    this.alertMessage = "";
    if (!this.isValidMove(startIndex)) return null;

    let seeds = this.board[startIndex];
    const initialSeeds = seeds;
    this.board[startIndex] = 0;

    let steps = [];
    let currentIndex = startIndex;
    let isGrenier = initialSeeds > 13;
    let fullTourCompleted = false;

    while (seeds > 0) {
      currentIndex = (currentIndex - 1 + 14) % 14;

      if (currentIndex === startIndex) {
        fullTourCompleted = true;
        continue;
      }
      if (
        isGrenier &&
        fullTourCompleted &&
        !this.isInAdverseCamp(currentIndex, this.currentPlayer)
      )
        continue;

      this.board[currentIndex]++;
      seeds--;
      steps.push({
        index: currentIndex,
        boardState: [...this.board],
        type: "sow",
      });
    }

    let totalCaptured = 0;
    let captureIndices = [];
    let finalIndex = currentIndex;
    let isAdverse = this.isInAdverseCamp(finalIndex, this.currentPlayer);
    let protectedPit = this.getProtectedPit(this.currentPlayer);

    if (isGrenier && finalIndex === protectedPit) {
      totalCaptured += this.board[finalIndex];
      captureIndices.push(finalIndex);
      this.board[finalIndex] = 0;
      this.alertMessage = "Grenier ! Case protégée capturée seule.";
    } else if (
      isAdverse &&
      finalIndex !== protectedPit &&
      this.board[finalIndex] >= 2 &&
      this.board[finalIndex] <= 4
    ) {
      let checkIndex = finalIndex;
      let tempBoard = [...this.board];
      let simCaptured = 0;
      let simIndices = [];

      for (let i = 0; i < 7; i++) {
        if (!this.isInAdverseCamp(checkIndex, this.currentPlayer)) break;
        if (checkIndex === protectedPit && simIndices.length === 0) break;

        let count = tempBoard[checkIndex];
        if (count >= 2 && count <= 4) {
          simCaptured += count;
          simIndices.push(checkIndex);
          tempBoard[checkIndex] = 0;
        } else {
          break;
        }
        checkIndex = (checkIndex + 1) % 14;
      }

      const oppRemaining =
        this.currentPlayer === 1
          ? tempBoard.slice(7, 14).reduce((a, b) => a + b, 0)
          : tempBoard.slice(0, 7).reduce((a, b) => a + b, 0);
      if (oppRemaining === 0) {
        this.alertMessage =
          "Prise annulée : Interdiction d'affamer l'adversaire !";
      } else {
        totalCaptured = simCaptured;
        captureIndices = simIndices;
        captureIndices.forEach((idx) => (this.board[idx] = 0));
      }
    }

    if (totalCaptured > 0) {
      captureIndices.forEach((idx) =>
        steps.push({
          index: idx,
          boardState: [...this.board],
          type: "capture",
        }),
      );
      if (this.currentPlayer === 1) this.scores.p1 += totalCaptured;
      else this.scores.p2 += totalCaptured;
    }

    this.checkEndGameConditions();

    if (!this.gameOver) {
      this.currentPlayer = this.currentPlayer === 1 ? 2 : 1;
    }
    return steps;
  }

  checkEndGameConditions() {
    if (this.scores.p1 >= 40) {
      this.gameOver = true;
      this.endReason = "Joueur 1 (Sud) gagne !";
      return;
    }
    if (this.scores.p2 >= 40) {
      this.gameOver = true;
      this.endReason = "Joueur 2 (Nord) gagne !";
      return;
    }
    if (this.board.reduce((a, b) => a + b, 0) < 10) {
      this.gameOver = true;
      this.endWithRamassage("Moins de 10 graines.");
      return;
    }

    if (this.isOpponentStarved()) {
      let canNourish = false;
      let start = this.currentPlayer === 1 ? 0 : 7,
        end = this.currentPlayer === 1 ? 6 : 13;
      for (let i = start; i <= end; i++) {
        if (this.board[i] > 0 && this.moveNourishes(i)) {
          canNourish = true;
          break;
        }
      }
      if (!canNourish) {
        this.gameOver = true;
        this.endWithRamassage("Impossible de nourrir l'adversaire.");
        return;
      }
    }
  }

  endWithRamassage(reason) {
    this.scores.p1 += this.board.slice(0, 7).reduce((a, b) => a + b, 0);
    this.scores.p2 += this.board.slice(7, 14).reduce((a, b) => a + b, 0);
    this.board = Array(14).fill(0);
    let win =
      this.scores.p1 > this.scores.p2 ? "Joueur 1 Gagne" : "Joueur 2 Gagne";
    if (this.scores.p1 === this.scores.p2) win = "Égalité";
    this.endReason = `${reason} (Ramassage final) - ${win}`;
  }
}

// ==========================================
// 2. CONTRÔLEUR D'INTERFACE ET RÉSEAU
// ==========================================
const game = new SongoEngine();
let isOnlineMode = false;
let myRole = 1;
let currentRoomCode = "";
let isAnimating = false;

// FONCTION DE PAUSE CRUCIALE (Création du Sleep personnalisé)
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const mainMenu = document.getElementById("main-menu");
const gameInterface = document.getElementById("game-interface");
const pits = document.querySelectorAll(".pit");
const statusBar = document.getElementById("status-bar");
const alertBar = document.getElementById("game-alert");
const roomDisplay = document.getElementById("room-display");
const scoreP1 = document.getElementById("score-p1");
const scoreP2 = document.getElementById("score-p2");

const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playSound(type) {
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  if (type === "sow") {
    osc.type = "triangle";
    osc.frequency.setValueAtTime(300, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(60, audioCtx.currentTime + 0.08);
    gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.08);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.08);
  } else {
    osc.type = "sine";
    osc.frequency.setValueAtTime(550, audioCtx.currentTime);
    gain.gain.setValueAtTime(0.25, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.25);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.25);
  }
}

// MISE À JOUR VISUELLE DES GRAINES DANS UNE CASE PRÉCISE
function updatePitGraphics(pitIndex, targetCount) {
  const pitElement = document.querySelector(`[data-index="${pitIndex}"]`);
  if (!pitElement) return;

  pitElement.querySelector(".pit-count").textContent = targetCount;

  const grainDivs = pitElement.querySelectorAll(".graine");
  if (grainDivs.length !== targetCount) {
    grainDivs.forEach((g) => g.remove());
    for (let i = 0; i < Math.min(targetCount, 15); i++) {
      let g = document.createElement("div");
      g.classList.add("graine");
      g.style.transform = `translate(${Math.random() * 6 - 3}px, ${Math.random() * 6 - 3}px)`;
      pitElement.appendChild(g);
    }
  }
}

// RECEPTION DU TOUR DE L'ADVERSAIRE : EXECUTION AU RALENTI AVEC SLEEP / AWAIT
async function fetchGameState() {
  if (!isOnlineMode || !currentRoomCode || isAnimating) return;
  try {
    const response = await fetch(
      `server.php?room=${currentRoomCode}&t=${Date.now()}`,
    );
    const serverData = await response.json();
    if (serverData.status === "error") return;

    const serverCurrentPlayer = parseInt(serverData.currentPlayer);
    const boardChanged =
      JSON.stringify(game.board) !== JSON.stringify(serverData.board);

    if (boardChanged) {
      let opponentStartIndex = -1;
      let oppStart = serverCurrentPlayer === 1 ? 7 : 0;
      let oppEnd = serverCurrentPlayer === 1 ? 13 : 6;

      for (let i = oppStart; i <= oppEnd; i++) {
        if (game.board[i] > 0 && serverData.board[i] === 0) {
          opponentStartIndex = i;
          break;
        }
      }

      if (opponentStartIndex !== -1) {
        isAnimating = true;
        pits.forEach((p) => p.classList.add("disabled"));

        // Vider visuellement la case de départ cliquée par l'adversaire
        updatePitGraphics(opponentStartIndex, 0);

        let tempEngine = new SongoEngine();
        tempEngine.board = [...game.board];
        tempEngine.scores = { ...game.scores };
        tempEngine.currentPlayer = serverCurrentPlayer === 1 ? 2 : 1;

        const steps = tempEngine.playMove(opponentStartIndex);
        if (steps) {
          for (let step of steps) {
            const currentPit = document.querySelector(
              `[data-index="${step.index}"]`,
            );
            if (step.type === "sow") {
              currentPit.classList.add("sowing");
              playSound("sow");
            } else {
              currentPit.classList.add("captured-anim");
              playSound("capture");
            }

            // Rafraîchir uniquement les cases modifiées à cette étape précise
            updatePitGraphics(step.index, step.boardState[step.index]);

            // SUSPENDRE l'exécution pendant 400ms pour voir le déplacement !
            await sleep(400);
            currentPit.classList.remove("sowing", "captured-anim");
          }
        }
        isAnimating = false;
      }
    }

    game.board = serverData.board;
    game.scores = serverData.scores;
    game.currentPlayer = serverCurrentPlayer;
    game.gameOver = serverData.gameOver;
    game.endReason = serverData.endReason;
    game.alertMessage = serverData.alertMessage;

    updateUI();
  } catch (e) {
    console.error(e);
  }
}

async function sendNewStateToServer() {
  if (!isOnlineMode || !currentRoomCode) return;
  await fetch("server.php", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "update",
      room: currentRoomCode,
      state: {
        board: game.board,
        scores: game.scores,
        currentPlayer: parseInt(game.currentPlayer),
        gameOver: game.gameOver,
        endReason: game.endReason,
        alertMessage: game.alertMessage,
        playersConnected: { p1: true, p2: true },
      },
    }),
  });
}

function updateUI() {
  const localCurrentPlayer = parseInt(game.currentPlayer);
  const isMyTurn = isOnlineMode
    ? localCurrentPlayer === parseInt(myRole)
    : true;

  pits.forEach((pit) => {
    const idx = parseInt(pit.dataset.index);
    updatePitGraphics(idx, game.board[idx]);

    let isMyCamp =
      (parseInt(myRole) === 1 && idx >= 0 && idx <= 6) ||
      (parseInt(myRole) === 2 && idx >= 7 && idx <= 13);
    if (!isOnlineMode)
      isMyCamp =
        (localCurrentPlayer === 1 && idx >= 0 && idx <= 6) ||
        (localCurrentPlayer === 2 && idx >= 7 && idx <= 13);

    if (!isAnimating && isMyTurn && isMyCamp && game.isValidMove(idx)) {
      pit.classList.remove("disabled");
    } else {
      pit.classList.add("disabled");
    }
  });

  if (game.alertMessage) {
    alertBar.textContent = game.alertMessage;
    alertBar.classList.remove("alert-hidden");
  } else {
    alertBar.classList.add("alert-hidden");
  }

  if (game.gameOver) {
    statusBar.textContent = game.endReason;
    statusBar.className = "";
  } else {
    let msg = `Tour : Joueur ${localCurrentPlayer === 1 ? "1 (Sud)" : "2 (Nord)"}`;
    if (isOnlineMode) {
      msg = isMyTurn ? `À vous de jouer !` : `Attente de l'adversaire...`;
    }
    statusBar.textContent = msg;
    statusBar.className = localCurrentPlayer === 1 ? "active-p1" : "active-p2";
  }

  scoreP1.textContent = game.scores.p1;
  scoreP2.textContent = game.scores.p2;
}

// ACTION AU CLIC : EXECUTION AU RALENTI AVEC AWAIT ET SLEEP
async function handlePitClick(e) {
  if (isAnimating) return;
  const idx = parseInt(e.currentTarget.dataset.index);

  if (isOnlineMode && parseInt(game.currentPlayer) !== parseInt(myRole)) return;

  isAnimating = true;
  pits.forEach((p) => p.classList.add("disabled"));

  // On vide visuellement la case de départ immédiatement
  updatePitGraphics(idx, 0);

  const steps = game.playMove(idx);
  if (!steps) {
    isAnimating = false;
    updateUI();
    return;
  }

  // Boucle asynchrone progressive (Remplace l'exécution instantanée)
  for (let step of steps) {
    const currentPit = document.querySelector(`[data-index="${step.index}"]`);
    if (step.type === "sow") {
      currentPit.classList.add("sowing");
      playSound("sow");
    } else {
      currentPit.classList.add("captured-anim");
      playSound("capture");
    }

    // On met à jour l'état visuel de la case ciblée à cette étape précise
    updatePitGraphics(step.index, step.boardState[step.index]);

    // METTRE LE CODE EN PAUSE (Ralenti de 400ms par graine distribuée)
    await sleep(350);

    currentPit.classList.remove("sowing", "captured-anim");
  }

  // On notifie le serveur seulement après la fin visuelle de l'action
  if (isOnlineMode) {
    await sendNewStateToServer();
  }

  isAnimating = false;
  updateUI();
}

// GESTION DES BOUTONS DE MENU
document.getElementById("btn-mode-local").addEventListener("click", () => {
  isOnlineMode = false;
  myRole = 1;
  roomDisplay.textContent = "Mode Local Activé";
  mainMenu.classList.add("hidden");
  gameInterface.classList.remove("hidden");
  updateUI();
});

document
  .getElementById("btn-create-distant")
  .addEventListener("click", async () => {
    isOnlineMode = true;
    try {
      const response = await fetch("server.php?action=create");
      const data = await response.json();
      currentRoomCode = data.roomCode;
      myRole = parseInt(game.currentPlayer);

      roomDisplay.textContent = `CODE : ${currentRoomCode} (Joueur 1)`;
      mainMenu.classList.add("hidden");
      gameInterface.classList.remove("hidden");
      updateUI();
      setInterval(fetchGameState, 400);
    } catch (e) {
      alert("Erreur réseau.");
    }
  });

document
  .getElementById("btn-join-distant")
  .addEventListener("click", async () => {
    const codeInput = document
      .getElementById("input-room-code")
      .value.trim()
      .toUpperCase();
    if (codeInput.length !== 5) {
      alert("Code invalide.");
      return;
    }

    isOnlineMode = true;
    try {
      const response = await fetch(`server.php?action=join&room=${codeInput}`);
      const data = await response.json();
      if (data.status === "error") {
        alert(data.message);
        return;
      }

      currentRoomCode = codeInput;
      myRole = parseInt(data.role);

      roomDisplay.textContent = `CODE : ${currentRoomCode} (Joueur ${myRole})`;
      mainMenu.classList.add("hidden");
      gameInterface.classList.remove("hidden");

      game.board = data.state.board;
      game.scores = data.state.scores;
      game.currentPlayer = parseInt(data.state.currentPlayer);

      updateUI();
      setInterval(fetchGameState, 400);
    } catch (e) {
      alert("Impossible de rejoindre.");
    }
  });

pits.forEach((p) => p.addEventListener("click", handlePitClick));

document.getElementById("btn-reset").addEventListener("click", async () => {
  if (isOnlineMode && currentRoomCode) {
    await fetch("server.php", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "reset", room: currentRoomCode }),
    });
  }
  window.location.reload();
});
