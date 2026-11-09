# Data Collection — table and optional tiles

Status: interactive design review preview in Tools → «Макети даних», 2026-11-09. The outer Shell header, global search, context controls, navigation and tool tabs must **not be recreated**. The first screenshot defines a dense table/list below existing chrome; the second defines an optional card/tile layout for e.g. Brands.

## Architecture: one dataset, two presentations

- `src/ui/collection-view/`: shared `createCollectionView({ label, rows, columns, getRowId, renderTile?, modes?, initialMode?, onModeChange? })`; it renders a native semantic `<table>` and (if supported) a responsive card layout from the **same row objects**. Sorting is shared, not implemented twice. It owns neither persistence, navigation, business data nor the Shell.
- `src/ui/view-switch/`: the shared segmented radio switch with one sliding plate and SVG list/tile icons, supplied to the **existing** Shell header actions slot as needed. A page with table-only mode does not show a switch.
- `src/core/preferences.js`: existing Shell persistence is extended with generic JSON read/write and a validated stored-choice primitive. Feature IDs produce independent versioned keys (`pg:v1:tools-data-views:view`, future `pg:v1:brands:view`). The Shell sidebar and aside continue using their existing keys and contracts, now with the same primitive storage IO. No localStorage logic in UI components.
- `src/shell/page-outlet.js` exposes `setHeaderActions(node)` to a feature. The Shell supplies a single managed slot before existing search/context buttons and clears it on route changes. Tools removes these controls when a different tab is active. This is the only contextual header slot.
- `src/features/tools/data-views-demo.js` provides fictional sample Brands records; it does not ship a real Brands feature, backend, new page header or unrequested create/search buttons.

## Table style for many records

1. Native `table` with caption, `th scope=col` and `aria-sort` on the sorted header. Sorting buttons use full header text and toggle ascending/descending. A plain table, **not** `role=grid` (which would require keyboard focus management not used by this preview).
2. Compact, consistent row height (~46px), quiet 1px separators and restrained hover, primary name visually stronger, supporting text subdued. Right-align numeric columns, use `font-variant-numeric: tabular-nums`.
3. Sticky header inside a full-height scrollable table viewport; many columns scroll horizontally without clipping any data. The leading name column stays visible horizontally where supported. Keep keyboard-focus outlines and semantic headers.
4. Existing shared Menu and Checkbox supply real local record actions and selection. The Shell contains the single data-context search, and the aside hosts sort and bulk controls.
5. Responsive narrow layout does not delete columns; horizontal scroll affords access to all. Do not fake table semantics with `div` grids.

## Optional tile style

- Same dataset and sort order. Responsive `repeat(auto-fill, minmax(...))` grid with neutral image placeholders / monograms, useful primary label, secondary category, count and status; no actual brand imagery is claimed.
- The tile renderer is a callback supplied by a feature, not a hardcoded Brands view in shared UI.
- The view switch sits in the **existing** header; native radio checked state identifies the selected mode. `table` is the default until the user chooses `tiles`. Each feature remembers its own choice; switching from another feature never changes it.
- Data set updates do not discard the mode. Preference persistence failure degrades to in-session selection with no errors.

## A11y and testing

- Sortable native tables: W3C [Table Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/table/). Do not use the interactive [Grid Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/grid/) without full grid keyboard support.
- E2E covers tab isolation, switch appearing only on the new tab, sort, DOM re-use, horizontal scrolling, narrow view, preference restore on reload, blocked localStorage, independent preference keys and Shell controls remaining unchanged. Also test dark theme and reduced motion.

This is a **design alignment tab**. Final production Brands implementation, API integration, production bulk operations, column personalization, and virtualization are future work after visual approval.

## Approved full-workspace revision (2026-11-09)

The table **is the workspace**, not a card within a page. Remove the illustrative H2, explanatory paragraphs, meta text, extra 40px Shell content padding, inner border/radius, and nested maximum height. The table viewport occupies all available workspace space below the **existing** header/tabs, with one scrollable region retaining vertical and horizontal scroll and a sticky header. Tiles occupy the same space, scrolling within it, with internal gap between tiles. All pages use the **same** Shell and Tabs layout. A collection fills its parent; normal article pages obtain standard padding from the shared Page component. No workspace mode switching is involved.

Sidebar and aside scrollable areas reuse `.pg-scrollbar` (8px thin, arrowless); the contextual aside links no longer have redundant arrow decorations. The shared style remains owned by `src/ui/scrollbar`; no new scrollbar implementation.

## Single universal workspace (2026-11-09)

A special workspace `flush/fill` mode is **forbidden and removed**. Shell always uses one full-height, unpadded content area. Tabs always share the same layout and entry animation. Generic `.pg-page` supplies conventional article padding; collections already fill their parent. No context-specific workspace attributes, separate transition, or alternative Shell handling.

## Data-controls implementation (2026-11-09)

Shared `createCollectionView` now includes:

- Opt-in `selectable`: one compact circular native checkbox per row plus a
  header checkbox that is checked only when all **visible page** rows are selected,
  mixed (`indeterminate`) when partially selected, and empty otherwise.
  Selection uses stable row IDs and survives page changes; features own bulk actions.
- Optional `rowActions` with the **existing** shared `createMenu`; no second
  action-menu mechanism. The Tools demo's View/Duplicate/Archive examples operate
  on local example records only.
- The shared `createPagination` at the bottom, one state for both table and tiles.
  Default 25 per page, size selector, numbered pages and accessible navigation.
- Exposed `setSort`, `setQuery`, `getSelectedIds`, `clearSelection` API;
  one filtered and sorted dataset, no copied models for the two views.
- `createViewSwitch` is a thin adapter to the shared legacy-inspired
  `createSegmentSwitch`, never two custom view buttons.
- The existing Shell search field accepts a page-scoped `onQuery` handler and
  is hidden for tabs without searchable content. The existing aside accepts
  optional page-owned controls; for data tables, it holds the real sort Select,
  direction segmented control, selection count, and bulk action.
- There is **one** Shell workspace layout and **one** tab-panel animation.
  No page-specific `flush` mode, `fill` switch or duplicate header exists.

This remains a **UI alignment preview**, not a production Brands route.

## Legacy footer, menu and checkbox corrections

- Header checkbox `−` is a clear action: if **any** row on the current page is selected, clicking it deselects all visible selected rows; if none, clicking selects the visible page. The checked state also clears selection. Individual checkboxes keep the generic circular appearance.
- The order of table cells is **selection checkbox, action menu, data columns**. A table without selection still places actions before the data. No sticky actions column at the far right.
- Action Menu uses the existing `createMenu` and shared popup positioning. The panel measures text and fits the longest label without horizontal scrolling, and both hovered/focused items and the open trigger have visible state.
- Pagination is rendered in the existing Shell footer via one optional `setFooterContent` callback. It uses the same `createPagination` instance for table and tiles, not a clone and not a separate work-area mode. The shared footer remains empty on unrelated tabs.
