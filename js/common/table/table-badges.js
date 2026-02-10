// js/common/table/table-badges.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                    TABLE LEGO - BADGES & UTILITIES                      ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  УТИЛІТИ — Бейджі, severity, лічильник записів                          ║
 * ║                                                                          ║
 * ║  ПРИЗНАЧЕННЯ:                                                            ║
 * ║  Допоміжні функції рендерингу, які використовуються в column.render().   ║
 * ║                                                                          ║
 * ║  ЕКСПОРТОВАНІ ФУНКЦІЇ:                                                   ║
 * ║  - renderBadge(value, type, options) — Бейдж зі статусом                ║
 * ║  - renderSeverityBadge(severity) — Бейдж severity (low/medium/high)     ║
 * ║  - updateTableCounter(el, current, total) — Лічильник записів           ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

/**
 * Відрендерити badge (бейдж) зі статусом
 * @param {*} value - Значення для badge
 * @param {string} type - Тип badge ('checked', 'boolean', 'status', 'success', 'error', 'warning')
 * @param {Object} [options] - Додаткові опції
 * @param {boolean} [options.clickable=false] - Чи має badge бути клікабельним
 * @param {string} [options.id] - ID елемента (для clickable badges)
 * @returns {string} HTML код badge
 */
export function renderBadge(value, type = 'default', options = {}) {
    const { clickable = false, id = null } = options;

    let badgeClass = 'badge';
    let icon = '';
    let text = '';

    switch (type) {
        case 'checked':
        case 'boolean':
            const isTrue = value === 'TRUE' || value === true || value === 1;
            badgeClass += isTrue ? ' badge-success' : ' badge-neutral';
            icon = isTrue ? 'check_circle' : 'cancel';
            text = isTrue ? 'Так' : 'Ні';
            break;

        case 'status':
            if (value === 'ACTIVE' || value === 'TRUE' || value === true) {
                badgeClass += ' badge-success';
                icon = 'check_circle';
                text = value;
            } else if (value === 'FALSE' || value === false) {
                badgeClass += ' badge-neutral';
                icon = 'cancel';
                text = value;
            } else {
                badgeClass += ' badge-neutral';
                text = value;
            }
            break;

        case 'success':
            badgeClass += ' badge-success';
            icon = 'check_circle';
            text = value;
            break;

        case 'error':
            badgeClass += ' badge-error';
            icon = 'error';
            text = value;
            break;

        case 'warning':
            badgeClass += ' badge-warning';
            icon = 'warning';
            text = value;
            break;

        default:
            badgeClass += ' badge-neutral';
            text = value;
    }

    if (clickable) {
        badgeClass += ' clickable';
    }

    const idAttr = id ? `data-badge-id="${id}"` : '';
    const statusAttr = clickable && (type === 'checked' || type === 'boolean')
        ? `data-status="${value}"` : '';

    return `
        <span class="${badgeClass}"
              ${idAttr}
              ${statusAttr}
              ${clickable ? 'style="cursor: pointer;"' : ''}>
            ${icon ? `<span class="material-symbols-outlined" style="font-size: 16px;">${icon}</span>` : ''}
            ${text}
        </span>
    `.trim();
}

/**
 * Render severity badge (low/medium/high)
 * @param {string} severity - Severity level: 'low', 'medium', or 'high'
 * @returns {string} HTML для severity badge
 */
export function renderSeverityBadge(severity) {
    if (!severity) severity = 'high';

    const severityLower = severity.toLowerCase();
    let icon = '';

    switch (severityLower) {
        case 'low':
            icon = 'exclamation';
            break;
        case 'medium':
            icon = 'error';
            break;
        case 'high':
            icon = 'brightness_alert';
            break;
        default:
            icon = 'brightness_alert';
    }

    return `
        <span class="severity-badge severity-${severityLower}">
            <span class="material-symbols-outlined">${icon}</span>
        </span>
    `.trim();
}

/**
 * Оновити лічильник записів в таблиці
 * @param {HTMLElement} counterElement - Елемент де відобразити лічильник
 * @param {number} currentCount - Кількість поточних записів (на сторінці)
 * @param {number} totalCount - Загальна кількість записів
 */
export function updateTableCounter(counterElement, currentCount, totalCount) {
    if (!counterElement) return;

    counterElement.textContent = `Показано ${currentCount} з ${totalCount}`;
}
