# UI Tabs Scroll - Універсальний компонент горизонтального скролу

Універсальний компонент для додавання горизонтального скролу з кнопками навігації до будь-якого контейнера.

## Особливості

✅ Автоматичне створення кнопок навігації `◀` `▶`
✅ Прокрутка колесом миші (вертикальне → горизонтальне)
✅ Drag-to-scroll (перетягування мишкою)
✅ Плавна анімація прокрутки
✅ Градієнтні індикатори на краях
✅ Приховування scrollbar
✅ Автоматична адаптація при зміні розміру
✅ Auto-scroll до активного елемента

---

## Базове використання

### Варіант 1: Автоматична ініціалізація (рекомендується) ⭐

Просто додайте атрибут `data-tabs-scroll` до HTML елемента!

**HTML:**
```html
<div class="my-container" data-tabs-scroll>
    <div class="item">Item 1</div>
    <div class="item">Item 2</div>
    <div class="item">Item 3</div>
    <!-- ... багато елементів -->
</div>
```

**CSS:**
```css
.my-container {
    display: flex;
    gap: 12px;
}

.my-container .item {
    flex-shrink: 0;
    width: 200px;
}
```

**Все! Більше нічого не потрібно.** Компонент автоматично ініціалізується при завантаженні сторінки.

#### З параметрами:

```html
<!-- Кастомна прокрутка на 300px -->
<div data-tabs-scroll data-scroll-amount="300">...</div>

<!-- Без плавної прокрутки -->
<div data-tabs-scroll data-smooth-scroll="false">...</div>

<!-- Без градієнтів -->
<div data-tabs-scroll data-show-fade-indicators="false">...</div>

<!-- Без авто-скролу до активного -->
<div data-tabs-scroll data-auto-scroll-to-active="false">...</div>
```

---

### Варіант 2: Ручна ініціалізація (якщо потрібен контроль)

**HTML:**
```html
<div class="my-container">
    <div class="item">Item 1</div>
    <div class="item">Item 2</div>
    <div class="item">Item 3</div>
</div>
```

**CSS:**
```css
.my-container {
    display: flex;
    gap: 12px;
}

.my-container .item {
    flex-shrink: 0;
    width: 200px;
}
```

**JavaScript:**
```javascript
import { initTabsScroll } from './common/ui-tabs-scroll.js';

// Базове використання
initTabsScroll('.my-container');
```

---

## Параметри

```javascript
initTabsScroll(containerSelector, {
    scrollAmount: 200,           // Кількість пікселів для прокрутки при кліку (за замовчуванням 200)
    smoothScroll: true,          // Плавна прокрутка (за замовчуванням true)
    showFadeIndicators: true,    // Показувати градієнти на краях (за замовчуванням true)
    autoScrollToActive: true     // Авто-прокрутка до .active елементу (за замовчуванням true)
});
```

---

## Приклади використання

### Приклад 1: Горизонтальна галерея зображень

**HTML:**
```html
<!-- Автоматична ініціалізація -->
<div class="image-gallery" data-tabs-scroll data-scroll-amount="266">
    <img src="img1.jpg" alt="Image 1">
    <img src="img2.jpg" alt="Image 2">
    <img src="img3.jpg" alt="Image 3">
    <img src="img4.jpg" alt="Image 4">
    <img src="img5.jpg" alt="Image 5">
</div>
```

**CSS:**
```css
.image-gallery {
    display: flex;
    gap: 16px;
}

.image-gallery img {
    flex-shrink: 0;
    width: 250px;
    height: 180px;
    object-fit: cover;
    border-radius: 8px;
}
```

**JS не потрібен!** Компонент ініціалізується автоматично завдяки `data-tabs-scroll`.

<details>
<summary>Або ручна ініціалізація (клікніть щоб розгорнути)</summary>

```javascript
initTabsScroll('.image-gallery', {
    scrollAmount: 266,  // ширина зображення (250px) + gap (16px)
    showFadeIndicators: true
});
```
</details>

---

### Приклад 2: Горизонтальне меню навігації

**HTML:**
```html
<!-- Автоматична ініціалізація з прокруткою до active -->
<nav class="horizontal-menu" data-tabs-scroll data-scroll-amount="150">
    <a href="#home" class="menu-item active">Головна</a>
    <a href="#products" class="menu-item">Продукти</a>
    <a href="#services" class="menu-item">Послуги</a>
    <a href="#about" class="menu-item">Про нас</a>
    <a href="#contacts" class="menu-item">Контакти</a>
</nav>
```

