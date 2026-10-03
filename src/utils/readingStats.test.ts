import { describe, it, expect } from "vitest";
import { computeFavoriteGenres, computeWeeklyPages } from "./readingStats";
import type { Book } from "@/types/Book";
import type { ProgressEvent } from "./readingStats";

function book(genre: string | undefined): Book {
  return {
    key: `/works/${genre ?? "none"}-${Math.random()}`,
    title: "t",
    authors: ["a"],
    first_publish_year: 2000,
    cover_id: null,
    edition_count: 1,
    genre,
  };
}

describe("computeFavoriteGenres", () => {
  it("devuelve [] cuando no hay libros terminados", () => {
    expect(computeFavoriteGenres([])).toEqual([]);
  });

  it("ignora libros sin género", () => {
    expect(computeFavoriteGenres([book(undefined), book(undefined)])).toEqual([]);
  });

  it("toma el top 3 y agrupa el resto en 'others'", () => {
    const finished = [
      ...Array(4)
        .fill(null)
        .map(() => book("Fantasy")),
      ...Array(3)
        .fill(null)
        .map(() => book("Drama")),
      ...Array(2)
        .fill(null)
        .map(() => book("Romance")),
      book("Horror"),
    ];
    const slices = computeFavoriteGenres(finished);
    expect(slices.map((s) => [s.key, s.percentage, s.isOther])).toEqual([
      ["Fantasy", 40, false],
      ["Drama", 30, false],
      ["Romance", 20, false],
      ["others", 10, true],
    ]);
  });
});

describe("computeWeeklyPages", () => {
  const now = new Date(2026, 5, 10, 12, 0, 0);

  it("descarta el primer evento por libro y reparte deltas por día", () => {
    const events: ProgressEvent[] = [
      { bookId: "A", progress: 10, createdAt: new Date(2026, 5, 1, 10) }, // 1er evento → descartado
      { bookId: "A", progress: 25, createdAt: new Date(2026, 5, 3, 10) }, // +15 semana pasada
      { bookId: "A", progress: 45, createdAt: new Date(2026, 5, 9, 10) }, // +20 esta semana (mar)
      { bookId: "A", progress: 60, createdAt: new Date(2026, 5, 10, 9) }, // +15 hoy (mié)
    ];
    const r = computeWeeklyPages(events, now);
    expect(r.pagesThisWeek).toBe(35);
    expect(r.pagesToday).toBe(15);
    expect(r.changePct).toBe(40); // (35-15)/15
    expect(r.perDay.find((d) => d.day === "tue")?.pages).toBe(20);
    expect(r.perDay.find((d) => d.day === "wed")?.pages).toBe(15);
    expect(r.perDay.find((d) => d.day === "wed")?.currentDay).toBe(true);
    expect(r.perDay).toHaveLength(7);
  });

  it("changePct es null cuando no hay datos de la semana pasada", () => {
    const events: ProgressEvent[] = [
      { bookId: "B", progress: 5, createdAt: new Date(2026, 5, 9, 10) }, 
      { bookId: "B", progress: 20, createdAt: new Date(2026, 5, 10, 10) }, 
    ];
    const r = computeWeeklyPages(events, now);
    expect(r.pagesThisWeek).toBe(20);
    expect(r.changePct).toBeNull();
  });
});
