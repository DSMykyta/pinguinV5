# Вітальний Dialog Pinguin V6

- Стандартний native Dialog, edge-to-edge, `showClose: false`: без рамки, заголовка, футера або кнопок, Escape і клік поза вікном закривають його.
- Вхід через `/` показує вітання один раз за сесію вкладки. `/tools` → «Таблиці» → «Вітання Pinguin V6» відкриває його повторно.
- Використано той самий `src/ui/cloud-gradient` WebGL, що й у `/login-demo`: `tone: 'tertiary', background: 'brand', cycle: true`. Синя підкладка, одна тепла хмара, без нового renderer. Швидкість і яскравість плавно змінюються в тому самому циклі кадрів.
- Сторінка входу зберігає початкові параметри. Прихована вкладка, reduced motion та cleanup обслуговуються наявним CloudGradient. Vercel не потрібен. Перевірки: `npm run check` і `npm run test:e2e -- tests/e2e/welcome-dialog.spec.js`.
