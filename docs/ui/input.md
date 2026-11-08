# Pinguin Next — Input / Search field

**Статус:** універсальний компонент для гілки `work`; реалізуємо окремо від Shell. Див. [базу UI](overview.md) та [канонічні конвенції](../conventions.md).

## 1. Дизайнерський запит

Власник просить чисті, компактні поля з **label усередині поля**, який **при наведенні, фокусі або наявності значення** переміщується вгору та стає меншим. Це не обов'язковий патерн для кожного типу: **пошук** має піктограму лупи всередині, необов'язковий placeholder і **не має floating label**. Для довгих форм потрібен звичайний постійний підпис.

Тестова галерея розміщується **тільки в робочій області вкладки «Текст»** поруч з Dialog demo; жодних змін геометрії Shell, його header search, aside, tabs або sidebar.

## 2. Дослідження, порівняння й рішення

| Джерело | Принцип | Рішення Pinguin |
| --- | --- | --- |
| [Material Web — Text Field](https://github.com/material-components/material-web/blob/main/docs/components/text-field.md) | Floating label піднімається при focus/введеному значенні, залишається пов'язаним із input | `floating`: один реальний `<label for>`, підпис не зникає |
| [Material Design — text fields](https://m2.material.io/design/components/text-fields.html) | Плаваючий підпис і чітка focused/filled геометрія | Розміри та інтервали узгоджені з Pinguin, не копіюємо Material look |
| [Apple HIG — Text fields](https://developer.apple.com/design/human-interface-guidelines/text-fields) | Лаконічні поля, відповідна ширина, збереження контексту підпису | Нейтральні поверхні, 1 акцент для focus, передбачуваний Tab |
| [Apple HIG — Search fields](https://developer.apple.com/design/human-interface-guidelines/search-fields) | Search icon, placeholder, очищення, пошук у контексті | `search`: іконка на початку, необов'язковий placeholder, кнопка очистки |
| [Radix Themes — Text Field](https://www.radix-ui.com/themes/docs/components/text-field) | Спільна root+slots; послідовні size/variant | Єдина реалізація та slot для стандартної SVG лупи |
| [Adobe Spectrum — Text field](https://spectrum.adobe.com/page/text-field/) | Видимий label, допоміжний та error-тексти, responsive, validation | `standard` — label над полем; error не позначається лише кольором |
| [Baymard — Mobile forms](https://baymard.com/research-articles/mobile-forms-avoid-inline-labels) | У довгих формах окремі labels надійніші; floating не універсальний | `floating` не використовується примусово на кожному полі |
| [GOV.UK — Text input](https://design-system.service.gov.uk/components/text-input/) | Placeholder не підміняє label; avoid `type=number` без потреби | Навіть search має прихований, але програмно пов'язаний label; не робимо input number типом за умовчанням |
| [MDN — placeholder](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Attributes/placeholder) | Placeholder зникає, може бути недоступним для screen reader | Підказка необов'язкова; назву завжди задає label |
| [Apple-inspired implementation principles](https://developer.apple.com/design/human-interface-guidelines/) | Оптичні відступи, скромні контури, рух зі змістом | Без декоративних градієнтів, непотрібних тіней, великих pill для кожного поля |

**Свідомий виняток з Material:** власник прямо просить підняття label також при **hover**. Реалізувати **лише** на вказівниках із `(hover: hover)`; клавіатура/тач одержують таку саму інформацію через фокус. Після втрати hover порожнє неактивне поле повертає підпис у центр. При заповненому полі підпис **завжди** залишається вгорі; не змішуємо текст з підписом. Hover не запускає focus, не відкриває клавіатуру й не змінює значення.

## 3. Компоненти й контракти

- `src/ui/input/input.js`: `createInput(options)` → `{ element, input, getValue(), setValue(value), setError(message), focus(), destroy() }`.
- `src/ui/input/input.css`: повна ізоляція стилю.
- `src/styles/tokens.css`: нейтральні поверхні, бордюри та колір помилки для обох тем.
- `src/features/tools/input-demo.js|css`: тимчасова галерея для реальної роботи з полями у вкладці «Текст».
- `tests/e2e/input.spec.js`: browser сценарії з клавіатурою, hover, заповненням, темою, мобільним viewport, error та clear.

`createInput({ label, name?, id?, variant='floating', type='text', value='', placeholder?, required?, disabled?, readOnly?, autocomplete?, inputMode?, description?, error?, clearable?, onInput?, onChange? })`.

`label` обов'язковий і для `search`, але в нього label прихований візуально (не `display:none`). Режими:
- `floating` — label всередині 56px поля, угору при hover, `:focus-within`, непорожньому значенні, автозаповненні; placeholder у спокої прихований, а при піднятому підписі може бути показаний.
- `standard` — видимий статичний label **над** 44px полем; placeholder необов'язковий. Для довгих, складних та формальних форм.
- `search` — 44px поле `type='search'` із вбудованою лупою, **без плаваючого підпису**, placeholder необов'язковий; є доступна кнопка очистки для непорожнього вводу (типова поведінка).

## 4. Геометрія, взаємодії та стани

- Ширина — 100% від батьківського блока, без примусового розтягування Shell. Border 1px, radius 10px (окремо з UI-токенів), горизонтальні відступи 14px. Focus ring чіткий, не неоновий.
- Колір тексту: primary; label/placeholder: secondary/muted; hover: border-strong; focus: focus; error: semantic error; disabled: muted та поверхня soft. Контраст не залежить від прозорості підпису.
- Floating label: зі стандартних 14px → 11px, із центру → верхня позиція; transition тільки transform/font-size/color (≈150ms); `prefers-reduced-motion` вимикає анімацію. Поле під значення має стабільну нижню лінію тексту, щоб введення не стрибало.
- За потреби можна задати `description` або `error` під полем, їхні ID додано в `aria-describedby`; для error — `aria-invalid=true` та текст, **не тільки червона рамка**. Опис та помилка керуються самостійно.
- Нативні `required`, `disabled`, `readOnly`, `autocomplete`, `inputMode`; введення, виділення, copy/paste та browser autofill не перехоплюються.
- Clear — справжній `button type=button`, з `aria-label='Очистити поле …'`, клавіатурно доступний, прихований якщо поле порожнє/disabled/readOnly. При натисканні очищує значення, dispatch `input` та `change`, повертає фокус у поле.
- Значення, видиме з `setValue`, стан і `getValue` мають спільне джерело — native `input.value`. DOM не підмінюємо фальшивим редактором.
- Ідентифікатори `id` генеруються лише за відсутності переданого `id`; зовнішня форма одержує нормальний `name`.
- Поля показуються в обох темах та на мобільних ширинах; label clipping на довгих словах контролюємо.

## 5. Не робимо в цій фазі

- Не міняємо **global header search**: це окремий Shell-пошук із точно погодженою шириною, мобільним згортанням та власною навігацією. Універсальний search готовий для майбутньої міграції за окремим рішенням.
- Не вводимо `Textarea`, `Select`, `Checkbox`, складні маски й асинхронну валідацію під виглядом готового Input.
- Не переміщуємо hover підпис за межі поля і не покладаємося лише на placeholder.
- Не копіюємо legacy CSS/DOM автоматично.

## 6. Критерії приймання

1. `npm run check` та `npm run test:e2e`, код ізольований, правила іменування дотримані.
2. Label у `floating` піднімається при hover, focus, введенні; лишається при blur filled; повертається при blur empty.
3. `search` має лупу, не плаває, placeholder може бути або ні, очищення доступне.
4. Label пов'язаний із native input; error доступний через `aria-describedby`/`aria-invalid`, clear із клавіатури; кнопки не перекривають текст.
5. Теми, autofill, мобільний viewport, long label, `prefers-reduced-motion` і приховані вкладки не ламають UI.

## Уточнення visual contract 2026-11-08

The shared `src/ui/field` now owns the outlined label geometry. Floating label moves from the inside of an empty field **onto the top border** and rests there while focused or filled. A surface-backed notch is visible behind it. Input, Select, Combobox and Tag Field use one outline. `leading` / `trailing` DOM slots let an Input contain arbitrary icons, text, units, or buttons without moving the label or duplicating CSS. Standard and search variants retain their accessible separate patterns. See [field.md](field.md).
