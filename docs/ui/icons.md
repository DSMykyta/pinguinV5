# Icons — Google Material Symbols Rounded

The application uses Google's **Material Symbols Rounded** (24px SVGs) from the official [google/material-design-icons](https://github.com/google/material-design-icons) repository. Icons are locally embedded in `src/ui/icon/material-symbols.js` and exposed through the one existing `createIcon(name)` factory in `src/ui/icon/icon.js`.

## Decision: local SVGs instead of a font

For the current small set of 24 icons, individual source SVG paths embedded in one module avoid a large full icon font, external Google Fonts requests, layout shifts from late-loading fonts, runtime network dependencies and extra packages. Vite bundles only this local icon module. Styling remains CSS-driven via `currentColor` and `.pg-icon`.

The Material Symbols font is still an appropriate option if future screens need hundreds of dynamically selected icon names. If that becomes necessary, self-host a **subsetted WOFF2** font rather than load the entire catalog. Do not mix the two strategies within the same UI unless the requirements change.

## Usage and compatibility

```js
import { createIcon } from '../icon/icon.js';
button.append(createIcon('pencil'));
```

The legacy semantic aliases (`panel-left`, `table-2`, `pencil`, `ellipsis`, `pin-off`, etc.) remain supported so existing components are unchanged. The module carries the exact original SVG path contents from Google's Material Symbols Rounded catalog, with a shared `viewBox="0 -960 960 960"`.

All interactive elements must keep their own accessible labels. Decorative SVGs are `aria-hidden`; icon color/size belong to the component CSS rather than individual inline path colors.

## License and updates

Copyright Google LLC. Material Symbols are licensed under **Apache License 2.0**, included as `src/ui/icon/apache-2-license.txt`. Source: https://github.com/google/material-design-icons/tree/master/symbols/web. The mappings are locally versioned to avoid unreviewed icon changes.

To add an icon: download its official `symbols/web/{symbol}/materialsymbolsrounded/{symbol}_24px.svg`, verify the 960-unit viewBox, put its inner SVG geometry in `material-symbols.js`, and retain the public alias in `createIcon` call sites. Do not draw replacements manually or add a competing icon system.
