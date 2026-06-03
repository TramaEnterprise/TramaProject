# Toast System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a toast notification system that confirms shelf actions (add, remove, status change, progress update, finish/abandon) with optional Undo, using Sonner as the engine and the project's CSS custom properties for theming.

**Architecture:** Sonner's `<Toaster />` is mounted once in `App.tsx` inside `AppShell`. A custom JSX component (`<ShelfToast />`) renders the book-specific toasts (cover thumbnail + message + undo). All call-sites go through a typed helper module (`utils/toast.ts`) that resolves i18n keys and constructs the undo closure. `ShelfContext` invokes the helpers after each successful Firestore write; undo closures call mutators back with `{ silent: true }` to avoid recursive toast chains.

**Tech Stack:** React 19, TypeScript, Vite, SCSS with CSS custom properties, react-i18next, Sonner ^2.0.7, Vitest + @testing-library/react.

**Related spec:** [docs/superpowers/specs/2026-05-23-toast-system-design.md](../specs/2026-05-23-toast-system-design.md)

---

## File Structure

**Create:**
- `src/hooks/useMediaQuery.ts` — utility hook over `window.matchMedia` with subscription
- `src/hooks/useMediaQuery.test.ts` — unit test
- `src/components/common/Toaster/ShelfToast.tsx` — custom JSX with cover thumbnail + message + undo
- `src/components/common/Toaster/ShelfToast.scss` — BEM styles using project tokens
- `src/components/common/Toaster/ShelfToast.test.tsx` — render test
- `src/components/common/Toaster/AppToaster.tsx` — wrapper over Sonner's `<Toaster />` with global config
- `src/components/common/Toaster/AppToaster.scss` — overrides Sonner's internal CSS vars
- `src/utils/toast.ts` — public helpers (`notifyShelfAdded`, etc.) + generic re-exports
- `src/plugins/i18n/locales/es/toasts.json` — Spanish copy
- `src/plugins/i18n/locales/en/toasts.json` — English copy

**Modify:**
- `package.json` — add `sonner` dependency
- `src/plugins/i18n/i18n.ts` — register the two toast JSON namespaces
- `src/context/shelf_init.ts` — extend `ShelfContextType` (opts arg on mutators, opts shape on updateProgress)
- `src/context/ShelfContext.tsx` — extend signatures, move `prev` capture in `removeBook`, invoke toast helpers inside `try` after successful awaits
- `src/components/shelf/modals/UpdateProgressModal.tsx:166,185` — adapt to new `updateProgress(bookKey, currentPage, opts)` signature
- `src/App.tsx` — mount `<AppToaster />` inside `AppShell`

---

## Task 1: Install Sonner

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install sonner**

Run: `npm install sonner@^2.0.7`

Expected: `package.json` now lists `"sonner": "^2.0.7"` under `dependencies`. `package-lock.json` updated.

- [ ] **Step 2: Verify install**

Run: `npm run build`
Expected: build succeeds (sonner resolves correctly; no other code uses it yet, so no behavioral change).

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add sonner dependency for toast system"
```

---

## Task 2: useMediaQuery hook (TDD)

**Files:**
- Create: `src/hooks/useMediaQuery.ts`
- Test: `src/hooks/useMediaQuery.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/hooks/useMediaQuery.test.ts`:

```ts
import { describe, it, expect, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useMediaQuery } from "./useMediaQuery";

const installMatchMedia = (matchingQuery: string) => {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: (query: string) => ({
      matches: query === matchingQuery,
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      onchange: null,
      dispatchEvent: () => true,
    }),
  });
};

