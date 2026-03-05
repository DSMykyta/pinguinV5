// js/components/charms/charm-virtual-scroll.js

/*
╔════════════════════════════════════════════════════════════════════════╗
║                       ШАРМ — ВІРТУАЛЬНИЙ СКРОЛ                         ║
╠════════════════════════════════════════════════════════════════════════╣
║  Малює лише видимі елементи списку. Запобігає перевантаженню DOM.      ║
║                                                                        ║
║  📋 Як використовувати:                                                  ║
║  ├── HTML: <div virtual-scroll="48" id="myList"></div>                 ║
║  ├── JS: const el = document.getElementById('myList');                 ║
║  ├── JS: el.vScrollData = [{id: 1, name: 'A'}, ...];                   ║
║  ├── JS: el.vScrollRender = (item) => `<div>${item.name}</div>`;       ║
║  └── JS: el.dispatchEvent(new CustomEvent('vscroll:update'));          ║
║                                                                        ║
║  🔌 ШАРМ                                                               ║
╚════════════════════════════════════════════════════════════════════════╝
*/

export function initVirtualScrollCharm() {
    function initCharm(container) {
        if (container._vScrollInitialized) return;
        container._vScrollInitialized = true;

        const rowHeight = parseInt(container.getAttribute('virtual-scroll') || '40', 10);
        const buffer = 10;

        // Налаштування CSS для контейнера
        container.style.position = 'relative';
        container.style.overflowY = 'auto';

        // Створення розпірки та контенту
        const spacer = document.createElement('div');
        spacer.style.width = '1px';
        spacer.style.opacity = '0';

        const content = document.createElement('div');
        content.style.position = 'absolute';
        content.style.top = '0';
        content.style.left = '0';
        content.style.right = '0';

        container.appendChild(spacer);
        container.appendChild(content);

        // Логіка відмальовування
        const render = () => {
            const data = container.vScrollData || [];
            const renderFn = container.vScrollRender || (() => '');

            if (data.length === 0) {
                spacer.style.height = '0px';
                content.innerHTML = '';
                return;
            }

            spacer.style.height = `${data.length * rowHeight}px`;

            const scrollTop = container.scrollTop;
            const viewportHeight = container.clientHeight || 500;

            let startIndex = Math.max(0, Math.floor(scrollTop / rowHeight) - buffer);
            const visibleCount = Math.ceil(viewportHeight / rowHeight) + (buffer * 2);
            const endIndex = Math.min(data.length, startIndex + visibleCount);

            const offsetY = startIndex * rowHeight;
            content.style.transform = `translateY(${offsetY}px)`;

            const visibleItems = data.slice(startIndex, endIndex);
            content.innerHTML = visibleItems.map(renderFn).join('');
        };

        // Слухачі подій
        container.addEventListener('scroll', () => {
            requestAnimationFrame(render);
        });

        container.addEventListener('vscroll:update', render);
    }

    // 1. Ініціалізуємо існуючі контейнери на сторінці
    document.querySelectorAll('[virtual-scroll]').forEach(initCharm);

    // 2. Слідкуємо за динамічною появою нових контейнерів
    const observer = new MutationObserver((mutations) => {
        mutations.forEach(m => {
            m.addedNodes.forEach(node => {
                if (node.nodeType === 1) {
                    if (node.hasAttribute('virtual-scroll')) initCharm(node);
                    node.querySelectorAll('[virtual-scroll]').forEach(initCharm);
                }
            });
        });
    });
    
    observer.observe(document.body, { childList: true, subtree: true });
}
