import type { Book } from "@/types/Book";
import { genreToColorVar } from "@/utils/genreUtils";

export type ProgressEvent = {
  bookId: string;
  progress: number;
  createdAt: Date;
};

export type DayBucket = {
  day: string; 
  pages: number;
  currentDay: boolean;
};

export type WeeklyPages = {
  perDay: DayBucket[]; 
  pagesThisWeek: number;
  pagesToday: number;
  changePct: number | null; 
};

export type GenreSlice = {
  key: string;
  percentage: number;
  color: string;
  isOther: boolean;
};

const DAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
const WEEK_ORDER = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function startOfWeek(d: Date): Date {
  const diff = (d.getDay() + 6) % 7; 
  const monday = startOfDay(d);
  monday.setDate(monday.getDate() - diff);
  return monday;
}

export function computeWeeklyPages(events: ProgressEvent[], now: Date): WeeklyPages {
  const weekStart = startOfWeek(now);
  const lastWeekStart = new Date(weekStart);
  lastWeekStart.setDate(lastWeekStart.getDate() - 7);
  const todayStart = startOfDay(now);

  const byBook = new Map<string, ProgressEvent[]>();
  for (const e of events) {
    const arr = byBook.get(e.bookId);
    if (arr) arr.push(e);
    else byBook.set(e.bookId, [e]);
  }

  const perDayPages = new Map<string, number>();
  let pagesThisWeek = 0;
  let pagesToday = 0;
  let pagesLastWeek = 0;

  for (const arr of byBook.values()) {
    const sorted = [...arr].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    let prev = 0;
    for (let i = 0; i < sorted.length; i++) {
      const delta = Math.max(0, sorted[i].progress - prev);
      prev = sorted[i].progress;
      if (delta === 0) continue;
      const when = sorted[i].createdAt;
      if (when >= weekStart && when <= now) {
        pagesThisWeek += delta;
        const dayKey = DAY_KEYS[when.getDay()];
        perDayPages.set(dayKey, (perDayPages.get(dayKey) ?? 0) + delta);
        if (when >= todayStart) pagesToday += delta;
      } else if (when >= lastWeekStart && when < weekStart) {
        pagesLastWeek += delta;
      }
    }
  }

  const todayKey = DAY_KEYS[now.getDay()];
  const perDay: DayBucket[] = WEEK_ORDER.map((day) => ({
    day,
    pages: perDayPages.get(day) ?? 0,
    currentDay: day === todayKey,
  }));

  const changePct =
    pagesLastWeek > 0
      ? Math.round(((pagesThisWeek - pagesLastWeek) / pagesLastWeek) * 100)
      : null;

  return { perDay, pagesThisWeek, pagesToday, changePct };
}

export function computeFavoriteGenres(finishedBooks: Book[]): GenreSlice[] {
  const counts = new Map<string, number>();
  let total = 0;
  for (const b of finishedBooks) {
    if (!b.genre) continue;
    counts.set(b.genre, (counts.get(b.genre) ?? 0) + 1);
    total++;
  }
  if (total === 0) return [];

  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  const top = sorted.slice(0, 3);
  const restCount = sorted.slice(3).reduce((sum, [, c]) => sum + c, 0);

  const slices: GenreSlice[] = top.map(([key, count]) => ({
    key,
    percentage: Math.round((count / total) * 100),
    color: genreToColorVar(key),
    isOther: false,
  }));

  if (restCount > 0) {
    slices.push({
      key: "others",
      percentage: Math.round((restCount / total) * 100),
      color: "var(--color-text-tertiary)",
      isOther: true,
    });
  }

  return slices;
}
