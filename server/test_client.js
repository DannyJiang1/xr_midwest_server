const io = require("socket.io-client");

// Connect to the server
const socket = io("http://172.20.10.4:8080");

// Handle the connection event
socket.on("connect", () => {
  console.log("Connected to the server");
});

// Listen for custom events from the server (e.g., 'assigned', 'updateHP')
socket.on("assigned", (data) => {
  console.log("Assigned role:", data);
});

socket.on("updateHP", (data) => {
  console.log("HP updated:", data.hp);
});

socket.on("gameStart", (data) => {
  console.log("Game started");
});

// Time heartbeat
socket.on("timeUpdate", (data) => {
  console.log("Time left: ", data.timeLeft);
});

// Listen for errors
socket.on("error", (err) => {
  console.log("Error:", err);
});

// Disconnect event
socket.on("disconnect", () => {
  console.log("Disconnected from the server");
});

socket.on("gameFinished", (data) => {
  console.log("Game finished: ", data.result);
});

// Send a "correctGesture" event to the server
// setTimeout(() => {
//   console.log("Sending correct gesture...");
//   socket.emit("correctGesture");
// }, 2000);

// Simulates a "restart game" button click
// setTimeout(() => {
//   console.log("player ready.");
//   socket.emit("restartGame");
// }, 15000);
