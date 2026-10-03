import { describe, it, expect, vi, beforeEach } from "vitest";

const batchMock = { set: vi.fn(), commit: vi.fn(() => Promise.resolve()) };

vi.mock("firebase/firestore", () => ({
  arrayUnion: vi.fn((v: unknown) => ({ __arrayUnion: v })),
  collection: vi.fn(),
  doc: vi.fn((_db: unknown, _col: string, id: string) => ({ id })),
  getDoc: vi.fn(),
  getDocs: vi.fn(),
  increment: vi.fn(),
  limit: vi.fn(),
  orderBy: vi.fn(),
  query: vi.fn(),
  setDoc: vi.fn(() => Promise.resolve()),
  updateDoc: vi.fn(() => Promise.resolve()),
  where: vi.fn(),
  writeBatch: vi.fn(() => batchMock),
}));
vi.mock("./firebaseInit", () => ({ db: {} }));
vi.mock("@/services/api/openLibraryApi", () => ({
  fetchWorkEditionByLang: vi.fn(() => Promise.resolve(null)),
  searchBooks: vi.fn(),
}));

import { updateBookTitleToDB, saveBooksToDB } from "./firebaseBooks";
import { getDoc, updateDoc } from "firebase/firestore";
import type { Book } from "@/types/Book";

type Mock = ReturnType<typeof vi.fn>;

function snapshot(data: Record<string, unknown> | null) {
  return { exists: () => data !== null, data: () => data ?? {} };
}

const book: Book = {
  key: "/works/OL1W",
  title: "Título de OpenLibrary",
  authors: ["Autor"],
  first_publish_year: 2000,
  cover_id: 123,
  cover_url: "https://ol/cover.jpg",
  edition_count: 1,
};

beforeEach(() => vi.clearAllMocks());

describe("updateBookTitleToDB — rellena solo si falta", () => {
  it("NO sobrescribe un título ya presente en ese idioma", async () => {
    (getDoc as Mock).mockResolvedValue(snapshot({ titles: { es: "Mi título curado" } }));
    await updateBookTitleToDB("/works/OL1W", "Título OL", "es");
    expect(updateDoc).not.toHaveBeenCalled();
  });

  it("rellena el título cuando falta en ese idioma", async () => {
    (getDoc as Mock).mockResolvedValue(snapshot({ titles: { en: "Only EN" } }));
    await updateBookTitleToDB("/works/OL1W", "Título ES", "es");
    expect(updateDoc).toHaveBeenCalledTimes(1);
    const written = (updateDoc as Mock).mock.calls[0][1];
    expect(written["titles.es"]).toBe("Título ES");
  });
});

describe("saveBooksToDB — solo inserta libros nuevos", () => {
  it("NO toca un libro que ya existe (doc con authors)", async () => {
    (getDoc as Mock).mockResolvedValue(snapshot({ authors: ["Autor"], titles: { es: "X" } }));
    await saveBooksToDB([book], "es");
    expect(batchMock.set).not.toHaveBeenCalled();
    expect(updateDoc).not.toHaveBeenCalled();
  });

  it("inserta un libro nuevo (no existe) con portada y título", async () => {
    (getDoc as Mock).mockResolvedValue(snapshot(null));
    await saveBooksToDB([book], "es");
    const written = batchMock.set.mock.calls[0][1] as Record<string, unknown>;
    expect(written.cover_url).toBe("https://ol/cover.jpg");
    expect(written.cover_id).toBe(123);
    expect(updateDoc).toHaveBeenCalled();
  });

  it("completa un doc parcial sin authors (p.ej. creado solo por sinopsis)", async () => {
    (getDoc as Mock).mockResolvedValue(snapshot({ synopsis: { es: "..." } }));
    await saveBooksToDB([book], "es");
    expect(batchMock.set).toHaveBeenCalled();
  });
});
