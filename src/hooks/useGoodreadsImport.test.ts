import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";

vi.mock("@/context/auth/useAuth", () => ({ useAuth: () => ({ user: { uid: "uid1" } }) }));
vi.mock("@/plugins/i18n/useCurrentLanguage", () => ({
  useCurrentLanguage: () => ({ lang: "es" }),
}));
const getStatus = vi.fn((): ShelfStatus | null => null);
const reload = vi.fn(() => Promise.resolve());
vi.mock("@/context/shelf/useShelf", () => ({
  useShelf: () => ({ getStatus, reload }),
}));
vi.mock("@/services/import/goodreadsMatch", () => ({ matchBook: vi.fn() }));
vi.mock("@/services/firebase/firebaseLibrary", () => ({
  addToShelf: vi.fn(() => Promise.resolve()),
}));

import { useGoodreadsImport } from "./useGoodreadsImport";
import { matchBook } from "@/services/import/goodreadsMatch";
import { addToShelf } from "@/services/firebase/firebaseLibrary";
import type { Book } from "@/types/Book";
import type { ShelfStatus } from "@/types/BookDetail";

const book: Book = {
  key: "/works/OL1W",
  title: "Dune",
  authors: ["Frank Herbert"],
  first_publish_year: 1965,
  cover_id: null,
  edition_count: 1,
};

function fileWith(text: string): File {
  return new File([text], "goodreads.csv", { type: "text/csv" });
}

const CSV = [
  "Title,Author,ISBN,ISBN13,My Rating,My Review,Exclusive Shelf,Date Read,Date Added",
  '"Dune","Frank Herbert","","",5,"",read,,',
  '"NoExiste","Nadie","","",0,"",to-read,,',
].join("\n");

beforeEach(() => {
  vi.clearAllMocks();
  getStatus.mockReturnValue(null);
});

describe("useGoodreadsImport", () => {
  it("parsea y genera vista previa", async () => {
    const { result } = renderHook(() => useGoodreadsImport());
    await act(async () => {
      await result.current.parse(fileWith(CSV));
    });
    expect(result.current.phase).toBe("preview");
    expect(result.current.preview?.total).toBe(2);
    expect(result.current.preview?.byStatus.finished).toBe(1);
    expect(result.current.preview?.byStatus.wantToRead).toBe(1);
  });

  it("importa los que matchean y reporta los no encontrados", async () => {
    (matchBook as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce(book) // Dune
      .mockResolvedValueOnce(null); // NoExiste
    const { result } = renderHook(() => useGoodreadsImport());
    await act(async () => {
      await result.current.parse(fileWith(CSV));
    });
    await act(async () => {
      await result.current.confirmImport();
    });
    await waitFor(() => expect(result.current.phase).toBe("done"));
    expect(addToShelf).toHaveBeenCalledTimes(1);
    expect(result.current.result).toMatchObject({
      imported: 1,
      alreadyExisted: 0,
      notFound: ["NoExiste"],
    });
    expect(reload).toHaveBeenCalled();
  });

  it("cuenta como alreadyExisted si ya está en la estantería", async () => {
    (matchBook as ReturnType<typeof vi.fn>).mockResolvedValue(book);
    getStatus.mockReturnValue("finished");
    const { result } = renderHook(() => useGoodreadsImport());
    await act(async () => {
      await result.current.parse(fileWith(CSV));
    });
    await act(async () => {
      await result.current.confirmImport();
    });
    await waitFor(() => expect(result.current.phase).toBe("done"));
    expect(addToShelf).not.toHaveBeenCalled();
    expect(result.current.result?.alreadyExisted).toBe(2);
  });
});
