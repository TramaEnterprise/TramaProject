# Book Lists Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convertir la sección de listas (hoy estática con datos mock) en una funcionalidad real con CRUD completo, página de todas las listas y página de detalle.

**Architecture:** Cada lista es un documento `Users/{uid}/lists/{listId}` con los libros embebidos en un array. Una capa de servicio (`firebaseLists.ts`) hace las escrituras de cliente; un hook `useLists(userId)` expone los datos con actualización optimista; un `ListEditorModal` reutilizable cubre crear y editar; dos páginas nuevas (`AllListsPage`, `ListDetailPage`) cuelgan de la ruta `/lists/:userId`.

**Tech Stack:** React 19, TypeScript, Vite, Firebase Firestore, react-router v7, react-i18next, SCSS (BEM), vitest.

**Verificación:** este proyecto no usa TDD salvo en utilidades puras (`src/utils/*.test.ts`). Cada tarea se verifica con `npm run build` (ejecuta `tsc -b && vite build` → type-check completo) y `npm run lint`. La Tarea 2 sí es TDD con vitest.

---

## File Structure

**Nuevos:**
- `src/types/BookList.ts` — tipos `ListBook` y `BookList`.
- `src/utils/bookListUtils.ts` — helpers puros (portadas del mosaico, validación de nombre, adaptador a `Book`).
- `src/utils/bookListUtils.test.ts` — tests vitest de lo anterior.
- `src/services/firebase/firebaseLists.ts` — CRUD Firestore de listas.
- `src/hooks/useLists.ts` — hook de datos con actualización optimista.
- `src/components/shelf/modals/ListEditorModal.tsx` + `.scss` — modal crear/editar.
- `src/pages/lists/AllListsPage.tsx` + `.scss` — página "todas las listas".
- `src/pages/lists/ListDetailPage.tsx` + `.scss` — página de detalle de una lista.

**Modificados:**
- `src/components/shelf/cards/ListCard.tsx` — usa `BookList`, navega al detalle.
- `src/components/shelf/cards/ListCard.scss` — ajustes por pasar a `<Link>`.
- `src/components/shelf/sections/ListsSection.tsx` — datos reales, botón crear, `isOwner`.
- `src/pages/my-library/MyLibraryPage.tsx` — usa `useLists`, quita mock.
- `src/pages/profile/ProfilePage.tsx` — usa `useLists`, quita mock.
- `src/routes/routes.tsx` — dos rutas nuevas.
- `src/plugins/i18n/locales/es/myLibrary.json` y `en/myLibrary.json` — claves nuevas.

---

## Task 1: Tipos de lista

**Files:**
- Create: `src/types/BookList.ts`

- [ ] **Step 1: Crear el archivo de tipos**

```ts
export type ListBook = {
  key: string;
  title: string;
  authors: string[];
  cover_url?: string;
};

export type BookList = {
  id: string;
  name: string;
  books: ListBook[];
  createdAt: string;
  updatedAt: string;
};
```

- [ ] **Step 2: Verificar build**

Run: `npm run build`
Expected: PASS (sin errores de tipo).

- [ ] **Step 3: Commit**

```bash
git add src/types/BookList.ts
git commit -m "feat(lists): add BookList and ListBook types"
```

---

## Task 2: Utilidades puras (TDD)

**Files:**
- Create: `src/utils/bookListUtils.ts`
- Test: `src/utils/bookListUtils.test.ts`

- [ ] **Step 1: Escribir los tests que fallan**

```ts
import { describe, it, expect } from "vitest";
import { getListCoverUrls, isValidListName, listBookToBook } from "./bookListUtils";
import type { ListBook } from "@/types/BookList";

const mk = (key: string, cover?: string): ListBook => ({
  key, title: `T-${key}`, authors: ["A"], cover_url: cover,
});

describe("getListCoverUrls", () => {
  it("devuelve las 4 primeras portadas válidas", () => {
    const books = [mk("1", "c1"), mk("2", "c2"), mk("3", "c3"), mk("4", "c4"), mk("5", "c5")];
    expect(getListCoverUrls(books)).toEqual(["c1", "c2", "c3", "c4"]);
  });
  it("ignora libros sin portada", () => {
    const books = [mk("1", "c1"), mk("2"), mk("3", "c3")];
    expect(getListCoverUrls(books)).toEqual(["c1", "c3"]);
  });
  it("devuelve [] si no hay portadas", () => {
    expect(getListCoverUrls([mk("1"), mk("2")])).toEqual([]);
  });
});

describe("isValidListName", () => {
  it("acepta un nombre con texto", () => {
    expect(isValidListName("Mis favoritos")).toBe(true);
  });
  it("rechaza vacío o solo espacios", () => {
    expect(isValidListName("")).toBe(false);
    expect(isValidListName("   ")).toBe(false);
  });
});

describe("listBookToBook", () => {
  it("conserva los campos conocidos y rellena el resto", () => {
    const b = listBookToBook(mk("1", "c1"));
    expect(b.key).toBe("1");
    expect(b.cover_url).toBe("c1");
    expect(b.cover_id).toBeNull();
    expect(b.first_publish_year).toBe(0);
    expect(b.edition_count).toBe(0);
  });
});
```

- [ ] **Step 2: Ejecutar los tests para verificar que fallan**

Run: `npm run test:run -- src/utils/bookListUtils.test.ts`
Expected: FAIL — `bookListUtils` no existe.

- [ ] **Step 3: Implementar las utilidades**

