# Pagination — Pinguin shared component

Implemented 2026-11-09. Adapted from the actual legacy branch pagination logic,
without copying its page-specific DOM, scattered state globals, or styled controls.

- `createPagination({total,page,pageSize,sizes,label,onChange})` is the single page/range math and UI owner for collections and future API adapters.
- Native `nav`, visible row range, previous/next, page numbers, ellipsis and the **existing shared Menu** configured as a radio-selection speed dial (10/25/50/100/«Всі»). The trigger opens upward.
- `getPageNumbers` is a pure function; no global singleton or registry. The control emits `{page,pageSize,total,totalPages,start,end}` for filtering/slicing or remote data requests. `start` is zero-based, `end` exclusive.
- Table/tiles share one pagination state. The collection owns the dataset and sorting; the pagination does not fetch, filter, or persist any records.
- On a new filter, the collection explicitly resets to page 1. Changing size also resets to page 1. If the total falls, a previously invalid page is clamped.
- Keyboard operates native page buttons and the shared Menu radio options. Disabled previous/next remain disabled; the active page has `aria-current=page`.
- No special Shell layout or tab animation mode is introduced.

Reference: legacy `js/components/charms/pagination/pagination-ui.js` and
`js/components/charms/pagination/pagination-main.js`; implementation and visual improvements: native semantics, scope-limited lifecycle, compact footer, shared CSS tokens.

## Footer placement and legacy visual parity

The active collection mounts its **single** `pagination.element` instance into the existing 56px Shell footer through `setFooterContent(node)`. The footer is the only container below the universal work surface; other tabs clear it, restoring the original empty rail. Neither a special Shell layout mode nor a second pagination instance is created.

The footer carries the top separator line. Inside: row count at left, a centered pill with round numbered page buttons and accented selected page, and at right a compact page-size trigger. Its options rise above the trigger as a speed dial using the **same** `createMenu` logic (presentation `dial`, mutually exclusive radio items). This reproduces the actual legacy `pagination-nav` + FAB composition, while centralizing position, keyboard, focus and dismissal behavior.
