# Pagination — Pinguin shared component

Implemented 2026-11-09. Adapted from the actual legacy branch pagination logic,
without copying its page-specific DOM, scattered state globals, or styled controls.

- `createPagination({total,page,pageSize,sizes,label,onChange})` is the single page/range math and UI owner for collections and future API adapters.
- Native `nav`, visible row range, previous/next, page numbers, ellipsis and one **additional instance of the existing Shell FAB** next to the original fourth-corner FAB (10/25/50/100/«Усі»). It uses the same FAB action styling and animation.
- `getPageNumbers` is a pure function; no global singleton or registry. The control emits `{page,pageSize,total,totalPages,start,end}` for filtering/slicing or remote data requests. `start` is zero-based, `end` exclusive.
- Table/tiles share one pagination state. The collection owns the dataset and sorting; the pagination does not fetch, filter, or persist any records.
- On a new filter, the collection explicitly resets to page 1. Changing size also resets to page 1. If the total falls, a previously invalid page is clamped.
- Keyboard operates native page buttons and the existing FAB's focusable action buttons. Disabled previous/next remain disabled; the active page has `aria-current=page`.
- No special Shell layout or tab animation mode is introduced.

Reference: legacy `js/components/charms/pagination/pagination-ui.js` and
`js/components/charms/pagination/pagination-main.js`; implementation and visual improvements: native semantics, scope-limited lifecycle, compact footer, shared CSS tokens.

## Footer placement and legacy visual parity

The active collection mounts its **single** `pagination.element` instance into the existing 56px Shell footer through `setFooterContent(node)`. The footer is the only container below the universal work surface; other tabs clear it, restoring the original empty rail. Neither a special Shell layout mode nor a second pagination instance is created.

The footer carries the top separator line. Inside: row count at left, a centered pill with round numbered page buttons and accented selected page, while **outside the pagination**, immediately to the left of the persistent fourth-corner FAB, another instance of `createAsideFab` is shown for page size. Both FAB instances have separate IDs, actions, focus, and state. The original still lists its quick links, untouched; the secondary is shown only on a page that configures it. There is **no duplicate menu, dial CSS, or new FAB implementation**.

## Correction: two shared FAB instances, no replacement

The page-size FAB is created from the existing `src/shell/aside/fab.js` factory and placed adjacent to the unchanged original Shell FAB. Its contextual action values call the one shared collection paginator. The page passes `setPageFabContext` when active; elsewhere that second instance is hidden. The original always retains its existing quick links. This is a second instance, **not a second component**.
