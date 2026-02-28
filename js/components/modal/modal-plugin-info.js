// js/components/modal/modal-plugin-info.js

/*
╔══════════════════════════════════════════════════════════════════════════╗
║  🔌 ПЛАГІН — INFO MODAL                                                 ║
╠══════════════════════════════════════════════════════════════════════════╣
║                                                                          ║
║  Показує інформацію про секції сайту при натисканні кнопки "Інформація". ║
║  ├── Дані з /DATA/SectionInfo.html                                       ║
║  ├── Кнопка: button[aria-label="Інформація"]                            ║
║  └── Ключ секції: найближчий section[id] або div[id^="tab-"]           ║
║                                                                          ║
╚══════════════════════════════════════════════════════════════════════════╝
*/

import { showModal } from './modal-core.js';

let sectionInfoCache = null;

/**
 * Плагін init — реєструє глобальну делегацію для info кнопок
 */
export function init() {
    initInfoButtons();
}

/**
 * Завантажує дані з SectionInfo.html
 * @returns {Promise<Map<string, string>>}
 */
async function loadSectionInfo() {
    if (sectionInfoCache) return sectionInfoCache;

    try {
        const response = await fetch('/DATA/SectionInfo.html');
        if (!response.ok) throw new Error('Не вдалося завантажити інформацію про секції');

        const html = await response.text();
        const doc = new DOMParser().parseFromString(html, 'text/html');
        const infoMap = new Map();

        doc.querySelectorAll('[data-info-key]').forEach(block => {
            infoMap.set(block.getAttribute('data-info-key'), block.innerHTML);
        });

        sectionInfoCache = infoMap;
        return infoMap;
    } catch (error) {
        console.error('[modal/info] Помилка завантаження SectionInfo:', error);
        return new Map();
    }
}

/**
 * Знаходить ключ секції для кнопки
 */
function findSectionKey(button) {
    const section = button.closest('section[id], div[id^="tab-"]');
    if (section) return section.id;

    const tabContent = button.closest('[data-tab-content]');
    if (tabContent) return tabContent.getAttribute('data-tab-content');

    return null;
}

/**
 * Показує модал з інформацією про секцію
 */
async function showInfoModal(sectionKey) {
    const infoMap = await loadSectionInfo();
    const content = infoMap.get(sectionKey);

    if (!content) {
        console.warn(`[modal/info] Інформація для секції "${sectionKey}" не знайдена`);
        return;
    }

    await showModal('info-modal');

    const contentContainer = document.getElementById('info-content');
    if (contentContainer) contentContainer.innerHTML = content;
}

/**
 * Ініціалізація глобальної делегації для кнопок "Інформація"
 */
export function initInfoButtons() {
    document.addEventListener('click', async (e) => {
        const infoButton = e.target.closest('button[aria-label="Інформація"]');
        if (!infoButton) return;

        e.preventDefault();
        e.stopPropagation();

        const sectionKey = findSectionKey(infoButton);
        if (sectionKey) {
            await showInfoModal(sectionKey);
        } else {
            console.warn('[modal/info] Не вдалося визначити секцію для кнопки "Інформація"');
        }
    });
}

/**
 * Очищає кеш інформації (для розробки)
 */
export function clearInfoCache() {
    sectionInfoCache = null;
}
