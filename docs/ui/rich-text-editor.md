# Rich Text Editor — модульний WYSIWYG із дзеркальним переглядом

**Статус:** беззалежнісний робочий перший етап для `work` (2026-11-09). Дослідження і компроміси — [rich-text-editor-research](../research/rich-text-editor.md). Не замінює `src/ui/textarea`: нативне textarea призначене для plain text.

## Призначення та межі

Одна редагована `contenteditable` область; друге вікно — лише **read-only відображення** того ж тексту (оформлене або екранований HTML). Жодної другої моделі даних та двосторонніх конфліктів. Жодних нових npm-пакетів, тож звичайний `git pull` не спричиняє помилку `Failed to resolve import`.

Підтримано: звичайний текст і браузерний multiline ввід, **форматування виділеного фрагмента** (bold/italic/underline), H2, абзац, цитата, один поточний список (ul/ol), undo/redo зі збереженням HTML snapshot, клавіатурні Ctrl/Cmd+B/I/U/Z/Shift+Z/Y, вставка plain text і очищеного HTML, перемикач вигляду, підрахунок символів і слів, читання й задання HTML, editable/read-only, кілька ізольованих екземплярів, повне destroy().

Це не повноцінна заміна ProseMirror: **немає** інлайн-форматування майбутнього тексту при згорнутому курсорі, редагування HTML у правій панелі, таблиць, вкладених/мультиблочних команд, спільного редагування, серверної валідації чи підтримки складного імпорту Word. Команди списків діють на поточний блок; toggle-off вкладених/часткових marks має обмеження. Не оголошувати це production-рівнем для довільної складної розмітки.

## API

`createRichTextEditor({ content?, editable?, toolbar?, mirror?, stats?, label?, onChange? })` створює **непідключений** DOM компонент та повертає:

`{ element, input, getHTML(), getText(), setHTML(html), setEditable(bool), setMirrorMode('preview'|'html'), focus(), execute(command), clear(), destroy() }`.

Власник монтує `element` у свій host та викликає `destroy()` під час cleanup. `onChange({html,text})` спрацьовує на зміну, але нічого сам не зберігає. Команди: `bold`, `italic`, `underline`, `paragraph`, `heading`, `bullet-list`, `ordered-list`, `quote`, `undo`, `redo`. У компоненті є один локальний журнал змін та один контроль виділення.

## Модулі і власність

- `rich-text-editor.js` — композиція та lifecycle, без глобального стану.
- `html.js` — strict DOM allowlist (безпечне читання/вставка/експорт), без third-party бібліотеки.
- `commands.js` — DOM Range команди з невеликим scope.
- `history.js` — локальні snapshots і позиції selection.
- `toolbar.js`, `mirror.js`, `stats.js` — незалежні view-адаптери, які отримують тільки контракт `controls`, не імпортують один одного.
- `rich-text-editor.css` — ізольований компонентний вигляд тільки через наявні `--pg-*` дизайн-токени.
- `src/features/tools/rich-text-editor-demo.js` — ізольована демонстрація у вкладці «Текст».

Вигляд використовує наявну нейтральну палітру, `focus-visible`, ARIA, адаптивні колонки, reduced motion. Немає змін у геометрії Shell. HTML не вставляємо напряму з користувацького рядка: `DOMParser` + allowlist створює **нові безпечні ноди**, атрибути подій, стилі, SVG, scripts, iframe, img і небезпечні URL відкидаються. Для зберігання на сервері потрібна **окрема** перевірка.

## Перевірка

`npm run check` — неймінг, тестова логіка та Vite build. `npm run test:e2e` — browser tests редактора і регресія Shell. Базовий тест: відкрити `/tools`, вкладка «Текст», набрати й виділити фрагмент, натиснути B, перевірити mirror/HTML, скасувати, відновити, перевірити на мобільній ширині. Код не імпортує жодного нового npm-пакета.
