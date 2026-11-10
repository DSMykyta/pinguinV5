# Shared Tooltip — show text hints only when clipped

The existing delegated `initTooltips()` owns all text/icon hints and converts native `title` values to its accessible tooltip presentation without introducing a second tooltip system.

**Global text rule (2026-11-10):** a string from `title`, `data-tooltip`, or `data-pg-tooltip` displays only when its owning element is actually clipped (`scrollWidth > clientWidth` or `scrollHeight > clientHeight`, with small pixel-rounding tolerance). A fully visible table name, file name, or label never displays an unnecessary tooltip. The text must be laid out within its actual available width before measuring it; `text-overflow: ellipsis` alone is not sufficient.

**Explicit exceptions:** icon-only controls (their label is not otherwise displayed) use the existing `data-pg-tooltip-always` attribute; collapsed Sidebar uses its existing `data-pg-tooltip-collapsed`. These continue to appear even when the hit target itself is not clipped. Never infer `always` from the presence of a native `title` attribute.

The shared Tooltip delegates hover/focus handling, keyboard feedback, hiding and lifecycle to one instance. It does not mutate component geometry, invent a new CSS class for hover cards, or display unrelated business-specific text.

Regression scenarios: fully visible brand/file name => no tooltip; constrained ellipsis name => delayed shared tooltip; explicit icon-only action => tooltip; collapsed sidebar => unchanged; text selection and click behavior => unchanged.
