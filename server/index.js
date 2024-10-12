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
    players.player1 = { id: socket.id, hp: 100 };
    socket.emit("assigned", { player: "player1", hp: players.player1.hp });
    console.log("Assigned to Player 1");
  } else if (!players.player2) {
    players.player2 = { id: socket.id, hp: 100 };
    socket.emit("assigned", { player: "player2", hp: players.player2.hp });
    console.log("Assigned to Player 2");
  }

  // If both players are connected, start the game and countdown
  if (players.player1 && players.player2) {
    console.log("Both players are connected. Starting the 63-second timer...");
    let timeLeft = 63; // Total game time
    const gameInterval = setInterval(() => {
      timeLeft--;

      // Emit the current time left to both players
      io.emit("timeUpdate", { timeLeft: timeLeft });

      if (timeLeft <= 0) {
        clearInterval(gameInterval);
        // Notify players that the game is finished
        // Determine game result based on player HP using the ternary operator
        const player1Hp = players.player1.hp;
        const player2Hp = players.player2.hp;

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

  // Handles hp updates
  socket.on("correctGesture", () => {
    if (
      players.player1 &&
      players.player1.id === socket.id &&
      players.player2
    ) {
      // Player 1 sent the gesture, Player 2 takes damage
      players.player2.hp -= 10;
      socket.broadcast.emit("updateHP", {
        hp: players.player2.hp,
      });
      console.log("Player 2 took damage from Player 1");

      // If Player 1 hp is 0, send victory or loss messages to both players
      if (players.player1.hp == 0) {
        socket.emit("gameFinished", {
          result: "victory",
        });
        socket.broadcast.emit("gameFinished", {
          result: "loss",
        });
      }
    } else if (
      players.player2 &&
      players.player2.id === socket.id &&
      players.player1
    ) {
      // Player 2 sent the gesture, Player 1 takes damage
      players.player1.hp -= 10;
      socket.broadcast.emit("updateHP", {
        hp: players.player1.hp,
      });
      console.log("Player 1 took damage from Player 2");

      // If Player 1 hp is 0, send victory or loss messages to both players
      if (players.player1.hp == 0) {
        socket.emit("gameFinished", {
          result: "victory",
        });
        socket.broadcast.emit("gameFinished", {
          result: "loss",
        });
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
        players.player2.hp = 100; // Reset HP for Player 2
        socket.broadcast.emit("opponentDisconnected", {
          message: "Player 1 has disconnected. Game terminated.",
        });
      }
    } else if (players.player2 && players.player2.id === socket.id) {
      players.player2 = null;
      console.log("Player 2 disconnected");
      if (players.player1) {
        players.player1.hp = 100; // Reset HP for Player 1
        socket.broadcast.emit("opponentDisconnected", {
          message: "Player 2 has disconnected. Game terminated.",
        });
      }
    }
  });
});

const HOST = "127.0.0.1";
const PORT = 8080;

server.listen(PORT, HOST, () => {
  console.log(`Server is running on http://${HOST}:${PORT}`);
});
