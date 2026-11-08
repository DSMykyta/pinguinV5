# Section navigator — implementation plan

**Goal:** Незалежний модуль продовження скролу між довільними блоками та доступні ручки / кнопки.

**Architecture:** Чиста математика pull → локальний input adapter → DOM-компонент. Власник передає блоки та callbacks, компоненти блоків не мають взаємних імпортів.

**Tech Stack:** Існуючі native ES modules, HTML/CSS, Node test, Playwright. Без нових залежностей.

**Spec:** [Дослідження та контракт](../ui/section-navigator.md).

## Global constraints

- Працювати тільки у work. Зберегти паралельні зміни перед push через fetch/rebase.
- Власні pg- класи, kebab-case файли, семантичні токени; не змінювати геометрію Shell.
- DOM дітей зберігається; cleanup обов'язковий. Прогрес 88px, wheel 180px / max 60px/event, idle 200ms, cooldown 600ms.
- Кнопки є завжди; поля, nested scroll, zoom та звичайне виділення не перехоплюються.

## Review focus

- Wheel-інерція після досягнення краю не має змінити секцію.
- Два екземпляри та destroy з pending guard не мають впливати один на одного.
- Поля, вкладений scroll, виділення та pinch zoom зберігають native поведінку.
- Повернення відновлює DOM і scrollTop, а фокус не залишається в hidden панелі.
- Мобільний native скрол не запускає pull до межі; cancel не підтверджує перехід.

## Task 1: Pull model

Create `src/ui/section-navigator/pull-state.js` та `pull-state.test.js`.

- [x] Написати тести isAtBoundary(metrics, direction), normalizeWheelDelta(event, pageHeight, lineHeight), getPullProgress(distance, threshold).
- [x] Побачити помилку відсутнього модуля: `node --test src/ui/section-navigator/pull-state.test.js`.
- [x] Реалізувати чисті функції; та сама команда PASS.

## Task 2: Gesture adapter + component

Create `navigation-gestures.js`, `section-navigator.js`, `section-navigator.css`, `tests/e2e/section-navigator.spec.js`.

Consumes функції Task 1. Produces createSectionNavigator(options) → {element, navigate, getActive, destroy}.

- [x] Браузерні сценарії: одна секція за жест; свіжий wheel на межі; guard/persistence/cancel/ignore/destroy.
- [x] Реалізувати адаптер і DOM за контрактом; жодних імпортів features.
- [x] Прогнати цільові браузерні сценарії та виправити лише підтверджені помилки.

## Task 3: Demo + integration

Create `src/features/tools/section-navigator-demo.js` / `.css`; змінити тільки composition у `tools/index.js`, додати посилання в docs/ui/overview.md.

- [x] Демо «Основне → Фото → Опис» з довгою й короткою панелями; стан полів зберігається.
- [x] `npm run check`, `npm run test:e2e` — зелені; UI-перевірка мобільного й десктопного вигляду.
- [x] Перевірити diff та імпорти, зберегти у work і перевірити результат CI.

## Verification

2026-11-08: naming, build та 28 Node tests — PASS. Full Chromium suite — 54/54 PASS, включно з native touch-emulation, async guard, isolation, cleanup та збереженням DOM / scroll. [GitHub Actions](https://github.com/DSMykyta/pinguinV5/actions/runs/42503380191). У CUA окремо перевірено кнопки, desktop drag, boundary wheel та повернення зі збереженням введеного тексту.

Рішення реалізації: відступ скасовує підтвердження лише при поверненні нижче порога; невеликий відступ вище 88px лишає жест armed. Second contact спостерігається document capture listener, який тільки скасовує власний активний жест і не блокує native поведінку. Фізичний iOS Safari не перевірений.
