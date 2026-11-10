# Pinguin Next — semantic colors (tone × appearance)

**Рішення 2026-11-10.** Реалізація у гілці `work`. Джерело колірних ролей: `legacy/css/root.css`; чинні компоненти: `src/ui/button`, `src/ui/menu`, `src/ui/dialog`, `src/ui/selection-actions`.

## Причина
Колір дії не є типом кнопки. Спільний колірний контракт зберігає існуючі розміри, складність та анімації й не потребує дублювання стилів в окремих фічах. **Візуальна семантика не виконує бізнес-операцію**: знищення/збереження визначає власник дії. Слова на кнопці не парсяться для обрання кольору.

## Палітра та джерело
Базові кольори відновлено з legacy без заміни поточного `--pg-color-accent` у Shell, Tabs, FAB тощо:

| tone | light base | dark base | призначення |
| --- | --- | --- | --- |
| `main` | `#113855` | `#7bbad4` | головний бренд |
| `secondary` | `#007aff` | `#4da3ff` | синій акцент (збереження/інформаційна дія за рішенням власника) |
| `tertiary` | `#ff5223` | `#ff7a5c` | третинний помаранчевий акцент, не синонім помилки |
| `danger` | `#ef4444` | `#f87171` | видалення, незворотні дії; відповідає legacy error |
| `warning` | `#f59e0b` | `#fbbf24` | попередження, ризик, потреба перевірки |
| `success` | `#10b981` | `#34d399` | успішна/відновлювальна дія |
| `info` | `#3b82f6` | `#60a5fa` | інформаційний статус чи дія |

Всі значення зосереджені в `src/styles/tokens.css`. Кожна роль має `--pg-tone-{name}-base`, `-soft`, `-on-soft`, `-solid`, `-on-solid`. `base` — точний відтінок legacy, `soft` — прозора суміш, `on-soft` — читабельний текст/іконка, `solid` — за потреби темніший за `base` у світлій темі, `on-solid` — контрастний текст. Це навмисно відрізняється від механічного копіювання legacy `on-*`: оригінальний жовтий з білим текстом не досягає WCAG AA для нормального тексту. У темній темі власні контрастні токени, не змішувати світлі й темні значення.

## Публічний контракт
- `tone?: 'main' | 'secondary' | 'tertiary' | 'danger' | 'warning' | 'success' | 'info'` — колірний зміст, `undefined` означає чинний нейтральний/акцентний вигляд.
- `appearance?: 'soft' | 'solid' | 'outline' | 'ghost'` — спосіб нанесення кольору, незалежно від розміру й поведінки.
- На DOM звичайної, компактної, pill, mini, icon кнопки використовуються `data-pg-tone` і `data-pg-appearance`. Візуальним власником лишається **тільки** `src/ui/button/button.css`.
- `setButtonColor(button, { tone, appearance })` з `src/ui/button/button.js` встановлює або очищує обидва атрибути з валідацією; `appearance` без `tone` не допускається.
- `createIconButton({ ..., variant, tone?, appearance? })`: `variant` лишається геометрією, колір задається окремо. Заданому `tone` без `appearance` відповідає `ghost` для icon.
- `createMenu({ items })` підтримує `{ label, value, danger?, tone?, appearance? }`: `danger: true` зберігається як сумісний аліас `tone: 'danger'`, за замовчуванням `ghost`. При hover небезпечна дія отримує м'який червоний фон. Не перетворювати кожен пункт у заповнений кольоровий прямокутник.
- `createSelectionActions({ single, multiple })` підтримує необов'язкові `tone` і `appearance` для окремої дії. Вибір 0 / 1 / 2+, RevealPanel і ширини header залишаються без змін.
- `showDialog` / `showConfirmDialog`: `destructive: true` завжди малює `danger/solid`; необов'язковий `confirmTone` з `confirmAppearance` застосовують лише до не-деструктивного підтвердження. Старий звичайний primary без явного кольору зберігає старе оформлення. `leftAction` і «Відкинути зміни» — danger/solid.
- Для синього збереження у Tools → Макети даних використано `confirmTone: 'secondary'`. Для bulk-дій: archive=warning/soft, restore=success/soft, delete=danger/soft.
- Чинні `pg-button--destructive` та старий Menu `danger` зберігають сумісність; міграція не створює нового компонента.

## Правила каскаду
- Колірні ролі не змінюють `display`, розмір, padding, border-radius, позицію, анімацію, focus target і scroll.
- `soft`: м'який фон + контрастний текст; `solid`: контрастна заливка + текст; `outline`: контур + текст, soft на hover; `ghost`: прозорий фон + кольоровий текст, soft на hover. Для mini active/pressed/open залишати видимий стан.
- `disabled` не активує hover. `focus-visible` лишається доступним. `prefers-reduced-motion` використовує існуючі налаштування кнопок.
- Ніяких `!important`, глобального перефарбування всіх елементів, змін `--pg-color-accent` без окремого рішення та CSS у `src/features` чи `src/ui/menu` для вигляду кнопок.
- Колір не є єдиним носієм змісту: текст і ARIA мають лишатися зрозумілими. Контраст нормального тексту — щонайменше 4.5:1 на фактичних поверхнях, перевірити light/dark, idle/hover.

## Сумісність і перевірка
1. За відсутності `tone` усі чинні компоненти мають зберігати попередній вигляд; виняток — `pg-button--destructive` переводимо на контрастний глобальний danger.
2. Перевіряти semantic tokens light/dark, наявні Dialog/Menu/SelectionActions/mini та небезпечний hover, збереження кольору при швидкій зміні вибору; чекати доступного focus і disabled.
3. `npm run check`, `npm run test:e2e`, браузерний огляд light/dark. GitHub commit ≠ локальний запуск тестів ≠ browser QA.
4. Фізичні межі компонентів не змінюються. Окремих FAB, Menu, Confirm, Toast, інструментальних макетів та анімацій не додавати.
