# Holographic Foil

Глобальний опційний механізм відбиття. Власник — `src/ui/holographic-foil/`, CSS підключено в main; жоден існуючий компонент автоматично не отримує ефект. Демо — /tools → Ефекти.

## Дослідження та вибір

Референс власника: діагональний повторюваний спектр 115°, поле шириною 300%, color-dodge, шестисекундний синхронний нахил та протилежний рух фольги. [W3C Compositing](https://www.w3.org/TR/compositing-1/#blendingcolordodge) описує нелінійне освітлення (для проміжних значень min(1, base / (1 - layer))); [MDN mix-blend-mode](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/mix-blend-mode) та [isolation](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/isolation) обґрунтовують ізоляцію. [Reduced motion](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@media/prefers-reduced-motion) — статичний режим.

Перевірено активні CloudGradient (WebGL одноколірна хмара) і PhotoCharm (розмитий дублікат фото), а також архівний AnimatedGradient (два незалежні радіальні поля). Жоден не забезпечує оптичне змішування спрямованого спектра. Повторно використано токени, Page, Tabs, Slider, Switch, SegmentSwitch і глобальне призупинення анімацій Dialog. Архівні ефекти не відновлюються. Замість анімування background-position зсувається 300%-й шар через transform, без JS кадрів і нових залежностей.

## API

```js
const foil = createHolographicFoil({ palette: 'theme', base: 'medium' });
foil.content.append(existingContent);
host.append(foil.element);
foil.setOptions({ animated: true, tilt: true, intensity: .85, duration: 6, angle: 115 });
foil.destroy();
```

Палітра theme/spectrum; основа medium/dark/theme; intensity 0..1, duration 2..30 с, angle 0..360°. enabled, animated, tilt — boolean. За замовчуванням рух вимкнений, ефект включений. getOptions повертає копію стану. Користувацький контент над декоративним шаром; за контраст контенту відповідає споживач. Не накладати на інтерактивні елементи без перевірки контрасту та clipping. Радіус можна передати через --pg-foil-radius. Перемикач фольги вимикає також нахил. При reduced motion статичний шар. У прихованій вкладці CSS не рендерить анімацію. Наявна пауза Dialog діє без додаткових подій. Демо використовує три основи і спільні контроли, не створює нових стилів кнопок.

Візуальна відповідність референсу та продуктивність потребують браузерної перевірки, особливо при багатьох екземплярах. [Реєстр](mechanism-registry.md).
