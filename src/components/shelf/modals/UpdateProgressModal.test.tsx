import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import UpdateProgressModal from "./UpdateProgressModal";
import type { ShelfEntry } from "@/services/firebase/firebaseLibrary";

vi.mock("motion/react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("motion/react")>();
  return { ...actual, useReducedMotion: () => false };
});
vi.mock("@/context/shelf/useShelf", () => ({
  useShelf: () => ({ updateProgress: vi.fn(), addBook: vi.fn() }),
}));
vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));

const finishedEntry = {
  book: { key: "/works/OL1W", title: "Libro", pages: 100 },
  status: "finished",
  currentPage: 0,
} as ShelfEntry;

const readingEntry = {
  book: { key: "/works/OL1W", title: "Libro", pages: 100 },
  status: "reading",
  currentPage: 10,
} as ShelfEntry;

describe("UpdateProgressModal — confeti", () => {
  it("muestra confeti al abrir con estado finished", () => {
    render(<UpdateProgressModal entry={finishedEntry} onClose={vi.fn()} />);
    expect(document.body.querySelector(".confetti-burst")).not.toBeNull();
  });

  it("no muestra confeti al abrir en estado reading", () => {
    render(<UpdateProgressModal entry={readingEntry} onClose={vi.fn()} />);
    expect(document.body.querySelector(".confetti-burst")).toBeNull();
  });
});

