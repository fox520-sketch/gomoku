import { firebaseConfig } from "./firebase-config.js";

let initializeApp;
let getAuth;
let signInAnonymously;
let getFirestore;
let doc;
let getDoc;
let setDoc;
let updateDoc;
let onSnapshot;
let runTransaction;
let serverTimestamp;

const BOARD_SIZE = 15;
const BLACK = 1;
const WHITE = 2;
const EMPTY = 0;
const CANVAS_SIZE = 720;
const STORAGE_PREFIX = "gomoku-ocean";

const els = {
  html: document.documentElement,
  canvas: document.getElementById("boardCanvas"),
  statusText: document.getElementById("statusText"),
  turnText: document.getElementById("turnText"),
  turnOrb: document.getElementById("turnOrb"),
  overlay: document.getElementById("boardOverlay"),
  overlayTitle: document.getElementById("overlayTitle"),
  overlayMessage: document.getElementById("overlayMessage"),
  blackTimer: document.getElementById("blackTimer"),
  whiteTimer: document.getElementById("whiteTimer"),
  modeSelect: document.getElementById("modeSelect"),
  aiDifficultyWrap: document.getElementById("aiDifficultyWrap"),
  difficultyRange: document.getElementById("difficultyRange"),
  difficultyValue: document.getElementById("difficultyValue"),
  themeSelect: document.getElementById("themeSelect"),
  timerSelect: document.getElementById("timerSelect"),
  soundToggle: document.getElementById("soundToggle"),
  soundSelect: document.getElementById("soundSelect"),
  confirmMoveToggle: document.getElementById("confirmMoveToggle"),
  onlinePanel: document.getElementById("onlinePanel"),
  nicknameInput: document.getElementById("nicknameInput"),
  roomCodeInput: document.getElementById("roomCodeInput"),
  createRoomBtn: document.getElementById("createRoomBtn"),
  joinRoomBtn: document.getElementById("joinRoomBtn"),
  copyRoomBtn: document.getElementById("copyRoomBtn"),
  inviteLinkWrap: document.getElementById("inviteLinkWrap"),
  inviteLinkInput: document.getElementById("inviteLinkInput"),
  roomInfo: document.getElementById("roomInfo"),
  playerInfo: document.getElementById("playerInfo"),
  connectionInfo: document.getElementById("connectionInfo"),
  undoRequestCard: document.getElementById("undoRequestCard"),
  undoRequestText: document.getElementById("undoRequestText"),
  acceptUndoBtn: document.getElementById("acceptUndoBtn"),
  rejectUndoBtn: document.getElementById("rejectUndoBtn"),
  qrCard: document.getElementById("qrCard"),
  qrImage: document.getElementById("qrImage"),
  installBtn: document.getElementById("installBtn"),
  newGameBtn: document.getElementById("newGameBtn"),
  undoBtn: document.getElementById("undoBtn"),
  confirmMoveBtn: document.getElementById("confirmMoveBtn"),
  cancelPreviewBtn: document.getElementById("cancelPreviewBtn")
};

const ctx = els.canvas.getContext("2d");

let state = {
  board: createBoard(),
  currentPlayer: BLACK,
  history: [],
  lastMove: null,
  mode: "ai",
  gameOver: false,
  winner: EMPTY,
  winLine: null,
  winAnimationFrame: null,
  winAnimationStart: 0,
  aiDifficulty: 10,
  timerLimit: 0,
  remaining: { [BLACK]: 0, [WHITE]: 0 },
  soundEnabled: true,
  soundType: "bubble",
  confirmMove: false,
  pendingMove: null,
  undoRequest: null,
  aiThinking: false
};

let online = {
  app: null,
  auth: null,
  db: null,
  uid: null,
  roomRef: null,
  unsubscribe: null,
  roomCode: "",
  localColor: null,
  players: null,
  ready: false,
  busy: false,
  heartbeatHandle: null,
  presenceVisibilityHandler: null
};

let timerHandle = null;
let audioContext = null;
let deferredInstallPrompt = null;

init();

function init() {
  hydratePreferences();
  bindEvents();
  setupPwa();
  const invitedRoomCode = applyInviteFromUrl();
  resizeCanvasForDisplay();
  startNewGame({ silent: true });
  if (invitedRoomCode) {
    updateStatus(`已載入邀請房間 ${invitedRoomCode}，輸入暱稱後按「加入房間」。`);
  }
  window.addEventListener("resize", () => {
    resizeCanvasForDisplay();
    drawBoard();
  });
}

function hydratePreferences() {
  const theme = localStorage.getItem(`${STORAGE_PREFIX}:theme`) || "ocean";
  const mode = localStorage.getItem(`${STORAGE_PREFIX}:mode`) || "ai";
  const difficulty = Number(localStorage.getItem(`${STORAGE_PREFIX}:difficulty`) || 10);
  const timer = Number(localStorage.getItem(`${STORAGE_PREFIX}:timer`) || 0);
  const soundEnabled = localStorage.getItem(`${STORAGE_PREFIX}:soundEnabled`) !== "false";
  const soundType = localStorage.getItem(`${STORAGE_PREFIX}:soundType`) || "bubble";
  const savedConfirmMove = localStorage.getItem(`${STORAGE_PREFIX}:confirmMove`);
  const defaultConfirmMove = window.matchMedia?.("(pointer: coarse)")?.matches || false;
  const confirmMove = savedConfirmMove === null ? defaultConfirmMove : savedConfirmMove === "true";
  const nickname = localStorage.getItem(`${STORAGE_PREFIX}:nickname`) || "";

  state.mode = mode;
  state.aiDifficulty = clamp(difficulty, 1, 20);
  state.timerLimit = timer;
  state.soundEnabled = soundEnabled;
  state.soundType = soundType;
  state.confirmMove = confirmMove;

  els.html.dataset.theme = theme;
  els.themeSelect.value = theme;
  els.modeSelect.value = mode;
  els.difficultyRange.value = String(state.aiDifficulty);
  els.difficultyValue.textContent = String(state.aiDifficulty);
  els.timerSelect.value = String(timer);
  els.soundToggle.checked = soundEnabled;
  els.soundSelect.value = soundType;
  if (els.confirmMoveToggle) els.confirmMoveToggle.checked = confirmMove;
  els.nicknameInput.value = nickname;
  togglePanels();
}

