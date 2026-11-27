# Реєстр механізмів Pinguin Next

Єдина карта власників активного коду `work` (без runtime-реєстрації: модулі не залежать від цього документа). Перед будь-якою новою реалізацією знайти за призначенням і синонімами, відкрити чинний API, CSS, тести та відповідний legacy/архів. Розширити наявного власника, якщо семантика збігається. Якщо відрізняється — зафіксувати причину в контракті, зареєструвати новий механізм і перевірити, що він не повторює поведінку або стилі. Реєстр змінюється в тому самому коміті. Власники, а не дублікати фабрик; діючі механізми не імпортують реєстр.

Автоматична перевірка `tests/mechanism-registry.test.js` контролює наявність кожного активного нетестового файла src у реєстрі та відсутність застарілих записів. Семантичний збіг потребує огляду людиною/агентом — тест не вміє визначати його автоматично.

## Активні власники

### src/app — Маршрути, типи сторінок, реєстр сторінок

- `src/app/page-registry.js`
- `src/app/page-types.js`
- `src/app/router.js`

### src/core — Тема та збереження налаштувань

- `src/core/preferences.js`
- `src/core/theme.js`

### src/features/login-demo — Демонстрація входу, споживач CloudGradient

- `src/features/login-demo/index.js`
- `src/features/login-demo/login-demo.css`
- `src/features/login-demo/manifest.js`

### src/features/tools — Демонстрації, споживачі UI (не власники глобальних механізмів)

- `src/features/tools/advanced-field-demo.css`
- `src/features/tools/advanced-field-demo.js`
- `src/features/tools/button-demo.css`
- `src/features/tools/button-demo.js`
- `src/features/tools/collection-page-controls.js`
- `src/features/tools/data-views-demo.css`
- `src/features/tools/data-views-demo.js`
- `src/features/tools/dialog-demo.css`
- `src/features/tools/dialog-demo.js`
- `src/features/tools/field-demo.css`
- `src/features/tools/field-demo.js`
- `src/features/tools/focus-carousel-demo.css`
- `src/features/tools/focus-carousel-demo.js`
- `src/features/tools/holographic-foil-demo.css`
- `src/features/tools/holographic-foil-demo.js`
- `src/features/tools/image-field-demo.css`
- `src/features/tools/image-field-demo.js`
- `src/features/tools/index.js`
- `src/features/tools/input-demo.css`
- `src/features/tools/input-demo.js`
- `src/features/tools/listbox-demo.css`
- `src/features/tools/listbox-demo.js`
- `src/features/tools/manifest.js`
- `src/features/tools/media-library-demo.css`
- `src/features/tools/media-library-demo.js`
- `src/features/tools/menu-demo.css`
- `src/features/tools/menu-demo.js`
- `src/features/tools/photo-charm-fallback.svg`
- `src/features/tools/rich-text-editor-demo.css`
- `src/features/tools/rich-text-editor-demo.js`
- `src/features/tools/section-navigator-demo.css`
- `src/features/tools/section-navigator-demo.js`
- `src/features/tools/thinking-progress-demo.css`
- `src/features/tools/thinking-progress-demo.js`
- `src/features/tools/toast-demo.css`
- `src/features/tools/toast-demo.js`
- `src/features/tools/wave-progress-demo.css`
- `src/features/tools/wave-progress-demo.js`

### src/main.js — Entry point і lifecycle глобальних сервісів

- `src/main.js`

### src/shell/aside — Aside, глобальний FAB

- `src/shell/aside/aside.css`
- `src/shell/aside/aside.js`
- `src/shell/aside/fab.css`
- `src/shell/aside/fab.js`

### src/shell — Shell, outlet, повідомлення маршруту

- `src/shell/page-outlet.js`
- `src/shell/route-message.js`
- `src/shell/shell-view.js`
- `src/shell/shell.js`

### src/shell/route-message.css — Композиція Shell / feature

- `src/shell/route-message.css`

### src/shell/search — Пошук

- `src/shell/search/search.css`
- `src/shell/search/search.js`

### src/shell/shell.css — Композиція Shell / feature

- `src/shell/shell.css`

### src/shell/sidebar — Sidebar

- `src/shell/sidebar/sidebar.css`
- `src/shell/sidebar/sidebar.js`

### src/styles — Design tokens, Motion Physics, глобальний selection та foundation

- `src/styles/foundation.css`
- `src/styles/tokens.css`

### src/ui/button-group — Групи кнопок і навігаційні групи

- `src/ui/button-group/button-group.css`
- `src/ui/button-group/button-group.js`

### src/ui/button — Кнопки, варіанти та іконкові дії

