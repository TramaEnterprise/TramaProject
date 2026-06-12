# Landing Library Section Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the static `landing__library` section with an interactive hardcoded mockup showing the "Estoy leyendo" swiper and the shelf with status tabs.

**Architecture:** Self-contained `LandingLibraryMockup` component with `useState` for swiper index and active tab. No context or Firebase dependencies. Book covers are static image assets imported at build time.

**Tech Stack:** React 19, TypeScript, SCSS (BEM), Vite, lucide-react, react-i18next

---

## File Map

| Action | File | Purpose |
|--------|------|---------|
| Create | `src/assets/landing-book-calabobos.jpg` | Cover image |
| Create | `src/assets/landing-book-temor.jpg` | Cover image |
| Create | `src/assets/landing-book-yorobot.jpg` | Cover image |
| Create | `src/assets/landing-book-senor.jpg` | Cover image |
| Create | `src/assets/landing-book-trono.jpg` | Cover image |
| Create | `src/assets/landing-book-gratitudes.jpg` | Cover image |
| Create | `src/assets/landing-book-hambre.jpg` | Cover image |
| Create | `src/assets/landing-book-shogun.png` | Cover image |
| Create | `src/assets/landing-book-frankenstein.jpg` | Cover image |
| Create | `src/assets/landing-book-harrypotter.jpg` | Cover image |
| Create | `src/assets/landing-book-juegotronos.jpg` | Cover image |
| Create | `src/pages/landing/LandingLibraryMockup.tsx` | New component |
| Create | `src/pages/landing/LandingLibraryMockup.scss` | Component styles |
| Modify | `src/plugins/i18n/locales/es/landing.json` | Add readingLabel, shelfLabel |
| Modify | `src/plugins/i18n/locales/en/landing.json` | Add readingLabel, shelfLabel |
| Modify | `src/pages/landing/LandingPage.tsx` | Swap library section, remove unused imports |
| Modify | `src/pages/landing/LandingPage.scss` | Remove `&__library` and `&__pills` blocks |

---

### Task 1: Copy cover images to src/assets

**Files:**
- Create: `src/assets/landing-book-calabobos.jpg` (and 10 more)

- [ ] **Step 1: Copy the 11 cover images**

```bash
cp /tmp/figma-covers/c13.jpg src/assets/landing-book-calabobos.jpg
cp /tmp/figma-covers/c08.jpg src/assets/landing-book-temor.jpg
cp /tmp/figma-covers/c15.jpg src/assets/landing-book-yorobot.jpg
cp /tmp/figma-covers/c11.jpg src/assets/landing-book-senor.jpg
cp /tmp/figma-covers/c02.jpg src/assets/landing-book-trono.jpg
cp /tmp/figma-covers/c16.jpg src/assets/landing-book-gratitudes.jpg
cp /tmp/figma-covers/c04.jpg src/assets/landing-book-hambre.jpg
cp /tmp/figma-covers/c17.png src/assets/landing-book-shogun.png
cp /tmp/figma-covers/c09.jpg src/assets/landing-book-frankenstein.jpg
cp /tmp/figma-covers/c14.jpg src/assets/landing-book-harrypotter.jpg
cp /tmp/figma-covers/c20.jpg src/assets/landing-book-juegotronos.jpg
```

- [ ] **Step 2: Verify files exist**

```bash
ls src/assets/landing-book-*.{jpg,png}
```

Expected: 11 files listed.

---

### Task 2: Add i18n keys

**Files:**
- Modify: `src/plugins/i18n/locales/es/landing.json`
- Modify: `src/plugins/i18n/locales/en/landing.json`

- [ ] **Step 1: Add keys to Spanish file**

In `src/plugins/i18n/locales/es/landing.json`, inside the `"library"` object, add after `"subtitle"`:

```json
"readingLabel": "Estoy leyendo",
"shelfLabel": "Estantería"
```

The `library` block should look like:

```json
"library": {
  "title": "Tu biblioteca personal, siempre contigo.",
  "subtitle": "Añade libros con un clic a tu propia estantería virtual, mientras llevas la cuenta del progreso de tu lectura actual.",
  "readingLabel": "Estoy leyendo",
  "shelfLabel": "Estantería",
  "pill": {
    "reading": "Leyendo",
    "read": "Leído",
    "want": "Quiero Leer",
    "abandoned": "Abandonado"
  }
}
```

