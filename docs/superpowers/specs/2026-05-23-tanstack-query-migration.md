# Migración a TanStack Query (fase 1: `useSectionBooks` + `useBookRecommendations`)

**Date:** 2026-05-23
**Branch:** Develop (rama de feature a crear)

---

## Overview

Migrar los hooks de fetching `useSectionBooks` y `useBookRecommendations` a TanStack Query (v5) **sin romper la API pública de los hooks ni tocar los componentes consumidores**. Los callers (`TrendingSection`, `ExploreSection`, `ExploreSectionPage`, `BookDetailPage`) seguirán importando el mismo nombre con la misma firma y el mismo tipo de retorno.

El objetivo no es minimizar las líneas internas (aunque se reducen), sino:

1. Tener un **caché en memoria compartido** entre las secciones, las páginas y al navegar atrás/adelante. Hoy cada montaje vuelve a leer Firestore aunque la respuesta fuese la misma hace 10 segundos.
2. **Deduplicación**: si dos componentes piden la misma sección con los mismos parámetros, una sola consulta a Firestore.
3. **Cancelación automática** de queries obsoletas al cambiar parámetros (idioma, género, etc.) sin tener que mantener `useRef<AbortController>` a mano.
4. **DevTools** para inspeccionar todas las queries activas durante el desarrollo.

**Fuera de scope de esta fase**: `useBookDetail`, `useAuthorData`, `useProfile`, `useBookSearch`, mutators de `ShelfContext`, `useExploreFeed`. Esas migraciones llegarán en fases posteriores una vez validado el patrón aquí.

**No tocados explícitamente**: `useExploreBooks` y `useFantasyBook` son exports muertos (sin consumidores). Quedan como deuda técnica para una limpieza separada.

---

## Decisiones de diseño (justificación)

### Por qué TanStack Query v5 y no v4

v5 funciona con React 19 (peerDep `^18 || ^19 || ^19-rc`). v4 no garantiza React 19. Además, v5 trae mejoras de tipos y la sintaxis de objeto (`useQuery({ ... })`) ya estandarizada — la sintaxis de overloads de v4 está obsoleta. No tiene sentido instalar v4 hoy.

### Por qué mantener idéntica la API pública de los hooks

Los componentes consumidores (`TrendingSection`, `ExploreSection`, `ExploreSectionPage`, `BookDetailPage`) ya están en producción. Cambiar su contrato (forma del objeto retornado o parámetros) obliga a tocarlos también, multiplicando el riesgo y el alcance del PR. Manteniendo idéntica la API (`{ books, loading, error, retry, isFallback }` y `{ books, refresh }`), el cambio es **interno** al hook y los componentes no se enteran. Esto también facilita un rollback: si algo falla en producción, revertimos solo los archivos de los hooks.

### Por qué un `QueryClient` único en `App.tsx`

`QueryClientProvider` debe envolver a todos los consumidores de RQ. Montarlo en `App.tsx` (la raíz) es la convención y permite que cualquier hook futuro lo use sin cambios estructurales. Vivirá `dentro` de `ErrorBoundary` y `por fuera` del resto de providers (theme, auth, etc.) porque RQ no depende de ninguno y queremos que esté disponible cuanto antes en el árbol.

### Por qué `staleTime: 5 * 60 * 1000` (5 minutos) por defecto

Los datos de libros (trending, recomendaciones, secciones) no son críticos en tiempo real — son listas curadas que cambian a escala de horas, no segundos. 5 minutos significa que si un usuario navega entre la explore, abre una recomendación, vuelve, etc., en menos de 5 minutos no se re-pide nada. Para queries específicas que sí necesiten refresco más agresivo, se sobreescribe en la llamada concreta. Se evita explícitamente `staleTime: 0` (default de RQ) porque eso anula el beneficio principal del caché.

### Por qué dejar la lógica de selección aleatoria fuera de RQ en `useBookRecommendations`

