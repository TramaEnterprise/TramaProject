# Tech Debt Cleanup — Code Quality Audit

**Fecha:** 2026-05-24
**Estado:** Pendiente
**Alcance:** Modales (`src/components/{profile,shelf,book/info,auth}/modals|forms`) + barrido transversal del resto del proyecto (166 archivos `.ts`/`.tsx`).
**Origen:** Auditoría exhaustiva de calidad realizada el 2026-05-24 (61 hallazgos).

---

## 1. Contexto

El proyecto es un SPA React 19 + TypeScript con Firebase. `tsconfig` está en `strict: true` + `noUnusedLocals`/`noUnusedParameters`, así que el typecheck es severo. A pesar de eso, hay:

- Patrones duplicados en 8-9 archivos cada uno (escape key, click outside, body lock).
- 3 cards de libro reimplementan el mismo dropdown "guardar en estantería".
- Modales de búsqueda (`ListEditor` y `FavoriteBooksEditor`) son el mismo componente con CSS distinto.
- ~600 líneas de código comentado en hooks y modales.
- Archivos huérfanos (`useFantasyBook`, `UserProfile.tsx`, `bookDetailData.ts`).
- 4 archivos de auth con el mismo `catch (error: unknown) { error as { code?: string } }`.
- Componentes que pasan de 380 líneas (`UpdateProgressModal: 435`, `EditProfilePage: 388`, `ExplorePage: 381`).

Este spec organiza los 61 hallazgos en 4 sprints. Sprints 1-3 son los del top-10; Sprint 4 agrupa los hallazgos menores opcionales.

---

## 2. Convenciones (aplicables a todos los sprints)

| Aspecto | Convención |
|---------|-----------|
| Paths | Usar alias `@/...` (jamás `../../../`) |
| Componentes | `PascalCase.tsx`, un componente por archivo, `export default function Foo()` |
| Hooks | `useFoo.ts`, named export `export function useFoo()` |
| Tipos de props | `type FooProps = { ... }` (no `interface`) |
| Imports de tipos | `import type { ... }` (obligado por `verbatimModuleSyntax`) |
| SCSS | BEM, colocar al lado del componente, importar tokens desde `@/styles/lib/mixins` |
| i18n | Todo texto visible debe pasar por `useTranslation`; añadir keys en `es/` **y** `en/` |
| Idioma actual | `const { lang } = useCurrentLanguage();` (no `i18n.language.split('-')[0]`) |
| Logging | `logger.log/warn/error` desde `@/utils/logger`, nunca `console.*` directo |
| Errores Firebase | `getFirebaseErrorMessage(error)` recibe `unknown`, devuelve mensaje i18n |
| Cleanup async | Patrón `let cancelled = false; ... return () => { cancelled = true; }`, o `AbortSignal` cuando la llamada lo soporte |
| Commits | Uno por issue del spec, mensaje con prefijo `[S<n>.<id>]` para trazabilidad |

**Definition of Done de cada issue:**

1. `npm run lint` pasa sin warnings nuevos.
2. `npm run build` pasa (typecheck + Vite).
3. `npm test` pasa (vitest).
4. Smoke test manual del flujo afectado (descrito en cada issue).

---

## 3. Sprint 1 — Limpieza (bajo riesgo, sin cambios de comportamiento)

**Objetivo:** borrar código muerto, aplicar fixes triviales, y preparar el terreno para Sprint 2.
**Riesgo:** bajo. Ningún cambio cruza límites de módulo importantes.
**PR estimado:** 1 PR por bloque temático (5 PRs) o uno único grande, según preferencia.

### S1.1 — Borrar `useFantasyBook` (archivo huérfano)

- **Severidad:** IMPORTANT (código muerto).
- **Archivo:** `src/hooks/useFantasyBooks.ts`.
- **Problema:** Define `useFantasyBook` (typo: singular). Solo se referencia desde sí mismo. `useExploreBooks` cubre el mismo caso de uso.
- **Fix:** borrar el archivo.

```bash
# desde la raíz del repo
git rm src/hooks/useFantasyBooks.ts
```

- **Verificación:** `npm run build` debe pasar. Si falla, hay un import oculto — buscar con `Grep useFantasyBook`.

---

### S1.2 — Borrar `bookDetailData.ts` y `FALLBACK_REVIEWS`

- **Severidad:** CRITICAL (bug semántico: reviews ficticias en libros reales).
- **Archivos:**
  - `src/utils/bookDetailData.ts` (borrar)
  - `src/utils/bookDetailData.test.ts` (borrar)
  - `src/hooks/useBookDetail.ts:3, 160` (sustituir uso)
  - Assets `src/assets/el-nombre-del-viento.jpg`, `src/assets/covers/shelf-1..5.jpg` (revisar si quedan huérfanos).
- **Problema:** `FALLBACK_REVIEWS` inyecta reviews literales de "Andrea Ruiz", "Carlos Méndez", "María García" en cada `BookDetail` que se carga, independientemente del libro real.
- **Fix:**

```ts
// src/hooks/useBookDetail.ts
// ANTES:
import { FALLBACK_REVIEWS } from "@/utils/bookDetailData";
// ...
reviews: FALLBACK_REVIEWS,

// DESPUÉS:
reviews: [],
```

Tras eso:

```bash
git rm src/utils/bookDetailData.ts src/utils/bookDetailData.test.ts
# Verificar que ningún componente consume `BookDetail.reviews` esperando datos:
```

```bash
Grep "\.reviews" --type=tsx
```

Si nadie los lee aún, los `reviews: []` puede simplificarse a `reviews?: Review[]` en el tipo `BookDetail`.

- **Verificación:** abrir un libro en la app y comprobar que no aparecen las reviews de "Andrea Ruiz".

---

### S1.3 — Borrar `UserProfile.tsx` huérfano

- **Severidad:** IMPORTANT (código muerto).
- **Archivo:** `src/components/auth/UserProfile.tsx`.
- **Problema:** Nadie hace `import UserProfile from "@/components/auth/UserProfile"`. Es un componente residual.
- **Fix:** `git rm src/components/auth/UserProfile.tsx`.
- **Verificación:** `npm run build`.

---

### S1.4 — Borrar comentarios masivos (~600 líneas)

- **Severidad:** IMPORTANT (ruido, dificulta lectura).
- **Archivos prioritarios:**

| Archivo | Líneas a borrar aprox |
|---------|----------------------|
| `src/services/firebase/firebaseBooks.ts` | 117 |
| `src/hooks/useBookSearch.ts:59-94, 154-189` | 62 |
| `src/hooks/useBookDetail.ts:38-81, 111-117` | 57 |
| `src/utils/genreUtils.ts` | 23 |
| `src/services/firebase/firebaseUsers.ts` | 40 |
| `src/services/api/googleBooksApi.ts` | 40 |
| `src/pages/my-library/MyLibraryPage.tsx` | 28 |
| `src/hooks/useBookRecommendations.ts:71-90` | 24 |
| `src/hooks/useFantasyBooks.ts` | borrado en S1.1 |
| `src/hooks/useAuthorData.ts:71-100` | 30 |
| `src/pages/profile/ProfilePage.tsx:13-19, 28-32` | 14 |
| `src/components/profile/modals/FollowRequestsModal.tsx` | ver S1.5 |

- **Problema:** Git ya conserva el historial. Comentarios obsoletos obligan a leer dos veces y enmascaran código vivo.
- **Fix:** revisar archivo por archivo. Si la lógica comentada es referencia útil para un cambio pendiente, moverla a un issue/plan en `docs/superpowers/plans/`. Si no, borrar.
- **Verificación:** ningún `npm run build` debería fallar — el código comentado es inerte por definición.

---

### S1.5 — `FollowRequestsModal`: decidir sobre `busy` state

- **Severidad:** IMPORTANT (race condition silenciosa con doble-click).
- **Archivo:** `src/components/profile/modals/FollowRequestsModal.tsx:27, 52, 60-64`.
- **Problema:** El state `busy` para deshabilitar botones está comentado. Sin él, un doble-click rápido dispara `acceptFollowRequest` dos veces.
- **Fix (descomentar + completar):**

