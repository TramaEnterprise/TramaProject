import Papa from "papaparse";
import type { ShelfStatus } from "@/types/BookDetail";

export type GoodreadsRow = {
  title: string;
  author: string;
  isbn?: string;
  isbn13?: string;
  status: ShelfStatus;
  rating?: number;
  review?: string;
  readDate?: string;
};

export class GoodreadsCsvError extends Error {
  constructor(message = "invalid-goodreads-csv") {
    super(message);
    this.name = "GoodreadsCsvError";
  }
}

const REQUIRED_HEADERS = ["Title", "Author", "Exclusive Shelf"];

const STATUS_MAP: Record<string, ShelfStatus> = {
  read: "finished",
  "currently-reading": "reading",
  "to-read": "wantToRead",
};

function cleanIsbn(raw?: string): string | undefined {
  if (!raw) return undefined;
  const cleaned = raw.replace(/[="]/g, "").replace(/-/g, "").trim();
  return cleaned.length > 0 ? cleaned : undefined;
}

function cleanReview(raw?: string): string | undefined {
  if (!raw) return undefined;
  const text = raw
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .trim();
  return text.length > 0 ? text : undefined;
}

function toIso(date?: string): string | undefined {
  if (!date || !date.trim()) return undefined;
  const trimmed = date.trim();
  // Goodreads exporta fechas sin hora (YYYY/MM/DD). Se anclan a UTC para
  // evitar que la conversión a ISO desplace el día según la zona horaria.
  const m = trimmed.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/);
  if (m) {
    const [, y, mo, d] = m;
    const iso = `${y}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}T00:00:00.000Z`;
    const parsed = new Date(iso);
    return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString();
  }
  const fallback = new Date(trimmed);
  return Number.isNaN(fallback.getTime()) ? undefined : fallback.toISOString();
}


export function parseGoodreadsCsvText(text: string): GoodreadsRow[] {
  const result = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
  });

  const fields = result.meta.fields ?? [];
  if (!REQUIRED_HEADERS.every((h) => fields.includes(h))) {
    throw new GoodreadsCsvError();
  }

  const rows: GoodreadsRow[] = [];
  for (const r of result.data) {
    const status = STATUS_MAP[(r["Exclusive Shelf"] ?? "").trim()];
    if (!status) continue;
    const title = (r["Title"] ?? "").trim();
    if (!title) continue;

    const ratingNum = Number(r["My Rating"]);
    rows.push({
      title,
      author: (r["Author"] ?? "").trim(),
      isbn: cleanIsbn(r["ISBN"]),
      isbn13: cleanIsbn(r["ISBN13"]),
      status,
      rating: ratingNum > 0 ? ratingNum : undefined,
      review: cleanReview(r["My Review"]),
      readDate: toIso(r["Date Read"]) ?? toIso(r["Date Added"]),
    });
  }
  return rows;
}

export async function parseGoodreadsCsv(file: File): Promise<GoodreadsRow[]> {
  const text = await file.text();
  return parseGoodreadsCsvText(text);
}
