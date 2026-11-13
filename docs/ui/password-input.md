# Password Input — глобальне парольне поле Pinguin

**Статус:** 2026-11-13, гілка `work`. **Власник:** `src/ui/input/`. Повторно використовує [Input](input.md), [Field](field.md) і спільний `createIconButton()`. **Сценарій:** `/login-demo`.

## Перевірені правила парольних полів

- [W3C WCAG Technique H100](https://www.w3.org/WAI/WCAG22/Techniques/html/H100): native `type="password"`, пов'язаний `label`, `autocomplete="current-password"` для входу, не блокувати пасту та менеджери паролів.
- [NIST SP 800-63B-4](https://pages.nist.gov/800-63-4/sp800-63b.html): запропонувати показ/приховування введеного пароля, дозволити автозаповнення та вставлення. Вимоги до складності/довжини пароля встановлює лише реальний сервер автентифікації; демонстрація їх не вигадує.

## Контракт

`createPasswordInput(options)` повертає той самий інтерфейс, що і `createInput`: `element`, `input`, `getValue`, `setValue`, `setError`, `focus`, `destroy`; додатково `visibilityButton` і `isVisible()`.

Реалізація — **композиція одного наявного Input**, `type="password"`, `clearable:false`, `autocomplete:"current-password"` за замовчуванням. У trailing-slot розташовується **існуючий IconButton mini** з офіційними локальними SVG Material Symbols Rounded `visibility` / `visibility-off`. Натискання перемикає лише native `input.type`, не переписує значення і не надсилає подій форми. `button.type="button"` запобігає submit. При зміні стану іконка та accessible name стають «Показати пароль» / «Приховати пароль». Фокус із клавіатури підтримано; через `Tab` кнопка доступна окремо.

Заборонено дублювати DOM поля, label, рамку, CSS-кнопку, менеджер значення чи власні кольори. Геометрія контрольної поверхні належить Field (40px desktop / 44px touch). Тема, hover, focus і disabled — наявні стилі. Кнопка вимкнена, якщо поле disabled. Секрет ніколи не передається до URL, локального сховища, логів чи будь-якого мережевого endpoint.

## Валідація в демо: помилка в placeholder

Спільний `createInput` підтримує три режими `errorPresentation`: `inline` (типовий для інших форм, текст помилки під полем), `sr-only` (тільки допоміжним технологіям) і `placeholder` (текст помилки у нативному placeholder порожнього поля плюс доступний прихований текст). Останній режим не резервує рядка для підказки, тому поля й кнопка не змінюють позиції.

На `/login-demo` і логін, і пароль використовують `errorPresentation:'placeholder'`, `labelPresentation:'sr-only'`, а звичайні placeholder дорівнюють «Логін» і «Пароль». Саме вони видимі в порожніх полях до спроби входу; семантичні label залишаються для скринридерів. При помилці рамка змінює колір, а у порожньому полі з'являється «Вкажіть логін» або «Вкажіть пароль»; після введення повертається звичайний placeholder. Реальний label і доступні `aria-describedby`, `aria-invalid` та `role=status` зберігаються. Успішне введення **не** означає реальної авторизації: відповідь доступна скринридеру, але не додає видимого блоку.

## Перевірка

`tests/e2e/password-input.spec.js`: поля та toggle; маскування, не втрачаючи введене значення; mouse/keyboard; aria, no submit on toggle; autofill, paste, disabled; теми; фокус і геометрія. `tests/e2e/login-demo.spec.js`: три видимі контролі, немає видимих текстових підказок помилок/успіху, координати без стрибків, підтвердження лише локальне.
