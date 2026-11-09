# Дослідження: легасі редактори та сучасний підхід до дзеркального вводу

Дата: 2026-11-09 · Цільова гілка: `DSMykyta/pinguinV5:work` · Контракт: [UI Rich Text Editor](../ui/rich-text-editor.md).

## Легасі та його роль

У старому `PinGuin` (`p_text.html`, `script_text.js`) дві `textarea` реалізували plain text → перетворений текст (`autoTag`): це **не** WYSIWYG-редактор. У `legacy/js/components/editor` V5 створено значно ширшу схему: `editor-main`, `editor-state`, `editor-mode` і незалежні charms (`tools`, `code`, `check`, `stats`, `cleanup`, `br`, `find`). Внутрішня реалізація місцями тримається на `execCommand`, ручному `Range`, DOM snapshots і одночасному редагуванні HTML. Переносимо сенс незалежних можливостей і життєвого циклу, **не** весь старий код чи глобальні події.

## Перевірені сучасні підходи

- [ProseMirror](https://prosemirror.net/docs/guide/): schema/model, transactions, controlled selections, history; найнадійніший довгостроковий напрям для складних редакторів.
- [Tiptap 3](https://tiptap.dev/docs/editor/core-concepts/introduction): headless шар над ProseMirror, дозволяє окремі extensions і toolbar.
- [Lexical](https://lexical.dev/): альтернативний редактор зі своїми nodes/transforms.
- [CodeMirror 6](https://codemirror.net/docs/guide/): окремий HTML source editor, **не** WYSIWYG.
- [MDN `beforeinput`](https://developer.mozilla.org/en-US/docs/Web/API/Element/beforeinput_event): browser-host input interception; не всі user edit модифікації проходять через cancelable beforeinput.
- [MDN `Range`](https://developer.mozilla.org/en-US/docs/Web/API/Range/surroundContents): часткове виділення non-Text вузлів робить `surroundContents()` непридатним для загальних команд.
- [MDN `execCommand`](https://developer.mozilla.org/en-US/docs/Web/API/Document/execCommand): deprecated; у новому модулі його немає.

## Рішення для `work` і урок регресії

Перша спроба додала статичні імпорти `dompurify`/`@tiptap/*`. Vite користувача не міг resolve `dompurify` після `git pull` без окремого `npm install`. Через це вся вкладка/застосунок не вантажилася. Зміни були відкочені комітом `7e1a0dc`. Нова реалізація **не додає package.json залежностей** і не блокує інших функцій під час локального pull.

Для початкових потреб (редагована область, selected formatting, списки, mirror HTML/read-only, history, безпека) використано native `contenteditable`/`Selection`/`Range`, локальні перехоплювачі paste, DOM sanitizer із strict allowlist, snapshots history, view adapters за контрактом. Це свідомий обмежений MVP: browser editing має складні edge cases з IME, cross-block editing, selection і Word paste. Перед розширенням функцій до професійного редактора варто виділити engine в адаптер і окремо мігрувати на ProseMirror із lockfile та перевіреним npm install + e2e; не прив’язувати блоки Toolbar/Stats/Mirror до конкретного engine.

## LEGO-межі

`src/ui/rich-text-editor` не знає ні про `tools`, ні про Shell/aside, ні про локальне зберігання. `src/features/tools` монтує лише демо. Можливості одержують мінімальний `controls` інтерфейс (`execute/getHTML/getText/subscribe/isEditable`) та повертають `dispose()`. Mirror і статистика не імпортують одна одну. Єдине джерело — редагований DOM, санітизований HTML — похідна проєкція. Повний стан/збереження має належати майбутньому feature-власнику, а не глобальному `window`.

## Ризики/обмеження перед production

Виділення через кілька різнорідних block nodes, форматування при порожньому курсорі, складні вкладені marks, paste з Word, IME і accessibility повинні проходити додаткові кросбраузерні перевірки. Домашній HTML sanitizer прийнятний лише для контрольованого MVP, для довільного багатого HTML потрібні production перевірений sanitizer та server-side validation. Два незалежно редаговані panes не підтримані — mirror read-only, щоб не створювати розсинхронізацію.
