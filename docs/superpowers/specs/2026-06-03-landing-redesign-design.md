# Landing Page — Especificación de Rediseño

**Fecha:** 2026-06-03
**Rama:** Develop
**Estado:** Aprobado por la usuaria

---

## Objetivo

Rediseñar la landing page de Trama para mejorar simultáneamente tres problemas del diseño actual:

1. La propuesta de valor no queda clara en los primeros segundos.
2. El diseño se siente genérico — falta personalidad editorial.
3. El flujo narrativo entre secciones no engancha.

---

## Lo que se mantiene sin cambios

- **Navbar** — componente existente, sin tocar.
- **Footer** — componente existente, sin tocar.
- **Imagen hero** (`landing-hero.png`) — se sigue usando como fuente de los libros del fondo.
- **Tokens de diseño** — todos los colores, tipografías y espaciados se leen de `_custom_properties.scss`. No se hardcodean valores nuevos.

---

## Dirección estética

| Atributo | Decisión |
|---|---|
| Paleta | Blanco `#fff`, grises `#f7f7f7` / `#f0f0f0`, negro `#111` / `#1a1714` |
| Acento | `--color-brand-primary` (`#e86b30`) — solo en labels, pills, barras y un badge en el hero |
| Tipografía headings | `--font-editorial` (Libre Baskerville), weight regular, tamaños grandes |
| Tipografía body | `--font-main` (Manrope) |
| Tono | Editorial literario + moderno limpio. Como una revista de libros en papel blanco. |
| Único bloque oscuro | CTA final — fondo `#111`, testimonios + CTA encima |

---

## Estructura de secciones

```
Navbar (se mantiene)
│
├── 1. HERO
│     Fondo blanco. Libros flotando desde ambos bordes laterales
│     fundiéndose con el blanco. Contenido centrado.
│
├── 2. BIBLIOTECA
│     Blanco. Mockup app a la izquierda, texto + pills a la derecha.
│
├── 3. HÁBITOS
│     Gris claro (#f7f7f7). Invertido: texto a la izquierda, panel de stats a la derecha.
│
├── 4. COMUNIDAD
│     Gris claro. Heading centrado + 2 tarjetas de perfil.
│
├── 5. CTA FINAL + TESTIMONIOS
│     Negro (#111). 3 pull quotes encima, luego el CTA grande.
│
Footer (se mantiene)
```

---

## Detalle de cada sección

### Hero

- Fondo: `#fff`
- Los libros de `landing-hero.png` se colocan flotando a izquierda y derecha; en el centro hay un gradiente blanco que los desvanece para que el texto sea legible.
- **Eyebrow badge**: texto `"Tu biblioteca digital"` en `#e86b30`, borde `1px solid` con opacidad, `border-radius: pill`, `font-size: 10px`, `letter-spacing: 3px`, uppercase.
- **Título**: `font-family: --font-editorial`, `font-size: clamp(44px, 6vw, 64px)`, `font-weight: 400`, color `#111`, `line-height: 1.08`. Segunda línea en `font-style: italic`, color `#555`.
  - Texto: `"Tu historia literaria,"` / `"en un solo lugar."`
- **Subtítulo**: `--font-main`, `15px`, color `#888`, `line-height: 1.7`, max-width 360px centrado.
- **CTAs** en columna centrada:
  - Primario: fondo `#111`, texto `#fff`, `border-radius: pill`, `padding: 14px 32px`, `font-weight: 700`.
  - Ghost: solo texto, color `#bbb`, `font-size: 12px`. Texto: `"Explorar sin cuenta →"`.

### Biblioteca

- Fondo: `#fff`
- Layout: flex row, gap 72px, `padding: 80px`.
- **Izquierda**: mockup de la pantalla "Mi Biblioteca" — ventana de app con barra de título, lista de 3 libros con portada, título, autor y pill de estado.
- **Derecha**: label naranja + título serif + subtítulo + fila de pills de estado (Leyendo, Leído, Quiero leer, Abandonado).
- Mockup: `border-radius: 12px`, `box-shadow: var(--shadow-modal)`, `border: 1px solid var(--color-border-card)`.

### Hábitos

- Fondo: `#f7f7f7`, `border-top/bottom: 1px solid #eee`.
- Layout: flex row **invertido** (texto izquierda, stats derecha), gap 72px, `padding: 80px`.
- **Panel de stats**: `border-radius: 16px`, `background: #fff`, `box-shadow: var(--shadow-card)`, `border: 1px solid #efefef`, `padding: 28px`. Contenido:
  - Racha: número grande en serif `48px`, color `#111` (no naranja — más monochrome), label uppercase.
  - Meta anual: texto + barra de progreso fill en `#e86b30`.
  - Géneros: 3 filas con nombre y barra de progreso (brand, success, info).
