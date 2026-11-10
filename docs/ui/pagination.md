# Pagination — Pinguin shared component

**Обов'язковий актуальний контракт**: [project-rules.md](../project-rules.md). Footer FAB розміщується справа в Footer; глобальний FAB залишається в зоні Aside.

Implemented 2026-11-09. Adapted from the actual legacy branch pagination logic,
without copying its page-specific DOM, scattered state globals, or styled controls.

- `createPagination({total,page,pageSize,sizes,label,onChange})` is the single page/range math and UI owner for collections and future API adapters.
- Native `nav`, visible row range, previous/next, page numbers, ellipsis and one **additional instance of the existing Shell FAB**, mounted at the **far right edge of Footer**, outside the centered numbered page pill (10/25/50/100/«Усі»). It uses the same FAB action styling and animation; visible item labels are hidden but accessible names remain.
- `getPageNumbers` is a pure function; no global singleton or registry. The control emits `{page,pageSize,total,totalPages,start,end}` for filtering/slicing or remote data requests. `start` is zero-based, `end` exclusive.
- Table/tiles share one pagination state. The collection owns the dataset and sorting; the pagination does not fetch, filter, or persist any records.
- On a new filter, the collection explicitly resets to page 1. Changing size also resets to page 1. If the total falls, a previously invalid page is clamped.
- Keyboard operates native page buttons and the existing FAB's focusable action buttons. Disabled previous/next remain disabled; the active page has `aria-current=page`.
- No special Shell layout or tab animation mode is introduced.

Reference: legacy `js/components/charms/pagination/pagination-ui.js` and
`js/components/charms/pagination/pagination-main.js`; implementation and visual improvements: native semantics, scope-limited lifecycle, compact footer, shared CSS tokens.

## Footer placement and legacy visual parity

The active collection mounts its **single** `pagination.element` instance into the existing 56px Shell footer through `setFooterContent(node)`. The footer is the only container below the universal work surface; other tabs clear it, restoring the original empty rail. Neither a special Shell layout mode nor a second pagination instance is created.

The footer carries the top separator line. Inside: row count at left, a centered pill with round numbered page buttons and accented selected page, while the **far-right Footer column** contains another instance of `createAsideFab` for page size. The centered page navigation never moves to make room. Both FAB instances have separate IDs, actions, focus, and state. The original remains in the aside rail with its pre-existing actions; the secondary is shown only on a page that configures it. There is **no duplicate menu, dial CSS, or new FAB implementation**.

## Correction: two shared FAB instances, no replacement

The page-size FAB is created from the existing `src/shell/aside/fab.js` factory and mounted into `pagination.element` in the Shell's footer, aligned to the right edge **of Footer**, completely separate from the unchanged original aside FAB. Its contextual action values call the one shared collection paginator. The page passes `setPageFabContext` when active; elsewhere that second instance is hidden. The original always retains its existing quick links. This is a second instance, **not a second component**.

## Shared geometry of the footer and right rail

The Shell footer height and right-rail width use the same `--pg-sidebar-compact-width` token (56px). Both FAB triggers reuse the common `--pg-control-size` (40px).

- Align visible button centers along the **same bottom-row line**, measured in the browser for both docked/default aside modes. Do **not** substitute a guessed `bottom` formula for a visual alignment test; the global FAB and Footer FAB have distinct positioning contexts.
- Use the same semantic right inset (`--pg-space-3`, 12px) from **each respective zone boundary** in the compact right-rail layout, and validate actual gaps across layouts. The Footer FAB must never be positioned relative to the global FAB.
- The page-size FAB stays in the Footer's pagination element; the existing actions FAB remains independently mounted in the Shell's aside rail.
- Do not introduce per-feature FAB sizes, bottom offsets, or separate appearance rules.