`useBookRecommendations` tiene dos responsabilidades:
1. Fetchear un **pool** de libros recomendados por género (cacheable).
2. Devolver un subconjunto **aleatorio** del pool, con un `refresh()` que recoge otro subconjunto sin re-fetchear.

La (1) es estado de servidor → RQ. La (2) es estado local de UI → `useState` + `useRef` para el historial. La migración usa RQ para (1) y mantiene la lógica de `pickNext`/`shownKeys` intacta. Mezclarlo todo en una query rompería el contrato del hook (consumer espera `refresh()` instantáneo, no un re-fetch).

### Por qué `queryFn` recibe `{ signal }` y se pasa a las APIs

RQ v5 inyecta un `AbortSignal` automáticamente en cada `queryFn`. Las APIs del proyecto (`fetchBooksByGenre`, etc.) ya aceptan un signal. Usándolo eliminamos el `useRef<AbortController>` manual que tienen los hooks actuales, simplificando el código y delegando la cancelación a RQ. **Firestore** (`getRecommendationsFromDB` etc.) no soporta cancelación nativa, así que el signal no se aplica ahí — pero tampoco hace daño porque RQ ignora la query "cancelada" cuando llega tarde aunque la promesa siga vida.

### Por qué `placeholderData: keepPreviousData` para `useSectionBooks`

Cuando el usuario cambia el idioma (`lang`), el `queryKey` cambia → RQ pide la nueva sección. Sin `keepPreviousData`, los componentes verían un flash de `loading: true` con `books: []` antes de mostrar los nuevos. Con `keepPreviousData`, mantenemos los libros del idioma anterior visibles mientras el nuevo se carga — UX más fluido. El indicador de loading se puede inferir de `isPending`/`isFetching` por separado si hace falta.

Para `useBookRecommendations` lo mismo aplica al cambiar de género en `BookDetailPage`.

### Por qué `ReactQueryDevtools` en desarrollo

El plugin de devtools se monta como componente React con coste cero en producción (tree-shaking de Vite descarta el código del bundle final cuando `import.meta.env.DEV` es false). En desarrollo permite inspeccionar las queries activas, ver el caché, forzar refetches, etc. — esencial para depurar problemas de invalidación. No instalar las devtools sería un autoengaño: aprender RQ a ciegas multiplica el tiempo de aprendizaje.

### Por qué mantener `getRecommendationsFromDB` → API fallback dentro de un solo `queryFn`

`useBookRecommendations` hoy intenta primero Firestore (`getRecommendationsFromDB`); si devuelve null, llama a la API (`fetchBooksByGenre`) y persiste con `saveBooksToDB`. La forma idiomática en RQ sería tener dos queries y un `useEffect` que decida cuál usar — pero eso multiplica el caché y obliga a invalidaciones cruzadas. Mantenerlo todo en un único `queryFn` que internamente decide Firestore vs API es más simple, mantiene el caché de RQ alineado con "el resultado final" (sea de donde sea), y es trivial de leer. La fuente concreta (Firestore o API) es un detalle de implementación que el caché no necesita conocer.

### Por qué NO migramos `useExploreBooks` y `useFantasyBook`

Búsqueda exhaustiva confirma que ningún archivo del proyecto los importa. Son código muerto. Migrar dead code es trabajo sin valor que además mantiene viva la ilusión de que están en uso. Limpiarlos es una tarea separada y trivial; este spec no la incluye porque la pregunta de fondo (¿se siguen necesitando?) merece su propia conversación.

---

## Arquitectura

```
src/
├── App.tsx                                ← wrap en <QueryClientProvider>
├── lib/
│   └── queryClient.ts                     ← instancia única + defaults
├── hooks/
│   ├── useSectionBooks.ts                 ← migrado: API pública intacta
│   └── useBookRecommendations.ts          ← migrado: API pública intacta
```

### Capas

1. **`lib/queryClient.ts`** — exporta una instancia `QueryClient` con defaults (staleTime, gcTime, retry policy). Una sola fuente de verdad.

