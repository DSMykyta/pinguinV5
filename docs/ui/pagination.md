# Pagination — Pinguin shared component

Implemented 2026-11-09. Adapted from the actual legacy branch pagination logic,
without copying its page-specific DOM, scattered state globals, or styled controls.

- `createPagination({total,page,pageSize,sizes,label,onChange})` is the single page/range math and UI owner for collections and future API adapters.
- Native `nav`, visible row range, previous/next, page numbers, ellipsis and a labeled native page-size Select (10/25/50/100/«Усі»).
- `getPageNumbers` is a pure function; no global singleton or registry. The control emits `{page,pageSize,total,totalPages,start,end}` for filtering/slicing or remote data requests. `start` is zero-based, `end` exclusive.
- Table/tiles share one pagination state. The collection owns the dataset and sorting; the pagination does not fetch, filter, or persist any records.
- On a new filter, the collection explicitly resets to page 1. Changing size also resets to page 1. If the total falls, a previously invalid page is clamped.
- Keyboard operates native buttons/select. Disabled previous/next remain disabled; the active page has `aria-current=page`.
- No special Shell layout or tab animation mode is introduced.

Reference: legacy `js/components/charms/pagination/pagination-ui.js` and
`js/components/charms/pagination/pagination-main.js`; implementation and visual improvements: native semantics, scope-limited lifecycle, compact footer, shared CSS tokens.
