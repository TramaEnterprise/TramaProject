# Sistema de toasts (v1: eventos de estantería)

**Date:** 2026-05-23
**Branch:** Develop (rama de feature a crear)

---

## Overview

Sistema de notificaciones efímeras (toasts) que informan al usuario tras las mutaciones de su estantería. En v1 se cubren cinco eventos:

- **Añadir libro** — primera vez que el libro entra en la estantería.
- **Cambio de estado** — el libro ya estaba en la estantería y se mueve entre estados (`wantToRead` ↔ `reading` ↔ `finished` ↔ `didNotFinish`). Estados terminales (`finished`, `didNotFinish`) tienen copy propio.
- **Quitar libro** — el libro sale de la estantería por completo.
- **Actualizar progreso** — cambio de página sin transición de estado.
- **Terminar libro vía progreso** — la página actual alcanza el total; el estado pasa a `finished` automáticamente. Cuenta como cambio de estado, no como progreso.

Cada toast aparece en la esquina inferior derecha en desktop y centrado abajo en móvil (Capacitor), respetando `env(safe-area-inset-bottom)`. Los eventos que modifican el grafo de estantería (`add`, `remove`, status change) ofrecen un botón **Deshacer** que revierte la operación. El update de progreso no lleva undo (es un cambio menor y los datos previos son recuperables editando el progreso de nuevo).

La librería elegida es **Sonner** (Emil Kowalski), ~3 KB gzipped, peerDeps React 19, theming nativo vía CSS custom properties. Comparativa con Sileo y react-toastify documentada en la conversación de brainstorming previa a esta spec.

---

## Decisiones de diseño (justificación)

### Por qué infraestructura genérica y no encapsulada en `ShelfContext`

Aunque v1 cubre solo eventos de estantería, montar `<AppToaster />` una sola vez en `App.tsx` y exponer helpers en `utils/toast.ts` permite añadir más usos (errores de red, "Perfil guardado", "Sigues a @ana") sin tocar arquitectura. El coste extra (un wrapper + un módulo de utilidades) es marginal.

### Por qué pre-resolver el título al idioma del usuario antes de invocar al helper

El `Book` que viaja por el sistema lleva tanto `title` (original de OpenLibrary) como `titles: { [lang]: string }` (traducciones). La resolución `book.titles?.[lang] ?? book.title` ya existe en `ShelfContext.getEntry` y `shelfByStatus`. Hacer que el helper de toast aceptara `book` crudo y resolviera por dentro requeriría que el módulo de toast conociera `i18next` (cosa que ya hace porque traduce el copy del mensaje, así que podría unirse). Pero queremos que `BookForToast` sea un tipo mínimo de datos planos (`{ key, title, cover_url }`) sin acoplarlo al modelo `Book`. Solución: el `ShelfContext` resuelve el título antes de llamar al helper, mismo patrón que ya aplica en `getEntry`.

### Por qué el toast se dispara dentro del `try` y no después

Las tres mutaciones (`addBook`, `removeBook`, `updateProgress`) hoy hacen optimistic update y rollback silencioso si Firestore falla. Si el toast se dispara fuera del `try/catch`, se ejecuta también en el path de error — el usuario ve "Has añadido X" mientras por detrás la app revierte. La notificación miente. Disparándolo después del `await` exitoso dentro del `try`, solo se confirma una acción que sí ha persistido.

### Por qué `silent` flag y no helper alternativo "sin toast"

El undo de un toast invoca de vuelta a `addBook`/`removeBook`/`updateProgress`. Esas funciones, por defecto, disparan su propio toast. Sin un mecanismo de silencio se produce una cadena recursiva: "Has añadido X. [Deshacer]" → click Deshacer → "Has quitado X. [Deshacer]" → click Deshacer → "Has añadido X. [Deshacer]" → … Pasar un flag `{ silent: true }` desde la closure de undo corta la cadena en el primer eslabón. Alternativa descartada: crear helpers `addBookSilent`/`removeBookSilent` duplica API y obliga a llamadas externas a saber elegir entre dos variantes.

### Por qué `updateProgress` necesita un parámetro `status` opcional

