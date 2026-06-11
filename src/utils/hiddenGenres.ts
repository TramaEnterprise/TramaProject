import type { Book } from "@/types/Book";

/**
 * Géneros que nunca deben mostrarse en listados de la web (explorar, búsqueda,
 * recomendaciones, etc.).
 *
 * Los libros de estos géneros se siguen **obteniendo y cacheando** con
 * normalidad (la importación de Goodreads, la búsqueda por ISBN para emparejar,
 * la sinopsis y la ficha de detalle por enlace directo siguen funcionando); el
 * filtrado se aplica solo en los puntos donde se *renderiza* una lista.
 *
 * Nota: "Non-Fiction" se mantiene aquí porque sigue existiendo en libros
 * cacheados de antes. Para los libros nuevos, la detección ya no usa
 * "Non-Fiction" como fallback — usa "Literature" (ver `genreDetection.ts`).
 */
export const HIDDEN_GENRES: ReadonlySet<string> = new Set([
  "Humor",
  "Young Adult",
  "Short Stories",
  "Non-Fiction",
]);

/** `true` si ninguno de los géneros del libro (primario ni secundario) está oculto. */
export function isVisibleBook(book: Pick<Book, "genre" | "genre2">): boolean {
  return !HIDDEN_GENRES.has(book.genre ?? "") && !HIDDEN_GENRES.has(book.genre2 ?? "");
}

/** Devuelve solo los libros cuyo género no está en la lista de ocultos. */
export function filterVisibleBooks<T extends Pick<Book, "genre" | "genre2">>(books: T[]): T[] {
  return books.filter(isVisibleBook);
}
