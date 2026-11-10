# Shared icon and mini buttons — canonical contract

**Рішення 2026-11-10.** Джерело: `legacy/css/components/buttons/button-icon.css` (`.btn-icon`) і `legacy/css/components/forms/checkbox.css`. Споживач: `work/src/ui/button/button.css`. Це адаптація до чинних токенів, не копія CSS з `legacy`.

## Дослідження legacy

- `.btn-icon`: **32×32px**, `border: none`, `border-radius: 50%`, прозорий фон у спокої, іконка **16px**. `hover` і `.active`: акцентний фон (`color-mix(... main 20%, transparent)`), акцентний колір і м'яка тінь `0 2px 8px`. Базові кнопки стискаються до `scale(.98)` при натисканні.
- Legacy-checkbox: **24×24px** видимий квадрат, на hover та checked округлюється до кола. Це **input**, не button.
- Старий варіант `work` mini (квадрат 20×20px усередині 28×28px) **скасований**. Не відтворювати цей варіант у feature CSS або у Menu.

## Новий єдиний контракт

- `.pg-icon-button` лишається великим спільним контролом (його геометрію не змінюємо). `.pg-mini-button` — **існуючий модифікатор** того самого `createIconButton()` або `createMenu().trigger`, не нова фабрика.
- `pg-mini-button`: кругла інтерактивна ціль **32×32px**; без видимого border/background у спокої; іконка **16px** через спільне `.pg-icon` із `createIcon()`. Hover: коло, фон `color-mix(in srgb, var(--pg-color-accent) 20%, transparent)`, `color: var(--pg-color-accent)`, м'яка тінь через `--pg-color-shadow`. Active/open/pressed утримує чітку акцентну індикацію. Focus-visible має доступний outline. Disabled не показує активного hover.
- `pg-checkbox`: visible box **24×24px**, unchecked квадрат зі скругленням, checked/mixed — коло з відміткою або мінусом; `compact: true` — **32×32px** зовнішній target, центрована видима частина. Загальні поля форм зберігають нормальний 44px рядок. Checkbox має реальний `input type=checkbox`, працює Space та має native `indeterminate`.
- Ці контролі узгоджені за **зовнішнім розміром** у таблиці, заголовку та плитках; жодного копіювання в `src/features`, Shell або CSS Menu. Порядок checkbox→Edit, Menu в останньому стовпці, вибір 0/1/2+ та пагінація не змінюються.

## Перевірка

Playwright: однакова геометрія 32×32px mini і компактного checkbox; видимі 24×24px чекбокси; hover колір/фон/тінь; menu open/close, focus-visible, dark theme, reduced motion, table→tiles; незмінні наявні E2E вибору. Запустити `npm run check` і `npm run test:e2e`. Зелений CI не підтверджує візуальну оцінку без браузерного огляду.
