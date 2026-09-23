// diff-parse.mjs — the one unified-diff parser shared by classify-review.mjs
// and filter-findings.mjs. Two hand-rolled parsers drifted apart; keep one.
//
// Header lines (`--- `, `+++ `, `diff --git`) are recognized only outside a
// hunk. Inside a hunk the `@@` line counts decide what is content, so a removed
// YAML frontmatter line (`----`) or an added `++ x` line is never a header.

/** Decode a git C-style quoted path ("caf\303\251.md") to its UTF-8 string. */
export function unquoteGitPath(value) {
  const text = String(value || "");
  if (!text.startsWith('"') || !text.endsWith('"') || text.length < 2) return text;
  const bytes = [];
  const body = text.slice(1, -1);
  const simple = { n: 10, t: 9, r: 13, b: 8, f: 12, a: 7, v: 11, '"': 34, "\\": 92 };
  for (let i = 0; i < body.length; i += 1) {
    const ch = body[i];
    if (ch !== "\\") {
      bytes.push(...Buffer.from(ch, "utf8"));
      continue;
    }
    const next = body[i + 1];
    if (/[0-7]/.test(next || "")) {
      const octal = /^[0-7]{1,3}/.exec(body.slice(i + 1))[0];
      bytes.push(Number.parseInt(octal, 8));
      i += octal.length;
    } else if (next in simple) {
      bytes.push(simple[next]);
      i += 1;
    } else {
      bytes.push(92);
    }
  }
  return Buffer.from(bytes).toString("utf8");
}

const stripSide = (value) => unquoteGitPath(String(value || "").split("\t")[0].trim()).replace(/^[ab]\//, "");

/** Path from a `diff --git a/X b/Y` header, tolerating spaces and quoting. */
function headerPath(rest) {
  const quoted = /^("(?:\\.|[^"\\])*"|\S+) ("(?:\\.|[^"\\])*")$/.exec(rest);
  if (quoted) return stripSide(quoted[2]);
  const half = (rest.length - 1) / 2;
  if (Number.isInteger(half) && rest[half] === " " && rest.slice(2, half) === rest.slice(half + 3)) {
    return rest.slice(2, half);
  }
  const loose = / b\/(.+)$/.exec(rest);
  return loose ? loose[1] : stripSide(rest);
}

/**
 * Parse a unified diff.
 * Returns { files, hunks, changes }:
 * - files: [{ path, oldPath, status, addedLines, removedLines, added:Set, removedNear:Set }]
 *   `added` holds post-image line numbers; `removedNear` holds the post-image
 *   position of each deletion. A deleted file keeps its old path.
 * - hunks: [{ path, added:[text], removed:[text] }]
 * - changes: [{ path, sign: "+"|"-", text }] for every changed line, including
 *   header-less fragments (path null), so callers can scan changed text.
 */
export function parseGitDiff(text) {
  const files = [];
  const hunks = [];
  const changes = [];
  let file = null;
  let hunk = null;
  let oldLeft = 0;
  let newLeft = 0;
  let newLine = 0;

  const startFile = (path) => {
    file = { path, oldPath: path, status: "modified", addedLines: 0, removedLines: 0, added: new Set(), removedNear: new Set(), hunkCount: 0 };
    files.push(file);
  };
  const closeHunk = () => {
    if (hunk && (hunk.added.length || hunk.removed.length)) hunks.push(hunk);
    hunk = null;
  };
  const record = (sign, body) => {
    changes.push({ path: file ? file.path : null, sign, text: body });
    if (!file) return;
    if (sign === "+") {
      file.addedLines += 1;
      file.added.add(newLine);
      newLine += 1;
      if (hunk) hunk.added.push(body);
    } else {
      file.removedLines += 1;
      file.removedNear.add(newLine);
      if (hunk) hunk.removed.push(body);
    }
  };

  for (const raw of String(text || "").split(/\r?\n/)) {
    const inCountedHunk = hunk && (oldLeft > 0 || newLeft > 0);
    if (inCountedHunk) {
      if (raw.startsWith("\\")) continue;
      const sign = raw[0];
      if (sign === "+") { record("+", raw.slice(1)); newLeft -= 1; continue; }
      if (sign === "-") { record("-", raw.slice(1)); oldLeft -= 1; continue; }
      oldLeft -= 1;
      newLeft -= 1;
      newLine += 1;
      continue;
    }

    if (raw.startsWith("diff --git ")) {
      closeHunk();
      startFile(headerPath(raw.slice("diff --git ".length)));
      continue;
    }
    const counts = /^@@ -\d+(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/.exec(raw);
    if (counts) {
      closeHunk();
      if (!file) startFile(null);
      file.hunkCount += 1;
      hunk = { path: file.path, added: [], removed: [] };
      oldLeft = counts[1] === undefined ? 1 : Number(counts[1]);
      newLine = Number(counts[2]);
      newLeft = counts[3] === undefined ? 1 : Number(counts[3]);
      continue;
    }
    if (raw.startsWith("--- ")) {
      closeHunk();
      if (!file || file.hunkCount > 0) startFile(null);
      const side = raw.slice(4).trim();
      if (side !== "/dev/null") file.oldPath = stripSide(side);
      else file.status = "added";
      if (!file.path) file.path = file.oldPath;
      continue;
    }
    if (raw.startsWith("+++ ")) {
      closeHunk();
      if (!file) startFile(null);
      const side = raw.slice(4).trim();
      if (side === "/dev/null") {
        file.status = "deleted";
        file.path = file.oldPath || file.path;
      } else {
        file.path = stripSide(side);
      }
      continue;
    }
    if (file && !hunk) {
      if (raw.startsWith("new file mode ")) { file.status = "added"; continue; }
      if (raw.startsWith("deleted file mode ")) { file.status = "deleted"; continue; }
      if (raw.startsWith("rename to ")) { file.path = unquoteGitPath(raw.slice("rename to ".length)); continue; }
      if (raw.startsWith("rename from ")) { file.oldPath = unquoteGitPath(raw.slice("rename from ".length)); continue; }
    }
    // Header-less fragments and hand-built hunks whose counts ran out.
    if (raw.startsWith("+") && !raw.startsWith("+++ ")) record("+", raw.slice(1));
    else if (raw.startsWith("-") && !raw.startsWith("--- ")) record("-", raw.slice(1));
    else if (raw.startsWith(" ") && hunk) newLine += 1;
  }
  closeHunk();

  for (const entry of files) {
    if (entry.status === "deleted" && !entry.path) entry.path = entry.oldPath;
    delete entry.hunkCount;
  }
  return { files: files.filter((entry) => entry.path), hunks, changes };
}
