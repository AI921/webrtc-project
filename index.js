const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
app.use(cors());
const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: "*" },
});

// Only two users (lowercase)
const users = {
  ashish: null,
  maa: null,
};

io.on("connection", (socket) => {
  let username = null;

  // ---------------- LOGIN ----------------
  socket.on("login", (name) => {
    if (!name) return socket.emit("login_error", "Username required");

    const lowerName = name.toLowerCase(); // convert to lowercase
    if (!(lowerName in users)) {
      socket.emit("login_error", "Username not found");
      return;
    }

    username = lowerName;
    users[username] = socket.id;
    socket.emit("login_success", username);
    console.log(`${username} logged in`);
  });

  // ---------------- CHAT ----------------
  socket.on("send_message", ({ message }) => {
    const targetName = username === "ashish" ? "maa" : "ashish";
    const target = users[targetName];
    if (target) io.to(target).emit("receive_message", { from: username, message });
  });

  // ---------------- CALL ----------------
  socket.on("call_user", ({ offer, type }) => {
    const targetName = username === "ashish" ? "maa" : "ashish";
    const target = users[targetName];
    if (target) io.to(target).emit("call_made", { from: username, offer, type });
    else socket.emit("user_not_found");
  });

  socket.on("make_answer", ({ answer }) => {
    const targetName = username === "ashish" ? "maa" : "ashish";
    const target = users[targetName];
    if (target) io.to(target).emit("answer_made", { from: username, answer });
  });

  // ---------------- DISCONNECT ----------------
  socket.on("disconnect", () => {
    if (username) {
      users[username] = null;
      console.log(`${username} disconnected`);
    }
  });
});

server.listen(5000, () => console.log("✅ Server running on http://localhost:5000"));
