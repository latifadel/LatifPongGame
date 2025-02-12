/**
 * server.js
 * -----------
 * Main Node.js server file. Handles:
 *  - Serving static files (public folder)
 *  - Managing Socket.io for real-time communication
 *  - Game logic updates (positions, collisions, power-ups, scoreboard)
 */

const express = require("express");
const http = require("http");
const path = require("path");
const socketIO = require("socket.io");

const PORT = process.env.PORT || 3000;
const app = express();
const server = http.createServer(app);
const io = socketIO(server);

// Serve static files from /public
app.use(express.static(path.join(__dirname, "public")));

// Data structure to hold all connected players
// Each room has exactly 2 players if you want multiple rooms in the future
let rooms = {
  defaultRoom: {
    players: {},
    ball: {
      x: 400,
      y: 300,
      vx: 5,
      vy: 5,
      radius: 10
    },
    powerUps: [],
    scoreboard: {
      left: 0,
      right: 0
    }
  }
};

// Constants for the game environment
const WIDTH = 800;
const HEIGHT = 600;
const PADDLE_WIDTH = 10;
const PADDLE_HEIGHT = 80;
const PADDLE_SPEED = 7;

// How frequently the game state is updated
const FRAME_RATE = 60;
const FRAME_TIME = 1000 / FRAME_RATE;

// Start the game update loop
setInterval(gameLoop, FRAME_TIME);

function gameLoop() {
  updateGameState(rooms.defaultRoom);
  emitGameState("defaultRoom");
}

// Update positions of ball, check collisions, update scoreboard, etc.
function updateGameState(room) {
  const { players, ball, scoreboard, powerUps } = room;

  // Update ball position
  ball.x += ball.vx;
  ball.y += ball.vy;

  // Collision with top/bottom
  if (ball.y - ball.radius < 0 || ball.y + ball.radius > HEIGHT) {
    ball.vy *= -1;
  }

  // Check if ball crosses left boundary
  if (ball.x - ball.radius < 0) {
    scoreboard.right += 1;
    resetBall(ball, 1);
  }
  // Check if ball crosses right boundary
  else if (ball.x + ball.radius > WIDTH) {
    scoreboard.left += 1;
    resetBall(ball, -1);
  }

  // Player collisions
  for (let socketId in players) {
    const p = players[socketId];
    // Paddle edges
    const paddleTop = p.y;
    const paddleBottom = p.y + PADDLE_HEIGHT;
    const paddleLeft = p.x;
    const paddleRight = p.x + PADDLE_WIDTH;

    // Ball edges
    const ballLeft = ball.x - ball.radius;
    const ballRight = ball.x + ball.radius;
    const ballTop = ball.y - ball.radius;
    const ballBottom = ball.y + ball.radius;

    if (
      ballRight > paddleLeft &&
      ballLeft < paddleRight &&
      ballBottom > paddleTop &&
      ballTop < paddleBottom
    ) {
      // Invert X velocity
      ball.vx *= -1.05; // Slight increase in speed upon collision
      // Optional: adjust ball.vy if you want angled rebounds
    }
  }

  // Update power-up timers & spawn
  handlePowerUps(room);
}

// Reset the ball after a point is scored
function resetBall(ball, direction = 1) {
  ball.x = WIDTH / 2;
  ball.y = HEIGHT / 2;
  ball.vx = 5 * direction;
  ball.vy = 5;
}

// Power-up logic
function handlePowerUps(room) {
  const { powerUps, ball, players } = room;

  // Randomly spawn power-ups
  // For demonstration, let's do a small chance per frame
  if (Math.random() < 0.001 && powerUps.length < 3) {
    // Random type
    const type = Math.random() > 0.5 ? "speed" : "slow";
    powerUps.push({
      id: Date.now(),
      x: Math.random() * (WIDTH - 40) + 20,
      y: Math.random() * (HEIGHT - 40) + 20,
      radius: 15,
      type: type,
      active: true
    });
  }

  // Check collisions with ball
  powerUps.forEach((pu) => {
    if (!pu.active) return;
    const dx = ball.x - pu.x;
    const dy = ball.y - pu.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < ball.radius + pu.radius) {
      // Activate power-up effect
      activatePowerUp(room, pu);
      // Mark as used
      pu.active = false;
    }
  });

  // Remove used power-ups
  for (let i = powerUps.length - 1; i >= 0; i--) {
    if (!powerUps[i].active) {
      powerUps.splice(i, 1);
    }
  }
}

// Activate the effect of a power-up
function activatePowerUp(room, powerUp) {
  const { ball } = room;
  if (powerUp.type === "speed") {
    // Speed boost for 3 seconds
    ball.vx *= 1.5;
    ball.vy *= 1.5;
    setTimeout(() => {
      ball.vx *= 2/3; // revert
      ball.vy *= 2/3; // revert
    }, 3000);
  } else if (powerUp.type === "slow") {
    // Slow motion for 3 seconds
    ball.vx *= 0.5;
    ball.vy *= 0.5;
    setTimeout(() => {
      ball.vx *= 2; // revert
      ball.vy *= 2; // revert
    }, 3000);
  }
}

// Emit game state to all players in the specified room
function emitGameState(roomName) {
  const room = rooms[roomName];
  io.to(roomName).emit("gameState", {
    ball: room.ball,
    players: room.players,
    scoreboard: room.scoreboard,
    powerUps: room.powerUps
  });
}

// Handle new socket connections
io.on("connection", (socket) => {
  console.log(`Client connected: ${socket.id}`);

  // Join default room
  socket.join("defaultRoom");
  const room = rooms["defaultRoom"];

  // If there are fewer than 2 players, assign a side
  const currentPlayers = Object.keys(room.players).length;
  if (currentPlayers < 2) {
    let xPos, yPos;
    if (currentPlayers === 0) {
      // Left paddle
      xPos = 50;
      yPos = HEIGHT / 2 - PADDLE_HEIGHT / 2;
    } else {
      // Right paddle
      xPos = WIDTH - 50 - PADDLE_WIDTH;
      yPos = HEIGHT / 2 - PADDLE_HEIGHT / 2;
    }

    room.players[socket.id] = {
      x: xPos,
      y: yPos,
      score: 0
    };
  } else {
    // If 2 players are already in the game, you can decide to spectate or refuse
    // For now, we allow spectators (no paddle assigned)
    room.players[socket.id] = {
      x: -100, // out of the screen
      y: -100,
      spectate: true
    };
  }

  // When a player sends move input
  socket.on("playerMove", (data) => {
    const p = room.players[socket.id];
    if (!p || p.spectate) return;
    // Move paddle with the given direction
    if (data.up) {
      p.y = Math.max(p.y - PADDLE_SPEED, 0);
    }
    if (data.down) {
      p.y = Math.min(p.y + PADDLE_SPEED, HEIGHT - PADDLE_HEIGHT);
    }
  });

  // On disconnect, remove the player
  socket.on("disconnect", () => {
    console.log(`Client disconnected: ${socket.id}`);
    delete room.players[socket.id];
  });
});

server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
