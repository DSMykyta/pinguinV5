# Rotating Placeholder — опційна історія введень

**Контракт:** [shared Input](input.md), [Field](field.md), [LEGO conventions](../conventions.md). Усі зміни лише у гілці `work`. Rotating Placeholder — незалежна opt-in поведінка, **не другий Input**.

## Просте підключення

```html
<label for="feature">Ознака товару</label>
<input id="feature" name="product-feature" autocomplete="on" data-pg-rotating-placeholder>
```

Рівнозначний JS API для наявного `createInput`:

```js
createInput({ label: 'Ознака товару', name: 'product-feature', rotatingPlaceholder: true });
```

**Нічого не писати в `placeholder` чи в атрибуті `data-pg-rotating-placeholder`.** Цей атрибут лише вмикає локальну історію. Поки історії немає, текст і анімація **не з'являються**. Інпути без атрибута не зачіпаємо.

### Додаткові необов'язкові параметри

- `data-pg-placeholder-history="product-feature"`: перевизначає ключ історії; за замовчуванням це стабільний `name`. Для структур `products[0][feature]` і `products[1][feature]` індекс нормалізується, щоб значення одного типу могли перевикористовуватися. Під `[data-pg-module]` ім'я додатково ізолюється за ID модуля. За відсутності ключа функція не монтується.
- `data-pg-placeholder-interval="5200"`: час між словами; допустимо 2400–20000 мс, типово **5200 мс**. Тривалість CSS-переходу — **840 мс**.
- `data-pg-placeholder-save="submit"` або `createInput({ rotatingPlaceholder: true, placeholderSave: 'submit', ... })`: записувати значення під час native `submit` форми замість звичайного `change`; це підтвердження наміру відправити, а **не гарантія успішної відповіді сервера**. Для збереження **після** успішної серверної операції власник модуля сам викликає `saveInputPlaceholderHistory(key, value)`; стандартний режим — `change` для локальних редакторів.
- `setRotatingPlaceholdersPaused(true/false)`: спільний програмний вимикач автоматичного руху, який можна прив'язати до вже існуючих налаштувань доступності; не додаємо нову кнопку в Shell.
- `refreshRotatingPlaceholder(input)`: синхронізує візуальну підказку після програмного `input.value = …`. Стандартний `Input.setValue()` викликає його сам.

`autocomplete` — власний браузерний механізм. Сайт **не може** прочитати приховану історію браузера; власна історія поповнюється після належної події у поточному сайті.

## LEGO-власники

- `src/ui/input/placeholder-history.js`: дані та локальне сховище — `getInputPlaceholderHistory()`, `saveInputPlaceholderHistory()`, `removeInputPlaceholderHistoryValue()`, `clearInputPlaceholderHistory()`, `subscribeInputPlaceholderHistory()`. Інша частина UI не залежить від формату `localStorage`. Дані обмежені 12 унікальними значеннями до 100 символів; помилки сховища не блокують ввід.
- `src/ui/input/rotating-placeholder.js`: одна поведінка на input, один спільний `IntersectionObserver` і один планувальник для всіх активних видимих інпутів, спільні делеговані listeners. Немає `setInterval` чи DOM-обгорток у полів без збережених підказок. CSS анімує лише трансформацію/прозорість слова, не розміри input.
- `mountRotatingPlaceholder(input)` повертає cleanup; `mountRotatingPlaceholders(root)` підключено один раз в `src/main.js` та монтує також нові HTML поля через локальний MutationObserver. При демонтажі очищує listeners, observer, timer і DOM; повторне монтування не створює дублікати.
- `src/ui/input/input.js` залишає native `input.value`, label і slots з `createFieldFrame()` без змін. Немає імпортів із Shell або features.

## Коли анімація працює

Значення існує; поле порожнє й не у фокусі; поле видиме в viewport; вкладка браузера видима; немає `disabled`/`readOnly`; не активовано pause, hover або `prefers-reduced-motion`. За одного значення підказка статична. При наведенні або системній зменшеній анімації вона стає статичною, при focus зникає. Автоматична зміна тексту може бути вимкнена через спільний API паузи; перед повноцінним релізом сторінки з нескінченним рухом власник має надати доступний користувачу спосіб керування цим станом.

Довгі фрази обрізаються CSS і не впливають на геометрію. Нативний placeholder, якщо явно переданий, не замінюється при порожній історії. `aria-hidden="true"` на декоративному шарі не анонсує кожну фразу; доступна назва лишається label.

Інші вкладки цього origin отримують оновлення через browser `storage`. Видаляти помилкові фрази можна через `removeInputPlaceholderHistoryValue(key, value)`, очищувати конкретний ключ — `clearInputPlaceholderHistory(key)`.

## Приватність

Вмикати **лише для несекретних** текстових значень; password, email, tel, url не збираються. За `autocomplete` із категоріями паролів, платіжних, адресних та ідентифікаційних полів механізм також вимкнений. Для чутливого довільного `type="text"` власник форми **не повинен** додавати opt-in. Історія зберігається **тільки локально в браузері**, не синхронізується з акаунтом і не надсилається на сервер. При спільному браузерному профілі записи можуть бути доступні іншим користувачам.

## Перевірки

Unit: нормалізація ключів, видалення, ліміт, помилки storage і повідомлення про зміну. Browser: перший ввід/дві фрази/reload; native HTML і програмний Input; видимість і зупинка; reset/submit; інші вкладки; 1000 полів без зайвого DOM; cleanup/remount; native autocomplete та keyboard; reduced motion. Збірка, CI і візуальна перевірка повідомляються **окремо** і не вважаються пройденими без фактичного запуску.

Довідка: [MDN autocomplete](https://developer.mozilla.org/en-US/docs/Web/HTML/Attributes/autocomplete), [MDN IntersectionObserver](https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API), [MDN storage event](https://developer.mozilla.org/en-US/docs/Web/API/Window/storage_event), [WCAG Pause, Stop, Hide](https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide.html).
