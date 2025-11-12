# Мануал зі структури модальних вікон

Цей документ описує структуру та класи модальних вікон згідно з Material Design 3 та стандартами проєкту.

## Базова структура модального вікна

```html
<div class="modal-overlay">
    <div class="modal-content">
        <div class="modal-header">
            <!-- Заголовок та дії -->
        </div>
        <div class="modal-body">
            <!-- Контент модалу -->
        </div>
        <div class="modal-footer">
            <!-- Кнопки дій (опціонально) -->
        </div>
    </div>
</div>
```

---

## 1. Контейнер модального вікна

### `.modal-overlay`
- Зовнішній контейнер модального вікна
- Створює затемнений фон позаду модалу
- Покриває весь екран

### `.modal-content`
- Основний контейнер модалу
- Містить header, body та footer
- Може мати атрибут `style="max-width: XXXpx;"` для обмеження ширини
- Може мати атрибут `style="width: auto; height: auto;"` для адаптивного розміру

**Приклад:**
```html
<div class="modal-overlay">
    <div class="modal-content" style="max-width: 800px;">
        <!-- вміст -->
    </div>
</div>
```

---

## 2. Заголовок модалу (Modal Header)

### Структура `.modal-header`

```html
<div class="modal-header">
    <div class="modal-title-container">
        <h2 id="modal-title">Назва модалу</h2>
    </div>
    <div class="header-actions">
        <div class="connected-button-group-square" role="group">
            <!-- Кнопки дій -->
        </div>
    </div>
</div>
```

### Класи:

#### `.modal-header`
- Контейнер заголовку
- Містить назву та кнопки дій

#### `.modal-title-container`
- Контейнер для заголовку
- Містить елемент `<h2 id="modal-title">`

#### `#modal-title`
- Заголовок модального вікна
- Завжди тег `<h2>`
- Має унікальний ID `modal-title`

#### `.header-actions`
- Контейнер для кнопок дій у заголовку
- Розташований праворуч від заголовку

#### `.connected-button-group-square`
- Група з'єднаних кнопок (segmented buttons)
- Має атрибут `role="group"`
- Містить кнопки-сегменти

---

## 3. Кнопки в заголовку

### Структура кнопки-сегменту

```html
<button class="segment" aria-label="Опис дії">
    <div class="state-layer">
        <span class="label">Текст кнопки</span>
    </div>
</button>
```

### Класи кнопок:

#### `.segment`
- Основний клас кнопки в групі
- Обов'язковий для всіх кнопок у `.connected-button-group-square`

#### `.segment.active`
- Активний стан кнопки (додається динамічно)

#### `.state-layer`
- Внутрішній контейнер для візуальних ефектів
- Обов'язковий для кожної кнопки

#### `.label`
- Текст кнопки всередині `<span>`

#### `.segment.modal-close-btn`
- Спеціальний клас для кнопки закриття
- Зазвичай містить символ `×` або іконку закриття

#### `.segment.accent-btn`
- Акцентована кнопка (для важливих дій, наприклад видалення)

**Приклад кнопки назад:**
```html
<button id="modal-back-btn" class="segment" style="display: none;" aria-label="Назад">
    <div class="state-layer">
        <span class="label">Назад</span>
    </div>
</button>
```

**Приклад кнопки збереження:**
```html
<button id="saveCharacteristicBtn" class="segment" aria-label="Зберегти">
    <div class="state-layer">
        <span class="label">Зберегти</span>
    </div>
</button>
```

**Приклад кнопки закриття:**
```html
<button class="segment modal-close-btn">
    <div class="state-layer">
        <span class="label">&times;</span>
    </div>
</button>
```

---

## 4. Тіло модалу (Modal Body)

### Структура `.modal-body`

```html
<div class="modal-body">
    <!-- Контент модалу -->
</div>
```

### Варіанти класів:

#### `.modal-body`
- Стандартний контейнер тіла модалу

#### `.modal-body.scrollable-panel`
- Тіло з вертикальною прокруткою
- Використовується для довгих форм або списків

#### `.modal-body.modal-body--split`
- Розділене тіло на дві частини (форма + бічна панель)
- Використовується в складних формах з додатковими даними

