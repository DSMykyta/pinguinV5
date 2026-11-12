# Shared Toolbar — Material 3 Expressive

**Статус:** `work`, 2026-11-12. **Компонент:** `src/ui/toolbar/`.

## Джерела та дизайн

- [Google Material 3 — Toolbars](https://m3.material.io/components/toolbars/overview), [MDC Android — Docked/Floating Toolbars](https://github.com/material-components/material-components-android/blob/master/docs/components/DockedFloatingToolbars.md).
- **Floating:** округла капсула з м'якою поверхнею, 8px padding, 4px між іконками; контекстні дії, які належать поточному виділенню/редактору.
- **Docked:** пряміша панель для дій у контейнері сторінки, без додаткових маніпуляцій із Shell.
- **Compact:** 40px по висоті з малими спільними кнопками 32px; свідома адаптація під щільність редактора, не дослівний 56dp або 64dp Material 3.
- Обидві теми використовують тільки `--pg-color-*` і `--pg-space-*`. Нова палітра, кнопкові скіни або власна анімація не створюються.

## API / модульні межі

`configureToolbar(element, { variant = 'floating', density = 'regular' })` додає лише класи, варіант і щільність до **наявного DOM**. Контролери та кнопки створює власник; Toolbar не знає про редактор, HTML, Shell, Tabs, його команди й виділення. Незалежні спільні модулі — `createIconButton`, `createRevealPanel` і `createSegmentSwitch`.

Підтримуються `variant: floating | docked`, `density: compact | regular`. Semantic `role="toolbar"`, доступна назва, клавіатурна навігація й lifecycle належать власнику конкретного використання. Жодного нового wrapper/container не додається.

## У редакторі

`src/ui/rich-text-editor/toolbar.js` декорує власну панель через `configureToolbar(..., { variant: 'floating', density: 'compact' })`. Вміст — 12 спільних мінікнопок; стрілка розкриття залишається поза Toolbar та використовує `data-pg-disclosure` для плавного повороту й `RevealPanel` для входу/виходу. Mode Switch лишається окремим радіоперемикачем з однією рухомою плашкою.

Над редактором одна зовнішня рамка, а Toolbar — внутрішня капсула **без власного бордера**. Поле не отримує кольорову рамку при фокусі; доступний `focus-visible` на самих кнопках не скасовується. Нижня статистика збережена.

## Критерії перевірки

- Повторне використання вже існуючих Button, Icon, RevealPanel, SegmentSwitch без стилів кнопок у `rich-text-editor.css`.
- `toolbar: false` прибирає панель; `code: false` прибирає перемикач, `stats: true` працює у двох режимах.
- ARIA, стрілки/Home/End, 390px, темна/світла теми, `prefers-reduced-motion`.
- `npm run check` та `npm run test:e2e` через `Verify Work` у GitHub Actions.
