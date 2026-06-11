import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/context/auth/useAuth";
import { useShelf } from "@/context/shelf/useShelf";
import { getProgressEventsSince } from "@/services/firebase/firebaseActivity";
import {
  computeFavoriteGenres,
  computeWeeklyPages,
  type GenreSlice,
  type WeeklyPages,
} from "@/utils/readingStats";

const LOOKBACK_DAYS = 21;

const EMPTY_WEEK: WeeklyPages = {
  perDay: ["mon", "tue", "wed", "thu", "fri", "sat", "sun"].map((day) => ({
    day,
    pages: 0,
    currentDay: false,
  })),
  pagesThisWeek: 0,
  pagesToday: 0,
  changePct: null,
};

export type ReadingStats = {
  weekly: WeeklyPages;
  genres: GenreSlice[];
  loading: boolean;
};

export function useReadingStats(): ReadingStats {
  const { user } = useAuth();
  const uid = user?.uid ?? null;
  const { shelfByStatus } = useShelf();

  const [weekly, setWeekly] = useState<WeeklyPages>(EMPTY_WEEK);
  const [loadedUid, setLoadedUid] = useState<string | null>(null);

  const genres = useMemo(
    () => computeFavoriteGenres(shelfByStatus.finished),
    [shelfByStatus.finished]
  );

  useEffect(() => {
    if (!uid) {
      return;
    }
    let cancelled = false;
    const since = new Date();
    since.setDate(since.getDate() - LOOKBACK_DAYS);
    getProgressEventsSince(uid, since)
      .then((events) => {
        if (cancelled) return;
        setWeekly(computeWeeklyPages(events, new Date()));
        setLoadedUid(uid);
      })
      .catch((e) => {
        console.error("[diag] getProgressEventsSince FALLÓ:", e);
        if (cancelled) return;
        setWeekly(EMPTY_WEEK);
        setLoadedUid(uid);
      });

    return () => {
      cancelled = true;
    };
  }, [uid]);

  const loading = uid !== null && loadedUid !== uid;

  return { weekly, genres, loading };
}

