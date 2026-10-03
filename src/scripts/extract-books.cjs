// src/scripts/extract-books.cjs
// Vuelca TODA la colección Books a books.full.json (snapshot crudo).
//   npx tsx src/scripts/extract-books.cjs
const admin = require("firebase-admin");
const fs = require("fs");
const path = require("path");
const serviceAccount = require("../../serviceAccountKey.json");

const PAGE_SIZE = 400;
const OUT = path.resolve(__dirname, "../../books.full.json");

admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

async function main() {
  const booksRef = db.collection("Books");
  let lastDoc = null;
  const all = [];

  for (;;) {
    let q = booksRef.orderBy(admin.firestore.FieldPath.documentId()).limit(PAGE_SIZE);
    if (lastDoc) q = q.startAfter(lastDoc);

    const snap = await q.get();
    if (snap.empty) break;

    for (const docSnap of snap.docs) {
      all.push({ _id: docSnap.id, ...docSnap.data() });
    }

    lastDoc = snap.docs[snap.docs.length - 1];
    console.log(`extraídos: ${all.length}`);
    if (snap.size < PAGE_SIZE) break;
  }

  fs.writeFileSync(OUT, JSON.stringify(all, null, 2), "utf8");
  console.log(`FIN — ${all.length} libros escritos en ${OUT}`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
