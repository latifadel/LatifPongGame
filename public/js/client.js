/**
 * client.js
 * ----------
 * Handles the Socket.io client-side logic:
 *  - Connect to server
 *  - Receive gameState updates
 *  - Update scoreboard
 *  - Draw game elements on canvas
 *  - Send player input (keyboard/touch)
 */

const socket = io();
const canvas = document.getElementById("game-canvas");
const ctx = canvas.getContext("2d");

const scoreboardLeft = document.getElementById("left-score");
const scoreboardRight = document.getElementById("right-score");
const powerUpsContainer = document.getElementById("power-ups");

// We'll store the latest state from the server
let gameState = {
  ball: { x: 0, y: 0, vx: 0, vy: 0, radius: 10 },
  players: {},
  scoreboard: { left: 0, right: 0 },
  powerUps: []
};

// Rendering at ~60 FPS
const FPS = 60;
setInterval(() => {
  drawGame();
}, 1000 / FPS);

// Listen for server updates
socket.on("gameState", (state) => {
  gameState = state;

  // Update scoreboard
  scoreboardLeft.innerText = state.scoreboard.left;
  scoreboardRight.innerText = state.scoreboard.right;

  // Update power-ups in the DOM
  renderPowerUps();
});

/**
 * Renders the entire game on the canvas
 */
function drawGame() {
  const { ball, players } = gameState;

  // Clear canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  // Draw ball
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
  ctx.fill();

  // Draw paddles
  ctx.fillStyle = "#09f";
  for (let id in players) {
    const p = players[id];
    if (p.spectate) continue; // don't draw spectators
    ctx.fillRect(p.x, p.y, 10, 80);
  }
}

// Render power-ups floating indicators
function renderPowerUps() {
  // Clear existing
  powerUpsContainer.innerHTML = "";

  gameState.powerUps.forEach((pu) => {
    if (!pu.active) return;
    const div = document.createElement("div");
    div.classList.add("power-up-indicator");
    div.style.left = pu.x + "px";
    div.style.top = pu.y + "px";
    div.innerText = pu.type === "speed" ? "S" : "↓";
    powerUpsContainer.appendChild(div);
  });
}

// Player input handling (keyboard events)
let upPressed = false;
let downPressed = false;

document.addEventListener("keydown", (e) => {
  if (e.key === "ArrowUp" || e.key === "w") {
    upPressed = true;
  }
  if (e.key === "ArrowDown" || e.key === "s") {
    downPressed = true;
  }
});

document.addEventListener("keyup", (e) => {
  if (e.key === "ArrowUp" || e.key === "w") {
    upPressed = false;
  }
  if (e.key === "ArrowDown" || e.key === "s") {
    downPressed = false;
  }
});

// Send input to server ~60 times/sec
setInterval(() => {
  socket.emit("playerMove", {
    up: upPressed,
    down: downPressed
  });
}, 1000 / 60);