**Приклад простого тіла:**
```html
<div class="modal-body scrollable-panel">
    <p id="delete-summary-text"></p>
    <div id="delete-details-container"></div>
</div>
```

**Приклад розділеного тіла:**
```html
<div class="modal-body modal-body--split">
    <div class="form-section scrollable-panel">
        <!-- Форма -->
    </div>
    <div class="side-panel-container">
        <!-- Бічна панель -->
    </div>
</div>
```

---

## 5. Форми в модалі

### Структура форми

```html
<div class="form-section scrollable-panel">
    <input type="hidden" id="entity-local_id">

    <fieldset class="form-fieldset">
        <legend>Назва секції</legend>
        <div class="form-grid">
            <!-- Поля форми -->
        </div>
    </fieldset>
</div>
```

### Класи форм:

#### `.form-section`
- Контейнер секції форми

#### `.form-fieldset`
- Група пов'язаних полів
- Має тег `<fieldset>`
- Містить `<legend>` для назви групи

#### `.form-grid`
- Сітка для розміщення полів форми
- Автоматичне розташування полів у 5 колонок

#### `.form-grid-2`
- Сітка з 2 колонками

#### `.form-group`
- Контейнер окремого поля форми
- Містить `<label>` та поле вводу

#### `.form-group.span-5`
- Поле, що займає всі 5 колонок

#### `.form-input-group`
- Група пов'язаних інпутів

**Приклад поля форми:**
```html
<div class="form-group">
    <label for="char-is_global">Наскрізний</label>
    <label class="toggle-switch-segmented">
        <input type="checkbox" id="char-is_global">
        <span class="slider">
            <span class="text-off">Ні</span>
            <span class="text-on">Так</span>
        </span>
    </label>
</div>
```

**Приклад поля з чіпом мови:**
```html
<div class="form-group">
    <label>Назва</label>
    <div class="form-input-group">
        <div class="input-with-chip">
            <input type="text" id="opt-name_uk" required placeholder="Назва українською *">
            <span class="input-language-chip">укр</span>
        </div>
    </div>
</div>
```

---

## 6. Підвал модалу (Modal Footer)

### Структура `.modal-footer`

```html
<div class="modal-footer">
    <div class="connected-button-group-round" role="group">
        <!-- Кнопки дій -->
    </div>
</div>
```

Або з простими кнопками:

```html
<div class="modal-footer">
    <button id="btn-start-import" class="btn-save" disabled>
        <span class="label">Почати імпорт</span>
    </button>
</div>
```

### Класи:

#### `.modal-footer`
- Контейнер підвалу модалу
- Містить фінальні кнопки дій

#### `.connected-button-group-round`
- Група з'єднаних кнопок з округленням
- Має атрибут `role="group"`

#### `.btn-save`
- Клас для основної кнопки збереження/дії

**Приклад футера з групою кнопок:**
```html
<div class="modal-footer">
    <div class="connected-button-group-round" role="group">
        <button id="btn-cancel-delete" class="segment">
            <div class="state-layer">
                <span class="label">Скасувати</span>
            </div>
        </button>
        <button id="btn-delete-cascade" class="segment accent-btn">
            <div class="state-layer">
                <span class="label">Видалити</span>
            </div>
        </button>
    </div>
</div>
```

---

## 7. Бічні панелі в модалі

### Структура бічної панелі

```html
<div class="side-panel-container">
    <div id="children-panel" class="related-section">
        <div class="panel-header">
            <h3>Назва панелі</h3>
            <div class="panel-controls">
                <!-- Кнопки керування -->
            </div>
        </div>
        <!-- Таблиця або контент -->
    </div>
</div>
```

### Класи:

#### `.side-panel-container`
- Контейнер для бічної панелі

#### `.related-section`
- Секція пов'язаних даних
- Може мати клас `.visible` для показу

#### `.panel-header`
- Заголовок панелі

#### `.panel-controls`
- Контейнер для кнопок керування панеллю

---

## 8. Перемикачі (Toggle Switches)

### Звичайний перемикач

```html
<label class="toggle-switch">
    <input type="checkbox" id="field-id">
    <span class="slider"></span>
</label>
```

