# Hero Section Redesign + Navbar CTAs

**Fecha:** 2026-06-03  
**Rama:** `feature/landing-redesign`  
**Alcance:** `HeroSection` nuevo componente + botones login/signup en Navbar cuando no autenticado

---

## Contexto

La landing actual tiene el hero integrado dentro de `LandingPage.tsx` con una imagen de fondo estática (`landing-hero.png`). El rediseño lo reemplaza por una sección con portadas de libros flotantes animadas y un contenido central minimalista, extrayéndolo a su propio componente co-ubicado.

El Navbar actualmente muestra solo un icono de usuario (`<User size={18} />`) como enlace a `/auth` cuando el usuario no está autenticado. Se añaden botones explícitos de "Iniciar sesión" y "Registrarse" en su lugar.

---

## 1. Archivos afectados

| Acción | Archivo |
|---|---|
| Crear | `src/pages/landing/HeroSection.tsx` |
| Crear | `src/pages/landing/HeroSection.scss` |
| Modificar | `src/pages/landing/LandingPage.tsx` |
| Modificar | `src/components/layout/Navbar.tsx` |
| Modificar | `src/components/layout/Navbar.scss` |
| Modificar | `src/plugins/i18n/locales/es/navbar.json` |
| Modificar | `src/plugins/i18n/locales/en/navbar.json` |
| Añadir | 12 imágenes en `src/assets/landing-float-{1..12}.png` |
| Instalar | paquete `motion` (`npm install motion`) |

---

## 2. HeroSection — estructura y comportamiento

### Layout general

- Fondo: `var(--color-bg-page)` (blanco en light, oscuro en dark)
- `min-height: 820px`, `padding-bottom: var(--space-14)`, `overflow: hidden`
- Flex column centrado (horizontal y vertical)
- `position: relative` como contenedor de las capas absolutas

### Capa 1 — Portadas flotantes

12 `<motion.div>` con `position: absolute`, tamaño `110×155px`, `border-radius: var(--radius-sm)`, `box-shadow: var(--shadow-book)`.

Animación de cada portada: `animate={{ y: [0, -14, 0] }}` con `transition={{ repeat: Infinity, ease: "easeInOut", duration: X, delay: Y }}`. Cada libro tiene `duration` entre 4.8 s y 6.5 s y `delay` entre 0 s y 2.2 s distintos para que el movimiento sea orgánico e independiente.

Distribución: 7 libros a la izquierda (posición con `left: X%`) y 6 a la derecha (`right: X%`), escalonados verticalmente con valores `top` entre 60 px y 580 px. Cada portada tiene una ligera rotación entre −1.2° y +1.2°.

Dentro de cada `<motion.div>`: `<img>` con `object-fit: cover`, `width: 100%`, `height: 100%`.

Las imágenes se importan como módulos ES desde rutas relativas (`../../assets/landing-float-N.png`).

### Capa 2 — Overlays de difuminado

Tres `<div>` con `pointer-events: none`:

- **Izquierda:** `position: absolute; left: 0; top: 0; bottom: 0; width: 38%`  
  `background: linear-gradient(to right, var(--color-bg-page) 0%, transparent 100%)`
- **Derecha:** igual pero `right: 0` y `linear-gradient(to left, ...)`
- **Halo central:** `position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); width: 560px; height: 420px`  
  `background: radial-gradient(ellipse at center, var(--color-bg-overlay) 40%, transparent 75%)`

### Capa 3 — Contenido central

`position: relative; z-index: 10`, flex column, alineación centrada, `max-width: 620px`, `padding: 0 var(--space-6)`, `margin-top: -40px`.

**Título `<h1>`**
- `font-family: var(--font-editorial)`
- `font-size: clamp(40px, 4.5vw, 60px)`
- `font-weight: var(--weight-regular)`
- `color: var(--color-text-primary)`
- `line-height: 1.2`
- Dos líneas via i18n: `t("landing.hero.title")` / `t("landing.hero.titleSecond")`

