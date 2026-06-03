# Cache de sesión para Explorar

**Date:** 2026-05-23
**Branch:** Develop (rama de feature a crear)

---

## Overview

Hoy, cada vez que el usuario entra a `/explore` o `/explore/section/:type`, todas las secciones que usan `useSectionBooks` (TrendingSection, ExploreSection, ExploreSectionPage) hacen su fetch a Firestore aunque la respuesta ya se haya pedido cinco segundos antes en esa misma sesión. Esto degrada el UX percibido en navegaciones del tipo `Explore → detalle de libro → atrás`.

Esta feature introduce un **cache en memoria con alcance de sesión** que evita las refetches innecesarias y se invalida automáticamente cuando el usuario muta su estantería (porque eso puede cambiar el contenido de las secciones de recomendación).

Reglas:

- Cache vive solo en memoria (no localStorage, no Firestore). Refrescar la página la vacía. Esto es deseado.
- Mientras el usuario navega entre `/explore`, sub-páginas y otras zonas de la app, las entradas cacheadas se reutilizan. Sin loading flicker.
- Cuando el usuario muta su estantería (`addBook`, `removeBook`, `updateProgress`), el cache se marca como "sucio" pero **no se vacía inmediatamente**. La invalidación ocurre cuando el usuario vuelve a entrar a Explorar (o a una sub-página de Explorar). Esto evita que el contenido cambie debajo del cursor mientras el usuario está mirándolo.

**Fuera de scope:** otros hooks de fetching (`useBookDetail`, `useAuthorData`, `useProfile`, `useBookRecommendations`, etc.), persistencia entre refreshes, sincronización entre pestañas, integración con Firestore realtime.

---

## Decisiones de diseño (justificación)

### Por qué un context dedicado y no extender `ShelfContext`

Mezclar cache de Explorar dentro de `ShelfContext` acopla dos responsabilidades distintas (estado del shelf vs. cache de una zona concreta de la UI). Un context propio mantiene cada provider con una responsabilidad clara, simplifica los tests y deja la puerta abierta a que en el futuro otras zonas puedan tener su propio cache sin reabrir ShelfContext.

### Por qué `useRef` en lugar de `useState` para almacenar el `Map`

El cache es **almacenamiento mutable**, no estado reactivo. Si usáramos `useState`, cada `set()` dispararía un re-render del provider y todos sus consumers — incluso aquellos a los que la nueva entrada no les afecta. Con `useRef`, las escrituras son silenciosas. Los consumers son responsables de su propio re-render (vía sus `setState` locales cuando completan un fetch). Pattern estándar para caches en React.

### Por qué la invalidación es "lazy" (marca dirty, no vacía)

El usuario lo pidió explícitamente: "si el usuario añade un libro desde explorar, que el contenido no cambie". Vaciar el cache en el momento de la mutación causaría una re-fetch inmediata de las secciones visibles, con flash de loading y reordenamiento de tarjetas. Posponer la invalidación al próximo mount de Explorar produce una experiencia mucho más estable.

### Por qué `markDirty()` se ejecuta también con `opts.silent = true`

`silent` es una flag de UI ("no muestres toast al usuario") añadida por el sistema de toasts. La invalidación del cache es decisión de **datos**: la estantería cambió, el cache puede estar obsoleto. Las dos preocupaciones son ortogonales.

Caso concreto que falla si gateamos por silent:

1. Usuario añade libro X desde Profile → `markDirty()` → dirty=true.
2. Usuario va a Explorar → `clearIfDirty()` → cache se vacía y se refetchea. dirty=false. El cache refleja "X está en mi estantería".
3. Toast del paso 1 sigue visible (5s de duración). Usuario clica **Deshacer** → `removeBook(X, { silent: true })`.
4. Si gateamos: `markDirty()` no se llama → dirty=false.
5. Usuario sale de Explorar y vuelve → cache no se limpia → sirve datos donde X aparece excluido aunque ya no está en su estantería.

Para evitarlo, `markDirty()` se ejecuta siempre que la mutación persistió, sin importar el flag silent.

### Por qué `uid` está en la cache key

Si el usuario A hace logout y el usuario B login sin refrescar la página, sin uid en la key las entradas cacheadas con los `favoriteGenre`/`userAuthorKeys` de A podrían servirse a B si coinciden los parámetros. Incluir `uid` es una línea de código y aísla por completo. Coste: las entradas de A quedan en memoria muertas tras su logout. Cantidad despreciable.

### Por qué el cache key se construye con `useMemo` y no con `JSON.stringify` directo en el body del hook