```tsx
const [busyUid, setBusyUid] = useState<string | null>(null);

const resolve = async (request: FollowRequest, action: (uid: string) => Promise<void>) => {
  if (busyUid === request.requesterUid) return;
  setBusyUid(request.requesterUid);
  setRequests((rs) => rs.filter((r) => r.requesterUid !== request.requesterUid));
  try {
    await action(request.requesterUid);
    if (action === acceptFollowRequest) onAccepted?.();
  } catch {
    logger.error("[FollowRequestsModal] action failed");
    setRequests((rs) => [request, ...rs]);
  } finally {
    setBusyUid(null);
  }
};

// En el render, pasar `disabled={busyUid !== null}` a los botones de accept/reject.
```

- **Verificación:** doble-click rápido en accept; debe permitir solo una petición.

---

### S1.6 — Reemplazar `i18n.language.split('-')[0]` por `useCurrentLanguage`

- **Severidad:** IMPORTANT (DRY + consistencia).
- **Archivos (7):**
  - `src/context/ShelfContext.tsx:22`
  - `src/hooks/useProfile.ts:54`
  - `src/hooks/useAuthorData.ts:59`
  - `src/hooks/useBookDetail.ts:21`
  - `src/components/book/cards/FeaturedBookCard.tsx:33`
  - `src/components/shelf/modals/ListEditorModal.tsx:22`
  - `src/components/profile/modals/FavoriteBooksEditorModal.tsx:33`
- **Fix por archivo:**

```ts
// ANTES:
const { i18n } = useTranslation();
const lang = i18n.language.split('-')[0];

// DESPUÉS:
import { useCurrentLanguage } from "@/plugins/i18n/useCurrentLanguage";
const { lang } = useCurrentLanguage();
```

Si el componente sigue necesitando `t()`, conservar `const { t } = useTranslation();` (separar imports).

- **Verificación:** cambiar idioma del navegador a inglés, recargar, comprobar que `lang === "en"` en cada flujo afectado (búsqueda, modales, libro detalle).

---

### S1.7 — Extraer `resolveCoverSrc` y centralizar el patrón

- **Severidad:** IMPORTANT (consistencia + DRY).
- **Archivos (8):** `UpdateProgressModal.tsx:200`, `BookTile.tsx:13`, `CurrentReadingCard.tsx:55`, `BookCard.tsx:71`, `FeaturedBookCard.tsx:100`, `useAuthorData.ts:146, 165`, `useBookDetail.ts:140`.
- **Problema:** El patrón `cover_url ?? (cover_id ? getCoverUrl(cover_id) : X)` se repite con `X` siendo `undefined`, `null`, `""` según el sitio. Inconsistente.
- **Fix:**

```ts
// src/utils/coverImage.ts (añadir)
import type { Book } from "@/types/Book";

export function resolveCoverSrc(book: Pick<Book, "cover_url" | "cover_id">): string | null {
  return book.cover_url ?? (book.cover_id ? getCoverUrl(book.cover_id) : null);
}
```

En cada call site, `const coverSrc = resolveCoverSrc(book);` y ajustar el render para que acepte `null` (usa el placeholder ya existente).

- **Verificación:** snapshot visual de un libro sin cover (debe mostrar placeholder); con cover_url (mostrar imagen); con solo cover_id (mostrar imagen vía OpenLibrary CDN).

---

### S1.8 — Centralizar manejo de errores Firebase en `getFirebaseErrorMessage`

- **Severidad:** IMPORTANT (4 sitios con el mismo cast inseguro).
- **Archivos:**
  - `src/services/firebase/firebaseErrors.ts` (modificar firma)
  - `src/components/auth/sign-in-buttons/SignInGoogleButton.tsx:27-29`
  - `src/components/auth/sign-in-buttons/SignInAppleButton.tsx:26-28`
  - `src/components/auth/forms/LoginForm.tsx:37-39, 50-52`
  - `src/components/auth/forms/RegisterForm.tsx:45-47`
- **Fix:**

```ts
// src/services/firebase/firebaseErrors.ts
import { FirebaseError } from "firebase/app";

export function getFirebaseErrorMessage(error: unknown): string {
  if (error instanceof FirebaseError) return MESSAGES[error.code] ?? MESSAGES.unknown;
  if (typeof error === "object" && error !== null && "code" in error) {
    const code = String((error as { code: unknown }).code);
    return MESSAGES[code] ?? MESSAGES.unknown;
  }
  return MESSAGES.unknown;
}
```

En los 4 call sites:

```ts
// ANTES:
catch (error: unknown) {
  const firebaseErr = error as { code?: string };
  setFirebaseError(getFirebaseErrorMessage(firebaseErr.code ?? "unknown"));
}

// DESPUÉS:
catch (error) {
  setFirebaseError(getFirebaseErrorMessage(error));
}
```

- **Verificación:** provocar un error de auth (email mal formado, password corta) y comprobar que el mensaje sigue siendo el mismo.

---

### S1.9 — `LoginForm`: throw de literal → `EmailNotVerifiedError`

- **Severidad:** IMPORTANT (sin stack trace, error tracking ciego).
- **Archivo:** `src/components/auth/forms/LoginForm.tsx:34`.
- **Fix:**

```ts
// src/services/firebase/firebaseErrors.ts (añadir)
export class EmailNotVerifiedError extends Error {
  readonly code = "auth/email-not-verified" as const;
  constructor() {
    super("Email not verified");
    this.name = "EmailNotVerifiedError";
  }
}

// LoginForm.tsx
import { EmailNotVerifiedError } from "@/services/firebase/firebaseErrors";
// ...
if (!credential.user.emailVerified) {
  await sendVerificationEmail(credential.user);
  await logoutUser();
  throw new EmailNotVerifiedError();
}
```

- **Verificación:** intentar login con cuenta no verificada y comprobar el mensaje en pantalla.

---

### S1.10 — Eliminar non-null assertions inseguras (`!`)

- **Severidad:** IMPORTANT (TS narrowing roto).
- **Archivos:**

#### S1.10a — `book.rating!.toFixed(1)`
- `src/components/book/cards/BookCard.tsx:142`
- `src/components/book/cards/FeaturedBookCard.tsx:162`

```tsx
// ANTES:
{(book.rating ?? 0) > 0 ? (
  <span>{book.rating!.toFixed(1)}</span>
) : ...}

// DESPUÉS:
const rating = book.rating ?? 0;
return rating > 0 ? <span>{rating.toFixed(1)}</span> : ...;
```

#### S1.10b — `cover_id!` con type guard
- `src/hooks/useAuthorData.ts:191`

```ts
// ANTES:
.filter(b => b.cover_id !== null && b.title.toLowerCase() !== ...)
.slice(0, 4)
.map(b => ({ ...
  cover_url: getCoverUrl(b.cover_id!),
}));

// DESPUÉS:
.filter((b): b is Book & { cover_id: number } =>
  b.cover_id !== null && b.title.toLowerCase() !== ...
)
.slice(0, 4)
.map(b => ({
  ...
  cover_url: getCoverUrl(b.cover_id),  // ya no necesita `!`
}));
```

#### S1.10c — `abortController.current!.signal` con var local
- `src/hooks/useExploreBooks.ts:134`

```ts
// ANTES:
abortController.current?.abort();
abortController.current = new AbortController();
// ...
const mappedBooks = await fetchFantasyBooks(limit, lang, abortController.current!.signal);

// DESPUÉS:
abortController.current?.abort();
const controller = new AbortController();
abortController.current = controller;
// ...
const mappedBooks = await fetchFantasyBooks(limit, lang, controller.signal);
```

- **Verificación:** typecheck pasa sin `!` en estos sitios.

---

### S1.11 — `useProfile`: depender de `user?.uid`, no del objeto `user`

- **Severidad:** IMPORTANT (re-fetches innecesarios si Firebase reemite).
- **Archivo:** `src/hooks/useProfile.ts:116`.
- **Fix:**

```ts
// ANTES:
}, [userId, user]);

// DESPUÉS:
}, [userId, user?.uid]);
```

Aplicar el mismo cambio a cualquier otro `useEffect` que dependa del objeto `user` completo.

- **Verificación:** abrir DevTools React Profiler, navegar al perfil; el efecto no debe re-disparar si solo Firebase reemite el mismo usuario.

---

### S1.12 — `HistoryModal`: añadir cleanup `cancelled` en useEffect de fetch

- **Severidad:** IMPORTANT (race condition).
- **Archivo:** `src/components/shelf/modals/HistoryModal.tsx:104-109`.
- **Fix:**

