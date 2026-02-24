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
 * ║  КОЛЬОРИ: через шар colors.css (.c-red, .c-green, .c-yellow, .c-blue)  ║
 * ║                                                                          ║
 * ║  ЕКСПОРТОВАНІ ФУНКЦІЇ:                                                   ║
 * ║  - renderBadge(value, type, options) — Бейдж зі статусом                ║
 * ║  - renderSeverityBadge(severity) — Badge severity (low/medium/high)     ║
 * ║  - updateTableCounter(el, current, total) — Лічильник записів           ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

/** severity → color class */
const SEVERITY_COLOR = { low: 'c-green', medium: 'c-yellow', high: 'c-red' };

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

    let colorClass = '';
    let icon = '';
    let text = '';

    switch (type) {
        case 'checked':
        case 'boolean':
            const isTrue = value === 'TRUE' || value === true || value === 1;
            colorClass = isTrue ? 'c-green' : 'c-red';
            icon = isTrue ? 'check_circle' : 'cancel';
            text = isTrue ? 'Так' : 'Ні';
            break;

        case 'status':
            if (value === 'ACTIVE' || value === 'TRUE' || value === true) {
                colorClass = 'c-green';
                icon = 'check_circle';
                text = value;
            } else if (value === 'FALSE' || value === false) {
                colorClass = 'c-red';
                icon = 'cancel';
                text = value;
            } else {
                colorClass = 'c-red';
                text = value;
            }
            break;

        case 'success':
            colorClass = 'c-green';
            icon = 'check_circle';
            text = value;
            break;

        case 'error':
            colorClass = 'c-red';
            icon = 'error';
            text = value;
            break;

        case 'warning':
            colorClass = 'c-yellow';
            icon = 'warning';
            text = value;
            break;

        default:
            colorClass = 'c-red';
            text = value;
    }

    const badgeClass = `badge ${colorClass}`;

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
    const colorClass = SEVERITY_COLOR[severityLower] || 'c-red';
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
        <span class="badge ${colorClass}">
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
