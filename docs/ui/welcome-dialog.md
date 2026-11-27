# Вітальний Dialog Pinguin V6

- Стандартний native Dialog, edge-to-edge, `showClose: false`: без рамки, заголовка, футера або кнопок, Escape і клік поза вікном закривають його.
- Вхід через `/` показує вітання один раз за сесію вкладки. `/tools` → «Таблиці» → «Вітання Pinguin V6» відкриває його повторно.
- `src/ui/animated-gradient` — незалежні синє та помаранчеве поля з fixed brand tokens. WAAPI змінює transform і opacity, `updatePlaybackRate` змінює швидкість без стрибка фази. При прихованій вкладці чи reduced motion анімація паузиться; при закритті — скасовується.
- CloudGradient WebGL не змінено. Vercel не потрібен. Перевірки: `npm run check` і `npm run test:e2e -- tests/e2e/welcome-dialog.spec.js`.
