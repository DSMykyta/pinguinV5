# Animated Gradient — primary + дві рухливі кольорові плями

**Гілка:** `work`. **Оновлено:** 2026-11-13. **Референс:** передані користувачем скріншоти техніки двох `radial-gradient` у спільному `::before`, який рухається через `translate/rotate/scale`.

## Єдиний API

```js
const gradient = createAnimatedGradient({
  text: 'pinguinV6',  // null = без тексту
  preset: 'dawn',     // 'light' | 'storm' | 'dawn'
});
gradient.getPreset();
gradient.setPreset('storm');
```

Компонент — `src/ui/animated-gradient/animated-gradient.js`, стилі — `animated-gradient.css`. Демо складає існуючі `ButtonGroup` та `Dialog(presentation:'edge-to-edge')`. **Жодного другого Dialog, нового кнопкового компонента або спеціального менеджера анімацій.**

## Колір і шари

1. На корені `.pg-animated-gradient` — **суцільний `background: var(--pg-tone-main-base)`**. Це роль **primary/main** у поточній палітрі, одна для всіх трьох пресетів.
2. Єдиний псевдоелемент `::before` (`position:absolute; inset:-20%`) містить **рівно два** `radial-gradient(circle at ...)`:
   - `var(--pg-tone-secondary-base)` → transparent: другий колір;
   - `var(--pg-tone-tertiary-base)` → transparent: третій колір.
3. Псевдоелемент має `filter:blur(...)` (за замовчуванням 60px), тому плями **без контурів, швів та геометричних форм**. Шуму, grain Canvas, додаткових DOM-глоу чи окремих бекграундів немає.
4. `@keyframes pg-gradient-color-drift` рухає **тільки один** готовий розмитий шар через `transform:translate3d(...) rotate(...) scale(...)`, `animation-direction:alternate`, `infinite`. Пікселі не перераховуються в JS, CSS `background-position` не анімується.

## Light / Storm / Dawn

Кнопки з попереднього демо залишилися. **Новий запит змінив їхню колірну модель:** усі три тепер мають той самий `main` фон і дві плями `secondary/tertiary`. Пресети відрізняються **розташуванням, радіусом, розмиттям, насиченістю та швидкістю руху**, а не старими шестиступеневими колірними рецептами `legacy`:

| Пресет | Розташування | Blur | Рух |
| --- | --- | ---: | ---: |
| `light` | Блакитний зліва вгорі, помаранчевий справа знизу, ширші плями | 68px | 19с |
| `storm` | Блакитний зліва внизу, помаранчевий справа вгорі, контрастніші плями | 52px | 11с |
| `dawn` | Блакитний 30%/40%, помаранчевий 70%/60% як у референсі | 60px | 14с |

Назви залишені для сумісності перемикача та його логіки. Оригінальні рецепти `legacy` збережені тільки в [дослідженні](../research/animated-gradient.md), а не як дубльований renderer.

## Продуктивність та доступність

- Один **CSS-псевдошар** замість двох Canvas і grain. `transform` може оброблятися compositor браузера, але `filter:blur` під час підготовки шару та GPU-пам'ять усе одно мають вартість; точні FPS без тесту на пристрої користувача не обіцяємо.
- `prefers-reduced-motion` зупиняє рух, зберігаючи обидві плями.
- Коли відкритий Dialog, існуючі загальні CSS-правила призупиняють анімації на `#app`, але градієнт **всередині активного Dialog** рухається.
- Зміна теми автоматично використовує чинні `--pg-tone-*-base`, без JS MutationObserver; API `setPreset` лише змінює `data-pg-preset`.

## Перевірки

`tests/e2e/animated-gradient.spec.js` перевіряє: два радіальні градієнти, відсутність Canvas/noise, три пресети, циклічний CSS-transform, reduced-motion, паузу за Dialog та загальну модальну механіку.

Не називати браузерні тести виконаними без реального запуску.
