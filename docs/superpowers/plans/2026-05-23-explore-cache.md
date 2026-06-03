# Explore Session Cache Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a session-scoped in-memory cache for Explore section data with lazy invalidation triggered by shelf mutations, so the same data isn't re-fetched on every navigation back to `/explore`.

**Architecture:** A new `ExploreCacheProvider` wraps the app with a `Map` stored in `useRef` plus a `dirty` boolean flag. `useSectionBooks` reads from the cache before fetching and writes successful results. `ShelfContext` mutators call `markDirty()` after successful Firestore writes. `ExplorePage` and `ExploreSectionPage` call `clearIfDirty()` on mount, which only clears when the dirty flag is set.

**Tech Stack:** React 19, TypeScript, Vitest + @testing-library/react.

**Related spec:** [docs/superpowers/specs/2026-05-23-explore-cache-design.md](../specs/2026-05-23-explore-cache-design.md)

---

## File Structure

**Create:**
- `src/context/explore_cache_init.ts` — types + `createContext`
- `src/context/ExploreCacheContext.tsx` — provider with refs for `Map` and `dirty` flag
- `src/context/ExploreCacheContext.test.tsx` — provider unit tests
- `src/hooks/useExploreCache.ts` — consumer hook with null check

**Modify:**
- `src/App.tsx` — wrap `<ShelfProvider>` with `<ExploreCacheProvider>`
- `src/hooks/useSectionBooks.ts` — read/write cache around `fetchSection`
- `src/context/ShelfContext.tsx` — invoke `markDirty()` in three mutators
- `src/pages/explore/ExplorePage.tsx` — `useEffect` calling `clearIfDirty()` on mount
- `src/pages/explore/section/ExploreSectionPage.tsx` — same `useEffect`

---

## Task 1: Foundation (types, hook, provider) with TDD

**Files:**
- Create: `src/context/explore_cache_init.ts`
- Create: `src/hooks/useExploreCache.ts`
- Create: `src/context/ExploreCacheContext.tsx`
- Test: `src/context/ExploreCacheContext.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/context/ExploreCacheContext.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { ExploreCacheProvider } from "./ExploreCacheContext";
import { useExploreCache } from "@/hooks/useExploreCache";

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ExploreCacheProvider>{children}</ExploreCacheProvider>
);

const entry = { books: [], isFallback: false };

describe("ExploreCacheContext", () => {
  it("get returns undefined for unset keys", () => {
    const { result } = renderHook(() => useExploreCache(), { wrapper });
    expect(result.current.get("missing")).toBeUndefined();
  });

  it("set then get returns the stored entry", () => {
    const { result } = renderHook(() => useExploreCache(), { wrapper });
    act(() => {
      result.current.set("k1", entry);
    });
    expect(result.current.get("k1")).toEqual(entry);
  });

  it("clearIfDirty is a no-op when dirty flag is false", () => {
    const { result } = renderHook(() => useExploreCache(), { wrapper });
    act(() => {
      result.current.set("k1", entry);
      result.current.clearIfDirty();
    });
    expect(result.current.get("k1")).toEqual(entry);
  });

  it("markDirty then clearIfDirty clears all entries", () => {
    const { result } = renderHook(() => useExploreCache(), { wrapper });
    act(() => {
      result.current.set("k1", entry);
      result.current.set("k2", entry);
      result.current.markDirty();
      result.current.clearIfDirty();
    });
    expect(result.current.get("k1")).toBeUndefined();
    expect(result.current.get("k2")).toBeUndefined();
  });

  it("clearIfDirty resets dirty flag so subsequent calls are no-ops", () => {
    const { result } = renderHook(() => useExploreCache(), { wrapper });
    act(() => {
      result.current.markDirty();
      result.current.clearIfDirty();
      result.current.set("k1", entry);
      result.current.clearIfDirty();
    });
    expect(result.current.get("k1")).toEqual(entry);
  });

  it("useExploreCache throws when used without a provider", () => {
    expect(() => renderHook(() => useExploreCache())).toThrow(
      /ExploreCacheProvider/
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- src/context/ExploreCacheContext.test.tsx --run`
Expected: FAIL — module `./ExploreCacheContext` and `@/hooks/useExploreCache` not found.

