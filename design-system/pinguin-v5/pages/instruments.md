# Instruments Page Overrides

> **PROJECT:** Pinguin V5
> **Generated:** 2026-08-31 06:48:04
> **Page Type:** Dashboard / Data View

> ⚠️ **IMPORTANT:** Rules in this file **override** the Master file (`design-system/MASTER.md`).
> Only deviations from the Master are documented here. For all other rules, refer to the Master.

---

## Page-Specific Rules

### Layout Overrides

- **Max Width:** 1400px or full-width
- **Grid:** 12-column grid for data flexibility
- **Sections:** 1. Hero (product + live preview or status), 2. Key metrics/indicators, 3. How it works, 4. CTA (Start trial / Contact)

### Spacing Overrides

- **Content Density:** High — optimize for information display

### Typography Overrides

- **Heading / UI:** Geologica (local variable font, Cyrillic support)
- **Technical labels:** Roboto Mono (local variable font)
- Local project fonts replace the generated Fira Sans / Fira Code pair to avoid an external font request while preserving the same functional, technical character.

### Color Overrides

- **Strategy:** Dark or neutral. Status colors (green/amber/red). Data-dense but scannable.

### Component Overrides

- Avoid: Wide tables breaking layout
- Avoid: Leave UI frozen with no feedback
- Avoid: Use arbitrary large z-index values
- Use a compact segmented control for the three primary tools.
- Use elevated workbench surfaces with clear header, content, and action zones.
- Keep the existing table, editor, canvas, aside, and authentication behavior intact.

---

## Page-Specific Components

- Workspace segmented tabs
- Workbench panel header
- Context icon mark
- Compact metadata chip

---

## Recommendations

- Effects: Hover tooltips, chart zoom on click, row highlighting on hover, smooth filter animations, data loading spinners
- Responsive: Use horizontal scroll or card layout
- Animation: Use skeleton screens or spinners
- Layout: Define z-index scale system (10 20 30 50)
- CTA Placement: Primary CTA in nav + After metrics
