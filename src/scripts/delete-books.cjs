// src/scripts/delete-books.cjs
// Borra de Firestore los docs listados en books.todelete.json. Backup previo.
//   npx tsx src/scripts/delete-books.cjs --dry-run   (revisar)
//   npx tsx src/scripts/delete-books.cjs             (real)
const admin = require("firebase-admin");
const fs = require("fs");
const path = require("path");
const serviceAccount = require("../../serviceAccountKey.json");

const DRY_RUN = process.argv.includes("--dry-run");
const IN = path.resolve(__dirname, "../../books.todelete.json");

admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

function encodeKey(workKey) {
  return workKey.split("/").at(-1) ?? workKey;
}

async function main() {
  const list = JSON.parse(fs.readFileSync(IN, "utf8"));
  const booksRef = db.collection("Books");

  // Leer (y respaldar) los docs a borrar
  const found = [];
  for (const { key } of list) {
    const id = encodeKey(key);
    const snap = await booksRef.doc(id).get();
    if (snap.exists) found.push({ _id: id, ...snap.data() });
  }
  console.log(`en la lista: ${list.length} | encontrados en Firestore: ${found.length}`);

  if (!DRY_RUN) {
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const backupPath = path.resolve(__dirname, `../../books.backup.deleted-${stamp}.json`);
    fs.writeFileSync(backupPath, JSON.stringify(found, null, 2), "utf8");
    console.log(`backup de los borrados: ${backupPath}`);
  }

  let deleted = 0;
  let batch = db.batch();
  let n = 0;
  for (const doc of found) {
    if (DRY_RUN) {
      console.log(`[DRY] borraría ${doc._id}  (${doc.titles?.es || doc.titles?.en || doc.title || "?"})`);
    } else {
      batch.delete(booksRef.doc(doc._id));
      if (++n >= 400) { await batch.commit(); batch = db.batch(); n = 0; }
    }
    deleted++;
  }
  if (!DRY_RUN && n > 0) await batch.commit();

  console.log(`${DRY_RUN ? "[DRY-RUN] " : ""}FIN — ${DRY_RUN ? "se borrarían" : "borrados"}: ${deleted}`);
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