describe("useMediaQuery", () => {
  beforeEach(() => {
    installMatchMedia("(max-width: 767px)");
  });

  it("returns true when the query matches", () => {
    const { result } = renderHook(() => useMediaQuery("(max-width: 767px)"));
    expect(result.current).toBe(true);
  });

  it("returns false when the query does not match", () => {
    const { result } = renderHook(() => useMediaQuery("(min-width: 9999px)"));
    expect(result.current).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- src/hooks/useMediaQuery.test.ts`
Expected: FAIL — module `./useMediaQuery` not found.

- [ ] **Step 3: Implement the hook**

Create `src/hooks/useMediaQuery.ts`:

```ts
import { useEffect, useState } from "react";

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(
    () => typeof window !== "undefined" && window.matchMedia(query).matches
  );

  useEffect(() => {
    const mql = window.matchMedia(query);
    const handler = (e: MediaQueryListEvent) => setMatches(e.matches);
    setMatches(mql.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, [query]);

  return matches;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- src/hooks/useMediaQuery.test.ts`
Expected: 2 passed.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useMediaQuery.ts src/hooks/useMediaQuery.test.ts
git commit -m "feat: add useMediaQuery hook"
```

---

## Task 3: i18n toast JSON files + register namespaces

**Files:**
- Create: `src/plugins/i18n/locales/es/toasts.json`
- Create: `src/plugins/i18n/locales/en/toasts.json`
- Modify: `src/plugins/i18n/i18n.ts`

- [ ] **Step 1: Create Spanish JSON**

Create `src/plugins/i18n/locales/es/toasts.json`:

```json
{
  "toasts": {
    "shelf": {
      "added": "Has añadido «{{title}}» a {{shelf}}",
      "statusChanged": "Has movido «{{title}}» a {{shelf}}",
      "removed": "Has quitado «{{title}}» de tu biblioteca",
      "progressUpdated": "Has actualizado el progreso de «{{title}}»",
      "finished": "Has terminado «{{title}}»",
      "didNotFinish": "Has marcado «{{title}}» como abandonado",
      "undo": "Deshacer"
    }
  }
}
```

- [ ] **Step 2: Create English JSON**

Create `src/plugins/i18n/locales/en/toasts.json`:

```json
{
  "toasts": {
    "shelf": {
      "added": "You added \"{{title}}\" to {{shelf}}",
      "statusChanged": "You moved \"{{title}}\" to {{shelf}}",
      "removed": "You removed \"{{title}}\" from your library",
      "progressUpdated": "You updated the progress of \"{{title}}\"",
      "finished": "You finished \"{{title}}\"",
      "didNotFinish": "You marked \"{{title}}\" as did not finish",
      "undo": "Undo"
    }
  }
}
```

- [ ] **Step 3: Register in i18n.ts**

Modify `src/plugins/i18n/i18n.ts`. Add imports next to existing namespace imports:

```ts
import enToasts from "./locales/en/toasts.json";
import esToasts from "./locales/es/toasts.json";
```

Then spread them in the `resources` map next to the existing namespaces, e.g. after `...enNotifications,`:

```ts
en: {
  translation: {
    // ...existing,
    ...enNotifications,
    ...enToasts,
  },
},
es: {
  translation: {
    // ...existing,
    ...esNotifications,
    ...esToasts,
  },
},
```

- [ ] **Step 4: Verify build**

Run: `npm run build`
Expected: build succeeds, no TS errors.

- [ ] **Step 5: Commit**

```bash
git add src/plugins/i18n/locales/es/toasts.json src/plugins/i18n/locales/en/toasts.json src/plugins/i18n/i18n.ts
git commit -m "feat: add i18n strings for toast notifications"
```

---

## Task 4: ShelfToast component (TDD)

**Files:**
- Create: `src/components/common/Toaster/ShelfToast.tsx`
- Create: `src/components/common/Toaster/ShelfToast.scss`
- Test: `src/components/common/Toaster/ShelfToast.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/components/common/Toaster/ShelfToast.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ShelfToast from "./ShelfToast";

const dismissMock = vi.fn();
vi.mock("sonner", () => ({
  toast: { dismiss: dismissMock },
}));

describe("ShelfToast", () => {
  beforeEach(() => { dismissMock.mockClear(); });

  it("renders message and title", () => {
    render(
      <ShelfToast
        cover={null}
        title="El Nombre del Viento"
        message="Has añadido a Quiero leer"
        toastId="t1"
      />
    );
    expect(screen.getByText("Has añadido a Quiero leer")).toBeInTheDocument();
    expect(screen.getByText("El Nombre del Viento")).toBeInTheDocument();
  });

  it("renders cover image when provided", () => {
    render(
      <ShelfToast
        cover="https://example.com/cover.jpg"
        title="X"
        message="m"
        toastId="t1"
      />
    );
    const img = screen.getByRole("img");
    expect(img).toHaveAttribute("src", "https://example.com/cover.jpg");
  });

  it("renders placeholder when cover is null", () => {
    render(<ShelfToast cover={null} title="X" message="m" toastId="t1" />);
    expect(screen.queryByRole("img")).toBeNull();
  });

  it("calls onAction and dismisses when action button clicked", () => {
    const onAction = vi.fn();
    render(
      <ShelfToast
        cover={null}
        title="X"
        message="m"
        actionLabel="Deshacer"
        onAction={onAction}
        toastId="t1"
      />
    );
    fireEvent.click(screen.getByRole("button", { name: "Deshacer" }));
    expect(onAction).toHaveBeenCalledTimes(1);
    expect(dismissMock).toHaveBeenCalledWith("t1");
  });

  it("does not render action button when actionLabel is missing", () => {
    render(<ShelfToast cover={null} title="X" message="m" toastId="t1" />);
    expect(screen.queryByRole("button")).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- src/components/common/Toaster/ShelfToast.test.tsx`
Expected: FAIL — module `./ShelfToast` not found.

- [ ] **Step 3: Implement the component**

Create `src/components/common/Toaster/ShelfToast.tsx`:

```tsx
import { toast as sonnerToast } from "sonner";
import "./ShelfToast.scss";

type ShelfToastProps = {
  cover: string | null;
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  toastId: string | number;
};

export default function ShelfToast({
  cover,
  title,
  message,
  actionLabel,
  onAction,
  toastId,
}: ShelfToastProps) {
  return (
    <div className="shelf-toast">
      <div className="shelf-toast__cover-wrap">
        {cover ? (
          <img className="shelf-toast__cover" src={cover} alt="" />
        ) : (
          <div className="shelf-toast__cover-placeholder" />
        )}
      </div>
      <div className="shelf-toast__body">
        <p className="shelf-toast__message">{message}</p>
        <p className="shelf-toast__title">{title}</p>
      </div>
      {actionLabel && onAction && (
        <button
          className="shelf-toast__action"
          onClick={() => {
            onAction();
            sonnerToast.dismiss(toastId);
          }}
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Add styles**

Create `src/components/common/Toaster/ShelfToast.scss`:

```scss
@use "@/styles/lib/mixins" as *;

.shelf-toast {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  width: 100%;
  min-width: 0;
  padding: var(--space-3);
  background: var(--color-bg-page);
  border: 1px solid var(--color-border-outline);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-card);

  &__cover-wrap {
    flex-shrink: 0;
    width: 40px;
    aspect-ratio: 2 / 3;
    border-radius: var(--radius-sm);
    overflow: hidden;
    background: var(--color-bg-muted);
  }

  &__cover {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }

  &__cover-placeholder {
    width: 100%;
    height: 100%;
    background: var(--color-bg-muted);
  }

  &__body {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  &__message {
    font-size: var(--text-xs);
    color: var(--color-text-secondary);
    margin: 0;
    line-height: 1.3;
  }

  &__title {
    font-size: var(--text-sm);
    font-weight: var(--weight-semibold);
    color: var(--color-text-primary);
    margin: 0;
    @include text-truncate;
  }

  &__action {
    flex-shrink: 0;
    background: transparent;
    border: none;
    color: var(--color-accent);
    font-size: var(--text-sm);
    font-weight: var(--weight-bold);
    cursor: pointer;
    padding: var(--space-1) var(--space-2);
    border-radius: var(--radius-sm);

    &:hover { background: var(--color-neutral-alpha-muted); }
  }
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm run test -- src/components/common/Toaster/ShelfToast.test.tsx`
Expected: 5 passed.

- [ ] **Step 6: Commit**

```bash
git add src/components/common/Toaster/ShelfToast.tsx src/components/common/Toaster/ShelfToast.scss src/components/common/Toaster/ShelfToast.test.tsx
git commit -m "feat: add ShelfToast component with cover thumbnail and undo action"
```

---

## Task 5: utils/toast.ts public API

**Files:**
- Create: `src/utils/toast.ts`

(No TDD — this module is a thin orchestrator over Sonner with i18n; a meaningful test would need to mock Sonner internals deeply. Integration is verified manually after Task 9.)

- [ ] **Step 1: Implement the helpers**

Create `src/utils/toast.ts`:

```ts
import { toast as sonnerToast } from "sonner";
import type { Book } from "@/types/Book";
import type { ShelfStatus } from "@/types/BookDetail";
import i18n from "@/plugins/i18n/i18n";
import ShelfToast from "@/components/common/Toaster/ShelfToast";

type BookForToast = Pick<Book, "key" | "title" | "cover_url">;
type UndoFn = () => void | Promise<void>;

const shelfLabel = (status: ShelfStatus): string =>
  i18n.t(`myLibrary.shelf.${status}`);

const renderShelfToast = (
  book: BookForToast,
  message: string,
  undo?: UndoFn,
): void => {
  sonnerToast.custom(
    (id) => (
      <ShelfToast
        toastId={id}
        cover={book.cover_url ?? null}
        title={book.title}
        message={message}
        actionLabel={undo ? i18n.t("toasts.shelf.undo") : undefined}
        onAction={undo}
      />
    ),
    { duration: 5000 }
  );
};

export function notifyShelfAdded(
  book: BookForToast,
  status: ShelfStatus,
  undo: UndoFn,
): void {
  const message = i18n.t("toasts.shelf.added", {
    title: book.title,
    shelf: shelfLabel(status),
  });
  renderShelfToast(book, message, undo);
}

export function notifyShelfStatusChanged(
  book: BookForToast,
  _fromStatus: ShelfStatus,
  toStatus: ShelfStatus,
  undo: UndoFn,
): void {
  const key =
    toStatus === "finished"
      ? "toasts.shelf.finished"
      : toStatus === "didNotFinish"
        ? "toasts.shelf.didNotFinish"
        : "toasts.shelf.statusChanged";

  const message = i18n.t(key, {
    title: book.title,
    shelf: shelfLabel(toStatus),
  });
  renderShelfToast(book, message, undo);
}

export function notifyShelfRemoved(
  book: BookForToast,
  _prevStatus: ShelfStatus,
  undo: UndoFn,
): void {
  const message = i18n.t("toasts.shelf.removed", { title: book.title });
  renderShelfToast(book, message, undo);
}

export function notifyProgressUpdated(
  book: BookForToast,
  _currentPage: number,
  _totalPages?: number,
): void {
  const message = i18n.t("toasts.shelf.progressUpdated", { title: book.title });
  renderShelfToast(book, message);
}

export const toast = {
  success: sonnerToast.success,
  error: sonnerToast.error,
  info: sonnerToast.info,
  dismiss: sonnerToast.dismiss,
};
```

Note: file uses JSX inside `sonnerToast.custom(...)`. Rename to `.tsx` if your TS config requires JSX-only `.tsx`. In this repo the convention is `.ts` for non-component utility files with no JSX; since this file has JSX, **rename to `src/utils/toast.tsx`** before saving.

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/utils/toast.tsx
git commit -m "feat: add toast helpers for shelf events"
```

---

## Task 6: AppToaster wrapper

**Files:**
- Create: `src/components/common/Toaster/AppToaster.tsx`
- Create: `src/components/common/Toaster/AppToaster.scss`

- [ ] **Step 1: Implement the wrapper**

Create `src/components/common/Toaster/AppToaster.tsx`:

```tsx
import { Toaster } from "sonner";
import { useTheme } from "@/hooks/useTheme";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import "./AppToaster.scss";

export default function AppToaster() {
  const { theme } = useTheme();
  const isMobile = useMediaQuery("(max-width: 767px)");

  return (
    <Toaster
      position={isMobile ? "bottom-center" : "bottom-right"}
      theme={theme}
      duration={5000}
      visibleToasts={3}
      gap={8}
      offset={isMobile ? "calc(env(safe-area-inset-bottom, 0) + 16px)" : 16}
      closeButton={false}
      richColors={false}
    />
  );
}
```

- [ ] **Step 2: Add Sonner CSS var overrides**

Create `src/components/common/Toaster/AppToaster.scss`:

```scss
[data-sonner-toaster] {
  --width: 380px;
  --gap: var(--space-2);
  --border-radius: var(--radius-md);
  font-family: var(--font-main);
}

@media (max-width: 767px) {
  [data-sonner-toaster] {
    --width: calc(100vw - var(--space-4) * 2);
  }
}

[data-sonner-toast][data-styled="true"] {
  background: transparent;
  border: none;
  box-shadow: none;
  padding: 0;
}
```

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 4: Commit**

```bash
git add src/components/common/Toaster/AppToaster.tsx src/components/common/Toaster/AppToaster.scss
git commit -m "feat: add AppToaster wrapper for Sonner with project theming"
```

---

## Task 7: Mount AppToaster in App.tsx

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Import and render `<AppToaster />` inside `AppShell`**

In `src/App.tsx`:

1. Add import next to the other component imports:

```ts
import AppToaster from "@/components/common/Toaster/AppToaster";
```

2. In `AppShell`'s JSX, add `<AppToaster />` as a sibling of `<main>`. The full updated `AppShell` return becomes:

```tsx
return (
  <>
    <Navbar hidden={scrolled} />
    <NavbarMini visible={scrolled} />
    <main>
      <Outlet />
    </main>
    <AppToaster />
  </>
);
```

- [ ] **Step 2: Verify dev server boots and no console errors**

Run: `npm run dev`
Expected: dev server starts. Open the app, no errors in browser console. No toasts visible (no calls yet).

Stop the dev server.

- [ ] **Step 3: Commit**

```bash
git add src/App.tsx
git commit -m "feat: mount AppToaster in AppShell"
```

---

## Task 8: Refactor updateProgress signature + update callers

This task changes `updateProgress` from positional args to `(bookKey, currentPage, opts?)`. It is a breaking signature change so the type, the implementation, and all callers must change in the same commit.

**Files:**
- Modify: `src/context/shelf_init.ts`
- Modify: `src/context/ShelfContext.tsx` (signature only, not the toast wiring — that comes in Task 9)
- Modify: `src/components/shelf/modals/UpdateProgressModal.tsx:166-172, 185`

- [ ] **Step 1: Update the context type**

In `src/context/shelf_init.ts`, replace the `updateProgress` field with the new signature and add the `opts` parameter to `addBook` and `removeBook` while at it (non-breaking):

```ts
export type ShelfContextType = {
  shelfByStatus: Record<ShelfStatus, Book[]>;
  loading: boolean;
  addBook: (
    book: Book,
    status: ShelfStatus,
    opts?: { silent?: boolean }
  ) => Promise<void>;
  removeBook: (
    bookKey: string,
    opts?: { silent?: boolean }
  ) => Promise<void>;
  getStatus: (bookKey: string) => ShelfStatus | null;
  getEntry: (bookKey: string) => ShelfEntry | null;
  updateProgress: (
    bookKey: string,
    currentPage: number,
    opts?: {
      note?: string;
      rating?: number;
      review?: string;
      status?: ShelfStatus;
      silent?: boolean;
    }
  ) => Promise<void>;
};
```

- [ ] **Step 2: Update `ShelfContext.tsx` mutator signatures**

In `src/context/ShelfContext.tsx`:

Replace `const addBook` signature:

```ts
const addBook = async (
  book: Book,
  status: ShelfStatus,
  _opts?: { silent?: boolean },
) => {
  // body unchanged for now (Task 9 will use _opts)
  ...
};
```

Replace `const removeBook` signature:

```ts
const removeBook = async (
  bookKey: string,
  _opts?: { silent?: boolean },
) => {
  // body unchanged for now
  ...
};
```

Replace `const updateProgress` to accept the opts object and destructure inside:

```ts
const updateProgress = async (
  bookKey: string,
  currentPage: number,
  opts?: {
    note?: string;
    rating?: number;
    review?: string;
    status?: ShelfStatus;
    silent?: boolean;
  },
) => {
  if (!uid) return;
  const encoded = encodeKey(bookKey);
  const existing = entries.get(encoded);
  if (!existing) return;

  const rollback = new Map(entries);
  const totalPages = existing.book.pages ?? 0;
  const derivedStatus: ShelfStatus =
    totalPages > 0 && currentPage === totalPages ? "finished" : existing.status;
  const newStatus: ShelfStatus = opts?.status ?? derivedStatus;

  const newMap = new Map(entries);
  newMap.set(encoded, {
    ...existing,
    currentPage,
    status: newStatus,
    ...(opts?.rating !== undefined && { rating: opts.rating }),
    ...(opts?.review !== undefined && { review: opts.review }),
  });
  setEntries(newMap);

  try {
    await updateReadingProgress(
      uid,
      existing,
      currentPage,
      opts?.note,
      opts?.rating,
      opts?.review,
    );
  } catch {
    setEntries(rollback);
  }
};
```

The `_opts` underscored prefix tells ESLint the param is intentionally unused at this point; Task 9 removes the underscore.

- [ ] **Step 3: Update `UpdateProgressModal` callers**

In `src/components/shelf/modals/UpdateProgressModal.tsx`:

Replace the call at line ~166 (the one with rating + review):

```tsx
await updateProgress(entry.book.key, currentPage, {
  rating: rating || undefined,
  review: review.trim() || undefined,
});
```

Replace the call at line ~185 (the one with note):

```tsx
await updateProgress(entry.book.key, currentPage, {
  note: note.trim() || undefined,
});
```

- [ ] **Step 4: Verify TypeScript and build**

Run: `npm run build`
Expected: build succeeds with no TS errors.

- [ ] **Step 5: Run existing tests**

Run: `npm run test:run`
Expected: all tests pass. (Existing `BookInfoCard.test.tsx` mocks `useShelf` with positional-arg mutators; signature change is additive so it still works.)

- [ ] **Step 6: Commit**

```bash
git add src/context/shelf_init.ts src/context/ShelfContext.tsx src/components/shelf/modals/UpdateProgressModal.tsx
git commit -m "refactor: switch updateProgress to opts object and add silent flag to mutators"
```

---

## Task 9: Wire toast notifications into ShelfContext

This is the core integration. Three mutators each gain a notification call placed **inside the `try` block after the successful `await`**, gated by `!opts?.silent`. Undo closures pass `{ silent: true }` to avoid recursive toast chains. `removeBook` also moves the `prev` capture above the optimistic update for clarity.

**Files:**
- Modify: `src/context/ShelfContext.tsx`

- [ ] **Step 1: Add imports**

At the top of `src/context/ShelfContext.tsx`, add:

```ts
import {
  notifyShelfAdded,
  notifyShelfStatusChanged,
  notifyShelfRemoved,
  notifyProgressUpdated,
} from "@/utils/toast";
```

- [ ] **Step 2: Wire `addBook`**

Replace the `addBook` body with:

```ts
const addBook = async (
  book: Book,
  status: ShelfStatus,
  opts?: { silent?: boolean },
) => {
  if (!uid) return;

  const prevStatus = entries.get(encodeKey(book.key))?.status ?? null;
  const rollback = new Map(entries);
  const newMap = new Map(entries);
  newMap.set(encodeKey(book.key), { book, status });
  setEntries(newMap);

  try {
    await addToShelf(uid, book, status, prevStatus);

    if (!opts?.silent) {
      const localizedBook = {
        ...book,
        title: book.titles?.[lang] ?? book.title,
      };
      if (prevStatus === null) {
        notifyShelfAdded(localizedBook, status, () =>
          removeBook(book.key, { silent: true }),
        );
      } else if (prevStatus !== status) {
        notifyShelfStatusChanged(localizedBook, prevStatus, status, () =>
          addBook(book, prevStatus, { silent: true }),
        );
      }
    }
  } catch {
    setEntries(rollback);
  }
};
```

- [ ] **Step 3: Wire `removeBook`**

Replace the `removeBook` body with (note: `prev` captured **before** the optimistic update):

```ts
const removeBook = async (
  bookKey: string,
  opts?: { silent?: boolean },
) => {
  if (!uid) return;

  const prev = entries.get(encodeKey(bookKey));
  if (!prev) return;

  const rollback = new Map(entries);
  const newMap = new Map(entries);
  newMap.delete(encodeKey(bookKey));
  setEntries(newMap);

  try {
    await removeFromShelf(uid, bookKey);

    if (!opts?.silent) {
      const localizedBook = {
        ...prev.book,
        title: prev.book.titles?.[lang] ?? prev.book.title,
      };
      notifyShelfRemoved(localizedBook, prev.status, () =>
        addBook(prev.book, prev.status, { silent: true }),
      );
    }
  } catch {
    setEntries(rollback);
  }
};
```

- [ ] **Step 4: Wire `updateProgress`**

Replace the `updateProgress` body with (note: it already accepts `opts` from Task 8; now adding the toast logic inside the `try`):

```ts
const updateProgress = async (
  bookKey: string,
  currentPage: number,
  opts?: {
    note?: string;
    rating?: number;
    review?: string;
    status?: ShelfStatus;
    silent?: boolean;
  },
) => {
  if (!uid) return;
  const encoded = encodeKey(bookKey);
  const existing = entries.get(encoded);
  if (!existing) return;

  const rollback = new Map(entries);
  const totalPages = existing.book.pages ?? 0;
  const derivedStatus: ShelfStatus =
    totalPages > 0 && currentPage === totalPages ? "finished" : existing.status;
  const newStatus: ShelfStatus = opts?.status ?? derivedStatus;
  const prevStatus = existing.status;
  const prevPage = existing.currentPage ?? 0;

  const newMap = new Map(entries);
  newMap.set(encoded, {
    ...existing,
    currentPage,
    status: newStatus,
    ...(opts?.rating !== undefined && { rating: opts.rating }),
    ...(opts?.review !== undefined && { review: opts.review }),
  });
  setEntries(newMap);

  try {
    await updateReadingProgress(
      uid,
      existing,
      currentPage,
      opts?.note,
      opts?.rating,
      opts?.review,
    );

    if (!opts?.silent) {
      const localizedBook = {
        ...existing.book,
        title: existing.book.titles?.[lang] ?? existing.book.title,
      };
      if (newStatus !== prevStatus && newStatus === "finished") {
        notifyShelfStatusChanged(localizedBook, prevStatus, "finished", () =>
          updateProgress(bookKey, prevPage, {
            status: prevStatus,
            silent: true,
          }),
        );
      } else {
        notifyProgressUpdated(localizedBook, currentPage, totalPages);
      }
    }
  } catch {
    setEntries(rollback);
  }
};
```

- [ ] **Step 5: Verify build and tests**

Run: `npm run build && npm run test:run`
Expected: build succeeds; all tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/context/ShelfContext.tsx
git commit -m "feat: emit toasts on shelf mutations with undo and silent flag"
```

---

## Task 10: Manual verification in browser

This is a non-coding verification step. The toast feature is user-facing — a UI test in the real app is the strongest signal it works.

**Files:** none

- [ ] **Step 1: Start dev server**

Run: `npm run dev`

- [ ] **Step 2: Verify "added" toast**

1. Log in.
2. Open any book detail page.
3. Click **Guardar libro** → choose **Quiero leer** from the dropdown.

Expected: bottom-right toast (desktop) with the book cover thumbnail, message `Has añadido «<título>» a Quiero leer`, and a **Deshacer** button. Toast auto-dismisses after 5s.

- [ ] **Step 3: Verify undo**

Repeat step 2 and immediately click **Deshacer** before the toast disappears.

Expected: the book is removed from the shelf (button reverts to **Guardar libro**). **No second toast** appears (silent flag working).

- [ ] **Step 4: Verify status change toast**

1. Add a book to **Quiero leer**.
2. Open the dropdown again and click **Leyendo**.

Expected: toast with message `Has movido «<título>» a Leyendo` and undo button.

- [ ] **Step 5: Verify "finished" via progress**

1. Open the **UpdateProgressModal** for a book (needs `pages > 0`).
2. Set current page = total pages → save.

Expected: toast `Has terminado «<título>»` with undo. Clicking undo restores both the page and the previous status (book goes back to **Leyendo** or whichever state it was in).

- [ ] **Step 6: Verify "didNotFinish"**

Change a book's status to **No terminado** via the dropdown.

Expected: toast `Has marcado «<título>» como abandonado` with undo.

- [ ] **Step 7: Verify "removed"**

From the shelf, remove a book (via `UpdateProgressModal`'s abandonment flow or any "quitar" button).

Expected: toast `Has quitado «<título>» de tu biblioteca` with undo.

- [ ] **Step 8: Verify mobile position**

Resize the browser window below 768px (or use device emulation in DevTools).

Expected: toast appears bottom-center, near-full width, respecting bottom safe area.

- [ ] **Step 9: Verify dark theme**

Toggle dark theme.

Expected: toast surface colors update (background, text, border) without page reload. Brand colors (accent on undo button) unchanged.

- [ ] **Step 10: Verify English**

Change browser/system language to English (or change `localStorage` `i18nextLng` to `en` and reload).

Expected: toast messages render in English (`You added "<title>" to Want to read`, etc.).

- [ ] **Step 11: Final commit (only if any small fixes were needed during manual verification)**

If everything worked as expected, no commit needed and this task is done. If any small adjustments were made during verification, commit them separately with a descriptive message.

---

## Self-Review

**Spec coverage:** every section of `2026-05-23-toast-system-design.md` maps to a task:
- Overview / 5 events → Task 9 (add, remove, status change, progress, finished/abandon all wired)
- Library choice (Sonner) → Task 1
- `<AppToaster />` config → Task 6 + 7
- `utils/toast.ts` API + mapping → Task 5
- `<ShelfToast />` component + styles → Task 4
- AppToaster.scss tokens + Sonner CSS var overrides → Task 6
- i18n keys → Task 3
- ShelfContext signature + toast wiring → Tasks 8 and 9
- Edge cases (no session, no cover, dark theme, mobile position, language change) → Task 10 manual verification
- New hook `useMediaQuery` → Task 2

**Placeholder scan:** no `TBD`, `TODO`, "implement later" left in. All code blocks are complete. Test code is concrete and runnable.

**Type consistency:**
- `BookForToast = Pick<Book, "key" | "title" | "cover_url">` used consistently in Task 5; helper signatures are referenced the same way in Task 9.
- `ShelfStatus` imported from `@/types/BookDetail` everywhere.
- `opts?: { silent?: boolean }` shape identical between `addBook` and `removeBook` (Tasks 8 and 9).
- `updateProgress` opts shape identical between type (Task 8 Step 1), implementation (Task 8 Step 2 and Task 9 Step 4), and callers (Task 8 Step 3).

Plan ready for execution.
