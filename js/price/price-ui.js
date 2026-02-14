// js/price/price-ui.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                      PRICE - UI MANAGEMENT                                ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * Управління UI елементами для прайсу.
 */

import { priceState } from './price-init.js';
import { getAvatarPath } from '../common/avatar/avatar-user.js';
import { getInitials, getAvatarColor } from '../common/avatar/avatar-text.js';

// Column selectors тепер в createManagedTable (price-table.js)
export function populateSearchColumns() {}
export function populateTableColumns() {}

/**
 * Заповнити таби резервів (юзерів) з аватарками в section-navigator
 */
export function populateReserveTabs() {
    // Використовуємо окремий контейнер для динамічних табів
    const reserveTabsContainer = document.getElementById('reserve-tabs-container');
    if (!reserveTabsContainer) return;

    // Очищаємо тільки динамічні таби
    reserveTabsContainer.innerHTML = '';

    // Додаємо таби для кожного резерву з аватаркою
    priceState.reserveNames.forEach(name => {
        const tab = document.createElement('button');
        tab.className = 'nav-icon';
        tab.dataset.tabTarget = 'tab-price';
        tab.dataset.reserveFilter = name;

        // Перевіряємо чи є аватар в usersMap (пробуємо оригінал і lowercase)
        const userAvatar = priceState.usersMap?.[name] || priceState.usersMap?.[name.toLowerCase()];

        if (userAvatar) {
            // Є аватар - показуємо картинку
            const avatarPath = getAvatarPath(userAvatar, 'calm');
            tab.innerHTML = `
                <img src="${avatarPath}" alt="${name}" class="avatar avatar-sm" style="width: 32px; height: 32px; border-radius: 50%; object-fit: cover;">
                <span class="nav-icon-label">${name}</span>
            `;
        } else {
            // Fallback на ініціали
            const initials = getInitials(name);
            const avatarColor = getAvatarColor(name);
            tab.innerHTML = `
                <span class="avatar avatar-sm" style="background-color: ${avatarColor}; color: white; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 600;">${initials}</span>
                <span class="nav-icon-label">${name}</span>
            `;
        }
        reserveTabsContainer.appendChild(tab);
    });

}


// populateSearchColumns та populateTableColumns видалені
// Column selectors тепер в createManagedTable (price-table.js)

/**
 * Показати/сховати секцію
 */
export function toggleSection(sectionId, show) {
    const section = document.getElementById(sectionId);
    if (!section) return;

    if (show) {
        section.classList.remove('u-hidden');
        section.classList.add('active');
    } else {
        section.classList.add('u-hidden');
        section.classList.remove('active');
    }
}

/**
 * Оновити активний стан навігатора табів
 */
export function updateSectionNavigator(activeTabId) {
    const navigator = document.getElementById('tabs-head-container');
    if (!navigator) return;

    navigator.querySelectorAll('.nav-icon').forEach(icon => {
        const tabTarget = icon.dataset.tabTarget;
        if (tabTarget === activeTabId) {
            icon.classList.add('active');
        } else {
            icon.classList.remove('active');
        }
    });
}
