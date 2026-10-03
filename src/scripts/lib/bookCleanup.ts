import { franc } from "franc";

export const OL_COVER_BASE = "https://covers.openlibrary.org/b/id";

export const BLOCKING_FLAGS = new Set([
  "title.es==en",
  "title.es missing",
  "synopsis.es wrong-lang",
  "synopsis.en wrong-lang",
  "pages missing",
]);

export interface RawBookDoc {
  key: string;
  titles?: Record<string, string>;
  synopsis?: string | Record<string, string>;
  cover_id?: number | null;
  cover_url?: string | null;
  pages?: number | null;
  rating?: number | null;
  addCount?: number | null;
  ratingCount?: number | null;
}

export interface BookSnapshot {
  titles: Record<string, string>;
  synopsis: Record<string, string>;
  cover_id: number | null;
  cover_url: string | null;
  pages: number | null;
}

export interface ReviewEntry {
  key: string;
  before: BookSnapshot;
  after: BookSnapshot;
  changes: string[];
  flags: string[];
  priority: number;
  status: "auto-ok" | "needs-claude" | "claude-done";
}

const ISO3: Record<string, string> = { es: "spa", en: "eng" };
const MIN_SYNOPSIS_LEN = 40;
const MIN_RATING_COUNT = 10; // rating solo cuenta como señal con suficientes votos

export function cleanSlashTitle(title: string): string {
  const idx = title.indexOf(" / ");
  if (idx === -1) return title;
  return title.slice(0, idx).trim();
}

export function upgradeCoverUrl(coverId: number | null | undefined): string | null {
  if (coverId == null) return null;
  return `${OL_COVER_BASE}/${coverId}-L.jpg`;
}

/** Prioridad de revisión: addCount (uso real) manda; rating solo con >=10 votos. */
export function computePriority(
  rating?: number | null,
  addCount?: number | null,
  ratingCount?: number | null
): number {
  const rc = ratingCount ?? 0;
  const ratingScore = rc >= MIN_RATING_COUNT ? (rating ?? 0) : 0;
  return (addCount ?? 0) * 1000 + ratingScore * 100 + rc;
}

export function titleLanguageFlags(titles: Record<string, string> | undefined): string[] {
  const flags: string[] = [];
  const es = titles?.es?.trim() ?? "";
  const en = titles?.en?.trim() ?? "";
  if (!es && en) flags.push("title.es missing");
  if (!en && es) flags.push("title.en missing");
  if (es && en && es.toLowerCase() === en.toLowerCase()) flags.push("title.es==en");
  return flags;
}

export function synopsisLangMismatch(text: string, expectedLang: "es" | "en"): boolean {
  const trimmed = (text ?? "").trim();
  if (trimmed.length < MIN_SYNOPSIS_LEN) return false;
  const detected = franc(trimmed, { only: ["spa", "eng"] });
  if (detected === "und") return false;
  return detected !== ISO3[expectedLang];
}

function normalizeSynopsis(syn: string | Record<string, string> | undefined): Record<string, string> {
  if (typeof syn === "string") return syn.trim() ? { es: syn } : {};
  if (syn) return { ...syn };
  return {};
}

export function analyzeBook(doc: RawBookDoc): ReviewEntry {
  const titles: Record<string, string> = { ...(doc.titles ?? {}) };
  const synopsis = normalizeSynopsis(doc.synopsis);

  const before: BookSnapshot = {
    titles: { ...titles },
    synopsis: { ...synopsis },
    cover_id: doc.cover_id ?? null,
    cover_url: doc.cover_url ?? null,
    pages: doc.pages ?? null,
  };
  const after: BookSnapshot = {
    titles: { ...titles },
    synopsis: { ...synopsis },
    cover_id: doc.cover_id ?? null,
    cover_url: doc.cover_url ?? null,
    pages: doc.pages ?? null,
  };

  const changes: string[] = [];
  const flags: string[] = [];

  // --- Auto-correcciones deterministas ---
  for (const lang of ["es", "en"] as const) {
    const t = after.titles[lang];
    if (t) {
      const cleaned = cleanSlashTitle(t);
      if (cleaned !== t) {
        after.titles[lang] = cleaned;
        changes.push(`title.${lang}: cleaned ' / '`);
      }
    }
  }
  const newCover = upgradeCoverUrl(after.cover_id);
  if (newCover && newCover !== after.cover_url) {
    after.cover_url = newCover;
    changes.push("cover_url: upgraded -L");
  }

  // --- Flags de idioma ---
  flags.push(...titleLanguageFlags(after.titles));
  for (const lang of ["es", "en"] as const) {
    const s = after.synopsis[lang];
    if (s && synopsisLangMismatch(s, lang)) flags.push(`synopsis.${lang} wrong-lang`);
  }

  // --- Flags de datos faltantes ---
  if (after.pages == null || after.pages === 0) flags.push("pages missing");
  if (!after.synopsis.es?.trim()) flags.push("synopsis.es missing");
  if (!after.synopsis.en?.trim()) flags.push("synopsis.en missing");
  if (after.cover_id == null) flags.push("cover missing");

  return {
    key: doc.key,
    before,
    after,
    changes,
    flags,
    priority: computePriority(doc.rating, doc.addCount, doc.ratingCount),
    status: flags.some((f) => BLOCKING_FLAGS.has(f)) ? "needs-claude" : "auto-ok",
  };
}
