# Animaciones de celebración al terminar y valorar un libro — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **⚠️ Regla del usuario — NO COMMITS:** este proyecto tiene la regla estricta de no ejecutar `git commit`. Los pasos de "Checkpoint" de este plan **dejan los cambios preparados (`git add`) pero NO commitean**. El usuario hará los commits. No ejecutes `git commit` en ningún paso.

**Goal:** Añadir dos animaciones de celebración con `motion` al terminar un libro: confeti dorado desde las esquinas (al Guardar finished / Saltar) y rotación 360° de las estrellas al valorar.

**Architecture:** El confeti vive en un `CelebrationProvider` a nivel de app (portal a `document.body`), de modo que sobrevive al cierre del modal y cae sobre la página. `UpdateProgressModal` dispara la celebración vía un hook `useCelebration()`. La rotación de estrellas se implementa dentro de `EditableStarRating` con `motion`. Ambas respetan `prefers-reduced-motion`.

**Tech Stack:** React 19 + TypeScript, `motion` v12 (`motion/react`), SCSS con tokens custom properties, Vitest + Testing Library.

---

## Estructura de archivos

| Archivo | Responsabilidad |
|---|---|
| `src/styles/variables/_custom_properties.scss` (modify) | Nuevos tokens de color dorado para el confeti |
| `src/components/common/ConfettiBurst.tsx` (create) | Componente presentacional: partículas doradas con `motion`, portal a `body`, gate de reduced-motion |
| `src/components/common/ConfettiBurst.scss` (create) | Overlay full-screen + estilo de partícula |
| `src/components/common/ConfettiBurst.test.tsx` (create) | Tests: gate reduced-motion, nº de partículas, `onComplete` |
| `src/context/celebration/celebration_init.ts` (create) | Objeto de contexto + tipo (patrón `*_init.ts`) |
| `src/context/celebration/CelebrationContext.tsx` (create) | Provider que renderiza `ConfettiBurst` al llamar `celebrate()` |
| `src/context/celebration/useCelebration.ts` (create) | Hook de acceso al contexto |
| `src/App.tsx` (modify) | Montar `CelebrationProvider` alrededor de `AppShell` |
| `src/components/shelf/modals/UpdateProgressModal.tsx` (modify) | Disparar `celebrate()` en finished (Guardar éxito) y en Saltar |
| `src/components/shelf/modals/UpdateProgressModal.test.tsx` (create) | Tests: celebrate en finished/skip, NO en reading |
| `src/components/common/EditableStarRating.tsx` (modify) | Rotación 360° de las 5 estrellas al valorar |
| `src/components/common/EditableStarRating.test.tsx` (create) | Test: clic sigue llamando `onChange` con el valor correcto |

---

## Task 1: Tokens de color dorado

**Files:**
- Modify: `src/styles/variables/_custom_properties.scss` (zona de colores de marca, junto a `--color-accent*`, ~líneas 41-43)

- [ ] **Step 1: Añadir tokens dorados**

En `:root`, justo después del bloque `--color-accent*`, añadir:

```scss
  /* Confetti / celebración (dorados — no cambian entre temas) */
  --color-confetti-gold: #f6c945;
  --color-confetti-gold-deep: #d4a017;
  --color-confetti-gold-pale: #fbe7a1;
```

- [ ] **Step 2: Verificar build de estilos**

Run: `npm run build`
Expected: compila sin errores de SCSS.

- [ ] **Step 3: Checkpoint (NO commit)**

```bash
git add src/styles/variables/_custom_properties.scss
```
Avisar al usuario para que commitee si lo desea. NO ejecutar `git commit`.

---

## Task 2: Componente `ConfettiBurst`

**Files:**
- Create: `src/components/common/ConfettiBurst.tsx`
- Create: `src/components/common/ConfettiBurst.scss`
- Test: `src/components/common/ConfettiBurst.test.tsx`

- [ ] **Step 1: Escribir el test que falla**

