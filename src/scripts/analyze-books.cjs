// src/scripts/analyze-books.cjs
// Lee books.full.json -> aplica auto-correcciones + detección + relleno Google Books
// -> escribe books.review.json (ordenado por prioridad desc).
//   npx tsx src/scripts/analyze-books.cjs
const fs = require("fs");
const path = require("path");
const { analyzeBook } = require("./lib/bookCleanup.ts");
const { fetchWithRetry } = require("./lib/googleBooksFill.ts");

const IN = path.resolve(__dirname, "../../books.full.json");
const OUT = path.resolve(__dirname, "../../books.review.json");
const GOOGLE_KEY = process.env.VITE_GOOGLE_BOOKS_API_KEY;
const GB = "https://www.googleapis.com/books/v1/volumes";

// Intenta rellenar pages desde Google Books por ISBN. best-effort.
async function tryFillPages(isbn) {
  if (!GOOGLE_KEY || !isbn) return null;
  try {
    const url = `${GB}?q=isbn:${encodeURIComponent(isbn)}&key=${GOOGLE_KEY}`;
    const res = await fetchWithRetry(url, { retries: 3, baseDelay: 300 });
    if (!res.ok) return null;
    const json = await res.json();
    const count = json.items?.[0]?.volumeInfo?.pageCount;
    return typeof count === "number" && count > 0 ? count : null;
  } catch {
    return null;
  }
}

async function main() {
  const raw = JSON.parse(fs.readFileSync(IN, "utf8"));
  const bySrcKey = new Map(raw.map((b) => [b.key, b]));
  const entries = raw.map(analyzeBook);

  let filled = 0;
  for (const entry of entries) {
    // Solo intentamos relleno barato de pages (Google Books). El resto -> Claude.
    if (entry.flags.includes("pages missing")) {
      const src = bySrcKey.get(entry.key);
      const isbn = src?.isbns?.es ?? src?.isbns?.en ?? src?.isbn;
      const pages = await tryFillPages(isbn);
      if (pages) {
        entry.after.pages = pages;
        entry.changes.push("pages: filled from Google Books");
        entry.flags = entry.flags.filter((f) => f !== "pages missing");
        if (entry.flags.length === 0) entry.status = "auto-ok";
        filled++;
      }
    }
  }

  entries.sort((a, b) => b.priority - a.priority);
  fs.writeFileSync(OUT, JSON.stringify(entries, null, 2), "utf8");

  const needsClaude = entries.filter((e) => e.status === "needs-claude").length;
  const autoOk = entries.filter((e) => e.status === "auto-ok").length;
  console.log(
    `FIN — ${entries.length} libros | auto-ok: ${autoOk} | needs-claude: ${needsClaude} | ` +
      `pages rellenadas (Google): ${filled}`
  );
  if (!GOOGLE_KEY) console.log("AVISO: sin VITE_GOOGLE_BOOKS_API_KEY -> sin relleno Google Books.");
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
