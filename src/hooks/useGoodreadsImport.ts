import { useCallback, useRef, useState } from "react";
import type { ShelfStatus } from "@/types/BookDetail";
import { useAuth } from "@/context/auth/useAuth";
import { useShelf } from "@/context/shelf/useShelf";
import { useCurrentLanguage } from "@/plugins/i18n/useCurrentLanguage";
import { parseGoodreadsCsv, type GoodreadsRow } from "@/services/import/goodreadsCsv";
import { matchBook } from "@/services/import/goodreadsMatch";
import { addToShelf } from "@/services/firebase/firebaseLibrary";

export const MAX_IMPORT = 1000;
const BATCH_SIZE = 5;
const BATCH_DELAY_MS = 200;

type Phase = "idle" | "parsing" | "preview" | "importing" | "done" | "error";

export type ImportPreview = {
  total: number;
  truncated: boolean;
  byStatus: Record<ShelfStatus, number>;
};

export type ImportResult = {
  imported: number;
  alreadyExisted: number;
  notFound: string[];
};

function emptyByStatus(): Record<ShelfStatus, number> {
  return { wantToRead: 0, reading: 0, finished: 0, didNotFinish: 0 };
}

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export function useGoodreadsImport() {
  const { user } = useAuth();
  const { lang } = useCurrentLanguage();
  const { getStatus, reload } = useShelf();

  const [phase, setPhase] = useState<Phase>("idle");
  const [preview, setPreview] = useState<ImportPreview | undefined>();
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [result, setResult] = useState<ImportResult | undefined>();
  const [error, setError] = useState<string | undefined>();

  const rowsRef = useRef<GoodreadsRow[]>([]);
  const abortRef = useRef<AbortController | null>(null);

  const parse = useCallback(async (file: File) => {
    setPhase("parsing");
    setError(undefined);
    try {
      let rows = await parseGoodreadsCsv(file);
      const truncated = rows.length > MAX_IMPORT;
      if (truncated) rows = rows.slice(0, MAX_IMPORT);
      rowsRef.current = rows;

      const byStatus = emptyByStatus();
      for (const r of rows) byStatus[r.status] += 1;

      setPreview({ total: rows.length, truncated, byStatus });
      if (rows.length === 0) {
        setError("empty");
        setPhase("error");
      } else {
        setPhase("preview");
      }
    } catch {
      setError("invalid");
      setPhase("error");
    }
  }, []);

  const confirmImport = useCallback(async () => {
    if (!user) return;
    const rows = rowsRef.current;
    const ac = new AbortController();
    abortRef.current = ac;

    setPhase("importing");
    setProgress({ done: 0, total: rows.length });

    let imported = 0;
    let alreadyExisted = 0;
    const notFound: string[] = [];

    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      if (ac.signal.aborted) break;
      const batch = rows.slice(i, i + BATCH_SIZE);

      await Promise.allSettled(
        batch.map(async (row) => {
          if (ac.signal.aborted) return;
          const book = await matchBook(row, lang, ac.signal);
          if (!book) {
            notFound.push(row.title);
            return;
          }
          if (getStatus(book.key)) {
            alreadyExisted += 1;
            return;
          }
          await addToShelf(user.uid, book, row.status, null, {
            silent: true,
            rating: row.rating,
            review: row.review,
            addedAt: row.readDate,
          });
          imported += 1;
        })
      );

      setProgress({ done: Math.min(i + BATCH_SIZE, rows.length), total: rows.length });
      if (i + BATCH_SIZE < rows.length && !ac.signal.aborted) {
        await delay(BATCH_DELAY_MS);
      }
    }

    if (imported > 0) {
      await reload().catch(() => {});
    }
    setResult({ imported, alreadyExisted, notFound });
    setPhase("done");
  }, [user, lang, getStatus, reload]);

  const cancel = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    rowsRef.current = [];
    setPreview(undefined);
    setResult(undefined);
    setProgress({ done: 0, total: 0 });
    setError(undefined);
    setPhase("idle");
  }, []);

  return { phase, preview, progress, result, error, parse, confirmImport, cancel, reset };
}