El undo de "Has terminado X" debe revertir **dos** cosas: la página actual y el estado (`finished` → estado previo). Hoy `updateProgress` deriva el `newStatus` de `currentPage === totalPages`. Si el undo llama a `updateProgress(bookKey, prevPage)` sin más, `newStatus` se calcula como `existing.status` — pero `existing.status` ya es `finished` por el optimistic update anterior. El libro nunca vuelve a `reading`. Solución: aceptar `status?: ShelfStatus` opcional; si se pasa, se usa explícitamente; si no, se mantiene la lógica derivada actual.

### Por qué `closeButton: false` y `richColors: false`

- `closeButton: false`: el toast se cierra solo a los 5 s, al hacer click en el botón de acción (undo), o al hacer hover y mover el ratón fuera (Sonner). No hace falta una "X" — añadiría ruido visual en un toast ya denso (miniatura + texto + acción).
- `richColors: false`: desactiva los colores semánticos por defecto de Sonner (verde éxito, rojo error). Nuestros toasts custom (`<ShelfToast />`) usan tokens del proyecto y no encajarían con esa paleta. Los helpers genéricos (`toast.success`, `toast.error`) podrán activar colores en su llamada concreta si los usamos en el futuro.

### Por qué posición distinta en móvil

`bottom-right` en móvil queda contra el borde, estrecho y choca con la home indicator de iOS. `bottom-center` con `offset: calc(env(safe-area-inset-bottom, 0) + 16px)` y ancho casi completo (`calc(100vw - var(--space-4) * 2)`) ocupa el espacio disponible sin chocar con gestos nativos.

---

## Arquitectura

```
src/
├── components/
│   └── common/
│       └── Toaster/
│           ├── AppToaster.tsx          ← <Toaster /> de Sonner con config global
│           ├── AppToaster.scss         ← override de los CSS vars internos de Sonner
│           ├── ShelfToast.tsx          ← JSX custom para toasts de libro
│           └── ShelfToast.scss
├── utils/
│   └── toast.ts                        ← API pública: notifyShelf*, helpers genéricos
├── context/
│   └── ShelfContext.tsx                ← invoca los helpers tras los optimistic updates
├── plugins/
│   └── i18n/
│       └── locales/
│           ├── es/toasts.json
│           └── en/toasts.json
└── App.tsx                              ← monta <AppToaster />
```

### Flujo de un evento (ejemplo: añadir libro)

```
UI ──addBook(book, "wantToRead")──▶ ShelfContext.addBook
                                        │
                                        ├─ optimistic setEntries(...)
                                        ├─ await addToShelf(uid, ...)         // Firestore
                                        │
                                        ├─ resolve title to current lang
                                        │
                                        └─ notifyShelfAdded(localizedBook, "wantToRead", undo)
                                                 │
                                                 └─▶ utils/toast.ts
                                                         │
                                                         └─▶ sonnerToast.custom((id) =>
                                                                <ShelfToast toastId={id} ... />)
```

El `undo` es una closure que captura el estado previo. Al ejecutarse llama de vuelta a `addBook` / `removeBook` / `updateProgress` con `{ silent: true }` para evitar cadena recursiva de toasts.

---

## API pública

### `<AppToaster />`

`src/components/common/Toaster/AppToaster.tsx`. Wrapper sobre `<Toaster />` de Sonner. Se monta una sola vez en `App.tsx`, dentro de los providers y antes del router.

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

`useTheme` ya existe en `src/hooks/useTheme.ts` y devuelve `{ theme: "light" | "dark"; toggleTheme }`. `useMediaQuery` no existe todavía; crearlo en `src/hooks/useMediaQuery.ts` como hook ligero sobre `window.matchMedia` con listener.

`<AppToaster />` se monta dentro del `ThemeProvider` (para que `useTheme` funcione) y fuera del `<Outlet />` del router (para que sobreviva a navegaciones). Punto exacto sugerido: dentro de `AppShell`, como hermano de `<main>`.

### `utils/toast.ts`