2. **`App.tsx`** — importa `QueryClient` y lo pasa al `QueryClientProvider`, posicionado **dentro** de `ErrorBoundary` y **por encima** del resto de providers (Theme, Auth, Shelf, etc.). También monta `ReactQueryDevtools` condicionalmente para desarrollo.

3. **Hooks migrados** — el `queryFn` encapsula la lógica de fetch (incluido el flujo Firestore → API fallback). El `queryKey` incluye **todos los parámetros que afectan al resultado** (lang, género, etc.). El hook devuelve exactamente la misma estructura que antes para no romper los consumidores.

### Flujo de una query (ej. `useSectionBooks("trending", params, "es", 6)`)

```
Component mount
  └─> useSectionBooks("trending", params, "es", 6)
        └─> useQuery({
              queryKey: ["section", "trending", "es", 6, normalizedParams],
              queryFn: ({ signal }) => fetchSection("trending", params, "es", 6, signal),
              staleTime: 5min,
              placeholderData: keepPreviousData,
              enabled: !disabled,
            })
              │
              ├─ Cache HIT (otra instancia ya lo pidió hace <5min): devuelve cacheado, NO refetch.
              ├─ Cache MISS: ejecuta queryFn → fetchSection → Firestore → devuelve { books, isFallback }
              │     └─ guarda en cache bajo el queryKey
              └─ Cache STALE (>5min): devuelve cacheado al instante + refetch en background.
```

---

## Cambios archivo por archivo

### `package.json`

```bash
npm install @tanstack/react-query @tanstack/react-query-devtools
```

Versión mínima: `^5.0.0` para ambas. Verificar que el peerDep `react` permite `^19`.

### `src/lib/queryClient.ts` (nuevo)

```ts
import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,        // 5 min
      gcTime: 10 * 60 * 1000,          // 10 min (antes "cacheTime")
      refetchOnWindowFocus: false,     // evitar refetch agresivo al volver a la pestaña
      retry: 1,                        // 1 reintento ante fallo (el default de 3 es excesivo aquí)
    },
  },
});
```

### `src/App.tsx`

Añadir imports:

```ts
import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { queryClient } from "@/lib/queryClient";
```

Envolver el árbol justo dentro de `ErrorBoundary` y por encima de `ThemeProvider`:

```tsx
return (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <PreferencesProvider>
          <AuthProvider>
            <ShelfProvider>
              <NotificationsProvider>
                <AppShell />
              </NotificationsProvider>
            </ShelfProvider>
          </AuthProvider>
        </PreferencesProvider>
      </ThemeProvider>
      {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  </ErrorBoundary>
);
```

### `src/hooks/useSectionBooks.ts` (migrado completo)

Mantiene el tipo `UseSectionResult` y la función `fetchSection` (que ya estaba). Solo cambia el cuerpo del hook:

