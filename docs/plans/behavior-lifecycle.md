# Native behavior lifecycle — план адаптації

**Дослідження:** [legacy behaviors](../legacy-behavior-research.md).

**Мета:** зберегти ідею незалежних шармів і скоротити дублювання коду зняття listeners без нового framework.

**Межі:** тільки Tooltip та navigation gestures; native AbortController на екземпляр; без змін UI, Shell, manifests або бізнес-логіки. Зовнішні таймери/frames/pointer capture очищаються явно.

- [ ] Перевірити tooltip dispose перед pending show, події після dispose, повторний mount та повторний dispose у native iframe.
- [ ] Зберегти lifecycle-регресії navigation adapter та перевірити два екземпляри на спільному document.
- [ ] Замінити парні add/remove й масив disposer-функцій на native abortable listeners у двох існуючих реалізаціях.
- [ ] Прогнати naming, Node tests, build і повний browser suite; звірити source/bundle delta з базовою версією.
- [ ] Зберегти docs та адаптацію у work через expected head, зберігаючи паралельну роботу.
