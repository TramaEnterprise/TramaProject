# Spec: Animaciones de celebración al terminar y valorar un libro

**Fecha:** 2026-06-05  
**Estado:** Aprobado

## Resumen

Al terminar y valorar un libro en `UpdateProgressModal` la conclusión resulta "fría". Se añaden dos animaciones con la librería `motion` (ya presente en el proyecto) para dar feedback de celebración:

1. **Confeti dorado** que salta desde las cuatro esquinas de la pantalla al finalizar un libro (sutil pero notable).
2. **Rotación de las estrellas** (360°) al confirmar una valoración con clic.

Se descarta GSAP: `motion` ya está instalado, es declarativo y cubre ambos casos sin añadir dependencias. El confeti se hace con `motion` (partículas como nodos animados, cantidad moderada), no con canvas.

## Decisiones de diseño

- **Librería:** `motion` (v12.40) para ambas animaciones. Una sola librería, consistencia en el proyecto.
- **Alcance del confeti:** es una celebración de "libro terminado". Solo dispara en el camino de finalización (ver Flujo). Guardar progreso de lectura, notas, etc. **no** lanza confeti.
- **Renderizado del confeti:** overlay en portal a `document.body`, independiente del ciclo de vida del modal. El modal se cierra de inmediato y el confeti cae sobre la página, auto-desmontándose al terminar. Reutilizable como `<ConfettiBurst />` para futuros logros.
- **Accesibilidad:** ambas animaciones respetan `prefers-reduced-motion`. Con reduced-motion activo no se lanza confeti y las estrellas no giran (cambio instantáneo).

## Flujo de usuario

### Confeti
1. El usuario está en `UpdateProgressModal` (sea actualizar progreso o el modal de acabado).
2. El confeti dispara cuando:
   - Estado `finished` + pulsar **"Guardar"** y el guardado tiene éxito, **o**
   - Pulsar **"Saltar"** (`onSkip`).
3. El modal se cierra y, en paralelo, el `ConfettiBurst` se monta en un portal a `body` sobre toda la pantalla.
4. Las partículas doradas salen desde las cuatro esquinas hacia el interior, rotan y se desvanecen (~1–1.2 s). Al terminar, el overlay se desmonta solo.
5. Si `prefers-reduced-motion: reduce`, el confeti no se monta.

### Rotación de estrellas
1. En la sección de valoración (`EditableStarRating`), el usuario hace clic en una estrella para confirmar la valoración.
2. Las **5 estrellas giran 360° a la vez** (~0.5 s, easing suave).
3. El hover y el soporte de medias estrellas existentes no se ven afectados.
4. Si `prefers-reduced-motion: reduce`, no hay giro.

## Cambios técnicos

### 1. Nuevo componente `ConfettiBurst`
- Ubicación: `src/components/common/ConfettiBurst.tsx` (+ `ConfettiBurst.scss`).
- Renderiza vía `createPortal` a `document.body` una capa `position: fixed`, full-screen, `pointer-events: none`, alto z-index.
- Genera ~24–36 partículas repartidas entre las cuatro esquinas. Cada partícula es un `motion.div`:
  - `initial`: posición en la esquina, `opacity: 1`, escala/rotación inicial.
  - `animate`: traslación (x/y) hacia el interior + caída, `rotate` aleatorio, `opacity → 0`.
  - `transition`: duración ~1–1.2 s, `delay` aleatorio pequeño para escalonar.
- Colores dorados desde tokens (`--color-accent` y variantes), nunca hardcodeados.
- Props sugeridas: `onComplete?: () => void` para desmontar tras la animación; control de cantidad/duración con valores por defecto.
- Respeta `prefers-reduced-motion` (hook o media query): si está activo, no renderiza nada.

### 2. `UpdateProgressModal.tsx`
- Estado local `showConfetti: boolean` (o un disparador equivalente).
- En `handleSave`, rama `finished`: tras `updateProgress` con éxito, activar el confeti y cerrar.
- En el botón **"Saltar"** (`onSkip`): activar el confeti antes/junto al cierre.
- Como el confeti vive en un portal a `body`, debe montarse de forma que sobreviva al cierre del modal. Opciones a resolver en el plan:
  - Elevar el disparo del confeti al consumidor (p. ej. un contexto/handler global de celebración), **o**
  - Renderizar `<ConfettiBurst />` desde un punto que no se desmonte con el modal.
- No se lanza confeti en las ramas `reading`, `wantToRead`, `didNotFinish`.

### 3. `EditableStarRating.tsx`
- Añadir un contador `spinTrigger` que se incrementa en cada `onChange` (clic de confirmación).
- Cada estrella pasa a ser un `motion.span` que anima `rotate: [0, 360]` cuando cambia `spinTrigger`.
- Giro simultáneo de las 5 estrellas, ~0.5 s, easing suave.
- Mantener intactos `onMouseMove`/`onMouseLeave` (hover) y la lógica de medias estrellas (`fractionFromEvent`).
- Respeta `prefers-reduced-motion`: sin giro.

### 4. Accesibilidad — `prefers-reduced-motion`
- Hook reutilizable (p. ej. `useReducedMotion` de `motion`, que ya lo provee) para detectar la preferencia.
- `ConfettiBurst`: no monta si reduced-motion.
- `EditableStarRating`: desactiva el giro si reduced-motion.

## Casos límite

- **Guardar sin valoración (rating = 0) en finished:** el confeti salta igual (terminar el libro es el motivo de celebración, no la nota).
- **Saltar:** salta confeti aunque no haya valoración ni reseña.
- **Cancelar con X o backdrop:** no es una confirmación de finalización → **no** salta confeti.
- **Guardado falla (catch):** no debe saltar confeti; solo se dispara en el `try`/éxito.
- **Reduced-motion:** sin confeti y sin giro; el resto del flujo (guardar, cerrar) intacto.
- **Doble disparo:** evitar montar varios `ConfettiBurst` solapados si se pulsa repetido (deshabilitar botón mientras `isSubmitting`, ya existente).

## Componentes afectados

| Archivo | Tipo de cambio |
|---|---|
| `src/components/common/ConfettiBurst.tsx` | Nuevo componente de confeti (motion + portal) |
| `src/components/common/ConfettiBurst.scss` | Estilos del overlay y partículas |
| `src/components/shelf/modals/UpdateProgressModal.tsx` | Disparar confeti en finished (Guardar/Saltar) |
| `src/components/common/EditableStarRating.tsx` | Rotación 360° de estrellas al valorar |

## Fuera de alcance

- Sonido o haptics en la celebración.
- Otras animaciones/microinteracciones futuras (se evaluará GSAP solo si aparecen timelines complejos, scroll o morphing de SVG).
- Cambios en la lógica de guardado, rating o reseña.