```ts
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import type { Book } from "@/types/Book";
import type { ExploreSectionParams, ExploreSectionType, UseSectionResult } from "@/types/ExploreTypes";
import { /* ...mismos imports de firebase/firebaseBooks que antes... */ } from "@/services/firebase/firebaseBooks";

export function useSectionBooks(
  type: ExploreSectionType,
  params: ExploreSectionParams = {},
  lang: string,
  count = 6,
  disabled = false,
): UseSectionResult {
  // Normalizar params para queryKey estable. Las claves incluidas aquí replican EXACTAMENTE
  // el array de dependencias del useCallback actual (líneas 52-60 del hook original).
  // No incluir más cosas: incluir más (userShelfKeys, wantToReadBooks, favoritesReferenceBook.genre)
  // cambiaría el comportamiento del hook respecto a hoy y forzaría refetches que el código actual
  // no hace. Mantener identidad con el comportamiento actual es el objetivo de esta fase.
  const normalizedParams = {
    referenceBookKey: params.referenceBookKey,
    referenceGenre: params.referenceGenre,
    favoriteGenre: params.favoriteGenre,
    favoriteAuthorKey: params.favoriteAuthorKey,
    favoriteGenreLabel: params.favoriteGenreLabel,
    userAuthorKeys: params.userAuthorKeys?.join(",") ?? "",
    favoritesReferenceBookKey: params.favoritesReferenceBook?.key,
  };

  const query = useQuery({
    queryKey: ["section", type, lang, count, normalizedParams],
    queryFn: () => fetchSection(type, params, lang, count),
    enabled: !disabled,
    placeholderData: keepPreviousData,
  });

  // Deduplicar dentro del result (el switch de fetchSection ya lo intenta, pero por seguridad)
  const books: Book[] = (() => {
    if (!query.data) return [];
    const seen = new Set<string>();
    return query.data.books.filter(b => {
      if (seen.has(b.key)) return false;
      seen.add(b.key);
      return true;
    });
  })();

  return {
    books,
    loading: query.isPending && !disabled,
    error: query.error ? "error" : null,
    retry: () => { query.refetch(); },
    isFallback: query.data?.isFallback ?? false,
  };
}

// fetchSection se mantiene IDÉNTICA a la versión actual.
// La función no cambia ni una línea.
async function fetchSection(/* ...igual que ahora... */) { /* ...igual... */ }
```

**Notas:**

- `normalizedParams` resuelve el problema del "objeto nuevo cada render" que el hook actual tenía con `eslint-disable-next-line`. Convirtiéndolo a un objeto plano de primitivos, el `queryKey` se compara correctamente por contenido (RQ hace deep equal en los keys).
- `query.isPending` es `true` solo durante el primer fetch. Si quisiéramos mostrar loading también en refetches, usaríamos `isFetching`. Mantenemos el comportamiento actual de `loading` (era `true` solo en el primer fetch porque después se reseteaba).
- `error: "error"` para mantener el contrato actual del hook (`error: string | null`). Si en el futuro queremos exponer el error real, el contrato del hook cambia y eso es otra refactor.
- `retry()` envuelve `refetch()` para que ignore el retorno del Promise (el contrato actual era `() => void`).
- Se elimina la dedupe interna del `fetchSection` actual (no aporta nada, ya se hace tras la query) — quizá no, mejor mantenemos la dedupe **fuera** del queryFn para que el caché contenga la lista cruda y la dedupe sea baratísima en cada render.

### `src/hooks/useBookRecommendations.ts` (migrado completo)

```ts
import { useCallback, useEffect, useRef, useState } from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import type { Book } from "@/types/Book";
import { fetchBooksByGenre, fetchWorkEditionByLang } from "@/services/api/openLibraryApi";
import { useCurrentLanguage } from "@/plugins/i18n/useCurrentLanguage";
import { getRecommendationsFromDB, saveBooksToDB, updateBookTitleToDB } from "@/services/firebase/firebaseBooks";

const PAGE_SIZE = 6;
const MIN_DB_BOOKS = 20;

export function useBookRecommendations(genre: string, excludeKey: string) {
  const { lang } = useCurrentLanguage();
  const shownKeys = useRef<Set<string>>(new Set());
  const [books, setBooks] = useState<Book[]>([]);

  const { data: pool } = useQuery<Book[]>({
    queryKey: ["recommendations-pool", genre, lang, excludeKey],
    queryFn: async ({ signal }) => {
      const dbBooks = await getRecommendationsFromDB(genre, lang, excludeKey, MIN_DB_BOOKS);
      if (dbBooks) {
        // side effect: enriquecer títulos en el otro idioma (fire-and-forget)
        completeOtherLangTitles(dbBooks, lang);
        return sortAndDeduplicate(dbBooks);
      }
      // Fallback API
      const results = await fetchBooksByGenre(genre, 30, lang, signal);
      const deduplicated = sortAndDeduplicate(results);
      saveBooksToDB(deduplicated, lang).catch(() => {});
      return deduplicated.filter(b => b.key !== excludeKey);
    },
    enabled: !!genre,
    placeholderData: keepPreviousData,
  });

  // Cuando llega un pool nuevo, resetear "vistos" y elegir el primer subset
  useEffect(() => {
    if (!pool) return;
    shownKeys.current.clear();
    setBooks(pickNext(pool, shownKeys.current));
  }, [pool]);

  const refresh = useCallback(() => {
    if (!pool) return;
    setBooks(pickNext(pool, shownKeys.current));
  }, [pool]);

  return { books, refresh };
}

function pickNext(fullPool: Book[], shown: Set<string>): Book[] {
  const available = fullPool.filter(b => !shown.has(b.key));
  const source = available.length >= PAGE_SIZE ? available : fullPool;
  if (available.length < PAGE_SIZE) shown.clear();

  const shuffled = [...source].sort(() => Math.random() - 0.5);
  const picked = shuffled.slice(0, PAGE_SIZE);
  picked.forEach(b => shown.add(b.key));
  return picked;
}

function sortAndDeduplicate(books: Book[]): Book[] { /* idéntica al original */ }

function completeOtherLangTitles(books: Book[], lang: string): void { /* idéntica al original */ }
```

