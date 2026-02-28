// js/components/charms/charm-refresh.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                    REFRESH CHARM                                        ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║                                                                          ║
 * ║  Декларативне авто-створення refresh кнопки на основі HTML атрибутів.    ║
 * ║  Працює на будь-якому елементі: section, container, modal.              ║
 * ║  Auto-discovery через MutationObserver — динамічний контент             ║
 * ║  підхоплюється автоматично без ручного виклику initRefreshCharm().      ║
 * ║                                                                          ║
 * ║  USAGE:                                                                  ║
 * ║  <section refresh>                                — кнопка + event      ║
 * ║  <section refresh confirm>                        — з підтвердженням    ║
 * ║  <section refresh confirm="Текст...">             — кастомне повідомл.  ║
 * ║  <section refresh aside data-panel-template="id"> — + aside panel       ║
 * ║  <div class="pseudo-table-container" refresh>     — для таблиць         ║
 * ║  <div class="modal-fullscreen-container" refresh confirm> — модалі      ║
 * ║                                                                          ║
 * ║  EVENT:                                                                  ║
 * ║  charm:refresh — на елементі, detail.waitUntil(promise)                 ║
 * ║                                                                          ║
 * ║  UTILITY:                                                                ║
 * ║  withSpinner(btn, asyncFn) — spinner + disabled на час виконання         ║
 * ║                                                                          ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

// ═══════════════════════════════════════════════════════════════════════════
// CHARM DISCOVERY + AUTO-OBSERVER
// ═══════════════════════════════════════════════════════════════════════════

let _observing = false;

/**
 * Знайти всі [refresh] елементи в scope та ініціалізувати charm.
 * Запускає MutationObserver для авто-discovery динамічного контенту.
 * @param {HTMLElement|Document} scope
 */
export function initRefreshCharm(scope = document) {
    scope.querySelectorAll('[refresh]').forEach(el => {
        if (el._refreshCharmInit) return;
        el._refreshCharmInit = true;
        setupRefresh(el);
    });

    if (!_observing) {
        _observing = true;
        startObserver();
    }
}

function startObserver() {
    const observer = new MutationObserver(mutations => {
        for (const m of mutations) {
            if (m.type === 'childList') {
                for (const node of m.addedNodes) {
                    if (node.nodeType !== 1) continue;
                    discoverRefresh(node);
                }
            }
            if (m.type === 'attributes') {
                discoverRefresh(m.target);
            }
        }
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['refresh']
    });
}

function discoverRefresh(node) {
    if (node.hasAttribute?.('refresh') && !node._refreshCharmInit) {
        node._refreshCharmInit = true;
        setupRefresh(node);
    }
    node.querySelectorAll?.('[refresh]').forEach(el => {
        if (el._refreshCharmInit) return;
        el._refreshCharmInit = true;
        setupRefresh(el);
    });
}

// ═══════════════════════════════════════════════════════════════════════════
// SETUP
// ═══════════════════════════════════════════════════════════════════════════

function setupRefresh(el) {
    const group = findToolbarGroup(el);
    if (!group) return;

    const btn = document.createElement('button');
    btn.className = 'btn-icon';
    btn.setAttribute('aria-label', 'Оновити');
    btn.innerHTML = '<span class="material-symbols-outlined">refresh</span>';

    // Прокинути [confirm] на створену кнопку → charm-confirm перехопить click
    if (el.hasAttribute('confirm')) {
        const val = el.getAttribute('confirm');
        btn.setAttribute('confirm', val || '');
        btn.setAttribute('confirm-type', 'reset');
    }

    // В модалях: вставити перед save кнопками. Інакше: append
    const firstSave = group.querySelector('button[id*="save"]');
    if (firstSave) {
        group.insertBefore(btn, firstSave);
    } else {
        group.appendChild(btn);
    }

    const hasAside = el.hasAttribute('aside');
    btn.addEventListener('click', () => handleRefreshClick(btn, el, hasAside));
}

async function handleRefreshClick(btn, el, hasAside) {
    await withSpinner(btn, async () => {
        const promises = [];

        // charm:refresh event — хто слухає, той реагує
        el.dispatchEvent(new CustomEvent('charm:refresh', {
            bubbles: true,
            detail: { waitUntil: (p) => promises.push(p) }
        }));

        // Aside panel
        if (hasAside) {
            const templateName = el.dataset?.panelTemplate;
            const aside = templateName && document.getElementById(templateName);
            if (aside) {
                aside.dispatchEvent(new CustomEvent('charm:refresh', {
                    bubbles: true,
                    detail: { waitUntil: (p) => promises.push(p) }
                }));
            }
        }

        await Promise.allSettled(promises);
    });
}

// ═══════════════════════════════════════════════════════════════════════════
// TOOLBAR GROUP — уніфікований пошук
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Знайти .group для елемента.
 * Case A: modal container → .modal-fullscreen-header > .group
 * Case B: <section>       → .section-header > .group (ВНИЗ)
 * Case C: container       → .section-header > .group (ВГОРУ)
 */
export function findToolbarGroup(el) {
    // Case A: modal container
    const modalHeader = el.querySelector(':scope > .modal-fullscreen-header');
    if (modalHeader) return ensureGroup(modalHeader);

    // Case B: section — шукати ВНИЗ
    const headerDown = el.querySelector(':scope > .section-header');
    if (headerDown) return ensureGroup(headerDown);

    // Case C: container — шукати ВГОРУ
    const parent = el.closest('.tab-content') || el.parentElement;
    const headerUp = parent?.querySelector('.section-header');
    if (headerUp) return ensureGroup(headerUp);

    return null;
}

function ensureGroup(header) {
    let group = header.querySelector(':scope > .group');
    if (!group) {
        group = document.createElement('div');
        group.className = 'group';
        header.appendChild(group);
    }
    return group;
}

// ═══════════════════════════════════════════════════════════════════════════
// UTILITY: SPINNER
// ═══════════════════════════════════════════════════════════════════════════

/**
 * @param {HTMLElement} btn — кнопка з .material-symbols-outlined іконкою
 * @param {Function} asyncFn — async callback
 * @returns {Promise<*>} результат asyncFn
 */
export async function withSpinner(btn, asyncFn) {
    if (btn.disabled) return;
    const icon = btn.querySelector('.material-symbols-outlined');
    btn.disabled = true;
    icon?.classList.add('spinning');
    try {
        return await asyncFn();
    } finally {
        icon?.classList.remove('spinning');
        btn.disabled = false;
    }
}