- [ ] **Step 2: Add keys to English file**

In `src/plugins/i18n/locales/en/landing.json`, inside the `"library"` object:

```json
"library": {
  "title": "Your personal library, always with you.",
  "subtitle": "Add books with one click to your own virtual shelf, while keeping track of your reading progress.",
  "readingLabel": "Now reading",
  "shelfLabel": "Shelf",
  "pill": {
    "reading": "Reading",
    "read": "Read",
    "want": "Want to Read",
    "abandoned": "Abandoned"
  }
}
```

---

### Task 3: Create LandingLibraryMockup.scss

**Files:**
- Create: `src/pages/landing/LandingLibraryMockup.scss`

- [ ] **Step 1: Create the file with all styles**

```scss
@use "../../styles/lib" as *;

@keyframes lib-sheen {
  0%   { transform: translateX(-100%); }
  100% { transform: translateX(200%); }
}

.landing-library {
  display: grid;
  grid-template-columns: 1fr 1.5fr;
  gap: var(--space-14);
  align-items: center;
  padding: var(--space-24) 80px;
  background: var(--color-bg-page);
  width: 100%;
  box-sizing: border-box;

  // ── Texto ──────────────────────────────────────────────
  &__text {
    display: flex;
    flex-direction: column;
    gap: var(--space-6);
  }

  // ── UI (columna derecha) ────────────────────────────────
  &__ui {
    display: flex;
    flex-direction: column;
    gap: var(--space-7);
  }

  // ── Cabecera de bloque (label + contador) ───────────────
  &__block-header {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    margin-bottom: var(--space-3);
  }

  &__block-label {
    font-size: var(--text-xs);
    font-weight: var(--weight-semibold);
    color: var(--color-text-tertiary);
    letter-spacing: 0.07em;
    text-transform: uppercase;
  }

  &__block-count {
    font-size: var(--text-xs);
    font-weight: var(--weight-semibold);
    color: var(--color-text-tertiary);
  }

  // ── Stage del swiper (chevrones fuera de la card) ───────
  &__swiper-stage {
    display: flex;
    align-items: center;
    gap: var(--space-3);
  }

  &__chev {
    flex-shrink: 0;
    width: 32px;
    height: 32px;
    border-radius: var(--radius-pill);
    border: 1.5px solid var(--color-border-medium);
    background: var(--color-bg-page);
    color: var(--color-text-primary);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: border-color var(--transition-fast);

    &:hover:not(:disabled) {
      border-color: var(--color-text-primary);
    }

    &:disabled {
      opacity: 0.35;
      cursor: default;
    }

    svg { display: block; }
  }

  // ── Card "Estoy leyendo" ────────────────────────────────
  &__reading-card {
    flex: 1;
    min-width: 0;
    display: flex;
    gap: var(--space-5);
    align-items: center;
    padding: var(--space-4) var(--space-5);
    background: var(--color-bg-page);
    border: 1px solid var(--color-border-outline);
    border-radius: var(--radius-xl);
    position: relative;

    &::before {
      content: "";
      position: absolute;
      inset: -1px;
      border-radius: var(--radius-xl);
      background: radial-gradient(
        ellipse at center,
        rgba(255, 205, 158, 0.55) 0%,
        rgba(248, 178, 120, 0.18) 50%,
        transparent 80%
      );
      filter: blur(20px);
      z-index: -1;
      pointer-events: none;
    }
  }

  // ── Portada (compartida: swiper y estantería) ───────────
  &__cover {
    flex-shrink: 0;
    width: 88px;
    aspect-ratio: 2 / 3;
    border-radius: var(--radius-sm);
    object-fit: cover;
    box-shadow: var(--shadow-cover);

    &--placeholder {
      background: var(--color-neutral-alpha-muted);
      box-shadow: none;
    }
  }

  // ── Cuerpo de la card ───────────────────────────────────
  &__reading-body {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }

  &__reading-title {
    font-family: var(--font-editorial);
    font-size: var(--text-lg);
    font-weight: var(--weight-semibold);
    color: var(--color-text-primary);
    margin: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  &__reading-author {
    font-size: var(--text-sm);
    color: var(--color-text-secondary);
    margin: var(--space-1) 0 0;
  }

  &__progress-box {
    border: 1.5px solid var(--color-border-outline);
    border-radius: var(--radius-md);
    padding: var(--space-3) var(--space-4);
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  &__progress-labels {
    display: flex;
    justify-content: space-between;
    font-size: var(--text-xs);
    font-weight: var(--weight-medium);
    color: var(--color-text-secondary);
  }

  &__progress-pct {
    font-weight: var(--weight-semibold);
    color: var(--color-text-secondary);
  }

  &__progress-bar {
    height: 12px;
    border-radius: var(--radius-pill);
    background: rgba(255, 255, 255, 0.3);
    border: 1.5px solid var(--color-border-outline);
    overflow: hidden;
  }

  &__progress-fill {
    height: 100%;
    border-radius: var(--radius-pill);
    background: linear-gradient(
      90deg,
      #ffbc9c 0%,
      #f7a178 28%,
      #f08755 60%,
      var(--color-brand-primary) 100%
    );
    transition: width 500ms ease-out;
    position: relative;
    overflow: hidden;

    &::after {
      content: "";
      position: absolute;
      inset: 0;
      background: linear-gradient(
        90deg,
        transparent 0%,
        rgba(255, 255, 255, 0.22) 50%,
        transparent 100%
      );
      transform: translateX(-100%);
      animation: lib-sheen 2.5s ease-in-out infinite;
    }
  }

  // ── Estantería ──────────────────────────────────────────
  &__shelf-card {
    padding: var(--space-4) var(--space-5);
    background: var(--color-bg-page);
    border: 1px solid var(--color-border-outline);
    border-radius: var(--radius-xl);
    box-shadow: var(--shadow-card);
  }

  &__shelf-tabs {
    display: flex;
    gap: var(--space-2);
    margin-bottom: var(--space-4);
  }

  &__shelf-tab {
    display: flex;
    align-items: center;
    gap: var(--space-1);
    padding: 5px var(--space-3);
    border-radius: var(--radius-pill);
    border: 1.5px solid var(--color-border-medium);
    background: var(--color-bg-page);
    font-family: var(--font-main);
    font-size: var(--text-sm);
    font-weight: var(--weight-semibold);
    color: var(--color-text-primary);
    cursor: pointer;
    transition: border-color var(--transition-fast);

    &:hover {
      border-color: var(--color-text-secondary);
    }

    &--active {
      border-color: var(--color-text-primary);

      &:hover {
        border-color: var(--color-text-primary);
        cursor: default;
      }
    }
  }

  &__shelf-count {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 20px;
    border-radius: var(--radius-pill);
    background: var(--color-neutral-alpha-muted);
    font-size: var(--text-xs);
    font-weight: var(--weight-bold);
    color: var(--color-text-secondary);
    flex-shrink: 0;
  }

  // Grid fijo 5 columnas — huecos vacíos mantienen el espacio
  &__shelf-grid {
    display: grid;
    grid-template-columns: repeat(5, 88px);
    gap: var(--space-4);
  }

  &__shelf-book {
    width: 88px;
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }

  &__shelf-title {
    font-size: var(--text-xs);
    font-weight: var(--weight-semibold);
    color: var(--color-text-primary);
    margin: 0;
    text-align: center;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  &__shelf-slot {
    width: 88px;
    aspect-ratio: 2 / 3;
  }
}
```