**Notas:**

- `pool` cacheado por `["recommendations-pool", genre, lang, excludeKey]`. Cambiar de género dispara nueva query, RQ cancela la anterior si está en vuelo.
- `books` (el subset visible) es estado local del hook. `refresh()` solo lo reescoge sin tocar el pool ni RQ.
- `pickNext` se externaliza como función pura (reciben el set como argumento). Más fácil de testear y razonar.
- El `useEffect([pool])` reescoge el subset cuando llega un pool nuevo (cambio de género/idioma).
- Side effects (`saveBooksToDB`, `completeOtherLangTitles`) se mantienen fire-and-forget dentro del `queryFn`. RQ no espera por ellos.

---

## Estrategia para no romper el código

### Principio: API pública intacta

Los componentes consumidores (`TrendingSection`, `ExploreSection`, `ExploreSectionPage`, `BookDetailPage`) **no se tocan**. Importan los mismos nombres, llaman con los mismos parámetros, destructuran las mismas propiedades. Cualquier diferencia en el resultado es interna y bloqueada por el contrato del tipo de retorno.

### Verificaciones obligatorias antes de mergear

1. `npm run build` verde (TS satisfecho).
2. `npm run test:run` verde (tests existentes pasan).
3. **Verificación manual** del flujo completo:
   - Abrir Explore → todas las secciones cargan.
   - Cambiar idioma (es ↔ en) → secciones re-cargan con datos del nuevo idioma.
   - Abrir detalle de un libro → ver recomendaciones del mismo género.
   - Click "refresh" en recomendaciones → cambia el subset sin recargar.
   - Navegar atrás a Explore desde detalle → secciones aparecen INSTANTÁNEAMENTE desde caché (mejora visible respecto al estado actual).
   - Abrir DevTools de RQ → ver que las queries están activas, con sus estados correctos.

### Rollback plan

Si algo falla en producción, los cambios están confinados a 4 archivos:
- `package.json` (añadido)
- `src/App.tsx` (un wrapper extra)
- `src/lib/queryClient.ts` (nuevo)
- `src/hooks/useSectionBooks.ts`
- `src/hooks/useBookRecommendations.ts`

Revertir los hooks (manteniendo el provider y el package) deja la app funcionando como antes. Las queries simplemente no se usan.

### Riesgos identificados

