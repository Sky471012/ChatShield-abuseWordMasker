const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") }); // load backend/.env first

const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const { loadAbuseWords } = require("./abuseList");
const { Trie } = require("./abuseFilter");

const PORT = 3000;
const REFRESH_EVERY_MS = 5 * 60 * 1000; // 5 minutes

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Serve the frontend from this same Node server: http://localhost:3000
app.use(express.static(path.join(__dirname, "..", "frontend")));

// One Trie for the whole app, kept in memory for fast message filtering.
// It is only swapped after a successful GitHub fetch, so a failed refresh
// simply keeps the previous list in use.
let abuseTrie = new Trie();

async function refreshAbuseList() {
  const words = await loadAbuseWords(); // throws if GitHub is unreachable
  const next = new Trie();
  for (const word of words) next.insert(word); // Trie normalizes case/spaces
  abuseTrie = next;
  console.log(`Loaded ${words.length} abuse words`);
}

// 1) Build the Trie once at startup. A failure is logged, never fatal.
refreshAbuseList().catch((err) => {
  console.error("Could not load abuse-list.json from GitHub:", err.message);
  console.error("Server keeps running with an empty abuse list.");
});

// 2) Rebuild it every 5 minutes. On failure the current Trie stays.
// GitHub is never queried while a message is being processed.
setInterval(() => {
  refreshAbuseList()
    .then(() => console.log("Abuse list refreshed"))
    .catch((err) => console.error("Abuse list refresh failed, keeping current list:", err.message));
}, REFRESH_EVERY_MS);

// keep usernames short and safe
function cleanUsername(value) {
  return String(value || "anonymous").trim().slice(0, 30) || "anonymous";
}

io.on("connection", (socket) => {
  // client -> server
  socket.on("send-message", (data) => {
    if (!data) return;

    const username = cleanUsername(data.username);
    const raw = String(data.message || "").slice(0, 500);
    if (!raw.trim()) return;

    // mask abusive words here, on the server, before anyone sees the message
    const masked = abuseTrie.maskText(raw);

    // server -> every connected client (including the sender)
    io.emit("receive-message", { username, message: masked });
  });

  // typing indicators: relay to everyone EXCEPT the person typing
  socket.on("typing", (data) => {
    socket.broadcast.emit("user-typing", { username: cleanUsername(data && data.username) });
  });

  socket.on("stop-typing", (data) => {
    socket.broadcast.emit("user-stop-typing", { username: cleanUsername(data && data.username) });
  });
});

server.listen(PORT, () => {
  console.log("Server started on port 3000");
  console.log("Open http://localhost:3000 in your browser");
});
