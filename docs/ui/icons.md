# Icons — Google Material Symbols Rounded

The application uses Google's **Material Symbols Rounded** (24px SVGs) from the official [google/material-design-icons](https://github.com/google/material-design-icons) repository. Icons are locally embedded in `src/ui/icon/material-symbols.js` and exposed through the one existing `createIcon(name)` factory in `src/ui/icon/icon.js`.

## Decision: local SVGs instead of a font

For the current small set of 30 icons, individual source SVG paths embedded in one module avoid a large full icon font, external Google Fonts requests, layout shifts from late-loading fonts, runtime network dependencies and extra packages. Vite bundles only this local icon module. Styling remains CSS-driven via `currentColor` and `.pg-icon`.

The Material Symbols font is still an appropriate option if future screens need hundreds of dynamically selected icon names. If that becomes necessary, self-host a **subsetted WOFF2** font rather than load the entire catalog. Do not mix the two strategies within the same UI unless the requirements change.

## Usage and compatibility

```js
import { createIcon } from '../icon/icon.js';
button.append(createIcon('pencil'));
```

The legacy semantic aliases (`panel-left`, `table-2`, `pencil`, `ellipsis`, `pin-off`, etc.) remain supported so existing components are unchanged. The module carries the exact original SVG path contents from Google's Material Symbols Rounded catalog, with a shared `viewBox="0 -960 960 960"`.

All interactive elements must keep their own accessible labels. Decorative SVGs are `aria-hidden`; icon color/size belong to the component CSS rather than individual inline path colors.

## License and updates

Copyright Google LLC. Material Symbols are licensed under **Apache License 2.0**, included as `src/ui/icon/apache-2-license.txt`. Source: https://github.com/google/material-design-icons/tree/master/symbols/web. The mappings are locally versioned to avoid unreviewed icon changes.

To add an icon: download its official `symbols/web/{symbol}/materialsymbolsrounded/{symbol}_24px.svg`, verify the 960-unit viewBox, put its inner SVG geometry in `material-symbols.js`, and retain the public alias in `createIcon` call sites. Do not draw replacements manually or add a competing icon system.

## Audit: one icon family in all controls (2026-11-10)

**Required:** Every action/status pictogram in `src` uses `createIcon(name)` and a locally embedded official Material Symbols Rounded path. The public aliases `x` (chip remove / close), `check` (checked menu/listbox option), `expand-more` (shared Field caret), `arrow-up` / `arrow-down` / `swap-vert` (navigation and sorting), and `minus` (number decrement) map to Google's `close`, `check`, `expand_more`, `arrow_upward`, `arrow_downward`, `swap_vert`, and `remove` respectively. `plus` continues to map to Google's `add`.

Do not use font-dependent glyphs (e.g. `×`, `✓`, `↑`, `↓`, `↕`, `+`, `−`) as stand-in UI icons, CSS borders that draw arrows, CSS `content` pictograms, handwritten SVG paths, emoji icon substitutes, or a second icon factory. Typography may still use these characters as **meaningful data**, such as image dimensions `1600 × 900` or the `+N` overflow counter. Dynamic visualizations (Section Navigator progress ring) and media thumbnails are not pictograms and may use their own SVG geometry.

Shared Field's `trailing: 'caret'` draws the non-interactive `expand-more` via `createIcon`, retaining the same hit area and active rotation for Select, Listbox, and Combobox. Both Listbox and Tag Field must reuse the existing `pg-button--chip-remove` button skin and the same `x` icon; option/check menus use `check`. Icon geometry is owned by the icon registry; size and states by the relevant shared component CSS. Maintain accessible names on actual buttons and hide decorative icons from assistive technology.

**Regression gate:** `npm run check:icons` verifies static `createIcon` names against the registry and rejects new font-glyph buttons, CSS-generated checkmarks, or new inline SVG icons outside the icon factory. E2E must also verify pointer hit areas and icon rendering in both themes; the static check does not substitute for browser testing.