```tsx
useEffect(() => {
  if (!user) return;
  let cancelled = false;
  getActivity(user.uid, 50)
    .then((all) => { if (!cancelled) setItems(all.filter((a) => a.bookId === bookId)); })
    .finally(() => { if (!cancelled) setLoading(false); });
  return () => { cancelled = true; };
}, [user, bookId]);
```

(Patrón ya usado en `FollowersModal`, `FollowRequestsModal`, etc.)

---

### S1.13 — `HistoryModal`: i18n del texto hardcoded en ES

- **Severidad:** IMPORTANT (i18n incompleto).
- **Archivos:**
  - `src/components/shelf/modals/HistoryModal.tsx:11-25, 140, 173, 177`
  - `src/plugins/i18n/locales/es/myLibrary.json` (añadir keys)
  - `src/plugins/i18n/locales/en/myLibrary.json` (añadir keys)
- **Fix:**

```jsonc
// locales/es/myLibrary.json
"historyModal": {
  "title": "Historial de actividad",
  "closeAria": "Cerrar",
  "loading": "Cargando...",
  "empty": "Sin actividad registrada para este libro.",
  "events": {
    "reading_started": "Empezaste a leer",
    "book_finished": "Terminaste de leer",
    "progress": "Actualizaste el progreso",
    "review": "Escribiste una reseña",
    "list_created": "Creaste una lista",
    "watchlist_add": "Añadiste a la lista"
  },
  "timeAgo": {
    "seconds": "hace unos segundos",
    "minutes": "hace {{n}}m",
    "hours": "hace {{n}}h",
    "days": "hace {{n}}d"
  }
}
```

Y en `HistoryModal.tsx`, reemplazar literales por `t("myLibrary.historyModal.…")` y `t("myLibrary.historyModal.timeAgo.minutes", { n: ... })`.

---

### S1.14 — Reemplazar `console.*` por `logger.*`

- **Severidad:** MINOR (consistencia).
- **Archivos con `console.*`:** 14 archivos (49 ocurrencias). Ver lista en el informe original (sección 7.15).
- **Fix:** sustituir `console.log/warn/error` por `logger.log/warn/error` importando `@/utils/logger`. Excepciones: `src/utils/logger.ts` y sus tests.
- **Verificación:** `Grep "console\." src --type=tsx` debe devolver 0 fuera de `logger.ts`.

---

### S1.15 — `useExploreFeed`: catch global con i18n y AbortError

- **Severidad:** IMPORTANT (mensaje no traducible, oculta AbortError).
- **Archivo:** `src/hooks/useExploreFeed.ts:294-302`.
- **Fix:**

```ts
} catch (err) {
  if (err instanceof DOMException && err.name === "AbortError") return;
  logger.error("[useExploreFeed] buildSections failed", err);
  setError(err instanceof Error ? err.message : "unknown");
}
```

Y en `ExplorePage`, mapear el código a i18n al renderizarlo.

---

### S1.16 — `parseFloat(book.rating.toFixed(1))` redundante

- **Severidad:** MINOR.
- **Archivo:** `src/components/book/info/BookInfoCard.tsx:125`.
- **Fix:**

```tsx
<span>{book.rating.toFixed(1)}</span>
```

Garantiza siempre "4.0" en lugar de "4".

---

### S1.17 — `useMemo` trivial en `useExploreFeed.cacheKey`

- **Severidad:** MINOR (no aporta).
- **Archivo:** `src/hooks/useExploreFeed.ts:260-267`.
- **Fix:**

```ts
const cacheKey = `feed:${params.lang}|${uid ?? ""}|${params.favoritesReferenceBook?.key ?? ""}`;
```

---

### S1.18 — `googleLogo` importado desde `public/`

- **Severidad:** MINOR (anti-patrón Vite).
- **Archivo:** `src/components/auth/sign-in-buttons/SignInGoogleButton.tsx:6`.
- **Fix:** mover `public/google-logo.svg` a `src/assets/google-logo.svg`, o usar string literal `<img src="/google-logo.svg" />` (sin import).

---

### S1.19 — Borrar tipo `AuthScreen` sin uso

- **Severidad:** MINOR.
- **Archivo:** `src/types/AuthTypes.ts:14`.
- **Fix:** `git rm` esa línea. `AuthForm.tsx` define su `FormScreen` local más restrictivo, mejor.

---

### S1.20 — Mover `MAX_FAVORITES` a `bookListUtils`

- **Severidad:** MINOR.
- **Archivos:**
  - `src/utils/bookListUtils.ts` (añadir)
  - `src/components/profile/modals/FavoriteBooksEditorModal.tsx:11` (eliminar)
- **Fix:**

```ts
// src/utils/bookListUtils.ts
export const MAX_FAVORITES = 5;
export const MAX_LIST_BOOKS = 100;
```

---

### S1.21 — Renombrar `Searchbar.tsx` → `SearchBar.tsx`

- **Severidad:** MINOR (consistencia naming).
- **Archivo:** `src/components/common/Searchbar.tsx`.
- **Fix:** `git mv` + actualizar imports.
- **Verificación:** `npm run build`.

---

### S1.22 — Añadir `.prettierrc` y formatear

- **Severidad:** MINOR (consistencia indentación).
- **Problema:** `ListEditorModal.tsx` mezcla indentación de 2 y 4 espacios; `useLists.ts` usa 4 espacios; el resto usa 2.
- **Fix:**

```json
// .prettierrc
{
  "tabWidth": 2,
  "useTabs": false,
  "singleQuote": false,
  "semi": true,
  "trailingComma": "es5",
  "printWidth": 100
}
```

Y `npm run format` (añadir script a `package.json`): `prettier --write "src/**/*.{ts,tsx,scss}"`.

- **Verificación:** un único PR con todos los cambios de formato (no mezclar con lógica).

---

### S1.23 — Sprint 1 checklist final

- [ ] S1.1 — Borrar `useFantasyBook`
- [ ] S1.2 — Borrar `bookDetailData.ts` + `FALLBACK_REVIEWS`
- [ ] S1.3 — Borrar `UserProfile.tsx`
- [ ] S1.4 — Borrar comentarios masivos
- [ ] S1.5 — `FollowRequestsModal`: activar `busy` state
- [ ] S1.6 — `useCurrentLanguage` en 7 sitios
- [ ] S1.7 — Extraer `resolveCoverSrc`
- [ ] S1.8 — Centralizar `getFirebaseErrorMessage`
- [ ] S1.9 — `EmailNotVerifiedError` class
- [ ] S1.10 — Eliminar `!` en 4 sitios
- [ ] S1.11 — `useProfile` dep `user?.uid`
- [ ] S1.12 — `HistoryModal` cleanup
- [ ] S1.13 — `HistoryModal` i18n
- [ ] S1.14 — Reemplazar `console.*` por `logger`
- [ ] S1.15 — `useExploreFeed` catch
- [ ] S1.16 — `parseFloat` redundante
- [ ] S1.17 — Eliminar `useMemo` trivial
- [ ] S1.18 — Mover `googleLogo`
- [ ] S1.19 — Borrar `AuthScreen`
- [ ] S1.20 — Mover `MAX_FAVORITES`
- [ ] S1.21 — Renombrar `Searchbar.tsx`
- [ ] S1.22 — Añadir prettier

---

## 4. Sprint 2 — Hooks compartidos (riesgo medio)

**Objetivo:** extraer los patrones repetidos a hooks reutilizables y aplicarlos. Esto desbloquea Sprint 3 (los refactors mayores se apoyan en estos hooks).
**Riesgo:** medio. Toca muchos archivos pero los cambios son mecánicos.
**Pre-requisito:** Sprint 1 (especialmente S1.4 y S1.6).

### S2.1 — Crear `useEscapeKey`

- **Severidad:** CRITICAL (duplicado en 9 archivos).
- **Archivo nuevo:** `src/hooks/useEscapeKey.ts`.
- **Fix:**

```ts
import { useEffect } from "react";

export function useEscapeKey(handler: () => void) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") handler();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [handler]);
}
```

- **Call sites a actualizar (9):**
  - `src/components/book/info/SynopsisModal.tsx:13-19`
  - `src/components/shelf/modals/UpdateProgressModal.tsx:123-127`
  - `src/components/shelf/modals/HistoryModal.tsx:111-115`
  - `src/components/shelf/modals/ListEditorModal.tsx:41-45`
  - `src/components/profile/modals/FavoriteBooksEditorModal.tsx:35-41`
  - `src/components/profile/modals/FollowersModal.tsx:48-54`
  - `src/components/profile/modals/FollowRequestsModal.tsx:29-35`
  - `src/components/notifications/NotificationsDropdown.tsx:21-34` (mantener el listener de click outside, este hook solo cubre Escape)
  - `src/components/profile/sections/ProfileMenu.tsx:19-32` (idem)