**CSS:**
```css
.horizontal-menu {
    display: flex;
    gap: 8px;
}

.horizontal-menu .menu-item {
    flex-shrink: 0;
    padding: 8px 16px;
    white-space: nowrap;
    text-decoration: none;
    color: var(--color-on-surface);
    border-radius: 8px;
    transition: background 0.2s;
}

.horizontal-menu .menu-item.active {
    background: var(--color-secondary);
    color: var(--color-on-secondary);
}

.horizontal-menu .menu-item:hover {
    background: var(--color-surface-c-high);
}
```

**Готово!** Компонент автоматично прокрутить до елементу з класом `.active`.

---

### Приклад 3: Картки товарів

**HTML:**
```html
<div class="product-cards">
    <div class="card">
        <img src="product1.jpg" alt="Product 1">
        <h3>Товар 1</h3>
        <p class="price">$99.99</p>
    </div>
    <div class="card">
        <img src="product2.jpg" alt="Product 2">
        <h3>Товар 2</h3>
        <p class="price">$149.99</p>
    </div>
    <!-- ... більше карток -->
</div>
```

**CSS:**
```css
.product-cards {
    display: flex;
    gap: 20px;
}

.product-cards .card {
    flex-shrink: 0;
    width: 250px;
    padding: 16px;
    border: 1px solid var(--color-outline);
    border-radius: 12px;
    background: var(--color-surface);
}

.product-cards .card img {
    width: 100%;
    height: 200px;
    object-fit: cover;
    border-radius: 8px;
}
```

**JS:**
```javascript
initTabsScroll('.product-cards', {
    scrollAmount: 270,  // ширина картки + gap
    smoothScroll: true
});
```

---

### Приклад 4: Категорії з іконками

**HTML:**
```html
<div class="category-chips">
    <button class="chip">
        <span class="material-symbols-outlined">restaurant</span>
        <span>Ресторани</span>
    </button>
    <button class="chip">
        <span class="material-symbols-outlined">shopping_bag</span>
        <span>Магазини</span>
    </button>
    <button class="chip">
        <span class="material-symbols-outlined">hotel</span>
        <span>Готелі</span>
    </button>
    <!-- ... більше категорій -->
</div>
```

**CSS:**
```css
.category-chips {
    display: flex;
    gap: 12px;
}

.category-chips .chip {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
    padding: 8px 16px;
    background: var(--color-surface-c-high);
    border: none;
    border-radius: 24px;
    cursor: pointer;
    white-space: nowrap;
}

.category-chips .chip:hover {
    background: var(--color-secondary);
    color: var(--color-on-secondary);
}
```

**JS:**
```javascript
initTabsScroll('.category-chips', {
    scrollAmount: 180,
    showFadeIndicators: true
});
```

---

### Приклад 5: Таймлайн подій

**HTML:**
```html
<div class="timeline">
    <div class="event">
        <div class="date">2024-01-15</div>
        <div class="description">Подія 1</div>
    </div>
    <div class="event">
        <div class="date">2024-02-20</div>
        <div class="description">Подія 2</div>
    </div>
    <!-- ... більше подій -->
</div>
```

**CSS:**
```css
.timeline {
    display: flex;
    gap: 24px;
}

.timeline .event {
    flex-shrink: 0;
    width: 200px;
    padding: 16px;
    border-left: 4px solid var(--color-main);
    background: var(--color-surface-c-low);
    border-radius: 8px;
}

.timeline .event .date {
    font-weight: bold;
    color: var(--color-main);
    margin-bottom: 8px;
}
```

**JS:**
```javascript
initTabsScroll('.timeline', {
    scrollAmount: 224,  // ширина події + gap
    smoothScroll: true
});
```

---

## Множинна ініціалізація

Можна ініціалізувати кілька контейнерів одночасно:

```javascript
document.addEventListener('DOMContentLoaded', () => {
    // Ініціалізувати різні контейнери
    initTabsScroll('.product-slider');
    initTabsScroll('.category-menu');
    initTabsScroll('.image-gallery', { scrollAmount: 300 });

    // Або в циклі для всіх елементів з класом
    document.querySelectorAll('.scrollable-container').forEach(container => {
        initTabsScroll(container);
    });
});
```

