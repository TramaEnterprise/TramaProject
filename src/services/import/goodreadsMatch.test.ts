import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/services/firebase/firebaseBooks", () => ({
  searchBooksByIsbnFromDB: vi.fn(),
  searchBooksFromDB: vi.fn(),
  saveBooksToDB: vi.fn(() => Promise.resolve()),
}));
vi.mock("@/services/api/openLibraryApi", () => ({ searchBooks: vi.fn() }));

import { matchBook } from "./goodreadsMatch";
import {
  searchBooksByIsbnFromDB,
  searchBooksFromDB,
  saveBooksToDB,
} from "@/services/firebase/firebaseBooks";
import { searchBooks } from "@/services/api/openLibraryApi";
import type { GoodreadsRow } from "./goodreadsCsv";
import type { Book } from "@/types/Book";

const mk = (over: Partial<Book> = {}): Book => ({
  key: "/works/OL1W",
  title: "Dune",
  authors: ["Frank Herbert"],
  first_publish_year: 1965,
  cover_id: null,
  edition_count: 1,
  ...over,
});

const row: GoodreadsRow = {
  title: "Dune",
  author: "Frank Herbert",
  isbn13: "9780441013593",
  status: "finished",
};

const signal = new AbortController().signal;

beforeEach(() => vi.clearAllMocks());

describe("matchBook", () => {
  it("devuelve match de la DB por ISBN sin llamar a OpenLibrary", async () => {
    (searchBooksByIsbnFromDB as ReturnType<typeof vi.fn>).mockResolvedValue([mk()]);
    const result = await matchBook(row, "es", signal);
    expect(result?.key).toBe("/works/OL1W");
    expect(searchBooks).not.toHaveBeenCalled();
  });

  it("cae a OpenLibrary por título+autor y persiste el resultado", async () => {
    (searchBooksByIsbnFromDB as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (searchBooksFromDB as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (searchBooks as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({ books: [], totalResults: 0 }) // por ISBN
      .mockResolvedValueOnce({ books: [mk()], totalResults: 1 }); // por título+autor
    const result = await matchBook(row, "es", signal);
    expect(result?.key).toBe("/works/OL1W");
    expect(saveBooksToDB).toHaveBeenCalled();
  });

  it("descarta resultados cuyo autor no coincide", async () => {
    (searchBooksByIsbnFromDB as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (searchBooksFromDB as ReturnType<typeof vi.fn>).mockResolvedValue([
      mk({ authors: ["Otro Autor Totalmente Distinto"] }),
    ]);
    (searchBooks as ReturnType<typeof vi.fn>).mockResolvedValue({ books: [], totalResults: 0 });
    const result = await matchBook(row, "es", signal);
    expect(result).toBeNull();
  });

  it("devuelve null si nada hace match", async () => {
    (searchBooksByIsbnFromDB as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (searchBooksFromDB as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (searchBooks as ReturnType<typeof vi.fn>).mockResolvedValue({ books: [], totalResults: 0 });
    expect(await matchBook(row, "es", signal)).toBeNull();
  });
});
