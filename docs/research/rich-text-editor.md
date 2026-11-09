# Дослідження: редактор тексту, дзеркальний перегляд і архітектура блоків

**Дата:** 2026-11-09. **Ціль:** Pinguin Next, репозиторій `DSMykyta/pinguinV5`, гілка `work`. Точка інтеграції: `src/ui/rich-text-editor`; `src/features/tools` — лише демонстрація.

## 1. Що маємо на увазі під редактором
Plain `textarea` зберігаємо для простих приміток і форм. Rich text редактор має структурну модель абзаців, заголовків, inline marks, списків, selection, undo/redo та керовану експортну HTML-проєкцію. Дзеркало = read-only вигляд того самого документа, а не друга незалежна текстова модель. Якщо потрібне паралельне редагування HTML і WYSIWYG, це інший тип синхронізації, із правилами конфліктів.

## 2. Легасі — фактичні механізми
**Ранній PinGuin:** `p_text.html` використовує `textarea#input-text-markup` для введення та `textarea#result` для результату; `script_text.js` має `autoTag()` та `parseTags()`. Це текстовий трансформер, а не редактор структурних rich-text документів. Генератори/макроси можна в майбутньому зробити опційними командами, не переносити в core.

**V5 / гілка `legacy`:** `js/components/editor/editor-main.js` — фабрика `createHighlightEditor` із конфігурацією HTML-чармами `tools`, `code`, `check`, `stats`, `cleanup-*`, `br`; `editor-state.js` зберігає стан і реєстр хуків; `editor-mode.js` перемикає contenteditable та textarea коду. `editor-plugin-formatting.js` і `editor-plugin-paste.js` користуються `document.execCommand()`; `editor-plugin-enter.js` вручну розрізає DOM через Range; `editor-plugin-undo.js` зберігає HTML snapshots і позиції курсора; `editor-utils.js` очищує HTML і DOM. `docs/EDITOR-OVERVIEW.html` описує цю систему модульних charm/plugin можливостей.

**Висновок:** переносимо **призначення** (редагування, HTML, статистика, find/replace, checks, macros) і незалежність функцій; не переносимо `execCommand`, власні DOM-операції курсора, HTML як канонічний стан і глобальні слухачі. Це аудит джерел, не браузерний аудит старих багів.

## 3. Сучасні підходи
| Варіант | Переваги | Недоліки | Висновок |
| --- | --- | --- | --- |
| Vanilla `contenteditable` | Мінімум залежностей на старті | Undo, IME, paste, schema і selection доводиться підтримувати самим | Не обираємо |
| ProseMirror | Документ, schema, транзакції, історія, plugins | Низькорівнева збірка UI | Основний механізм |
| Tiptap 3 | Headless ProseMirror, vanilla JS, StarterKit, extensions, commands | npm пакети і schema-version | **Обираємо** |
| Lexical | Сучасний модульний движок | Інакша модель nodes, окремий pipeline старого HTML | Резерв |
| CodeMirror 6 | Сильний редактор source HTML | Не WYSIWYG | Лише майбутній опційний source mode |

Джерела: [ProseMirror guide](https://prosemirror.net/docs/guide/), [Tiptap](https://tiptap.dev/docs/editor/core-concepts/introduction), [vanilla JS](https://tiptap.dev/docs/editor/getting-started/install/vanilla-javascript), [StarterKit](https://tiptap.dev/docs/editor/extensions/functionality/starterkit), [Lexical](https://lexical.dev/), [CodeMirror](https://codemirror.net/docs/guide/), [MDN: execCommand deprecated](https://developer.mozilla.org/en-US/docs/Web/API/Document/execCommand), [DOMPurify](https://github.com/cure53/DOMPurify).

## 4. Архітектурний контракт
`feature app` → `createRichTextEditor(host, options)` → `engine` та незалежні `toolbar` / `mirror` / `stats`. Кожен отримує **лише публічний editor instance**, самостійно підписується та відписується через `dispose()`. Навіть якщо опційна функція падає, основний редактор лишається працездатним. JSON модель — єдине джерело стану; HTML/текст/дзеркало — похідні представлення.

Використовуємо існуючі `--pg-*` кольори/відступи/радіуси, не змінюємо Shell, не додаємо нових глобальних стилів чи хардкодованих кольорів. UI-компонент не знає, що є вкладка «Текст». Лише демо у `src/features/tools` знає, де показати редактор. Зовнішні інструменти за потреби передаватимуть `content`, `onChange`, `extensions` і збереження через власні adapters.

## 5. Безпека, продуктивність та межі готовності
DOMPurify перевіряє HTML import, paste, mirror, export; Tiptap schema визначає припустимі структурні вузли. Забороняємо scripts, SVG, iframe та inline handlers. Для реального запису в БД потрібна серверна незалежна перевірка JSON schema та очищення HTML; клієнт не є межею довіри. Довгі документи можуть вимагати debounce дзеркала; автозбереження виконує власник feature, не сам UI.

Початковий набір: форматування, заголовок, списки, цитата, undo/redo, read-only mirror (HTML та visual), статистика, API та destroy. Наступні **окремі** пакети: пошук і заміна, перевірка заборонених слів, SEO-розмітка, BR-only exporter, source editor, документні пресети, імпорт з легасі. **Не готові/не тестовані у браузері:** IME, Word paste, screenreader, large docs, cross-browser верстка. Їх потрібно підтвердити після інсталяції залежностей і e2e.

## 6. Перевірки
`node --test src/ui/rich-text-editor/*.test.js` — автономні тести статистики та меж модулів. `npm run check` перевіряє неймінг і Vite збірку, після `npm install`. Браузерне e2e має перевірити ввід, формати, HTML view, XSS, вузький viewport, доступність, кілька екземплярів та cleanup. Не заявляти про підтвердження інтеграції, доки не пройдено цей список.