- `src/ui/button/button.css`
- `src/ui/button/button.js`

### src/ui/checkbox — Множинний вибір, indeterminate

- `src/ui/checkbox/checkbox.css`
- `src/ui/checkbox/checkbox.js`

### src/ui/cloud-gradient — Спільна одноколірна WebGL-хмара входу та вітання

- `src/ui/cloud-gradient/cloud-gradient.css`
- `src/ui/cloud-gradient/cloud-gradient.js`

### src/ui/welcome-dialog — Вітальний контент спільного Dialog і CloudGradient

- `src/ui/welcome-dialog/welcome-dialog.css`
- `src/ui/welcome-dialog/welcome-dialog.js`

### src/ui/code-surface — Оформлення коду

- `src/ui/code-surface/code-surface.css`

### src/ui/collection-view — Таблиці, плитки, сортування, фільтри, щільність

- `src/ui/collection-view/collection-filters.js`
- `src/ui/collection-view/collection-header.js`
- `src/ui/collection-view/collection-view.css`
- `src/ui/collection-view/collection-view.js`

### src/ui/combobox — Поле з пошуком і варіантами

- `src/ui/combobox/combobox.css`
- `src/ui/combobox/combobox.js`

### src/ui/data-row — Спільний рядок даних

- `src/ui/data-row/data-row.css`
- `src/ui/data-row/data-row.js`

### src/ui/dialog — Модалки, підтвердження, lifecycle, overlay

- `src/ui/dialog/dialog.css`
- `src/ui/dialog/dialog.js`

### src/ui/field — Оболонка полів, label, validation

- `src/ui/field/field.css`
- `src/ui/field/field.js`
- `src/ui/field/support.js`

### src/ui/focus-carousel — Горизонтальний scroll snap та фокус від позиції — опційне зациклення й автопрокрутка

- `src/ui/focus-carousel/focus-carousel.css`
- `src/ui/focus-carousel/focus-carousel.js`

### src/ui/form-dialog — Форма в Dialog

- `src/ui/form-dialog/form-dialog.js`

### src/ui/holographic-foil — Голографічне змішування, спектр, відблиск і нахил від курсора

- `src/ui/holographic-foil/holographic-foil.css`
- `src/ui/holographic-foil/holographic-foil.js`

### src/ui/icon — Material Symbols та API іконок

- `src/ui/icon/apache-2-license.txt`
- `src/ui/icon/icon.js`
- `src/ui/icon/material-symbols.js`

### src/ui/image-field — Вибір фото, preview, object URL

- `src/ui/image-field/image-field.css`
- `src/ui/image-field/image-field.js`

### src/ui/input — Поле, пароль, rotating placeholder, історія

- `src/ui/input/input.css`
- `src/ui/input/input.js`
- `src/ui/input/password-input.js`
- `src/ui/input/placeholder-history.js`
- `src/ui/input/rotating-placeholder.js`

### src/ui/listbox — Вибір зі списку, chips

- `src/ui/listbox/listbox.css`
- `src/ui/listbox/listbox.js`

### src/ui/menu — Меню, submenu, контекстні дії

- `src/ui/menu/menu.css`
- `src/ui/menu/menu.js`

### src/ui/number-field — Числове поле та stepper

- `src/ui/number-field/number-field.css`
- `src/ui/number-field/number-field.js`

### src/ui/page — Загальна геометрія сторінки

- `src/ui/page/page.css`
- `src/ui/page/page.js`

### src/ui/pagination — Пагінація та розмір сторінки

- `src/ui/pagination/pagination.css`
- `src/ui/pagination/pagination.js`

### src/ui/photo-charm — Розмитий відбиток зображення

- `src/ui/photo-charm/photo-charm.css`
- `src/ui/photo-charm/photo-charm.js`

### src/ui/position — Popup positioning, scroll dismissal, visible option

[CSS-first позиціонування та fallback](anchor-positioning.md) — єдиний геометричний контракт.

- `src/ui/position/dismiss-on-scroll.js`
- `src/ui/position/ensure-option-visible.js`
- `src/ui/position/popup-surface.css`
- `src/ui/position/position-popup.js`

### src/ui/radio-group — Одиничний вибір

- `src/ui/radio-group/radio-group.css`
- `src/ui/radio-group/radio-group.js`

### src/ui/reveal-panel — Плавне розкриття/приховування

- `src/ui/reveal-panel/reveal-panel.css`
- `src/ui/reveal-panel/reveal-panel.js`

### src/ui/rich-text-editor — Редактор HTML/Markdown, toolbar, history, paste, stats