- **Reemplazo tipo:**

```tsx
// ANTES:
useEffect(() => {
  const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
  document.addEventListener("keydown", onKey);
  return () => document.removeEventListener("keydown", onKey);
}, [onClose]);

// DESPUÉS:
useEscapeKey(onClose);
```

- **Verificación:** abrir cada modal/dropdown, pulsar Escape, debe cerrar.

---

### S2.2 — Crear `useLockBodyScroll`

- **Severidad:** CRITICAL (inconsistencia UX: algunos modales bloquean scroll, otros no).
- **Archivo nuevo:** `src/hooks/useLockBodyScroll.ts`.
- **Fix:**

```ts
import { useEffect } from "react";

export function useLockBodyScroll() {
  useEffect(() => {
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = original; };
  }, []);
}
```

- **Call sites existentes (3):** `UpdateProgressModal`, `HistoryModal`, `SynopsisModal`.
- **Call sites a añadir (4):** `ListEditorModal`, `FavoriteBooksEditorModal`, `FollowersModal`, `FollowRequestsModal`. Estos modales ahora **no** bloquean el scroll; esta es la oportunidad de hacerlo consistente.
- **Reemplazo tipo:**

```tsx
// ANTES (en los 3 modales con bloqueo):
useEffect(() => {
  document.body.style.overflow = "hidden";
  return () => { document.body.style.overflow = ""; };
}, []);

// DESPUÉS:
useLockBodyScroll();
```

- **Verificación:** abrir cada modal, comprobar que el body no scrollea. Cerrar y comprobar que el scroll vuelve a funcionar.

---

### S2.3 — Crear `useClickOutside`

- **Severidad:** CRITICAL (duplicado en 8 archivos).
- **Archivo nuevo:** `src/hooks/useClickOutside.ts`.
- **Fix:**

```ts
import { useEffect, type RefObject } from "react";

export function useClickOutside<T extends HTMLElement>(
  ref: RefObject<T | null>,
  handler: () => void,
  enabled = true,
) {
  useEffect(() => {
    if (!enabled) return;
    const onMouseDown = (e: MouseEvent) => {
      if (!(e.target instanceof Node)) return;
      if (ref.current && !ref.current.contains(e.target)) handler();
    };
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [ref, handler, enabled]);
}
```

- **Call sites a actualizar (8):**
  - `BookCard.tsx:32-44` (2 refs — pasar el wrapper que contiene a ambos, o usar variante con array)
  - `FeaturedBookCard.tsx:35-44`
  - `BookInfoCard.tsx:51-60`
  - `NotificationsDropdown.tsx:21-34` (parte click outside)
  - `ProfileMenu.tsx:19-32` (idem)
  - `ProfileActionsMenu.tsx:28-37`
  - `UpdateProgressModal.tsx:134-138` (en handleBackdropMouseDown — opcional refactor, ya es onMouseDown del backdrop directo)
  - `HistoryModal.tsx:122-126` (idem)

- **Variante con dos refs (para `BookCard`):**

```ts
export function useClickOutsideMany<T extends HTMLElement>(
  refs: RefObject<T | null>[],
  handler: () => void,
  enabled = true,
) {
  useEffect(() => {
    if (!enabled) return;
    const onMouseDown = (e: MouseEvent) => {
      if (!(e.target instanceof Node)) return;
      const target = e.target;
      if (refs.every((r) => !r.current || !r.current.contains(target))) handler();
    };
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [refs, handler, enabled]);
}
```

- **Verificación:** abrir cada dropdown/menú, clicar fuera, debe cerrar. Clicar dentro, no debe cerrar.

---

### S2.4 — Crear `useDebouncedBookSearch`

- **Severidad:** IMPORTANT (duplicado en 2 modales).
- **Archivo nuevo:** `src/hooks/useDebouncedBookSearch.ts`.
- **Fix:**

```ts
import { useEffect, useState } from "react";
import type { Book } from "@/types/Book";
import { searchBooksWithFallback } from "@/services/firebase/firebaseBooks";

type Options = { lang: string; limit?: number; delayMs?: number };

export function useDebouncedBookSearch(query: string, opts: Options) {
  const { lang, limit = 8, delayMs = 400 } = opts;
  const [results, setResults] = useState<Book[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setResults([]);
      setSearching(false);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(() => {
      setSearching(true);
      searchBooksWithFallback(trimmed, lang, limit)
        .then((b) => { if (!cancelled) { setResults(b); setSearching(false); } })
        .catch(() => { if (!cancelled) { setResults([]); setSearching(false); } });
    }, delayMs);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [query, lang, limit, delayMs]);

  return { results, searching };
}
```

- **Call sites:**
  - `src/components/shelf/modals/ListEditorModal.tsx:47-57`
  - `src/components/profile/modals/FavoriteBooksEditorModal.tsx:43-67`
- **Reemplazo tipo:**

```tsx
// ANTES: ~22 líneas de useState + useEffect con setTimeout/cancelled.
// DESPUÉS:
const { results, searching } = useDebouncedBookSearch(query, { lang });
```

- **Verificación:** escribir rápido en el input de búsqueda; comprobar que solo se dispara una petición tras 400 ms; los resultados se muestran al volver.

---

### S2.5 — Estabilizar funciones en `NotificationsContext` con `useCallback`

- **Severidad:** IMPORTANT (ESLint disable artificial).
- **Archivos:**
  - `src/context/NotificationsContext.tsx:37-99`
  - `src/components/notifications/NotificationsDropdown.tsx:16-19`
- **Fix:**

```ts
// NotificationsContext.tsx — envolver cada handler:
const markAllRead = useCallback(async () => {
  if (!uid || unreadCount === 0) return;
  // ... resto igual
}, [uid, unreadCount, notifications]);

const remove = useCallback(async (id: string) => {
  if (!uid) return;
  // ...
}, [uid, notifications]);

const acceptRequest = useCallback(async (actorUid: string) => { /* ... */ }, [uid, notifications]);
const rejectRequest = useCallback(async (actorUid: string) => { /* ... */ }, [uid, notifications]);
```

Y en `NotificationsDropdown`:

```tsx
// ANTES:
useEffect(() => {
  markAllRead();
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, []);

// DESPUÉS:
useEffect(() => {
  markAllRead();
}, [markAllRead]);
```

- **Nota:** `markAllRead` depende de `notifications` (para hacer optimistic update). Cada cambio en `notifications` recreará la función → el efecto se dispararía. Considera leer `notifications` con un ref dentro del callback, o memoizar de otro modo. Si la solución se complica, dejar el `eslint-disable` con un comentario justificativo.

---

### S2.6 — `useSectionBooks` y `useExploreFeed`: cancelación con `AbortSignal`

- **Severidad:** IMPORTANT (fetches innecesarios al re-renderizar/cambiar de pestaña).
- **Archivos:**
  - `src/hooks/useSectionBooks.ts:54-99, 101-128`
  - `src/hooks/useExploreFeed.ts:278-306`
  - `src/services/firebase/firebaseBooks.ts` (firmas de las funciones consumidas — `getTrendingBooks`, `getTopRatedBooks`, etc.)
- **Problema:** El boolean `cancelled` solo evita `setState`, pero las llamadas Firestore siguen ejecutándose.
- **Fix:** Firestore no acepta `AbortSignal` directamente, pero sí podemos abortar `Promise.all` y descartar resultados de `getDocs` que llegaron tarde. La solución pragmática:

```ts
// Wrapper en firebaseBooks.ts (uno por función fetch):
export async function getTrendingBooks(lang: string, limit: number, signal?: AbortSignal): Promise<Book[]> {
  // ... query
  const snap = await getDocs(q);
  if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
  return snap.docs.map(/* ... */);
}
```

Y en el hook:

```ts
useEffect(() => {
  if (disabled) { setLoading(false); return; }
  const controller = new AbortController();
  setLoading(true);
  setError(null);
  fetchSection(type, params, lang, count, controller.signal)
    .then(...)
    .catch((err) => { if (err.name !== "AbortError") setError("error"); })
    .finally(() => { /* ... */ });
  return () => controller.abort();
}, [cacheKey, disabled]);
```

