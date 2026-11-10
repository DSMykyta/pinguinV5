# Pinguin Next — rules for coding agents

Before changing code, read [docs/project-rules.md](docs/project-rules.md), [docs/conventions.md](docs/conventions.md), [docs/ui/overview.md](docs/ui/overview.md), and the component's current specification (including later corrections).

1. Latest explicit owner decision overrides older docs; do not resurrect retired designs. Current fields have permanent labels above their outline ([field.md](docs/ui/field.md)), not floating/notched labels.
2. One Shell/workspace and one tab transition. Absolutely no separate `fill`/`flush` workspace modes.
3. Reuse the *same implementation*, not just copied CSS. Check existing UI, FAB, pagination, Menu, Dialog, Field, SegmentSwitch, RevealPanel, button, scrollbar and Shell slots first.
4. Original persistent FAB stays unchanged; pagination/page-size may use another instance of the same `createAsideFab`. Use existing footer and `createPagination`.
5. Independent feature state, independent tab panels, no feature-to-feature imports, no UI-to-feature imports, complete unmount cleanup.
6. Table header mixed checkbox clears visible selection; checkbox then Edit, row actions at the end. Table/tiles share one dataset and selection.
7. Rich-text editor should use shared segmented control for WYSIWYG/HTML; formatted HTML paste in visual mode, code in source mode, with sanitization.
8. Document research and contract before implementation. Verify keyboard, hover, opened/selected, responsive, dark theme, reduced motion, layout coordinates, npm checks and Playwright. Passing CI alone is not visual approval.
9. Only commit to `work` unless explicitly instructed otherwise. Avoid overwriting parallel work; no force-push.
10. Do not add personal memory entries without an explicit user request.

Review the **last section (mistakes and unresolved discrepancies)** of [docs/project-rules.md](docs/project-rules.md) before declaring any task finished.
