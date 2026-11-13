# Sparkles — CSS-сітки з мікроточок

**Гілка:** `work`. **Дата:** 2026-11-13. **Референс:** TikTok Code with Ania Kubów (`https://vt.tiktok.com/ZSpCDWdu6/`) і надані скриншоти з CSS.

## Принцип

`src/ui/sparkles/sparkles.js` створює **один декоративний HTML-елемент**; `src/ui/sparkles/sparkles.css` малює **три повторювані `radial-gradient`**. Це не Canvas і не 27/100/1000 окремих DOM-частинок.

Шари з прикладу:
- нейтральний — 1px, плитка 60×60px;
- теплий — 1px, плитка 90×90px;
- холодний — 1.5px, плитка 140×140px.

Стартові `background-position`: `0 0`, `30px 40px`, `70px 20px`. За 12 секунд вони рухаються до `60px 60px`, `-60px 130px`, `210px -120px`. Кожне зміщення відрізняється на ціле число розмірів плитки, тому цикл без видимого стрибка. Візуально три сітки рухаються з різною швидкістю, хоча анімація одна.

Кольори винесені в `src/styles/tokens.css`: `--pg-color-sparkles-neutral`, `--pg-color-sparkles-warm`, `--pg-color-sparkles-cool`. Локальні компоненти не дублюють hex. `prefers-reduced-motion` залишає статичні точки; `forced-colors` прибирає суто декоративний шар.

## API та композиція

```js
import { createSparkles } from '../../ui/sparkles/sparkles.js';

const sparkles = createSparkles({ visible: true });
surface.append(sparkles.element); // surface має position: relative
sparkles.getVisible();
sparkles.setVisible(false);
sparkles.destroy();
```

Модуль Sparkles **нічого не знає** про `AnimatedGradient`, `Dialog`, `Shell` або про інші компоненти. Демонстрація `src/features/tools/animated-gradient-demo.js` накладає його на чинний градієнт та керує видимістю через наявний `createSwitch` («Іскри»); спочатку вимкнено, щоб зберегти попередній вигляд градієнта. Кнопки Light/Storm/Dawn, Dialog та логіка градієнта не замінюються.

## Обмеження

За відеореференсом анімується `background-position`: це може спричиняти перефарбовування, на відміну від compositor-only `transform`. Для невеликої декоративної підкладки та одного DOM-вузла це свідомий компроміс на користь **точного CSS-ефекту**. Не використовувати одночасно на десятках повноекранних шарів без профілювання.

Перевірки: `tests/e2e/sparkles.spec.js` (три шари, toggle, безшовні координати, reduced-motion, незалежний екземпляр).
