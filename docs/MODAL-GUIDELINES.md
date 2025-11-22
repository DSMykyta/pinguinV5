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
**Призначення:** Підтвердження, прості повідомлення, логін
**CSS Клас:** `.modal-small` на `.modal-container`
**Приклад:** confirm-delete-modal, confirm-clear-modal, auth-login-modal

### Medium (60vw) - ЗА ЗАМОВЧУВАННЯМ
**Призначення:** Форми додавання/редагування
**CSS Клас:** `.modal-medium` на `.modal-container` (або без класу - default width: 70vw)
**Приклад:** brand-edit, keywords-edit

### Large (80vw)
**Призначення:** Складні інтерфейси з табами, великі таблиці
**CSS Клас:** `.modal-large` на `.modal-container`
**Приклад:** modal-marketplace-admin, product-text-view

### Використання:

Розмір вказується **безпосередньо в HTML шаблоні модалу**:

```html
<!-- Small modal -->
<div class="modal-container modal-small">
    ...
</div>

<!-- Medium modal -->
<div class="modal-container modal-medium">
    ...
</div>

<!-- Large modal -->
<div class="modal-container modal-large">
    ...
</div>
```

Тригер кнопка НЕ визначає розмір:

```html
<!-- Правильно - розмір вже в templates/modals/confirm-delete-modal.html -->
<button data-modal-trigger="confirm-delete-modal">
    Видалити
</button>
```

---

## 📝 Шаблон Структури HTML

### Базовий Шаблон

Кожен модал - це **ПОВНОЦІННИЙ HTML елемент**, який завантажується через fetch.

```html
<!-- templates/modals/your-modal.html -->

<div class="modal-overlay">
    <div class="modal-container modal-small">

        <!-- Header -->
        <div class="modal-header">
            <h2 class="modal-title">Назва Вашого Модалу</h2>
            <button class="btn-icon modal-close" aria-label="Закрити" data-modal-close>
                <span class="material-symbols-outlined">close</span>
            </button>
        </div>

        <!-- Body -->
        <div class="modal-body">

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
    </div>
</div>
```

### Шаблон з Формою

```html
<!-- templates/modals/entity-add-element.html -->

<div class="modal-overlay">
    <div class="modal-container modal-medium">

        <!-- Header -->
        <div class="modal-header">
            <h2 class="modal-title">Додати Елемент</h2>
            <button class="btn-icon modal-close" aria-label="Закрити" data-modal-close>
                <span class="material-symbols-outlined">close</span>
            </button>
        </div>

        <!-- Body -->
        <div class="modal-body">
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
    </div>
</div>
```

### Шаблон з Header Actions (Save/Delete в header)

```html
<!-- templates/modals/brand-edit.html -->

<div class="modal-overlay">
    <div class="modal-container modal-medium">

        <!-- Header з кнопками дій -->
        <div class="modal-header">
            <h2 class="modal-title">Редагувати Бренд</h2>
            <div class="modal-header-actions">
                <button id="delete-brand" class="segment u-hidden" aria-label="Видалити">
                    <div class="state-layer">
                        <span class="material-symbols-outlined">delete</span>
                        <span class="label">Видалити</span>
                    </div>
                </button>
                <button id="save-brand" class="segment" aria-label="Зберегти">
                    <div class="state-layer">
                        <span class="label">Зберегти</span>
                    </div>
                </button>
                <button class="segment modal-close-btn" aria-label="Закрити">
                    <div class="state-layer">
                        <span class="material-symbols-outlined">close</span>
                    </div>
                </button>
            </div>
        </div>

        <!-- Body -->
        <div class="modal-body">
            <!-- Контент форми -->
        </div>
    </div>
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
<!-- Через data-атрибут на кнопці -->
<button data-modal-trigger="confirm-delete-modal">
    Видалити
</button>
```

```javascript
// Програмно
import { showModal } from './js/common/ui-modal.js';

// Просто вказуємо ID модалу (без .html розширення)
showModal('confirm-delete-modal');

// Або з triggerElement (опціонально)
showModal('confirm-delete-modal', buttonElement);
```

**ВАЖЛИВО:** Розмір модалу вказується в самому HTML шаблоні, а НЕ при виклику `showModal()`.

### Закрити Модал

```html
<!-- Через data-атрибут -->
<button data-modal-close>Закрити</button>
```

```javascript
// Програмно - закриває верхній модал зі стеку
import { closeModal } from './js/common/ui-modal.js';

closeModal();

// Або закрити конкретний модал по ID
closeModal('confirm-delete-modal');

// Закрити всі модалі
import { closeAllModals } from './js/common/ui-modal.js';
closeAllModals();
```

### Події

```javascript
// Модал відкрився
document.addEventListener('modal-opened', (e) => {
    console.log('Modal ID:', e.detail.modalId);
    console.log('Trigger element:', e.detail.trigger);
    console.log('Modal element:', e.detail.modalElement); // Повний DOM елемент модалу
    console.log('Body target:', e.detail.bodyTarget); // Shortcut для .modal-body
});

// Модал закрився
document.addEventListener('modal-closed', (e) => {
    console.log('Modal ID:', e.detail.modalId);
});
```

