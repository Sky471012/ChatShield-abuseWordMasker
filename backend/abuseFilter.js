// A very small Trie.
// Each node is a plain object: { d: { a: { m: { n: { isEnd: true } } } } }
// `isEnd` marks the last character of a complete abuse word.
class Trie {
  constructor() {
    this.root = {};
  }

  insert(word) {
    let node = this.root;
    for (const char of word) {
      if (!node[char]) node[char] = {};
      node = node[char];
    }
    node.isEnd = true;
  }

  search(word) {
    let node = this.root;
    for (const char of word) {
      if (!node[char]) return false;
      node = node[char];
    }
    return node.isEnd === true;
  }

  // Mask abusive words with "*", keep everything else exactly as it was.
  // "you damn fool" -> "you **** fool"
  maskText(text) {
    // split() keeps the separators (spaces, punctuation) in the result,
    // so we only test the words and can rebuild the original layout.
    return text
      .split(/([a-z0-9]+)/i)
      .map((part) => {
        if (!/^[a-z0-9]+$/i.test(part)) return part; // not a word, keep it
        if (!this.search(part.toLowerCase())) return part; // clean word, keep it
        return "*".repeat(part.length); // abusive word, mask every character
      })
      .join("");
  }
}

module.exports = { Trie };
