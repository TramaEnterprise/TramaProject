# Hero Section Redesign + Navbar CTAs — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reemplazar el hero estático de la landing por un HeroSection con portadas flotantes animadas, y añadir botones de login/signup en el Navbar para usuarios no autenticados.

**Architecture:** Nuevo componente co-ubicado `src/pages/landing/HeroSection.tsx` con SCSS BEM propio. LandingPage delega el renderizado del hero a ese componente pasando callbacks de navegación. El Navbar muestra condicionalmente dos botones de texto ("Iniciar sesión" / "Registrarse") cuando `!isAuthenticated`, reemplazando el icono de usuario actual.

**Tech Stack:** React 19, TypeScript, SCSS/BEM, CSS custom properties, `motion` (paquete `motion`, import desde `"motion/react"`), i18next.

**Spec:** `docs/superpowers/specs/2026-06-03-hero-section-redesign-design.md`

---

## Archivos afectados

| Acción | Archivo |
|---|---|
| Instalar | paquete `motion` |
| Descargar (13) | `src/assets/landing-float-{1..13}.png` |
| Crear | `src/pages/landing/HeroSection.tsx` |
| Crear | `src/pages/landing/HeroSection.scss` |
| Modificar | `src/pages/landing/LandingPage.tsx` |
| Modificar | `src/components/layout/Navbar.tsx` |
| Modificar | `src/components/layout/Navbar.scss` |
| Modificar | `src/plugins/i18n/locales/es/navbar.json` |
| Modificar | `src/plugins/i18n/locales/en/navbar.json` |
| Modificar | `src/plugins/i18n/locales/es/landing.json` |

---

## Task 1: Instalar motion y descargar imágenes

**Files:**
- Modify: `package.json` (npm install)
- Create: `src/assets/landing-float-1.png` … `landing-float-13.png`

- [ ] **Step 1: Instalar el paquete motion**

```bash
cd /Users/taniacanto/Documents/GitHub/TramaProject
npm install motion
```

Resultado esperado: `motion` aparece en `dependencies` en `package.json`.

- [ ] **Step 2: Descargar las 13 portadas desde Figma**

```bash
cd /Users/taniacanto/Documents/GitHub/TramaProject/src/assets

curl -L "https://www.figma.com/api/mcp/asset/91d7ec97-9eac-46d1-9e81-1d3728b9615e" -o landing-float-1.png
curl -L "https://www.figma.com/api/mcp/asset/362c42cc-8e0d-4f07-9ce8-46566ca8387d" -o landing-float-2.png
curl -L "https://www.figma.com/api/mcp/asset/089a52bf-9e83-4d41-8a6c-f73fe57287f0" -o landing-float-3.png
curl -L "https://www.figma.com/api/mcp/asset/c5870548-1720-411e-93b3-a2f7ef35c057" -o landing-float-4.png
curl -L "https://www.figma.com/api/mcp/asset/097323b9-8a5c-4360-a60a-9a035772a27f" -o landing-float-5.png
curl -L "https://www.figma.com/api/mcp/asset/de1bfbad-714e-4218-93b7-1d01b74782b6" -o landing-float-6.png
curl -L "https://www.figma.com/api/mcp/asset/4fc7edd2-e046-4531-bc06-dcc1f0f3dd9c" -o landing-float-7.png
curl -L "https://www.figma.com/api/mcp/asset/d51a13fd-5ad1-42ee-b1d6-59f0bacfc66b" -o landing-float-8.png
curl -L "https://www.figma.com/api/mcp/asset/89c4144d-3efb-4aae-b2fa-692009174ea0" -o landing-float-9.png
curl -L "https://www.figma.com/api/mcp/asset/842a658a-72f2-4c43-a4e1-99e0560a1be8" -o landing-float-10.png
curl -L "https://www.figma.com/api/mcp/asset/0966fa1e-4811-40f0-8088-b971b4b4c5c4" -o landing-float-11.png
curl -L "https://www.figma.com/api/mcp/asset/13cb93ec-b119-465c-a218-ed8633b40554" -o landing-float-12.png
curl -L "https://www.figma.com/api/mcp/asset/52c75440-cb5c-447d-995a-92df4ff1757f" -o landing-float-13.png
```

- [ ] **Step 3: Verificar las descargas**

```bash
ls -lh /Users/taniacanto/Documents/GitHub/TramaProject/src/assets/landing-float-*.png
```

Resultado esperado: 13 archivos PNG con tamaño > 0 bytes.

- [ ] **Step 4: Commit**

