// js/layout/layout-plugin-nav-tabs-dynamic.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                       ДИНАМІЧНІ ВКЛАДКИ (TABS)                           ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║                                                                          ║
 * ║  Система вкладок що додаються/видаляються програмно під час роботи.      ║
 * ║  На відміну від layout-plugin-nav-tabs.js — вкладки тут не фіксовані в HTML.   ║
 * ║                                                                          ║
 * ║  📋 МОЖЛИВОСТІ:                                                          ║
 * ║  ├── createTab(id, config)  — додати нову вкладку                        ║
 * ║  ├── removeTab(id)          — видалити вкладку                           ║
 * ║  ├── switchToTab(id)        — перемкнутися програмно                     ║
 * ║  ├── getActiveTab()         — отримати ID активної вкладки               ║
 * ║  └── getAllTabs()           — отримати всі вкладки                       ║
 * ║                                                                          ║
 * ║  📋 ОПЦІЇ:                                                               ║
 * ║  ├── staticTabs      — ID вкладок які не можна закрити                   ║
 * ║  ├── onTabSwitch     — callback при перемиканні                          ║
 * ║  ├── onTabClose      — callback перед закриттям (false = скасувати)      ║
 * ║  └── confirmCloseModal — модал підтвердження закриття                   ║
 * ║                                                                          ║
 * ║  🎯 ВИКОРИСТАННЯ:                                                        ║
 * ║  import { initDynamicTabs } from './layout/layout-main.js';              ║
 * ║  const api = initDynamicTabs(container, { staticTabs: ['main'] });       ║
 * ║  await api.createTab('tab-1', { title: 'Назва', closeable: true });      ║
 * ║                                                                          ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

import { showConfirmModal } from '../components/modal/modal-main.js';

// ═══════════════════════════════════════════════════════════════════════════
// ПУБЛІЧНЕ API
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Ініціалізувати систему динамічних табів
 * @param {HTMLElement} tabsContainer - Контейнер для кнопок табів
 * @param {Object} options - Опції
 * @param {string[]} [options.staticTabs=[]] - ID табів які не можна закрити
 * @param {Function} [options.onTabSwitch] - Callback при перемиканні табу (tabId)
 * @param {Function} [options.onTabClose] - Callback перед закриттям табу (tabId), return false = скасувати
 * @param {string} [options.confirmCloseModal] - ID модалу для підтвердження закриття
 * @param {Object} [options.tabTemplates] - Шаблони табів {type: templatePath}
 * @returns {Object} API для керування табами
 * @example
 * const tabsAPI = initDynamicTabs(container, {
 *   staticTabs: ['tab-main'],
 *   onTabSwitch: (tabId) => console.log('Switched to', tabId),
 *   confirmCloseModal: 'confirm-close-modal',
 *   tabTemplates: {
 *     'check': '/templates/partials/check-tab.html'
 *   }
 * });
 */
