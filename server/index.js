const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

let players = {
  player1: null,
  player2: null,
};

const MAX_HP = 100;
const DAMAGE = 10;

// Serve a simple endpoint to check if the server is running
app.get("/", (req, res) => {
  res.send("Server is running");
});

// New connection
io.on("connection", (socket) => {
  console.log(`User connected: ${socket.id}`);

  // Handles new connection
  // e.g. game full?
  // assigning player

  // Reject new connections if both players are already connected
  if (players.player1 && players.player2) {
    socket.emit("full", {
      message: "Game is full. Two players are already connected.",
    });
    console.log("Game is full. New connection rejected.");
    socket.disconnect(); // Disconnect the socket
    return;
  }

  // Assign the user to either player 1 or player 2
  if (!players.player1) {
    players.player1 = { id: socket.id, hp: MAX_HP, ready: true };
    socket.emit("assigned", { player: "player1", hp: players.player1.hp });
    console.log("Assigned to Player 1");
  } else if (!players.player2) {
    players.player2 = { id: socket.id, hp: MAX_HP, ready: true };
    socket.emit("assigned", { player: "player2", hp: players.player2.hp });
    console.log("Assigned to Player 2");
  }

  // If gameInterval is null then the game is not in progress
  // Otherwise there is an ongoing game
  let gameInterval = null;

  // If both players are connected, start the game and countdown
  if (players.player1 && players.player2 && !gameInterval) {
    console.log("Both players are connected. Starting the 63-second timer...");
    let timeLeft = 63; // Total game time (set to 63)
    io.emit("gameStart", {
      message: "Game/Countdown Started.",
    });
    gameInterval = setInterval(() => {
      timeLeft--;

      // Emit the current time left to both players
      io.emit("timeUpdate", { timeLeft: timeLeft });

      if (timeLeft <= 0) {
        clearInterval(gameInterval);
        gameInterval = null;
        // Notify players that the game is finished
        const player1Hp = players.player1.hp;
        const player2Hp = players.player2.hp;

        console.log("Player 1 hp: ", player1Hp);
        console.log("Player 2 hp: ", player2Hp);

        const resultPlayer1 =
          player1Hp > player2Hp
            ? "victory"
            : player1Hp < player2Hp
            ? "loss"
            : "tie";
        const resultPlayer2 =
          player2Hp > player1Hp
            ? "victory"
            : player2Hp < player1Hp
            ? "loss"
            : "tie";

        // Notify Player 1 of the result
        io.to(players.player1.id).emit("gameFinished", {
          result: resultPlayer1,
        });

        // Notify Player 2 of the result
        io.to(players.player2.id).emit("gameFinished", {
          result: resultPlayer2,
        });
        players.player1.ready = false;
        players.player2.ready = false;
        console.log("Game finished! Time's up.");
      }
    }, 1000); // Update every second
  }

  // Handles hp updates
  socket.on("correctGesture", () => {
    if (
      players.player1 &&
      players.player1.id === socket.id &&
      players.player2
    ) {
      // Player 1 sent the gesture, Player 2 takes damage
      players.player2.hp -= DAMAGE;
      socket.broadcast.emit("updateHP", {
        hp: players.player2.hp,
      });
      console.log("Player 2 took damage from Player 1");

      // If Player 1 hp is 0, send victory or loss messages to both players
      if (players.player1.hp == 0) {
        clearInterval(gameInterval);
        gameInterval = null; // Stops and clears the timer heartbeats
        socket.emit("gameFinished", {
          result: "victory",
        });
        socket.broadcast.emit("gameFinished", {
          result: "loss",
        });
        players.player1.ready = false;
        players.player2.ready = false;
      }
    } else if (
      players.player2 &&
      players.player2.id === socket.id &&
      players.player1
    ) {
      // Player 2 sent the gesture, Player 1 takes damage
      players.player1.hp -= DAMAGE;
      socket.broadcast.emit("updateHP", {
        hp: players.player1.hp,
      });
      console.log("Player 1 took damage from Player 2");

      // If Player 1 hp is 0, send victory or loss messages to both players
      if (players.player1.hp == 0) {
        clearInterval(gameInterval);
        gameInterval = null; // Stops and clears the timer heartbeats
        socket.emit("gameFinished", {
          result: "victory",
        });
        socket.broadcast.emit("gameFinished", {
          result: "loss",
        });
        players.player1.ready = false;
        players.player2.ready = false;
      }
    } else {
      socket.emit("error", {
        message: "Opponent not connected or invalid player",
      });
    }
  });

  // Handle disconnections
  socket.on("disconnect", () => {
    console.log(`User disconnected: ${socket.id}`);

    if (players.player1 && players.player1.id === socket.id) {
      players.player1 = null;
      console.log("Player 1 disconnected");
      if (players.player2) {
        players.player2.hp = MAX_HP; // Reset HP for Player 2
        if (gameInterval) {
          clearInterval(gameInterval);
          gameInterval = null; // Set to null after clearing
          socket.broadcast.emit("gameFinished", {
            result: "interrupt",
          });
          console.log("Game interval cleared due to disconnection.");
        }
      }
    } else if (players.player2 && players.player2.id === socket.id) {
      players.player2 = null;
      console.log("Player 2 disconnected");
      if (players.player1) {
        players.player1.hp = MAX_HP; // Reset HP for Player 1
        if (gameInterval) {
          clearInterval(gameInterval);
          gameInterval = null; // Set to null after clearing
          socket.broadcast.emit("gameFinished", {
            result: "interrupt",
          });
          console.log("Game interval cleared due to disconnection.");
        }
      }
    }
  });

  // Handle restarting the game
  socket.on("restartGame", () => {
    if (socket.id === players.player1.id) {
      players.player1.ready = true;
      console.log("Player 1 clicked restart");
    }
    if (socket.id === players.player2.id) {
      players.player2.ready = true;
      console.log("Player 2 clicked restart");
    }
    // Once both players have clicked ready then the game will restart.
    if (
      players.player1 &&
      players.player1.ready &&
      players.player2 &&
      players.player2.ready &&
      !gameInterval
    ) {
      console.log("Both players are ready. Starting timer...");
      players.player1.hp = MAX_HP;
      players.player2.hp = MAX_HP;
      let timeLeft = 63; // Total game time
      io.emit("gameStart", {
        message: "Game/Countdown Started.",
      });
      gameInterval = setInterval(() => {
        timeLeft--;

        // Emit the current time left to both players
        io.emit("timeUpdate", { timeLeft: timeLeft });

        if (timeLeft <= 0) {
          clearInterval(gameInterval);
          gameInterval = null;
          // Notify players that the game is finished
          const player1Hp = players.player1.hp;
          const player2Hp = players.player2.hp;
          console.log("Player 1 hp: ", player1Hp);
          console.log("Player 2 hp: ", player2Hp);
          const resultPlayer1 =
            player1Hp > player2Hp
              ? "victory"
              : player1Hp < player2Hp
              ? "loss"
              : "tie";
          const resultPlayer2 =
            player2Hp > player1Hp
              ? "victory"
              : player2Hp < player1Hp
              ? "loss"
              : "tie";

          // Notify Player 1 of the result
          io.to(players.player1.id).emit("gameFinished", {
            result: resultPlayer1,
          });

          // Notify Player 2 of the result
          io.to(players.player2.id).emit("gameFinished", {
            result: resultPlayer2,
          });

          console.log("Game finished! Time's up.");
        }
      }, 1000); // Update every second
    }
  });
});

const HOST = "127.0.0.1";
const PORT = 8080;

server.listen(PORT, HOST, () => {
  console.log(`Server is running on http://${HOST}:${PORT}`);
});