Crear `src/components/common/ConfettiBurst.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";

// Mock determinista de prefers-reduced-motion (evita depender del timing
// del hook de motion). La variable debe llevar prefijo `mock` para que
// vitest permita referenciarla dentro del factory hoisteado.
let mockReduceMotion = false;
vi.mock("motion/react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("motion/react")>();
  return { ...actual, useReducedMotion: () => mockReduceMotion };
});

import ConfettiBurst from "./ConfettiBurst";

beforeEach(() => {
  document.body.innerHTML = "";
  mockReduceMotion = false;
});

describe("ConfettiBurst", () => {
  it("renderiza el número pedido de partículas cuando no hay reduced-motion", () => {
    mockReduceMotion = false;
    render(<ConfettiBurst count={12} />);
    expect(document.body.querySelectorAll(".confetti-burst__piece").length).toBe(12);
  });

  it("no renderiza partículas y llama onComplete con reduced-motion", () => {
    mockReduceMotion = true;
    const onComplete = vi.fn();
    render(<ConfettiBurst count={12} onComplete={onComplete} />);
    expect(document.body.querySelectorAll(".confetti-burst__piece").length).toBe(0);
    expect(onComplete).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Ejecutar el test para verificar que falla**

Run: `npm run test:run -- src/components/common/ConfettiBurst.test.tsx`
Expected: FAIL — `Cannot find module './ConfettiBurst'`.

- [ ] **Step 3: Implementar `ConfettiBurst.tsx`**

```tsx
import { useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { motion, useReducedMotion } from "motion/react";
import "./ConfettiBurst.scss";

type ConfettiBurstProps = {
  /** Número de partículas. Por defecto 28 (sutil pero notable). */
  count?: number;
  /** Se llama una vez al terminar la animación, para que el padre lo desmonte. */
  onComplete?: () => void;
};

type Corner = { x: number; y: number; dx: number; dy: number };

// Cuatro esquinas; dx/dy apuntan hacia el interior de la pantalla.
const CORNERS: Corner[] = [
  { x: 0, y: 0, dx: 1, dy: 1 },
  { x: 100, y: 0, dx: -1, dy: 1 },
  { x: 0, y: 100, dx: 1, dy: -1 },
  { x: 100, y: 100, dx: -1, dy: -1 },
];

const GOLD_COLORS = [
  "var(--color-confetti-gold)",
  "var(--color-confetti-gold-deep)",
  "var(--color-confetti-gold-pale)",
];

const DURATION = 1.1;

export default function ConfettiBurst({ count = 28, onComplete }: ConfettiBurstProps) {
  const reduce = useReducedMotion();

  const particles = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => {
        const corner = CORNERS[i % CORNERS.length];
        const spread = 18 + Math.random() * 32;
        return {
          id: i,
          corner,
          color: GOLD_COLORS[i % GOLD_COLORS.length],
          travelX: corner.dx * spread,
          travelY: corner.dy * spread * 0.6 + 35,
          rotate: (Math.random() - 0.5) * 720,
          delay: Math.random() * 0.15,
          width: 6 + Math.random() * 6,
        };
      }),
    [count]
  );

  // Fallback de desmontaje (y caso reduced-motion).
  useEffect(() => {
    if (reduce) {
      onComplete?.();
      return;
    }
    const t = window.setTimeout(() => onComplete?.(), (DURATION + 0.3) * 1000);
    return () => window.clearTimeout(t);
  }, [reduce, onComplete]);

  if (reduce) return null;

  return createPortal(
    <div className="confetti-burst" aria-hidden="true">
      {particles.map((p) => (
        <motion.span
          key={p.id}
          className="confetti-burst__piece"
          style={{
            left: `${p.corner.x}vw`,
            top: `${p.corner.y}vh`,
            width: p.width,
            height: p.width * 0.4,
            backgroundColor: p.color,
          }}
          initial={{ opacity: 1, x: 0, y: 0, rotate: 0 }}
          animate={{
            opacity: [1, 1, 0],
            x: `${p.travelX}vw`,
            y: `${p.travelY}vh`,
            rotate: p.rotate,
          }}
          transition={{ duration: DURATION, delay: p.delay, ease: "easeOut" }}
        />
      ))}
    </div>,
    document.body
  );
}
```

- [ ] **Step 4: Implementar `ConfettiBurst.scss`**

```scss
.confetti-burst {
  position: fixed;
  inset: 0;
  z-index: 2000; // por encima de los modales (1000)
  pointer-events: none;
  overflow: hidden;

  &__piece {
    position: absolute;
    display: block;
    border-radius: 2px;
    will-change: transform, opacity;
  }
}
```

- [ ] **Step 5: Ejecutar el test para verificar que pasa**

Run: `npm run test:run -- src/components/common/ConfettiBurst.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 6: Checkpoint (NO commit)**