```bash
cd /Users/taniacanto/Documents/GitHub/TramaProject
git add package.json package-lock.json src/assets/landing-float-*.png
git commit -m "feat: instalar motion y añadir portadas flotantes"
```

---

## Task 2: Actualizar i18n

**Files:**
- Modify: `src/plugins/i18n/locales/es/navbar.json`
- Modify: `src/plugins/i18n/locales/en/navbar.json`
- Modify: `src/plugins/i18n/locales/es/landing.json`

- [ ] **Step 1: Añadir claves navbar en español**

En `src/plugins/i18n/locales/es/navbar.json`, añadir dentro del objeto `"navbar"`:

```json
{
  "navbar": {
    "brandName": "Trama",
    "register": "Registrar lectura",
    "login": "Iniciar Sesión",
    "loginShort": "Iniciar sesión",
    "signupShort": "Registrarse",
    "logout": "Cerrar Sesión",
    "notifications": "Notificaciones",
    "profile": "Perfil",
    "search": "Busca por título, autor o ISBN"
  },
  "nav": {
    "myLibrary": "Mi Biblioteca",
    "explore": "Explorar",
    "community": "Comunidad"
  }
}
```

- [ ] **Step 2: Añadir claves navbar en inglés**

En `src/plugins/i18n/locales/en/navbar.json`:

```json
{
  "navbar": {
    "brandName": "Trama",
    "register": "Log reading",
    "login": "Sign In",
    "loginShort": "Log in",
    "signupShort": "Sign up",
    "logout": "Sign Out",
    "notifications": "Notifications",
    "profile": "Profile",
    "search": "Search by title, author or ISBN"
  },
  "nav": {
    "myLibrary": "My Library",
    "explore": "Explore",
    "community": "Community"
  }
}
```

- [ ] **Step 3: Actualizar subtitle del hero en español**

En `src/plugins/i18n/locales/es/landing.json`, cambiar la línea `"subtitle"` dentro de `"hero"`:

Antes:
```json
"subtitle": "Busca libros, sigue tu progreso, celebra tus metas y conecta con otros lectores.",
```

Después:
```json
"subtitle": "Descubre libros, sigue tu progreso, celebra tus metas y conecta con otros lectores.",
```

- [ ] **Step 4: Verificar build sin errores de tipo**

```bash
cd /Users/taniacanto/Documents/GitHub/TramaProject
npm run build 2>&1 | tail -20
```

Resultado esperado: sin errores de TypeScript.

- [ ] **Step 5: Commit**

```bash
git add src/plugins/i18n/
git commit -m "feat: añadir claves i18n para auth buttons en navbar"
```

---

## Task 3: Crear HeroSection

**Files:**
- Create: `src/pages/landing/HeroSection.tsx`
- Create: `src/pages/landing/HeroSection.scss`

- [ ] **Step 1: Crear HeroSection.tsx**

Crear `src/pages/landing/HeroSection.tsx` con el siguiente contenido completo:

