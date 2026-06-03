# Listas de libros — diseño

**Fecha:** 2026-05-18
**Estado:** aprobado, pendiente de plan de implementación

## Objetivo

Convertir la sección de listas —hoy estática y alimentada por datos mock
(`READING_LISTS`)— en una funcionalidad real: el usuario crea listas de libros,
las ve, las renombra, añade/quita libros y las borra. Las listas se muestran en
"Mi biblioteca" y en el perfil, y son navegables hasta una página de detalle.

## Decisiones tomadas

- **Operaciones:** CRUD completo — crear, ver, renombrar, añadir/quitar libros, borrar.
- **Visibilidad:** las listas siguen la visibilidad del perfil (perfil público →
  cualquiera; privado → solo seguidores). Igual que estantería y favoritos.
- **Cantidad de listas:** ilimitada. La sección muestra 3 y un enlace "Ver todo"
  lleva a una página con todas.
- **Tamaño de lista:** tope de 100 libros, con contador "N/100" en el modal.
- **Modelo de datos:** array embebido (un documento por lista, libros dentro).

## Modelo de datos

Nueva subcolección `Users/{uid}/lists/{listId}`, con `listId` autogenerado por
Firestore. Cada lista es un documento:

```ts
{
  name: string;        // nombre dado por el usuario
  books: ListBook[];   // array embebido, máx. 100
  createdAt: string;   // ISO
  updatedAt: string;   // ISO
}
```

`ListBook` es el mismo snapshot mínimo que `FavoriteBook`: `{ key, title,
authors, cover_url }`.

### Tipos — `src/types/BookList.ts` (nuevo)

```ts
type ListBook = { key: string; title: string; authors: string[]; cover_url?: string };
type BookList = {
  id: string;
  name: string;
  books: ListBook[];
  createdAt: string;
  updatedAt: string;
};
```

El tipo `ReadingList` de `ListCard` (`{ id, nameKey, count, coverUrls }`) cambia:
`nameKey` → `name` (string literal, ya no clave i18n). `count` y `coverUrls` se
derivan de `books` (longitud y las 4 primeras `cover_url`).

### Reglas Firestore (paso manual en consola)

Bloque nuevo `match /lists/{listId}`:
- `read`: misma lógica de visibilidad que `Shelf` (perfil público → cualquiera;
  privado → seguidores).
- `write: if isOwner(uid)`.

## Capa de servicio — `src/services/firebase/firebaseLists.ts` (nuevo)

Escrituras de cliente normales (no requieren Cloud Functions: documentos propios
del usuario, sin contadores cruzados). Sigue el patrón de `firebaseLibrary.ts`.

- `getLists(uid): Promise<BookList[]>` — `getDocs` de la subcolección.
- `getList(uid, listId): Promise<BookList | null>` — `getDoc` de un documento.
- `createList(uid, name, books): Promise<string>` — crea el doc con id
  automático, fija `createdAt`/`updatedAt`, devuelve el `listId`.
- `updateList(uid, listId, { name?, books? }): Promise<void>` — `updateDoc`,
  refresca `updatedAt`.
- `deleteList(uid, listId): Promise<void>` — `deleteDoc`.

## Estado — `useLists(userId)` (hook nuevo, `src/hooks/`)

Fuente única de datos para todas las páginas que muestran listas. Parametrizado
por `userId` → sirve para perfil propio y ajeno. Devuelve:

```ts
{ lists, loading, createList, updateList, deleteList }
```

Las mutaciones aplican **actualización optimista** (mismo patrón que `useProfile`:
mutan el estado al instante y revierten si Firebase falla).

## Componentes

### `ListEditorModal` (nuevo — `src/components/shelf/modals/ListEditorModal.tsx` + `.scss`)

Reutilizado para **crear y editar**, igual que `FavoriteBooksEditorModal`.

- Props: `userId`, `existingList?` (presente → modo editar; ausente → modo crear),
  `onClose`, `onSaved`.
- Estructura, de arriba a abajo:
  1. Input de **nombre** de la lista.
  2. Campo de **libros añadidos**, con **paginación de flechitas** (`<` `>`):
     muestra N chips por página, estado `page` local. Contador **"N/100"**.
  3. Barra de **búsqueda** + lista de resultados — debounce 400 ms con
     `searchBooksWithFallback(query, lang, 8)`, idéntico a favoritos.
- La búsqueda se oculta/deshabilita al alcanzar 100 libros. Un libro ya añadido
  aparece deshabilitado en los resultados.
- Guardar: modo crear → `createList`; modo editar → `updateList`. Nombre vacío
  (tras `trim`) → botón de guardar deshabilitado.

### `ListsSection` (modificar)

- Recibe `lists` reales, `isOwner` y `onCreateList`.
- El botón de crear (que ya existe visualmente) abre el `ListEditorModal`.
- "Ver todo" navega a `/lists/:userId`.
- Cada `ListCard` se vuelve clicable → `/lists/:userId/:listId`.

### `ListCard` (modificar)

- `nameKey` → `name`. Se renderiza el string literal en vez de `t(nameKey)`.
- Envuelto en navegación al detalle de la lista.

Renombrar / añadir-quitar libros / borrar **no** van en la `ListCard` (se mantiene
limpia, solo navega). Viven en la página de detalle.

## Páginas y rutas

Dos rutas nuevas en `src/routes/routes.tsx`, **sin** `AuthRoute` (las listas se
ven en perfiles ajenos; la visibilidad la imponen las reglas Firestore):

### `/lists/:userId` → `AllListsPage` (nuevo)

Cabecera con botón "Volver" + título "Listas" (layout calcado de
`ExploreSectionPage`). Grid de `ListCard`. Si es el perfil propio, incluye el
botón de crear lista.

### `/lists/:userId/:listId` → `ListDetailPage` (nuevo)

Cabecera con "Volver" + nombre de la lista. Grid de `BookCard` (como "ver más" de
explorar). Si el visitante es el propietario: botón "Editar" (abre el
`ListEditorModal` en modo editar) y botón "Eliminar" (con diálogo de
confirmación). Estados: cargando (skeleton), lista vacía, lista no encontrada.

### Páginas existentes a modificar

- `MyLibraryPage` y `ProfilePage`: se elimina el `READING_LISTS` hardcodeado y
  los imports de portadas mock; pasan a usar `useLists(userId)`. En
  `MyLibraryPage`, `userId` es el uid propio.

## i18n

Claves nuevas en `es/myLibrary.json` y `en/myLibrary.json` para: el modal (título
crear/editar, placeholder de nombre, contador, buscar, guardar, cancelar, vacío),
`AllListsPage`, `ListDetailPage`, y la confirmación de borrado. Se eliminan las
claves mock `myLibrary.lists.recommended/drama/women`.

## Casos límite

- Nombre de lista vacío (tras `trim`) → botón de guardar deshabilitado.
- Libro duplicado → deshabilitado en los resultados de búsqueda.
- Tope de 100 libros → se oculta la barra de búsqueda; el contador lo refleja.
- Borrar una lista → diálogo de confirmación antes de `deleteList`.
- Lista inexistente, o perfil privado sin acceso → estado "no disponible" en
  `ListDetailPage` / `AllListsPage`.
- Fallo de Firebase en una mutación → la actualización optimista revierte.

## Fuera de alcance

- Reordenar libros dentro de una lista.
- Compartir una lista por enlace directo a usuarios sin acceso al perfil.
- Listas colaborativas / con varios dueños.
- Portada personalizada de lista (la portada es el mosaico de las 4 primeras).
