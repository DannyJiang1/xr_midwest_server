const io = require("socket.io-client");

// Connect to the server
const socket = io("http://127.0.0.1:8080");

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

// Listen for errors
socket.on("error", (err) => {
  console.log("Error:", err);
});

// Disconnect event
socket.on("disconnect", () => {
  console.log("Disconnected from the server");
});

socket.on("opponentDisconnected", (message) => {
  console.log("Opponent disconnected: ", message);
});

// Send a "correctGesture" event to the server
setTimeout(() => {
  console.log("Sending correct gesture...");
  socket.emit("correctGesture");
}, 2000);