```tsx
import { motion } from "motion/react";
import { useTranslation } from "react-i18next";
import "./HeroSection.scss";

import book1 from "@/assets/landing-float-1.png";
import book2 from "@/assets/landing-float-2.png";
import book3 from "@/assets/landing-float-3.png";
import book4 from "@/assets/landing-float-4.png";
import book5 from "@/assets/landing-float-5.png";
import book6 from "@/assets/landing-float-6.png";
import book7 from "@/assets/landing-float-7.png";
import book8 from "@/assets/landing-float-8.png";
import book9 from "@/assets/landing-float-9.png";
import book10 from "@/assets/landing-float-10.png";
import book11 from "@/assets/landing-float-11.png";
import book12 from "@/assets/landing-float-12.png";
import book13 from "@/assets/landing-float-13.png";

type BookConfig = {
  src: string;
  pos: { left?: string; right?: string; top: number };
  rotate: number;
  duration: number;
  delay: number;
};

const LEFT_BOOKS: BookConfig[] = [
  { src: book1,  pos: { left: "9%",   top: 65  }, rotate: -1,   duration: 5.2, delay: 0   },
  { src: book2,  pos: { left: "5.5%", top: 280 }, rotate:  1,   duration: 6.5, delay: 1.1 },
  { src: book3,  pos: { left: "21%",  top: 160 }, rotate: -0.5, duration: 4.8, delay: 0.6 },
  { src: book4,  pos: { left: "23%",  top: 390 }, rotate:  1.2, duration: 5.8, delay: 1.8 },
  { src: book5,  pos: { left: "11%",  top: 492 }, rotate: -0.8, duration: 6.1, delay: 0.3 },
  { src: book6,  pos: { left: "25%",  top: 572 }, rotate:  0.6, duration: 5.4, delay: 2.2 },
  { src: book7,  pos: { left: "13%",  top: 330 }, rotate:  0.4, duration: 5.9, delay: 1.6 },
];

const RIGHT_BOOKS: BookConfig[] = [
  { src: book8,  pos: { right: "5%",   top: 60  }, rotate:  1,   duration: 5.6, delay: 0.9 },
  { src: book9,  pos: { right: "3.5%", top: 305 }, rotate: -1,   duration: 4.9, delay: 0.4 },
  { src: book10, pos: { right: "17%",  top: 198 }, rotate:  0.5, duration: 6.3, delay: 1.5 },
  { src: book11, pos: { right: "27%",  top: 380 }, rotate: -1.2, duration: 5.1, delay: 2.0 },
  { src: book12, pos: { right: "15%",  top: 470 }, rotate:  0.8, duration: 5.7, delay: 0.7 },
  { src: book13, pos: { right: "28%",  top: 570 }, rotate: -0.6, duration: 6.0, delay: 1.3 },
];

type Props = {
  onRegister: () => void;
  onGuest: () => void;
};

export default function HeroSection({ onRegister, onGuest }: Props) {
  const { t } = useTranslation();

  const renderBook = (book: BookConfig, key: number) => (
    <motion.div
      key={key}
      className="hero__book"
      style={{
        position: "absolute",
        ...book.pos,
        rotate: book.rotate,
      }}
      animate={{ y: [0, -14, 0] }}
      transition={{
        repeat: Infinity,
        ease: "easeInOut",
        duration: book.duration,
        delay: book.delay,
      }}
    >
      <img src={book.src} alt="" aria-hidden="true" />
    </motion.div>
  );

  return (
    <section className="hero">
      {LEFT_BOOKS.map((book, i) => renderBook(book, i))}
      {RIGHT_BOOKS.map((book, i) => renderBook(book, LEFT_BOOKS.length + i))}

      <div className="hero__overlay hero__overlay--left" aria-hidden="true" />
      <div className="hero__overlay hero__overlay--right" aria-hidden="true" />
      <div className="hero__overlay hero__overlay--halo" aria-hidden="true" />

      <div className="hero__content">
        <h1 className="hero__title">
          <span>{t("landing.hero.title")}</span>
          <span>{t("landing.hero.titleSecond")}</span>
        </h1>
        <p className="hero__subtitle">{t("landing.hero.subtitle")}</p>
        <div className="hero__cta">
          <button type="button" className="hero__btn-primary" onClick={onRegister}>
            {t("landing.hero.cta")}
          </button>
          <button type="button" className="hero__btn-ghost" onClick={onGuest}>
            {t("landing.hero.guest")}
          </button>
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Crear HeroSection.scss**

Crear `src/pages/landing/HeroSection.scss` con el siguiente contenido:

```scss
@use "@/styles/lib/mixins" as *;