function bindEvents() {
  els.canvas.addEventListener("pointerdown", handleBoardPointer, { passive: false });

  els.newGameBtn.addEventListener("click", () => {
    if (state.mode === "online" && online.roomRef) {
      resetOnlineRoom();
    } else {
      startNewGame();
    }
  });

  els.undoBtn.addEventListener("click", () => {
    if (state.mode === "online") requestOnlineUndo();
    else undoLocalMove();
  });

  if (els.confirmMoveBtn) {
    els.confirmMoveBtn.addEventListener("click", commitPendingMove);
  }

  if (els.cancelPreviewBtn) {
    els.cancelPreviewBtn.addEventListener("click", () => clearPendingMove(true));
  }

  els.modeSelect.addEventListener("change", () => {
    state.mode = els.modeSelect.value;
    localStorage.setItem(`${STORAGE_PREFIX}:mode`, state.mode);
    togglePanels();
    clearPendingMove(true);
    if (state.mode !== "online") {
      stopPresenceHeartbeat();
      clearInviteFromUrl();
    }
    startNewGame();
  });

  els.themeSelect.addEventListener("change", () => {
    els.html.dataset.theme = els.themeSelect.value;
    localStorage.setItem(`${STORAGE_PREFIX}:theme`, els.themeSelect.value);
    drawBoard();
  });

  els.difficultyRange.addEventListener("input", () => {
    state.aiDifficulty = Number(els.difficultyRange.value);
    els.difficultyValue.textContent = String(state.aiDifficulty);
    localStorage.setItem(`${STORAGE_PREFIX}:difficulty`, String(state.aiDifficulty));
  });

  els.timerSelect.addEventListener("change", () => {
    state.timerLimit = Number(els.timerSelect.value);
    localStorage.setItem(`${STORAGE_PREFIX}:timer`, String(state.timerLimit));
    resetTimers();
    startTurnTimer();
  });

  els.soundToggle.addEventListener("change", () => {
    state.soundEnabled = els.soundToggle.checked;
    localStorage.setItem(`${STORAGE_PREFIX}:soundEnabled`, String(state.soundEnabled));
    if (state.soundEnabled) playSound("ui");
  });

  els.soundSelect.addEventListener("change", () => {
    state.soundType = els.soundSelect.value;
    localStorage.setItem(`${STORAGE_PREFIX}:soundType`, state.soundType);
    playSound("ui");
  });

  if (els.confirmMoveToggle) {
    els.confirmMoveToggle.addEventListener("change", () => {
      state.confirmMove = els.confirmMoveToggle.checked;
      localStorage.setItem(`${STORAGE_PREFIX}:confirmMove`, String(state.confirmMove));
      clearPendingMove(true);
      updateStatus(state.confirmMove ? "已開啟確認落子：點棋盤後請再確認。" : "已關閉確認落子。");
      playSound("ui");
    });
  }

  els.nicknameInput.addEventListener("change", () => {
    localStorage.setItem(`${STORAGE_PREFIX}:nickname`, els.nicknameInput.value.trim());
  });

  els.createRoomBtn.addEventListener("click", createOnlineRoom);
  els.joinRoomBtn.addEventListener("click", joinOnlineRoom);
  els.copyRoomBtn.addEventListener("click", copyRoomCode);
  if (els.acceptUndoBtn) els.acceptUndoBtn.addEventListener("click", () => respondUndoRequest(true));
  if (els.rejectUndoBtn) els.rejectUndoBtn.addEventListener("click", () => respondUndoRequest(false));
  if (els.inviteLinkInput) {
    els.inviteLinkInput.addEventListener("click", () => els.inviteLinkInput.select());
  }

  if (els.installBtn) {
    els.installBtn.addEventListener("click", installPwa);
  }
}

function setupPwa() {
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("./service-worker.js").catch(error => {
        console.warn("Gomoku service worker registration failed:", error);
      });
    });
  }

  window.addEventListener("beforeinstallprompt", event => {
    event.preventDefault();
    deferredInstallPrompt = event;
    if (els.installBtn) els.installBtn.classList.remove("hidden");
  });

  window.addEventListener("appinstalled", () => {
    deferredInstallPrompt = null;
    if (els.installBtn) els.installBtn.classList.add("hidden");
    updateStatus("已安裝到裝置，可以從主畫面開啟。 ");
  });
}

async function installPwa() {
  if (!deferredInstallPrompt) {
    updateStatus("如果瀏覽器支援安裝，請使用分享選單或瀏覽器選單加入主畫面。 ");
    return;
  }

  deferredInstallPrompt.prompt();
  const choice = await deferredInstallPrompt.userChoice.catch(() => null);
  if (choice?.outcome === "accepted") playSound("ui");
  deferredInstallPrompt = null;
  if (els.installBtn) els.installBtn.classList.add("hidden");
}

function togglePanels() {
  const isOnline = state.mode === "online";
  els.onlinePanel.classList.toggle("hidden", !isOnline);
  els.aiDifficultyWrap.classList.toggle("hidden", state.mode !== "ai");
  updateInviteUi();
}

function applyInviteFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const roomCode = normalizeRoomCode(params.get("room") || params.get("r"));
  if (!roomCode) return "";

  state.mode = "online";
  els.modeSelect.value = "online";
  els.roomCodeInput.value = roomCode;
  localStorage.setItem(`${STORAGE_PREFIX}:mode`, "online");
  togglePanels();
  return roomCode;
}

function createBoard() {
  return Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(EMPTY));
}

function startNewGame(options = {}) {
  clearInterval(timerHandle);
  state.board = createBoard();
  state.currentPlayer = BLACK;
  state.history = [];
  state.lastMove = null;
  state.pendingMove = null;
  state.undoRequest = null;
  updateConfirmControls();
  updateUndoRequestUi(null);
  state.gameOver = false;
  state.winner = EMPTY;
  state.winLine = null;
  stopWinAnimation();
  state.aiThinking = false;
  resetTimers();
  hideOverlay();
  updateStatus();
  drawBoard();
  startTurnTimer();
  if (!options.silent) playSound("start");
}

function resetTimers() {
  state.remaining = {
    [BLACK]: state.timerLimit,
    [WHITE]: state.timerLimit
  };
  updateTimerDisplay();
}

function startTurnTimer() {
  clearInterval(timerHandle);
  if (!state.timerLimit || state.gameOver) {
    updateTimerDisplay();
    return;
  }
  state.remaining[state.currentPlayer] = state.timerLimit;
  updateTimerDisplay();
  timerHandle = setInterval(() => {
    if (state.gameOver) {
      clearInterval(timerHandle);
      return;
    }
    state.remaining[state.currentPlayer] -= 1;
    updateTimerDisplay();
    if (state.remaining[state.currentPlayer] <= 0) {
      handleTimeout();
    }
  }, 1000);
}

function updateTimerDisplay() {
  els.blackTimer.textContent = state.timerLimit ? formatTime(state.remaining[BLACK]) : "--:--";
  els.whiteTimer.textContent = state.timerLimit ? formatTime(state.remaining[WHITE]) : "--:--";
}

function formatTime(seconds) {
  const safe = Math.max(0, Number(seconds) || 0);
  const min = Math.floor(safe / 60).toString().padStart(2, "0");
  const sec = (safe % 60).toString().padStart(2, "0");
  return `${min}:${sec}`;
}

function handleTimeout() {
  clearInterval(timerHandle);
  const loser = state.currentPlayer;
  const winner = otherPlayer(loser);
  if (state.mode === "online" && online.roomRef && online.localColor === loser) {
    updateDoc(online.roomRef, {
      status: "ended",
      winner,
      updatedAt: serverTimestamp()
    }).catch(showError);
    return;
  }
  endGame(winner, `${playerName(loser)}超時，${playerName(winner)}獲勝！`);
}

