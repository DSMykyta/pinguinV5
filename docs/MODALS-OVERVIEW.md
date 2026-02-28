# Модалі проєкту — повний реєстр

## Fullscreen з sidebar (6) — CRUD сутностей

| Шаблон | Сутність | Відкривається з | Refresh ID | Save | Delete |
|---|---|---|---|---|---|
| `mapper-category-edit` | Категорія mapper | `mapper-categories.js` | `refresh-mapper-category` | save + save-close | `delete-mapper-category` |
| `mapper-characteristic-edit` | Характеристика | `mapper-characteristics.js` | `refresh-mapper-characteristic` | save + save-close | `delete-mapper-characteristic` |
| `mapper-option-edit` | Опція | `mapper-options.js` | `refresh-mapper-option` | save + save-close | `delete-mapper-option` |
| `mapper-mp-data` | Маркетплейс | `mapper-marketplaces.js` | `refresh-mapper-marketplace` | save + save-close | `delete-mapper-marketplace` |
| `brand-edit` | Бренд | `brands-crud.js` | `refresh-brand` | save + save-close | `btn-delete-brand` |
| `keywords-edit` | Ключове слово | `keywords-crud.js` | `refresh-keyword` | save + save-close | `delete-keyword` |

**Спільний паттерн**: header (back, title, dot, switch, refresh, save, save-close), sidebar nav, sections, delete в footer.

---

## Medium overlay — редагування (4)

| Шаблон | Сутність | Відкривається з | Save | Delete |
|---|---|---|---|---|
| `banned-word-edit` | Заборонене слово | `banned-words-manage.js` | `save-banned-word` | — |
| `line-edit` | Лінійка бренду | `lines-crud.js` | `save-line` | `delete-line` |
| `mapper-marketplace-edit` | Маркетплейс (старий) | mapper | `save-mapper-marketplace` | `delete-mapper-marketplace` |
| `mapper-map-to-mp` | Прив'язка до МП | mapper | `map-modal-confirm` | — |

---

## Large overlay — wizard/import (4)

| Шаблон | Призначення | Відкривається з |
|---|---|---|
| `mapper-mapping-wizard` | Wizard прив'язки категорій | `mapper-mapping-wizard.js` |
| `mapper-import-wizard` | Wizard імпорту | `mapper-import-wizard.js` |
| `mapper-import` | Імпорт CSV/XLSX | `mapper-import.js` |
| `banned-words-list-modal` | Список заборонених слів | banned-words page |

---

## Preview — тільки перегляд (4)

| Шаблон | Призначення |
|---|---|
| `preview-modal` | Загальний preview |
| `preview-modal-text` | Текст з форматуванням |
| `preview-modal-table` | Таблиця |
| `product-text-view` | Текст продукту + sheets |

---

## Utility — системні (3)

| Шаблон | Призначення | JS |
|---|---|---|
| `auth-login-modal` | Авторизація | `auth-google.js` |
| `modal-confirm` | Підтвердження дії | `modal-plugin-confirm.js` |
| `info-modal` | Інфо-підказка | `modal-plugin-info.js` |

---

## Інші (3)

| Шаблон | Призначення |
|---|---|
| `glossary-view` | Перегляд глосарію |
| `magic-modal` | Magic parsing тексту |
| `mapper-bindings` | Перегляд прив'язок |

---

## Статистика

- **Всього**: 24 модалі
- **Fullscreen з sidebar**: 6
- **З refresh кнопкою**: 6 (всі fullscreen)
- **З save кнопками**: 15
- **З delete**: 8

## JS інфраструктура

| Файл | Роль |
|---|---|
| `modal-main.js` | Оркестратор + re-export публічного API |
| `modal-state.js` | Стек, кеш, хуки (registerHook/runHook) |
| `modal-core.js` | DOM: showModal/closeModal + глобальна делегація event |
| `modal-plugin-confirm.js` | showConfirmModal, showDeleteConfirm, showResetConfirm, showCloseConfirm |
| `modal-plugin-info.js` | Info модалі (initInfoButtons) |
| `charm-refresh.js` | Refresh кнопка — атрибут `[refresh]` на контейнері, dispatch `charm:refresh` event |
| `charm-required.js` | Валідація `[required]` полів — dot, error state, блок save |
