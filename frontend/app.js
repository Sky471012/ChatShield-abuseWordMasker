// One socket per browser tab, talking to the backend that served this page.
const socket = io();

const form = document.getElementById("form");
const usernameInput = document.getElementById("username");
const messageInput = document.getElementById("message");
const messages = document.getElementById("messages");

// Username of the last message *we* sent, used to align our bubbles right.
let myName = "";

form.addEventListener("submit", (event) => {
  event.preventDefault();

  const username = usernameInput.value.trim() || "anonymous";
  const message = messageInput.value.trim();
  if (!message) return;

  // the server masks the text and broadcasts it back to every client
  socket.emit("send-message", { username, message });

  myName = username;
  messageInput.value = "";
  messageInput.focus();

  // sending the message means we are no longer typing
  socket.emit("stop-typing", { username });
});

socket.on("receive-message", (data) => {
  if (!data) return;
  addMessage(data.username, data.message);
});

// ---------- typing indicator ----------

const typingEl = document.getElementById("typing");

let lastTypedAt = 0;
let hideTimer = null;
let typingUser = "";

messageInput.addEventListener("input", () => {
  const username = usernameInput.value.trim() || "anonymous";

  if (!messageInput.value.trim()) {
    socket.emit("stop-typing", { username });
    return;
  }

  // only tell the server about typing once every 800ms
  const now = Date.now();
  if (now - lastTypedAt > 800) {
    lastTypedAt = now;
    socket.emit("typing", { username });
  }
});

// someone else is typing -> show "name is typing..."
socket.on("user-typing", (data) => {
  if (!data) return;
  typingUser = data.username;
  typingEl.textContent = `${data.username} is typing...`;
  typingEl.hidden = false;
  clearTimeout(hideTimer);
  hideTimer = setTimeout(hideTyping, 3000); // safety if "stop-typing" never arrives
});

// they stopped / sent the message -> hide it
socket.on("user-stop-typing", (data) => {
  if (data && data.username === typingUser) hideTyping();
});

function hideTyping() {
  clearTimeout(hideTimer);
  typingUser = "";
  typingEl.hidden = true;
  typingEl.textContent = "";
}

function addMessage(username, message) {
  const empty = document.getElementById("empty");
  if (empty) empty.remove();

  const row = document.createElement("div");
  row.className = "message" + (username === myName ? " message--mine" : "");

  const avatar = document.createElement("div");
  avatar.className = "avatar";
  avatar.textContent = username.charAt(0).toUpperCase();

  const body = document.createElement("div");
  body.className = "message__body";

  const name = document.createElement("div");
  name.className = "message__name";
  name.textContent = username;

  const text = document.createElement("div");
  text.className = "message__text";
  text.textContent = message; // textContent instead of innerHTML: no HTML injection

  body.append(name, text);
  row.append(avatar, body);
  messages.append(row);
  messages.scrollTop = messages.scrollHeight;
}
