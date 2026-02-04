/**
 * MOBILE ADAPTATION: Instruments Page
 *
 * ПРИЗНАЧЕННЯ:
 * Повністю ізольований JavaScript для мобільної адаптації сторінки інструментів.
 * Не торкається жодного існуючого коду - працює автономно.
 *
 * ФУНКЦІОНАЛ:
 * - Mobile header з burger menu
 * - Bottom navigation bar
 * - Bottom sheet для aside
 * - Horizontal swipe між секціями
 * - Mobile select (bottom sheet)
 * - Touch gestures
 */

(function MobileInstruments() {
    'use strict';

    console.log('[Mobile] Script loaded');

    // ============================================
    // CONFIGURATION
    // ============================================

    const CONFIG = {
        breakpoint: 768,
        sections: [
            { id: 'section-table', icon: 'table_chart', label: 'Таблиці', asideTemplate: 'aside-table' },
            { id: 'section-text', icon: 'edit_note', label: 'Текст', asideTemplate: 'aside-highlight' },
            { id: 'section-seo', icon: 'search', label: 'Сео', asideTemplate: 'aside-seo' },
            { id: 'section-translate', icon: 'translate', label: 'Переклад', asideTemplate: 'aside-translate' },
            { id: 'section-links', icon: 'web', label: 'Сайти', asideTemplate: 'aside-links' },
            { id: 'section-image-tool', icon: 'imagesmode', label: 'Фото', asideTemplate: 'aside-image-tool' }
        ],
        menu: [
            { href: 'index.html', icon: 'instant_mix', label: 'Інструменти', active: true },
            { href: 'glossary.html', icon: 'import_contacts', label: 'Глосарій' },
            { href: 'banned-words.html', icon: 'block', label: 'Заборонені слова' },
            { href: 'brands.html', icon: 'shopping_bag', label: 'Бренди' },
            { href: 'keywords.html', icon: 'key', label: 'Ключові слова' },
            { href: 'price.html', icon: 'receipt_long', label: 'Прайс' },
            { href: 'mapper.html', icon: 'hub', label: 'Mapper' }
        ]
    };

    // ============================================
    // STATE
    // ============================================

    const state = {
        isMobile: false,
        currentSectionIndex: 0,
        isMenuOpen: false,
        isAsideExpanded: false,
        activeSelectSheet: null
    };

    // ============================================
    // DOM ELEMENTS (created dynamically)
    // ============================================

    let elements = {
        header: null,
        menuOverlay: null,
        bottomNav: null,
        aside: null,
        selectSheet: null,
        contentMain: null
    };

    // ============================================
    // INITIALIZATION
    // ============================================

    function init() {
        console.log('[Mobile] init() called');
        console.log('[Mobile] isMobilePage:', isMobilePage());
        console.log('[Mobile] window.innerWidth:', window.innerWidth);
        console.log('[Mobile] breakpoint:', CONFIG.breakpoint);

        if (!isMobilePage()) {
            console.log('[Mobile] Not a mobile page, exiting');
            return;
        }

        // Check if mobile on load
        checkMobile();

        // Listen for resize
        window.addEventListener('resize', debounce(checkMobile, 150));

        console.log('[Mobile] state.isMobile:', state.isMobile);

        // Create mobile elements if needed - FORCE CREATE for mobile
        if (state.isMobile) {
            console.log('[Mobile] Creating mobile elements...');
            createMobileElements();
            bindEvents();
            console.log('[Mobile] Mobile elements created');
        }
    }

    function isMobilePage() {
        // Only run on instruments page (index.html)
        return document.getElementById('section-table') !== null;
    }

    function checkMobile() {
        const wasMobile = state.isMobile;
        state.isMobile = window.innerWidth <= CONFIG.breakpoint;

        if (state.isMobile && !wasMobile) {
            createMobileElements();
            bindEvents();
        } else if (!state.isMobile && wasMobile) {
            removeMobileElements();
        }
    }

    // ============================================
    // CREATE MOBILE ELEMENTS
    // ============================================

    function createMobileElements() {
        elements.contentMain = document.getElementById('content-main');
        if (!elements.contentMain) {
            console.log('[Mobile] content-main not found!');
            return;
        }

        // Try to find existing elements first, create if not exist
        elements.header = document.querySelector('.mobile-header');
        elements.menuOverlay = document.querySelector('.mobile-menu-overlay');
        elements.bottomNav = document.querySelector('.mobile-bottom-nav');
        elements.aside = document.querySelector('.mobile-aside');
        elements.fab = document.querySelector('.mobile-fab');

        // Create elements only if they don't exist
        if (!elements.header) createHeader();
        if (!elements.menuOverlay) createMenuOverlay();
        if (!elements.bottomNav) createBottomNav();
        if (!elements.aside) createAside();
        if (!elements.fab) createFab();

        createSelectSheet();

        console.log('[Mobile] Elements:', {
            header: !!elements.header,
            menuOverlay: !!elements.menuOverlay,
            bottomNav: !!elements.bottomNav,
            aside: !!elements.aside,
            fab: !!elements.fab
        });

        // Set initial section
        updateCurrentSection(0);
    }

    function removeMobileElements() {
        Object.values(elements).forEach(el => {
            if (el && el.parentNode && el !== elements.contentMain) {
                el.parentNode.removeChild(el);
            }
        });
        document.body.classList.remove('mobile-menu-open');
    }

    // ============================================
    // HEADER
    // ============================================

    function createHeader() {
        if (document.querySelector('.mobile-header')) return;

        const header = document.createElement('header');
        header.className = 'mobile-header';
        header.innerHTML = `
            <button class="mobile-header__menu-btn" aria-label="Меню">
                <span class="material-symbols-outlined">menu</span>
            </button>
            <h1 class="mobile-header__title">${CONFIG.sections[0].label}</h1>
            <div class="mobile-header__actions">
                <button class="btn-icon" id="mobile-reload-btn" aria-label="Оновити">
                    <span class="material-symbols-outlined">refresh</span>
                </button>
            </div>
        `;

        document.body.insertBefore(header, document.body.firstChild);
        elements.header = header;
    }

    // ============================================
    // MENU OVERLAY
    // ============================================

    function createMenuOverlay() {
        if (document.querySelector('.mobile-menu-overlay')) return;

        const overlay = document.createElement('div');
        overlay.className = 'mobile-menu-overlay';

        document.body.appendChild(overlay);
        elements.menuOverlay = overlay;
    }

    function openMenu() {
        state.isMenuOpen = true;
        document.body.classList.add('mobile-menu-open');
        elements.menuOverlay.classList.add('is-active');
    }

    function closeMenu() {
        state.isMenuOpen = false;
        document.body.classList.remove('mobile-menu-open');
        elements.menuOverlay.classList.remove('is-active');
    }

    // ============================================
    // BOTTOM NAVIGATION
    // ============================================

    function createBottomNav() {
        if (document.querySelector('.mobile-bottom-nav')) return;

        const nav = document.createElement('nav');
        nav.className = 'mobile-bottom-nav';

        const items = CONFIG.sections.map((section, index) => `
            <button class="mobile-bottom-nav__item${index === 0 ? ' is-active' : ''}"
                    data-section-index="${index}"
                    data-section-id="${section.id}"
                    aria-label="${section.label}">
                <span class="material-symbols-outlined">${section.icon}</span>
                <span class="mobile-bottom-nav__item-label">${section.label}</span>
            </button>
        `).join('');

        nav.innerHTML = items;
        document.body.appendChild(nav);
        elements.bottomNav = nav;
    }

    // ============================================
    // ASIDE (BOTTOM SHEET)
    // ============================================

    function createAside() {
        if (document.querySelector('.mobile-aside')) return;

        const aside = document.createElement('aside');
        aside.className = 'mobile-aside';
        aside.innerHTML = `
            <div class="mobile-aside__handle">
                <div class="mobile-aside__handle-bar"></div>
            </div>
            <div class="mobile-aside__header">
                <span class="mobile-aside__title">Налаштування</span>
                <button class="btn-icon mobile-aside__toggle" aria-label="Розгорнути">
                    <span class="material-symbols-outlined">expand_less</span>
                </button>
            </div>
            <div class="mobile-aside__content" id="mobile-aside-content">
                <!-- Content loaded dynamically -->
            </div>
        `;

        document.body.appendChild(aside);
        elements.aside = aside;

        // Load initial aside content
        loadAsideContent(CONFIG.sections[0].asideTemplate);
    }

    function toggleAside() {
        state.isAsideExpanded = !state.isAsideExpanded;
        elements.aside.classList.toggle('is-expanded', state.isAsideExpanded);

        const icon = elements.aside.querySelector('.mobile-aside__toggle .material-symbols-outlined');
        if (icon) {
            icon.textContent = state.isAsideExpanded ? 'expand_more' : 'expand_less';
        }
    }

    async function loadAsideContent(templateName) {
        const container = document.getElementById('mobile-aside-content');
        if (!container) return;

        // Copy content from existing panel-right if available
        const desktopPanel = document.getElementById('panel-right-content');
        if (desktopPanel && desktopPanel.innerHTML.trim()) {
            container.innerHTML = desktopPanel.innerHTML;
            return;
        }

        // Otherwise try to load template
        try {
            const response = await fetch(`/templates/aside/${templateName}.html`);
            if (response.ok) {
                const html = await response.text();
                container.innerHTML = html;
            }
        } catch (e) {
            console.warn('Could not load aside template:', templateName);
        }
    }

    // ============================================
    // FAB (Floating Action Button)
    // ============================================

    function createFab() {
        if (document.querySelector('.mobile-fab')) return;

        const fab = document.createElement('button');
        fab.className = 'mobile-fab';
        fab.setAttribute('aria-label', 'Додати рядок');
        fab.innerHTML = '<span class="material-symbols-outlined">add</span>';

        document.body.appendChild(fab);
        elements.fab = fab;

        // FAB click - contextual action based on section
        fab.addEventListener('click', () => {
            const section = CONFIG.sections[state.currentSectionIndex];
            handleFabClick(section.id);
        });
    }

    function handleFabClick(sectionId) {
        switch (sectionId) {
            case 'section-table':
                // Add new row
                const addBtn = document.getElementById('add-input-btn');
                if (addBtn) addBtn.click();
                break;

            case 'section-text':
                // Focus on editor
                const editor = document.getElementById('ghl-editor');
                if (editor) editor.focus();
                break;

            case 'section-seo':
                // Copy SEO title
                const seoTitle = document.getElementById('seo-title');
                if (seoTitle && seoTitle.value) {
                    navigator.clipboard.writeText(seoTitle.value);
                    showToast('Скопійовано!');
                }
                break;

            case 'section-image-tool':
                // Trigger file select
                const fileInput = document.getElementById('gim-image-input');
                if (fileInput) fileInput.click();
                break;

            default:
                // Expand aside for other sections
                if (!state.isAsideExpanded) {
                    toggleAside();
                }
        }
    }

    function showToast(message) {
        // Simple toast notification
        const existing = document.querySelector('.mobile-toast');
        if (existing) existing.remove();

        const toast = document.createElement('div');
        toast.className = 'mobile-toast';
        toast.textContent = message;
        toast.style.cssText = `
            position: fixed;
            bottom: calc(var(--mobile-bottom-nav-height, 56px) + var(--mobile-aside-collapsed-height, 48px) + 80px);
            left: 50%;
            transform: translateX(-50%);
            background: var(--color-on-surface, #171717);
            color: var(--color-surface, #fafafa);
            padding: 12px 24px;
            border-radius: 8px;
            font-size: 14px;
            z-index: 1200;
            animation: toastFadeIn 0.3s ease;
        `;

        document.body.appendChild(toast);

        setTimeout(() => {
            toast.style.animation = 'toastFadeOut 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, 2000);
    }

    // ============================================
    // SELECT SHEET (for dropdowns)
    // ============================================

    function createSelectSheet() {
        if (document.querySelector('.mobile-select-sheet')) return;

        const sheet = document.createElement('div');
        sheet.className = 'mobile-select-sheet';
        sheet.innerHTML = `
            <div class="mobile-select-sheet__overlay"></div>
            <div class="mobile-select-sheet__content">
                <div class="mobile-select-sheet__handle">
                    <div class="mobile-select-sheet__handle-bar"></div>
                </div>
                <div class="mobile-select-sheet__header">
                    <span class="mobile-select-sheet__title">Виберіть опцію</span>
                    <button class="mobile-select-sheet__close" aria-label="Закрити">
                        <span class="material-symbols-outlined">close</span>
                    </button>
                </div>
                <div class="mobile-select-sheet__list" id="mobile-select-list">
                    <!-- Options rendered dynamically -->
                </div>
            </div>
        `;

        document.body.appendChild(sheet);
        elements.selectSheet = sheet;
    }

    function openSelectSheet(options, currentValue, onSelect, title = 'Виберіть опцію') {
        const sheet = elements.selectSheet;
        if (!sheet) return;

        const titleEl = sheet.querySelector('.mobile-select-sheet__title');
        const listEl = sheet.querySelector('#mobile-select-list');

        if (titleEl) titleEl.textContent = title;

        if (listEl) {
            listEl.innerHTML = options.map(opt => {
                const isSelected = opt.value === currentValue;
                const isSeparator = opt.type === 'separator';
                const isGroup = opt.type === 'group';

                if (isSeparator) {
                    return '<div class="mobile-select-sheet__separator"></div>';
                }

                if (isGroup) {
                    return `<div class="mobile-select-sheet__group-title">${opt.label}</div>`;
                }

                return `
                    <div class="mobile-select-sheet__item${isSelected ? ' is-selected' : ''}"
                         data-value="${opt.value}">
                        <div class="mobile-select-sheet__radio">
                            <div class="mobile-select-sheet__radio-dot"></div>
                        </div>
                        <span class="mobile-select-sheet__item-text">${opt.label}</span>
                    </div>
                `;
            }).join('');

            // Bind click events
            listEl.querySelectorAll('.mobile-select-sheet__item').forEach(item => {
                item.addEventListener('click', () => {
                    const value = item.dataset.value;
                    if (onSelect) onSelect(value);
                    closeSelectSheet();
                });
            });
        }

        sheet.classList.add('is-active');
        state.activeSelectSheet = { onSelect };
    }

    function closeSelectSheet() {
        const sheet = elements.selectSheet;
        if (sheet) {
            sheet.classList.remove('is-active');
        }
        state.activeSelectSheet = null;
    }

    // ============================================
    // SECTION NAVIGATION
    // ============================================

    function updateCurrentSection(index) {
        state.currentSectionIndex = index;
        const section = CONFIG.sections[index];

        // Update header title
        const title = elements.header?.querySelector('.mobile-header__title');
        if (title) title.textContent = section.label;

        // Update bottom nav active state
        elements.bottomNav?.querySelectorAll('.mobile-bottom-nav__item').forEach((item, i) => {
            item.classList.toggle('is-active', i === index);
        });

        // Scroll to section
        const sectionEl = document.getElementById(section.id);
        if (sectionEl && elements.contentMain) {
            elements.contentMain.scrollTo({
                left: sectionEl.offsetLeft,
                behavior: 'smooth'
            });
        }

        // Load aside content
        loadAsideContent(section.asideTemplate);

        // Update aside title
        const asideTitle = elements.aside?.querySelector('.mobile-aside__title');
        if (asideTitle) {
            const sectionTitle = getSectionAsideTitle(section.id);
            asideTitle.textContent = sectionTitle;
        }

        // Update FAB icon and action based on section
        updateFabForSection(section.id);

        // Collapse aside when switching sections
        if (state.isAsideExpanded) {
            state.isAsideExpanded = false;
            elements.aside?.classList.remove('is-expanded');
            const icon = elements.aside?.querySelector('.mobile-aside__toggle .material-symbols-outlined');
            if (icon) icon.textContent = 'expand_less';
        }
    }

    function updateFabForSection(sectionId) {
        const fab = elements.fab;
        if (!fab) return;

        const fabIcon = fab.querySelector('.material-symbols-outlined');
        if (!fabIcon) return;

        const fabConfig = {
            'section-table': { icon: 'add', label: 'Додати рядок' },
            'section-text': { icon: 'content_paste', label: 'Вставити' },
            'section-seo': { icon: 'content_copy', label: 'Копіювати' },
            'section-translate': { icon: 'translate', label: 'Перекласти' },
            'section-links': { icon: 'open_in_new', label: 'Відкрити' },
            'section-image-tool': { icon: 'add_photo_alternate', label: 'Додати фото' }
        };

        const config = fabConfig[sectionId] || { icon: 'add', label: 'Дія' };
        fabIcon.textContent = config.icon;
        fab.setAttribute('aria-label', config.label);
    }

    function getSectionAsideTitle(sectionId) {
        const titles = {
            'section-table': 'Налаштування таблиці',
            'section-text': 'Підсвічування',
            'section-seo': 'SEO налаштування',
            'section-translate': 'Переклад',
            'section-links': 'Офіційні сайти',
            'section-image-tool': 'Обробка зображень'
        };
        return titles[sectionId] || 'Налаштування';
    }

    function detectCurrentSection() {
        if (!elements.contentMain) return;

        const scrollLeft = elements.contentMain.scrollLeft;
        const sectionWidth = elements.contentMain.offsetWidth;
        const newIndex = Math.round(scrollLeft / sectionWidth);

        if (newIndex !== state.currentSectionIndex && newIndex >= 0 && newIndex < CONFIG.sections.length) {
            state.currentSectionIndex = newIndex;

            // Update UI without scrolling
            const section = CONFIG.sections[newIndex];

            const title = elements.header?.querySelector('.mobile-header__title');
            if (title) title.textContent = section.label;

            elements.bottomNav?.querySelectorAll('.mobile-bottom-nav__item').forEach((item, i) => {
                item.classList.toggle('is-active', i === newIndex);
            });

            loadAsideContent(section.asideTemplate);

            const asideTitle = elements.aside?.querySelector('.mobile-aside__title');
            if (asideTitle) {
                asideTitle.textContent = getSectionAsideTitle(section.id);
            }
        }
    }

    // ============================================
    // ROW OPTIONS (convert dropdown to sheet)
    // ============================================

    function openRowOptionsSheet(row) {
        const options = [
            { type: 'group', label: 'Тип рядка' },
            { value: 'td', label: 'Звичайний' },
            { value: 'th', label: 'Заголовок' },
            { value: 'th-strong', label: 'Підзаголовок' },
            { value: 'h2', label: 'H2 заголовок' },
            { type: 'separator' },
            { type: 'group', label: 'Форматування' },
            { value: 'bold', label: 'Жирний' },
            { value: 'italic', label: 'Курсив' },
            { type: 'separator' },
            { type: 'group', label: 'Колонки' },
            { value: 'colspan2', label: 'Об\'єднати колонки' },
            { value: 'single', label: 'Одна колонка' },
            { type: 'separator' },
            { value: 'new-table', label: 'Нова таблиця (розділювач)' },
            { type: 'separator' },
            { type: 'group', label: 'Дії' },
            { value: 'insert-above', label: 'Вставити рядок вище' },
            { value: 'insert-below', label: 'Вставити рядок нижче' }
        ];

        // Detect current state
        let currentValue = 'td';
        const rowClasses = ['td', 'th', 'th-strong', 'h2'];
        rowClasses.forEach(cls => {
            if (row.classList.contains(cls)) currentValue = cls;
        });

        openSelectSheet(options, currentValue, (value) => {
            handleRowOptionSelect(row, value);
        }, 'Налаштування рядка');
    }

    function handleRowOptionSelect(row, value) {
        const exclusiveClasses = ['td', 'th', 'th-strong', 'h2', 'new-table'];
        const toggleClasses = ['bold', 'italic', 'colspan2', 'single'];
        const actions = ['insert-above', 'insert-below'];

        if (actions.includes(value)) {
            // Trigger action via existing JS
            const actionBtn = row.querySelector(`[data-action="${value}"]`);
            if (actionBtn) actionBtn.click();
            return;
        }

        if (exclusiveClasses.includes(value)) {
            exclusiveClasses.forEach(cls => row.classList.remove(cls));
            row.classList.add(value);
        } else if (toggleClasses.includes(value)) {
            row.classList.toggle(value);
        }
    }

    // ============================================
    // EVENT BINDING
    // ============================================

    function bindEvents() {
        // Menu button
        const menuBtn = document.querySelector('.mobile-header__menu-btn');
        if (menuBtn) {
            menuBtn.addEventListener('click', openMenu);
        }

        // Menu overlay close
        if (elements.menuOverlay) {
            elements.menuOverlay.addEventListener('click', closeMenu);
        }

        // Bottom nav items
        elements.bottomNav?.querySelectorAll('.mobile-bottom-nav__item').forEach(item => {
            item.addEventListener('click', () => {
                const index = parseInt(item.dataset.sectionIndex, 10);
                updateCurrentSection(index);
            });
        });

        // Aside toggle
        const asideHandle = elements.aside?.querySelector('.mobile-aside__handle');
        const asideToggle = elements.aside?.querySelector('.mobile-aside__toggle');

        if (asideHandle) {
            asideHandle.addEventListener('click', toggleAside);
        }
        if (asideToggle) {
            asideToggle.addEventListener('click', toggleAside);
        }

        // Select sheet close
        const sheetOverlay = elements.selectSheet?.querySelector('.mobile-select-sheet__overlay');
        const sheetClose = elements.selectSheet?.querySelector('.mobile-select-sheet__close');

        if (sheetOverlay) {
            sheetOverlay.addEventListener('click', closeSelectSheet);
        }
        if (sheetClose) {
            sheetClose.addEventListener('click', closeSelectSheet);
        }

        // Section scroll detection
        if (elements.contentMain) {
            elements.contentMain.addEventListener('scroll', debounce(detectCurrentSection, 100));
        }

        // Row dropdown triggers -> open sheet
        document.addEventListener('click', (e) => {
            if (!state.isMobile) return;

            const trigger = e.target.closest('.inputs-bloc [data-dropdown-trigger]');
            if (trigger) {
                e.preventDefault();
                e.stopPropagation();
                const row = trigger.closest('.inputs-bloc');
                if (row) {
                    openRowOptionsSheet(row);
                }
            }
        }, true);

        // Reload button
        const reloadBtn = document.getElementById('mobile-reload-btn');
        if (reloadBtn) {
            reloadBtn.addEventListener('click', () => {
                const section = CONFIG.sections[state.currentSectionIndex];
                const sectionReloadBtn = document.querySelector(`#${section.id} .btn-reload`);
                if (sectionReloadBtn) {
                    sectionReloadBtn.click();
                }
            });
        }

        // Auto-resize textareas in rows
        document.addEventListener('input', (e) => {
            if (!state.isMobile) return;

            const textarea = e.target.closest('.inputs-bloc textarea');
            if (textarea) {
                autoResizeTextarea(textarea);
            }
        });

        // Initial textarea resize
        document.querySelectorAll('.inputs-bloc textarea').forEach(autoResizeTextarea);
    }

    // ============================================
    // UTILITIES
    // ============================================

    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    function autoResizeTextarea(textarea) {
        if (!textarea) return;
        textarea.style.height = 'auto';
        textarea.style.height = textarea.scrollHeight + 'px';
    }

    // ============================================
    // PUBLIC API (for external use if needed)
    // ============================================

    window.MobileInstruments = {
        openSelectSheet,
        closeSelectSheet,
        updateCurrentSection,
        getState: () => ({ ...state })
    };

    // ============================================
    // INIT ON DOM READY
    // ============================================

    console.log('[Mobile] document.readyState:', document.readyState);

    if (document.readyState === 'loading') {
        console.log('[Mobile] Waiting for DOMContentLoaded...');
        document.addEventListener('DOMContentLoaded', () => {
            console.log('[Mobile] DOMContentLoaded fired');
            init();
        });
    } else {
        console.log('[Mobile] DOM already ready, calling init()');
        init();
    }

})();