function handleBoardPointer(event) {
  event.preventDefault();
  const pos = pointerToCell(event);
  if (!pos) return;

  if (state.confirmMove) {
    stagePendingMove(pos.row, pos.col);
    return;
  }

  commitMove(pos.row, pos.col);
}

function commitMove(row, col) {
  clearPendingMove(false);
  if (state.mode === "online") {
    playOnlineMove(row, col);
  } else {
    playLocalMove(row, col);
  }
  updateConfirmControls();
}

function stagePendingMove(row, col) {
  if (!canPlaceAt(row, col)) return;

  const sameMove = state.pendingMove
    && state.pendingMove.row === row
    && state.pendingMove.col === col;

  if (sameMove) {
    commitPendingMove();
    return;
  }

  state.pendingMove = { row, col, player: state.currentPlayer };
  updateConfirmControls();
  drawBoard();
  updateStatus("已預覽落子，請按「確認落子」或再點同一格送出。");
  playSound("ui");
}

function commitPendingMove() {
  if (!state.pendingMove) return;
  const { row, col } = state.pendingMove;
  commitMove(row, col);
}

function clearPendingMove(shouldRedraw = false) {
  state.pendingMove = null;
  updateConfirmControls();
  if (shouldRedraw) {
    drawBoard();
    updateStatus();
  }
}

function updateConfirmControls() {
  const hasPending = Boolean(state.pendingMove);
  if (els.confirmMoveBtn) els.confirmMoveBtn.classList.toggle("hidden", !hasPending);
  if (els.cancelPreviewBtn) els.cancelPreviewBtn.classList.toggle("hidden", !hasPending);
}

function canPlaceAt(row, col) {
  if (!isInside(row, col) || state.board[row][col] !== EMPTY || state.gameOver) return false;
  if (state.mode === "online") {
    return Boolean(online.roomRef && online.localColor && state.currentPlayer === online.localColor && !online.busy);
  }
  return !state.aiThinking;
}

function pointerToCell(event) {
  const rect = els.canvas.getBoundingClientRect();
  const x = (event.clientX - rect.left) * (CANVAS_SIZE / rect.width);
  const y = (event.clientY - rect.top) * (CANVAS_SIZE / rect.height);
  const cell = CANVAS_SIZE / (BOARD_SIZE + 1);
  const padding = cell;
  const col = Math.round((x - padding) / cell);
  const row = Math.round((y - padding) / cell);
  if (!isInside(row, col)) return null;
  const cx = padding + col * cell;
  const cy = padding + row * cell;
  const distance = Math.hypot(x - cx, y - cy);
  if (distance > cell * 0.56) return null;
  return { row, col };
}

function playLocalMove(row, col) {
  if (state.gameOver || state.aiThinking) return;
  if (!isInside(row, col) || state.board[row][col] !== EMPTY) return;

  placeMove(row, col, state.currentPlayer, { sound: true });

  if (finishTurnIfNeeded(row, col, state.currentPlayer)) return;
  switchTurn();

  if (state.mode === "ai" && state.currentPlayer === WHITE && !state.gameOver) {
    scheduleAIMove();
  }
}

function placeMove(row, col, player, options = {}) {
  state.board[row][col] = player;
  state.winLine = null;
  state.lastMove = { row, col, player };
  state.history.push({ row, col, player, at: Date.now() });
  if (options.sound) playSound("move");
  drawBoard();
}

function finishTurnIfNeeded(row, col, player) {
  if (checkWin(state.board, row, col, player)) {
    state.winLine = getWinningLine(state.board, row, col, player);
    endGame(player, `${playerName(player)}獲勝！`);
    return true;
  }
  if (isFull(state.board)) {
    endGame(EMPTY, "平手！棋盤已滿。");
    return true;
  }
  return false;
}

function switchTurn() {
  clearPendingMove(false);
  state.currentPlayer = otherPlayer(state.currentPlayer);
  updateStatus();
  startTurnTimer();
  drawBoard();
}

function scheduleAIMove() {
  state.aiThinking = true;
  updateStatus("AI 思考中...");
  window.setTimeout(() => {
    if (state.gameOver || state.mode !== "ai") {
      state.aiThinking = false;
      return;
    }
    const move = chooseAIMove(state.board, WHITE, state.aiDifficulty);
    if (move) {
      placeMove(move.row, move.col, WHITE, { sound: true });
      if (!finishTurnIfNeeded(move.row, move.col, WHITE)) {
        switchTurn();
      }
    }
    state.aiThinking = false;
    updateStatus();
  }, 260);
}

function undoLocalMove() {
  if (!state.history.length || state.aiThinking) return;
  clearPendingMove(false);
  hideOverlay();
  state.gameOver = false;
  state.winner = EMPTY;
  state.winLine = null;
  stopWinAnimation();

  const steps = state.mode === "ai" ? Math.min(2, state.history.length) : 1;
  for (let i = 0; i < steps; i++) {
    const move = state.history.pop();
    if (!move) break;
    state.board[move.row][move.col] = EMPTY;
  }

  const last = state.history[state.history.length - 1] || null;
  state.lastMove = last ? { row: last.row, col: last.col, player: last.player } : null;
  state.currentPlayer = state.mode === "ai" ? BLACK : (last ? otherPlayer(last.player) : BLACK);
  updateStatus();
  drawBoard();
  startTurnTimer();
  playSound("undo");
}

function endGame(winner, message) {
  clearPendingMove(false);
  state.gameOver = true;
  state.winner = winner;
  clearInterval(timerHandle);
  updateStatus(message);
  showOverlay(winner === EMPTY ? "平手" : `${playerName(winner)}獲勝`, message);
  drawBoard();
  if (winner !== EMPTY && state.winLine) startWinAnimation();
  playSound(winner === EMPTY ? "draw" : "win");
}

function showOverlay(title, message) {
  els.overlayTitle.textContent = title;
  els.overlayMessage.textContent = message;
  els.overlay.classList.remove("hidden");
}

function hideOverlay() {
  els.overlay.classList.add("hidden");
}

function updateStatus(customMessage) {
  if (customMessage) {
    els.statusText.textContent = customMessage;
  } else if (state.gameOver) {
    els.statusText.textContent = state.winner ? `${playerName(state.winner)}獲勝！` : "平手！";
  } else if (state.mode === "online") {
    updateOnlineStatusText();
  } else {
    els.statusText.textContent = `輪到${playerName(state.currentPlayer)}`;
  }

  els.turnText.textContent = state.gameOver
    ? "遊戲結束"
    : `${playerName(state.currentPlayer)}行動中`;
  els.turnOrb.classList.toggle("white", state.currentPlayer === WHITE);
}

