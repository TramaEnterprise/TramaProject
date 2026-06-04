# Spec: Modal de valoración al marcar libro como acabado

**Fecha:** 2026-06-04  
**Estado:** Aprobado

## Resumen

Cuando el usuario marca un libro como "acabado" desde `ShelfStatusDropdown` (en BookCard, FeaturedCard o BookDetail), se abre automáticamente `UpdateProgressModal` con el título "Valorar libro" para que pueda añadir rating y reseña. El modal incluye un botón "Saltar valoración" para cerrar sin valorar.

## Flujo de usuario

1. Usuario hace clic en "acabado" en el dropdown
2. En lugar de llamar `addBook` directamente, se abre el modal
   - Si el libro **ya está en estantería**: se recupera el `ShelfEntry` existente via `getEntry(book.key)`
   - Si el libro **no está en estantería**: se llama `addBook(book, "finished")` primero (optimistic update), luego se construye un `ShelfEntry` sintético con `status: "finished"` y `currentPage: 0`
3. El modal abre con status pre-seleccionado en "acabado", mostrando las secciones de rating y reseña
4. El selector de estado permanece visible — si el usuario se equivocó puede cambiarlo
5. El usuario puede:
   - Añadir rating y/o reseña y pulsar **Guardar**
   - Pulsar **Saltar valoración** → cierra sin guardar rating/reseña (el libro permanece en estantería como "acabado")
   - Cambiar el status en el selector y guardar
6. Si cancela con la X o el backdrop, el libro permanece en estantería como "acabado" sin valoración

## Cambios técnicos

### 1. `ShelfContext` / `useShelf`
- Añadir `getEntry(bookKey: string): ShelfEntry | undefined` que devuelve el entry completo del Map interno
- Exponer en el valor del contexto junto a `getStatus`

### 2. `UpdateProgressModal.tsx`
- Añadir prop `title?: string` — sobreescribe el título del modal (por defecto sigue usando la clave i18n existente)
- Añadir prop `onSkip?: () => void` — cuando está presente, renderiza el botón "Saltar valoración" alineado a la izquierda del footer

### 3. `UpdateProgressModal.scss`
- Modificar `.progress-modal__footer` para soportar layout con dos zonas: izquierda (skip) y derecha (guardar)
- Nuevo elemento `.progress-modal__skip-btn`:
  - Fondo blanco, sin borde por defecto
  - En hover: borde 1px sólido negro (`--color-bg-darkest`)
  - Estilo similar al `navbar__btn-login`

### 4. `ShelfStatusDropdown.tsx`
- Nuevos estados: `finishModalOpen: boolean`, `finishEntry: ShelfEntry | null`
- Modificar `handleStatusSelect`: cuando `status === "finished"`, interceptar el flujo:
  ```
  if (status === "finished") {
    if (saved === "finished") { removeBook; return }  // toggle off sigue igual
    const existing = getEntry(book.key)
    if (existing) {
      setFinishEntry({ ...existing, status: "finished" })
    } else {
      addBook(book, "finished")
      setFinishEntry(syntheticEntry)
    }
    setFinishModalOpen(true)
    setOpen(false)
    return
  }
  ```
- Renderizar `<UpdateProgressModal>` cuando `finishModalOpen === true`, con `title`, `onSkip` y el entry

### 5. i18n
- Añadir en `es/myLibrary.json` (o el namespace correspondiente):
  - `myLibrary.finishModal.title`: `"Valorar libro"`
  - `myLibrary.finishModal.skip`: `"Saltar valoración"`
- Añadir en `en/myLibrary.json`:
  - `myLibrary.finishModal.title`: `"Rate book"`
  - `myLibrary.finishModal.skip`: `"Skip rating"`

## Casos límite

- **Toggle off (ya era "acabado")**: si el libro ya tiene status "finished" y se vuelve a pulsar "acabado" en el dropdown, se elimina de la estantería (comportamiento toggle actual), sin abrir el modal
- **Cancelar con X**: el libro queda en estantería como "acabado" sin valoración — correcto
- **Cambio de status en el modal**: el modal ya maneja todos los status correctamente; el usuario puede cambiar a "leyendo", "quiero leer", etc. y guardar
- **Libro sin páginas conocidas**: ya manejado en el modal (`totalPages = 0`)

## Componentes afectados

| Archivo | Tipo de cambio |
|---|---|
| `src/context/shelf/ShelfContext.tsx` | Añadir `getEntry` |
| `src/context/shelf/shelf_init.ts` | Añadir `getEntry` al tipo del contexto |
| `src/components/shelf/modals/UpdateProgressModal.tsx` | Props `title` y `onSkip` |
| `src/components/shelf/modals/UpdateProgressModal.scss` | Footer con dos zonas + skip button |
| `src/components/book/shelf-status-dropdown/ShelfStatusDropdown.tsx` | Interceptar "finished", abrir modal |
| `src/plugins/i18n/locales/es/` | Nuevas claves |
| `src/plugins/i18n/locales/en/` | Nuevas claves |
