# Rotating Placeholder — опційна поведінка Input

**Статус:** opt-in для `work`. Затверджені постійні labels залишаються над полем; це анімація лише допоміжного тексту **всередині** порожнього input. Основний контракт: [field.md](field.md), [input.md](input.md), [conventions.md](../conventions.md).

## HTML-контракт

```html
<label for="product-feature">Ознака товару</label>
<input id="product-feature" name="product-feature" type="text" autocomplete="on"
  data-pg-rotating-placeholder="Sugar Free | Time Release | Vegan Formula"
  data-pg-placeholder-history="product-feature"
  data-pg-placeholder-interval="2500">
```

- `data-pg-rotating-placeholder` — **єдиний перемикач**. Немає атрибута → немає монтажу, анімації, зберігання або змін у полі. Значення — фрази через `|`. Порожнє значення дозволяє використовувати тільки накопичену історію, якщо задано history key.
- `data-pg-placeholder-history` — необов'язковий явний ключ історії для **цього виду даних**, наприклад `product-feature`. Без нього нічого не зберігається. Історія прив'язана до origin браузера та ключа.
- `data-pg-placeholder-interval` — необов'язкові мілісекунди (мінімум 1200, максимум 10000, типово 2600).
- `autocomplete="on"` — **незалежний нативний механізм** браузера; його не вимикаємо, не підмінюємо і не читаємо його приватну історію. Браузер може не показувати підказки залежно від форми та налаштувань.
- Опція `createInput({ rotatingPlaceholder: ['Sugar Free', 'Time Release'], placeholderHistoryKey: 'product-feature', placeholderInterval: 2500 })` задає таку саму поведінку через JS, для вже наявного спільного Input.
- `mountRotatingPlaceholder(input)` для одиничного HTML input і `mountRotatingPlaceholders(root)` для динамічно доданих полів; другий API підключається один раз у `src/main.js` і спостерігає лише явні opt-in поля. Обидва повертають функцію cleanup.

## Поведінка

1. Відсутність значення: слова циклічно рухаються «поточне вниз, наступне зверху» без змін висоти поля або сусідніх елементів.
2. Фокус, введення, autofill і непорожнє значення: підказка прихована, нативний input працює без перехоплень клавіатури, caret, IME, paste й форми.
3. Зняття фокуса з порожнього поля: підказка повертається; з непорожнього — зникає.
4. `change` завершеного введення записує непорожнє значення **тільки** за явного history key; не при кожній клавіші та не при `setValue()`. Підказки використовують історію поточного ключа разом із заданими прикладами. Історія — останні 12 унікальних значень до 100 символів, `localStorage` ключ `pg:v1:input-placeholder-history:<key>`.
5. Не збирати паролі, платіжні, персональні або інші чутливі поля. Ключі історії лише для несекретних категорій (наприклад ознака товару). Для очищення є `clearInputPlaceholderHistory(key)`.
6. `prefers-reduced-motion` показує першу доступну підказку без анімації/циклу. При прихованій сторінці рух зупиняється. Overlay `aria-hidden=true` і `pointer-events:none`; реальна назва — статичний `label`. Помилки сховища не впливають на введення.
7. `destroy()`/unmount прибирають таймери, слухачі, overlay і DOM-обгортку (якщо її створювали). Кілька полів не ділять DOM/таймер.

## Межі

Це **не** доступ до історії browser autocomplete. Сторінці доступне лише поточне значення після вибору підказки. Старі збережені підказки браузера прочитати або імпортувати неможливо. Якщо потрібен випадаючий список з **власної** історії, це окрема свідомо ввімкнена функція; не додаємо дубль наявного Combobox.

Використані джерела: [MDN autocomplete](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Attributes/autocomplete), [MDN input](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/input), [MDN prefers-reduced-motion](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion) і [дослідження шармів legacy](../legacy-behavior-research.md).

## Перевірки

Unit: нормалізація і зберігання історії, дублікати, лиміти, пошкоджені/недоступні storage. E2E: opt-in vs звичайний input, рух, фокус, ввід, browser autocomplete незмінний, зміни значення після blur, перезавантаження, незалежні ключі, приховане поле, reduced-motion, cleanup та динамічна HTML вставка. Повний CI/браузерний прогін вважати підтвердженими тільки після фактичного виконання.