.hero {
  position: relative;
  background: var(--color-bg-page);
  min-height: 820px;
  padding-bottom: var(--space-14);
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;

  &__book {
    width: 110px;
    height: 155px;
    border-radius: var(--radius-sm);
    overflow: hidden;
    box-shadow: var(--shadow-book);

    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
      pointer-events: none;
    }
  }

  &__overlay {
    position: absolute;
    pointer-events: none;

    &--left {
      top: 0;
      bottom: 0;
      left: 0;
      width: 38%;
      z-index: 5;
      background: linear-gradient(
        to right,
        var(--color-bg-page) 0%,
        transparent 100%
      );
    }

    &--right {
      top: 0;
      bottom: 0;
      right: 0;
      width: 38%;
      z-index: 5;
      background: linear-gradient(
        to left,
        var(--color-bg-page) 0%,
        transparent 100%
      );
    }

    &--halo {
      left: 50%;
      top: 50%;
      transform: translate(-50%, -50%);
      width: 560px;
      height: 420px;
      z-index: 6;
      background: radial-gradient(
        ellipse at center,
        var(--color-bg-overlay) 40%,
        transparent 75%
      );
    }
  }

  &__content {
    position: relative;
    z-index: 10;
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    max-width: 620px;
    padding: 0 var(--space-6);
    margin-top: -40px;
    gap: var(--space-5);
  }

  &__title {
    font-family: var(--font-editorial);
    font-size: clamp(40px, 4.5vw, 60px);
    font-weight: var(--weight-regular);
    color: var(--color-text-primary);
    line-height: 1.2;
    margin: 0;

    span {
      display: block;
    }
  }

  &__subtitle {
    font-family: var(--font-main);
    font-size: var(--text-md);
    font-weight: var(--weight-regular);
    color: var(--color-text-tertiary);
    line-height: 1.65;
    max-width: 480px;
    margin: 0;
  }

  &__cta {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-3);
  }

  &__btn-primary {
    background: var(--color-btn-primary-bg);
    color: var(--color-text-on-brand);
    border: none;
    border-radius: var(--radius-pill);
    padding: var(--space-3) var(--space-7);
    font-family: var(--font-main);
    font-size: var(--text-md);
    font-weight: var(--weight-regular);
    cursor: pointer;
    transition: background var(--transition-fast);

    &:hover {
      background: var(--color-btn-primary-hover);
    }
  }

  &__btn-ghost {
    background: transparent;
    border: none;
    cursor: pointer;
    font-family: var(--font-main);
    font-size: var(--text-xs);
    font-weight: var(--weight-regular);
    color: var(--color-text-secondary);
    letter-spacing: 0.3px;
    padding: 0;
    transition: color var(--transition-fast);

    &:hover {
      color: var(--color-text-primary);
    }
  }
}
```

- [ ] **Step 3: Verificar build sin errores**

```bash
cd /Users/taniacanto/Documents/GitHub/TramaProject
npm run build 2>&1 | tail -20
```

Resultado esperado: sin errores de TypeScript ni de importación.

- [ ] **Step 4: Commit**

```bash
git add src/pages/landing/HeroSection.tsx src/pages/landing/HeroSection.scss
git commit -m "feat: crear componente HeroSection con portadas flotantes animadas"
```

---

## Task 4: Integrar HeroSection en LandingPage

**Files:**
- Modify: `src/pages/landing/LandingPage.tsx`

- [ ] **Step 1: Actualizar LandingPage.tsx**

En `src/pages/landing/LandingPage.tsx`, hacer los siguientes cambios:

**a) Eliminar la línea 7** (import huérfano de heroImg):
```tsx
// ELIMINAR esta línea:
import heroImg from "@/assets/landing-hero.png";
```

**b) Añadir el import de HeroSection** justo después del import de `"./LandingPage.scss"` (línea 5):
```tsx
import HeroSection from "./HeroSection";
```

**c) Reemplazar el bloque hero** (líneas 48–65). Cambiar esto:
```tsx
      {/* ── Hero ─────────────────────────────────────────── */}
      <section className="landing__hero">
        <img className="landing__hero-bg" src={heroImg} alt="Hero" aria-hidden="true" />
        <div className="landing__hero-left">
          <h1 className="landing__hero-title">
            <span>{t("landing.hero.title")}</span>
            <span>{t("landing.hero.titleSecond")}</span>
          </h1>
          <p className="landing__hero-subtitle">{t("landing.hero.subtitle")}</p>
          <div className="landing__hero-cta">
            <button type="button" className="landing__btn-primary" onClick={handleRegister}>
              {t("landing.hero.cta")}
            </button>
            <button type="button" className="landing__btn-ghost" onClick={handleGuest}>
              {t("landing.hero.guest")}
            </button>
          </div>
        </div>
      </section>
```

Por esto:
```tsx
      {/* ── Hero ─────────────────────────────────────────── */}
      <HeroSection onRegister={handleRegister} onGuest={handleGuest} />
```

- [ ] **Step 2: Verificar build sin errores**

```bash
cd /Users/taniacanto/Documents/GitHub/TramaProject
npm run build 2>&1 | tail -20
```

Resultado esperado: sin errores de TypeScript. Sin warnings de importaciones no usadas.

- [ ] **Step 3: Verificar visualmente en dev**

```bash
npm run dev
```

Abrir `http://localhost:5173` (o el puerto que muestre el terminal) y confirmar:
- Las portadas de libros aparecen flotando a ambos lados
- El texto central "Tu historia literaria, / en un solo lugar" se ve correctamente
- Los botones CTA funcionan (navegan a `/auth`)
- El animation de flotado es suave y continuo

- [ ] **Step 4: Commit**

```bash
git add src/pages/landing/LandingPage.tsx
git commit -m "feat: integrar HeroSection en LandingPage"
```

---

## Task 5: Añadir botones auth en Navbar

**Files:**
- Modify: `src/components/layout/Navbar.tsx`
- Modify: `src/components/layout/Navbar.scss`

- [ ] **Step 1: Actualizar Navbar.tsx**