- **Verificación:** abrir DevTools Network, cambiar rápido entre secciones de Explorar; los requests previos deben aparecer como "cancelled" o el hook debe ignorar su resultado.

---

### S2.7 — `useExploreBooks.loadFromStorage`: validar shape

- **Severidad:** IMPORTANT (cast inseguro de JSON.parse).
- **Archivo:** `src/hooks/useExploreBooks.ts:22-30`.
- **Fix:**

```ts
function loadFromStorage(lang: string): Book[] | null {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY(lang));
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (
      typeof parsed !== "object" || parsed === null ||
      !("books" in parsed) || !("ts" in parsed) ||
      typeof (parsed as { ts: unknown }).ts !== "number" ||
      !Array.isArray((parsed as { books: unknown }).books)
    ) return null;
    const { books, ts } = parsed as { books: unknown[]; ts: number };
    if (Date.now() - ts > LOCAL_STORAGE_TTL) {
      localStorage.removeItem(LOCAL_STORAGE_KEY(lang));
      return null;
    }
    // Validación mínima de cada Book:
    const valid = books.filter((b): b is Book =>
      typeof b === "object" && b !== null &&
      typeof (b as Book).key === "string" &&
      typeof (b as Book).title === "string"
    );
    return valid.length > 0 ? valid : null;
  } catch {
    return null;
  }
}
```

- **Verificación:** corromper manualmente `localStorage["trama_cache_es"]`, recargar; debe re-fetch en lugar de crashear.

---

### S2.8 — `useExploreFeed`: rediseñar deps sin `paramsRef`

- **Severidad:** IMPORTANT (eslint-disable oculta dependencias).
- **Archivo:** `src/hooks/useExploreFeed.ts:269-308`.
- **Fix:** dos opciones:

**Opción A (preferida):** mover los identificadores que importan al `cacheKey` y depender de él:

```ts
const cacheKey = `feed:${params.lang}|${uid ?? ""}|${params.favoritesReferenceBook?.key ?? ""}`;

const fetch = useCallback(async (bypassCache = false) => {
  // ... no necesita paramsRef, usa params directamente porque la deps array incluye cacheKey
  const result = await buildSections(params);
  // ...
}, [cacheKey, disabled, params]);   // params puede inflar la cache key, pero al menos no hay disable.
```

**Opción B (si A causa re-fetches):** mantener `paramsRef` pero documentar:

```ts
const paramsRef = useRef(params);
useEffect(() => { paramsRef.current = params; });

const fetch = useCallback(async (bypassCache = false) => {
  // Intencional: leemos paramsRef.current porque la identidad de `params` cambia
  // en cada render del padre, pero el contenido relevante para refetch ya está en cacheKey.
  const result = await buildSections(paramsRef.current);
  // ...
}, [cacheKey, disabled]);
```

---

### S2.9 — Quitar `useState`/`useRef` redundantes de `EditProfilePage` blob cleanup

- **Severidad:** MINOR.
- **Archivo:** `src/pages/edit-profile/EditProfilePage.tsx:48-64`.
- **Fix:** crear un hook `useObjectUrl`:

```ts
// src/hooks/useObjectUrl.ts
import { useEffect, useRef, useState } from "react";

export function useObjectUrl(initialUrl: string | null = null) {
  const [url, setUrl] = useState<string | null>(initialUrl);
  const urlRef = useRef(url);

  useEffect(() => { urlRef.current = url; }, [url]);

  useEffect(() => () => {
    if (urlRef.current?.startsWith("blob:")) URL.revokeObjectURL(urlRef.current);
  }, []);

  const setFile = (file: File | null) => {
    if (urlRef.current?.startsWith("blob:")) URL.revokeObjectURL(urlRef.current);
    setUrl(file ? URL.createObjectURL(file) : null);
  };

  return { url, setUrl, setFile };
}
```

Y en `EditProfilePage`:

```tsx
const photo = useObjectUrl(null);
const banner = useObjectUrl(null);

// uso: photo.url, photo.setFile(file), photo.setUrl(profile.profilePhotoUrl);
```

Reemplaza ~30 líneas de boilerplate.

---

### S2.10 — Sprint 2 checklist

- [ ] S2.1 — `useEscapeKey` creado y aplicado en 9 sitios
- [ ] S2.2 — `useLockBodyScroll` creado y aplicado en 7 modales
- [ ] S2.3 — `useClickOutside` (y `useClickOutsideMany`) creado y aplicado en 8 sitios
- [ ] S2.4 — `useDebouncedBookSearch` creado y aplicado en 2 modales
- [ ] S2.5 — `NotificationsContext` con `useCallback`
- [ ] S2.6 — Cancelación con `AbortSignal` en `useSectionBooks`/`useExploreFeed`
- [ ] S2.7 — `loadFromStorage` validación
- [ ] S2.8 — `useExploreFeed` deps sin disable
- [ ] S2.9 — `useObjectUrl` hook

---

## 5. Sprint 3 — Refactor mayor (riesgo alto)

**Objetivo:** dividir los archivos enormes, extraer componentes compuestos, reescribir `useProfile`.
**Riesgo:** alto. Cambios en superficie pública de hooks/componentes; smoke testing imprescindible.
**Pre-requisito:** Sprints 1 y 2.

### S3.1 — Extraer `<ShelfDropdownButton>` (unifica 3 cards)

- **Severidad:** CRITICAL (duplicación masiva).
- **Archivos:**
  - **Nuevo:** `src/components/book/shelf-dropdown/ShelfDropdownButton.tsx`
  - **Nuevo:** `src/components/book/shelf-dropdown/ShelfDropdownButton.scss`
  - **Modificar:** `src/components/book/cards/BookCard.tsx` (eliminar dropdown inline)
  - **Modificar:** `src/components/book/cards/FeaturedBookCard.tsx` (idem)
  - **Modificar:** `src/components/book/info/BookInfoCard.tsx` (idem)
- **Diseño propuesto:**

```tsx
type ShelfDropdownButtonProps = {
  book: Book;
  variant: "compact" | "featured" | "detail";
  className?: string;
};

export default function ShelfDropdownButton({ book, variant, className }: ShelfDropdownButtonProps) {
  const [open, setOpen] = useState(false);
  const [tooltipVisible, setTooltipVisible] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const tooltipTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { addBook, removeBook, getStatus } = useShelf();
  const { isAuthenticated } = useAuth();
  const { t } = useTranslation();
  const saved = getStatus(book.key);

  useClickOutside(wrapperRef, () => setOpen(false), open);
  useEffect(() => () => {
    if (tooltipTimerRef.current) clearTimeout(tooltipTimerRef.current);
  }, []);

  const handleSaveBtnClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isAuthenticated) {
      setTooltipVisible(true);
      if (tooltipTimerRef.current) clearTimeout(tooltipTimerRef.current);
      tooltipTimerRef.current = setTimeout(() => setTooltipVisible(false), 2000);
      return;
    }
    setOpen((o) => !o);
  };

  const handleSelect = (e: React.MouseEvent, status: ShelfStatus) => {
    e.stopPropagation();
    if (saved === status) removeBook(book.key);
    else addBook(book, status);
    setOpen(false);
  };

  return (
    <div className={`shelf-dropdown shelf-dropdown--${variant} ${className ?? ""}`} ref={wrapperRef}>
      {/* tooltip + botón + dropdown */}
    </div>
  );
}
```

- **Migración:**
  - `BookCard`: reemplazar líneas 21-128 (dropdown + tooltip) por `<ShelfDropdownButton book={book} variant="compact" />`.
  - `FeaturedBookCard`: reemplazar líneas 22-87, 179-226 por `<ShelfDropdownButton book={book} variant="featured" />`.
  - `BookInfoCard`: reemplazar líneas 29-78, 176-221 por `<ShelfDropdownButton book={bookForShelf} variant="detail" />`.

- **Verificación:** smoke test de los tres cards: clic en botón guardar autenticado, cambio de status, eliminación; clic sin autenticar muestra tooltip.

---

### S3.2 — Extraer `<BookSearchPicker>` (unifica 2 modales)

- **Severidad:** CRITICAL (duplicación masiva).
- **Pre-requisito:** S2.4 (`useDebouncedBookSearch`).
- **Archivos:**
  - **Nuevo:** `src/components/book/search-picker/BookSearchPicker.tsx`
  - **Nuevo:** `src/components/book/search-picker/BookSearchPicker.scss`
  - **Modificar:** `src/components/shelf/modals/ListEditorModal.tsx`
  - **Modificar:** `src/components/profile/modals/FavoriteBooksEditorModal.tsx`
