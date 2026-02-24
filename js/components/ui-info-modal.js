// js/common/ui-info-modal.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                    INFO MODAL - ІНФОРМАЦІЯ ПРО СЕКЦІЇ                    ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * Показує інформацію про секції сайту при натисканні на кнопку "Інформація".
 * Дані завантажуються з /DATA/SectionInfo.html
 *
 * ВИКОРИСТАННЯ:
 * Кнопка має атрибут aria-label="Інформація" і знаходиться всередині секції
 * з id (наприклад section-table, tab-brands тощо)
 */

import { showModal, closeModal } from './ui-modal.js';

// Кеш завантажених даних
let sectionInfoCache = null;

/**
 * Завантажує дані з SectionInfo.html
 * @returns {Promise<Map<string, string>>} Map з ключами секцій та HTML контентом
 */
async function loadSectionInfo() {
    if (sectionInfoCache) {
        return sectionInfoCache;
    }

    try {
        const response = await fetch('/DATA/SectionInfo.html');
        if (!response.ok) {
            throw new Error('Не вдалося завантажити інформацію про секції');
        }

        const html = await response.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');

        // Парсимо всі блоки з data-info-key
        const infoBlocks = doc.querySelectorAll('[data-info-key]');
        const infoMap = new Map();

        infoBlocks.forEach(block => {
            const key = block.getAttribute('data-info-key');
            // Беремо внутрішній HTML (без зовнішнього div)
            infoMap.set(key, block.innerHTML);
        });

        sectionInfoCache = infoMap;

        return infoMap;
    } catch (error) {
        console.error('❌ Помилка завантаження SectionInfo:', error);
        return new Map();
    }
}

/**
 * Знаходить ключ секції для кнопки
 * @param {HTMLElement} button - Кнопка "Інформація"
 * @returns {string|null} Ключ секції або null
 */
function findSectionKey(button) {
    // Шукаємо батьківську секцію з id
    const section = button.closest('section[id], div[id^="tab-"]');

    if (section) {
        return section.id;
    }

    // Альтернативно - шукаємо data-tab-content
    const tabContent = button.closest('[data-tab-content]');
    if (tabContent) {
        return tabContent.getAttribute('data-tab-content');
    }

    return null;
}

/**
 * Показує модал з інформацією про секцію
 * @param {string} sectionKey - Ключ секції
 */
async function showInfoModal(sectionKey) {
    const infoMap = await loadSectionInfo();
    const content = infoMap.get(sectionKey);

    if (!content) {
        console.warn(`⚠️ Інформація для секції "${sectionKey}" не знайдена`);
        return;
    }

    // Відкриваємо модал
    await showModal('info-modal');

    // Заповнюємо контент
    const contentContainer = document.getElementById('info-content');
    if (contentContainer) {
        contentContainer.innerHTML = content;
    }
}

/**
 * Ініціалізація обробників для кнопок "Інформація"
 */
export function initInfoButtons() {
    // Делегування подій - один обробник на document
    document.addEventListener('click', async (e) => {
        const infoButton = e.target.closest('button[aria-label="Інформація"]');

        if (!infoButton) return;

        e.preventDefault();
        e.stopPropagation();

        const sectionKey = findSectionKey(infoButton);

        if (sectionKey) {
            await showInfoModal(sectionKey);
        } else {
            console.warn('⚠️ Не вдалося визначити секцію для кнопки "Інформація"');
        }
    });

}

/**
 * Очищає кеш інформації (для розробки)
 */
export function clearInfoCache() {
    sectionInfoCache = null;
}

// Експорт для window (backward compatibility)
window.initInfoButtons = initInfoButtons;
window.clearInfoCache = clearInfoCache;
