import type { Book } from "@/types/Book";
import type { GoodreadsRow } from "./goodreadsCsv";
import {
  saveBooksToDB,
  searchBooksByIsbnFromDB,
  searchBooksFromDB,
} from "@/services/firebase/firebaseBooks";
import { searchBooks } from "@/services/api/openLibraryApi";
import { scoreAuthorRelevance } from "@/utils/titleSearch";

const AUTHOR_MATCH_THRESHOLD = 0.4;

function authorMatches(row: GoodreadsRow, book: Book): boolean {
  if (!row.author) return true;
  return scoreAuthorRelevance(row.author, book.authors ?? []) >= AUTHOR_MATCH_THRESHOLD;
}

async function safe<T>(p: Promise<T>, fallback: T): Promise<T> {
  try {
    return await p;
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") throw err;
    return fallback;
  }
}

export async function matchBook(
  row: GoodreadsRow,
  lang: string,
  signal: AbortSignal
): Promise<Book | null> {
  const isbns = [row.isbn13, row.isbn].filter((x): x is string => !!x);

  // 1. DB por ISBN
  for (const isbn of isbns) {
    const hits = await safe(searchBooksByIsbnFromDB(isbn, lang, 1), [] as Book[]);
    if (hits[0]) return hits[0];
  }

  // 2. DB por título + verificación de autor
  if (row.title) {
    const hits = await safe(searchBooksFromDB(row.title, lang, 5), [] as Book[]);
    const match = hits.find((b) => authorMatches(row, b));
    if (match) return match;
  }

  // 3. OpenLibrary por ISBN
  for (const isbn of isbns) {
    const res = await safe(searchBooks({ isbn }, 1, lang, signal), {
      books: [] as Book[],
      totalResults: 0,
    });
    const book = res.books[0];
    if (book) {
      await safe(saveBooksToDB([book], lang), undefined);
      return book;
    }
  }

  // 4. OpenLibrary por título + autor
  if (row.title) {
    const res = await safe(
      searchBooks({ title: row.title, author: row.author }, 5, lang, signal),
      { books: [] as Book[], totalResults: 0 }
    );
    const match = res.books.find((b) => authorMatches(row, b));
    if (match) {
      await safe(saveBooksToDB([match], lang), undefined);
      return match;
    }
  }

  return null;
}
