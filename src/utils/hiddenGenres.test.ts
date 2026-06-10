import { describe, it, expect } from "vitest";
import { isVisibleBook, filterVisibleBooks, HIDDEN_GENRES } from "./hiddenGenres";

describe("isVisibleBook", () => {
  it("oculta un libro cuyo género primario está en la lista", () => {
    expect(isVisibleBook({ genre: "Humor" })).toBe(false);
    expect(isVisibleBook({ genre: "Young Adult" })).toBe(false);
    expect(isVisibleBook({ genre: "Short Stories" })).toBe(false);
    expect(isVisibleBook({ genre: "Non-Fiction" })).toBe(false);
  });

  it("oculta un libro si el género secundario está en la lista", () => {
    expect(isVisibleBook({ genre: "Fantasy", genre2: "Humor" })).toBe(false);
  });

  it("muestra un libro cuyos géneros no están en la lista", () => {
    expect(isVisibleBook({ genre: "Fantasy", genre2: "Romance" })).toBe(true);
    expect(isVisibleBook({ genre: "Literature" })).toBe(true);
  });

  it("muestra un libro sin género definido", () => {
    expect(isVisibleBook({})).toBe(true);
  });
});

describe("filterVisibleBooks", () => {
  it("elimina solo los libros con género oculto", () => {
    const books = [
      { key: "a", genre: "Fantasy" },
      { key: "b", genre: "Humor" },
      { key: "c", genre: "Science Fiction", genre2: "Short Stories" },
      { key: "d", genre: "Literature" },
    ];
    expect(filterVisibleBooks(books).map((b) => b.key)).toEqual(["a", "d"]);
  });
});

describe("HIDDEN_GENRES", () => {
  it("contiene exactamente los cuatro géneros ocultos", () => {
    expect([...HIDDEN_GENRES].sort()).toEqual(
      ["Humor", "Non-Fiction", "Short Stories", "Young Adult"].sort()
    );
  });
});
