# Finish Book Rating Modal — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cuando el usuario marca un libro como "acabado" en `ShelfStatusDropdown`, abrir `UpdateProgressModal` con título "Valorar libro" y un botón "Saltar valoración" en lugar de añadir el libro directamente.

**Architecture:** Se reutiliza `UpdateProgressModal` añadiendo dos props opcionales (`title` y `onSkip`). `ShelfStatusDropdown` intercepta la selección de "finished" y abre el modal con el entry existente o uno sintético (si el libro es nuevo en la estantería). `getEntry` ya está disponible en `useShelf` — no hay cambios en ShelfContext.

**Tech Stack:** React 19, TypeScript, SCSS BEM, i18next, Firebase (via ShelfContext)

---

### Task 1: i18n — añadir claves del modal de valoración

**Files:**
- Modify: `src/plugins/i18n/locales/es/myLibrary.json`
- Modify: `src/plugins/i18n/locales/en/myLibrary.json`

- [ ] **Añadir claves en español**

En `src/plugins/i18n/locales/es/myLibrary.json`, dentro del objeto `"myLibrary"`, añadir después del bloque `"updateProgressModal"`:

```json
"finishModal": {
  "title": "Valorar libro",
  "skip": "Saltar valoración"
},
```

- [ ] **Añadir claves en inglés**

En `src/plugins/i18n/locales/en/myLibrary.json`, dentro del objeto `"myLibrary"`, añadir después del bloque `"updateProgressModal"`:

```json
"finishModal": {
  "title": "Rate book",
  "skip": "Skip rating"
},
```

- [ ] **Verificar que el servidor arranca sin errores de i18n**

```bash
npm run dev
```

Expected: servidor en http://localhost:5173 sin errores en consola.

- [ ] **Commit**

```bash
git add src/plugins/i18n/locales/es/myLibrary.json src/plugins/i18n/locales/en/myLibrary.json
git commit -m "i18n: claves para modal de valoración al acabar libro"
```

---

### Task 2: UpdateProgressModal — props `title` y `onSkip`

**Files:**
- Modify: `src/components/shelf/modals/UpdateProgressModal.tsx`

- [ ] **Añadir las props al tipo**

Localizar el tipo `UpdateProgressModalProps` (línea ~17) y añadir las dos props:

```ts
type UpdateProgressModalProps = {
  entry: ShelfEntry;
  onClose: () => void;
  title?: string;
  onSkip?: () => void;
};
```

- [ ] **Actualizar la firma del componente**

Localizar la línea `export default function UpdateProgressModal({ entry, onClose }` y sustituir por:

```ts
export default function UpdateProgressModal({ entry, onClose, title, onSkip }: UpdateProgressModalProps) {
```

- [ ] **Usar `title` en el Modal**

Localizar el prop `title` del componente `<Modal>` (actualmente `title={t("myLibrary.updateProgressModal.title")}`) y sustituir por:

```tsx
title={title ?? t("myLibrary.updateProgressModal.title")}
```

Hacer lo mismo con `ariaLabel`:

```tsx
ariaLabel={title ?? t("myLibrary.updateProgressModal.title")}
```

- [ ] **Añadir el botón "Saltar valoración" en el footer**

Localizar el bloque `<div className="progress-modal__footer">` (al final del componente) y sustituir por:

```tsx
<div className="progress-modal__footer">
  {onSkip && (
    <button
      type="button"
      className="progress-modal__skip-btn"
      onClick={onSkip}
    >
      {t("myLibrary.finishModal.skip")}
    </button>
  )}
  <button
    type="button"
    className="progress-modal__save-btn"
    onClick={handleSave}
    disabled={isSubmitting}
  >
    {t("myLibrary.updateProgressModal.save")}
  </button>
</div>
```

- [ ] **Verificar que el modal existente sigue funcionando**

Abrir la biblioteca, pulsar "Actualizar progreso" en un libro leyendo. El modal debe abrirse igual que antes, sin botón "Saltar valoración" y con el título "Actualizar progreso".

- [ ] **Commit**

```bash
git add src/components/shelf/modals/UpdateProgressModal.tsx
git commit -m "feat: props title y onSkip en UpdateProgressModal"
```

---

### Task 3: UpdateProgressModal.scss — footer y botón skip

**Files:**
- Modify: `src/components/shelf/modals/UpdateProgressModal.scss`

- [ ] **Añadir estilos del botón skip**

El footer ya tiene `justify-content: flex-end` — no hay que cambiarlo. Añadir `margin-right: auto` al skip button para que se quede a la izquierda y el save permanezca a la derecha en ambos casos (con o sin skip).

Añadir el bloque `&__skip-btn` dentro de `.progress-modal`, justo después de `&__save-btn`:

