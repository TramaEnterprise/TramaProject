# Expandable CTA – BookCard

**Date:** 2026-06-04
**Branch:** feature/redesign-expandable-cta
**Scope:** `BookCard` only — not FeaturedBookCard, not book detail page, not progress modal.

## Goal

Reduce the visual footprint of the shelf CTA on book cards so it covers less of the cover art, while keeping the full label accessible on interaction.

## Behavior

| State | Visible elements |
|-------|-----------------|
| Default | Icon only (compact, ~32 × 32 px) |
| Hover | Icon + label text + chevron (button expands right) |
| Open (dropdown active) | Icon + label text + chevron rotated (same as hover) |

**Icon mapping:**
- Not saved → `Plus`
- `wantToRead` → `Bookmark`
- `reading` → `BookOpen`
- `finished` → `BookCheck`
- `didNotFinish` → `BookX`

## Implementation

### 1. `ShelfStatusDropdown.tsx` — add Plus fallback icon

`StatusIcon` is currently `null` when not saved. Change to use `Plus` as the fallback so the icon-only compact state always has an icon.

```tsx
import { Plus, ... } from "lucide-react";
const StatusIcon = saved ? STATUS_ICONS[saved] : Plus;
```

### 2. `BookCard.scss` — CSS-only hover expansion

Use `max-width` + `opacity` on `<span>` and `<svg>` (chevron) to animate from hidden to visible without JS. The button itself expands naturally with its content (no fixed width).

**Default state:**
- `padding: 8px` (square)
- `gap: 0`
- `span`: `max-width: 0; opacity: 0; overflow: hidden`
- chevron `svg` (`.shelf-status-dropdown__chevron`): `max-width: 0; opacity: 0`

**Hover + open state:**
- `padding: 8px var(--space-2)`
- `gap: var(--space-1)`
- `span`: `max-width: 140px; opacity: 1`
- chevron: `max-width: 20px; opacity: 1`

All transitions use the existing `--transition-fast` / `--transition-base` tokens.

### 3. No changes to

- `ShelfStatusDropdown.tsx` props/structure (beyond the icon fallback)
- `FeaturedBookCard`, book detail page, progress modal
- `ShelfDropdownButton.tsx`
- Dropdown list itself (appears on click, unchanged)

## Non-goals

- Touch/mobile hover states (fallback: button stays compact; tap opens dropdown directly)
- Animation on the dropdown list itself
