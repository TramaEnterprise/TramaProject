# Spec: Rediseño sección landing__library

## Objetivo

Reemplazar la sección `landing__library` de `LandingPage.tsx` (actualmente una imagen estática + texto con pills) por un mockup interactivo hardcodeado que muestra dos componentes reales de la app: el swiper de "Estoy leyendo" y la estantería con tabs de estado.

## Layout

Grid de dos columnas:
- **Izquierda (1fr):** Título de sección + subtítulo (sin pills, se eliminan)
- **Derecha (1.5fr):** UI apilada verticalmente con 28px de gap entre bloques

## Bloque 1 — "Estoy leyendo"

- Label `ESTOY LEYENDO` (uppercase, pequeño, gris) + contador `1 / 3` a la derecha, ambos **fuera y encima** de la card
- Chevrones `‹` `›` **fuera** de la card, flanqueándola izquierda y derecha
- Card blanca con borde y halo naranja sutil (radial gradient blur)
- Contenido de la card: portada (88×132px, ratio 2:3) + título + autor + caja de progreso con barra
- Sin botones de acción (Ver historial / Actualizar progreso)
- Funcional: chevrones navegan entre los 3 libros con `useState`

**Libros hardcodeados:**
| # | Título | Autor | % | Páginas |
|---|--------|-------|---|---------|
| 1 | Calabobos | Luis Mario | 35% | 123 / 352 |
| 2 | El temor de un hombre sabio | Patrick Rothfuss | 62% | 412 / 994 |
| 3 | Yo, robot | Isaac Asimov | 88% | 220 / 250 |

## Bloque 2 — "Estantería"

- Label `ESTANTERÍA` (uppercase, pequeño, gris) **fuera y encima** de la card
- Card blanca con borde y sombra suave
- Tabs en orden: **Quiero leer · Leyendo · Leído · Abandonado** (mismo estilo que `ShelfSection`)
- Tab activo por defecto: Quiero leer
- Grid fijo de **5 columnas de 88px** con `gap: 16px`; cuando hay menos de 5 libros los huecos quedan vacíos (no se estiran)
- Cada libro: portada (88px, ratio 2:3, `object-fit: cover`) + título en una línea (ellipsis)
- Tabs funcionales con `useState`

**Libros hardcodeados por tab:**

| Tab | Libros |
|-----|--------|
| Quiero leer (5) | El señor de los anillos · Trono de cristal · Las gratitudes · Los juegos del hambre · Shogun |
| Leyendo (3) | Calabobos · El temor de un hombre sabio · Yo, robot |
| Leído (4) | Frankenstein · Harry Potter y la piedra filosofal · Juego de tronos · *(pendiente)* |
| Abandonado (2) | *(pendiente × 2)* |

> Los slots pendientes se implementan como placeholders grises hasta que se confirmen los títulos.

## Assets

Las portadas se copian como imágenes estáticas en `src/assets/landing-book-*.jpg/png` y se importan directamente en el componente. Fuente: Figma file `5rQBSCq5g8VHJPUviYWcjM`, nodo `1570:3`.

## Componente

- Nuevo archivo `src/pages/landing/LandingLibraryMockup.tsx` + `LandingLibraryMockup.scss`
- Sin dependencias de contexto (ShelfContext, Firebase, etc.)
- `LandingPage.tsx` reemplaza el bloque `landing__library` por `<LandingLibraryMockup />`
- El SCSS existente de `landing__library` se elimina de `LandingPage.scss`

## Lo que NO cambia

- Hero section (libros flotantes)
- Secciones de hábitos, comunidad y social proof
- Ningún componente real de la app (CurrentReadingCard, ShelfSection)