```scss
&__skip-btn {
  margin-right: auto;
  background: transparent;
  border: 1px solid transparent;
  border-radius: var(--radius-sm);
  padding: var(--space-2) var(--space-5);
  font-family: var(--font-main);
  font-size: var(--text-sm);
  font-weight: var(--weight-regular);
  color: var(--color-text-secondary);
  cursor: pointer;
  transition:
    border-color var(--transition-fast),
    color var(--transition-fast);

  &:hover {
    border-color: var(--color-bg-darkest);
    color: var(--color-bg-darkest);
  }
}
```

- [ ] **Verificar visualmente**

Con el dev server corriendo, abrir el modal de "Actualizar progreso" normal (sin skip). El footer debe verse igual que antes (save button alineado a la derecha), ya que no hay botón skip que ocupe el lado izquierdo.

- [ ] **Commit**

```bash
git add src/components/shelf/modals/UpdateProgressModal.scss
git commit -m "style: footer y botón skip en UpdateProgressModal"
```

---

### Task 4: ShelfStatusDropdown — interceptar "finished" y abrir modal

**Files:**
- Modify: `src/components/book/shelf-status-dropdown/ShelfStatusDropdown.tsx`

- [ ] **Añadir imports necesarios**

Al inicio del archivo, añadir los imports que faltan:

```ts
import type { ShelfEntry } from "@/services/firebase/firebaseLibrary";
import UpdateProgressModal from "@/components/shelf/modals/UpdateProgressModal";
```

- [ ] **Añadir `getEntry` a la desestructuración de useShelf**

Localizar la línea:
```ts
const { addBook, removeBook, getStatus } = useShelf();
```
Y sustituir por:
```ts
const { addBook, removeBook, getStatus, getEntry } = useShelf();
```

- [ ] **Añadir estado para el modal de valoración**

Después de las declaraciones de estado existentes (después de `const [dropdownPos, ...]`), añadir:

```ts
const [finishModalOpen, setFinishModalOpen] = useState(false);
const [finishEntry, setFinishEntry] = useState<ShelfEntry | null>(null);
```

- [ ] **Modificar `handleStatusSelect` para interceptar "finished"**

Sustituir la función `handleStatusSelect` completa por:

```ts
const handleStatusSelect = (e: React.MouseEvent, status: ShelfStatus) => {
  e.stopPropagation();
  if (status === "finished") {
    if (saved === "finished") {
      removeBook(book.key);
      setOpen(false);
      return;
    }
    const existing = getEntry(book.key);
    if (!existing) {
      addBook(book, "finished");
      setFinishEntry({ book, status: "finished" });
    } else {
      setFinishEntry({ ...existing, status: "finished" });
    }
    setFinishModalOpen(true);
    setOpen(false);
    return;
  }
  if (saved === status) removeBook(book.key);
  else addBook(book, status);
  setOpen(false);
};
```

- [ ] **Renderizar UpdateProgressModal al final del componente**

Dentro del `return`, justo antes del cierre `</div>` del wrapper raíz (después del bloque de `{listModalOpen && ...}`), añadir:

```tsx
{finishModalOpen && finishEntry && (
  <UpdateProgressModal
    entry={finishEntry}
    title={t("myLibrary.finishModal.title")}
    onClose={() => setFinishModalOpen(false)}
    onSkip={() => setFinishModalOpen(false)}
  />
)}
```

- [ ] **Verificar flujo completo — libro nuevo**

1. Buscar un libro que NO esté en la estantería
2. Hacer clic en el dropdown de estado → seleccionar "Acabado"
3. Expected: se abre el modal con título "Valorar libro", el selector de estado en "Acabado", y los campos de rating y reseña visibles
4. Expected: botón "Saltar valoración" visible abajo a la izquierda

- [ ] **Verificar flujo completo — libro ya en estantería**

1. Tener un libro marcado como "Leyendo"
2. Hacer clic en el dropdown → seleccionar "Acabado"
3. Expected: se abre el modal con título "Valorar libro" y status pre-seleccionado en "Acabado"

- [ ] **Verificar toggle off (libro ya en "Acabado")**

1. Tener un libro marcado como "Acabado"
2. Hacer clic en el dropdown → seleccionar "Acabado"
3. Expected: el libro se elimina de la estantería sin abrir modal (comportamiento toggle igual que antes)

- [ ] **Verificar "Saltar valoración"**

1. Abrir el modal de valoración
2. Pulsar "Saltar valoración"
3. Expected: modal se cierra, el libro permanece en estantería como "Acabado" sin rating ni reseña

- [ ] **Commit**

```bash
git add src/components/book/shelf-status-dropdown/ShelfStatusDropdown.tsx
git commit -m "feat: modal de valoración al marcar libro como acabado"
```

---

### Task 5: Push

- [ ] **Push a Develop**

```bash
git push
```

Expected: rama `Develop` actualizada en remoto con los 4 commits de esta feature.