---

## API компонента

Функція `initTabsScroll()` повертає API об'єкт:

```javascript
const scrollAPI = initTabsScroll('.my-container');

// Доступні методи:
scrollAPI.scrollTo(200);           // Прокрутити на 200px
scrollAPI.scrollToActive();        // Прокрутити до активного елемента
scrollAPI.updateState();           // Оновити стан кнопок
scrollAPI.destroy();               // Знищити компонент
```

### Приклад використання API:

```javascript
const galleryScroll = initTabsScroll('.image-gallery');

// Кнопка "На початок"
document.querySelector('.btn-start').addEventListener('click', () => {
    galleryScroll.scrollTo(-9999); // Прокрутити до початку
});

// Кнопка "В кінець"
document.querySelector('.btn-end').addEventListener('click', () => {
    galleryScroll.scrollTo(9999); // Прокрутити до кінця
});

// Знищити при виході зі сторінки
window.addEventListener('beforeunload', () => {
    galleryScroll.destroy();
});
```

---

## Важливі моменти

### ✅ Що потрібно для роботи:

1. **Контейнер з flex або grid:**
   ```css
   .container {
       display: flex;  /* або display: grid */
   }
   ```

2. **Заборона стискання елементів:**
   ```css
   .container .item {
       flex-shrink: 0;
   }
   ```

3. **Заборона перенесення тексту (опціонально):**
   ```css
   .container .item {
       white-space: nowrap;
   }
   ```

### ⚙️ CSS який додається автоматично:

Компонент автоматично додає до контейнера:
- `overflow-x: auto` - горизонтальний скрол
- `overflow-y: hidden` - без вертикального скролу
- `scrollbar-width: none` - приховує scrollbar
- `cursor: grab` - курсор захоплення для drag

### 📦 Згенерована структура:

```html
<div class="tabs-scroll-wrapper has-overflow is-start">
    <div class="tabs-scroll-fade-left"></div>

    <button class="tabs-scroll-nav tabs-scroll-prev" aria-label="Попередні">
        <span class="material-symbols-outlined">chevron_left</span>
    </button>

    <div class="your-container tabs-scroll-container">
        <!-- Ваш контент тут -->
    </div>

    <button class="tabs-scroll-nav tabs-scroll-next" aria-label="Наступні">
        <span class="material-symbols-outlined">chevron_right</span>
    </button>

    <div class="tabs-scroll-fade-right"></div>
</div>
```

### 🎨 Класи стану:

- `.has-overflow` - є overflow (кнопки видимі)
- `.is-start` - на початку (ліва кнопка прозора)
- `.is-end` - в кінці (права кнопка прозора)

---

## Налагодження

Компонент виводить логи в консоль:

```javascript
🎯 Ініціалізація tabs scroll для: my-container
📊 Scroll state: { scrollLeft: 0, scrollWidth: 1200, clientWidth: 800, maxScroll: 400, hasOverflow: true }
✅ Tabs scroll ініціалізовано
```

Щоб прибрати debug логи, закоментуйте рядок 84 в `ui-tabs-scroll.js`:
```javascript
// console.log('📊 Scroll state:', { scrollLeft, scrollWidth, clientWidth, maxScroll, hasOverflow });
```

---

## Знищення компонента

Якщо потрібно видалити компонент:

```javascript
import { destroyTabsScroll } from './common/ui-tabs-scroll.js';

destroyTabsScroll('.my-container');
```

Або через API:

```javascript
const scrollAPI = initTabsScroll('.my-container');
scrollAPI.destroy();
```

---

## Сумісність

- ✅ Chrome/Edge (Chromium)
- ✅ Firefox
- ✅ Safari
- ✅ Opera
- ⚠️ IE11 (потребує polyfills для ResizeObserver)

---

## Файли компонента

- **CSS:** `css/components/navigation/tabs-scroll.css`
- **JS:** `js/common/ui-tabs-scroll.js`
- **Документація:** `js/common/ui-tabs-scroll.README.md`

---

## Підтримка

Якщо виникають проблеми:
1. Перевірте консоль на помилки (F12)
2. Переконайтесь що контейнер має `display: flex`
3. Переконайтесь що елементи мають `flex-shrink: 0`
4. Перевірте що CSS файл підключений в `main.css`

---

**Створено:** 2025
**Версія:** 1.0
**Автор:** V4 ALL ALL Project
