// Loads the abuse-word list from GitHub (raw JSON file).
// Node 18+ ships a global fetch(), so no extra HTTP library is needed.
async function loadAbuseWords() {
  const url = process.env.ABUSE_LIST_URL;
  if (!url) {
    throw new Error("ABUSE_LIST_URL is not set in backend/.env (copy .env.example)");
  }

  const res = await fetch(url, { headers: { "user-agent": "chatshield" } });
  if (!res.ok) {
    throw new Error(`GitHub responded ${res.status} ${res.statusText}`);
  }

  const data = await res.json(); // parses { "words": [...] }
  return Array.isArray(data.words) ? data.words : [];
}

module.exports = { loadAbuseWords };