### Сегментований перемикач (з текстом)

```html
<label class="toggle-switch-segmented">
    <input type="checkbox" id="field-id">
    <span class="slider">
        <span class="text-off">Ні</span>
        <span class="text-on">Так</span>
    </span>
</label>
```

### Класи:

#### `.toggle-switch`
- Контейнер звичайного перемикача

#### `.toggle-switch-segmented`
- Контейнер сегментованого перемикача з текстом

#### `.slider`
- Візуальний елемент перемикача

#### `.text-off` / `.text-on`
- Текст для станів вимкнено/увімкнено

---

## 9. Спеціальні елементи

### Приховане поле для ID

```html
<input type="hidden" id="entity-local_id">
```

### Чіп мови для інпутів

```html
<div class="input-with-chip">
    <input type="text" id="name_uk" placeholder="Українська назва">
    <span class="input-language-chip">укр</span>
</div>
```

### Підказка в label

```html
<label for="field-id">
    Назва поля
    <span class="required">*</span>
</label>
```

Або:

```html
<label for="field-id">
    Назва поля
    <span class="form-hint">(додаткова інформація)</span>
</label>
```

---

## 10. Приклади повних модалів

### Простий модал підтвердження

```html
<div class="modal-overlay">
    <div class="modal-content" style="width: auto; height: auto;">
        <div class="modal-header">
            <h2 id="delete-modal-title">Підтвердження видалення</h2>
            <button class="segment modal-close-btn" aria-label="Закрити">
                <div class="state-layer">
                    <span class="label">&times;</span>
                </div>
            </button>
        </div>
        <div class="modal-body scrollable-panel">
            <p id="delete-summary-text"></p>
            <div id="delete-details-container"></div>
        </div>
        <div class="modal-footer">
            <div class="connected-button-group-round" role="group">
                <button id="btn-cancel-delete" class="segment">
                    <div class="state-layer">
                        <span class="label">Скасувати</span>
                    </div>
                </button>
                <button id="btn-delete-cascade" class="segment accent-btn">
                    <div class="state-layer">
                        <span class="label">Видалити</span>
                    </div>
                </button>
            </div>
        </div>
    </div>
</div>
```

### Модал з формою

```html
<div class="modal-overlay">
    <div class="modal-content" style="max-width: 600px;">
        <div class="modal-header">
            <h2 id="modal-title">Створити опцію</h2>
            <div class="header-actions">
                <div class="connected-button-group-square" role="group">
                    <button id="saveOptionBtn" class="segment" aria-label="Зберегти">
                        <div class="state-layer">
                            <span class="label">Зберегти</span>
                        </div>
                    </button>
                    <button class="segment modal-close-btn">
                        <div class="state-layer">
                            <span class="label">&times;</span>
                        </div>
                    </button>
                </div>
            </div>
        </div>
        <div class="modal-body scrollable-panel">
            <input type="hidden" id="opt-local_id">
            <fieldset class="form-fieldset">
                <legend>Основна інформація</legend>
                <div class="form-group">
                    <label for="opt-char_local_id">Батьківська характеристика *</label>
                    <select id="opt-char_local_id" data-custom-select placeholder="Оберіть характеристику..."></select>
                </div>

                <div class="form-group" style="margin-top: 16px;">
                    <label>Назва</label>
                    <div class="form-input-group">
                        <div class="input-with-chip">
                            <input type="text" id="opt-name_uk" required placeholder="Назва українською *">
                            <span class="input-language-chip">укр</span>
                        </div>
                    </div>
                </div>
            </fieldset>
        </div>
    </div>
</div>
```

---

## Важливі правила

1. **Завжди використовуйте `.state-layer`** всередині кнопок `.segment`
2. **Текст кнопки** завжди в `<span class="label">`
3. **ID заголовку** завжди `modal-title`
4. **Групи кнопок** завжди мають `role="group"`
5. **Приховані елементи** використовують `style="display: none;"`
6. **Прокручувані області** використовують клас `.scrollable-panel`
7. **Акцентовані кнопки** (небезпечні дії) отримують клас `.accent-btn`
8. **aria-label** обов'язковий для кнопок з іконками або символами
