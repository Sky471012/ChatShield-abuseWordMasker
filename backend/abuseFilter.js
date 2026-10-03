// A very small Trie.
// Each node is a plain object: { d: { a: { m: { n: { isEnd: true } } } } }
// `isEnd` marks the last character of a complete abuse word or phrase,
// e.g. "damn" or "son of a bitch" (phrases are stored with normal spaces).
class Trie {
  constructor() {
    this.root = {};
    this.maxWords = 1; // longest entry, e.g. "son of a bitch" = 4 words
  }

  insert(word) {
    // normalize: trim, collapse spaces, lowercase
    word = String(word).trim().replace(/\s+/g, " ").toLowerCase();
    if (!word) return;

    let node = this.root;
    for (const char of word) {
      if (!node[char]) node[char] = {};
      node = node[char];
    }
    node.isEnd = true;

    const wordCount = word.split(" ").length;
    if (wordCount > this.maxWords) this.maxWords = wordCount;
  }

  search(word) {
    let node = this.root;
    for (const char of word) {
      if (!node[char]) return false;
      node = node[char];
    }
    return node.isEnd === true;
  }

  // Mask abusive words and phrases with "*", keep everything else as it was.
  //   "you damn fool"      -> "you **** fool"
  //   "son of a bitch"     -> "*** ** * *****"
  //   "तेरी माँ की चूत"  -> "**** ** ** ****"
  maskText(text) {
    // Split into word tokens + separators.
    // \p{L} letters (any script), \p{M} combining marks (Hindi matras),
    // \p{N} numbers, ' and ’ kept inside words ("mother’s").
    const parts = text.split(/([\p{L}\p{M}\p{N}'’]+)/u);

    // separators sit at even indexes, word tokens at odd ones (0, 2, 4 ... are
    // "" / spaces / punctuation, 1, 3, 5 ... are the words)
    const count = Math.floor(parts.length / 2);
    const wordAt = (k) => parts[k * 2 + 1];
    const maskAt = (k) => {
      parts[k * 2 + 1] = "*".repeat(wordAt(k).length);
    };

    let i = 0;
    while (i < count) {
      // try the longest phrase first ("son of a bitch"), then shorter ones,
      // ending with a single word ("damn")
      let matched = 0;
      for (let len = Math.min(this.maxWords, count - i); len >= 1; len--) {
        const candidate = [];
        for (let j = 0; j < len; j++) candidate.push(wordAt(i + j).toLowerCase());
        if (this.search(candidate.join(" "))) {
          matched = len;
          break;
        }
      }

      if (matched) {
        for (let j = 0; j < matched; j++) maskAt(i + j);
        i += matched;
      } else {
        i++;
      }
    }

    return parts.join("");
  }
}

module.exports = { Trie };