- **Diseño:**

```tsx
type BookSearchPickerProps<T extends { key: string }> = {
  selected: T[];
  max: number;
  toEntry: (book: Book) => T;
  onAdd: (entry: T) => void;
  onRemove: (key: string) => void;
  translationPrefix: string;     // ej "profile.favorites" o "myLibrary.listEditor"
};

export function BookSearchPicker<T extends { key: string; title: string; authors: string[]; cover_url?: string }>({
  selected, max, toEntry, onAdd, onRemove, translationPrefix,
}: BookSearchPickerProps<T>) {
  const { t } = useTranslation();
  const { lang } = useCurrentLanguage();
  const [query, setQuery] = useState("");
  const { results, searching } = useDebouncedBookSearch(query, { lang });

  // ... render selected + input + results
}
```

- **Migración:**
  - `FavoriteBooksEditorModal`: reemplazar líneas 26-202 con `<BookSearchPicker selected={favorites} max={5} toEntry={...} onAdd={addFavorite} onRemove={removeFavorite} translationPrefix="profile.favorites" />`. El modal queda en ~50 líneas.
  - `ListEditorModal`: igual, con paginación opcional. Si la paginación es muy específica, dejarla fuera del picker.

- **Verificación:** búsqueda + selección + eliminación en ambos modales.

---

### S3.3 — Unificar `SignInGoogleButton` y `SignInAppleButton`

- **Severidad:** IMPORTANT (duplicación).
- **Archivos:**
  - **Nuevo:** `src/components/auth/sign-in-buttons/SocialSignInButton.tsx`
  - **Modificar:** `src/components/auth/forms/RegisterForm.tsx`, `LoginForm.tsx` (o donde se monten)
  - **Borrar:** `SignInGoogleButton.tsx`, `SignInAppleButton.tsx`
- **Fix:**

```tsx
type Provider = "google" | "apple";

const PROVIDER_CONFIG = {
  google: { signIn: signInWithGoogle, labelKey: "auth.googleBtn", className: "auth__btn-google", icon: <GoogleLogo /> },
  apple: { signIn: signInWithApple, labelKey: "auth.appleBtn", className: "auth__btn-apple", icon: <AppleLogo /> },
} satisfies Record<Provider, ProviderConfig>;

type SocialSignInButtonProps = {
  provider: Provider;
  disabled?: boolean;
  onError?: (msg: string) => void;
};

export default function SocialSignInButton({ provider, disabled, onError }: SocialSignInButtonProps) {
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(false);
  const config = PROVIDER_CONFIG[provider];

  async function handle() {
    setIsLoading(true);
    try {
      const credential = await config.signIn();
      const [firstName = "", ...rest] = (credential.user.displayName ?? "").split(" ");
      await createUserProfile(credential.user.uid, {
        email: credential.user.email ?? "",
        name: firstName,
        surname: rest.join(" "),
      });
    } catch (error) {
      onError?.(getFirebaseErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <button className={config.className} type="button" onClick={handle} disabled={disabled || isLoading}>
      {config.icon}
      {t(config.labelKey)}
    </button>
  );
}
```

- **Uso:** `<SocialSignInButton provider="google" disabled={isSubmitting} onError={setError} />`.

---

### S3.4 — Dividir `UpdateProgressModal` (435 → ~120 líneas)

- **Severidad:** CRITICAL (archivo más grande, mezcla 5 responsabilidades, duplica `StarRating`).
- **Pre-requisitos:** S2.1, S2.2 (escape/lock hooks).
- **Archivos:**
  - **Modificar:** `src/components/shelf/modals/UpdateProgressModal.tsx` (orquestador, ~120 líneas)
  - **Nuevos:**
    - `src/components/shelf/modals/components/ProgressPageInput.tsx`
    - `src/components/shelf/modals/components/ProgressNoteField.tsx` (textarea con contador + shake animation)
    - `src/components/shelf/modals/components/BookRatingField.tsx` (usa `StarRating` de `common/`)
    - `src/components/shelf/modals/components/AbandonConfirmDialog.tsx`
  - **Borrar internamente:** `StarSvg` y `StarRating` locales (líneas 21-89), reusar `@/components/common/StarRating`.
- **Diseño del orquestador:**

```tsx
export default function UpdateProgressModal({ entry, onClose }: Props) {
  const { t } = useTranslation();
  const { updateProgress, removeBook } = useShelf();
  const panelRef = useRef<HTMLDivElement>(null);

  useEscapeKey(onClose);
  useLockBodyScroll();

  const [pageInput, setPageInput] = useState(entry.currentPage ? String(entry.currentPage) : "");
  const [rating, setRating] = useState(0);
  const [note, setNote] = useState("");
  const [review, setReview] = useState(entry.review ?? "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmAbandon, setConfirmAbandon] = useState(false);

  const currentPage = parsePageInput(pageInput, entry.book.pages ?? 0);
  const finished = (entry.book.pages ?? 0) > 0 && currentPage === (entry.book.pages ?? 0);

  const handleSave = async () => { /* ... */ };
  const handleAbandon = async () => { /* ... */ };

  return createPortal(
    <div className="progress-modal" onMouseDown={(e) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) onClose();
    }} role="dialog" aria-modal="true">
      <div className="progress-modal__panel" ref={panelRef}>
        <Header title={t(...)} onClose={onClose} />
        <Body>
          <BookInfo book={entry.book} />
          <ProgressPageInput value={pageInput} onChange={setPageInput} totalPages={entry.book.pages ?? 0} />
          {finished && <BookRatingField rating={rating} onChange={setRating} />}
          {finished
            ? <ProgressNoteField value={review} onChange={setReview} max={600} variant="review" />
            : <ProgressNoteField value={note} onChange={setNote} max={280} disabled={!pageChanged} variant="note" />
          }
        </Body>
        <Footer onAbandon={() => setConfirmAbandon(true)} onSave={handleSave} saving={isSubmitting} />
        {confirmAbandon && <AbandonConfirmDialog onConfirm={handleAbandon} onCancel={() => setConfirmAbandon(false)} />}
      </div>
    </div>,
    document.body,
  );
}
```

- **`ProgressNoteField`** se diseña para ser **reusado** por `EditProfilePage` (BioField, ver S3.5).
- **Verificación:** abrir modal con libro en progreso; cambiar página; añadir nota; marcar finished; valorar; salvar; cancelar; abandonar.

---

### S3.5 — Dividir `EditProfilePage` (388 → ~150 líneas)

- **Severidad:** IMPORTANT.
- **Pre-requisitos:** S2.9 (`useObjectUrl`), S3.4 (`ProgressNoteField` reutilizable como base de `BioField`).
- **Archivos:**
  - **Modificar:** `src/pages/edit-profile/EditProfilePage.tsx`
  - **Nuevos:**
    - `src/pages/edit-profile/components/AvatarUploader.tsx`
    - `src/pages/edit-profile/components/BannerUploader.tsx`
    - `src/pages/edit-profile/components/UsernameField.tsx` (incluye debounce de checkUsernameAvailable)
    - `src/pages/edit-profile/components/BioField.tsx` (o reusar el de S3.4)
- **Decisión clave:** `ProgressNoteField` (S3.4) y `BioField` (S3.5) son visualmente el mismo patrón (textarea + contador + error de "demasiados caracteres" + shake animation). Considera promoverlo a `src/components/common/LimitedTextarea.tsx`.

---

### S3.6 — Dividir `ExplorePage` (381 → ~150 líneas)

- **Severidad:** IMPORTANT.
- **Archivos:**
  - **Modificar:** `src/pages/explore/ExplorePage.tsx`
  - **Nuevos:**
    - `src/hooks/useShelfDerivedFavorites.ts` (extrae el `useMemo` de líneas 141-209)
    - `src/components/explore/ExploreSearchResults.tsx` (branch `isSearching`)
    - `src/components/explore/ExploreSectionsList.tsx` (branch `!isSearching && !showGuestVersion`)
    - `src/components/explore/ExploreGuestSections.tsx` (branch `showGuestVersion`)
- **`useShelfDerivedFavorites`:**