- **Texto**: label naranja + título serif + subtítulo.

### Comunidad

- Fondo: `#f7f7f7`.
- Heading centrado: label + título serif `34px` + subtítulo.
- 2 tarjetas de perfil en flex row:
  - `background: #fff`, `border: 1px solid var(--color-border-card)`, `border-radius: 14px`, `padding: 22px`.
  - Contenido: avatar inicial + nombre/handle, sección "Leyendo ahora" con portada + barra de progreso, sección "Favoritos" con 5 miniaturas de portada, botón "Seguir" outline negro pill.

### CTA Final + Testimonios

- Fondo: `#111` (único bloque oscuro de la página).
- **Testimonios** arriba: 3 cards en fila.
  - `background: rgba(255,255,255,0.04)`, `border: 1px solid rgba(255,255,255,0.07)`, `border-radius: 14px`, `padding: 24px`.
  - Estrellas en `#e86b30`, texto en serif italic `rgba(255,255,255,0.6)`, autor en `rgba(255,255,255,0.3)`.
- **CTA** debajo, centrado:
  - Título serif `44px` color `#f5f0ea`.
  - Subtítulo `rgba(255,255,255,0.35)`.
  - Botón primario: fondo `#fff`, color `#111`, pill.
  - Ghost: `rgba(255,255,255,0.28)`.

---

## Assets a usar

| Asset | Uso |
|---|---|
| `landing-hero.png` | Libros del hero — izquierda y derecha con fade blanco al centro |
| `landing-library.png` | Mockup de la sección Biblioteca (o ilustración inline) |
| `landing-cover-dune.png` / `landing-cover-1984.png` | Portadas en tarjetas de Comunidad |
| `landing-fav-*.png` (1–10) | Miniaturas de favoritos en tarjetas de Comunidad |

---

## Prompt de Figma Make

Ver sección siguiente — es el prompt completo listo para pegar en Figma Make.

---

## Prompt Figma Make

