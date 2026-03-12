// js/components/page/page-main.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                    PAGE BOOTSTRAP — Generic Page Factory                ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Фабрика сторінки. Один виклик замість 70-80 рядків boilerplate.       ║
 * ║                                                                          ║
 * ║  ВИКОРИСТАННЯ:                                                           ║
 * ║  import { createPage } from '../../components/page/page-main.js';       ║
 * ║                                                                          ║
 * ║  const page = createPage({                                               ║
 * ║      name: 'Brands',                                                     ║
 * ║      state,                                                              ║
 * ║      plugins,                                                            ║
 * ║      dataLoaders: [loadBrands, loadBrandLines],                          ║
 * ║      containers: ['brands-table-container'],                             ║
 * ║  });                                                                     ║
 * ║  await page.init();                                                      ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

import { initTooltips } from '../feedback/tooltip.js';
import { renderAvatarState } from '../avatar/avatar-ui-states.js';
import { createLazyLoader } from '../../utils/utils-lazy-load.js';

/**
 * Створити сторінку
 * @param {Object} config
 * @param {string} config.name - Назва модуля (для логів)
 * @param {Object} config.state - State об'єкт (з createPageState)
 * @param {Object} config.plugins - Plugin registry (з createPluginRegistry)
 * @param {Array<Function>} config.PLUGINS - Масив lazy import функцій плагінів
 * @param {Array<Function>} [config.dataLoaders] - Функції завантаження даних
 * @param {Array<string>} [config.containers] - ID контейнерів для auth/error states
 * @param {string} [config.initHook='onInit'] - Хук після завантаження даних
 * @param {string} [config.tabPrefix='tab-'] - Префікс для парсингу tabId
 * @param {string} [config.tabHook='onTabChange'] - Хук при перемиканні табу
 * @param {Object} [config.tabLazyLoaders] - { tabName: asyncFn } — lazy loading при переключенні
 * @param {Function} [config.onAuthRequired] - Кастомний handler для auth required
 * @param {Function} [config.onError] - Кастомний handler для помилок
 * @returns {{ init: Function }}
 */
export function createPage(config) {
    const {
        name = 'Page',
        state,
        plugins,
        PLUGINS = [],
        dataLoaders = [],
        containers = [],
        initHook = 'onInit',
        tabPrefix = 'tab-',
        tabHook = 'onTabChange',
        tabLazyLoaders = null,
        tabDataReadyHook = null,
        onAuthRequired = null,
        onError = null,
    } = config;

    // Lazy loaders (створюються один раз)
    const _lazyLoaders = {};
    if (tabLazyLoaders) {
        for (const [tab, loaderFn] of Object.entries(tabLazyLoaders)) {
            _lazyLoaders[tab] = createLazyLoader(loaderFn);
        }
    }

    async function loadPlugins() {
        const results = await Promise.allSettled(
            PLUGINS.map(fn => fn())
        );

        results.forEach((result, index) => {
            if (result.status === 'fulfilled' && result.value.init) {
                result.value.init(state);
            } else if (result.status === 'rejected') {
                console.warn(`[${name}] Plugin ${index} — not loaded:`, result.reason?.message || '');
            }
        });
    }

    async function checkAuthAndLoadData() {
        if (window.isAuthorized) {
            try {
                const results = await Promise.allSettled(
                    dataLoaders.map(fn => fn())
                );

                results.forEach((result, index) => {
                    if (result.status === 'rejected') {
                        console.error(`[${name}] Data loader ${index} failed:`, result.reason);
                    }
                });

                const allFailed = results.length > 0 && results.every(r => r.status === 'rejected');
                if (allFailed) {
                    renderErrorState();
                    return;
                }

                await plugins.runHookAsync(initHook, state);
            } catch (error) {
                console.error(`[${name}] Data loading error:`, error);
                renderErrorState();
            }
        } else {
            renderAuthRequiredState();
        }
    }

    function renderAuthRequiredState() {
        if (onAuthRequired) {
            onAuthRequired();
            return;
        }
        containers.forEach(containerId => {
            const container = document.getElementById(containerId);
            if (!container) return;
            container.innerHTML = renderAvatarState('authLogin', {
                message: 'Авторизуйтесь для завантаження даних',
                size: 'medium',
                containerClass: 'empty-state',
                avatarClass: 'empty-state-avatar',
                messageClass: 'avatar-state-message',
                showMessage: true
            });
        });
    }

    function renderErrorState() {
        if (onError) {
            onError();
            return;
        }
        containers.forEach(containerId => {
            const container = document.getElementById(containerId);
            if (!container) return;
            container.innerHTML = renderAvatarState('error', {
                message: 'Помилка завантаження даних',
                size: 'medium',
                containerClass: 'empty-state',
                avatarClass: 'empty-state-avatar',
                messageClass: 'avatar-state-message',
                showMessage: true
            });
        });
    }

    // ── Tab switching ──
    function initTabListener() {
        if (!state || !('activeTab' in state)) return;

        document.addEventListener('tab-switched', async (e) => {
            const tabName = e.detail.tabId.replace(tabPrefix, '');
            state.activeTab = tabName;

            plugins.runHook(tabHook, tabName);
            plugins.runHook('onRender');

            if (!window.isAuthorized) return;

            // Lazy load data for tab
            if (_lazyLoaders[tabName]) {
                await _lazyLoaders[tabName].load();
            }

            // Post-load hook (fires every switch, not just first load)
            if (tabDataReadyHook) {
                plugins.runHook(tabDataReadyHook, tabName);
            }
        });
    }

    async function init() {
        initTooltips();
        await loadPlugins();
        initTabListener();
        await checkAuthAndLoadData();

        document.addEventListener('auth-state-changed', async (event) => {
            if (event.detail.isAuthorized) {
                await checkAuthAndLoadData();
            }
        });
    }

    return { init };
}