```ts
type ShelfDerived = {
  userShelfKeys: Set<string>;
  userAuthorKeys: string[];
  favoriteGenre: string | null;
  // ...
};

export function useShelfDerivedFavorites(): ShelfDerived | null {
  const { shelfByStatus, loading } = useShelf();
  const { isAuthenticated, isGuest } = useAuth();
  const { t } = useTranslation();
  const isLoggedIn = isAuthenticated && !isGuest;

  return useMemo(() => {
    if (!isLoggedIn || loading) return null;
    // ... toda la lógica de líneas 141-209 de ExplorePage
  }, [isLoggedIn, loading, shelfByStatus, t]);
}
```

---

### S3.7 — Refactor `useProfile.ts` (317 → ~80 líneas)

- **Severidad:** CRITICAL (hook monolítico, anti-patrón prevUserId, 18 retornos).
- **Archivos:**
  - **Modificar:** `src/hooks/useProfile.ts` (reducir a profile básico + counts)
  - **Nuevos:**
    - `src/hooks/useProfileShelf.ts`
    - `src/hooks/useProfileActivity.ts`
    - `src/hooks/useFollowActions.ts` (follow/unfollow/cancelRequest/sendFollowRequest)
    - `src/hooks/useBlockActions.ts` (block/unblock)
  - **Modificar:** `src/pages/profile/ProfilePage.tsx` (compone los hooks).
- **Eliminar:**
  - Patrón `prevUserId` + reset-en-render (línea 68-79). Sustituir por `key={userId}` en el componente padre o por state-machine compactado.
  - `incrementFollowers` / `decrementFollowers` (línea 289-295) — la suscripción en tiempo real (`subscribeToProfileCounts`) ya cubre esto. Los modales `FollowersModal` y `FollowRequestsModal` deben confiar en la suscripción y no manipular el contador directamente.

- **`useProfile` simplificado (después):**

```ts
export function useProfile(userId: string) {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserFullProfile | null>(null);
  const [loading, setLoading] = useState(!!userId);

  const isOwnProfile = !!user && user.uid === userId;

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    setLoading(true);
    setProfile(null);
    getUserProfile(userId)
      .then((p) => { if (!cancelled) setProfile(p); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    return subscribeToProfileCounts(userId, ({ followersCount, followingCount }) =>
      setProfile((p) => p ? { ...p, followersCount, followingCount } : p)
    );
  }, [userId]);

  return { profile, loading, isOwnProfile };
}
```

- **`ProfilePage` después:**

```tsx
const { profile, loading, isOwnProfile } = useProfile(resolvedUserId);
const { shelf, loading: shelfLoading } = useProfileShelf(resolvedUserId, isOwnProfile);
const { activity } = useProfileActivity(resolvedUserId);
const follow = useFollowActions(resolvedUserId);
const block = useBlockActions(resolvedUserId);
```

- **Riesgo:** alto. Cambia la API de `useProfile`. Hacer en PR aislado con smoke test completo del flujo de perfil (propio, ajeno público, ajeno privado con/sin follow, bloqueado).

---

### S3.8 — Consolidar enriquecimiento de títulos en `enrichBookTitles`

- **Severidad:** IMPORTANT.
- **Archivos:**
  - **Nuevo:** `src/services/api/bookEnrichment.ts`
  - **Modificar:** `useExploreBooks.ts:39-72`, `useAuthorData.ts:11-41`, `useBookRecommendations.ts:112-125`, `ShelfContext.tsx:73-107`.
- **Fix:**

```ts
// src/services/api/bookEnrichment.ts
import type { Book } from "@/types/Book";
import { fetchWorkEditionByLang } from "@/services/api/openLibraryApi";
import { updateBookTitleToDB } from "@/services/firebase/firebaseBooks";

export async function enrichBookTitles(books: Book[], lang: string): Promise<Book[]> {
  const missing = books.filter(b => !b.titles?.[lang]);
  if (missing.length === 0) return books;

  const results = await Promise.all(
    missing.map(async (book) => {
      const edition = await fetchWorkEditionByLang(book.key, lang);
      if (edition) {
        updateBookTitleToDB(book.key, edition.title, lang, edition.isbn).catch(() => {});
      }
      return { key: book.key, edition };
    })
  );

  const completedMap = new Map(
    results.filter((r): r is { key: string; edition: NonNullable<typeof r.edition> } => r.edition !== null)
      .map(r => [r.key, r.edition])
  );

  if (completedMap.size === 0) return books;

  return books.map(book => {
    const e = completedMap.get(book.key);
    if (!e) return book;
    return {
      ...book,
      title: e.title,
      titles: { ...(book.titles ?? {}), [lang]: e.title },
      ...(e.isbn ? { isbn: e.isbn, isbns: { ...(book.isbns ?? {}), [lang]: e.isbn } } : {}),
    };
  });
}
```

- **Migración:** los 4 sitios pasan a `const enriched = await enrichBookTitles(books, lang);`.

---

### S3.9 — Consolidar `entriesToShelf` / `shelfByStatus` / localización de libros

- **Severidad:** IMPORTANT.
- **Archivos:**
  - **Nuevo:** `src/utils/shelf.ts`
  - **Modificar:** `useProfile.ts:30-48`, `ShelfContext.tsx:178-189, 255-268`.
- **Fix:**

```ts
// src/utils/shelf.ts
import type { Book } from "@/types/Book";
import type { ShelfStatus } from "@/types/BookDetail";
import type { ShelfEntry } from "@/services/firebase/firebaseLibrary";

export function localizeBook(book: Book, lang: string): Book {
  return {
    ...book,
    title: book.titles?.[lang] ?? book.titles?.es ?? book.titles?.en ?? book.title ?? "",
    isbn: book.isbns?.[lang] ?? book.isbns?.es ?? book.isbns?.en ?? book.isbn,
  };
}

export function groupShelfByStatus(
  entries: Iterable<ShelfEntry>,
  lang: string,
): Record<ShelfStatus, Book[]> {
  const result: Record<ShelfStatus, Book[]> = {
    wantToRead: [], reading: [], finished: [], didNotFinish: [],
  };
  for (const { book, status } of entries) {
    result[status].push(localizeBook(book, lang));
  }
  return result;
}
```

- **Migración:** ambos sitios pasan a usar `groupShelfByStatus(visibleEntries.values(), lang)`. `useProfile.entriesToShelf` desaparece.

---

### S3.10 — Mover `sortByCoverAndRating` / `dedupBestByTitle` a `bookDedup.ts`

- **Severidad:** IMPORTANT.
- **Archivos:**
  - **Nuevo:** `src/utils/bookDedup.ts`
  - **Modificar:** `useBookRecommendations.ts:99-110`, `useExploreBooks.ts:135-143`, `useBookSearch.ts:19-33`.
- **Fix:**

```ts
// src/utils/bookDedup.ts
import type { Book } from "@/types/Book";

export function sortByCoverAndRating(books: Book[]): Book[] {
  return [...books].sort((a, b) => {
    if (a.cover_id && !b.cover_id) return -1;
    if (!a.cover_id && b.cover_id) return 1;
    return (b.ratingCount ?? 0) - (a.ratingCount ?? 0);
  });
}

export function dedupByNormalizedTitle(books: Book[]): Book[] {
  const seen = new Map<string, Book>();
  for (const book of books) {
    const key = book.title.toLowerCase().trim();
    if (!seen.has(key)) seen.set(key, book);
  }
  return [...seen.values()];
}

export function dedupBestByTitle(books: Book[]): Book[] {
  const isBetter = (a: Book, b: Book) =>
    (!!a.cover_id && !b.cover_id) ||
    (!!a.cover_id === !!b.cover_id && (a.ratingCount ?? 0) > (b.ratingCount ?? 0));
  const bestByTitle = new Map<string, Book>();
  for (const book of books) {
    const key = book.title.toLowerCase().trim();
    const existing = bestByTitle.get(key);
    if (!existing || isBetter(book, existing)) bestByTitle.set(key, book);
  }
  return [...bestByTitle.values()];
}
```

---

### S3.11 — `FollowersModal`: eliminar `prevDeps` pattern

- **Severidad:** IMPORTANT.
- **Archivo:** `src/components/profile/modals/FollowersModal.tsx:41-46`.
- **Fix:** ver §1.1 del informe original. Sustituir el bloque por `setLoading(true); setUsers([]);` al principio del `useEffect`.

---

### S3.12 — `FeaturedBookCard`: mover fetch de sinopsis fuera del card