- [ ] **Step 3: Create the context init file**

Create `src/context/explore_cache_init.ts`:

```ts
import { createContext } from "react";
import type { Book } from "@/types/Book";

export type ExploreCacheEntry = {
  books: Book[];
  isFallback: boolean;
};

export type ExploreCacheContextValue = {
  get: (key: string) => ExploreCacheEntry | undefined;
  set: (key: string, entry: ExploreCacheEntry) => void;
  markDirty: () => void;
  clearIfDirty: () => void;
};

export const ExploreCacheContext = createContext<ExploreCacheContextValue | null>(null);
```

- [ ] **Step 4: Create the consumer hook**

Create `src/hooks/useExploreCache.ts`:

```ts
import { useContext } from "react";
import { ExploreCacheContext } from "@/context/explore_cache_init";

export function useExploreCache() {
  const ctx = useContext(ExploreCacheContext);
  if (!ctx) {
    throw new Error("useExploreCache must be used inside ExploreCacheProvider");
  }
  return ctx;
}
```

- [ ] **Step 5: Create the provider**

Create `src/context/ExploreCacheContext.tsx`:

```tsx
import { useCallback, useMemo, useRef } from "react";
import { ExploreCacheContext, type ExploreCacheEntry } from "./explore_cache_init";

export function ExploreCacheProvider({ children }: { children: React.ReactNode }) {
  const cacheRef = useRef<Map<string, ExploreCacheEntry>>(new Map());
  const dirtyRef = useRef(false);

  const get = useCallback(
    (key: string) => cacheRef.current.get(key),
    [],
  );

  const set = useCallback((key: string, entry: ExploreCacheEntry) => {
    cacheRef.current.set(key, entry);
  }, []);

  const markDirty = useCallback(() => {
    dirtyRef.current = true;
  }, []);

  const clearIfDirty = useCallback(() => {
    if (dirtyRef.current) {
      cacheRef.current.clear();
      dirtyRef.current = false;
    }
  }, []);

  const value = useMemo(
    () => ({ get, set, markDirty, clearIfDirty }),
    [get, set, markDirty, clearIfDirty],
  );

  return (
    <ExploreCacheContext.Provider value={value}>
      {children}
    </ExploreCacheContext.Provider>
  );
}
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `npm run test -- src/context/ExploreCacheContext.test.tsx --run`
Expected: 6 passed.

- [ ] **Step 7: Commit**

```bash
git add src/context/explore_cache_init.ts src/hooks/useExploreCache.ts src/context/ExploreCacheContext.tsx src/context/ExploreCacheContext.test.tsx
git commit -m "feat: add ExploreCache provider and consumer hook"
```

---

## Task 2: Mount provider in App.tsx

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Add the import**

In `src/App.tsx`, add next to the other context imports:

```ts
import { ExploreCacheProvider } from "@/context/ExploreCacheContext";
```

- [ ] **Step 2: Wrap `<ShelfProvider>` with `<ExploreCacheProvider>`**

Replace the existing provider tree inside `<AuthProvider>` so it becomes:

```tsx
<AuthProvider>
  <ExploreCacheProvider>
    <ShelfProvider>
      <NotificationsProvider>
        <AppShell />
      </NotificationsProvider>
    </ShelfProvider>
  </ExploreCacheProvider>