| Riesgo | Mitigación |
|---|---|
| `queryKey` con `params` no estables → cache miss perpetuo | Normalización explícita en `useSectionBooks` (objeto plano de primitivos) |
| Side effects fire-and-forget se ejecutan dos veces en strict mode | Aceptable porque son idempotentes (saveBooksToDB upserts) |
| Cambio de idioma no triggerea refetch | `lang` está en el `queryKey` → cambia → RQ pide nueva query |
| `disabled = true` mantiene en loading infinito | `loading: query.isPending && !disabled` corta el flag cuando disabled |
| RQ retry default es 3 → llama 3 veces si falla un fetch caro | `queryClient` defaultOptions baja a `retry: 1` |
| Caché compartido provoca race conditions con datos viejos | `staleTime: 5min` + `gcTime: 10min` acotan la ventana |
| Tests existentes mockean los hooks devolviendo objetos sin shape de RQ | El hook sigue devolviendo `{ books, loading, error, retry, isFallback }` y `{ books, refresh }`. Los mocks no se enteran. |

### Riesgos que NO mitigamos en esta fase

- **`useExploreFeed` no se migra** — usa los hooks migrados internamente (presumiblemente). Si su comportamiento se ve afectado por el cambio de timing del caché, lo trataríamos al detectar el problema en verificación manual. Sin spec aparte si no aparece nada.
- **No se añade test unitario de los hooks migrados** — la cobertura de tests del proyecto no incluye estos hooks hoy. Añadir tests es deuda técnica que se acumulará; la verificación manual cubre el riesgo en esta fase.
- **`userShelfKeys` y `wantToReadBooks` siguen sin invalidar el caché** — el `useCallback` actual no los incluye en sus deps (líneas 52-60 del hook original), así que `fetchSection` se ejecuta con la versión "vieja" de ese set cuando el usuario añade/quita libros sin navegar. Es un bug preexistente del filtrado post-fetch (`raw.filter(b => !params.userShelfKeys?.has(b.key))`) y un fix correcto requeriría sacar el filtro del `queryFn` para aplicarlo después con los datos actuales. La migración mantiene el comportamiento actual por simplicidad. Pendiente para una fase posterior.

---

## Casos edge

| Caso | Comportamiento esperado |
|---|---|
| Mismo género abierto en dos pestañas / dos detalles a la vez | Una sola query en vuelo; ambos consumidores reciben el mismo resultado desde caché |
| Usuario cambia de idioma mientras una query está en vuelo | RQ cancela la anterior (vía `signal`) y empieza la del nuevo idioma. Si `keepPreviousData` está, los libros del idioma anterior siguen visibles hasta que llegue la nueva data. |
| `disabled = true` desde el principio | `enabled: false` → query no se ejecuta. `loading = false`, `books = []`. |
| `disabled` cambia de `true` → `false` | RQ empieza la query. `loading` pasa a `true` brevemente y luego a `false` con los datos. |
| Firestore lanza error en `fetchSection` | RQ marca `error`. El hook devuelve `error: "error"` (contrato actual). El componente muestra su mensaje de error como ya hacía. |
| Recomendaciones — usuario clica `refresh()` mientras el pool está cargando | `refresh()` no hace nada si `pool` es undefined. Cuando el pool llega, `useEffect` pone el primer subset. |

---

## Dependencias nuevas

- `@tanstack/react-query` ^5.x → `dependencies`.
- `@tanstack/react-query-devtools` ^5.x → `dependencies` (tree-shaken en producción por el flag `import.meta.env.DEV`).

Ninguna otra. No hay cambios de config de Vite, TS o ESLint.

---

## Fuera de scope

- Migración de `useBookDetail`, `useAuthorData`, `useProfile`, `useBookSearch`, mutators de `ShelfContext`, `useExploreFeed`. Quedan para fases posteriores.
- Borrar `useExploreBooks.ts` y `useFantasyBooks.ts` (código muerto). Separar en una limpieza propia.
- Reemplazar el caché `localStorage` con TTL por el `persister` de RQ. No aplica aquí porque ninguno de los dos hooks migrados usa localStorage hoy.
- Mutaciones con `useMutation`. Las mutaciones de Shelf seguirán como están.
- Tests unitarios de los hooks migrados.
- Migrar las llamadas a Firebase realtime (`onSnapshot`) — no son fetches puntuales, no aplican.
