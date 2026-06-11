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

import { addToShelf } from "./firebaseLibrary";
import { setDoc } from "firebase/firestore";
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
      rating: 5,
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
