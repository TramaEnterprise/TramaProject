# Expandable CTA – BookCard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the shelf CTA on BookCard to show only an icon by default, expanding on hover to reveal the label + chevron — without touching FeaturedBookCard or BookInfoCard.

**Architecture:** Add an optional `addIcon` prop to `ShelfStatusDropdown` so BookCard can inject a `Plus` icon for the not-saved state without affecting other consumers. All visual behavior (collapse/expand) is handled purely via SCSS transitions on `max-width` + `opacity` + `padding` — no new JS state.

**Tech Stack:** React 19, TypeScript, SCSS (BEM), Lucide React icons, CSS custom properties (`--transition-fast`, `--transition-base`, `--space-1`, `--space-2`, `--radius-md`)

---

### Task 1: Add `addIcon` prop to `ShelfStatusDropdown`

**Files:**
- Modify: `src/components/book/shelf-status-dropdown/ShelfStatusDropdown.tsx`

No test suite exists — verify manually in the browser after Task 3.

- [ ] **Step 1: Add `addIcon` to the props type**

In `ShelfStatusDropdown.tsx`, update `ShelfStatusDropdownProps`:

```tsx
type ShelfStatusDropdownProps = {
  book: Book;
  portal?: boolean;
  addIcon?: React.ElementType;
  classNames?: Partial<{
    root: string;
    btn: string;
    list: string;
    item: string;
    tooltip: string;
  }>;
};
```

- [ ] **Step 2: Accept and use the prop**

Update the function signature and the `StatusIcon` line:

```tsx
export default function ShelfStatusDropdown({
  book,
  classNames,
  portal = false,
  addIcon,
}: ShelfStatusDropdownProps) {
  // ...existing hooks...

  const StatusIcon = saved ? STATUS_ICONS[saved] : (addIcon ?? null);
```

- [ ] **Step 3: Commit**

```bash
git add src/components/book/shelf-status-dropdown/ShelfStatusDropdown.tsx
git commit -m "feat: add addIcon prop to ShelfStatusDropdown for contextual fallback icon"
```

---

### Task 2: Pass `Plus` icon from `BookCard`

**Files:**
- Modify: `src/components/book/cards/BookCard.tsx`

- [ ] **Step 1: Import Plus**

Add `Plus` to the existing lucide-react import in `BookCard.tsx`:

```tsx
import { BookOpen, Star, Plus } from "lucide-react";
```

- [ ] **Step 2: Pass `addIcon` to the dropdown**

Update the `ShelfStatusDropdown` usage in `BookCard.tsx`:

```tsx
<ShelfStatusDropdown
  book={book}
  portal
  addIcon={Plus}
  classNames={{
    root: "book-card__save-wrapper",
    btn: "book-card__save-btn",
    list: "book-card__dropdown",
    item: "book-card__dropdown-item",
    tooltip: "book-card__tooltip",
  }}
/>
```

- [ ] **Step 3: Commit**

```bash
git add src/components/book/cards/BookCard.tsx
git commit -m "feat: inject Plus icon into BookCard shelf CTA for not-saved state"
```

---

### Task 3: Redesign `.book-card__save-btn` in SCSS

**Files:**
- Modify: `src/components/book/cards/BookCard.scss`

The current `&__save-btn` block starts at line 94. Replace it entirely.

**Key behavior:**
- Default: icon-only square (~32 × 32 px), `span` and chevron hidden via `max-width: 0; opacity: 0`
- Hover / `--open`: padding expands, gap appears, `span` and chevron fade in
- `--saved`: outline style (unchanged)
- `--open`: dropdown-bg style (unchanged)
- The `<svg>` icon itself is always visible

- [ ] **Step 1: Replace the save-btn block**

In `BookCard.scss`, replace the existing `&__save-btn { ... }` block (lines 94–130) with:

```scss
// Save button + dropdown
&__save-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0;
  padding: 8px;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-btn-primary-bg);
  background: var(--color-btn-primary-bg);
  font-family: var(--font-main);
  font-size: var(--text-sm);
  font-weight: var(--weight-medium);
  color: var(--color-btn-primary-fg);
  cursor: pointer;
  white-space: nowrap;
  transition:
    gap var(--transition-fast),
    padding var(--transition-fast),
    border-color var(--transition-base),
    background var(--transition-base),
    color var(--transition-base);

  span {
    display: block;
    max-width: 0;
    opacity: 0;
    overflow: hidden;
    white-space: nowrap;
    transition:
      max-width var(--transition-fast),
      opacity var(--transition-fast);
  }

  .shelf-status-dropdown__chevron {
    max-width: 0;
    opacity: 0;
    overflow: hidden;
    flex-shrink: 0;
    transition:
      max-width var(--transition-fast),
      opacity var(--transition-fast);
  }

  &:hover,
  &--open {
    padding: 8px var(--space-2);
    gap: var(--space-1);

    span {
      max-width: 140px;
      opacity: 1;
    }

    .shelf-status-dropdown__chevron {
      max-width: 20px;
      opacity: 1;
    }
  }

  &--saved {
    background: var(--color-bg-page);
    border-color: var(--color-btn-primary-bg);
    color: var(--color-btn-primary-bg);
  }

  &--open {
    background: var(--color-dropdown-bg);
    border-color: var(--color-dropdown-border);
    color: var(--color-dropdown-fg);
  }

  svg {
    flex-shrink: 0;
  }
}
```

- [ ] **Step 2: Run the dev server and verify visually**

```bash
npm run dev
```

Open any page with book cards (e.g. Explore or Search). Check:
1. Button shows only the icon by default (no text, no chevron)
2. Hovering the button smoothly reveals the label and chevron
3. Clicking opens the dropdown as before
4. A book already on the shelf shows the correct status icon (Bookmark / BookOpen / BookCheck / BookX) and its label on hover
5. A book not on the shelf shows a `+` icon and "Añadir" / "Add" on hover
6. FeaturedBookCard and BookInfoCard are visually unchanged

- [ ] **Step 3: Commit**

```bash
git add src/components/book/cards/BookCard.scss
git commit -m "style: expandable icon-only CTA on BookCard, reveals label+chevron on hover"
```
