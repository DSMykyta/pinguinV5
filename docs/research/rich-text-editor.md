# Дослідження: повернення механіки legacy «Редактор / HTML»

Дата: 2026-11-09 · Репозиторій `DSMykyta/pinguinV5`, гілка `work`. [Контракт редактора](../ui/rich-text-editor.md).

## Що саме було у legacy

У `legacy/js/components/editor/editor-template.js` є **одна** робоча область із `contenteditable` та, за ввімкненого `code`, прихована `textarea` для коду. У `editor-mode.js` радіокнопки «Text/Code» перемикають активну область: editor→code копіює `getCleanHtml()` в `textarea`; code→editor вставляє змінений код. Форматування під час source-режиму вимкнене. `editor-state.js` тримає поточний режим і спільні hooks. Шарми `check`, `stats`, `find`, `cleanup`, `br` незалежно додають можливості. Стара реалізація безпосередньо робила `editor.innerHTML = codeEditor.value`, а formatting/paste використовували deprecated `document.execCommand()` — це переносити не можна. `PinGuin/p_text.html` із двома textarea є іншим механізмом текстового трансформера.

## Помилка попередньої реалізації

Перший `work` редактор (коміт `42cd1a9`) помилково мав одночасно видимі WYSIWYG ліворуч і read-only preview праворуч. Це не відповідає режимному редактору legacy. У новій версії **дзеркала поруч немає**: `HTML` — редагований вихідний код **на місці** WYSIWYG. Це одна й та сама одиниця даних, а не паралельне редагування двох моделей.

## Сучасні технічні висновки

- [ProseMirror](https://prosemirror.net/docs/guide/) та [Tiptap](https://tiptap.dev/docs/editor/core-concepts/introduction) забезпечують schema, транзакції, історію та input rules; для професійних багатоблочних редакторів вони кращі від ручного DOM.
- [CodeMirror 6](https://codemirror.net/docs/guide/) — потенційний незалежний редактор HTML source, але на першому етапі `textarea` зберігає native undo, IME та не потребує інсталяції.
- [MDN `execCommand`](https://developer.mozilla.org/en-US/docs/Web/API/Document/execCommand) позначає API застарілим; команди WYSIWYG в `work` ізольовані від інших функцій, але їхню складність не слід нарощувати без schema-engine.
- Вхідний код не слід вставляти в `innerHTML` як є. `html.js` будує нові безпечні вузли за дозволеним набором тегів та протоколів; скрипти/події/стилі відкидаються. Промислова інтеграція потребуватиме перевіреного sanitizer і серверної перевірки.
- **Не санітизувати HTML на кожній клавіші**: це руйнує чернетки, позицію курсора та native undo. Парсимо на експорт і при перемиканні в WYSIWYG. Не зберігати другу незалежну модель після commit.
- Гарантія для локального GitHub Desktop: жодних нових імпортів із npm — минула помилка `Failed to resolve import dompurify` не повториться.

## Межі модулів

`src/ui/rich-text-editor/rich-text-editor.js` — власник життєвого циклу, одного активного режиму та API. `mode.js`, `toolbar.js`, `stats.js` отримують лише `controls`, не імпортують один одного. `history.js` і `commands.js` не мають залежностей від UI застосунку. `html.js` — boundary, а не редактор; `src/features/tools` лише демонстрація. CSS компонента узгоджено з `--pg-*`, без втручання в Shell. Пізніше `find`, `check` та `cleanup` можуть підключатися на основі того самого контракту з локальними `dispose()`.