```ts
import { toast as sonnerToast } from "sonner";
import type { Book } from "@/types/Book";
import type { ShelfStatus } from "@/types/BookDetail";
import i18n from "@/plugins/i18n/i18n";
import ShelfToast from "@/components/common/Toaster/ShelfToast";

type BookForToast = Pick<Book, "key" | "title" | "cover_url">;
type UndoFn = () => void | Promise<void>;

export function notifyShelfAdded(
  book: BookForToast,
  status: ShelfStatus,
  undo: UndoFn,
): void;

export function notifyShelfStatusChanged(
  book: BookForToast,
  fromStatus: ShelfStatus,
  toStatus: ShelfStatus,
  undo: UndoFn,
): void;

export function notifyShelfRemoved(
  book: BookForToast,
  prevStatus: ShelfStatus,
  undo: UndoFn,
): void;

export function notifyProgressUpdated(
  book: BookForToast,
  currentPage: number,
  totalPages?: number,
): void;

export const toast = {
  success: sonnerToast.success,
  error: sonnerToast.error,
  info: sonnerToast.info,
  dismiss: sonnerToast.dismiss,
};
```

**Contrato:**

- `book.title` debe llegar **ya resuelto al idioma actual**. El `ShelfContext` aplica `book.titles?.[lang] ?? book.title` antes de llamar.
- `book.cover_url` puede ser `null` o `undefined`. El `<ShelfToast />` renderiza un placeholder si falta.
- `undo` es una closure síncrona o async. Sonner ejecuta el `onClick` del botón; este helper se encarga de envolver la llamada para descartar el toast tras la acción.
- Las firmas no retornan ID. Si más adelante se necesita `dismiss` programático, se añadirá vía return.

**Mapeo helper → clave i18n:**

| Helper | Trigger | Clave |
|---|---|---|
| `notifyShelfAdded` | primer add | `toasts.shelf.added` |
| `notifyShelfStatusChanged` (a `finished`) | terminar | `toasts.shelf.finished` |
| `notifyShelfStatusChanged` (a `didNotFinish`) | abandonar | `toasts.shelf.didNotFinish` |
| `notifyShelfStatusChanged` (resto) | estado intermedio | `toasts.shelf.statusChanged` |
| `notifyShelfRemoved` | quitar | `toasts.shelf.removed` |
| `notifyProgressUpdated` | progreso sin cambio de estado | `toasts.shelf.progressUpdated` |

El nombre traducido de la estantería para `{{shelf}}` se reutiliza de las claves `myLibrary.shelf.*` ya existentes (`wantToRead`, `reading`, `finished`, `didNotFinish`).

### `<ShelfToast />`

`src/components/common/Toaster/ShelfToast.tsx`. Custom JSX renderizado vía `sonnerToast.custom()` desde `utils/toast.ts`. Props mínimas y desacopladas del modelo `Book`:

```ts
type ShelfToastProps = {
  cover: string | null;
  title: string;       // ya resuelto al idioma actual
  message: string;     // ya traducido
  actionLabel?: string;
  onAction?: () => void;
  toastId: string | number;
};
```

Render: layout horizontal con miniatura `40×60` (aspect-ratio 2/3) + bloque de texto + botón de acción. BEM `.shelf-toast`. El click en la acción ejecuta `onAction` y luego `sonnerToast.dismiss(toastId)`.

---

## Estilos

### `ShelfToast.scss`

Tokens del proyecto, mobile-first, BEM. Mixin `@include text-truncate` para el título.

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

  &__cover { width: 100%; height: 100%; object-fit: cover; display: block; }
  &__cover-placeholder { width: 100%; height: 100%; background: var(--color-bg-muted); }

  &__body { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }

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

### `AppToaster.scss`

Override de los CSS vars internos de Sonner para que el contenedor sea transparente (nuestro `<ShelfToast />` ya trae card propia):

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

---

## Cambios en `ShelfContext`

Los tres mutators (`addBook`, `removeBook`, `updateProgress`) ganan firma extendida y disparan toasts dentro del `try` exitoso.

### Nuevas firmas

```ts
addBook(book: Book, status: ShelfStatus, opts?: { silent?: boolean }): Promise<void>;
removeBook(bookKey: string, opts?: { silent?: boolean }): Promise<void>;
updateProgress(
  bookKey: string,
  currentPage: number,
  opts?: {
    note?: string;
    rating?: number;
    review?: string;
    status?: ShelfStatus;   // si se pasa, sobrescribe la lógica derivada
    silent?: boolean;
  },
): Promise<void>;
```