```ts
import type { ListBook } from "@/types/BookList";
import type { Book } from "@/types/Book";

export const MAX_LIST_BOOKS = 100;

/** Las 4 primeras portadas válidas, para el mosaico de la ListCard. */
export function getListCoverUrls(books: ListBook[]): string[] {
  return books
    .map((b) => b.cover_url)
    .filter((url): url is string => !!url)
    .slice(0, 4);
}

/** Un nombre de lista es válido si tras recortar espacios no queda vacío. */
export function isValidListName(name: string): boolean {
  return name.trim().length > 0;
}

/** Adapta un ListBook al tipo Book que espera BookCard (campos extra vacíos). */
export function listBookToBook(lb: ListBook): Book {
  return {
    key: lb.key,
    title: lb.title,
    authors: lb.authors,
    cover_url: lb.cover_url,
    first_publish_year: 0,
    cover_id: null,
    edition_count: 0,
  };
}
```

- [ ] **Step 4: Ejecutar los tests para verificar que pasan**

Run: `npm run test:run -- src/utils/bookListUtils.test.ts`
Expected: PASS — 6 tests.

- [ ] **Step 5: Commit**

```bash
git add src/utils/bookListUtils.ts src/utils/bookListUtils.test.ts
git commit -m "feat(lists): add bookList pure utils with tests"
```

---

## Task 3: Capa de servicio Firestore

**Files:**
- Create: `src/services/firebase/firebaseLists.ts`

- [ ] **Step 1: Implementar el servicio**

```ts
import {
  collection, deleteDoc, doc, getDoc, getDocs, setDoc, updateDoc,
} from "firebase/firestore";
import { db } from "./firebaseInit";
import type { BookList, ListBook } from "@/types/BookList";

function mapListDoc(id: string, d: Record<string, unknown>): BookList {
  return {
    id,
    name: (d.name as string) ?? "",
    books: (d.books as ListBook[]) ?? [],
    createdAt: (d.createdAt as string) ?? "",
    updatedAt: (d.updatedAt as string) ?? "",
  };
}

/** Todas las listas de un usuario, las más recientes primero. */
export async function getLists(uid: string): Promise<BookList[]> {
  const snap = await getDocs(collection(db, "Users", uid, "lists"));
  return snap.docs
    .map((docSnap) => mapListDoc(docSnap.id, docSnap.data()))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/** Una lista concreta, o null si no existe. */
export async function getList(uid: string, listId: string): Promise<BookList | null> {
  const snap = await getDoc(doc(db, "Users", uid, "lists", listId));
  if (!snap.exists()) return null;
  return mapListDoc(snap.id, snap.data());
}

/** Crea una lista con id automático y devuelve ese id. */
export async function createList(
  uid: string, name: string, books: ListBook[],
): Promise<string> {
  const ref = doc(collection(db, "Users", uid, "lists"));
  const now = new Date().toISOString();
  await setDoc(ref, { name, books, createdAt: now, updatedAt: now });
  return ref.id;
}

/** Actualiza nombre y/o libros de una lista; refresca updatedAt. */
export async function updateList(
  uid: string,
  listId: string,
  patch: { name?: string; books?: ListBook[] },
): Promise<void> {
  await updateDoc(doc(db, "Users", uid, "lists", listId), {
    ...patch,
    updatedAt: new Date().toISOString(),
  });
}

/** Borra una lista. */
export async function deleteList(uid: string, listId: string): Promise<void> {
  await deleteDoc(doc(db, "Users", uid, "lists", listId));
}
```

- [ ] **Step 2: Verificar build**

Run: `npm run build`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/services/firebase/firebaseLists.ts
git commit -m "feat(lists): add firebaseLists service layer"
```

---

## Task 4: Hook `useLists`

**Files:**
- Create: `src/hooks/useLists.ts`

**Nota:** `updateList` y `deleteList` son optimistas (mutan el estado al instante y revierten si Firebase falla, como `useProfile`). `createList` espera al servidor porque el `listId` lo genera Firestore, y luego inserta la lista en el estado.

- [ ] **Step 1: Implementar el hook**

```ts
import { useCallback, useEffect, useState } from "react";
import {
  createList as createListSvc,
  deleteList as deleteListSvc,
  getLists,
  updateList as updateListSvc,
} from "@/services/firebase/firebaseLists";
import type { BookList, ListBook } from "@/types/BookList";