### Стек Модалів

Система підтримує **відкриття модалу поверх модалу**:

```javascript
import { showModal, getOpenModals } from './js/common/ui-modal.js';

showModal('first-modal');
showModal('second-modal'); // Відкриється поверх першого

console.log(getOpenModals()); // ['first-modal', 'second-modal']

closeModal(); // Закриє 'second-modal'
closeModal(); // Закриє 'first-modal'
```

---

## 🔄 Модалі Створення/Редагування

### ВАЖЛИВО: Create і Edit - це ОДИН модал

**Правило:** Модалі для створення та редагування записів - це **один і той же модал**, який працює в двох режимах:

1. **Режим створення (Create)** - форма порожня, кнопка "Створити"
2. **Режим редагування (Edit)** - форма заповнена даними, кнопка "Зберегти"

### Як це працює

```javascript
// Відкриття для створення (порожня форма)
showModal('entity-add-category'); // Форма порожня

// Відкриття для редагування (форма з даними)
showModal('entity-add-category'); // Заповнюємо дані після відкриття
document.getElementById('category-name').value = existingCategory.name;
document.getElementById('category-slug').value = existingCategory.slug;
```

### Приклад: Модал Категорії

```html
<!-- templates/modals/entity-add-category.html -->
<div class="modal-title-source u-hidden">
    Категорія
</div>

<div class="modal-header-actions-source u-hidden">
</div>

<div class="modal-body-source">
    <form id="form-category" class="modal-form">

        <div class="form-group">
            <label for="category-name">Назва <span class="required">*</span></label>
            <input type="text" id="category-name" class="input-main" required>
        </div>

        <div class="form-group">
            <label for="category-slug">Slug <span class="required">*</span></label>
            <input type="text" id="category-slug" class="input-main" required>
        </div>

        <div class="connected-button-group-square modal-footer" role="group">
            <button type="button" data-modal-close class="segment" aria-label="Скасувати">
                <div class="state-layer">
                    <span class="material-symbols-outlined">close</span>
                    <span class="label">Скасувати</span>
                </div>
            </button>
            <button type="submit" id="btn-save-category" class="segment" aria-label="Зберегти">
                <div class="state-layer">
                    <span class="material-symbols-outlined">save</span>
                    <span class="label">Зберегти</span>
                </div>
            </button>
        </div>

    </form>
</div>
```

### JavaScript для обох режимів

```javascript
// Кнопка "Додати категорію" - Create режим
btnAddCategory.addEventListener('click', () => {
    showModal('entity-add-category');

    // Очищаємо форму
    document.getElementById('form-category').reset();

    // Змінюємо кнопку на "Створити"
    const btnSave = document.getElementById('btn-save-category');
    btnSave.querySelector('.label').textContent = 'Створити';
    btnSave.querySelector('.material-symbols-outlined').textContent = 'add';

    // Прибираємо ID якщо він був
    delete btnSave.dataset.categoryId;
});

// Кнопка "Редагувати" - Edit режим
btnEditCategory.addEventListener('click', (categoryData) => {
    showModal('entity-add-category');

    // Заповнюємо форму
    document.getElementById('category-name').value = categoryData.name;
    document.getElementById('category-slug').value = categoryData.slug;

    // Змінюємо кнопку на "Зберегти"
    const btnSave = document.getElementById('btn-save-category');
    btnSave.querySelector('.label').textContent = 'Зберегти';
    btnSave.querySelector('.material-symbols-outlined').textContent = 'save';

    // Зберігаємо ID для оновлення
    btnSave.dataset.categoryId = categoryData.id;
});

// Обробник submit - працює для обох режимів
document.getElementById('form-category').addEventListener('submit', async (e) => {
    e.preventDefault();

    const btnSave = document.getElementById('btn-save-category');
    const categoryId = btnSave.dataset.categoryId;

    const data = {
        name: document.getElementById('category-name').value,
        slug: document.getElementById('category-slug').value
    };

    if (categoryId) {
        // Режим редагування - UPDATE
        await updateCategory(categoryId, data);
    } else {
        // Режим створення - CREATE
        await createCategory(data);
    }

    closeModal();
});
```

### Переваги цього підходу

✅ **Менше дублювання коду** - один HTML файл замість двох
✅ **Єдина логіка валідації** - не потрібно підтримувати двічі
✅ **Менше файлів** - простіша структура проєкту
✅ **Консистентний UX** - користувач бачить однаковий інтерфейс

### Що НЕ треба робити

❌ **НЕ створюйте окремі модалі:**
- `entity-add-category.html` та `entity-edit-category.html` ❌
- `product-create.html` та `product-edit.html` ❌

✅ **ПРАВИЛЬНО - один модал:**
- `entity-add-category.html` (для обох режимів) ✅
- `product-form.html` (для обох режимів) ✅

---

## 📖 Приклади

### Приклад 1: Простий Confirm Modal