function updateOnlineStatusText() {
  if (!online.roomRef) {
    els.statusText.textContent = "請建立或加入線上房間";
    return;
  }
  if (!online.localColor) {
    els.statusText.textContent = "正在等待座位資訊";
    return;
  }
  if (state.gameOver) {
    els.statusText.textContent = state.winner ? `${playerName(state.winner)}獲勝！` : "平手！";
    return;
  }
  if (state.undoRequest) {
    els.statusText.textContent = state.undoRequest.fromUid === online.uid
      ? "已送出悔棋請求，等待對手回覆"
      : "對手請求悔棋，請選擇同意或拒絕";
    return;
  }
  if (online.localColor === BLACK && !online.players?.white) {
    els.statusText.textContent = state.currentPlayer === BLACK
      ? "等待白棋加入；黑棋也可以先下第一手"
      : "等待白棋加入";
    return;
  }

  const opponentKey = online.localColor === BLACK ? "white" : "black";
  const opponent = online.players?.[opponentKey];
  if (opponent && opponent.online === false) {
    els.statusText.textContent = "對手可能已離線，等待重新連線";
    return;
  }

  els.statusText.textContent = state.currentPlayer === online.localColor ? "輪到你下棋" : "等待對手下棋";
}

function playerName(player) {
  return player === BLACK ? "黑棋" : player === WHITE ? "白棋" : "無人";
}

function otherPlayer(player) {
  return player === BLACK ? WHITE : BLACK;
}

function isInside(row, col) {
  return row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE;
}

function checkWin(board, row, col, player) {
  const dirs = [[0, 1], [1, 0], [1, 1], [1, -1]];
  for (const [dr, dc] of dirs) {
    const total = 1
      + countDirection(board, row, col, dr, dc, player)
      + countDirection(board, row, col, -dr, -dc, player);
    if (total >= 5) return true;
  }
  return false;
}

function getWinningLine(board, row, col, player) {
  const dirs = [[0, 1], [1, 0], [1, 1], [1, -1]];
  for (const [dr, dc] of dirs) {
    const line = [{ row, col }];

    let r = row - dr;
    let c = col - dc;
    while (isInside(r, c) && board[r][c] === player) {
      line.unshift({ row: r, col: c });
      r -= dr;
      c -= dc;
    }

    r = row + dr;
    c = col + dc;
    while (isInside(r, c) && board[r][c] === player) {
      line.push({ row: r, col: c });
      r += dr;
      c += dc;
    }

    if (line.length >= 5) return line;
  }
  return null;
}

function countDirection(board, row, col, dr, dc, player) {
  let count = 0;
  let r = row + dr;
  let c = col + dc;
  while (isInside(r, c) && board[r][c] === player) {
    count += 1;
    r += dr;
    c += dc;
  }
  return count;
}

function isFull(board) {
  return board.every(row => row.every(cell => cell !== EMPTY));
}

function resizeCanvasForDisplay() {
  els.canvas.width = CANVAS_SIZE;
  els.canvas.height = CANVAS_SIZE;
}

function drawBoard() {
  const styles = getComputedStyle(els.html);
  const boardColor = styles.getPropertyValue("--board").trim() || "#d9b36a";
  const lineColor = styles.getPropertyValue("--board-line").trim() || "#4a3824";
  const accentColor = styles.getPropertyValue("--accent").trim() || "#0ea5b7";
  const cell = CANVAS_SIZE / (BOARD_SIZE + 1);
  const padding = cell;

  ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
  ctx.fillStyle = boardColor;
  ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

  drawWaterTexture(accentColor);

  ctx.strokeStyle = lineColor;
  ctx.lineWidth = 1.7;
  ctx.lineCap = "round";

  for (let i = 0; i < BOARD_SIZE; i++) {
    const pos = padding + i * cell;
    ctx.beginPath();
    ctx.moveTo(padding, pos);
    ctx.lineTo(CANVAS_SIZE - padding, pos);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(pos, padding);
    ctx.lineTo(pos, CANVAS_SIZE - padding);
    ctx.stroke();
  }

  drawStarPoints(cell, padding, lineColor);
  drawStones(cell, padding, accentColor);
  drawWinLine(cell, padding, accentColor);
}

function drawWaterTexture(accentColor) {
  ctx.save();
  ctx.globalAlpha = 0.08;
  ctx.strokeStyle = accentColor;
  ctx.lineWidth = 2;
  for (let y = 50; y < CANVAS_SIZE; y += 92) {
    ctx.beginPath();
    for (let x = -20; x <= CANVAS_SIZE + 20; x += 16) {
      const wave = y + Math.sin((x + y) / 42) * 8;
      if (x === -20) ctx.moveTo(x, wave);
      else ctx.lineTo(x, wave);
    }
    ctx.stroke();
  }
  ctx.restore();
}