```bash
git add src/components/common/ConfettiBurst.tsx src/components/common/ConfettiBurst.scss src/components/common/ConfettiBurst.test.tsx
```
NO ejecutar `git commit`.

---

## Task 3: Contexto de celebración (`CelebrationProvider` + `useCelebration`)

**Files:**
- Create: `src/context/celebration/celebration_init.ts`
- Create: `src/context/celebration/CelebrationContext.tsx`
- Create: `src/context/celebration/useCelebration.ts`
- Modify: `src/App.tsx`

- [ ] **Step 1: Crear `celebration_init.ts`**

```ts
import { createContext } from "react";

export type CelebrationContextType = {
  /** Lanza el confeti de celebración (un "burst"). */
  celebrate: () => void;
};

export const CelebrationContext = createContext<CelebrationContextType | null>(null);
```

- [ ] **Step 2: Crear `useCelebration.ts`**

```ts
import { useContext } from "react";
import { CelebrationContext, type CelebrationContextType } from "./celebration_init";

export function useCelebration(): CelebrationContextType {
  const context = useContext(CelebrationContext);
  if (!context) {
    throw new Error("useCelebration must be used within a CelebrationProvider");
  }
  return context;
}
```

- [ ] **Step 3: Crear `CelebrationContext.tsx`**

```tsx
import { useCallback, useMemo, useState, type ReactNode } from "react";
import { CelebrationContext } from "./celebration_init";
import ConfettiBurst from "@/components/common/ConfettiBurst";

export function CelebrationProvider({ children }: { children: ReactNode }) {
  // null = sin confeti; un número = id del burst activo (key para remontar).
  const [burstId, setBurstId] = useState<number | null>(null);

  const celebrate = useCallback(() => {
    setBurstId((id) => (id === null ? 0 : id + 1));
  }, []);

  const value = useMemo(() => ({ celebrate }), [celebrate]);

  return (
    <CelebrationContext.Provider value={value}>
      {children}
      {burstId !== null && (
        <ConfettiBurst key={burstId} onComplete={() => setBurstId(null)} />
      )}
    </CelebrationContext.Provider>
  );
}
```

- [ ] **Step 4: Montar el provider en `App.tsx`**

En `src/App.tsx`, añadir el import junto a los demás providers:

```tsx
import { CelebrationProvider } from "./context/celebration/CelebrationContext";
```

Y envolver `AppShell` (dentro de `NotificationsProvider`). El bloque queda:

```tsx
              <ShelfProvider>
                <NotificationsProvider>
                  <CelebrationProvider>
                    <AppShell />
                  </CelebrationProvider>
                </NotificationsProvider>
              </ShelfProvider>
```

- [ ] **Step 5: Verificar typecheck + arranque**

Run: `npm run build`
Expected: compila sin errores de TypeScript.

- [ ] **Step 6: Checkpoint (NO commit)**

```bash
git add src/context/celebration/ src/App.tsx
```
NO ejecutar `git commit`.

---

## Task 4: Disparar el confeti desde `UpdateProgressModal`

**Files:**
- Modify: `src/components/shelf/modals/UpdateProgressModal.tsx`
- Test: `src/components/shelf/modals/UpdateProgressModal.test.tsx`

- [ ] **Step 1: Escribir el test que falla**