### Lógica de notificación (pseudocódigo dentro de `addBook`)

```ts
const prevStatus = entries.get(encodeKey(book.key))?.status ?? null;
// ... rollback, optimistic update, await addToShelf(...) dentro de try ...

if (!opts?.silent) {
  const localizedBook = { ...book, title: book.titles?.[lang] ?? book.title };
  if (prevStatus === null) {
    notifyShelfAdded(localizedBook, status,
      () => removeBook(book.key, { silent: true })
    );
  } else if (prevStatus !== status) {
    notifyShelfStatusChanged(localizedBook, prevStatus, status,
      () => addBook(book, prevStatus, { silent: true })
    );
  }
  // prevStatus === status: no-op (no toast)
}
```

El helper `notifyShelfStatusChanged` resuelve internamente qué clave i18n usar según `toStatus` (`finished`, `didNotFinish` o `statusChanged`). El call-site solo le pasa los datos.

Mismo patrón en `removeBook` (captura `prev` **antes** del optimistic update) y en `updateProgress` (decide entre `notifyProgressUpdated` y `notifyShelfStatusChanged` según si cambia el estado).

### Notas

- El `prev` de `removeBook` se mueve al inicio de la función, antes del rollback/optimistic. La versión actual lo lee desde un closure-snapshot funcional pero confuso.
- El undo de `notifyShelfStatusChanged` disparado por `updateProgress` (al alcanzar `totalPages`) pasa `status: prevStatus` explícitamente para forzar la reversión del estado:
  ```ts
  notifyShelfStatusChanged(localizedBook, existing.status, "finished",
    () => updateProgress(bookKey, existing.currentPage ?? 0, {
      status: existing.status,
      silent: true,
    })
  );
  ```

---

## i18n

### `src/plugins/i18n/locales/es/toasts.json`

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

### `src/plugins/i18n/locales/en/toasts.json`

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

Registrar ambos JSON en `src/plugins/i18n/i18n.ts` siguiendo el patrón del resto de namespaces: añadir imports `esToasts` y `enToasts`, y spread dentro de `resources.es.translation` y `resources.en.translation`.

---

## Casos edge cubiertos

| Caso | Comportamiento |
|---|---|
| Click en mismo estado en dropdown de `BookInfoCard` | `BookInfoCard.handleShelfSelect` hoy llama a `removeBook` (no `addBook`). Se dispara `notifyShelfRemoved`. ✓ |
| Click en undo durante write pendiente a Firestore | El undo dispara una segunda escritura. Improbable (5 s de toast vs RTT típico < 1 s). Aceptado sin mitigación; comentado para futura iteración. |
| Sin sesión (`uid == null`) | Las tres mutaciones de `ShelfContext` ya hacen early-return. Ningún toast se dispara. ✓ |
| Sin sinopsis / sin portada | `<ShelfToast />` renderiza placeholder gris. ✓ |
| Cambio de idioma mientras un toast está visible | El toast caduca en 5 s. Texto no reactivo. Aceptado. |
| Modo oscuro activado a media sesión | `theme` del `<Toaster />` se actualiza al re-renderizar. La detección lee `data-theme` cada render. ✓ |

---

## Dependencias nuevas

- `sonner` (^2.0.7) → `dependencies` en `package.json`.

Ninguna otra. No se añaden devDeps ni se modifican configs de Vite/TS/ESLint.

## Nuevos hooks utilitarios

- `src/hooks/useMediaQuery.ts` — hook ligero sobre `window.matchMedia` con suscripción a cambios. No existe en el proyecto y lo necesita `<AppToaster />` para decidir posición. Firma propuesta:
  ```ts
  export function useMediaQuery(query: string): boolean;
  ```

---

## Fuera de scope (v1)

- Toasts de errores de red / Firestore (rollback silencioso se mantiene).
- Toasts en eventos de follow, perfil, lecturas sociales, etc. La infraestructura los soporta vía `toast.success` / `toast.error`, pero el copy i18n y los call-sites quedan para una iteración posterior.
- Persistencia de toasts entre navegaciones (Sonner ya lo maneja al ser un componente persistente fuera del router).
- Acción "Volver a leer" o reintento sobre el toast de error.
- Sonidos / vibración Capacitor al disparar un toast.