```html
<!-- templates/modals/confirm-delete-modal.html -->

<div class="modal-overlay">
    <div class="modal-container modal-small">

        <!-- Header -->
        <div class="modal-header">
            <h2 class="modal-title">Підтвердження видалення</h2>
            <button class="btn-icon modal-close" aria-label="Закрити" data-modal-close>
                <span class="material-symbols-outlined">close</span>
            </button>
        </div>

        <!-- Body -->
        <div class="modal-body">
            <div class="confirm-modal-container">
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
        </div>
    </div>
</div>
```

**Відкриття:**
```html
<!-- Розмір вказано в самому шаблоні (.modal-small) -->
<button data-modal-trigger="confirm-delete-modal">
    Видалити
</button>
```

### Приклад 2: Модал з Формою

```html
<!-- templates/modals/user-add.html -->

<div class="modal-overlay">
    <div class="modal-container modal-medium">

        <!-- Header -->
        <div class="modal-header">
            <h2 class="modal-title">Додати Користувача</h2>
            <button class="btn-icon modal-close" aria-label="Закрити" data-modal-close>
                <span class="material-symbols-outlined">close</span>
            </button>
        </div>

        <!-- Body -->
        <div class="modal-body">
            <form id="form-add-user" class="modal-form">

                <div class="grid2">
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
    </div>
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

### ❌ ПОМИЛКА: Стара структура з -source
```html
<!-- ЗАСТАРІЛА СТРУКТУРА - НЕ ВИКОРИСТОВУВАТИ -->
<div class="modal-title-source u-hidden">
    Назва
</div>
<div class="modal-header-actions-source u-hidden">
</div>
<div class="modal-body-source">
    Контент
</div>
```

### ✅ ПРАВИЛЬНО: Повноцінна структура
```html
<div class="modal-overlay">
    <div class="modal-container modal-small">
        <div class="modal-header">
            <h2 class="modal-title">Назва</h2>
            <button class="btn-icon modal-close" data-modal-close>
                <span class="material-symbols-outlined">close</span>
            </button>
        </div>
        <div class="modal-body">
            Контент
        </div>
    </div>
</div>
```

### ❌ ПОМИЛКА: Розмір на кнопці тригері
```html
<!-- НЕПРАВИЛЬНО -->
<button data-modal-trigger="my-modal" data-modal-size="small">
    Відкрити
</button>
```

### ✅ ПРАВИЛЬНО: Розмір в шаблоні модалу
```html
<!-- Розмір вказано в templates/modals/my-modal.html -->
<div class="modal-container modal-small">
    ...
</div>

<!-- Кнопка тригер без data-modal-size -->
<button data-modal-trigger="my-modal">
    Відкрити
</button>
```

### ❌ ПОМИЛКА: Стара система кнопок
```html
<!-- НЕПРАВИЛЬНО -->
<div class="modal-footer">
    <button class="btn">Скасувати</button>
    <button class="btn primary">Зберегти</button>
</div>
```

### ✅ ПРАВИЛЬНО: Нова система
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

- [ ] Модал має повноцінну структуру: `.modal-overlay > .modal-container > .modal-header + .modal-body`
- [ ] Розмір вказано через клас на `.modal-container` (`.modal-small`, `.modal-medium`, або `.modal-large`)
- [ ] Header має `.modal-title` та кнопку `.btn-icon.modal-close` з `data-modal-close`
- [ ] Footer використовує `connected-button-group-square modal-footer`
- [ ] Всі кнопки мають структуру `.segment > .state-layer > .label`
- [ ] Всі кнопки мають `aria-label`
- [ ] Немає inline стилів (всі стилі в CSS файлах)
- [ ] Використовуються універсальні CSS класи де можливо
- [ ] Форми мають `id` та `class="modal-form"`
- [ ] Всі input мають відповідні label
- [ ] Required поля позначені `<span class="required">*</span>`
- [ ] Модал зберігається як окремий файл в `templates/modals/`

---

## 📚 Додаткові Ресурси

- [ARCHITECTURE-PRINCIPLES.md](./ARCHITECTURE-PRINCIPLES.md) - Архітектурні принципи проєкту
- [CODE-STYLE-GUIDE.md](./CODE-STYLE-GUIDE.md) - Гайд по стилю коду
- [MODAL-TEMPLATE.html](./MODAL-TEMPLATE.html) - Готовий шаблон для копіювання

---

## 🔄 Історія Змін

### Версія 2.0 (2025-01-20)
- **BREAKING CHANGE**: Повністю нова система модалів
- Модалі тепер окремі HTML елементи (не копіюються в єдиний контейнер)
- Розмір модалу вказується в самому шаблоні через CSS клас
- Підтримка стеку модалів (модал поверх модалу)
- Lazy loading модалів через fetch
- Автоматичне видалення з DOM після закриття
- Видалено `-source` систему

### Версія 1.0 (2025-01-15)
- Початкова версія документації
- Стара система з `-source` контейнерами

---

**Автор:** Claude Code
**Дата оновлення:** 2025-01-20
**Версія:** 2.0
