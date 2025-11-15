# ГАЙД ПО МОДАЛЬНИМ ВІКНАМ

> **IMPORTANT:** Цей документ описує структуру та правила роботи з модальними вікнами в проєкті.

---

## 📚 Зміст

1. [Анатомія Модального Вікна](#анатомія-модального-вікна)
2. [Розміри Модалів](#розміри-модалів)
3. [Шаблон Структури HTML](#шаблон-структури-html)
4. [Кнопки та Footer](#кнопки-та-footer)
5. [Універсальні CSS Класи](#універсальні-css-класи)
6. [Accessibility Вимоги](#accessibility-вимоги)
7. [JavaScript API](#javascript-api)
8. [Приклади](#приклади)

---

## 🎯 Анатомія Модального Вікна

Кожен модал складається з **трьох частин**:

```
┌─────────────────────────────────────────┐
│ HEADER                                  │
│ ┌───────────┐              ┌─────────┐ │
│ │   Назва   │              │ Закрити │ │
│ └───────────┘              └─────────┘ │
├─────────────────────────────────────────┤
│ BODY                                    │
│                                         │
│  Контент модалу                         │
│  (форми, текст, таблиці тощо)           │
│                                         │
├─────────────────────────────────────────┤
│ FOOTER                                  │
│              ┌──────────┐ ┌──────────┐ │
│              │ Скасувати│ │ Зберегти │ │
│              └──────────┘ └──────────┘ │
└─────────────────────────────────────────┘
```

### Частини модалу:

1. **Header** (Шапка)
   - Назва модалу (ліворуч)
   - Кнопки дій (праворуч): закрити, додаткові дії
   - Опціонально: перемикачі, dropdown

2. **Body** (Тіло)
   - Основний контент
   - Форми, текст, таблиці, зображення

3. **Footer** (Підвал)
   - Кнопки дій: Скасувати, Зберегти, Видалити тощо
   - Завжди праворуч

---

## 📏 Розміри Модалів

Модальні вікна мають **3 розміри**:

### Small (400px)
**Призначення:** Підтвердження, прості повідомлення
**Атрибут:** `data-modal-size="small"`
**Приклад:** confirm-delete-modal, confirm-clear-modal

### Medium (60vw) - ЗА ЗАМОВЧУВАННЯМ
**Призначення:** Форми додавання/редагування
**Атрибут:** `data-modal-size="medium"` або без атрибута
**Приклад:** entity-add-category, auth-login-modal

### Large (80vw)
**Призначення:** Складні інтерфейси з табами, великі таблиці
**Атрибут:** `data-modal-size="large"`
**Приклад:** modal-marketplace-admin, product-text-view

### Використання:

```html
<!-- Small modal -->
<button data-modal-trigger="confirm-delete-modal" data-modal-size="small">
    Видалити
</button>

<!-- Medium modal (за замовчуванням) -->
<button data-modal-trigger="entity-add-category">
    Додати категорію
</button>

<!-- Large modal -->
<button data-modal-trigger="modal-marketplace-admin" data-modal-size="large">
    Управління маркетплейсами
</button>
```

---

## 📝 Шаблон Структури HTML

### Базовий Шаблон

```html
<!-- 1. Назва модалу (приховано) -->
<div class="modal-title-source u-hidden">
    Назва Вашого Модалу
</div>

<!-- 2. Додаткові кнопки в header (опціонально) -->
<div class="modal-header-actions-source u-hidden">
    <!-- Кнопка закриття додається автоматично -->
    <!-- Тут можна додати інші кнопки якщо потрібно -->
</div>

<!-- 3. Тіло модалу -->
<div class="modal-body-source">

    <!-- Контент модалу -->
    <p>Ваш контент тут...</p>

    <!-- Footer з кнопками -->
    <div class="connected-button-group-square modal-footer" role="group">
        <button type="button" data-modal-close class="segment" aria-label="Скасувати">
            <div class="state-layer">
                <span class="material-symbols-outlined">close</span>
                <span class="label">Скасувати</span>
            </div>
        </button>
        <button type="submit" class="segment" aria-label="Зберегти">
            <div class="state-layer">
                <span class="material-symbols-outlined">save</span>
                <span class="label">Зберегти</span>
            </div>
        </button>
    </div>

</div>
```

### Шаблон з Формою

```html
<div class="modal-title-source u-hidden">
    Додати Елемент
</div>

<div class="modal-header-actions-source u-hidden">
</div>

<div class="modal-body-source">
    <form id="form-add-element" class="modal-form">

        <!-- Form groups -->
        <div class="form-group">
            <label for="element-name">Назва <span class="required">*</span></label>
            <input type="text" id="element-name" class="input-main" required>
        </div>

        <div class="form-group">
            <label for="element-description">Опис</label>
            <textarea id="element-description" class="input-main" rows="4"></textarea>
        </div>

        <!-- Footer -->
        <div class="connected-button-group-square modal-footer" role="group">
            <button type="button" data-modal-close class="segment" aria-label="Скасувати">
                <div class="state-layer">
                    <span class="material-symbols-outlined">close</span>
                    <span class="label">Скасувати</span>
                </div>
            </button>
            <button type="submit" class="segment" aria-label="Створити">
                <div class="state-layer">
                    <span class="material-symbols-outlined">add</span>
                    <span class="label">Створити</span>
                </div>
            </button>
        </div>

    </form>
</div>
```

---

## 🔘 Кнопки та Footer

### Структура Footer

**ЗАВЖДИ використовуйте:**
```html
<div class="connected-button-group-square modal-footer" role="group">
    <!-- Кнопки тут -->
</div>
```

**❌ НЕПРАВИЛЬНО (стара система):**
```html
<div class="modal-footer">
    <button class="btn">Скасувати</button>
    <button class="btn primary">Зберегти</button>
</div>
```

### Структура Кнопки

**ЗАВЖДИ використовуйте:**
```html
<button type="button" class="segment" aria-label="Опис дії">
    <div class="state-layer">
        <span class="material-symbols-outlined">іконка</span>
        <span class="label">Текст</span>
    </div>
</button>
```

### Стандартні Кнопки

#### Скасувати
```html
<button type="button" data-modal-close class="segment" aria-label="Скасувати">
    <div class="state-layer">
        <span class="material-symbols-outlined">close</span>
        <span class="label">Скасувати</span>
    </div>
</button>
```

#### Зберегти
```html
<button type="submit" class="segment" aria-label="Зберегти">
    <div class="state-layer">
        <span class="material-symbols-outlined">save</span>
        <span class="label">Зберегти</span>
    </div>
</button>
```

#### Створити
```html
<button type="submit" class="segment" aria-label="Створити">
    <div class="state-layer">
        <span class="material-symbols-outlined">add</span>
        <span class="label">Створити</span>
    </div>
</button>
```

#### Видалити
```html
<button type="button" class="segment" aria-label="Видалити">
    <div class="state-layer">
        <span class="material-symbols-outlined">delete</span>
        <span class="label">Видалити</span>
    </div>
</button>
```

#### Оновити
```html
<button type="button" class="segment" aria-label="Оновити">
    <div class="state-layer">
        <span class="material-symbols-outlined">refresh</span>
        <span class="label">Оновити</span>
    </div>
</button>
```

---

## 🎨 Універсальні CSS Класи

### Розміри Модалів
```css
.modal-small   /* 400px */
.modal-medium  /* 60vw - за замовчуванням */
.modal-large   /* 80vw */
```

### Секції в Body
```css
.modal-section-header  /* Заголовок секції */
.modal-section-title   /* Текст заголовку */
.modal-section-subtitle /* Підзаголовок */
```

```html
<div class="modal-section-header">
    <h3 class="modal-section-title">Налаштування</h3>
    <button class="btn-icon">...</button>
</div>
```

### Grid для Форм
```css
.modal-grid-2  /* Сітка 2 колонки */
```

```html
<div class="modal-grid-2">
    <div class="form-group">...</div>
    <div class="form-group">...</div>
</div>
```

### Статистика
```css
.modal-stats-container /* Контейнер статистики */
.modal-stat-item       /* Окремий елемент */
.modal-stat-label      /* Підпис */
.modal-stat-value      /* Значення */
```

```html
<div class="modal-stats-container">
    <div class="modal-stat-item">
        <span class="modal-stat-label">Всього слів</span>
        <span class="modal-stat-value">1,234</span>
    </div>
    <div class="modal-stat-item">
        <span class="modal-stat-label">Заборонених</span>
        <span class="modal-stat-value">5</span>
    </div>
</div>
```

### Повідомлення
```css
.modal-warning  /* Попередження (жовтий) */
.modal-info     /* Інформація (сірий) */
```

```html
<div class="modal-warning">
    <strong>Увага!</strong> Цю дію неможливо скасувати.
</div>

<div class="modal-info">
    Введіть дані для створення нового елемента.
</div>
```

---

## ♿ Accessibility Вимоги

### Обов'язкові Атрибути

1. **Role та aria-modal на контейнері** (додаються автоматично JS)
   ```html
   <div class="modal-container" role="dialog" aria-modal="true">
   ```

2. **aria-label на всіх кнопках**
   ```html
   <button class="segment" aria-label="Зберегти">
   ```

3. **role="group" на footer**
   ```html
   <div class="connected-button-group-square modal-footer" role="group">
   ```

4. **Label для всіх input**
   ```html
   <label for="element-name">Назва</label>
   <input id="element-name" type="text">
   ```

5. **Required indicator**
   ```html
   <label for="email">Email <span class="required">*</span></label>
   <input id="email" type="email" required>
   ```

### Keyboard Navigation

- `ESC` - закриває модал
- `TAB` - навігація між елементами
- `ENTER` - submit форми
- Клік поза модалом - закриває модал

---

## 💻 JavaScript API

### Відкрити Модал

```html
<!-- Через data-атрибут -->
<button data-modal-trigger="modal-id" data-modal-size="medium">
    Відкрити
</button>
```

```javascript
// Програмно
import { showModal } from './js/common/ui-modal.js';

showModal('modal-id', triggerElement);
```

### Закрити Модал

```html
<!-- Через data-атрибут -->
<button data-modal-close>Закрити</button>
```

```javascript
// Програмно
import { closeModal } from './js/common/ui-modal.js';

closeModal();
```

### Події

```javascript
// Модал відкрився
document.addEventListener('modal-opened', (e) => {
    console.log('Modal ID:', e.detail.modalId);
    console.log('Trigger element:', e.detail.trigger);
    console.log('Body target:', e.detail.bodyTarget);
});

// Модал закрився
document.addEventListener('modal-closed', () => {
    console.log('Modal closed');
});
```

---

## 📖 Приклади

### Приклад 1: Простий Confirm Modal

```html
<div class="modal-title-source u-hidden">
    Підтвердження видалення
</div>

<div class="modal-header-actions-source u-hidden">
</div>

<div class="modal-body-source">
    <p>Ви впевнені, що хочете видалити цей елемент?</p>
    <p><strong>Цю дію неможливо скасувати.</strong></p>

    <div class="connected-button-group-square modal-footer" role="group">
        <button type="button" data-modal-close class="segment" aria-label="Скасувати">
            <div class="state-layer">
                <span class="material-symbols-outlined">close</span>
                <span class="label">Скасувати</span>
            </div>
        </button>
        <button type="button" id="confirm-delete-btn" class="segment" aria-label="Видалити">
            <div class="state-layer">
                <span class="material-symbols-outlined">delete</span>
                <span class="label">Видалити</span>
            </div>
        </button>
    </div>
</div>
```

**Відкриття:**
```html
<button data-modal-trigger="confirm-delete-modal" data-modal-size="small">
    Видалити
</button>
```

### Приклад 2: Модал з Формою

```html
<div class="modal-title-source u-hidden">
    Додати Користувача
</div>

<div class="modal-header-actions-source u-hidden">
</div>

<div class="modal-body-source">
    <form id="form-add-user" class="modal-form">

        <div class="modal-grid-2">
            <div class="form-group">
                <label for="user-firstname">Ім'я <span class="required">*</span></label>
                <input type="text" id="user-firstname" class="input-main" required>
            </div>

            <div class="form-group">
                <label for="user-lastname">Прізвище <span class="required">*</span></label>
                <input type="text" id="user-lastname" class="input-main" required>
            </div>
        </div>

        <div class="form-group">
            <label for="user-email">Email <span class="required">*</span></label>
            <input type="email" id="user-email" class="input-main" required>
        </div>

        <div class="modal-info">
            Користувач отримає email з інструкціями для активації акаунту.
        </div>

        <div class="connected-button-group-square modal-footer" role="group">
            <button type="button" data-modal-close class="segment" aria-label="Скасувати">
                <div class="state-layer">
                    <span class="material-symbols-outlined">close</span>
                    <span class="label">Скасувати</span>
                </div>
            </button>
            <button type="submit" class="segment" aria-label="Створити">
                <div class="state-layer">
                    <span class="material-symbols-outlined">person_add</span>
                    <span class="label">Створити</span>
                </div>
            </button>
        </div>

    </form>
</div>
```

### Приклад 3: Модал з Секціями

```html
<div class="modal-title-source u-hidden">
    Налаштування Проєкту
</div>

<div class="modal-header-actions-source u-hidden">
</div>

<div class="modal-body-source">

    <!-- Секція 1 -->
    <div class="modal-section-header">
        <h3 class="modal-section-title">Загальні налаштування</h3>
    </div>

    <div class="form-group">
        <label for="project-name">Назва проєкту</label>
        <input type="text" id="project-name" class="input-main">
    </div>

    <!-- Секція 2 -->
    <div class="modal-section-header">
        <h3 class="modal-section-title">Безпека</h3>
    </div>

    <div class="form-group">
        <label class="checkbox-label">
            <input type="checkbox" id="enable-2fa">
            <span>Увімкнути двофакторну автентифікацію</span>
        </label>
    </div>

    <div class="connected-button-group-square modal-footer" role="group">
        <button type="button" data-modal-close class="segment" aria-label="Скасувати">
            <div class="state-layer">
                <span class="material-symbols-outlined">close</span>
                <span class="label">Скасувати</span>
            </div>
        </button>
        <button type="submit" class="segment" aria-label="Зберегти">
            <div class="state-layer">
                <span class="material-symbols-outlined">save</span>
                <span class="label">Зберегти</span>
            </div>
        </button>
    </div>

</div>
```

---

## 🚫 Поширені Помилки

### ❌ Стара система кнопок
```html
<!-- НЕПРАВИЛЬНО -->
<div class="modal-footer">
    <button class="btn">Скасувати</button>
    <button class="btn primary">Зберегти</button>
</div>
```

### ✅ Правильно
```html
<div class="connected-button-group-square modal-footer" role="group">
    <button type="button" data-modal-close class="segment" aria-label="Скасувати">
        <div class="state-layer">
            <span class="material-symbols-outlined">close</span>
            <span class="label">Скасувати</span>
        </div>
    </button>
</div>
```

### ❌ Inline стилі
```html
<!-- НЕПРАВИЛЬНО -->
<div style="display: flex; margin-bottom: 16px;">
    <h3 style="font-size: 18px;">Заголовок</h3>
</div>
```

### ✅ Правильно
```html
<div class="modal-section-header">
    <h3 class="modal-section-title">Заголовок</h3>
</div>
```

### ❌ Відсутність aria-label
```html
<!-- НЕПРАВИЛЬНО -->
<button class="segment">
    <div class="state-layer">
        <span class="label">Зберегти</span>
    </div>
</button>
```

### ✅ Правильно
```html
<button type="submit" class="segment" aria-label="Зберегти">
    <div class="state-layer">
        <span class="label">Зберегти</span>
    </div>
</button>
```

---

## 📋 Чек-лист Перед Коммітом

- [ ] Модал має правильну структуру (title-source, header-actions-source, body-source)
- [ ] Footer використовує `connected-button-group-square modal-footer`
- [ ] Всі кнопки мають структуру `.segment > .state-layer > .label`
- [ ] Всі кнопки мають `aria-label`
- [ ] Немає inline стилів
- [ ] Використовуються універсальні CSS класи де можливо
- [ ] Форми мають `id` та `class="modal-form"`
- [ ] Всі input мають відповідні label
- [ ] Required поля позначені `<span class="required">*</span>`
- [ ] Модал має правильний розмір через `data-modal-size`

---

## 📚 Додаткові Ресурси

- [ARCHITECTURE-PRINCIPLES.md](./ARCHITECTURE-PRINCIPLES.md) - Архітектурні принципи проєкту
- [CODE-STYLE-GUIDE.md](./CODE-STYLE-GUIDE.md) - Гайд по стилю коду
- [MODAL-TEMPLATE.html](./MODAL-TEMPLATE.html) - Готовий шаблон для копіювання

---

**Автор:** Claude Code
**Дата:** 2025-01-15
**Версія:** 1.0