function drawStarPoints(cell, padding, lineColor) {
  const points = [3, 7, 11];
  ctx.fillStyle = lineColor;
  for (const row of points) {
    for (const col of points) {
      ctx.beginPath();
      ctx.arc(padding + col * cell, padding + row * cell, 4.6, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawStones(cell, padding, accentColor) {
  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      const player = state.board[row][col];
      if (player !== EMPTY) drawStone(row, col, player, cell, padding);
    }
  }

  if (state.pendingMove && state.board[state.pendingMove.row]?.[state.pendingMove.col] === EMPTY) {
    drawPendingStone(state.pendingMove.row, state.pendingMove.col, state.pendingMove.player, cell, padding, accentColor);
  }

  if (state.lastMove) drawLastMoveMarker(cell, padding, accentColor);
}

function drawPendingStone(row, col, player, cell, padding, accentColor) {
  const x = padding + col * cell;
  const y = padding + row * cell;

  ctx.save();
  ctx.globalAlpha = 0.58;
  ctx.setLineDash([8, 6]);
  ctx.strokeStyle = accentColor;
  ctx.lineWidth = 4;
  ctx.shadowColor = accentColor;
  ctx.shadowBlur = 14;
  ctx.beginPath();
  ctx.arc(x, y, cell * 0.4, 0, Math.PI * 2);
  ctx.stroke();

  ctx.setLineDash([]);
  ctx.globalAlpha = 0.36;
  ctx.fillStyle = player === BLACK ? "#111827" : "#ffffff";
  ctx.beginPath();
  ctx.arc(x, y, cell * 0.35, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawLastMoveMarker(cell, padding, accentColor) {
  const x = padding + state.lastMove.col * cell;
  const y = padding + state.lastMove.row * cell;
  const isWhiteStone = state.lastMove.player === WHITE;

  ctx.save();
  ctx.strokeStyle = accentColor;
  ctx.lineWidth = 3.4;
  ctx.shadowColor = accentColor;
  ctx.shadowBlur = 10;
  ctx.beginPath();
  ctx.arc(x, y, cell * 0.27, 0, Math.PI * 2);
  ctx.stroke();

  ctx.shadowBlur = 0;
  ctx.fillStyle = isWhiteStone ? "rgba(20, 35, 40, 0.8)" : "rgba(255, 255, 255, 0.9)";
  ctx.beginPath();
  ctx.arc(x, y, cell * 0.075, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawWinLine(cell, padding, accentColor) {
  if (!state.winLine || state.winLine.length < 5) return;

  const first = state.winLine[0];
  const last = state.winLine[state.winLine.length - 1];
  const startX = padding + first.col * cell;
  const startY = padding + first.row * cell;
  const endX = padding + last.col * cell;
  const endY = padding + last.row * cell;
  const progress = state.winAnimationStart
    ? clamp((performance.now() - state.winAnimationStart) / 760, 0, 1)
    : 1;
  const currentX = startX + (endX - startX) * progress;
  const currentY = startY + (endY - startY) * progress;

  ctx.save();
  ctx.lineCap = "round";
  ctx.strokeStyle = accentColor;
  ctx.shadowColor = accentColor;
  ctx.shadowBlur = 18;
  ctx.lineWidth = cell * 0.18;
  ctx.beginPath();
  ctx.moveTo(startX, startY);
  ctx.lineTo(currentX, currentY);
  ctx.stroke();

  ctx.shadowBlur = 0;
  ctx.strokeStyle = "rgba(255,255,255,0.88)";
  ctx.lineWidth = cell * 0.065;
  ctx.beginPath();
  ctx.moveTo(startX, startY);
  ctx.lineTo(currentX, currentY);
  ctx.stroke();
  ctx.restore();
}

function startWinAnimation() {
  stopWinAnimation();
  state.winAnimationStart = performance.now();
  const animate = () => {
    drawBoard();
    if (performance.now() - state.winAnimationStart < 900 && state.winLine) {
      state.winAnimationFrame = requestAnimationFrame(animate);
    } else {
      state.winAnimationStart = 0;
      state.winAnimationFrame = null;
      drawBoard();
    }
  };
  state.winAnimationFrame = requestAnimationFrame(animate);
}

function stopWinAnimation() {
  if (state.winAnimationFrame) cancelAnimationFrame(state.winAnimationFrame);
  state.winAnimationFrame = null;
  state.winAnimationStart = 0;
}

function drawStone(row, col, player, cell, padding) {
  const x = padding + col * cell;
  const y = padding + row * cell;
  const radius = cell * 0.39;
  const gradient = ctx.createRadialGradient(
    x - radius * 0.35,
    y - radius * 0.42,
    radius * 0.15,
    x,
    y,
    radius
  );

  if (player === BLACK) {
    gradient.addColorStop(0, "#5f6570");
    gradient.addColorStop(0.52, "#1f2937");
    gradient.addColorStop(1, "#050607");
  } else {
    gradient.addColorStop(0, "#ffffff");
    gradient.addColorStop(0.68, "#f5f7fb");
    gradient.addColorStop(1, "#cbd5e1");
  }

  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fillStyle = gradient;
  ctx.shadowColor = "rgba(0,0,0,0.28)";
  ctx.shadowBlur = 9;
  ctx.shadowOffsetY = 4;
  ctx.fill();
  ctx.shadowColor = "transparent";
  ctx.strokeStyle = player === BLACK ? "rgba(0,0,0,0.45)" : "rgba(80,80,80,0.22)";
  ctx.lineWidth = 1.2;
  ctx.stroke();
  ctx.restore();
}

function chooseAIMove(board, aiPlayer, difficulty) {
  const opponent = otherPlayer(aiPlayer);
  const emptyCount = board.flat().filter(v => v === EMPTY).length;
  if (emptyCount === BOARD_SIZE * BOARD_SIZE) return { row: 7, col: 7 };

  const radius = difficulty <= 4 ? 1 : difficulty <= 12 ? 2 : 3;
  const candidates = getCandidateMoves(board, radius);

  for (const move of candidates) {
    board[move.row][move.col] = aiPlayer;
    const wins = checkWin(board, move.row, move.col, aiPlayer);
    board[move.row][move.col] = EMPTY;
    if (wins) return move;
  }

  for (const move of candidates) {
    board[move.row][move.col] = opponent;
    const blocksWin = checkWin(board, move.row, move.col, opponent);
    board[move.row][move.col] = EMPTY;
    if (blocksWin && difficulty >= 5) return move;
  }

  const scored = candidates.map(move => {
    const offensive = scoreMove(board, move.row, move.col, aiPlayer);
    const defensive = scoreMove(board, move.row, move.col, opponent);
    const centerBias = 16 - Math.hypot(move.row - 7, move.col - 7);
    const defenseWeight = 0.75 + difficulty / 24;
    let score = offensive + defensive * defenseWeight + centerBias;

    if (difficulty >= 13) {
      board[move.row][move.col] = aiPlayer;
      const reply = bestImmediateReplyScore(board, opponent, difficulty >= 18 ? 10 : 6);
      board[move.row][move.col] = EMPTY;
      score -= reply * (0.34 + difficulty / 60);
    }

    const noise = (21 - difficulty) * (Math.random() * 56);
    return { ...move, score: score + noise };
  }).sort((a, b) => b.score - a.score);

  if (!scored.length) return null;
  const poolSize = difficulty <= 3 ? Math.min(10, scored.length)
    : difficulty <= 7 ? Math.min(5, scored.length)
    : difficulty <= 12 ? Math.min(3, scored.length)
    : 1;
  return scored[Math.floor(Math.random() * poolSize)];
}

function getCandidateMoves(board, radius) {
  const set = new Set();
  let hasStone = false;
  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      if (board[row][col] !== EMPTY) {
        hasStone = true;
        for (let dr = -radius; dr <= radius; dr++) {
          for (let dc = -radius; dc <= radius; dc++) {
            const r = row + dr;
            const c = col + dc;
            if (isInside(r, c) && board[r][c] === EMPTY) set.add(`${r},${c}`);
          }
        }
      }
    }
  }
  if (!hasStone) return [{ row: 7, col: 7 }];
  return [...set].map(key => {
    const [row, col] = key.split(",").map(Number);
    return { row, col };
  });
}

function bestImmediateReplyScore(board, player, limit) {
  return getCandidateMoves(board, 2)
    .map(move => scoreMove(board, move.row, move.col, player))
    .sort((a, b) => b - a)
    .slice(0, limit)
    .reduce((max, score) => Math.max(max, score), 0);
}

function scoreMove(board, row, col, player) {
  if (board[row][col] !== EMPTY) return -Infinity;
  board[row][col] = player;
  let total = 0;
  const dirs = [[0, 1], [1, 0], [1, 1], [1, -1]];
  for (const [dr, dc] of dirs) {
    const forward = scanLine(board, row, col, dr, dc, player);
    const backward = scanLine(board, row, col, -dr, -dc, player);
    const count = 1 + forward.count + backward.count;
    const openEnds = Number(forward.open) + Number(backward.open);
    total += patternScore(count, openEnds);
  }
  board[row][col] = EMPTY;
  return total;
}

function scanLine(board, row, col, dr, dc, player) {
  let count = 0;
  let r = row + dr;
  let c = col + dc;
  while (isInside(r, c) && board[r][c] === player) {
    count += 1;
    r += dr;
    c += dc;
  }
  return { count, open: isInside(r, c) && board[r][c] === EMPTY };
}

function patternScore(count, openEnds) {
  if (count >= 5) return 1_000_000;
  if (count === 4 && openEnds === 2) return 180_000;
  if (count === 4 && openEnds === 1) return 26_000;
  if (count === 3 && openEnds === 2) return 9_000;
  if (count === 3 && openEnds === 1) return 1_500;
  if (count === 2 && openEnds === 2) return 700;
  if (count === 2 && openEnds === 1) return 110;
  if (count === 1 && openEnds === 2) return 18;
  return 2;
}

async function ensureFirebase() {
  if (online.ready) return;
  if (!firebaseConfig || !firebaseConfig.apiKey || !firebaseConfig.projectId) {
    throw new Error("尚未設定 Firebase。請先編輯 js/firebase-config.js。 ");
  }

  if (!initializeApp) {
    const [appMod, authMod, firestoreMod] = await Promise.all([
      import("https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js"),
      import("https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js"),
      import("https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js")
    ]);
    initializeApp = appMod.initializeApp;
    getAuth = authMod.getAuth;
    signInAnonymously = authMod.signInAnonymously;
    getFirestore = firestoreMod.getFirestore;
    doc = firestoreMod.doc;
    getDoc = firestoreMod.getDoc;
    setDoc = firestoreMod.setDoc;
    updateDoc = firestoreMod.updateDoc;
    onSnapshot = firestoreMod.onSnapshot;
    runTransaction = firestoreMod.runTransaction;
    serverTimestamp = firestoreMod.serverTimestamp;
  }

  online.app = initializeApp(firebaseConfig);
  online.auth = getAuth(online.app);
  const cred = await signInAnonymously(online.auth);
  online.uid = cred.user.uid;
  online.db = getFirestore(online.app);
  online.ready = true;
}

async function createOnlineRoom() {
  try {
    setButtonsBusy(true);
    await ensureFirebase();
    const roomCode = generateRoomCode();
    const nickname = getNickname();
    const roomRef = doc(online.db, "gomokuRooms", roomCode);
    await setDoc(roomRef, {
      roomCode,
      board: flattenBoard(createBoard()),
      currentPlayer: BLACK,
      status: "playing",
      winner: EMPTY,
      players: {
        black: { uid: online.uid, name: nickname, online: true, lastSeen: serverTimestamp() },
        white: null
      },
      moveHistory: [],
      lastMove: null,
      undoRequest: null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    subscribeRoom(roomCode);
    playSound("start");
  } catch (error) {
    showError(error);
  } finally {
    setButtonsBusy(false);
  }
}

async function joinOnlineRoom() {
  try {
    setButtonsBusy(true);
    await ensureFirebase();
    const roomCode = normalizeRoomCode(els.roomCodeInput.value);
    if (!roomCode) throw new Error("請輸入房號。");
    const roomRef = doc(online.db, "gomokuRooms", roomCode);
    const nickname = getNickname();

    await runTransaction(online.db, async transaction => {
      const snap = await transaction.get(roomRef);
      if (!snap.exists()) throw new Error("找不到這個房間。");
      const data = snap.data();
      const players = data.players || {};
      if (players.black?.uid === online.uid || players.white?.uid === online.uid) return;
      if (!players.white) {
        transaction.update(roomRef, {
          "players.white": { uid: online.uid, name: nickname, online: true, lastSeen: serverTimestamp() },
          updatedAt: serverTimestamp()
        });
        return;
      }
      throw new Error("房間已滿，請建立新房間。");
    });

    subscribeRoom(roomCode);
    playSound("start");
  } catch (error) {
    showError(error);
  } finally {
    setButtonsBusy(false);
  }
}

function subscribeRoom(roomCode) {
  if (online.unsubscribe) online.unsubscribe();
  online.roomCode = normalizeRoomCode(roomCode);
  online.roomRef = doc(online.db, "gomokuRooms", online.roomCode);
  els.roomCodeInput.value = online.roomCode;
  setInviteInUrl(online.roomCode);
  updateInviteUi();
  online.unsubscribe = onSnapshot(online.roomRef, snap => {
    if (!snap.exists()) {
      els.roomInfo.textContent = "房間不存在";
      return;
    }
    applyOnlineRoom(snap.data());
  }, showError);
}

function applyOnlineRoom(data) {
  const players = data.players || {};
  online.localColor = players.black?.uid === online.uid ? BLACK
    : players.white?.uid === online.uid ? WHITE
    : null;

  state.board = unflattenBoard(data.board || []);
  state.currentPlayer = data.currentPlayer || BLACK;
  state.history = Array.isArray(data.moveHistory) ? data.moveHistory : [];
  state.lastMove = data.lastMove || null;
  state.undoRequest = data.undoRequest || null;
  if (state.pendingMove && !canPlaceAt(state.pendingMove.row, state.pendingMove.col)) clearPendingMove(false);
  state.gameOver = data.status === "ended";
  state.winner = data.winner || EMPTY;
  state.winLine = state.winner && state.lastMove
    ? getWinningLine(state.board, state.lastMove.row, state.lastMove.col, state.winner)
    : null;

  online.players = players;
  const blackName = players.black?.name || "等待中";
  const whiteName = players.white?.name || "等待中";
  els.roomInfo.textContent = `房號 ${data.roomCode || online.roomCode}`;
  els.playerInfo.textContent = `黑：${blackName}｜白：${whiteName}｜你是：${online.localColor ? playerName(online.localColor) : "觀戰"}`;
  updateConnectionInfo(players);
  updateUndoRequestUi(state.undoRequest);
  if (online.localColor) startPresenceHeartbeat();

  if (state.gameOver) {
    clearInterval(timerHandle);
    showOverlay(state.winner ? `${playerName(state.winner)}獲勝` : "平手", state.winner ? `${playerName(state.winner)}獲勝！` : "平手！");
    if (state.winner && state.winLine) startWinAnimation();
  } else {
    hideOverlay();
    startTurnTimer();
  }
  updateStatus();
  drawBoard();
}

async function playOnlineMove(row, col) {
  if (online.busy || !online.roomRef || !online.localColor || state.gameOver) return;
  if (state.currentPlayer !== online.localColor) return;
  if (state.board[row][col] !== EMPTY) return;

  try {
    online.busy = true;
    await runTransaction(online.db, async transaction => {
      const snap = await transaction.get(online.roomRef);
      if (!snap.exists()) throw new Error("房間不存在。");
      const data = snap.data();
      if (data.status === "ended") return;
      if (data.currentPlayer !== online.localColor) throw new Error("還沒輪到你。");
      const flat = [...data.board];
      const index = row * BOARD_SIZE + col;
      if (flat[index] !== EMPTY) throw new Error("這裡已經有棋子。");
      flat[index] = online.localColor;
      const board = unflattenBoard(flat);
      const winner = checkWin(board, row, col, online.localColor) ? online.localColor : EMPTY;
      const draw = !winner && flat.every(v => v !== EMPTY);
      const move = { row, col, player: online.localColor, uid: online.uid, at: (Array.isArray(data.moveHistory) ? data.moveHistory.length : 0) + 1 };
      const history = Array.isArray(data.moveHistory) ? [...data.moveHistory, move] : [move];
      transaction.update(online.roomRef, {
        board: flat,
        currentPlayer: winner || draw ? data.currentPlayer : otherPlayer(online.localColor),
        status: winner || draw ? "ended" : "playing",
        winner,
        moveHistory: history,
        lastMove: move,
        undoRequest: null,
        updatedAt: serverTimestamp()
      });
    });
    playSound("move");
  } catch (error) {
    showError(error);
  } finally {
    online.busy = false;
  }
}

async function resetOnlineRoom() {
  if (!online.roomRef) return;
  if (online.localColor !== BLACK) {
    showError(new Error("線上模式只有建立房間的黑棋玩家可以重新開始。"));
    return;
  }
  try {
    await updateDoc(online.roomRef, {
      board: flattenBoard(createBoard()),
      currentPlayer: BLACK,
      status: "playing",
      winner: EMPTY,
      moveHistory: [],
      lastMove: null,
      undoRequest: null,
      updatedAt: serverTimestamp()
    });
    playSound("start");
  } catch (error) {
    showError(error);
  }
}

async function requestOnlineUndo() {
  if (!online.roomRef || !online.localColor || online.busy) return;

  if (state.undoRequest?.fromUid === online.uid) {
    await cancelOwnUndoRequest();
    return;
  }

  try {
    online.busy = true;
    await runTransaction(online.db, async transaction => {
      const snap = await transaction.get(online.roomRef);
      if (!snap.exists()) throw new Error("房間不存在。");
      const data = snap.data();
      const history = Array.isArray(data.moveHistory) ? data.moveHistory : [];
      const last = history[history.length - 1];
      if (!last) throw new Error("目前沒有可以悔棋的步數。");
      if (last.uid !== online.uid) throw new Error("目前只能請求撤回自己剛下、且對手尚未回應的最後一手。");
      if (data.undoRequest) throw new Error("已有悔棋請求等待回覆。 ");

      const playerKey = online.localColor === BLACK ? "black" : "white";
      const playerNameText = data.players?.[playerKey]?.name || playerName(online.localColor);
      transaction.update(online.roomRef, {
        undoRequest: {
          fromUid: online.uid,
          fromColor: online.localColor,
          fromName: playerNameText,
          moveIndex: history.length,
          row: last.row,
          col: last.col,
          createdAtMs: Date.now()
        },
        updatedAt: serverTimestamp()
      });
    });
    playSound("ui");
  } catch (error) {
    showError(error);
  } finally {
    online.busy = false;
  }
}

async function cancelOwnUndoRequest() {
  if (!online.roomRef || !state.undoRequest || state.undoRequest.fromUid !== online.uid) return;
  try {
    await updateDoc(online.roomRef, {
      undoRequest: null,
      updatedAt: serverTimestamp()
    });
    playSound("ui");
  } catch (error) {
    showError(error);
  }
}

async function respondUndoRequest(accepted) {
  if (!online.roomRef || !online.localColor || online.busy || !state.undoRequest) return;

  if (state.undoRequest.fromUid === online.uid) {
    await cancelOwnUndoRequest();
    return;
  }

  try {
    online.busy = true;
    await runTransaction(online.db, async transaction => {
      const snap = await transaction.get(online.roomRef);
      if (!snap.exists()) throw new Error("房間不存在。");
      const data = snap.data();
      const request = data.undoRequest;
      if (!request) return;
      if (request.fromUid === online.uid) throw new Error("不能同意自己的悔棋請求。 ");

      if (!accepted) {
        transaction.update(online.roomRef, {
          undoRequest: null,
          updatedAt: serverTimestamp()
        });
        return;
      }

      const history = Array.isArray(data.moveHistory) ? [...data.moveHistory] : [];
      const last = history[history.length - 1];
      if (!last || history.length !== request.moveIndex || last.uid !== request.fromUid) {
        throw new Error("這個悔棋請求已經過期，請重新送出。 ");
      }

      history.pop();
      const flat = [...data.board];
      flat[last.row * BOARD_SIZE + last.col] = EMPTY;
      const previous = history[history.length - 1] || null;

      transaction.update(online.roomRef, {
        board: flat,
        currentPlayer: last.player,
        status: "playing",
        winner: EMPTY,
        moveHistory: history,
        lastMove: previous,
        undoRequest: null,
        updatedAt: serverTimestamp()
      });
    });
    playSound(accepted ? "undo" : "ui");
  } catch (error) {
    showError(error);
  } finally {
    online.busy = false;
  }
}

function updateUndoRequestUi(request = state.undoRequest) {
  if (!els.undoRequestCard) return;
  const hasRequest = Boolean(request && online.roomRef);
  els.undoRequestCard.classList.toggle("hidden", !hasRequest);
  if (!hasRequest) return;

  const fromSelf = request.fromUid === online.uid;
  const colorName = playerName(request.fromColor);
  const position = typeof request.row === "number" && typeof request.col === "number"
    ? `（第 ${request.row + 1} 列、第 ${request.col + 1} 行）`
    : "";

  els.undoRequestText.textContent = fromSelf
    ? `你已送出悔棋請求，等待對手同意。${position}`
    : `${request.fromName || colorName} 請求撤回上一手 ${position}`;

  if (els.acceptUndoBtn) els.acceptUndoBtn.classList.toggle("hidden", fromSelf);
  if (els.rejectUndoBtn) {
    els.rejectUndoBtn.textContent = fromSelf ? "取消請求" : "拒絕";
    els.rejectUndoBtn.classList.remove("hidden");
  }
}

function updateConnectionInfo(players = online.players) {
  if (!els.connectionInfo || state.mode !== "online") return;
  if (!online.roomRef) {
    els.connectionInfo.textContent = "尚未連線到線上房間";
    els.connectionInfo.dataset.state = "idle";
    return;
  }

  const selfKey = online.localColor === BLACK ? "black" : online.localColor === WHITE ? "white" : null;
  const opponentKey = selfKey === "black" ? "white" : selfKey === "white" ? "black" : null;
  const opponent = opponentKey ? players?.[opponentKey] : null;

  if (!opponent) {
    els.connectionInfo.textContent = online.localColor === BLACK
      ? "等待白棋加入。你可以先下第一手，也可以複製邀請連結給朋友。"
      : "正在讀取對手狀態...";
    els.connectionInfo.dataset.state = "waiting";
    return;
  }

  const onlineNow = opponent.online !== false && isRecentlySeen(opponent.lastSeen);
  els.connectionInfo.textContent = onlineNow
    ? `對手 ${opponent.name || playerName(otherPlayer(online.localColor))} 在線上`
    : `對手 ${opponent.name || playerName(otherPlayer(online.localColor))} 可能已離線，等待重新連線...`;
  els.connectionInfo.dataset.state = onlineNow ? "online" : "offline";
}

function isRecentlySeen(lastSeen) {
  const millis = toMillis(lastSeen);
  if (!millis) return true;
  return Date.now() - millis < 45000;
}

function toMillis(timestamp) {
  if (!timestamp) return 0;
  if (typeof timestamp.toMillis === "function") return timestamp.toMillis();
  if (typeof timestamp.seconds === "number") return timestamp.seconds * 1000;
  if (timestamp instanceof Date) return timestamp.getTime();
  return 0;
}

function startPresenceHeartbeat() {
  if (online.heartbeatHandle || !online.roomRef || !online.localColor) return;
  setOwnPresence(true);
  online.heartbeatHandle = window.setInterval(() => {
    setOwnPresence(document.visibilityState !== "hidden");
    updateConnectionInfo();
  }, 15000);

  online.presenceVisibilityHandler = () => {
    setOwnPresence(document.visibilityState !== "hidden");
    updateConnectionInfo();
  };
  document.addEventListener("visibilitychange", online.presenceVisibilityHandler);
  window.addEventListener("pagehide", () => setOwnPresence(false), { once: true });
}

function stopPresenceHeartbeat() {
  if (online.heartbeatHandle) clearInterval(online.heartbeatHandle);
  online.heartbeatHandle = null;
  if (online.presenceVisibilityHandler) {
    document.removeEventListener("visibilitychange", online.presenceVisibilityHandler);
  }
  online.presenceVisibilityHandler = null;
}

function setOwnPresence(isOnline) {
  if (!online.roomRef || !online.localColor || !updateDoc) return;
  const key = online.localColor === BLACK ? "black" : "white";
  updateDoc(online.roomRef, {
    [`players.${key}.online`]: Boolean(isOnline),
    [`players.${key}.lastSeen`]: serverTimestamp(),
    updatedAt: serverTimestamp()
  }).catch(error => {
    console.warn("Gomoku presence update failed:", error);
  });
}

function flattenBoard(board) {
  return board.flat();
}

function unflattenBoard(flat) {
  const safe = Array.isArray(flat) && flat.length === BOARD_SIZE * BOARD_SIZE
    ? flat
    : flattenBoard(createBoard());
  const board = createBoard();
  for (let i = 0; i < safe.length; i++) {
    board[Math.floor(i / BOARD_SIZE)][i % BOARD_SIZE] = Number(safe[i]) || EMPTY;
  }
  return board;
}

function generateRoomCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

function normalizeRoomCode(value) {
  let raw = String(value || "").trim();
  if (!raw) return "";

  try {
    const url = new URL(raw);
    raw = url.searchParams.get("room") || url.searchParams.get("r") || raw;
  } catch {
    const match = raw.match(/[?&](?:room|r)=([A-Za-z0-9]+)/);
    if (match) raw = match[1];
  }

  return raw.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8);
}

function getInviteLink() {
  if (!online.roomCode) return "";
  const url = new URL(window.location.href);
  url.searchParams.set("room", online.roomCode);
  url.hash = "";
  return url.toString();
}

function setInviteInUrl(roomCode) {
  if (!roomCode) return;
  const url = new URL(window.location.href);
  url.searchParams.set("room", normalizeRoomCode(roomCode));
  url.hash = "";
  window.history.replaceState({}, "", url);
}

function clearInviteFromUrl() {
  const url = new URL(window.location.href);
  if (!url.searchParams.has("room") && !url.searchParams.has("r")) return;
  url.searchParams.delete("room");
  url.searchParams.delete("r");
  window.history.replaceState({}, "", url);
}

function updateInviteUi() {
  const hasRoom = state.mode === "online" && Boolean(online.roomCode);
  els.copyRoomBtn.classList.toggle("hidden", !hasRoom);
  if (els.inviteLinkWrap) els.inviteLinkWrap.classList.toggle("hidden", !hasRoom);
  if (els.inviteLinkInput) els.inviteLinkInput.value = hasRoom ? getInviteLink() : "";
  if (els.qrCard) els.qrCard.classList.toggle("hidden", !hasRoom);
  if (els.qrImage) {
    const link = hasRoom ? getInviteLink() : "";
    els.qrImage.src = link
      ? `https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=12&data=${encodeURIComponent(link)}`
      : "";
  }
}

function getNickname() {
  const name = els.nicknameInput.value.trim().slice(0, 18) || `玩家${Math.floor(Math.random() * 900 + 100)}`;
  els.nicknameInput.value = name;
  localStorage.setItem(`${STORAGE_PREFIX}:nickname`, name);
  return name;
}

async function copyRoomCode() {
  if (!online.roomCode) return;
  const inviteLink = getInviteLink();
  try {
    await navigator.clipboard.writeText(inviteLink);
    els.copyRoomBtn.textContent = "已複製連結";
    window.setTimeout(() => els.copyRoomBtn.textContent = "複製邀請連結", 1200);
  } catch {
    if (els.inviteLinkInput) {
      els.inviteLinkInput.focus();
      els.inviteLinkInput.select();
    } else {
      els.roomCodeInput.select();
    }
  }
}

function setButtonsBusy(isBusy) {
  els.createRoomBtn.disabled = isBusy;
  els.joinRoomBtn.disabled = isBusy;
}

function showError(error) {
  const raw = error?.message || String(error);
  const code = error?.code || "";
  const message = code === "permission-denied" || raw.includes("Missing or insufficient permissions")
    ? "Firebase 權限不足：目前寫入被 Firestore Rules 擋下。請確認已發布最新版規則，並用新版網址建立新房間測試。"
    : raw;
  els.statusText.textContent = code ? `${message} (${code})` : message;
  console.error("Gomoku Firebase error:", error);
}

function playSound(kind = "move") {
  if (!state.soundEnabled) return;
  try {
    audioContext ||= new (window.AudioContext || window.webkitAudioContext)();
    const now = audioContext.currentTime;
    const gain = audioContext.createGain();
    gain.connect(audioContext.destination);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.12, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + soundDuration(kind));

    const osc = audioContext.createOscillator();
    osc.connect(gain);
    osc.type = oscillatorType();
    const [start, end] = soundFrequencies(kind);
    osc.frequency.setValueAtTime(start, now);
    osc.frequency.exponentialRampToValueAtTime(end, now + soundDuration(kind));
    osc.start(now);
    osc.stop(now + soundDuration(kind) + 0.02);
  } catch {
    // Some browsers block audio before the first user gesture. Ignore silently.
  }
}

function oscillatorType() {
  switch (state.soundType) {
    case "sonar": return "sine";
    case "shell": return "triangle";
    case "soft": return "sine";
    default: return "sine";
  }
}

function soundFrequencies(kind) {
  const base = {
    bubble: { move: [360, 620], win: [520, 980], undo: [420, 240], start: [300, 520], ui: [500, 700], draw: [260, 260] },
    sonar: { move: [740, 420], win: [640, 1200], undo: [500, 280], start: [360, 760], ui: [520, 620], draw: [360, 320] },
    shell: { move: [260, 390], win: [330, 880], undo: [330, 180], start: [220, 440], ui: [300, 460], draw: [220, 200] },
    soft: { move: [440, 520], win: [523, 784], undo: [440, 330], start: [392, 523], ui: [494, 554], draw: [330, 330] }
  };
  return base[state.soundType]?.[kind] || base.bubble.move;
}

function soundDuration(kind) {
  if (kind === "win") return 0.38;
  if (kind === "start") return 0.22;
  if (kind === "draw") return 0.32;
  return 0.14;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}