export function initDynamicTabs(tabsContainer, options = {}) {
    const {
        staticTabs = [],
        onTabSwitch = null,
        onTabClose = null,
        confirmCloseModal = null,
        tabTemplates = {}
    } = options;

    const templateCache = new Map();

    // ───────────────────────────────────────────────────────────────────────
    // ВНУТРІШНІ ХЕЛПЕРИ
    // ───────────────────────────────────────────────────────────────────────

    /**
     * Завантажити шаблон табу
     */
    async function loadTemplate(templatePath) {
        if (templateCache.has(templatePath)) {
            return templateCache.get(templatePath);
        }

        try {
            const response = await fetch(templatePath);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            const html = await response.text();
            templateCache.set(templatePath, html);
            return html;
        } catch (error) {
            console.error('Failed to load tab template:', error);
            return null;
        }
    }

    /**
     * Замінити placeholder'и в шаблоні
     */
    function replacePlaceholders(template, data) {
        let result = template;

        Object.keys(data).forEach(key => {
            const regex = new RegExp(`{{${key}}}`, 'g');
            result = result.replace(regex, data[key] || '');
        });

        return result;
    }

    // ───────────────────────────────────────────────────────────────────────
    // API ТАБІВ
    // ───────────────────────────────────────────────────────────────────────

    /**
     * Створити новий таб
     */
    async function createTab(tabId, config) {
        const {
            title = 'Новий таб',
            type = 'default',
            data = {},
            closeable = true,
            contentTemplate = null,
            contentContainer = null
        } = config;

        // Перевірити чи таб вже існує
        if (tabsContainer.querySelector(`[data-tab-target="${tabId}"]`)) {
            console.warn(`Tab ${tabId} already exists`);
            return false;
        }

        // Завантажити шаблон кнопки табу
        let buttonHTML = '';
        if (type !== 'default' && tabTemplates[type]) {
            const template = await loadTemplate(tabTemplates[type]);
            if (template) {
                buttonHTML = replacePlaceholders(template, {
                    ...data,
                    title: title
                });
            }
        }

        // Fallback HTML якщо немає шаблону
        if (!buttonHTML) {
            buttonHTML = `
                <div class="state-layer">
                    <span class="label">${title}</span>
                    ${closeable ? `
                        <button class="tab-close-btn" aria-label="Закрити таб">
                            <span class="material-symbols-outlined">close</span>
                        </button>
                    ` : ''}
                </div>
            `;
        }

        // Створити кнопку табу
        const tabButton = document.createElement('button');
        tabButton.className = 'btn-icon tab-button';
        tabButton.dataset.tabTarget = tabId;
        tabButton.innerHTML = buttonHTML;

        // Зберегти дані в dataset
        if (data) {
            Object.keys(data).forEach(key => {
                tabButton.dataset[key] = data[key];
            });
        }

        tabsContainer.appendChild(tabButton);

        // Створити контент табу якщо є contentContainer
        if (contentContainer && contentTemplate) {
            const tabContent = document.createElement('div');
            tabContent.className = 'tab-content';
            tabContent.dataset.tabContent = tabId;

            const contentHTML = replacePlaceholders(contentTemplate, {
                ...data,
                tabId: tabId
            });

            tabContent.innerHTML = contentHTML;
            contentContainer.appendChild(tabContent);
        }

        return true;
    }

    /**
     * Видалити таб
     */
    async function removeTab(tabId, skipConfirmation = false) {
        // Перевірити чи це статичний таб
        if (staticTabs.includes(tabId)) {
            console.warn(`Cannot remove static tab: ${tabId}`);
            return false;
        }

        // Викликати callback onTabClose
        if (onTabClose && !skipConfirmation) {
            const shouldClose = await onTabClose(tabId);
            if (shouldClose === false) {
                return false;
            }
        }

        // Підтвердження через модал якщо потрібно
        if (confirmCloseModal && !skipConfirmation) {
            const confirmed = await showConfirmCloseModalInternal(confirmCloseModal, tabId);
            if (!confirmed) {
                return false;
            }
        }

        // Знайти елементи табу
        const tabButton = tabsContainer.querySelector(`[data-tab-target="${tabId}"]`);
        const tabContent = document.querySelector(`[data-tab-content="${tabId}"]`);

        if (!tabButton) {
            console.warn(`Tab button not found: ${tabId}`);
            return false;
        }

        const wasActive = tabButton.classList.contains('active');

        // Видалити елементи
        tabButton.remove();
        if (tabContent) {
            tabContent.remove();
        }

        // Якщо таб був активний - перемкнутись на перший доступний
        if (wasActive) {
            const firstTab = tabsContainer.querySelector('.tab-button');
            if (firstTab) {
                setTimeout(() => {
                    firstTab.click();
                }, 100);
            }
        }

        return true;
    }

    /**
     * Перемкнутись на таб
     */
    function switchToTab(tabId) {
        const tabButton = tabsContainer.querySelector(`[data-tab-target="${tabId}"]`);
        if (tabButton) {
            tabButton.click();
            return true;
        }
        return false;
    }

    /**
     * Отримати активний таб
     */
    function getActiveTab() {
        const activeButton = tabsContainer.querySelector('.tab-button.active');
        return activeButton ? activeButton.dataset.tabTarget : null;
    }

    /**
     * Отримати всі таби
     */
    function getAllTabs() {
        const buttons = tabsContainer.querySelectorAll('.tab-button');
        return Array.from(buttons).map(btn => ({
            id: btn.dataset.tabTarget,
            isActive: btn.classList.contains('active'),
            data: {...btn.dataset}
        }));
    }

    /**
     * Показати модал підтвердження закриття
     */
    async function showConfirmCloseModalInternal(modalId, tabId) {
        // Отримати назву табу для повідомлення
        const tabButton = tabsContainer.querySelector(`[data-tab-target="${tabId}"]`);
        const tabLabel = tabButton?.querySelector('.label')?.textContent || tabId;

        return showConfirmModal({
            title: 'Закрити таб?',
            message: `Ви впевнені, що хочете закрити "${tabLabel}"?`,
            confirmText: 'Закрити',
            cancelText: 'Скасувати',
            confirmClass: 'danger',
            avatarState: 'confirmClose',
            avatarSize: 'small'
        });
    }

    // ───────────────────────────────────────────────────────────────────────
    // ІНІЦІАЛІЗАЦІЯ
    // ───────────────────────────────────────────────────────────────────────

    initTabEventHandlers();

    function initTabEventHandlers() {
        // Делегування подій для перемикання табів
        tabsContainer.addEventListener('click', (e) => {
            const tabButton = e.target.closest('.tab-button');
            if (!tabButton) return;

            // Перевірити чи це не клік на кнопку закриття
            if (e.target.closest('.tab-close-btn')) {
                return; // Обробляється окремо
            }

            const tabId = tabButton.dataset.tabTarget;
            if (!tabId) return;

            e.preventDefault();

            // Зняти active з усіх табів
            tabsContainer.querySelectorAll('.tab-button').forEach(btn => {
                btn.classList.remove('active');
            });

            // Додати active на клікнутий таб
            tabButton.classList.add('active');

            // Перемкнути контент
            document.querySelectorAll('.tab-content').forEach(content => {
                content.classList.remove('active');
            });

            const tabContent = document.querySelector(`[data-tab-content="${tabId}"]`);
            if (tabContent) {
                tabContent.classList.add('active');
            }

            // Викликати callback
            if (onTabSwitch) {
                onTabSwitch(tabId);
            }
        });

        // Обробник закриття табів
        tabsContainer.addEventListener('click', async (e) => {
            const closeButton = e.target.closest('.tab-close-btn');
            if (!closeButton) return;

            e.preventDefault();
            e.stopPropagation();

            const tabButton = closeButton.closest('.tab-button');
            if (!tabButton) return;

            const tabId = tabButton.dataset.tabTarget;
            await removeTab(tabId);
        });
    }

    // Повернути API
    return {
        createTab,
        removeTab,
        switchToTab,
        getActiveTab,
        getAllTabs,
        loadTemplate
    };
}
