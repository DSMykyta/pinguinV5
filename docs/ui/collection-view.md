# Data Collection — table and optional tiles

Status: interactive design review preview in Tools → «Макети даних», 2026-11-09. The outer Shell header, global search, context controls, navigation and tool tabs must **not be recreated**. The first screenshot defines a dense table/list below existing chrome; the second defines an optional card/tile layout for e.g. Brands.

## Architecture: one dataset, two presentations

- `src/ui/collection-view/`: shared `createCollectionView({ label, rows, columns, getRowId, renderTile?, modes?, initialMode?, onModeChange? })`; it renders a native semantic `<table>` and (if supported) a responsive card layout from the **same row objects**. Sorting is shared, not implemented twice. It owns neither persistence, navigation, business data nor the Shell.
- `src/ui/view-switch/`: the single two-button control with `aria-pressed` and SVG list/tile icons, supplied to the **existing** Shell header actions slot as needed. A page with table-only mode does not show a switch.
- `src/core/preferences.js`: existing Shell persistence is extended with generic JSON read/write and a validated stored-choice primitive. Feature IDs produce independent versioned keys (`pg:v1:tools-data-views:view`, future `pg:v1:brands:view`). The Shell sidebar and aside continue using their existing keys and contracts, now with the same primitive storage IO. No localStorage logic in UI components.
- `src/shell/page-outlet.js` exposes `setHeaderActions(node)` to a feature. The Shell supplies a single managed slot before existing search/context buttons and clears it on route changes. Tools removes these controls when a different tab is active. This is the only contextual header slot.
- `src/features/tools/data-views-demo.js` provides fictional sample Brands records; it does not ship a real Brands feature, backend, new page header or unrequested create/search buttons.

## Table style for many records

1. Native `table` with caption, `th scope=col` and `aria-sort` on the sorted header. Sorting buttons use full header text and toggle ascending/descending. A plain table, **not** `role=grid` (which would require keyboard focus management not used by this preview).
2. Compact, consistent row height (~46px), quiet 1px separators and restrained hover, primary name visually stronger, supporting text subdued. Right-align numeric columns, use `font-variant-numeric: tabular-nums`.
3. Sticky header inside a bounded scrollable table viewport; many columns scroll horizontally without clipping any data. The leading name column stays visible horizontally where supported. Keep keyboard-focus outlines and semantic headers.
4. No fake action buttons, no duplicate global search or bulk-operation controls. Demo sorting and view mode switching genuinely work.
5. Responsive narrow layout does not delete columns; horizontal scroll affords access to all. Do not fake table semantics with `div` grids.

## Optional tile style

- Same dataset and sort order. Responsive `repeat(auto-fill, minmax(...))` grid with neutral image placeholders / monograms, useful primary label, secondary category, count and status; no actual brand imagery is claimed.
- The tile renderer is a callback supplied by a feature, not a hardcoded Brands view in shared UI.
- The view switch sits in the **existing** header; `aria-pressed` identifies the selected mode. `table` is the default until the user chooses `tiles`. Each feature remembers its own choice; switching from another feature never changes it.
- Data set updates do not discard the mode. Preference persistence failure degrades to in-session selection with no errors.

## A11y and testing

- Sortable native tables: W3C [Table Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/table/). Do not use the interactive [Grid Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/grid/) without full grid keyboard support.
- E2E covers tab isolation, switch appearing only on the new tab, sort, DOM re-use, horizontal scrolling, narrow view, preference restore on reload, blocked localStorage, independent preference keys and Shell controls remaining unchanged. Also test dark theme and reduced motion.

This is a **design alignment tab**. Final production Brands implementation, API integration, bulk operations, column personalization, and virtualization are future work after visual approval.
