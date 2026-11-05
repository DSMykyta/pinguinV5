# Pinguin v5 — calm workspace refresh (2026-11-05)

## Goal
Unify the visual language of the existing multi-page Pinguin application with an interface inspired by ChatGPT's quiet hierarchy: restrained color, stable navigation, soft contextual panels, tight menus, consistent focus and spacing. This is an original implementation, not an import of ChatGPT's proprietary component styles.

## Scope of this change
- New shared cascade layer: `css/layers/calm-shell.css`, imported last by `css/main.css`.
- Sidebar: stable compact icon rail, predictable expanded width, grouped links, active-page treatment, clearer footer and light/dark states.
- Right aside: toned-down floating panel, consistent rounding, more legible spacing.
- Context menus and modal shells: unified surfaces, separators, shadows and action rows.
- Responsive adjustments for narrow viewports and reduced-motion support.
- Existing JS behavior, page structure, API, permissions and data handling are unchanged.
- `design-system.html` uses a different body layout; the new shared shell intentionally only targets `body.layout-v2`.

## Current structural observations
- The app contains 19 Vite HTML entry points, including a dedicated design-system page and a migration guide; 17 inspected core HTML files import `css/main.css`.
- A `GPT CSS/` folder already contains captured CSS assets. Those files are **not** imported into the app by this change; raw ChatGPT styles are not compatible with Pinguin's DOM/component structure.
- Existing `css/root.css` uses Material-style status/action colors and Geologica/NyghtSerif typography. The app has a partially ChatGPT-like `layout-v2` shell, but visual patterns remain mixed.
- The index page has SEO and official-sites tools commented out as “temporarily disabled”; translation is marked as no longer functional. CSS work does not restore them.

## Verification to complete before merge
1. Wait for Vercel preview build and check build status.
2. Test navigation collapsed/expanded, active link, user menu, logout and theme switching while logged in and logged out.
3. Inspect light/dark at 360, 768, 1024 and 1440 pixels.
4. Check right-aside layouts on image tools, product, entities and marketplace pages.
5. Check dropdowns from tables, filters, multi-selects and dialogs; verify portal positioning and keyboard focus.
6. Test application flows using real or safe sample data: table editing, image conversions, price calculations, tasks, CRUD operations and form validation.
7. Run `npm run check` and review regressions.

## Subsequent functional work
Keep cosmetic refinement separate from application bug fixes. Track disabled features, missing empty/error/loading states, broken interactions and permission-protected views by page. Do not assume a page works solely because its HTML is present.

## Rollback
This work is isolated in `design/calm-chatgpt-shell-20261105`. The production branch remains unchanged until the PR is reviewed and merged.