---

### Task 4: Create LandingLibraryMockup.tsx

**Files:**
- Create: `src/pages/landing/LandingLibraryMockup.tsx`

- [ ] **Step 1: Create the component**

```tsx
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronLeft, ChevronRight } from "lucide-react";
import "./LandingLibraryMockup.scss";

import coverCalalobos    from "@/assets/landing-book-calabobos.jpg";
import coverTemor        from "@/assets/landing-book-temor.jpg";
import coverYoRobot      from "@/assets/landing-book-yorobot.jpg";
import coverSenor        from "@/assets/landing-book-senor.jpg";
import coverTrono        from "@/assets/landing-book-trono.jpg";
import coverGratitudes   from "@/assets/landing-book-gratitudes.jpg";
import coverHambre       from "@/assets/landing-book-hambre.jpg";
import coverShogun       from "@/assets/landing-book-shogun.png";
import coverFrankenstein from "@/assets/landing-book-frankenstein.jpg";
import coverHarryPotter  from "@/assets/landing-book-harrypotter.jpg";
import coverJuegoTronos  from "@/assets/landing-book-juegotronos.jpg";

type ReadingBook = {
  title: string;
  author: string;
  pct: number;
  pages: string;
  cover: string;
};

type ShelfBook = {
  title: string;
  cover: string | null;
};

type ShelfKey = "wantToRead" | "reading" | "finished" | "didNotFinish";

const READING_BOOKS: ReadingBook[] = [
  { title: "Calabobos",                   author: "Luis Mario",        pct: 35, pages: "123 / 352", cover: coverCalalobos    },
  { title: "El temor de un hombre sabio", author: "Patrick Rothfuss",  pct: 62, pages: "412 / 994", cover: coverTemor        },
  { title: "Yo, robot",                   author: "Isaac Asimov",      pct: 88, pages: "220 / 250", cover: coverYoRobot      },
];

const SHELF_BOOKS: Record<ShelfKey, ShelfBook[]> = {
  wantToRead:    [
    { title: "El señor de los anillos",  cover: coverSenor        },
    { title: "Trono de cristal",         cover: coverTrono        },
    { title: "Las gratitudes",           cover: coverGratitudes   },
    { title: "Los juegos del hambre",    cover: coverHambre       },
    { title: "Shogun",                   cover: coverShogun       },
  ],
  reading:       [
    { title: "Calabobos",                   cover: coverCalalobos    },
    { title: "El temor de un hombre sabio", cover: coverTemor        },
    { title: "Yo, robot",                   cover: coverYoRobot      },
  ],
  finished:      [
    { title: "Frankenstein",                        cover: coverFrankenstein },
    { title: "Harry Potter y la piedra filosofal",  cover: coverHarryPotter  },
    { title: "Juego de tronos",                     cover: coverJuegoTronos  },
    { title: "",                                    cover: null              },
  ],
  didNotFinish:  [
    { title: "", cover: null },
    { title: "", cover: null },
  ],
};

const SHELF_TABS: { key: ShelfKey; labelEs: string }[] = [
  { key: "wantToRead",   labelEs: "Quiero leer" },
  { key: "reading",      labelEs: "Leyendo"     },
  { key: "finished",     labelEs: "Leído"       },
  { key: "didNotFinish", labelEs: "Abandonado"  },
];

const SHELF_COLUMNS = 5;

export default function LandingLibraryMockup() {
  const { t } = useTranslation();
  const [readingIdx, setReadingIdx] = useState(0);
  const [activeTab, setActiveTab] = useState<ShelfKey>("wantToRead");

  const book = READING_BOOKS[readingIdx];
  const shelfBooks = SHELF_BOOKS[activeTab];

  return (
    <section className="landing-library">
      {/* ── Texto izquierda ──────────────────────────── */}
      <div className="landing-library__text">
        <h2 className="landing__section-title">{t("landing.library.title")}</h2>
        <p className="landing__section-subtitle">{t("landing.library.subtitle")}</p>
      </div>

      {/* ── UI derecha ───────────────────────────────── */}
      <div className="landing-library__ui">

        {/* Estoy leyendo */}
        <div>
          <div className="landing-library__block-header">
            <span className="landing-library__block-label">
              {t("landing.library.readingLabel")}
            </span>
            <span className="landing-library__block-count">
              {readingIdx + 1} / {READING_BOOKS.length}
            </span>
          </div>
          <div className="landing-library__swiper-stage">
            <button
              type="button"
              className="landing-library__chev"
              onClick={() => setReadingIdx((i) => i - 1)}
              disabled={readingIdx === 0}
              aria-label={t("myLibrary.prevBook")}
            >
              <ChevronLeft size={16} aria-hidden="true" />
            </button>

            <div className="landing-library__reading-card">
              <img
                className="landing-library__cover"
                src={book.cover}
                alt={book.title}
              />
              <div className="landing-library__reading-body">
                <div>
                  <p className="landing-library__reading-title">{book.title}</p>
                  <p className="landing-library__reading-author">{book.author}</p>
                </div>
                <div className="landing-library__progress-box">
                  <div className="landing-library__progress-labels">
                    <span>
                      {t("myLibrary.readingProgress")}:{" "}
                      <strong className="landing-library__progress-pct">{book.pct}%</strong>
                    </span>
                    <span>{book.pages} {t("myLibrary.pagesUnit")}</span>
                  </div>
                  <div className="landing-library__progress-bar">
                    <div
                      className="landing-library__progress-fill"
                      style={{ width: `${book.pct}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            <button
              type="button"
              className="landing-library__chev"
              onClick={() => setReadingIdx((i) => i + 1)}
              disabled={readingIdx === READING_BOOKS.length - 1}
              aria-label={t("myLibrary.nextBook")}
            >
              <ChevronRight size={16} aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* Estantería */}
        <div>
          <div className="landing-library__block-header">
            <span className="landing-library__block-label">
              {t("landing.library.shelfLabel")}
            </span>
          </div>
          <div className="landing-library__shelf-card">
            <div className="landing-library__shelf-tabs">
              {SHELF_TABS.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  className={`landing-library__shelf-tab${activeTab === tab.key ? " landing-library__shelf-tab--active" : ""}`}
                  onClick={() => setActiveTab(tab.key)}
                >
                  {tab.labelEs}
                  <span className="landing-library__shelf-count">
                    {SHELF_BOOKS[tab.key].length}
                  </span>
                </button>
              ))}
            </div>

            <div className="landing-library__shelf-grid">
              {Array.from({ length: SHELF_COLUMNS }, (_, i) => {
                const entry = shelfBooks[i];
                if (!entry) {
                  return <div key={i} className="landing-library__shelf-slot" />;
                }
                if (!entry.cover) {
                  return (
                    <div key={i} className="landing-library__shelf-book">
                      <div className="landing-library__cover landing-library__cover--placeholder" />
                    </div>
                  );
                }
                return (
                  <div key={i} className="landing-library__shelf-book">
                    <img
                      className="landing-library__cover"
                      src={entry.cover}
                      alt={entry.title}
                    />
                    <p className="landing-library__shelf-title">{entry.title}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}
```

---

### Task 5: Update LandingPage.tsx

**Files:**
- Modify: `src/pages/landing/LandingPage.tsx`

- [ ] **Step 1: Add import, remove old imports**

Replace the block of library-related imports at the top of the file. Remove `libraryImg` and all `fav*Img` imports that are still in scope only for the library section, and add the new component import.

The file currently imports:
```tsx
import libraryImg from "@/assets/landing-library.png";
```

Remove that import and add:
```tsx
import LandingLibraryMockup from "./LandingLibraryMockup";
```

The `coverDuneImg`, `cover1984Img`, and `fav*Img` imports are used by the community section — keep them.

- [ ] **Step 2: Replace the landing__library section**

Find and replace the entire `{/* ── Biblioteca ───────────────────────────────────── */}` block:

```tsx
      {/* ── Biblioteca ───────────────────────────────────── */}
      <section className="landing__library">
        <div className="landing__library-mockup">
          <img src={libraryImg} alt="Interfaz de Mi biblioteca" />
        </div>
        <div className="landing__library-text">
          <h2 className="landing__section-title">{t("landing.library.title")}</h2>
          <p className="landing__section-subtitle">{t("landing.library.subtitle")}</p>
          <div className="landing__pills">
            <span className="landing__pill landing__pill--reading">
              {t("landing.library.pill.reading")}
            </span>
            <span className="landing__pill landing__pill--read">
              {t("landing.library.pill.read")}
            </span>
            <span className="landing__pill landing__pill--want">
              {t("landing.library.pill.want")}
            </span>
            <span className="landing__pill landing__pill--abandoned">
              {t("landing.library.pill.abandoned")}
            </span>
          </div>
        </div>
      </section>
```

With:
```tsx
      {/* ── Biblioteca ───────────────────────────────────── */}
      <LandingLibraryMockup />
```

---

### Task 6: Update LandingPage.scss

**Files:**
- Modify: `src/pages/landing/LandingPage.scss`

- [ ] **Step 1: Remove the `&__library` block (lines 249–278)**

Delete the entire block:
```scss
  // ── SECCIÓN: Biblioteca ───────────────────────────────
  &__library {
    display: flex;
    gap: 80px;
    align-items: center;
    justify-content: center;
    padding: var(--space-24) 80px;
    background: var(--color-bg-page);
    width: 100%;
    box-sizing: border-box;

    &-mockup {
      flex-shrink: 0;
      width: 480px;
      max-width: 100%;

      img {
        width: 100%;
        border-radius: 12px;
        box-shadow: var(--shadow-modal);
      }
    }

    &-text {
      display: flex;
      flex-direction: column;
      gap: var(--space-6);
      max-width: 520px;
    }
  }
```

- [ ] **Step 2: Remove the `&__pills` and `&__pill` blocks (lines 113–147)**

Delete the entire block:
```scss
  // ── Pills de estado ───────────────────────────────────
  &__pills {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
    padding-top: var(--space-2);
  }

  &__pill {
    padding: var(--space-1) var(--space-3);
    border-radius: var(--radius-pill);
    font-size: var(--text-xs);
    font-weight: var(--weight-semibold);

    &--reading {
      background: var(--color-brand-alpha-subtle);
      border: 1px solid var(--color-brand-primary);
      color: var(--color-brand-primary);
    }
    &--read {
      background: var(--color-success-bg);
      border: 1px solid var(--color-success);
      color: var(--color-success);
    }
    &--want {
      background: var(--color-neutral-alpha-subtle);
      border: 1px solid var(--color-text-tertiary);
      color: var(--color-text-secondary);
    }
    &--abandoned {
      background: var(--color-error-bg);
      border: 1px solid var(--color-error);
      color: var(--color-error);
    }
  }
```

---

### Task 7: Check i18n keys used from other namespaces

**Files:** None (read-only check)

The component uses two keys from the `myLibrary` namespace:
- `myLibrary.readingProgress` — label "Progreso"
- `myLibrary.prevBook` / `myLibrary.nextBook` — aria labels
- `myLibrary.pagesUnit` — "pág."

- [ ] **Step 1: Check these keys exist**

```bash
grep -r "readingProgress\|prevBook\|nextBook\|pagesUnit" src/plugins/i18n/locales/es/
```

If `pagesUnit` does not exist, replace `{t("myLibrary.pagesUnit")}` in the component with the literal `"pág."` and remove that interpolation.

If `readingProgress`, `prevBook`, `nextBook` don't exist, use these fallbacks in the component:
- `{t("myLibrary.readingProgress")}` → `"Progreso"`
- aria-label for prev → `"Libro anterior"`
- aria-label for next → `"Libro siguiente"`

---

### Task 8: Verify

- [ ] **Step 1: Run lint**

```bash
npm run lint
```

Expected: no errors in `LandingLibraryMockup.tsx` or `LandingPage.tsx`.

- [ ] **Step 2: Run build**

```bash
npm run build
```

Expected: exits 0. Fix any TypeScript errors before continuing.

- [ ] **Step 3: Start dev server and verify visually**

```bash
npm run dev
```

Open the landing page and check:
- The library section shows the 2-column layout (text left, UI right)
- "Estoy leyendo" label and counter appear above the reading card
- Chevrons are outside the card, navigate between 3 books, disable at edges
- Progress bar updates when navigating
- "Estantería" label appears above the shelf card
- All 4 tabs work and show correct books
- "Quiero leer" tab active by default with 5 real cover images
- Empty slots in "Leyendo" (2), "Leído" (1), "Abandonado" (3) are blank
- No console errors

---

### Task 9: Commit

- [ ] **Step 1: Stage and commit**

```bash
git add \
  src/assets/landing-book-*.jpg \
  src/assets/landing-book-*.png \
  src/pages/landing/LandingLibraryMockup.tsx \
  src/pages/landing/LandingLibraryMockup.scss \
  src/pages/landing/LandingPage.tsx \
  src/pages/landing/LandingPage.scss \
  src/plugins/i18n/locales/es/landing.json \
  src/plugins/i18n/locales/en/landing.json \
  docs/superpowers/specs/2026-06-12-landing-library-section.md \
  docs/superpowers/plans/2026-06-12-landing-library-section.md

git commit -m "feat: replace landing library section with interactive mockup"
```
