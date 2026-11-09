# Menu — actions, not value selection
Design contract · 2026-11-09. Reference: old MiniMax action/appearance example, but no Brands page or inline global selectors.

- Trigger is a native button with `aria-haspopup=menu`, expanded/controls. Popup is a `role=menu` containing native buttons with menuitem or menuitemcheckbox semantics.
- Arrow keys, Home/End and type-to-select operate on non-disabled items; Enter/Space activate; Escape restores trigger focus; outside click dismisses. Focus is managed on items, not on a text input.
- Checkable menu entries are actions with checked state; their selection is not a replacement for native Select or Switch. Destructive actions use a clearly distinct label/style, not automatic irreversible operation.
- `createMenu({label,items,disabled?,align?,onSelect?})` returns `{element,trigger,open,close,destroy}`. Item type `action`, `navigation` or `check` and `value,label,disabled,checked,danger`.
- Mount/destroy is local; floating menu has viewport-safe position with narrow mobile fallback. Do not hardcode page names.