```
Design the full landing page for "Trama", a book-tracking social app in Spanish. The page is a single-column scroll layout at 1440px wide desktop. Keep the existing navbar and footer unchanged.

---

## VISUAL IDENTITY

Typefaces:
- Headings: Libre Baskerville, weight 400 (regular), italic for emphasis
- Body / UI: Manrope, weights 400–700

Color palette:
- Background (most sections): #ffffff
- Alternating sections: #f7f7f7
- Primary text: #111111
- Secondary text: #777777 / #888888
- Brand accent (sparse use only — labels, pills, progress bars): #e86b30
- CTA section background (only section that is dark): #111111
- Text on dark: #f5f0ea at varying opacity

Aesthetic: Editorial literary + modern clean. Think a book magazine on white paper. High whitespace, large serif headlines, restrained use of the brand orange.

---

## SECTION 1: NAVBAR (keep as-is)

White background, bottom border 1px #ececec, height 64px, horizontal padding 56px.
- Left: logotype "TRAMA" in Libre Baskerville, letter-spacing 4px, uppercase, color #111.
- Right: text links "Explorar" and "Iniciar sesión" in Manrope 13px color #666, then a pill button "Registro" with background #111 and white text, border-radius 9999px, padding 8px 18px.

---

## SECTION 2: HERO

Background: #ffffff. Min-height 560px. Centered layout.

Left side (absolute, 32% width from left edge):
Place an arrangement of book spines in warm brown/copper tones (earth palette: #b8946a, #7a5c3e, #4a3420, #d4a870, #e86b30 at 50% opacity, #9a8060). Books are vertical spines of varying heights (80px–160px) and widths (14px–24px), aligned at the bottom edge, standing upright side by side with small gaps. Fade them into the white background using a gradient overlay that goes from transparent on the far left to full white on the right edge of this zone.

Right side (mirror image): same book spine arrangement, mirrored, fading from transparent on the far right to white on the left edge.

Centered content (z-index above books):
1. Small pill badge: text "Tu biblioteca digital" — Manrope 10px, letter-spacing 3px, uppercase, color #e86b30, border 1px solid rgba(232,107,48,0.4), border-radius 9999px, padding 4px 12px. Bottom margin 24px.
2. Headline H1 in Libre Baskerville 56px weight 400, line-height 1.08, color #111, centered:
   Line 1: "Tu historia literaria,"
   Line 2: "en un solo lugar." — in italic, color #555555
3. Subheading in Manrope 15px, color #888, line-height 1.7, max-width 360px centered, bottom margin 36px:
   "Busca libros, sigue tu progreso, celebra tus metas y conecta con otros lectores."
4. CTA group, centered column with 14px gap:
   - Primary button: background #111, text #fff "Empezar gratis", Manrope 14px bold, border-radius 9999px, padding 14px 32px.
   - Ghost link: text only "Explorar sin cuenta →", Manrope 12px, color #bbbbbb.

---

## SECTION 3: BIBLIOTECA (Tu biblioteca personal)

Background: #ffffff. Padding 80px horizontal, 80px vertical. Flex row, gap 72px, vertically centered.

LEFT — App mockup (width 310px):
A rounded rectangle (border-radius 12px, 1px border #e8e8e8, box-shadow 0 12px 32px rgba(0,0,0,0.08)) simulating a browser or app window:
- Title bar: background #f5f5f5, height 36px, three colored dots (red #f5554a, yellow #fac536, green #26c940) on left, 8px each.
- Content area white, padding 14px:
  - Heading "Mi Biblioteca" Manrope 11px bold #111, letter-spacing 0.3px.
  - 3 book rows, each: book cover thumbnail (28×40px rounded 2px, placeholder warm gradient), book title 10px bold #111, author 9px #aaa, and a status pill on the right:
    Row 1: "Dune" / "Frank Herbert" / pill "Leyendo" (background #fff3ec, color #e86b30, border 1px #e86b30)
    Row 2: "1984" / "George Orwell" / pill "Leído" (background #edf4ee, color #5a7a60, border 1px #5a7a60)
    Row 3: "El Quijote" / "Cervantes" / pill "Quiero leer" (background #f2f2f2, color #888, border 1px #cccccc)

RIGHT — Text block (flex column, gap 16px):
1. Label: "Tu biblioteca" — Manrope 10px, letter-spacing 3px, uppercase, color #e86b30, weight 600.
2. Heading H2: "Tu biblioteca personal, siempre contigo." — Libre Baskerville 34px weight 400, color #111, line-height 1.2.
3. Body text: "Añade libros con un clic a tu propia estantería virtual, mientras llevas la cuenta del progreso de tu lectura actual." — Manrope 14px, color #777, line-height 1.75.
4. Row of 4 status pills (same style as in mockup): "Leyendo", "Leído", "Quiero leer", "Abandonado" (last one: background #fef0f0, color #b83232, border 1px #b83232). Padding 5px 12px, font-size 11px.

---

## SECTION 4: HÁBITOS (Convierte la lectura en un hábito)

Background: #f7f7f7. Border-top and border-bottom 1px solid #eeeeee. Padding 80px. Flex row REVERSED (text on left, stats panel on right), gap 72px, vertically centered.

LEFT — Text block:
1. Label: "Tus hábitos" — same style as section 3 label.
2. Heading H2: "Convierte la lectura en un hábito." — same heading style.
3. Body: "Mantén tu racha diaria, marca tu meta de libros al año y revisa tus estadísticas de lectura." — same body style.

RIGHT — Stats panel (width 290px):
White card: background #fff, border-radius 16px, border 1px solid #efefef, box-shadow 0 12px 32px rgba(0,0,0,0.08), padding 28px. Three blocks separated by 1px #f0f0f0 dividers:

Block 1 — Streak:
- Label: "RACHA ACTUAL" — Manrope 9px, uppercase, letter-spacing 2px, color #bbbbbb, weight 600.
- Number: "14" — Libre Baskerville 48px weight 400, color #111111, line-height 1.
- Sub: "días seguidos leyendo" — Manrope 11px, color #999999.

Block 2 — Annual goal:
- Label: "META 2026"
- Text: "23 / 50 libros leídos" — Manrope 12px, color #333.
- Progress bar: background #f0f0f0, height 5px, border-radius 3px, fill 46% in #e86b30.

Block 3 — Genres:
- Label: "GÉNEROS FAVORITOS"
- Three genre rows each with genre name (Manrope 10px, color #555) and thin progress bar (5px height):
  "Fantasía · 40%" — fill 40% in #e86b30
  "Ciencia ficción · 35%" — fill 35% in #5a7a60
  "Misterio · 25%" — fill 25% in #6b7f9e

---

## SECTION 5: COMUNIDAD (Tu comunidad)

Background: #f7f7f7. Padding 80px. Flex column, centered, gap 44px.

TOP — Centered heading block (max-width 560px centered):
1. Label: "Tu comunidad" — same label style, text-align center.
2. H2: "Descubre qué leen quienes te inspiran." — same heading style, text-align center.
3. Body: "Sigue a otros lectores, ve su actividad reciente y descubre tu próxima lectura." — same body style, centered.

BOTTOM — Two profile cards in a flex row, gap 20px:

Each card: background #fff, border-radius 14px, border 1px solid #e8e8e8, box-shadow 0 4px 16px rgba(0,0,0,0.04), padding 22px, width 292px, flex column gap 16px.

Card 1 — María García:
- User row: avatar circle 38px background #f0f0f0 with initial "M" (Manrope 13px bold, color #666), name "María García" (Manrope 12px bold #111), handle "@maria_lee · 47 seguidores" (Manrope 10px, color #bbbbbb).
- "LEYENDO AHORA" section label (9px uppercase letter-spacing 2px color #cccccc). Book row: cover thumbnail 26×38px warm brown gradient, title "Dune" (11px bold #111), author "Frank Herbert" (10px #aaa), percentage "68%" right-aligned (#cccccc). Progress bar 5px, fill 68% in #e86b30.
- "FAVORITOS" section label. Row of 5 book cover thumbnails 26×38px, border-radius 3px, warm earthy gradient placeholders.
- Follow button: outline only, border 1.5px solid #111, color #111, background transparent, border-radius 9999px, padding 6px 14px, Manrope 11px semibold. Text "Seguir".

Card 2 — Carlos Ruiz (mirror of Card 1 with different data):
- Avatar "C", name "Carlos Ruiz", handle "@carlos_books · 128 seguidores".
- Reading: "1984" / "George Orwell" / 14% progress.
- 5 favorite cover placeholders in dark earthy tones.
- Follow button same style.

---

## SECTION 6: CTA FINAL + TESTIMONIOS

Background: #111111. Padding 80px. Flex column, centered, gap 52px. This is the ONLY dark section on the page.

TOP — Three testimonial cards in a flex row, gap 20px:
Each card: background rgba(255,255,255,0.04), border 1px solid rgba(255,255,255,0.07), border-radius 14px, padding 24px. Flex column gap 12px.
- Stars: "★★★★★" in #e86b30, font-size 11px, letter-spacing 2px.
- Quote in Libre Baskerville 14px italic, color rgba(255,255,255,0.6), line-height 1.65.
- Author attribution in Manrope 10px, color rgba(255,255,255,0.3).

Quotes:
1. "Acogedora y fácil de utilizar, sin rodeos." — Ana M. · @ana_lee
2. "Las metas y las rachas me han hecho volver a leer." — Carlos R. · @carlosreads
3. "La comunidad es muy activa." — Laura P. · @laurabookclub

BOTTOM — CTA block, centered:
- H2: "Empieza tu historia lectora hoy." — Libre Baskerville 44px weight 400, color #f5f0ea, line-height 1.15, max-width 560px, centered.
- Subtitle: "Gratis y sin anuncios. Empieza en menos de un minuto." — Manrope 13px, color rgba(255,255,255,0.35), line-height 1.7.
- CTA buttons (column, centered, gap 12px):
  Primary: background #ffffff, color #111111, padding 13px 28px, border-radius 9999px, Manrope 13px bold. Text: "Crear cuenta gratis".
  Ghost: text only "Explorar sin cuenta →", Manrope 11px, color rgba(255,255,255,0.28).

---

## SECTION 7: FOOTER (keep as-is)

Background #0d0c0b, padding 24px 56px, border-top 1px solid rgba(255,255,255,0.04). Horizontal flex, space-between.
- Left: "TRAMA" in Libre Baskerville 14px, letter-spacing 3px, color rgba(255,255,255,0.4).
- Center: links "Privacidad", "Términos", "Contacto" in Manrope 11px, color rgba(255,255,255,0.25).
- Right: "© 2026 Trama" in Manrope 10px, color rgba(255,255,255,0.2).

---

## GENERAL NOTES

- All section transitions are clean cuts — no drop shadows between sections, only the background color change creates separation. Exception: cards and panels have their own shadows.
- The brand orange (#e86b30) never appears as a dominant background color. It is always an accent: labels, pills, progress bar fills, star ratings, and the hero eyebrow badge.
- Border-radius language: buttons = 9999px (pill), cards = 12–16px, pills/tags = 9999px, progress bars = 3px.
- Spacing scale follows 4px base: most internal padding is multiples of 4 (12, 16, 20, 24, 28, 32px).
- The page should feel like reading a well-designed book review magazine — generous whitespace, confident typography, warm but neutral palette.
```
