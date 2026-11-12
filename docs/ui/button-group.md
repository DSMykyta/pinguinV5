# Button Group — Material 3 Expressive

**Компонент:** `src/ui/button-group/`. **Власник:** спільний UI. **Місце в застосунку:** вкладки `createTabs()` і майбутні групи дій. **Статус:** реалізація `work`.

## Дослідження й відповідність

- [Google Material 3 — Button groups](https://m3.material.io/components/button-groups/overview); [Specs](https://m3.material.io/components/button-groups/specs).
- Material 3 Expressive розрізняє `standard` та `connected`. `standard` має проміжки **18/12/8/8/8 px** для XS/S/M/L/XL; `connected` — **2 px** для всіх розмірів. Висоти: **32/40/56/96/136 px**. Connected має внутрішні кути **4/8/8/16/20 px**, округлі зовнішні краї у формі `round`, вибрана кнопка набуває форми pill. XS/S мають ціль натискання щонайменше 48 px.
- Погоджений вигляд вкладок «Інструменти»: `connected`, `ghost`, `round`, `s`. **Неактивні кнопки прозорі**, активна залита чинним `--pg-color-selected`, без нової Material-палітри. Не додавати фон/рамку для контейнера чи нову робочу область.
- Інші групи можуть мати вигляд `tonal` (заливка всіх кнопок), `filled` (виразна заливка), форму `square` або `round`; без нових CSS-скінів у features.
- `standard` використовує власні проміжки й плавні press/selection-трансформації. `connected` не пересуває сусідні кнопки при виборі; ідентифікатори та розміри зберігаються.

## API

- `configureButtonGroup(element, { variant = 'connected', appearance = 'ghost', shape = 'round', size = 's' })` — налаштовує існуючий контейнер (наприклад `role=tablist`) без нового DOM чи стану. Кнопки всередині повинні мати базові класи `pg-button pg-button--group`. Не призначає ролей, listeners або selected-state.
- `createButtonGroup({ label, items, variant, appearance, shape, size, selection = 'single', required = true, value, onChange })` — незалежна група кнопок з `role=group`; `items = [{ id, label, icon?, iconOnly?, disabled?, onClick? }]`. `selection` — `single`, `multiple`, `none`. Нативні `button`/Enter/Space; стан `aria-pressed` лише для selectable. `onChange(nextValue)` викликається тільки внаслідок дії користувача. `setValue(nextValue)` змінює стан без callback; `getValue()`, `destroy()`.
- `appearance = 'ghost' | 'tonal' | 'filled'` визначає заливку, а `shape = 'round' | 'square'` — зовнішні/внутрішні кути. `variant = 'connected' | 'standard'`. `size = 'xs' | 's' | 'm' | 'l' | 'xl'`.

## Межі та повторне використання

- `src/ui/button/button.css` — **єдиний власник кольору й skin кнопок**, включно з selected/hover/pressed/disabled.
- `src/ui/button-group/button-group.css` — **тільки компонування групи, проміжки, кутові форми та розмірні токени**.
- `src/ui/tabs/tabs.js` повторно використовує `configureButtonGroup()`; `tabs.css` не дублює оформлення кнопок. `createTabs()` продовжує володіти `role=tab`, `aria-selected`, незалежними `tabpanel`, клавішами стрілок та єдиною анімацією входу панелей.
- `src/ui/segment-switch` залишається для короткого радіоперемикача «Редактор/HTML» із власною рухомою пластиною. Button Group **не замінює** цю наявну механіку й не створює другу пластину.
- Теми використовують існуючі `--pg-color-*`; скриншот із фіолетовою палітрою — референс **геометрії**, не вибір палітри.

## Перевірки

1. У `/tools`: п'ять вкладок у row під H1, connected gap 2 px, неактивні прозорі, активна з заливкою; кути першої/середніх/останньої; після кліку ARIA та панель змінюються, keyboard і aside працюють.
2. У `createButtonGroup`: стандартні проміжки та filled/tonal/ghost, інші форми, одиночний/множинний вибір, обов'язковий вибір, disabled; незалежні екземпляри.
3. У dark theme кольори беруться з tokens; `prefers-reduced-motion` прибирає переходи, focus-visible доступний.
4. На вузькому екрані горизонтальний скрол обмежений слотом Shell; вкладки не обрізаються і не перенесені до Sidebar.
5. `npm run check` та `npm run test:e2e` — виконати у репозиторії; якщо локального checkout немає, **не вважати їх пройденими**.
