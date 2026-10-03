import type { Book } from "@/types/Book";
import { detectGenres } from "./genreDetection";

export const HIDDEN_GENRES: ReadonlySet<string> = new Set([
  "Humor",
  "Young Adult",
  "Short Stories",
  "Non-Fiction",
]);

export function isVisibleBook(book: Pick<Book, "genre" | "genre2">): boolean {
  return !HIDDEN_GENRES.has(book.genre ?? "") && !HIDDEN_GENRES.has(book.genre2 ?? "");
}

export function filterVisibleBooks<T extends Pick<Book, "genre" | "genre2">>(books: T[]): T[] {
  return books.filter(isVisibleBook);
}

export function hasVisibleSubjects(subjects: string[] | undefined): boolean {
  return !detectGenres(subjects).some((g) => HIDDEN_GENRES.has(g));
}
