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

    // Le changement de tour se fait ICI immédiatement dans l'objet
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
// 2. CONTRÔLEUR D'INTERFACE ET RÉSEAU PAR SALON
// ==========================================
const game = new SongoEngine();
let isOnlineMode = false;
let myRole = 1;
let currentRoomCode = "";
let isAnimating = false; // Verrou local global pendant les animations

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

// ÉCOUTE DU SERVEUR
async function fetchGameState() {
  if (!isOnlineMode || !currentRoomCode || isAnimating) return; // Ne pas écraser pendant qu'on anime un coup local
  try {
    const response = await fetch(`server.php?room=${currentRoomCode}`);
    const serverData = await response.json();
    if (serverData.status === "error") return;

    const serverCurrentPlayer = parseInt(serverData.currentPlayer);
    const localCurrentPlayer = parseInt(game.currentPlayer);

    const boardChanged =
      JSON.stringify(game.board) !== JSON.stringify(serverData.board);
    const scoreChanged =
      game.scores.p1 !== serverData.scores.p1 ||
      game.scores.p2 !== serverData.scores.p2;
    const turnChanged = localCurrentPlayer !== serverCurrentPlayer;

    if (turnChanged || boardChanged || scoreChanged || serverData.gameOver) {
      game.board = serverData.board;
      game.scores = serverData.scores;
      game.currentPlayer = serverCurrentPlayer;
      game.gameOver = serverData.gameOver;
      game.endReason = serverData.endReason;
      game.alertMessage = serverData.alertMessage;

      updateUI();
    }
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
  const localCurrentPlayer = mountaineerTurn();
  const isMyTurn = isOnlineMode
    ? localCurrentPlayer === parseInt(myRole)
    : true;

  pits.forEach((pit) => {
    const idx = parseInt(pit.dataset.index);
    const count = game.board[idx];
    pit.querySelector(".pit-count").textContent = count;

    const grainDivs = pit.querySelectorAll(".graine");
    if (grainDivs.length !== count) {
      grainDivs.forEach((g) => g.remove());
      for (let i = 0; i < Math.min(count, 15); i++) {
        let g = document.createElement("div");
        g.classList.add("graine");
        g.style.transform = `translate(${Math.random() * 6 - 3}px, ${Math.random() * 6 - 3}px)`;
        pit.appendChild(g);
      }
    }

    let isMyCamp =
      (parseInt(myRole) === 1 && idx >= 0 && idx <= 6) ||
      (parseInt(myRole) === 2 && idx >= 7 && idx <= 13);
    if (!isOnlineMode)
      isMyCamp =
        (localCurrentPlayer === 1 && idx >= 0 && idx <= 6) ||
        (localCurrentPlayer === 2 && idx >= 7 && idx <= 13);

    // Si une animation est en cours ou ce n'est pas mon tour, on désactive TOUT
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
      msg = isMyTurn
        ? `À vous de jouer ! (${msg})`
        : `Attente de l'adversaire... (${msg})`;
    }
    statusBar.textContent = msg;
    statusBar.className = localCurrentPlayer === 1 ? "active-p1" : "active-p2";
  }

  scoreP1.textContent = game.scores.p1;
  scoreP2.textContent = game.scores.p2;
}

function mountaineerTurn() {
  return parseInt(game.currentPlayer);
}

async function handlePitClick(e) {
  if (isAnimating) return;
  const idx = parseInt(e.currentTarget.dataset.index);

  if (isOnlineMode && mountaineerTurn() !== parseInt(myRole)) return;

  isAnimating = true;
  // Désactivation visuelle totale immédiate
  pits.forEach((p) => p.classList.add("disabled"));

  const steps = game.playMove(idx);
  if (!steps) {
    isAnimating = false;
    updateUI();
    return;
  }

  // CRITIQUE : On synchronise le changement de tour vers le serveur AVANT de lancer l'animation visuelle locale.
  // De cette façon, le joueur adverse voit son écran se débloquer instantanément sans attendre la fin des transitions du joueur 1.
  if (isOnlineMode) {
    await sendNewStateToServer();
  }

  // Lancement des animations visuelles chez le joueur actif
  for (let step of steps) {
    const currentPit = document.querySelector(`[data-index="${step.index}"]`);
    if (step.type === "sow") {
      currentPit.classList.add("sowing");
      playSound("sow");
    } else {
      currentPit.classList.add("captured-anim");
      playSound("capture");
    }

    // On applique l'état de l'étape visuellement
    document.querySelectorAll(".pit").forEach((p) => {
      const id = parseInt(p.dataset.index);
      p.querySelector(".pit-count").textContent = step.boardState[id];
    });

    await new Promise((r) => setTimeout(r, 220));
    currentPit.classList.remove("sowing", "captured-anim");
  }

  isAnimating = false;
  updateUI();
}

// ÉVÉNEMENTS DES BOUTONS DE MENU
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
      myRole = mountaineerTurn();

      roomDisplay.textContent = `CODE DU SALON : ${currentRoomCode} (Vous êtes Joueur 1)`;
      mainMenu.classList.add("hidden");
      gameInterface.classList.remove("hidden");
      updateUI();
      setInterval(fetchGameState, 400); // Cadence d'écoute accrue à 400ms pour éliminer toute latence
    } catch (e) {
      alert("Erreur réseau lors de la création.");
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
      alert("Le code doit comporter 5 caractères.");
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

      roomDisplay.textContent = `CODE DU SALON : ${currentRoomCode} (Vous êtes Joueur ${myRole === 0 ? "Spectateur" : myRole})`;
      mainMenu.classList.add("hidden");
      gameInterface.classList.remove("hidden");

      game.board = data.state.board;
      game.scores = data.state.scores;
      game.currentPlayer = parseInt(data.state.currentPlayer);

      updateUI();
      setInterval(fetchGameState, 400);
    } catch (e) {
      alert("Impossible de rejoindre le salon.");
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