Crear `src/components/shelf/modals/UpdateProgressModal.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import UpdateProgressModal from "./UpdateProgressModal";
import type { ShelfEntry } from "@/services/firebase/firebaseLibrary";

const celebrate = vi.fn();
const updateProgress = vi.fn().mockResolvedValue(undefined);
const addBook = vi.fn().mockResolvedValue(undefined);

vi.mock("@/context/celebration/useCelebration", () => ({
  useCelebration: () => ({ celebrate }),
}));
vi.mock("@/context/shelf/useShelf", () => ({
  useShelf: () => ({ updateProgress, addBook }),
}));
vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));

const finishedEntry: ShelfEntry = {
  book: { key: "/works/OL1W", title: "Libro", pages: 100 },
  status: "finished",
  currentPage: 0,
} as ShelfEntry;

const readingEntry: ShelfEntry = {
  book: { key: "/works/OL1W", title: "Libro", pages: 100 },
  status: "reading",
  currentPage: 10,
} as ShelfEntry;

beforeEach(() => {
  celebrate.mockClear();
  updateProgress.mockClear();
});

describe("UpdateProgressModal — confeti", () => {
  it("celebra al guardar un libro finished", async () => {
    render(<UpdateProgressModal entry={finishedEntry} onClose={vi.fn()} />);
    fireEvent.click(screen.getByText("myLibrary.updateProgressModal.save"));
    await waitFor(() => expect(updateProgress).toHaveBeenCalled());
    expect(celebrate).toHaveBeenCalledTimes(1);
  });

  it("celebra al pulsar Saltar", () => {
    const onSkip = vi.fn();
    render(<UpdateProgressModal entry={finishedEntry} onClose={vi.fn()} onSkip={onSkip} />);
    fireEvent.click(screen.getByText("myLibrary.finishModal.skip"));
    expect(celebrate).toHaveBeenCalledTimes(1);
    expect(onSkip).toHaveBeenCalledTimes(1);
  });

  it("NO celebra al guardar progreso de lectura", async () => {
    render(<UpdateProgressModal entry={readingEntry} onClose={vi.fn()} />);
    fireEvent.click(screen.getByText("myLibrary.updateProgressModal.save"));
    await waitFor(() => expect(updateProgress).toHaveBeenCalled());
    expect(celebrate).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Ejecutar el test para verificar que falla**

Run: `npm run test:run -- src/components/shelf/modals/UpdateProgressModal.test.tsx`
Expected: FAIL — `celebrate` no se llama (aún no integrado) o el módulo `useCelebration` no se usa.

- [ ] **Step 3: Importar y usar `useCelebration` en el modal**

En `src/components/shelf/modals/UpdateProgressModal.tsx`, añadir el import:

```tsx
import { useCelebration } from "@/context/celebration/useCelebration";
```

Dentro del componente, junto a `const { updateProgress, addBook } = useShelf();`:

```tsx
  const { celebrate } = useCelebration();
```

- [ ] **Step 4: Disparar `celebrate()` en la rama `finished` de `handleSave`**

En `handleSave`, dentro del bloque `if (localStatus === "finished")`, en el `try` tras `await updateProgress(...)` exitoso (antes del `finally`), añadir `celebrate()`:

```tsx
      setIsSubmitting(true);
      const savePage = totalPages > 0 ? totalPages : currentPage;
      try {
        await updateProgress(entry.book.key, savePage, {
          rating: rating || undefined,
          review: review.trim() || undefined,
          status: "finished",
        });
        celebrate();
      } finally {
        setIsSubmitting(false);
        onClose();
      }
      return;
```

> Importante: `celebrate()` va **dentro del `try`, tras el `await`**, para que solo dispare si el guardado tuvo éxito (si `updateProgress` lanza, no se celebra).

- [ ] **Step 5: Disparar `celebrate()` en el botón Saltar**

En el JSX del footer, modificar el `onClick` del botón Saltar para celebrar antes de cerrar:

```tsx
        {onSkip && (
          <button
            type="button"
            className="progress-modal__skip-btn"
            onClick={() => {
              celebrate();
              onSkip();
            }}
          >
            {t("myLibrary.finishModal.skip")}
          </button>
        )}
```

- [ ] **Step 6: Ejecutar el test para verificar que pasa**

Run: `npm run test:run -- src/components/shelf/modals/UpdateProgressModal.test.tsx`
Expected: PASS (3 tests).

- [ ] **Step 7: Checkpoint (NO commit)**

```bash
git add src/components/shelf/modals/UpdateProgressModal.tsx src/components/shelf/modals/UpdateProgressModal.test.tsx
```
NO ejecutar `git commit`.

---

## Task 5: Rotación de estrellas en `EditableStarRating`

**Files:**
- Modify: `src/components/common/EditableStarRating.tsx`
- Test: `src/components/common/EditableStarRating.test.tsx`

- [ ] **Step 1: Escribir el test que falla**

Crear `src/components/common/EditableStarRating.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import EditableStarRating from "./EditableStarRating";

function mockMatchMedia(reduce: boolean) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: query.includes("reduce") ? reduce : false,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
}

beforeEach(() => mockMatchMedia(false));