- `src/ui/rich-text-editor/actions.js`
- `src/ui/rich-text-editor/commands.js`
- `src/ui/rich-text-editor/copy.js`
- `src/ui/rich-text-editor/history.js`
- `src/ui/rich-text-editor/html.js`
- `src/ui/rich-text-editor/markdown.js`
- `src/ui/rich-text-editor/mode.js`
- `src/ui/rich-text-editor/paste.js`
- `src/ui/rich-text-editor/rich-text-editor.css`
- `src/ui/rich-text-editor/rich-text-editor.js`
- `src/ui/rich-text-editor/stats.js`
- `src/ui/rich-text-editor/toolbar.js`

### src/ui/scrollbar — Глобальний scrollbar

- `src/ui/scrollbar/scrollbar.css`

### src/ui/section-navigator — Переходи між секціями, жести

- `src/ui/section-navigator/navigation-gestures.js`
- `src/ui/section-navigator/pull-state.js`
- `src/ui/section-navigator/section-navigator.css`
- `src/ui/section-navigator/section-navigator.js`

### src/ui/segment-switch — Сегментований перемикач із рухомою пластиною

- `src/ui/segment-switch/segment-switch.css`
- `src/ui/segment-switch/segment-switch.js`

### src/ui/select — Спільний Select

- `src/ui/select/select.css`
- `src/ui/select/select.js`

### src/ui/selection-actions — Дії над вибраними записами

- `src/ui/selection-actions/selection-actions.css`
- `src/ui/selection-actions/selection-actions.js`

### src/ui/size-transition — Анімація зміни розміру

- `src/ui/size-transition/size-transition.js`

### src/ui/slider — Доступний range

- `src/ui/slider/slider.css`
- `src/ui/slider/slider.js`

### src/ui/switch — On/off, async commit/rollback

- `src/ui/switch/switch.css`
- `src/ui/switch/switch.js`

### src/ui/tabs — Вкладки, спільний перехід панелей

- `src/ui/tabs/tabs.css`
- `src/ui/tabs/tabs.js`

### src/ui/tag-field — Редагування тегів

- `src/ui/tag-field/tag-field.css`
- `src/ui/tag-field/tag-field.js`

### src/ui/textarea — Багаторядкове поле

- `src/ui/textarea/textarea.css`
- `src/ui/textarea/textarea.js`

### src/ui/thinking-progress — Індикатор думання

- `src/ui/thinking-progress/thinking-progress.css`
- `src/ui/thinking-progress/thinking-progress.js`

### src/ui/toast — Сповіщення, стек, зникання

- `src/ui/toast/toast.css`
- `src/ui/toast/toast.js`

### src/ui/toolbar — Панель дій

- `src/ui/toolbar/toolbar.css`
- `src/ui/toolbar/toolbar.js`

### src/ui/tooltip — Глобальні підказки, overflow, popup

- `src/ui/tooltip/tooltip.css`
- `src/ui/tooltip/tooltip.js`

### src/ui/view-switch — Перемикання вигляду колекції

- `src/ui/view-switch/view-switch.css`
- `src/ui/view-switch/view-switch.js`

### src/ui/wave-progress — Хвильовий прогрес

- `src/ui/wave-progress/wave-progress.css`
- `src/ui/wave-progress/wave-progress.js`

### src/ui/workspace-layout — Розміщення робочої області

- `src/ui/workspace-layout/workspace-layout.css`
- `src/ui/workspace-layout/workspace-layout.js`

## Спільні контракти

- [Motion Physics](motion.md) — spatial/effects; [семантичні кольори](semantic-colors.md), [реєстр кнопок](button-inventory.md), [спільний UI](overview.md), [legacy-шарми](../legacy-behavior-research.md).
- [Focus Carousel](focus-carousel.md) — фокус від положення в scrollport, незалежний від Section Navigator.
- [Holographic Foil](holographic-foil.md) — окремий оптичний матеріал, не дублює CloudGradient або PhotoCharm.

## Припарковані механізми (не імпортувати)

[Архів 13.11.2026](../../trash/2026-11-13-decorative-effects/README.md): AnimatedGradient (радіальні рухомі поля), Sparkles (іскри), CloudGradient Aurora (багатоколірна експериментальна хмара). Активна одноколірна CloudGradient — спільний renderer для входу й вітання. Перед новим аналогічним ефектом перевірити архів і причину відключення. Відновлення тільки за відповідним запитом, не автоматично.

## Legacy

Гілка legacy — джерело старих механізмів, не активна реалізація. [Карта шармів та перенесення](../legacy-behavior-research.md). Реєстр покриває активний src та відомий архів декоративних ефектів; не стверджує, що кожну стару legacy-функцію перенесено.