export function useLists(userId: string | undefined) {
  const [lists, setLists] = useState<BookList[]>([]);
  const [loading, setLoading] = useState(() => !!userId);

  useEffect(() => {
    if (!userId) {
      setLists([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    getLists(userId)
      .then((l) => { if (!cancelled) setLists(l); })
      .catch(() => { if (!cancelled) setLists([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [userId]);

  const createList = useCallback(
    async (name: string, books: ListBook[]) => {
      if (!userId) return;
      const id = await createListSvc(userId, name, books);
      const now = new Date().toISOString();
      setLists((prev) => [
        { id, name, books, createdAt: now, updatedAt: now },
        ...prev,
      ]);
    },
    [userId],
  );

  const updateList = useCallback(
    async (listId: string, patch: { name?: string; books?: ListBook[] }) => {
      if (!userId) return;
      const snapshot = lists;
      setLists((cur) =>
        cur.map((l) =>
          l.id === listId
            ? { ...l, ...patch, updatedAt: new Date().toISOString() }
            : l,
        ),
      );
      try {
        await updateListSvc(userId, listId, patch);
      } catch {
        setLists(snapshot);
        throw new Error("update failed");
      }
    },
    [userId, lists],
  );

  const deleteList = useCallback(
    async (listId: string) => {
      if (!userId) return;
      const snapshot = lists;
      setLists((cur) => cur.filter((l) => l.id !== listId));
      try {
        await deleteListSvc(userId, listId);
      } catch {
        setLists(snapshot);
        throw new Error("delete failed");
      }
    },
    [userId, lists],
  );

  return { lists, loading, createList, updateList, deleteList };
}
```

- [ ] **Step 2: Verificar build**

Run: `npm run build`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useLists.ts
git commit -m "feat(lists): add useLists hook with optimistic updates"
```

---

## Task 5: Refactor de `ListCard`

`ListCard` deja de recibir el tipo mock `ReadingList` y pasa a recibir un `BookList` real + el `userId` del dueño. Se convierte en un `<Link>` al detalle.

**Files:**
- Modify: `src/components/shelf/cards/ListCard.tsx`
- Modify: `src/components/shelf/cards/ListCard.scss`

- [ ] **Step 1: Reescribir `ListCard.tsx`**

```tsx
import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import type { BookList } from "@/types/BookList";
import { getListCoverUrls } from "@/utils/bookListUtils";
import "./ListCard.scss";

type ListCardProps = {
  list: BookList;
  userId: string;
};

export default function ListCard({ list, userId }: ListCardProps) {
  const { t } = useTranslation();
  const covers = getListCoverUrls(list.books);

  return (
    <Link className="list-card" to={`/lists/${userId}/${list.id}`}>
      <div className="list-card__mosaic">
        {covers.map((url, i) => (
          <div key={i} className="list-card__mosaic-cell">
            <img className="list-card__mosaic-img" src={url} alt="" loading="lazy" />
          </div>
        ))}
      </div>

      <div className="list-card__meta">
        <p className="list-card__name">{list.name}</p>
        <p className="list-card__count">
          {t("myLibrary.listsCount", { count: list.books.length })}
        </p>
      </div>
    </Link>
  );
}
```

- [ ] **Step 2: Ajustar `ListCard.scss`**

En el selector `.list-card`, añadir (porque ahora es un `<Link>`):

```scss
.list-card {
  display: block;
  text-decoration: none;
  color: inherit;
  // ...resto de reglas existentes sin tocar
}
```

- [ ] **Step 3: Verificar build**

Run: `npm run build`
Expected: FAIL — `ListsSection.tsx` aún pasa props antiguas a `ListCard`. Es esperado; se arregla en la Tarea 9. Confirmar que el ÚNICO error es ese.

- [ ] **Step 4: Commit**

```bash
git add src/components/shelf/cards/ListCard.tsx src/components/shelf/cards/ListCard.scss
git commit -m "feat(lists): make ListCard take a real BookList and link to detail"
```

---

## Task 6: `ListEditorModal` — componente

Modal reutilizado para crear y editar. Espeja `FavoriteBooksEditorModal` y añade: input de nombre, contador "N/100" y paginación con flechas del campo de libros.

**Files:**
- Create: `src/components/shelf/modals/ListEditorModal.tsx`

- [ ] **Step 1: Crear el componente**

```tsx
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import type { Book } from "@/types/Book";
import type { BookList, ListBook } from "@/types/BookList";
import { searchBooksWithFallback } from "@/services/firebase/firebaseBooks";
import { MAX_LIST_BOOKS, isValidListName } from "@/utils/bookListUtils";
import "./ListEditorModal.scss";

const BOOKS_PER_PAGE = 4;

type ListEditorModalProps = {
  existingList?: BookList;
  onSubmit: (data: { name: string; books: ListBook[] }) => Promise<void>;
  onClose: () => void;
};

export default function ListEditorModal({
  existingList, onSubmit, onClose,
}: ListEditorModalProps) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language.split("-")[0];
  const isEdit = !!existingList;

  const [name, setName] = useState(existingList?.name ?? "");
  const [books, setBooks] = useState<ListBook[]>(existingList?.books ?? []);
  const [page, setPage] = useState(0);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Book[]>([]);
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  useEffect(() => {
    if (!query.trim()) { setResults([]); setSearching(false); return; }
    let cancelled = false;
    const timer = setTimeout(() => {
      setSearching(true);
      searchBooksWithFallback(query, lang, 8)
        .then((b) => { if (!cancelled) { setResults(b); setSearching(false); } })
        .catch(() => { if (!cancelled) { setResults([]); setSearching(false); } });
    }, 400);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [query, lang]);

  const totalPages = Math.max(1, Math.ceil(books.length / BOOKS_PER_PAGE));
  const safePage = Math.min(page, totalPages - 1);
  const pageBooks = books.slice(
    safePage * BOOKS_PER_PAGE,
    safePage * BOOKS_PER_PAGE + BOOKS_PER_PAGE,
  );

  const addBook = (book: Book) => {
    if (books.length >= MAX_LIST_BOOKS) return;
    if (books.some((b) => b.key === book.key)) return;
    setBooks((prev) => [
      ...prev,
      { key: book.key, title: book.title, authors: book.authors, cover_url: book.cover_url },
    ]);
    setQuery("");
    setResults([]);
  };

  const removeBook = (key: string) => {
    setBooks((prev) => prev.filter((b) => b.key !== key));
  };

  const handleSubmit = async () => {
    if (!isValidListName(name) || saving) return;
    setSaving(true);
    setSaveError(null);
    try {
      await onSubmit({ name: name.trim(), books });
      onClose();
    } catch {
      setSaveError(t("myLibrary.listEditor.saveError"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="list-editor-modal" role="dialog" aria-modal="true">
      <div className="list-editor-modal__backdrop" onClick={onClose} />
      <div className="list-editor-modal__box">
        <div className="list-editor-modal__header">
          <h2 className="list-editor-modal__title">
            {isEdit
              ? t("myLibrary.listEditor.editTitle")
              : t("myLibrary.listEditor.createTitle")}
          </h2>
          <button
            type="button"
            className="list-editor-modal__close"
            onClick={onClose}
            aria-label={t("myLibrary.listEditor.closeAria")}
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        <input
          className="list-editor-modal__name"
          type="text"
          placeholder={t("myLibrary.listEditor.namePlaceholder")}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <p className="list-editor-modal__counter">
          {t("myLibrary.listEditor.counter", { count: books.length, max: MAX_LIST_BOOKS })}
        </p>

        <div className="list-editor-modal__current">
          {books.length === 0 && (
            <p className="list-editor-modal__empty">{t("myLibrary.listEditor.empty")}</p>
          )}
          {pageBooks.map((book) => (
            <div key={book.key} className="list-editor-modal__book-item">
              {book.cover_url && (
                <img
                  className="list-editor-modal__book-cover"
                  src={book.cover_url}
                  alt={book.title}
                />
              )}
              <div className="list-editor-modal__book-info">
                <span className="list-editor-modal__book-title">{book.title}</span>
                {book.authors?.[0] && (
                  <span className="list-editor-modal__book-author">{book.authors[0]}</span>
                )}
              </div>
              <button
                type="button"
                className="list-editor-modal__book-remove"
                onClick={() => removeBook(book.key)}
                aria-label={t("myLibrary.listEditor.removeAria", { title: book.title })}
              >
                <X size={16} aria-hidden="true" />
              </button>
            </div>
          ))}
        </div>

        {totalPages > 1 && (
          <div className="list-editor-modal__pager">
            <button
              type="button"
              className="list-editor-modal__pager-btn"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={safePage === 0}
              aria-label={t("myLibrary.listEditor.prevPage")}
            >
              <ChevronLeft size={18} aria-hidden="true" />
            </button>
            <span className="list-editor-modal__pager-info">
              {safePage + 1} / {totalPages}
            </span>
            <button
              type="button"
              className="list-editor-modal__pager-btn"
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={safePage === totalPages - 1}
              aria-label={t("myLibrary.listEditor.nextPage")}
            >
              <ChevronRight size={18} aria-hidden="true" />
            </button>
          </div>
        )}

        {books.length < MAX_LIST_BOOKS && (
          <>
            <input
              className="list-editor-modal__search"
              type="text"
              placeholder={t("myLibrary.listEditor.searchPlaceholder")}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            {searching && (
              <p className="list-editor-modal__searching">
                {t("myLibrary.listEditor.searching")}
              </p>
            )}
            {!searching && query.trim() && results.length === 0 && (
              <p className="list-editor-modal__no-results">
                {t("myLibrary.listEditor.noResults")}
              </p>
            )}
            {results.length > 0 && (
              <ul className="list-editor-modal__results">
                {results.map((book) => (
                  <li key={book.key}>
                    <button
                      type="button"
                      className="list-editor-modal__result-item"
                      onClick={() => addBook(book)}
                      disabled={books.some((b) => b.key === book.key)}
                    >
                      {book.cover_url && (
                        <img
                          className="list-editor-modal__result-cover"
                          src={book.cover_url}
                          alt=""
                          aria-hidden="true"
                        />
                      )}
                      <div>
                        <p className="list-editor-modal__result-title">{book.title}</p>
                        <p className="list-editor-modal__result-author">{book.authors[0]}</p>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}

        <div className="list-editor-modal__footer">
          {saveError && (
            <p className="list-editor-modal__save-error" role="alert">{saveError}</p>
          )}
          <div className="list-editor-modal__footer-actions">
            <button
              type="button"
              className="list-editor-modal__btn list-editor-modal__btn--cancel"
              onClick={onClose}
            >
              {t("myLibrary.listEditor.cancel")}
            </button>
            <button
              type="button"
              className="list-editor-modal__btn list-editor-modal__btn--save"
              onClick={handleSubmit}
              disabled={saving || !isValidListName(name)}
            >
              {saving ? t("myLibrary.listEditor.saving") : t("myLibrary.listEditor.save")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verificar build**

Run: `npm run build`
Expected: PASS (las claves i18n se añaden en la Tarea 8; `t()` con clave inexistente no rompe el type-check).

- [ ] **Step 3: Commit**

```bash
git add src/components/shelf/modals/ListEditorModal.tsx
git commit -m "feat(lists): add ListEditorModal component"
```

---

## Task 7: `ListEditorModal` — estilos

**Files:**
- Create: `src/components/shelf/modals/ListEditorModal.scss`

- [ ] **Step 1: Crear el SCSS espejando el modal de favoritos**

Copiar `src/components/profile/modals/FavoriteBooksEditorModal.scss` como base y renombrar el prefijo de clases `fav-editor-modal` → `list-editor-modal`. Las clases comunes (mismo estilo): `__backdrop`, `__box`, `__header`, `__title`, `__close`, `__search`, `__searching`, `__no-results`, `__results`, `__result-item`, `__result-cover`, `__result-title`, `__result-author`, `__footer`, `__footer-actions`, `__btn`, `__btn--cancel`, `__btn--save`, `__save-error`. El bloque de items `fav-item*` → `book-item`/`book-cover`/`book-info`/`book-title`/`book-author`/`book-remove`.

Añadir las clases nuevas que no existen en favoritos:

```scss
@use "@/styles/lib/mixins" as *;

.list-editor-modal {
  &__name {
    width: 100%;
    padding: var(--spacing-sm) var(--spacing-md);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    background: var(--color-surface);
    color: var(--color-text-primary);
    font-size: var(--font-size-md);
    margin-bottom: var(--spacing-xs);
  }

  &__counter {
    font-size: var(--font-size-sm);
    color: var(--color-text-secondary);
    margin: 0 0 var(--spacing-sm);
  }

  &__empty {
    font-size: var(--font-size-sm);
    color: var(--color-text-secondary);
    text-align: center;
    padding: var(--spacing-md) 0;
  }

  &__pager {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--spacing-md);
    margin: var(--spacing-xs) 0 var(--spacing-sm);
  }

  &__pager-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);
    background: var(--color-surface);
    color: var(--color-text-primary);
    padding: var(--spacing-xs);
    cursor: pointer;

    &:disabled { opacity: 0.4; cursor: default; }
  }

  &__pager-info {
    font-size: var(--font-size-sm);
    color: var(--color-text-secondary);
  }
}
```

Mantener el resto de selectores migrados desde el archivo de favoritos. Verificar que se usan los custom properties existentes (`_custom_properties.scss`); si algún token del ejemplo (`--radius-sm`, `--spacing-xs`, etc.) no existe con ese nombre exacto, usar el equivalente real del proyecto.

- [ ] **Step 2: Verificar build**

Run: `npm run build`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/components/shelf/modals/ListEditorModal.scss
git commit -m "feat(lists): add ListEditorModal styles"
```

---

## Task 8: Claves i18n

**Files:**
- Modify: `src/plugins/i18n/locales/es/myLibrary.json`
- Modify: `src/plugins/i18n/locales/en/myLibrary.json`

- [ ] **Step 1: Editar `es/myLibrary.json`**

Dentro del objeto `myLibrary`: **eliminar** el objeto mock `lists` (claves `recommended`, `drama`, `women`). **Añadir** estas claves:

```json
"allListsTitle": "Listas",
"listEditor": {
  "createTitle": "Crear lista",
  "editTitle": "Editar lista",
  "closeAria": "Cerrar",
  "namePlaceholder": "Nombre de la lista",
  "counter": "{{count}}/{{max}} libros",
  "empty": "Aún no has añadido libros",
  "searchPlaceholder": "Busca por título, autor o ISBN",
  "searching": "Buscando...",
  "noResults": "Sin resultados",
  "removeAria": "Quitar {{title}}",
  "prevPage": "Anteriores",
  "nextPage": "Siguientes",
  "cancel": "Cancelar",
  "save": "Guardar",
  "saving": "Guardando...",
  "saveError": "No se pudo guardar la lista"
},
"listDetail": {
  "empty": "Esta lista no tiene libros",
  "notFound": "Lista no disponible",
  "edit": "Editar",
  "delete": "Eliminar",
  "confirmDelete": "¿Eliminar esta lista?",
  "confirmDeleteYes": "Eliminar",
  "confirmDeleteNo": "Cancelar"
}
```

- [ ] **Step 2: Editar `en/myLibrary.json`**

Misma operación: eliminar `lists` mock, añadir:

```json
"allListsTitle": "Lists",
"listEditor": {
  "createTitle": "Create list",
  "editTitle": "Edit list",
  "closeAria": "Close",
  "namePlaceholder": "List name",
  "counter": "{{count}}/{{max}} books",
  "empty": "You haven't added any books yet",
  "searchPlaceholder": "Search by title, author or ISBN",
  "searching": "Searching...",
  "noResults": "No results",
  "removeAria": "Remove {{title}}",
  "prevPage": "Previous",
  "nextPage": "Next",
  "cancel": "Cancel",
  "save": "Save",
  "saving": "Saving...",
  "saveError": "Could not save the list"
},
"listDetail": {
  "empty": "This list has no books",
  "notFound": "List not available",
  "edit": "Edit",
  "delete": "Delete",
  "confirmDelete": "Delete this list?",
  "confirmDeleteYes": "Delete",
  "confirmDeleteNo": "Cancel"
}
```

- [ ] **Step 3: Verificar paridad de claves**

Run el script de paridad usado en sesiones previas (compara rutas de claves es/en). Expected: `myLibrary.json` en paridad.

- [ ] **Step 4: Commit**

```bash
git add src/plugins/i18n/locales/es/myLibrary.json src/plugins/i18n/locales/en/myLibrary.json
git commit -m "feat(lists): add i18n keys for list editor and pages"
```

---

## Task 9: Refactor de `ListsSection`

**Files:**
- Modify: `src/components/shelf/sections/ListsSection.tsx`

- [ ] **Step 1: Reescribir `ListsSection.tsx`**

```tsx
import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import ListCard from "@/components/shelf/cards/ListCard";
import type { BookList } from "@/types/BookList";
import { ChevronRight, Plus } from "lucide-react";
import "./ListsSection.scss";

const PREVIEW_COUNT = 3;

type ListsSectionProps = {
  lists: BookList[];
  userId: string;
  isOwner: boolean;
  onCreateList: () => void;
};

export default function ListsSection({
  lists, userId, isOwner, onCreateList,
}: ListsSectionProps) {
  const { t } = useTranslation();
  const visibleLists = lists.slice(0, PREVIEW_COUNT);

  return (
    <section className="lists-section">
      <div className="lists-section__header">
        <h2 className="lists-section__title">{t("myLibrary.listsTitle")}</h2>
        {lists.length > PREVIEW_COUNT && (
          <Link to={`/lists/${userId}`} className="lists-section__see-all">
            {t("myLibrary.seeAll")} <ChevronRight size={14} aria-hidden="true" />
          </Link>
        )}
      </div>

      <div className="lists-section__grid">
        {visibleLists.map((list) => (
          <ListCard key={list.id} list={list} userId={userId} />
        ))}

        {isOwner && (
          <button
            type="button"
            className="lists-section__create"
            onClick={onCreateList}
          >
            <div className="lists-section__create-icon">
              <Plus size={18} aria-hidden="true" />
            </div>
            <span className="lists-section__create-text">
              {t("myLibrary.createList")}
            </span>
          </button>
        )}
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Verificar build**

Run: `npm run build`
Expected: FAIL — `MyLibraryPage.tsx` y `ProfilePage.tsx` aún pasan `lists={READING_LISTS}` sin las props nuevas. Esperado; se arregla en Tareas 12-13. Confirmar que solo fallan esos dos archivos.

- [ ] **Step 3: Commit**

```bash
git add src/components/shelf/sections/ListsSection.tsx
git commit -m "feat(lists): wire ListsSection to real data and create button"
```

---

## Task 10: `AllListsPage` + ruta

**Files:**
- Create: `src/pages/lists/AllListsPage.tsx`
- Create: `src/pages/lists/AllListsPage.scss`
- Modify: `src/routes/routes.tsx`

- [ ] **Step 1: Crear `AllListsPage.tsx`**

```tsx
import { useState } from "react";
import { useParams, useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { ChevronLeft, Plus } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useLists } from "@/hooks/useLists";
import ListCard from "@/components/shelf/cards/ListCard";
import ListEditorModal from "@/components/shelf/modals/ListEditorModal";
import "./AllListsPage.scss";

export default function AllListsPage() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user } = useAuth();
  const { lists, loading, createList } = useLists(userId);
  const [editorOpen, setEditorOpen] = useState(false);

  const isOwner = !!user && user.uid === userId;

  return (
    <div className="all-lists-page">
      <div className="all-lists-page__header">
        <button
          type="button"
          className="all-lists-page__back"
          onClick={() => navigate(-1)}
        >
          <ChevronLeft aria-hidden="true" />
          {t("explore.backBtn")}
        </button>
        <h2 className="all-lists-page__title">{t("myLibrary.allListsTitle")}</h2>
      </div>

      {!loading && (
        <div className="all-lists-page__grid">
          {lists.map((list) => (
            <ListCard key={list.id} list={list} userId={userId!} />
          ))}
          {isOwner && (
            <button
              type="button"
              className="lists-section__create"
              onClick={() => setEditorOpen(true)}
            >
              <div className="lists-section__create-icon">
                <Plus size={18} aria-hidden="true" />
              </div>
              <span className="lists-section__create-text">
                {t("myLibrary.createList")}
              </span>
            </button>
          )}
        </div>
      )}

      {editorOpen && isOwner && (
        <ListEditorModal
          onClose={() => setEditorOpen(false)}
          onSubmit={async ({ name, books }) => { await createList(name, books); }}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 2: Crear `AllListsPage.scss`**

Espejar `src/pages/explore/section/ExploreSectionPage.scss`: el bloque `.all-lists-page` con `&__header`, `&__back`, `&__title` calcado de `.section-page` (mismas reglas). `&__grid` es un grid de `ListCard` — reutilizar las reglas de `.lists-section__grid` de `ListsSection.scss` (mismo tipo de tarjeta). Importar mixins con `@use "@/styles/lib/mixins" as *;`.

- [ ] **Step 3: Añadir la ruta en `routes.tsx`**

Importar arriba, junto al resto de páginas:
```tsx
import AllListsPage from "@/pages/lists/AllListsPage";
```
Añadir dentro de `children`, después de la ruta `u/:username`:
```tsx
{ path: "lists/:userId", element: <AllListsPage /> },
```

- [ ] **Step 4: Verificar build**

Run: `npm run build`
Expected: FAIL solo por `MyLibraryPage`/`ProfilePage` (Tarea 9 pendiente de cerrar). El nuevo archivo no debe añadir errores propios.

- [ ] **Step 5: Commit**

```bash
git add src/pages/lists/AllListsPage.tsx src/pages/lists/AllListsPage.scss src/routes/routes.tsx
git commit -m "feat(lists): add AllListsPage and /lists/:userId route"
```

---

## Task 11: `ListDetailPage` + ruta

**Files:**
- Create: `src/pages/lists/ListDetailPage.tsx`
- Create: `src/pages/lists/ListDetailPage.scss`
- Modify: `src/routes/routes.tsx`

- [ ] **Step 1: Crear `ListDetailPage.tsx`**

```tsx
import { useState } from "react";
import { useParams, useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { ChevronLeft, Pencil, Trash2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useLists } from "@/hooks/useLists";
import BookCard from "@/components/book/cards/BookCard";
import ListEditorModal from "@/components/shelf/modals/ListEditorModal";
import { listBookToBook } from "@/utils/bookListUtils";
import "./ListDetailPage.scss";

export default function ListDetailPage() {
  const { userId, listId } = useParams<{ userId: string; listId: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user } = useAuth();
  const { lists, loading, updateList, deleteList } = useLists(userId);
  const [editorOpen, setEditorOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const isOwner = !!user && user.uid === userId;
  const list = lists.find((l) => l.id === listId);

  const handleDelete = async () => {
    if (!listId) return;
    await deleteList(listId);
    navigate(`/lists/${userId}`);
  };

  return (
    <div className="list-detail-page">
      <div className="list-detail-page__header">
        <button
          type="button"
          className="list-detail-page__back"
          onClick={() => navigate(-1)}
        >
          <ChevronLeft aria-hidden="true" />
          {t("explore.backBtn")}
        </button>
        {list && (
          <h2 className="list-detail-page__title">{list.name}</h2>
        )}
        {list && isOwner && (
          <div className="list-detail-page__actions">
            <button
              type="button"
              className="list-detail-page__action"
              onClick={() => setEditorOpen(true)}
            >
              <Pencil size={16} aria-hidden="true" /> {t("myLibrary.listDetail.edit")}
            </button>
            <button
              type="button"
              className="list-detail-page__action list-detail-page__action--danger"
              onClick={() => setConfirmOpen(true)}
            >
              <Trash2 size={16} aria-hidden="true" /> {t("myLibrary.listDetail.delete")}
            </button>
          </div>
        )}
      </div>

      {!loading && !list && (
        <p className="list-detail-page__empty">{t("myLibrary.listDetail.notFound")}</p>
      )}

      {list && list.books.length === 0 && (
        <p className="list-detail-page__empty">{t("myLibrary.listDetail.empty")}</p>
      )}

      {list && list.books.length > 0 && (
        <div className="list-detail-page__grid">
          {list.books.map((book) => (
            <BookCard key={book.key} book={listBookToBook(book)} />
          ))}
        </div>
      )}

      {editorOpen && isOwner && list && (
        <ListEditorModal
          existingList={list}
          onClose={() => setEditorOpen(false)}
          onSubmit={async ({ name, books }) => {
            await updateList(list.id, { name, books });
          }}
        />
      )}

      {confirmOpen && isOwner && (
        <div className="list-detail-page__confirm" role="dialog" aria-modal="true">
          <div
            className="list-detail-page__confirm-backdrop"
            onClick={() => setConfirmOpen(false)}
          />
          <div className="list-detail-page__confirm-box">
            <p className="list-detail-page__confirm-text">
              {t("myLibrary.listDetail.confirmDelete")}
            </p>
            <div className="list-detail-page__confirm-actions">
              <button
                type="button"
                className="list-detail-page__confirm-btn"
                onClick={() => setConfirmOpen(false)}
              >
                {t("myLibrary.listDetail.confirmDeleteNo")}
              </button>
              <button
                type="button"
                className="list-detail-page__confirm-btn list-detail-page__confirm-btn--danger"
                onClick={handleDelete}
              >
                {t("myLibrary.listDetail.confirmDeleteYes")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Crear `ListDetailPage.scss`**

Espejar `ExploreSectionPage.scss` para `.list-detail-page__header/__back/__title` y `.list-detail-page__grid` (grid de `BookCard`, idéntico a `.section-page__grid`). `&__empty` centrado con `color: var(--color-text-secondary)`. `&__actions` es un flex con `gap: var(--spacing-sm)`; `&__action` botón con borde fino; `&__action--danger` con `color: var(--color-error)` o token de error existente. El bloque `&__confirm*` espeja el backdrop/box de un modal (mismas reglas que `.list-editor-modal__backdrop`/`__box` pero más pequeño). Importar mixins con `@use "@/styles/lib/mixins" as *;`. Si algún token (`--color-error`) no existe con ese nombre, usar el real del proyecto.

- [ ] **Step 3: Añadir la ruta en `routes.tsx`**

Importar:
```tsx
import ListDetailPage from "@/pages/lists/ListDetailPage";
```
Añadir tras la ruta `lists/:userId`:
```tsx
{ path: "lists/:userId/:listId", element: <ListDetailPage /> },
```

- [ ] **Step 4: Verificar build**

Run: `npm run build`
Expected: FAIL solo por `MyLibraryPage`/`ProfilePage`. El nuevo archivo no añade errores propios.

- [ ] **Step 5: Commit**

```bash
git add src/pages/lists/ListDetailPage.tsx src/pages/lists/ListDetailPage.scss src/routes/routes.tsx
git commit -m "feat(lists): add ListDetailPage and /lists/:userId/:listId route"
```

---

## Task 12: Conectar `MyLibraryPage`

**Files:**
- Modify: `src/pages/my-library/MyLibraryPage.tsx`

- [ ] **Step 1: Reescribir `MyLibraryPage.tsx`**

Quitar el `READING_LISTS` hardcodeado y los imports de portadas mock (`listCover1..5`) y del tipo `ReadingList`. Resultado:

```tsx
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";
import CurrentReadingCard from "@/components/shelf/sections/CurrentReadingCard";
import ShelfSection from "@/components/shelf/sections/ShelfSection";
import ListsSection from "@/components/shelf/sections/ListsSection";
import ProgressSection from "@/components/shelf/sections/ProgressSection";
import ListEditorModal from "@/components/shelf/modals/ListEditorModal";
import { useShelf } from "@/hooks/useShelf";
import { useAuth } from "@/hooks/useAuth";
import { useLists } from "@/hooks/useLists";
import "./MyLibraryPage.scss";

function MyLibraryPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { shelfByStatus } = useShelf();
  const { user } = useAuth();
  const { lists, createList } = useLists(user?.uid);
  const [editorOpen, setEditorOpen] = useState(false);

  return (
    <section className="my-library">
      {shelfByStatus.reading.length > 0 && (
        <div className="my-library__reading-section">
          <h2 className="my-library__section-title">{t("myLibrary.heading")}</h2>
          <CurrentReadingCard />
        </div>
      )}

      <div className="my-library__shelf-section">
        <ShelfSection books={shelfByStatus} onSeeAll={() => navigate("/my-library/shelf")} />
      </div>

      <div className="my-library__lists-section">
        <ListsSection
          lists={lists}
          userId={user?.uid ?? ""}
          isOwner={true}
          onCreateList={() => setEditorOpen(true)}
        />
      </div>

      <div className="my-library__progresses-section">
        <ProgressSection />
      </div>

      {editorOpen && (
        <ListEditorModal
          onClose={() => setEditorOpen(false)}
          onSubmit={async ({ name, books }) => { await createList(name, books); }}
        />
      )}
    </section>
  );
}

export default MyLibraryPage;
```

- [ ] **Step 2: Verificar build y lint**

Run: `npm run build` — Expected: PASS para `MyLibraryPage` (puede seguir fallando `ProfilePage` hasta la Tarea 13).
Run: `npm run lint` — Expected: sin errores en `MyLibraryPage.tsx`.

- [ ] **Step 3: Commit**

```bash
git add src/pages/my-library/MyLibraryPage.tsx
git commit -m "feat(lists): wire MyLibraryPage to real lists"
```

---

## Task 13: Conectar `ProfilePage`

**Files:**
- Modify: `src/pages/profile/ProfilePage.tsx`

- [ ] **Step 1: Modificar `ProfilePage.tsx`**

Quitar el `READING_LISTS` hardcodeado y sus imports de portadas mock y del tipo `ReadingList`. Añadir:
- Import: `import { useState } from "react";` (si no está), `import { useLists } from "@/hooks/useLists";`, `import ListEditorModal from "@/components/shelf/modals/ListEditorModal";`.
- Resolver el `userId` del perfil mostrado (el mismo que ya se pasa a `useProfile`). Llamar `const { lists, createList } = useLists(profileUserId);` usando ese identificador.
- Estado local: `const [listEditorOpen, setListEditorOpen] = useState(false);`.

Sustituir el uso de `<ListsSection lists={READING_LISTS} />` por:
```tsx
<ListsSection
  lists={lists}
  userId={profileUserId}
  isOwner={isOwnProfile}
  onCreateList={() => setListEditorOpen(true)}
/>
```
La sección de listas debe renderizarse solo cuando `canViewFull` sea true (igual que estantería/actividad — usar la misma condición que ya gobierna esas secciones).

Añadir, junto al resto de modales de la página:
```tsx
{listEditorOpen && isOwnProfile && (
  <ListEditorModal
    onClose={() => setListEditorOpen(false)}
    onSubmit={async ({ name, books }) => { await createList(name, books); }}
  />
)}
```

`isOwnProfile`, `canViewFull` y el identificador del perfil ya los expone `useProfile`; usar esos. Si `ProfilePage` resuelve el usuario por `username`, usar el `uid` resuelto (el mismo que recibe `useProfile`), no el parámetro de ruta crudo.

- [ ] **Step 2: Verificar build y lint**

Run: `npm run build` — Expected: PASS (todo el proyecto compila).
Run: `npm run lint` — Expected: sin errores.

- [ ] **Step 3: Commit**

```bash
git add src/pages/profile/ProfilePage.tsx
git commit -m "feat(lists): wire ProfilePage to real lists"
```

---

## Task 14: Reglas Firestore (paso manual)

**Files:** ninguno en el repo — se edita en la consola de Firebase.

- [ ] **Step 1: Añadir la regla de la subcolección `lists`**

En las reglas Firestore, dentro de `match /Users/{uid}`, añadir un bloque para `lists` con la **misma lógica de visibilidad de lectura que ya tiene `Shelf`** (perfil público → cualquiera autenticado; privado → seguidores), y escritura solo para el dueño:

```
match /lists/{listId} {
  allow read: if <misma condición de lectura que el bloque Shelf>;
  allow write: if isOwner(uid);
}
```

Copiar la condición de `read` literalmente del bloque `Shelf` existente para no divergir. Publicar las reglas.

- [ ] **Step 2: Verificación manual end-to-end**

Con el dev server (`npm run dev`):
1. En "Mi biblioteca", pulsar crear lista → el modal abre, poner nombre, buscar y añadir libros, guardar → la lista aparece en la sección.
2. Crear 4+ listas → aparece "Ver todo" → lleva a `/lists/:userId` con todas.
3. Clicar una lista → `/lists/:userId/:listId` muestra los libros.
4. En el detalle: "Editar" abre el modal con los datos; "Eliminar" pide confirmación y, al confirmar, borra y vuelve a `/lists/:userId`.
5. Añadir >4 libros en el modal → aparecen las flechas de paginación.
6. Visitar el perfil de otro usuario → sus listas se ven (perfil público) o no (privado sin seguir), según visibilidad.

- [ ] **Step 3: Commit**

No hay cambios de repo en esta tarea. Si se ajustó algún archivo de reglas versionado en el proyecto, commitearlo; si las reglas solo viven en consola, no hay commit.

---

## Self-Review

**Cobertura del spec:**
- CRUD completo → crear (Tareas 6/9/12/13), ver (Tareas 10/11), renombrar + añadir/quitar (Tarea 11, modal en modo editar), borrar (Tarea 11). ✓
- Visibilidad ligada al perfil → Tarea 13 (`canViewFull`) + Tarea 14 (reglas). ✓
- Listas ilimitadas + página "todas" → Tareas 9 (`PREVIEW_COUNT`/"Ver todo") y 10. ✓
- Tope de 100 libros + contador → Tarea 2 (`MAX_LIST_BOOKS`) + Tarea 6 (contador, ocultar búsqueda). ✓
- Modelo array embebido → Tareas 1 y 3. ✓
- Dos rutas nuevas → Tareas 10 y 11. ✓
- Casos límite (nombre vacío, duplicados, tope, confirmación de borrado, lista inexistente) → Tarea 6 (nombre/duplicados/tope) y Tarea 11 (confirmación/notFound). ✓

**Consistencia de tipos:** `BookList`/`ListBook` (Tarea 1) se usan idénticos en servicio, hook, componentes y páginas. `useLists` expone `{ lists, loading, createList, updateList, deleteList }` y todas las páginas consumen esa firma. `ListEditorModal` recibe `{ existingList?, onSubmit, onClose }` y las tres llamadas (MyLibrary, AllLists, ListDetail) la respetan. ✓

**Placeholders:** sin TBD/TODO. Los SCSS de Tareas 7/10/11 referencian archivos hermanos concretos a espejar en vez de inventar tokens; es una instrucción accionable, no un placeholder.

**Riesgo conocido:** la Tarea 13 depende de nombres internos de `ProfilePage` (`isOwnProfile`, `canViewFull`, identificador de usuario) que el plan no transcribe literalmente porque el archivo no se leyó completo. El ejecutor debe leer `ProfilePage.tsx` antes de la Tarea 13 y mapear esos nombres.