- **Severidad:** IMPORTANT (cada render dispara N peticiones HTTP).
- **Archivo:** `src/components/book/cards/FeaturedBookCard.tsx:52-67`.
- **Fix:** dos opciones:

**Opción A:** la página/sección que monta los cards pre-hidrata las sinopsis y las pasa por props. `FeaturedBookCardProps` añade `book.synopsis` requerido.

**Opción B:** mover el fetch a un hook `useBookSynopsis(book)` con cache compartida (vía `useExploreCache`), de forma que abrir varios cards del mismo libro no duplique fetches.

- **Decisión:** A si la página tiene control del scope (Explore sections), B si los cards aparecen en sitios no controlados.

---

### S3.13 — `ShelfContext`: extraer "lang enrichment" a hook interno

- **Severidad:** MINOR.
- **Archivo:** `src/context/ShelfContext.tsx:61-110`.
- **Fix:**

```ts
// Dentro de ShelfProvider, antes del return:
useShelfLangEnrichment({ uid, ready, entries, lang, setEntries });
```

Y definir `useShelfLangEnrichment` como hook local en otro archivo (`src/context/useShelfLangEnrichment.ts`). Mantiene la lógica testeable separadamente.

---

### S3.14 — Sprint 3 checklist

- [ ] S3.1 — `ShelfDropdownButton` extraído y aplicado en 3 cards
- [ ] S3.2 — `BookSearchPicker` extraído y aplicado en 2 modales
- [ ] S3.3 — `SocialSignInButton` unificado
- [ ] S3.4 — `UpdateProgressModal` dividido
- [ ] S3.5 — `EditProfilePage` dividido
- [ ] S3.6 — `ExplorePage` dividido
- [ ] S3.7 — `useProfile` dividido en 5 hooks
- [ ] S3.8 — `enrichBookTitles` consolidado
- [ ] S3.9 — `groupShelfByStatus` / `localizeBook` en `utils/shelf.ts`
- [ ] S3.10 — `bookDedup.ts`
- [ ] S3.11 — `FollowersModal` sin `prevDeps`
- [ ] S3.12 — `FeaturedBookCard` sinopsis fuera
- [ ] S3.13 — `ShelfContext` enrichment a hook

---

## 6. Sprint 4 — Calidad opcional (sin urgencia)

**Objetivo:** estandarizar estilo y resolver inconsistencias menores. No bloquea producto.
**Riesgo:** muy bajo. Pero alto volumen → revisar por bloques.

### S4.1 — Estandarizar `type` vs `interface` para props

- **Severidad:** MINOR.
- **Acción:** todos los `interface XxxProps` → `type XxxProps`.
- **Archivos a localizar:** `Grep "interface.*Props" --type=tsx`.

### S4.2 — Estandarizar `export default function`

- **Severidad:** MINOR.
- **Acción:** unificar a `export default function Component()` (no `function Component(); export default Component;`).
- **Archivos:** `ExplorePage.tsx`, `LandingPage.tsx`, `CurrentReadingCard.tsx`, otros detectados con `Grep "^function ".*" --type=tsx`.

### S4.3 — Memoización condicional de handlers en `ProfilePage`

- **Severidad:** MINOR (only-if-needed).
- **Acción:** si `ProfileHeader` necesita memo, envolver handlers en `useCallback`. Si no, dejar.
- **Decisión:** medir con React DevTools Profiler. Optimizar solo con datos.

### S4.4 — Props drilling de `onClose` 6 niveles

- **Severidad:** MINOR.
- **Acción:** considerar `ModalContext` con `useModal()`. Solo si los modales crecen en complejidad.

### S4.5 — `Map` vs `Record` en ShelfContext (escalabilidad)

- **Severidad:** MINOR.
- **Acción:** si shelves crecen a >500 libros, mantener `shelfByStatus` en estado además del `Map` y sincronizar por mutación. Por debajo de 200 libros, ignorar.

### S4.6 — Verificar `titleSearch.ts` helpers usados

- **Severidad:** MINOR.
- **Acción:** `Grep "buildTitleNormMap|isTitleNormUpToDate|buildAuthorTokens" src --type=ts`. Si solo aparece en tests, marcar como muerto.

### S4.7 — Verificar `toWorkKey` adopción

- **Severidad:** MINOR.
- **Acción:** `Grep "decodeURIComponent" src --type=tsx`. Sitios que decoden IDs de URL manualmente deberían usar `toWorkKey`.

### S4.8 — `useExploreFeed`: pasar `params` explícitos a `fetch`

- **Severidad:** MINOR (limpieza estructural).
- **Acción:** si en S2.8 se optó por opción B (ref + disable), revisar después de un mes si conviene migrar a opción A.

### S4.9 — `key={i}` en `SynopsisModal` / `BookInfoCard`

- **Severidad:** MINOR (correctness).
- **Acción:** decisión de equipo. Si el texto es estático tras montaje, `key={i}` es válido y documentar con comentario. Si puede cambiar (re-fetch sinopsis), usar key derivada del contenido.

### S4.10 — Sprint 4 checklist

- [ ] S4.1 — interface → type
- [ ] S4.2 — `export default function` estándar
- [ ] S4.3 — Memo handlers (si profiler lo justifica)
- [ ] S4.4 — ModalContext (opcional)
- [ ] S4.5 — Map vs Record (medir antes)
- [ ] S4.6 — Verificar titleSearch helpers
- [ ] S4.7 — Adopción de toWorkKey
- [ ] S4.8 — useExploreFeed deps cleanup
- [ ] S4.9 — `key={i}` decision

---

## 7. Verificación global y rollback

### Antes de empezar cualquier sprint

```bash
git checkout -b refactor/tech-debt-cleanup
npm install
npm run build       # baseline: debe pasar
npm test            # baseline: debe pasar
npm run lint        # baseline: anotar warnings actuales
```

### Después de cada issue

1. `npm run lint && npm run build && npm test`.
2. Smoke test manual descrito en el issue.
3. Commit con prefijo `[S<n>.<id>] <descripción corta>`.
4. Tachar la checkbox del checklist del sprint.

### Después de cada sprint

1. Crear PR a `main` (o a una branch larga `refactor/tech-debt`).
2. Smoke test completo del área afectada:
   - Sprint 1: navegar todo el proyecto, comprobar que nada se ha roto.
   - Sprint 2: probar todos los modales y dropdowns (escape, click outside, body scroll).
   - Sprint 3: flujos completos (perfil propio/ajeno, edit profile, explore con/sin cuenta, modal de progreso).
3. Code review obligatorio.

### Rollback

Si un sprint introduce regresiones difíciles de localizar:

```bash
git revert <merge-commit>     # si ya está en main
# o
git reset --hard origin/main  # en branch local, antes de mergear
```

Cada issue es un commit independiente, así que rollback granular es posible:

```bash
git revert <commit-S2.4>      # solo revierte useDebouncedBookSearch
```

---

## 8. Métricas de éxito

| Métrica | Antes | Objetivo tras Sprint 3 |
|---------|-------|----------------------|
| Líneas totales `src/**/*.{ts,tsx}` | 14247 | < 12500 |
| Archivos > 250 líneas | 9 | ≤ 3 (ShelfContext, ExplorePage, posible useExploreFeed) |
| Hooks compartidos en `src/hooks/` (helpers genéricos) | 0 (todo es feature-specific) | ≥ 5 (`useEscapeKey`, `useLockBodyScroll`, `useClickOutside`, `useDebouncedBookSearch`, `useObjectUrl`) |
| `eslint-disable react-hooks/exhaustive-deps` | 4 | ≤ 1 (con justificación) |
| Ocurrencias de `as Node` | 8 | 0 (vía `useClickOutside`) |
| Ocurrencias de `console.*` fuera de logger | 49 | 0 |
| Archivos huérfanos | 3 (`useFantasyBooks`, `UserProfile`, `bookDetailData`) | 0 |
| Líneas comentadas en hooks | ~300 | < 50 |

---

## 9. Issues que NO se abordan en este spec

- Migración a TanStack Query (documentada en otro spec: `docs/superpowers/specs/2026-05-23-tanstack-query-migration.md`). Sustituiría el patrón `cancelled` global.
- Internacionalización completa de errores de Firebase (algunos códigos no tienen mensaje aún).
- Optimización del bundle (code splitting por route).
- Migración de los specs antiguos comentados (`READING_LISTS` en ProfilePage) a fixtures de Storybook si se introduce Storybook.

---

**Fin del spec.**
