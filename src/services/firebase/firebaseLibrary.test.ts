import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("firebase/firestore", () => ({
  collection: vi.fn(),
  deleteDoc: vi.fn(),
  doc: vi.fn(() => ({})),
  getDoc: vi.fn(),
  getDocs: vi.fn(),
  setDoc: vi.fn(() => Promise.resolve()),
  updateDoc: vi.fn(() => Promise.resolve()),
}));
vi.mock("./firebaseInit", () => ({ db: {} }));
vi.mock("./firebaseActivity", () => ({
  deleteActivitiesByTypeAndBook: vi.fn(),
  deleteProgressActivitiesAbove: vi.fn(),
  logActivity: vi.fn(() => Promise.resolve()),
}));
vi.mock("./firebaseBooks", () => ({ incrementBookAddCount: vi.fn(() => Promise.resolve()) }));

import { addToShelf, getShelf, updateReadingProgress } from "./firebaseLibrary";
import { getDocs, setDoc, updateDoc } from "firebase/firestore";
import { logActivity } from "./firebaseActivity";
import { incrementBookAddCount } from "./firebaseBooks";
import type { Book } from "@/types/Book";

const book: Book = {
  key: "/works/OL1W",
  title: "Dune",
  authors: ["Frank Herbert"],
  first_publish_year: 1965,
  cover_id: null,
  edition_count: 1,
};

beforeEach(() => vi.clearAllMocks());

describe("addToShelf silent", () => {
  it("no registra actividad ni tendencias cuando silent=true", async () => {
    await addToShelf("uid1", book, "finished", null, {
      silent: true,
      rating: 5,
      review: "Epic",
      addedAt: "2021-05-01T00:00:00.000Z",
    });

    expect(setDoc).toHaveBeenCalled();
    const writtenData = (setDoc as unknown as ReturnType<typeof vi.fn>).mock.calls[0][1];
    expect(writtenData).toMatchObject({
      status: "finished",
      addedAt: "2021-05-01T00:00:00.000Z",
      userRating: 5,
      review: "Epic",
    });
    expect(logActivity).not.toHaveBeenCalled();
    expect(incrementBookAddCount).not.toHaveBeenCalled();
  });

  it("registra actividad cuando no es silent", async () => {
    await addToShelf("uid1", book, "finished", null);
    expect(logActivity).toHaveBeenCalled();
    expect(incrementBookAddCount).toHaveBeenCalled();
  });
});

describe("updateReadingProgress userRating", () => {
  it("guarda la nota del usuario en userRating al terminar el libro", async () => {
    const entry = {
      book: { ...book, pages: 100 },
      status: "reading" as const,
      currentPage: 50,
    };
    await updateReadingProgress("uid1", entry, 100, undefined, 4.5, "Genial");

    const written = (updateDoc as unknown as ReturnType<typeof vi.fn>).mock.calls[0][1];
    expect(written).toMatchObject({ status: "finished", userRating: 4.5, review: "Genial" });
    expect(written).not.toHaveProperty("rating");
  });
});

describe("getShelf separa rating y userRating", () => {
  it("entry.rating es la nota del usuario; book.rating es la media del libro", async () => {
    (getDocs as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      size: 1,
      docs: [
        {
          data: () => ({
            key: "/works/OL1W",
            authors: ["Frank Herbert"],
            titles: { es: "Dune" },
            status: "finished",
            rating: 4.66, // media del libro
            userRating: 4.5, // nota del usuario
          }),
        },
      ],
    });

    const shelf = await getShelf("uid1");
    expect(shelf).not.toBeNull();
    expect(shelf![0].rating).toBe(4.5); 
    expect(shelf![0].book.rating).toBe(4.66); 
  });
});

describe("updateReadingProgress con status override finished", () => {
  it("persiste userRating y review aunque se pase status='finished' explícito", async () => {
    const entry = {
      book: { ...book, pages: 100 },
      status: "reading" as const,
      currentPage: 50,
    };
    await updateReadingProgress("uid1", entry, 100, undefined, 4.5, "Una maravilla", "finished");

    const written = (updateDoc as unknown as ReturnType<typeof vi.fn>).mock.calls[0][1];
    expect(written).toMatchObject({ status: "finished", userRating: 4.5, review: "Una maravilla" });
  });
});
