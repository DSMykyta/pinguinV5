# CollectionView density — компактно та комфортно

**Гілка:** `work`. **База:** [CollectionView](collection-view.md), [затверджені UI-правила](../approved-ui-rules.md), [M3 information density](https://m3.material.io/foundations/layout/grids-spacing/density).

## Семантика

У **кожного екземпляра** `createCollectionView` одне значення `density = 'compact' | 'comfortable'`; початкове **compact** точно повторює поточну геометрію колекції, тож міграція нічого не змінює без вибору користувача.

- **compact:** header та table cell baseline min-height 46 px, padding 8px block / 16px inline, tiles gap 14 px і padding 18 px (mobile overrides збережено).
- **comfortable:** header та table cell baseline min-height 56 px, padding 12px block / 20px inline, tiles gap 20 px і padding 24 px, мінімальна ширина плитки 210 px.
- Це виключно щільність **контенту `CollectionView`**. Header, Footer, Main, Aside, pagination, FAB, поле пошуку, таби та view switch не змінюють геометрії.
- Checkbox / menu продовжують користуватися **тими самими** інстанціями, класами, 44 px sticky-колонками та hit area; компактний режим не стискає існуючі клікабельні цілі. M3 радить 48×48 px для стандартної інтерактивної цілі, але цей режим **не маскує існуючі 32 px icon controls як 48 px**: їхній окремий аудит належить Button/Checkbox.
- Зміна щільності **не** викликає `renderData`, не змінює ID записів, сортування, пошук, вибір, DOM-панелі, активний режим table/tiles, scrollTop та поточну сторінку. Лише CSS vars на кореневому `data-pg-density`.
- Обидва режими застосовуються також до плиток, але без окремого додаткового режиму/стану плиток. Умовно малі медіазображення можуть зробити row вище за minimum — це нормальний intrinsic розмір.

## API

`createCollectionView({ density = 'compact', onDensityChange, ... })`:

- `getDensity(): 'compact'|'comfortable'`.
- `setDensity(next)`: перевіряє значення, ставить `data-pg-density`, не перерисовує дані та не викликає callback для ідентичного значення. Якщо відбулася зміна — `onDensityChange(next)` для оновлення зовнішньої переваги; програмний виклик також синхронізує UI адаптера.
- У `/tools` **наявний** `createCollectionPageControls` створює в Aside `createSegmentSwitch()` «Щільність відображення» з «Компактно» / «Комфортно». Це не новий Button/Control, не нова група header actions і не додатковий Shell.
- `createStoredChoice()` з окремим ключем `<existing-view-storage-key>:density`, незалежним для «Макети даних» і «Медіатека». Значення `view` залишається недоторканим.

## Перевірки

1. Дві вкладки мають **окремі** default/persisted density settings і вкладка/перезавантаження їх не скидають.
2. Для table однакова кількість рядків/checkbox/дій; comfortable вищий за compact; sticky first/second/last columns лишаються на місці.
3. Для tiles комфортний gap збільшується, card tilt та selection працюють; переключення table/tiles не скидає density.
4. Перемикач щільності знаходиться тільки в Aside, без додаткової FAB, нового header button та зміни Shell.
5. Зміна не скидає sort, search, current page чи selected IDs, не робить ре-рендер і не втрачає фокус.
6. Mobile/темна тема та reduced motion — незмінна поведінка.

**Зауваження:** це компонентний контракт, не новий workspace layout mode.
