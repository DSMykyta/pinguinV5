# Motion Physics — простір і ефекти в Pinguin Next

**Гілка:** `work`. **Початок застосування:** 2026-11-12. **Джерело:** [M3 motion physics](https://m3.material.io/styles/motion/overview/how-it-works).

## Контракт

Material 3 розділяє рух на **spatial** (позиція, розмір, обертання, радіус) і **effects** (колір, opacity), а також швидкості fast/default/slow. Для робочого desktop UI використовуємо **стриманий standard-style motion**, без додавання пружного overshoot у кожний елемент. CSS cubic-bezier — практична апроксимація, не фізичний spring solver.

Власник — `src/styles/tokens.css`:

| Канал | Токени | Призначення |
| --- | --- | --- |
| Spatial | `--pg-motion-spatial-{fast,normal,slow}-duration`, `--pg-motion-spatial-selection-duration` (280 ms), `--pg-motion-spatial-ease` | translate/transform, зміни форми, розмірів, layout |
| Effects | `--pg-motion-effects-{fast,normal,slow}-duration`, `--pg-motion-effects-ease` | color, background, opacity, border color |

Існуючі `--pg-duration-fast`, `--pg-duration-normal`, `--pg-ease`, `--pg-duration-layout`, `--pg-ease-layout` залишаються **alias** на нові токени з тими самими обчисленими значеннями. Це забезпечує backward compatibility без масової зміни 100+ CSS правил.

Міграційні приклади: `button-group` (shape та color — окремі канали), `segment-switch` (рух плашки та колір label), `collection-view` (новий параметр щільності не викликає додаткової анімації).

## Обов'язкові винятки, які зберігають затверджену поведінку

- **FAB (обидва екземпляри):** `src/shell/aside/fab.css` — ті самі анімації і поворот, жодних змін.
- **Toast:** `src/ui/toast/toast.css` — FIFO stack, вихід нижче екрана, тривалість/траєкторія без змін.
- **RevealPanel:** `src/ui/reveal-panel/reveal-panel.css` — ті самі interruptible transitions, напрямок і час; лише inherited legacy aliases.
- **Shell / Section Navigator / плитковий hover:** геометрія й затверджений рух залишаються без змін.
- `prefers-reduced-motion` продовжує працювати через `src/styles/foundation.css` та локальні винятки компонентів.

## Перевірка

1. CSS токени існують і правильні alias значення в light/dark.
2. `ButtonGroup`: радіус/transform — spatial, колір/fill — effects, без зміщення вкладок.
3. `SegmentSwitch`: той самий час/траєкторія рухомої плашки.
4. FAB, Toast, RevealPanel: computed `transition-duration` і `transition-timing-function` не змінюються.
5. `prefers-reduced-motion` — без непотрібного руху; при вимиканні повертається звичайна поведінка.

**Межа:** не створювати другі animation classes у feature, глобальний animation manager чи дублікати місцевих transitions. Нові компоненти використовують виключно токени.
