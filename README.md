# ChatShield

A very small full-stack chat broadcast app for learning **Socket.io** and **abuse-word masking**.

- Every message is broadcast to all connected clients.
- A live **"alice is typing..."** indicator, relayed by the server to everyone else.
- Abusive words are masked on the **server** (`damn` → `****`) before anyone sees them.
- The abuse-word list lives in **this repository** (`abuse-list.json`) and is fetched from GitHub every 5 minutes.
- The backend keeps the list in an **in-memory Trie**, so message filtering never touches the network.

```
GitHub (abuse-list.json)
  │  fetch every 5 minutes
  ▼
Node.js backend  ──►  in-memory Trie  ──►  Socket.io chat
```

## Project structure

```
abuse-masking-chat/
├── backend/
│   ├── server.js        # Express + Socket.io + refresh loop
│   ├── abuseList.js     # fetches abuse-list.json from GitHub
│   ├── abuseFilter.js   # simple Trie + maskText()
│   ├── package.json
│   ├── .env             # your local settings (not committed)
│   └── .env.example
├── frontend/
│   ├── index.html
│   ├── app.js
│   ├── style.css
│   └── logo.png
├── abuse-list.json      # the abuse-word list, hosted by this repo
├── README.md
└── .gitignore
```

## 1. Install

```bash
cd backend
npm install
```

## 2. Configure `.env`

Copy the example file and set the raw GitHub URL of **this** repository's `abuse-list.json`:

```bash
cp .env.example .env
```

```env
ABUSE_LIST_URL=https://raw.githubusercontent.com/<USERNAME>/<REPOSITORY>/main/abuse-list.json
```

Replace `<USERNAME>` and `<REPOSITORY>` with your GitHub account and repo name.
No credentials are needed — the file is public, and nothing is exposed to the browser.

## 3. Publish the abuse list to GitHub

Edit `abuse-list.json` in the project root, then push it to GitHub:

```bash
git add abuse-list.json
git commit -m "Update abuse list"
git push
```

Format:

```json
{
  "words": ["word1", "word2", "word3"]
}
```

The backend picks up the change within 5 minutes (or restart the server).

## 4. Start the server

```bash
npm start
```

Open **http://localhost:3000**.

## 5. Test with multiple browser tabs

1. Open http://localhost:3000 in tab A, enter username `alice`.
2. Open http://localhost:3000 in tab B, enter username `bob`.
3. In tab A send `you damn fool`.
4. Both tabs instantly show `alice: you **** fool`.
5. Send a clean message (`hello everyone`) — it arrives unchanged.
6. Start typing in tab A (without sending): tab B shows `alice is typing...`, and it disappears when the message is sent or typing stops.

## Architecture and data flow

- **GitHub is the centralized source of the abuse-word list.** One file (`abuse-list.json`) lives in this repository, so anyone can edit it with a normal commit — no database, no admin panel, no extra service.
- **The backend downloads that file twice:** once at startup and then every 5 minutes. If GitHub is down, the error is logged and the current list keeps working.
- **The list is compiled into an in-memory Trie** (each character is one node). Checking a word walks the trie, which is fast and never blocks on the network.
- **Chat flow:** client emits `send-message` → server masks the text with the Trie → server `io.emit("receive-message")` → all clients render the message.
- **Typing flow:** while the input has text the client emits `typing` (throttled to once per 800ms) → server relays it with `socket.broadcast.emit("user-typing")` to everyone except the sender → the UI shows `name is typing...`. Clearing the input or pressing Send emits `stop-typing`, which becomes `user-stop-typing` and hides the indicator (plus a 3s safety timeout).

```
Client  →  "send-message"  →  Node backend  →  Trie masks text  →  "receive-message"  →  all clients
Client  →  "typing"        →  Node backend  →  (no masking)     →  "user-typing"      →  other clients
```

## Notes

- No TypeScript, no React, no database, no Redis, no authentication, no Docker.
- Messages are rendered with `textContent`, so chat input can never inject HTML.
- R2 / AWS SDK is not used at all; the abuse list is plain GitHub raw JSON.
