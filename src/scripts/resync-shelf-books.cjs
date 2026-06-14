// src/scripts/resync-shelf-books.cjs
// Re-sincroniza el snapshot del libro en cada estantería desde la colección Books.
// Migra la nota a 'userRating' y recupera la 'review' antigua desde el evento
// book_rated. Preserva el resto de campos del usuario (status, currentPage,
// addedAt, lastProgressAt).
//   npx tsx src/scripts/resync-shelf-books.cjs --dry-run
//   npx tsx src/scripts/resync-shelf-books.cjs
const admin = require("firebase-admin");
const fs = require("fs");
const path = require("path");
const serviceAccount = require("../../serviceAccountKey.json");

const DRY_RUN = process.argv.includes("--dry-run");

admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

// Campos del libro que se sincronizan desde Books hacia el snapshot de estantería.
const BOOK_FIELDS = [
  "titles",
  "isbns",
  "cover_url",
  "cover_id",
  "pages",
  "genre",
  "genre2",
  "topics",
  "authors",
  "authorKeys",
  "first_publish_year",
  "edition_count",
  "rating",
  "ratingCount",
  "isbn",
  "langs",
];

// Copia a un backup en disco el estado actual de todas las estanterías.
async function backupAllShelves(usersDocs) {
  const backup = {};
  for (const userDoc of usersDocs) {
    const uid = userDoc.id;
    const shelfSnap = await db.collection(`Users/${uid}/Shelf`).get();
    if (shelfSnap.empty) continue;
    backup[uid] = shelfSnap.docs.map((d) => ({ _id: d.id, ...d.data() }));
  }
  const out = path.resolve(__dirname, `../../shelf.backup.${Date.now()}.json`);
  fs.writeFileSync(out, JSON.stringify(backup, null, 2), "utf8");
  console.log(`Backup escrito en ${out}`);
}

// Mapa: bookId (encodeKey) -> { rating, note } del evento book_rated más reciente.
async function buildRatedMap(uid) {
  const snap = await db
    .collection(`Users/${uid}/activity`)
    .where("type", "==", "book_rated")
    .get();

  const byBook = new Map(); // id -> { rating, note, ms }
  for (const d of snap.docs) {
    const data = d.data();
    if (!data.bookId) continue;
    const id = data.bookId.split("/").at(-1); // encodeKey("/works/OL1W") -> "OL1W"
    const ms = data.createdAt && data.createdAt.toMillis ? data.createdAt.toMillis() : 0;
    const prev = byBook.get(id);
    if (!prev || ms >= prev.ms) {
      byBook.set(id, {
        rating: typeof data.rating === "number" ? data.rating : undefined,
        note: typeof data.note === "string" ? data.note : undefined,
        ms,
      });
    }
  }
  return byBook;
}

// Extrae del doc de Books solo los campos del libro definidos en BOOK_FIELDS.
function pickBookFields(bookData) {
  const update = {};
  for (const f of BOOK_FIELDS) {
    if (bookData[f] !== undefined) update[f] = bookData[f];
  }
  return update;
}

async function main() {
  const users = await db.collection("Users").get();

  if (!DRY_RUN) {
    await backupAllShelves(users.docs);
  }

  let usersScanned = 0;
  let entriesScanned = 0;
  let entriesToUpdate = 0;
  let entriesSkipped = 0;
  let ratingsFromActivity = 0;
  let ratingsFromHeuristic = 0;
  let reviewsRecovered = 0;

  for (const userDoc of users.docs) {
    usersScanned++;
    const uid = userDoc.id;

    const shelfSnap = await db.collection(`Users/${uid}/Shelf`).get();
    if (shelfSnap.empty) continue;

    const ratedMap = await buildRatedMap(uid);

    for (const shelfDoc of shelfSnap.docs) {
      entriesScanned++;
      const bookId = shelfDoc.id;
      const shelfData = shelfDoc.data();

      const bookSnap = await db.collection("Books").doc(bookId).get();
      if (!bookSnap.exists) {
        entriesSkipped++;
        console.log(
          `${DRY_RUN ? "[DRY-RUN] " : ""}SKIP ${uid}/${bookId}: no existe en Books`
        );
        continue;
      }

      const update = pickBookFields(bookSnap.data());
      const rated = ratedMap.get(bookId);

      // --- Valoración ---
      // 1) Fuente fiable: evento book_rated.
      let userRating = rated && rated.rating !== undefined ? rated.rating : undefined;
      let ratingSource = userRating !== undefined ? "activity" : null;
      // 2) Fallback heurístico: nota vieja del doc con paso 0.5 que NO sea la media
      //    (coincidir con la media indicaría que es la media filtrada por la colisión).
      if (userRating === undefined) {
        const oldRating = shelfData.rating;
        const bookAvg = bookSnap.data().rating;
        if (
          typeof oldRating === "number" &&
          oldRating > 0 &&
          Number.isInteger(oldRating * 2) &&
          oldRating !== bookAvg
        ) {
          userRating = oldRating;
          ratingSource = "heuristic";
        }
      }
      if (userRating !== undefined) {
        update.userRating = userRating;
        if (ratingSource === "activity") ratingsFromActivity++;
        else ratingsFromHeuristic++;
      }

      // --- Reseña ---
      // Recuperar la reseña vieja desde book_rated.note SOLO si el doc no tiene ya
      // una reseña (no pisar reseñas nuevas ya correctas).
      const existingReview = shelfData.review;
      const hasReview = typeof existingReview === "string" && existingReview.trim().length > 0;
      if (!hasReview && rated && rated.note && rated.note.trim().length > 0) {
        update.review = rated.note;
        reviewsRecovered++;
      }

      entriesToUpdate++;

      console.log(
        `${DRY_RUN ? "[DRY-RUN] " : ""}${uid}/${bookId}: ${Object.keys(update).join(", ")}` +
          (userRating !== undefined ? ` (userRating=${userRating} via ${ratingSource})` : "") +
          (update.review !== undefined ? " (+review)" : "")
      );

      if (!DRY_RUN) {
        await shelfDoc.ref.update(update);
      }
    }
  }

  console.log(
    `${DRY_RUN ? "[DRY-RUN] " : ""}FIN — usuarios: ${usersScanned}, ` +
      `entradas: ${entriesScanned}, ${DRY_RUN ? "se actualizarían" : "actualizadas"}: ${entriesToUpdate}, ` +
      `saltadas: ${entriesSkipped}, ratings (book_rated): ${ratingsFromActivity}, ` +
      `ratings (heurística): ${ratingsFromHeuristic}, reviews recuperadas: ${reviewsRecovered}`
  );
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