`useMemo` con un array de deps de primitivos estables garantiza que la string del key es **la misma referencia** entre renders cuando los datos no han cambiado. Si lo calculáramos directo en el body, sería una string nueva (con contenido idéntico) en cada render. El `useEffect([cacheKey])` compara por `Object.is`, así que una string nueva pero igual se considera "cambiada" y el effect re-correría innecesariamente.

### Por qué el estado inicial se lee de la cache con `useState(() => ...)` lazy

Sin esto, el primer render tendría `books = []` y `loading = true` aunque el cache tenga una entrada válida. El `useEffect` corregiría en el segundo render, pero el usuario vería un flash de skeleton.

Con el lazy initializer, el primer render ya lee el cache de forma síncrona y arranca con los datos correctos. Sin flash. El effect sigue ahí para los casos donde el `cacheKey` cambia después del mount (cambio de idioma, género, etc.).

### Por qué `retry()` bypassa el cache

`retry()` lo invoca el usuario cuando ha visto un estado de error. Lo que quiere es: "vuelve a intentar". Servir el resultado cacheado (que probablemente no existe porque no se cachean errores) o quedarse esperando un nuevo intento sin fetch sería confuso. `retry` siempre lanza un fetch fresco y reescribe el cache con el resultado.

### Por qué `ExplorePage` Y `ExploreSectionPage` llaman a `clearIfDirty()`

`ExploreSectionPage` es la vista "ver todos" de una sección concreta. Un usuario puede llegar allí:

- Desde `/explore` (caso típico): clearIfDirty ya corrió en ExplorePage. La sub-página no tendrá nada que limpiar (dirty=false). Llamarlo de nuevo es un no-op.
- Desde una URL directa o bookmark, tras haber mutado en otra parte de la app: ExplorePage no se ha montado en esta navegación, así que sin un check en la sub-página servimos datos obsoletos. Aquí sí hay trabajo.

Coste de añadirlo a la sub-página: una línea. Beneficio: cubre el caso de entrada directa sin requerir un layout component que envuelva todas las rutas `/explore*`.

### Por qué la cache key NO incluye `userShelfKeys` ni `wantToReadBooks`

