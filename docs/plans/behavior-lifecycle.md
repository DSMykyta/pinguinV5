# Native behavior lifecycle — план адаптації

**Дослідження:** [legacy behaviors](../legacy-behavior-research.md).

**Мета:** зберегти ідею незалежних шармів і скоротити дублювання коду зняття listeners без нового framework.

**Межі:** тільки Tooltip та navigation gestures; native AbortController на екземпляр; без змін UI, Shell, manifests або бізнес-логіки. Зовнішні таймери/frames/pointer capture очищаються явно.

- [x] Перевірити tooltip dispose перед pending show, події після dispose, повторний mount та повторний dispose у native iframe.
- [x] Зберегти lifecycle-регресії navigation adapter та перевірити два екземпляри на спільному document.
- [x] Замінити парні add/remove й масив disposer-функцій на native abortable listeners у двох існуючих реалізаціях.
- [x] Прогнати naming, Node tests, build і повний browser suite; звірити source/bundle delta з базовою версією.
- [x] Зберегти docs та адаптацію у work через expected head, зберігаючи паралельну роботу.

## Результат

2026-11-08: 29 Node tests, naming та build — PASS. Full Chromium suite — 55/55 PASS: https://github.com/DSMykyta/pinguinV5/actions/runs/42505894390. Два native AbortController замінили дубльоване зняття слухачів; timers/frames/pointer capture очищаються явно. Повторний mount/dispose та незалежність перевірені. Залежностей не додано.

Розмір двох runtime source: 447 → 438 рядків; production JS: 58511 → 58278 байтів, gzip: 20169 → 20164. Це мала економія payload; основний результат — менше парного lifecycle-коду та документована карта повторного використання.