describe("EditableStarRating", () => {
  it("llama onChange con el valor de la estrella al hacer clic", () => {
    const onChange = vi.fn();
    render(<EditableStarRating rating={0} onChange={onChange} />);
    // En jsdom getBoundingClientRect es 0 → fracción NaN → estrella completa.
    fireEvent.click(screen.getByLabelText("4 estrellas"));
    expect(onChange).toHaveBeenCalledWith(4);
  });
});
```

- [ ] **Step 2: Ejecutar el test para verificar que pasa con el componente actual**

Run: `npm run test:run -- src/components/common/EditableStarRating.test.tsx`
Expected: PASS (este test cubre el comportamiento que NO debe romperse al añadir la animación).

- [ ] **Step 3: Añadir la rotación con `motion`**

En `src/components/common/EditableStarRating.tsx`:

1. Cambiar los imports:

```tsx
import { useId, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
```

2. Dentro del componente, junto a `const [hover, setHover] = useState(0);`:

```tsx
  const [spin, setSpin] = useState(0);
  const reduce = useReducedMotion();

  const handleSelect = (value: number) => {
    onChange(value);
    if (!reduce) setSpin((s) => s + 1);
  };
```

3. Convertir el `<span>` de cada estrella en `<motion.span>` y usar `handleSelect`:

```tsx
        return (
          <motion.span
            key={star}
            className="star-rating__star"
            role="button"
            tabIndex={0}
            aria-label={`${star} estrellas`}
            onMouseMove={(e) => setHover(fractionFromEvent(e, star))}
            onClick={(e) => handleSelect(fractionFromEvent(e, star))}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") handleSelect(star);
            }}
            animate={reduce ? undefined : { rotate: spin * 360 }}
            transition={{ duration: 0.5, ease: "easeInOut" }}
          >
            <StarSvg fill={fill} uid={`${gradBase}-${star}`} />
          </motion.span>
        );
```

> Todas las estrellas leen el mismo `spin`, así que giran a la vez. `rotate: spin * 360` acumula vueltas completas (siempre gira hacia delante) sin volver a 0.

- [ ] **Step 4: Ejecutar el test para verificar que sigue pasando**

Run: `npm run test:run -- src/components/common/EditableStarRating.test.tsx`
Expected: PASS — el `onClick` ahora pasa por `handleSelect`, que sigue llamando `onChange(4)`.

- [ ] **Step 5: Checkpoint (NO commit)**

```bash
git add src/components/common/EditableStarRating.tsx src/components/common/EditableStarRating.test.tsx
```
NO ejecutar `git commit`.

---

## Task 6: Verificación manual (visual) y suite completa

**Files:** ninguno (solo verificación)

- [ ] **Step 1: Ejecutar toda la suite de tests**

Run: `npm run test:run`
Expected: PASS, sin regresiones en tests existentes.

- [ ] **Step 2: Lint + build**

Run: `npm run lint` y `npm run build`
Expected: sin errores.

- [ ] **Step 3: Verificación visual en navegador**

Run: `npm run dev`

Comprobar manualmente:
1. **Confeti al Guardar (finished):** marcar un libro como "acabado", poner valoración, pulsar Guardar → el modal se cierra y caen confetis dorados desde las cuatro esquinas (~1 s), sutiles pero visibles.
2. **Confeti al Saltar:** abrir el modal de acabado, pulsar "Saltar valoración" → confeti igual.
3. **Sin confeti en lectura:** en "actualizar progreso" con estado "leyendo", guardar progreso → NO hay confeti.
4. **Rotación de estrellas:** en la sección de valoración, hacer clic en una estrella → las 5 estrellas giran 360° a la vez (~0.5 s).
5. **Reduced-motion:** en DevTools → Rendering → "Emulate CSS prefers-reduced-motion: reduce". Repetir 1-4 → sin confeti y sin giro (cambios instantáneos), el resto del flujo intacto.

- [ ] **Step 4: Checkpoint final (NO commit)**

Avisar al usuario de que toda la feature está implementada y verificada, lista para que él commitee. NO ejecutar `git commit`.

---

## Notas de cierre

- **Reutilización:** `useCelebration().celebrate()` queda disponible para futuros logros (rachas, metas, etc.) sin tocar el confeti.
- **Fuera de alcance (del spec):** sonido/haptics, animaciones de scroll/SVG (eventual GSAP), cambios en la lógica de guardado/rating/reseña.
- **Dependencias:** ninguna nueva — todo con `motion`, ya presente en `package.json`.
