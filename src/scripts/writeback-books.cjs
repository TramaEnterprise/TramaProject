// src/scripts/writeback-books.cjs
// Sobreescribe Books con los `after` de books.review.json (solo campos cambiados).
// Hace backup del estado actual primero. Regenera derivados al cambiar títulos.
//   npx tsx src/scripts/writeback-books.cjs --dry-run   (revisar)
//   npx tsx src/scripts/writeback-books.cjs             (real)
const admin = require("firebase-admin");
const fs = require("fs");
const path = require("path");
const serviceAccount = require("../../serviceAccountKey.json");
const {
  buildTitleTokensMap,
  buildTitleNormMap,
  buildAuthorTokens,
} = require("../utils/titleSearch.ts");

const DRY_RUN = process.argv.includes("--dry-run");
const IN = path.resolve(__dirname, "../../books.review.json");

admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

function encodeKey(workKey) {
  return workKey.split("/").at(-1) ?? workKey;
}

// Patch de los campos realmente cambiados entre before y after.
function buildPatch(entry, srcData) {
  const { before, after } = entry;
  const patch = {};
  let titleChanged = false;

  for (const lang of ["es", "en"]) {
    const bt = before.titles[lang] ?? null;
    const at = after.titles[lang] ?? null;
    if (at && at !== bt) { patch[`titles.${lang}`] = at; titleChanged = true; }

    const bs = before.synopsis[lang] ?? null;
    const as = after.synopsis[lang] ?? null;
    // Permite tanto añadir como vaciar (string vacío) la sinopsis por idioma
    if (as !== bs) patch[`synopsis.${lang}`] = as ?? "";
  }
  if ((after.cover_url ?? null) !== (before.cover_url ?? null) && after.cover_url) {
    patch.cover_url = after.cover_url;
  }
  if ((after.pages ?? null) !== (before.pages ?? null) && after.pages) {
    patch.pages = after.pages;
  }

  // Regenerar derivados de búsqueda si cambió algún título.
  if (titleChanged) {
    const titles = { ...(srcData.titles ?? {}), ...after.titles };
    patch.titleTokens = buildTitleTokensMap(titles, srcData.title, srcData.langs);
    patch.titleNorm = buildTitleNormMap(titles, srcData.title, srcData.langs);
    patch.authorTokens = buildAuthorTokens(srcData.authors ?? []);
  }
  return patch;
}

async function main() {
  const entries = JSON.parse(fs.readFileSync(IN, "utf8"));
  const booksRef = db.collection("Books");

  // --- Backup del estado actual ---
  if (!DRY_RUN) {
    const snap = await booksRef.get();
    const backup = snap.docs.map((d) => ({ _id: d.id, ...d.data() }));
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const backupPath = path.resolve(__dirname, `../../books.backup.${stamp}.json`);
    fs.writeFileSync(backupPath, JSON.stringify(backup, null, 2), "utf8");
    console.log(`backup escrito: ${backupPath} (${backup.length} libros)`);
  }

  let updated = 0, skipped = 0, missing = 0;
  let batch = db.batch();
  let batchWrites = 0;

  for (const entry of entries) {
    const ref = booksRef.doc(encodeKey(entry.key));
    const cur = await ref.get();
    if (!cur.exists) { missing++; continue; }

    const patch = buildPatch(entry, cur.data());
    if (Object.keys(patch).length === 0) { skipped++; continue; }

    updated++;
    if (DRY_RUN) {
      console.log(`[DRY] ${encodeKey(entry.key)}: ${Object.keys(patch).join(", ")}`);
    } else {
      batch.update(ref, patch);
      if (++batchWrites >= 400) { await batch.commit(); batch = db.batch(); batchWrites = 0; }
    }
  }
  if (!DRY_RUN && batchWrites > 0) await batch.commit();

  console.log(
    `${DRY_RUN ? "[DRY-RUN] " : ""}FIN — actualizados: ${updated}, sin cambios: ${skipped}, no encontrados: ${missing}`
  );
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