En `src/components/layout/Navbar.tsx`, localizar el bloque `<div className="navbar__avatar-wrap">` (líneas 180–198) y reemplazarlo por:

```tsx
        <div className="navbar__avatar-wrap">
          {isAuthenticated ? (
            <>
              <button
                className="navbar__btn-icon navbar__btn-icon--avatar"
                type="button"
                aria-label={t("navbar.profile")}
                aria-haspopup="true"
                aria-expanded={menuOpen && !hidden}
                onClick={() => setMenuOpen(o => !o)}
              >
                <User size={18} />
              </button>
              {menuOpen && !hidden && <ProfileMenu onClose={() => setMenuOpen(false)} />}
            </>
          ) : (
            <div className="navbar__auth-btns">
              <button
                type="button"
                className="navbar__btn-login"
                onClick={() => navigate("/auth")}
              >
                {t("navbar.loginShort")}
              </button>
              <button
                type="button"
                className="navbar__btn-signup"
                onClick={() => navigate("/auth", { state: { tab: "register" } })}
              >
                {t("navbar.signupShort")}
              </button>
            </div>
          )}
        </div>
```

Nota: el `<ProfileMenu>` se mueve dentro del bloque autenticado para que solo se renderice cuando corresponde.

- [ ] **Step 2: Añadir estilos en Navbar.scss**

En `src/components/layout/Navbar.scss`, añadir los siguientes bloques **dentro del bloque `.navbar {`**, justo después del cierre de `&__btn-icon` (después de la línea con `&--avatar`):

```scss
  &__auth-btns {
    display: flex;
    align-items: center;
    gap: var(--space-2);
  }

  &__btn-login {
    background: transparent;
    border: none;
    cursor: pointer;
    font-family: var(--font-main);
    font-size: var(--text-sm);
    font-weight: var(--weight-regular);
    color: var(--color-text-primary);
    border-radius: var(--radius-pill);
    padding: var(--space-2) var(--space-4);
    transition: background var(--transition-fast);

    &:hover {
      background: var(--color-neutral-alpha-subtle);
    }
  }

  &__btn-signup {
    background: var(--color-btn-primary-bg);
    color: var(--color-text-on-brand);
    border: none;
    cursor: pointer;
    font-family: var(--font-main);
    font-size: var(--text-sm);
    font-weight: var(--weight-regular);
    border-radius: var(--radius-pill);
    padding: var(--space-2) var(--space-4);
    transition: background var(--transition-fast);

    &:hover {
      background: var(--color-btn-primary-hover);
    }
  }
```

- [ ] **Step 3: Verificar build sin errores**

```bash
cd /Users/taniacanto/Documents/GitHub/TramaProject
npm run build 2>&1 | tail -20
```

Resultado esperado: sin errores de TypeScript.

- [ ] **Step 4: Verificar visualmente en dev**

```bash
npm run dev
```

Confirmar en el navegador:
- Sin sesión iniciada: el navbar muestra "Iniciar sesión" (ghost) + "Registrarse" (sólido negro) en la esquina derecha
- "Iniciar sesión" navega a `/auth` sin preseleccionar pestaña
- "Registrarse" navega a `/auth` con la pestaña de registro activa
- Con sesión iniciada: el navbar muestra el icono de usuario como siempre (sin cambios)
- Modo oscuro: los botones respetan los tokens de dark theme

- [ ] **Step 5: Commit**

```bash
git add src/components/layout/Navbar.tsx src/components/layout/Navbar.scss
git commit -m "feat: añadir botones login/signup en navbar para usuarios no autenticados"
```

---

## Self-review

**Cobertura del spec:**
- ✅ HeroSection co-ubicado en `src/pages/landing/`
- ✅ 13 portadas flotantes (7 izq + 6 der) con `motion` animations
- ✅ Overlays de difuminado (izquierda, derecha, halo central)
- ✅ Contenido central con fuentes, colores y estructura del spec
- ✅ Props `onRegister` / `onGuest` desde LandingPage
- ✅ SCSS/BEM con CSS custom properties
- ✅ LandingPage: reemplaza sección hero, elimina import huérfano
- ✅ Navbar: botones auth cuando `!isAuthenticated`
- ✅ i18n ES+EN para navbar y actualización del subtitle del hero
- ✅ Paquete `motion` instalado

**Sin placeholders ni ambigüedades:** Todos los steps incluyen código completo.

**Consistencia de tipos:** `BookConfig.pos` define `left?/right?/top` como strings/numbers compatibles con estilos inline de React. `Props` de `HeroSection` coincide con los callbacks pasados desde `LandingPage`.