Esto es deliberado: replica el comportamiento del `useCallback` actual del hook ([useSectionBooks.ts:52-60](src/hooks/useSectionBooks.ts#L52-L60)), que tampoco los incluye en sus deps.

Consecuencia: mientras el usuario está mirando Explorar, los filtros aplicados (`!userShelfKeys?.has(b.key)`) reflejan la estantería al momento del fetch, no la actual. Si el usuario muta sin salir, el filtrado cacheado puede divergir del estado real de la estantería.

Esto **no es un bug** — es la mecánica acordada para evitar que el contenido cambie bajo los ojos del usuario. Cuando el usuario sale y vuelve, `clearIfDirty()` garantiza que la próxima visita refleja la estantería actual.

---

## Arquitectura

```
src/
├── context/
│   ├── explore_cache_init.ts                 ← createContext + tipos
│   └── ExploreCacheContext.tsx               ← Provider (Map + dirty flag en useRef)
├── hooks/
│   ├── useExploreCache.ts                    ← consumer hook con check de null
│   └── useSectionBooks.ts                    ← MODIFICADO: cache antes de fetch
├── context/
│   └── ShelfContext.tsx                      ← MODIFICADO: markDirty() en mutators
├── pages/
│   └── explore/
│       ├── ExplorePage.tsx                   ← MODIFICADO: clearIfDirty() en mount
│       └── section/
│           └── ExploreSectionPage.tsx        ← MODIFICADO: clearIfDirty() en mount
└── App.tsx                                    ← MODIFICADO: <ExploreCacheProvider>
```

### Posición del provider en el árbol de App

```tsx
<ErrorBoundary>
  <ThemeProvider>
    <PreferencesProvider>
      <AuthProvider>
        <ExploreCacheProvider>          {/* ← nuevo */}
          <ShelfProvider>               {/* consume useExploreCache para markDirty */}
            <NotificationsProvider>
              <AppShell />
            </NotificationsProvider>
          </ShelfProvider>
        </ExploreCacheProvider>
      </AuthProvider>
    </PreferencesProvider>
  </ThemeProvider>
</ErrorBoundary>
```

Razones del posicionamiento:

- **Dentro de `AuthProvider`**: permite que el provider del cache pueda reaccionar a cambios de `uid` en el futuro si hiciera falta (por ejemplo, clear automático en logout). Hoy no es necesario porque `uid` está en la cache key, pero la ubicación lo permite sin tocar nada.
- **Por encima de `ShelfProvider`**: `ShelfContext` consume `useExploreCache()` para llamar `markDirty()`. El hijo debe estar dentro del provider que consume.
- **Por encima de `NotificationsProvider`**: indiferente; el provider de notificaciones no toca el cache. Por orden lógico, infraestructura primero.

### Flujo end-to-end (ejemplo)

```
Usuario entra a /explore (primera vez en la sesión)
  └─ ExplorePage mount → clearIfDirty()       // dirty=false, no-op
  └─ TrendingSection mount → useSectionBooks
       └─ cache.get(key) → undefined          // MISS
       └─ setLoading(true), fetch
       └─ fetchSection() → { books, isFallback }
       └─ cache.set(key, entry)
       └─ setBooks(books), setLoading(false)
  └─ ... (otras secciones idem)

Usuario va a /book/X
  └─ ExplorePage unmount
  └─ TrendingSection unmount
  // cache.current.size sigue siendo > 0 (refs no se reinician)

Usuario añade X a "Quiero leer"
  └─ ShelfContext.addBook
       └─ optimistic update + await addToShelf
       └─ await OK → exploreCache.markDirty()    // dirty=true
       └─ toast "Has añadido..."

Usuario vuelve a /explore
  └─ ExplorePage mount → clearIfDirty()
       └─ dirty=true → cache.clear() → dirty=false
  └─ TrendingSection mount → useSectionBooks
       └─ cache.get(key) → undefined            // MISS (recién limpiado)
       └─ fetch normal → ahora con userShelfKeys actualizado
```

---

## API del context

### `src/context/explore_cache_init.ts`

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

### `src/context/ExploreCacheContext.tsx`

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

### `src/hooks/useExploreCache.ts`

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

Patrón idéntico al de `useTheme`/`useShelf`: throw si no hay provider para fallar ruidoso en dev.

---

## Cambios en `useSectionBooks`

Reemplaza el cuerpo del hook (no la función auxiliar `fetchSection`, que sigue intacta).

```ts
import { useCallback, useEffect, useMemo, useState } from "react";
import type { Book } from "@/types/Book";
import type { ExploreSectionParams, ExploreSectionType, UseSectionResult } from "@/types/ExploreTypes";
import { /* ...mismos imports de @/services/firebase/firebaseBooks que el archivo actual... */ } from "@/services/firebase/firebaseBooks";
import { useExploreCache } from "@/hooks/useExploreCache";
import { useAuth } from "@/hooks/useAuth";

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
  // El effect depende de cacheKey (que ya engloba type/lang/count/params/uid)
  // y de disabled. Otras refs (cache, fetchSection) son estables.
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
  // Misma justificación de deps que en el effect.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cacheKey, disabled]);

  return { books, loading, error, retry, isFallback };
}

// fetchSection: idéntica a la versión actual.
async function fetchSection(/* ... */) { /* ... */ }
```

Hay que importar también el tipo `ExploreCacheEntry`:

```ts
import type { ExploreCacheEntry } from "@/context/explore_cache_init";
```

---

## Cambios en `ShelfContext`

### Imports

Añadir:

```ts
import { useExploreCache } from "@/hooks/useExploreCache";
```

### Consumir el cache en el provider

Justo después de los demás hooks del provider:

```ts
const exploreCache = useExploreCache();
```

### `markDirty()` tras los `await` exitosos

Una línea por mutator, dentro del `try`, después del `await` y antes (o después) del bloque de toast:

**En `addBook`:**

```ts
try {
  await addToShelf(uid, book, status, prevStatus);
  exploreCache.markDirty();           // ← nueva

  if (!opts?.silent) {
    // ...lógica de toast existente...
  }
} catch { ... }
```

**En `removeBook`:**

```ts
try {
  await removeFromShelf(uid, bookKey);
  exploreCache.markDirty();           // ← nueva

  if (!opts?.silent) {
    // ...lógica de toast existente...
  }
} catch { ... }
```

**En `updateProgress`:**

```ts
try {
  await updateReadingProgress(uid, existing, currentPage, opts?.note, opts?.rating, opts?.review);
  exploreCache.markDirty();           // ← nueva

  if (!opts?.silent) {
    // ...lógica de toast existente...
  }
} catch { ... }
```

Importante: `markDirty()` se llama **siempre** tras el await exitoso, sin gate por `opts.silent`. Razón ya explicada en "Decisiones de diseño".

---

## Cambios en `ExplorePage` y `ExploreSectionPage`

Las dos páginas tienen el mismo cambio: un `useEffect` de mount que llama a `clearIfDirty()`.

### `ExplorePage.tsx`

Añadir import:

```ts
import { useExploreCache } from "@/hooks/useExploreCache";
```

Y dentro del cuerpo del componente, junto a los otros hooks:

```tsx
const { clearIfDirty } = useExploreCache();

useEffect(() => {
  clearIfDirty();
}, [clearIfDirty]);
```

`clearIfDirty` viene de un `useCallback([])` en el provider — su referencia es estable. El effect solo corre en mount.

### `ExploreSectionPage.tsx`

Idéntico: import + hook + effect. Cubre el caso de entrada directa por URL a una sub-página tras haber mutado en otra parte de la app sin pasar por `/explore`.

---

## Cambios en `App.tsx`

Añadir import:

```ts
import { ExploreCacheProvider } from "@/context/ExploreCacheContext";
```

Envolver `<ShelfProvider>` con `<ExploreCacheProvider>` dentro de `<AuthProvider>`:

```tsx
return (
  <ErrorBoundary>
    <ThemeProvider>
      <PreferencesProvider>
        <AuthProvider>
          <ExploreCacheProvider>          {/* ← nuevo */}
            <ShelfProvider>
              <NotificationsProvider>
                <AppShell />
              </NotificationsProvider>
            </ShelfProvider>
          </ExploreCacheProvider>
        </AuthProvider>
      </PreferencesProvider>
    </ThemeProvider>
  </ErrorBoundary>
);
```

---

## Casos edge cubiertos

| Caso | Comportamiento |
|---|---|
| Refresh de página | Cache vive en `useRef` en memoria → se pierde con el reload. Identico al comportamiento actual sin cache. |
| Cambio de idioma | `lang` está en la cache key → cambia → entradas separadas por idioma. Cambio de `es` a `en` produce cache miss → refetch. |
| Logout y login con otro usuario sin refrescar | `uid` está en la cache key → entradas de A no se sirven a B. Las de A quedan muertas en memoria; cantidad despreciable. |
| Fetch falla (Firestore caído, red) | El `catch` establece `error="error"`. **No se llama a `cache.set()`** → no se cachea el fallo. Próximo intento (retry o re-mount) reintenta limpio. |
| `disabled` cambia de `true` a `false` | El effect re-corre con disabled=false → mira cache → hit o miss según corresponda. |
| `disabled` cambia mid-fetch | El cleanup del effect anterior marca `cancelled=true`; el fetch en vuelo se descarta. |
| Mutación de estantería desde Explorar | `markDirty()` → dirty=true. Cache sigue sirviendo datos previos (intencional). Al salir y volver, `clearIfDirty()` vacía y refetch. |
| Mutación de estantería desde otra ruta (Profile, BookDetail) | `markDirty()` → dirty=true. Próxima entrada a `/explore` o `/explore/section/:type` → `clearIfDirty()` vacía y refetch. |
| Usuario va de `/explore` a `/explore/section/:type` | ExploreSectionPage mount → `clearIfDirty()`. Si user no mutó en el ínterin, dirty=false → no-op. Cache se reutiliza. |
| Usuario llega a `/explore/section/:type` por URL directa tras mutar | ExploreSectionPage mount → `clearIfDirty()` → dirty=true → cache se vacía → refetch limpio. |

---

## Limitaciones conocidas (no resueltas en v1)

### Cross-tab y cross-device desync

Si el usuario tiene la app abierta en dos pestañas del mismo navegador, mutar en la pestaña A no invalida el cache de la pestaña B. Cada pestaña tiene su propio React tree y su propio provider, así que las refs son independientes. La pestaña B servirá datos potencialmente obsoletos hasta que B refresque manualmente, mute algo localmente, o cierre y reabra.

Lo mismo aplica a usar la app desde otro dispositivo simultáneamente.

**Por qué no se resuelve aquí:** opciones disponibles (BroadcastChannel API, Firestore realtime listeners) tienen un coste de complejidad o cuota desproporcionado para un caso de uso minoritario. La app está principalmente diseñada para uso móvil (Capacitor), donde el escenario de "dos pestañas" no aplica.

Mitigación futura si se vuelve un problema: añadir un botón "Actualizar" en Explorar que llame a un `forceClear()` adicional del cache. O implementar `BroadcastChannel` en el provider (~20 líneas).

---

## Dependencias nuevas

Ninguna. Toda la implementación usa hooks nativos de React. No se añade ninguna librería.

---

## Fuera de scope

- Caché para `useBookRecommendations`, `useBookDetail`, `useAuthorData`, `useProfile`, `useBookSearch`. Cada uno tendrá su propia decisión (o se resolverá vía el spec de TanStack Query si se implementa).
- Persistencia del cache entre reloads (localStorage / IndexedDB).
- Sincronización entre pestañas o entre dispositivos.
- Refetch automático tras N segundos (TTL del cache).
- Test unitarios del provider.
- Refactor del filtro `userShelfKeys.has(b.key)` para sacarlo del `queryFn`. Sigue dentro de `fetchSection`. Cualquier mejora de este filtrado vendrá en una fase posterior.
- Cache aware de cambios de tema u otros providers no relacionados con Shelf.
