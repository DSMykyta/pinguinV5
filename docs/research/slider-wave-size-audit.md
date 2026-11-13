# Узгодження розмірів Slider, Wave Progress, Checkbox та Mini Button

Дата: 2026-11-13. Ціль: `work`. Пряма вимога: ручка як компактні контроли; активна доріжка товща за 10px неактивну; всі параметри геометрії через централізовані CSS-змінні; кольори визначаються роллю компонента.

## Джерела в проєкті до змін

| Елемент | Видима висота до | Взаємодія до | Власник |
| --- | ---: | ---: | --- |
| Checkbox | 24px | 32px | `--pg-checkbox-box-size`, `--pg-compact-control-size` |
| Mini Button | 32px | 32px | `--pg-compact-control-size` |
| Slider handle | 44px (width 4px) | 48px | Literal у `slider.css` |
| Slider active track | 16px | 48px | Literal у `slider.css` |
| Slider inactive track | 16px | 48px | Literal у `slider.css` |
| Wave active | 10px маска | неінтерактивний | Literal у `wave-progress.css` |
| Wave rest | 4px | неінтерактивний | Literal у `wave-progress.css` |

Інтервал `--pg-space-1` = 4px, `--pg-space-4` = 16px, `--pg-space-12` = 48px; у проєкті вже існує 32px `--pg-compact-control-size`. Поточний колір Wave — `--pg-tone-main-base` (синій), а Slider — `--pg-color-accent` (зелений); тому вони не збігалися.

## Стандарт та відхилення

- [Material 3 Slider](https://m3.material.io/components/sliders/specs) / [таблиця токенів](https://tokencatalog.dev/md3/components/sliders/sets/all) використовує для XS 16dp track і 44dp handle, width 4dp.
- [Android touch target](https://support.google.com/accessibility/android/answer/7101858) радить дотикову область 48dp, навіть якщо видима частина менша.
- **Рішення за прямою вимогою користувача**: видима ручка Slider 32px, рівно як Mini Button та hit Checkbox; залишається 48px нативна зона `input[type=range]`. Active = 16px, inactive = 10px. Зберегти gap = 6px та thumb width 4/2px.

## Єдині CSS токени

- Shared size: `--pg-compact-control-size`, `--pg-space-1`, `--pg-space-4`, `--pg-space-12`.
- Slider role: `--pg-slider-hit-size`, `--pg-slider-handle-height`, `--pg-slider-handle-width`, `--pg-slider-handle-pressed-width`, `--pg-slider-track-active-height`, `--pg-slider-track-inactive-height`, `--pg-slider-handle-gap`, `--pg-slider-dot-size`.
- Wave role: `--pg-wave-period`, `--pg-wave-height`, `--pg-wave-container-height`, `--pg-wave-rest-height`, `--pg-wave-gap`, `--pg-wave-duration`, `--pg-wave-indeterminate-duration`.
- Wave progress paint: `--pg-color-progress-active`, `--pg-color-progress-inactive` — alias до `--pg-color-accent`, `--pg-color-accent-soft`; Slider та інші інтерактивні елементи використовують ті самі зелені відтінки.
- SVG data URI містить безрозмірний `viewBox` і числові координати кривої; вони **не є CSS pixel-значеннями**. Реальні pixel sizes керуються тільки токенами (период/маска/швидкість).
- `step` в `createSlider` (наприклад 1 або 0.5) є **кроком даних нативного input**, а не дизайнерським геометричним кроком. Його не слід замінювати CSS var.

## Межа рефакторингу

Таблиця відображає пов'язані компоненти. У репозиторії є 59 CSS-файлів у `src/`; загальний рефакторинг усіх їхніх літералів без оцінки семантики змінить сотні не пов'язаних елементів. Тут змінюються лише **централізовані параметри Slider та Wave Progress**, без альтернативної реалізації контролів. Не міняти global Checkbox, Mini Button, Shell, Range JS logic, focus/accessibility.

## Приймання

1. 32px видима ручка, 16px active, 10px inactive, 48px нативний hit target. Горизонтальні зазори 6px без зсуву геометрії на 0, 50, 100% та pressed.
2. Wave і Slider мають однакову зелену палітру активної та неактивної частин у світлій і темній темах. Підписи й відсотки використовують спільні текстові токени.
3. У `slider.css` та `wave-progress.css` **жодних локальних геометричних px-літералів**, лише `var(--pg-...)`/обчислення від токенів. Єдине джерело чисел — `tokens.css`.
4. Покриття Playwright, screen mobile, RTL, pointer, keyboard, forced colors та reduced motion. Існуючий `setButtonLoading` не змінений.


## Повна інвентаризація CSS у src/ (після інтеграції)

Метод: Git tree `work` → усі 59 файлів `src/**/*.css` → підрахунок збігів /(?:\\d+(?:\\.\\d+)?)px\\b/ після видалення CSS-коментарів. Це **інвентаризація літералів**, а не вимірювання computed geometry чи автоматичний дозвіл на заміну.

- У всіх 59 CSS-файлах знайдено **896** входжень `px`.
- Із них **30** знаходяться у `src/styles/tokens.css`, де фактичні числові значення токенів є коректними.
- **866** входжень залишаються поза центральним файлом токенів. Вони охоплюють також межі media query, бордери, shadows, іконки та інші непов'язані геометричні величини.
- `src/ui/slider/slider.css`: **0** буквальних `px` у правилах (всі розміри зі спільних токенів).
- `src/ui/wave-progress/wave-progress.css`: **0**.
- `src/features/tools/wave-progress-demo.css`: **0**.
- Для цих трьох файлів додано `tests/progress-tokens.test.js`, що забороняє повернення локальних `px`.

Найбільше буквальних CSS-пікселів поза токенами:

| CSS-модуль | Кількість |
| --- | ---: |
| `src/ui/button/button.css` | 94 |
| `src/ui/dialog/dialog.css` | 69 |
| `src/ui/collection-view/collection-view.css` | 68 |
| `src/shell/aside/aside.css` | 40 |
| `src/ui/field/field.css` | 37 |
| `src/shell/aside/fab.css` | 33 |
| `src/ui/listbox/listbox.css` | 30 |
| `src/ui/checkbox/checkbox.css` | 27 |
| `src/ui/toast/toast.css` | 27 |

**Безпечний принцип для решти проєкту:** (1) окремо класифікувати margin/padding, control geometry, border, typography, decorative effects та media breakpoints; (2) віднайти канонічну роль або ввести рольовий токен у `tokens.css`; (3) замінювати тільки семантично тотожні числа в owner CSS; (4) перевіряти computed geometry та інтеракції до/після. Не перетворювати, наприклад, `1px` border та `1px` зсув тексту на один глобальний токен тільки тому, що число рівне.

Ця задача виконала переведення на токени саме **Slider, Wave Progress і їхній демо-макет**. Перебудова інших 56 CSS-модулів без окремого контролю геометрії змінить працюючі інтерфейси; глобальна інвентаризація не означає, що вони вже мігровані.
