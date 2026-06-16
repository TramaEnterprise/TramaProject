import { useCallback, useState } from "react";
import type { Book } from "@/types/Book";
import { fetchBooksByGenre } from "@/services/api/openLibraryApi";
import { useCurrentLanguage } from "@/plugins/i18n/useCurrentLanguage";
import { getRecommendationsFromDB, saveBooksToDB } from "@/services/firebase/firebaseBooks";
import { completeBookTitles } from "@/services/api/bookComplete";
import { dedupBestByTitle } from "@/utils/bookDedup";
import { isVisibleBook, hasVisibleSubjects } from "@/utils/hiddenGenres";
import { genreFieldsFromSubjects } from "@/utils/genreDetection";
import { keepPreviousData, useQuery } from "@tanstack/react-query";

const PAGE_SIZE = 6;
const POOL_TARGET = 30;

function pickNext(
  fullPool: Book[],
  shown: Set<string>
): { books: Book[]; shown: Set<string> } {
  const available = fullPool.filter((b) => !shown.has(b.key));

  // Si no quedan suficientes sin mostrar, se reinicia 
  const enough = available.length >= PAGE_SIZE;
  const source = enough ? available : fullPool;
  const nextShown = enough ? new Set(shown) : new Set<string>();

  const shuffled = [...source].sort(() => Math.random() - 0.5);
  const picked = shuffled.slice(0, PAGE_SIZE);
  picked.forEach((b) => nextShown.add(b.key));
  return { books: picked, shown: nextShown };
}

export function useBookRecommendations(genres: string[], excludeKey: string) {
  const [state, setState] = useState<{ books: Book[]; shown: Set<string> }>({
    books: [],
    shown: new Set(),
  });
  const { lang } = useCurrentLanguage();

  const { data: pool } = useQuery<Book[]>({
    queryKey: ["recommendations-pool", genres.join("|"), lang, excludeKey],
    queryFn: async ({ signal }) => {
      const dbBooks = await getRecommendationsFromDB(genres, lang, excludeKey, POOL_TARGET);

      let pool = dbBooks;
      if (dbBooks.length < POOL_TARGET) {
        const needed = POOL_TARGET - dbBooks.length;
        const apiResults = await fetchBooksByGenre(genres[0], needed * 3, lang, signal);
        const seenKeys = new Set(dbBooks.map((b) => b.key));
        const seenTitles = new Set(dbBooks.map((b) => b.title.toLowerCase().trim()));
        const newBooks = dedupBestByTitle(
          apiResults.map((b) => ({ ...b, ...genreFieldsFromSubjects(b.topics) }))
        )
          .filter((b) => isVisibleBook(b) && hasVisibleSubjects(b.topics) && b.key !== excludeKey)
          .filter((b) => !seenKeys.has(b.key) && !seenTitles.has(b.title.toLowerCase().trim()))
          .slice(0, needed);
        if (newBooks.length > 0) saveBooksToDB(newBooks, lang); 
        pool = [...dbBooks, ...newBooks];
      }

      completeBookTitles(pool, lang); 
      return pool;
    },
    enabled: genres.length > 0,
    placeholderData: keepPreviousData,
  });

  const [prevPool, setPrevPool] = useState(pool);
  if (pool && pool !== prevPool) {
    setPrevPool(pool);
    setState(pickNext(pool, new Set()));
  }

  const refresh = useCallback(() => {
    setState((prev) => (pool ? pickNext(pool, prev.shown) : prev));
  }, [pool]);

  return { books: state.books, refresh };
}
