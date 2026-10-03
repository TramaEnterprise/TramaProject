const admin = require("firebase-admin");
const fs = require("fs");
const path = require("path");
const serviceAccount = require("../../serviceAccountKey.json");

const DRY_RUN = process.argv.includes("--dry-run");

admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

// "OL123W" o "/works/OL123W" -> "OL123W" (doc id en Books).
function encodeKey(key) {
  return String(key).split("/").at(-1);
}

// Copia a disco el estado actual de todas las listas (respaldo previo).
async function backupAllLists(usersDocs) {
  const backup = {};
  for (const userDoc of usersDocs) {
    const uid = userDoc.id;
    const listsSnap = await db.collection(`Users/${uid}/lists`).get();
    if (listsSnap.empty) continue;
    backup[uid] = listsSnap.docs.map((d) => ({ _id: d.id, ...d.data() }));
  }
  const out = path.resolve(__dirname, `../../list.backup.${Date.now()}.json`);
  fs.writeFileSync(out, JSON.stringify(backup, null, 2), "utf8");
  console.log(`Backup escrito en ${out}`);
}

// Reconstruye un ListBook limpio con los datos frescos de Books.
function refreshListBook(oldBook, bookData) {
  return {
    key: oldBook.key,
    title: bookData.titles?.es ?? bookData.titles?.en ?? oldBook.title ?? "",
    authors: bookData.authors ?? oldBook.authors ?? [],
    cover_url: bookData.cover_url ?? null,
    rating: bookData.rating ?? null,
    ratingCount: bookData.ratingCount ?? null,
  };
}

// ¿Cambió algún campo relevante respecto al snapshot viejo?
function isChanged(oldB, newB) {
  return (
    (oldB.title ?? "") !== newB.title ||
    JSON.stringify(oldB.authors ?? []) !== JSON.stringify(newB.authors) ||
    (oldB.cover_url ?? null) !== newB.cover_url ||
    (oldB.rating ?? null) !== newB.rating ||
    (oldB.ratingCount ?? null) !== newB.ratingCount
  );
}

async function main() {
  const users = await db.collection("Users").get();

  if (!DRY_RUN) {
    await backupAllLists(users.docs);
  }

  let usersScanned = 0;
  let listsScanned = 0;
  let listsToUpdate = 0;
  let booksScanned = 0;
  let booksRefreshed = 0;
  let booksMissing = 0;

  for (const userDoc of users.docs) {
    usersScanned++;
    const uid = userDoc.id;

    const listsSnap = await db.collection(`Users/${uid}/lists`).get();
    if (listsSnap.empty) continue;

    for (const listDoc of listsSnap.docs) {
      listsScanned++;
      const data = listDoc.data();
      const books = Array.isArray(data.books) ? data.books : [];
      if (books.length === 0) continue;

      let listChanged = false;
      const newBooks = [];

      for (const oldBook of books) {
        booksScanned++;
        const id = encodeKey(oldBook.key);
        const bookSnap = await db.collection("Books").doc(id).get();

        if (!bookSnap.exists) {
          booksMissing++;
          newBooks.push(oldBook); // se deja igual, no se borra
          console.log(
            `${DRY_RUN ? "[DRY-RUN] " : ""}  MISS ${uid}/${listDoc.id}/${id}: no existe en Books`
          );
          continue;
        }

        const refreshed = refreshListBook(oldBook, bookSnap.data());
        if (isChanged(oldBook, refreshed)) {
          booksRefreshed++;
          listChanged = true;
          console.log(
            `${DRY_RUN ? "[DRY-RUN] " : ""}  ${uid}/${listDoc.id}/${id}: ` +
              `rating ${oldBook.rating ?? "-"} -> ${refreshed.rating ?? "-"}`
          );
        }
        newBooks.push(refreshed);
      }

      if (listChanged) {
        listsToUpdate++;
        if (!DRY_RUN) {
          await listDoc.ref.update({ books: newBooks });
        }
      }
    }
  }

  console.log(
    `${DRY_RUN ? "[DRY-RUN] " : ""}FIN — usuarios: ${usersScanned}, listas: ${listsScanned}, ` +
      `${DRY_RUN ? "listas a actualizar" : "listas actualizadas"}: ${listsToUpdate}, ` +
      `libros: ${booksScanned}, refrescados: ${booksRefreshed}, ausentes en Books: ${booksMissing}`
  );
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
