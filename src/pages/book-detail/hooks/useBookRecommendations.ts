import { useCallback, useState } from "react";
import type { Book } from "@/types/Book";
import { fetchBooksByGenre } from "@/services/api/openLibraryApi";
import { useCurrentLanguage } from "@/plugins/i18n/useCurrentLanguage";
import { getRecommendationsFromDB, saveBooksToDB } from "@/services/firebase/firebaseBooks";
import { completeBookTitles } from "@/services/api/bookComplete";
import { dedupBestByTitle } from "@/utils/bookDedup";
import { keepPreviousData, useQuery } from "@tanstack/react-query";

const PAGE_SIZE = 6;
const MIN_DB_BOOKS = 20;

// Función pura: dado el pool y el conjunto de claves ya mostradas, devuelve la
// siguiente página y el historial actualizado. No depende de refs ni de estado.
function pickNext(
  fullPool: Book[],
  shown: Set<string>
): { books: Book[]; shown: Set<string> } {
  const available = fullPool.filter((b) => !shown.has(b.key));
  // Si no quedan suficientes sin mostrar, reiniciar el historial
  const enough = available.length >= PAGE_SIZE;
  const source = enough ? available : fullPool;
  const nextShown = enough ? new Set(shown) : new Set<string>();

  const shuffled = [...source].sort(() => Math.random() - 0.5);
  const picked = shuffled.slice(0, PAGE_SIZE);
  picked.forEach((b) => nextShown.add(b.key));
  return { books: picked, shown: nextShown };
}

export function useBookRecommendations(genre: string, excludeKey: string) {
  const [state, setState] = useState<{ books: Book[]; shown: Set<string> }>({
    books: [],
    shown: new Set(),
  });
  const { lang } = useCurrentLanguage();

  const { data: pool } = useQuery<Book[]>({
    queryKey: ["recommendations-pool", genre, lang, excludeKey],
    queryFn: async ({ signal }) => {
      const dbBooks = await getRecommendationsFromDB(genre, lang, excludeKey, MIN_DB_BOOKS);
      if (dbBooks) {
        const sortedBooks = dedupBestByTitle(dbBooks);
        completeBookTitles(sortedBooks, lang); // fire-and-forget
        return sortedBooks;
      }
      // Fallback => API
      const results = await fetchBooksByGenre(genre, 30, lang, signal);
      const deduplicatedBooks = dedupBestByTitle(results);
      saveBooksToDB(deduplicatedBooks, lang); // fire-and-forget
      return deduplicatedBooks.filter((b) => b.key !== excludeKey);
    },
    enabled: !!genre,
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