</AuthProvider>
```

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: build succeeds, no TS errors. App behaves identically to before (provider mounted but no consumers yet).

- [ ] **Step 4: Commit**

```bash
git add src/App.tsx
git commit -m "feat: mount ExploreCacheProvider in app tree"
```

---

## Task 3: Integrate cache in `useSectionBooks`

**Files:**
- Modify: `src/hooks/useSectionBooks.ts`

(No TDD — testing this hook requires mocking `fetchSection`, all Firestore services, the cache, and Auth. Heavier than its value. Manual verification in Task 7 covers the behavioral checks.)

- [ ] **Step 1: Update imports**

Replace the top imports of `src/hooks/useSectionBooks.ts` with:

```ts
import { useCallback, useEffect, useMemo, useState } from "react";
import type { Book } from "@/types/Book";
import type { ExploreSectionParams, ExploreSectionType, UseSectionResult } from "@/types/ExploreTypes";
import {
  getAuthorBooksFromDB,
  getAuthorNewReleases,
  getGenreNewReleases,
  getNewReleaseBooks,
  getPopularAuthorWithBooks,
  getRecommendationsByGenre,
  getTopRatedBooks,
  getTrendingBooks,
} from "@/services/firebase/firebaseBooks";
import { useExploreCache } from "@/hooks/useExploreCache";
import { useAuth } from "@/hooks/useAuth";
import type { ExploreCacheEntry } from "@/context/explore_cache_init";
```

- [ ] **Step 2: Replace the hook body (keep `fetchSection` untouched)**

Replace **only** the `export function useSectionBooks(...)` block in `src/hooks/useSectionBooks.ts`. The auxiliary `fetchSection` function below it stays identical:

```ts
export function useSectionBooks(
  type: ExploreSectionType,
  params: ExploreSectionParams = {},
  lang: string,
  count = 6,
  disabled = false,
): UseSectionResult {
  const cache = useExploreCache();
  const { user } = useAuth();
  const uid = user?.uid ?? null;

  const cacheKey = useMemo(
    () => JSON.stringify({
      type, lang, count, uid,
      referenceBookKey: params.referenceBookKey,
      referenceGenre: params.referenceGenre,
      favoriteGenre: params.favoriteGenre,
      favoriteAuthorKey: params.favoriteAuthorKey,
      favoriteGenreLabel: params.favoriteGenreLabel,
      userAuthorKeys: params.userAuthorKeys?.join(",") ?? "",
      favoritesReferenceBookKey: params.favoritesReferenceBook?.key,
    }),
    [
      type, lang, count, uid,
      params.referenceBookKey, params.referenceGenre,
      params.favoriteGenre, params.favoriteAuthorKey, params.favoriteGenreLabel,
      params.userAuthorKeys, params.favoritesReferenceBook?.key,
    ],
  );

  const initialEntry = cache.get(cacheKey);
  const [books, setBooks] = useState<Book[]>(() => initialEntry?.books ?? []);
  const [isFallback, setIsFallback] = useState<boolean>(() => initialEntry?.isFallback ?? false);
  const [loading, setLoading] = useState<boolean>(() => !initialEntry && !disabled);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (disabled) {
      setLoading(false);
      return;
    }

    const entry = cache.get(cacheKey);
    if (entry) {
      setBooks(entry.books);
      setIsFallback(entry.isFallback);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    fetchSection(type, params, lang, count)
      .then(result => {
        const seen = new Set<string>();
        const unique = result.books.filter(b => {
          if (seen.has(b.key)) return false;
          seen.add(b.key);
          return true;
        });
        const newEntry: ExploreCacheEntry = { books: unique, isFallback: result.isFallback };
        cache.set(cacheKey, newEntry);
        if (cancelled) return;
        setBooks(unique);
        setIsFallback(result.isFallback);
      })
      .catch(err => {
        if (cancelled) return;
        console.error("[ExploreSection error]", err);
        setError("error");
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });

    return () => { cancelled = true; };
  // cacheKey already encodes type/lang/count/params/uid; disabled is the only
  // other input. cache reference is stable from useMemo in the provider.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cacheKey, disabled]);

  const retry = useCallback(() => {
    if (disabled) return;
    setLoading(true);
    setError(null);

    fetchSection(type, params, lang, count)
      .then(result => {
        const seen = new Set<string>();
        const unique = result.books.filter(b => {
          if (seen.has(b.key)) return false;
          seen.add(b.key);
          return true;
        });
        cache.set(cacheKey, { books: unique, isFallback: result.isFallback });
        setBooks(unique);
        setIsFallback(result.isFallback);
      })
      .catch(err => {
        console.error("[ExploreSection error]", err);
        setError("error");
      })
      .finally(() => setLoading(false));
  // Same justification as the effect above.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cacheKey, disabled]);

  return { books, loading, error, retry, isFallback };
}
```

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: build succeeds, no TS errors.

- [ ] **Step 4: Run existing tests**

Run: `npm run test:run`
Expected: all tests pass (existing test files mock the hooks at boundaries; the internal refactor doesn't affect them).

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useSectionBooks.ts
git commit -m "feat: cache useSectionBooks results in ExploreCache"
```

---

## Task 4: Add `markDirty()` calls in `ShelfContext`

**Files:**
- Modify: `src/context/ShelfContext.tsx`

- [ ] **Step 1: Add the import**

At the top of `src/context/ShelfContext.tsx`, next to the other `@/hooks` imports, add:

```ts
import { useExploreCache } from "@/hooks/useExploreCache";
```

- [ ] **Step 2: Consume the cache in the provider**

In `ShelfProvider`, just after the existing hooks (around the line `const { i18n } = useTranslation();`), add:

```ts
const exploreCache = useExploreCache();
```

- [ ] **Step 3: Call `markDirty()` in `addBook` after the successful await**

In `addBook`, inside the `try` block, **right after** `await addToShelf(uid, book, status, prevStatus);` and **before** the `if (!opts?.silent)` block, add:

```ts
exploreCache.markDirty();
```

The `try` block now looks like:

```ts
try {
  await addToShelf(uid, book, status, prevStatus);
  exploreCache.markDirty();

  if (!opts?.silent) {
    // ...existing toast logic unchanged...
  }
} catch {
  setEntries(rollback);
}
```

- [ ] **Step 4: Call `markDirty()` in `removeBook` after the successful await**

In `removeBook`, inside the `try` block, **right after** `await removeFromShelf(uid, bookKey);` and **before** the `if (!opts?.silent)` block, add:

```ts
exploreCache.markDirty();
```

- [ ] **Step 5: Call `markDirty()` in `updateProgress` after the successful await**

In `updateProgress`, inside the `try` block, **right after** `await updateReadingProgress(uid, existing, currentPage, opts?.note, opts?.rating, opts?.review);` and **before** the `if (!opts?.silent)` block, add:

```ts
exploreCache.markDirty();
```

- [ ] **Step 6: Verify build and tests**

Run: `npm run build && npm run test:run`
Expected: build succeeds, all tests pass.

- [ ] **Step 7: Commit**

```bash
git add src/context/ShelfContext.tsx
git commit -m "feat: invalidate ExploreCache on shelf mutations"
```

---

## Task 5: Clear cache on `ExplorePage` mount

**Files:**
- Modify: `src/pages/explore/ExplorePage.tsx`

- [ ] **Step 1: Add the import**

In `src/pages/explore/ExplorePage.tsx`, next to the other `@/hooks` imports, add:

```ts
import { useExploreCache } from "@/hooks/useExploreCache";
```

- [ ] **Step 2: Add the hook call and `useEffect`**

Inside the `ExplorePage` component body, near the existing hook calls (e.g., next to `const { user } = useAuth();`), add:

```ts
const { clearIfDirty } = useExploreCache();

useEffect(() => {
  clearIfDirty();
}, [clearIfDirty]);
```

`useEffect` and `useState` are already imported in this file (line 1). No new import needed for those.

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 4: Commit**

```bash
git add src/pages/explore/ExplorePage.tsx
git commit -m "feat: clear ExploreCache on ExplorePage mount when dirty"
```

---

## Task 6: Clear cache on `ExploreSectionPage` mount

**Files:**
- Modify: `src/pages/explore/section/ExploreSectionPage.tsx`

- [ ] **Step 1: Add the import**

At the top of `src/pages/explore/section/ExploreSectionPage.tsx`, add:

```ts
import { useExploreCache } from "@/hooks/useExploreCache";
```

If `useEffect` is not already imported from "react" in this file, add it to the existing react import.

- [ ] **Step 2: Add the hook call and `useEffect`**

Inside the `ExploreSectionPage` component body, near the existing hooks, add:

```ts
const { clearIfDirty } = useExploreCache();

useEffect(() => {
  clearIfDirty();
}, [clearIfDirty]);
```

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 4: Commit**

```bash
git add src/pages/explore/section/ExploreSectionPage.tsx
git commit -m "feat: clear ExploreCache on ExploreSectionPage mount when dirty"
```

---

## Task 7: Manual verification in browser

**Files:** none

- [ ] **Step 1: Start dev server**

Run: `npm run dev`

- [ ] **Step 2: Verify first load fetches from Firestore**

1. Log in.
2. Open browser DevTools → Network tab → filter by `firestore` or `XHR`.
3. Navigate to `/explore`.

Expected: Multiple Firestore requests (one per visible section). Loading skeletons appear and then resolve to books.

- [ ] **Step 3: Verify second visit hits the cache**

1. Click on any book card to go to `/book/:id`.
2. Click browser back (or navigate back to `/explore`).
3. Observe DevTools → Network tab.

Expected: **No new Firestore requests** for the sections that were previously loaded. Sections render instantly (no skeleton).

- [ ] **Step 4: Verify mutation marks dirty without immediate refresh**

1. On `/explore`, find a book card and click "Guardar libro" → "Quiero leer". Toast appears.
2. Observe the section grids on Explore: **they should NOT change** (no flicker, no reload).
3. Stay on Explore for a few seconds. Sections still cached.

Expected: Toast confirms the add. Section content remains identical to before the click.

- [ ] **Step 5: Verify cache clears on next Explore entry**

1. After step 4, navigate away (e.g., to `/profile` or `/book/:id`).
2. Navigate back to `/explore`.
3. Observe DevTools → Network.

Expected: Firestore requests fire again (cache miss after `clearIfDirty()`). The "waiting" section (`wantToReadBooks`) should now include the book added in step 4.

- [ ] **Step 6: Verify mutation from outside Explore also invalidates**

1. From `/explore` enter a book detail. From there, add another book to a different shelf.
2. Navigate back to `/explore`.

Expected: Network shows fresh Firestore requests. The recommendation sections may reflect the new shelf state in their filters.

- [ ] **Step 7: Verify retry button works after error**

1. (If possible) Use DevTools Network throttling → "Offline" mode.
2. Navigate to `/explore` (cache is dirty from earlier, so it tries to refetch).
3. Sections should show error state.
4. Restore network.
5. Click "Retry" on any section.

Expected: That section refetches successfully and renders. (Other sections may need to also be retried — each section has its own retry button.)

- [ ] **Step 8: Verify cache survives navigation between `/explore` and `/explore/section/:type`**

1. From `/explore`, click "ver todos" on some section to navigate to `/explore/section/:type` (or use whatever link the project exposes).
2. Navigate back to `/explore`.

Expected: No new Firestore requests (cache hit on both navigations if no mutation happened).

- [ ] **Step 9: Verify direct URL entry to `/explore/section/:type` after mutation**

1. From `/profile` (or any non-Explore page), add a book.
2. Manually paste a URL like `/explore/section/trending` in the address bar and load.

Expected: `ExploreSectionPage` mounts → `clearIfDirty()` clears → fresh Firestore fetch.

- [ ] **Step 10: Verify language change invalidates per-language**

1. Switch app language (e.g., `localStorage.i18nextLng = "en"` + reload, or via UI toggle).
2. Navigate to `/explore`.

Expected: Fresh Firestore fetches in the new language (different cache key due to `lang` in the key).

- [ ] **Step 11: Verify hard refresh clears cache**

1. With cache populated, press Ctrl+R (or Cmd+R on Mac) to refresh the page.
2. After reload, observe Network.

Expected: Full Firestore fetches as if it's a first visit (memory cache wiped by page reload).

---

## Self-Review

**1. Spec coverage:**

- ✓ `ExploreCacheProvider` (types + impl + hook): Task 1
- ✓ Provider mount in App.tsx: Task 2
- ✓ `useSectionBooks` integration with cache key, lazy state init, retry bypass: Task 3
- ✓ `ShelfContext.markDirty()` in three mutators, after await, no silent gate: Task 4
- ✓ `ExplorePage` clearIfDirty on mount: Task 5
- ✓ `ExploreSectionPage` clearIfDirty on mount: Task 6
- ✓ Manual verification covers cache hits, dirty-then-clear, error retry, language change, refresh, direct URL entry: Task 7

**2. Placeholder scan:** No "TBD", "TODO", "fill in", or vague instructions. All code blocks complete.

**3. Type consistency:**
- `ExploreCacheEntry` type defined in Task 1, imported in Task 3.
- `ExploreCacheContextValue` shape (`get`, `set`, `markDirty`, `clearIfDirty`) consistent across init, provider, and tests.
- `useExploreCache()` return type matches the value type in all consumers.
- Cache key keys (`type`, `lang`, `count`, `uid`, ...) identical in `useMemo` value and dep array.