**Subtítulo `<p>`**
- `font-family: var(--font-main)`
- `font-size: var(--text-md)`
- `font-weight: var(--weight-regular)`
- `color: var(--color-text-tertiary)`
- `line-height: 1.65`
- `max-width: 480px`
- Texto: `t("landing.hero.subtitle")`

**Botón primario**
- Clase: `.hero__btn-primary` definida en `HeroSection.scss`, siguiendo el mismo patrón visual que `.landing__btn-primary`
- `background: var(--color-btn-primary-bg)`, `color: var(--color-text-on-brand)`, `border-radius: var(--radius-pill)`, `padding: var(--space-3) var(--space-7)`
- Texto: `t("landing.hero.cta")`
- `onClick`: prop `onRegister`

**Texto ghost**
- `font-family: var(--font-main)`
- `font-size: var(--text-xs)`
- `color: var(--color-text-secondary)`
- `letter-spacing: 0.3px`
- Texto: `t("landing.hero.guest")`
- `onClick`: prop `onGuest`

### Props del componente

```ts
type HeroSectionProps = {
  onRegister: () => void;
  onGuest: () => void;
};
```

La lógica de navegación permanece en `LandingPage.tsx`.

---

## 3. LandingPage — cambio mínimo

Reemplazar el bloque `<section className="landing__hero">…</section>` (líneas 48–65) por:

```tsx
<HeroSection onRegister={handleRegister} onGuest={handleGuest} />
```

Eliminar el import de `heroImg` (`import heroImg from "@/assets/landing-hero.png"`) que queda huérfano. Ninguna otra sección ni import se toca.

---

## 4. Navbar — botones login/signup

### Comportamiento

Cuando `!isAuthenticated`, reemplazar el `<NavLink to="/auth">` con icono de usuario por dos botones de texto en línea:

- **"Iniciar sesión"** → `navigate("/auth")` (sin `state`)
- **"Registrarse"** → `navigate("/auth", { state: { tab: "register" } })`

Cuando `isAuthenticated`, el Navbar no cambia (sigue con icono de usuario + menú de perfil).

### Estilos (BEM dentro de `Navbar.scss`)

Dos nuevos modificadores en `.navbar__auth-btns` (wrapper flex con `gap: var(--space-2)`):

- `.navbar__btn-login` — botón ghost: sin fondo, `color: var(--color-text-primary)`, `font-size: var(--text-sm)`, `border-radius: var(--radius-pill)`, `padding: var(--space-2) var(--space-4)`.
- `.navbar__btn-signup` — botón sólido: `background: var(--color-btn-primary-bg)`, `color: var(--color-text-on-brand)`, misma tipografía y `border-radius`.

### i18n — claves nuevas

Añadir en `es/navbar.json` y `en/navbar.json`:

```json
"loginShort": "Iniciar sesión",   // ES
"signupShort": "Registrarse"      // ES

"loginShort": "Log in",           // EN
"signupShort": "Sign up"          // EN
```

---

## 5. Imágenes

13 portadas disponibles desde Figma MCP. Se usan 12 (se descarta una). Se descargan y guardan como `src/assets/landing-float-{1..12}.png`.

Origen: URLs temporales (7 días) obtenidas via Figma MCP del nodo `1524:892` del archivo `5rQBSCq5g8VHJPUviYWcjM`.

---

## 6. Dependencias

- `motion` package — instalar con `npm install motion`. Import: `import { motion } from "motion/react"`.
- No se instala ninguna otra dependencia nueva.

---

## 7. i18n — revisión de textos del hero

Actualizar `landing.hero.subtitle` en ES para alinear con el copy del spec de Figma Make:

- Actual ES: `"Busca libros, sigue tu progreso, celebra tus metas y conecta con otros lectores."`
- Nuevo ES: `"Descubre libros, sigue tu progreso, celebra tus metas y conecta con otros lectores."`
- EN no cambia.

---

## 8. Fuera de alcance

- El resto de secciones de `LandingPage` (biblioteca, hábitos, comunidad, CTA final) no se tocan.
- No se añaden tests (el proyecto no tiene suite de tests configurada).
- Modo oscuro: los tokens CSS custom properties ya cubren automáticamente el dark theme via `[data-theme="dark"]`.
