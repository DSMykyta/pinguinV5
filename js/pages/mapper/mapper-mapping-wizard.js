// js/mapper/mapper-mapping-wizard.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║              MAPPER - CATEGORY MAPPING WIZARD                           ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Покроковий візард для маппінгу MP категорій до власних.                ║
 * ║                                                                        ║
 * ║  Крок 1: Фільтр — пошук по назві, вибір маркетплейсів, мін. 2 збіги   ║
 * ║  Крок 2: Картки — по одній, замапити/пропустити (тільки існуючі)       ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

import { mapperState } from './mapper-state.js';
import {
    getCategories, getMpCategories,
    createCategoryMapping, isMpCategoryMapped
} from './mapper-data.js';
import { showModal } from '../../components/ui-modal.js';
import { showToast } from '../../components/ui-toast.js';
import { renderCurrentTab } from './mapper-table.js';
import { escapeHtml } from '../../utils/text-utils.js';

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════

function extractName(obj) {
    if (!obj || typeof obj !== 'object') return '';
    if (obj.name_ua) return obj.name_ua;
    if (obj.nameUa) return obj.nameUa;
    if (obj.titleUk) return obj.titleUk;
    if (obj.titleRu) return obj.titleRu;
    if (obj.name) return obj.name;
    if (obj.name_ru) return obj.name_ru;
    if (obj.nameRu) return obj.nameRu;
    const nameKey = Object.keys(obj).find(k => {
        const lower = k.toLowerCase();
        return lower.includes('name') || lower.includes('title');
    });
    return nameKey ? obj[nameKey] : '';
}

function getMpCatName(mpCat) {
    let name = extractName(mpCat);
    if (name) return name;
    if (mpCat.data) {
        try {
            const d = typeof mpCat.data === 'string' ? JSON.parse(mpCat.data) : mpCat.data;
            name = extractName(d);
        } catch (e) { /* ignore */ }
    }
    return name || mpCat.external_id || mpCat.id;
}

function getMarketplaceName(mpId) {
    const mp = mapperState.marketplaces.find(m => m.id === mpId);
    return mp?.name || mp?.slug || mpId;
}

function normalizeName(name) {
    return String(name || '').toLowerCase().trim().replace(/\s+/g, ' ');
}

/**
 * Побудувати шлях батьків для категорії (хлібні крихти)
 * Повертає рядок типу "Спорт → Аксесуари → Шейкери"
 */
function getParentPath(cat, allCategories) {
    const path = [];
    let current = cat;
    let depth = 0;

    while (current && current.parent_id && depth < 10) {
        depth++;
        const pid = String(current.parent_id);
        const mpId = cat.marketplace_id || null;

        const parent = allCategories.find(c => {
            if (c.id === pid) return true;
            if (mpId && c.marketplace_id === mpId) {
                if (String(c._jsonId) === pid) return true;
                if (String(c.external_id) === pid) return true;
            }
            if (!mpId && String(c.external_id) === pid) return true;
            return false;
        });

        if (parent) {
            const pName = extractName(parent) || parent.name_ua || parent.id;
            path.unshift(pName);
            current = parent;
        } else {
            break;
        }
    }

    return path.length ? path.join(' → ') : '';
}

// ═══════════════════════════════════════════════════════════════════════════
// STATE
// ═══════════════════════════════════════════════════════════════════════════

let wizardState = {
    allCards: [],      // Всі згруповані картки (до фільтрації)
    cards: [],         // Відфільтровані картки для роботи
    currentIndex: 0,
    phase: 'filter',   // 'filter' | 'cards' | 'done'
    results: { mapped: 0, skipped: 0 },
    // Фільтри
    searchQuery: '',
    selectedMarketplaces: new Set(),
    allMarketplaceIds: []
};

// ═══════════════════════════════════════════════════════════════════════════
// BUILD CARDS
// ═══════════════════════════════════════════════════════════════════════════

function buildAllCards() {
    const mpCategories = getMpCategories();
    const ownCategories = getCategories();
    const allCategories = [...ownCategories, ...mpCategories];
    const unmapped = mpCategories.filter(c => !isMpCategoryMapped(c.id));

    if (!unmapped.length) return [];

    // Групуємо по нормалізованій назві
    const groups = new Map();

    unmapped.forEach(mpCat => {
        const name = getMpCatName(mpCat);
        const key = normalizeName(name);

        if (!groups.has(key)) {
            groups.set(key, {
                name: name,
                normalizedName: key,
                mpCategories: [],
                ownCategory: null
            });
        }

        const parentPath = getParentPath(mpCat, allCategories);

        groups.get(key).mpCategories.push({
            id: mpCat.id,
            external_id: mpCat.external_id,
            marketplace_id: mpCat.marketplace_id,
            marketplaceName: getMarketplaceName(mpCat.marketplace_id),
            name: name,
            parentPath: parentPath
        });
    });

    // Шукаємо відповідні власні категорії
    const ownByName = new Map();
    ownCategories.forEach(cat => {
        const key = normalizeName(cat.name_ua);
        if (key && !ownByName.has(key)) ownByName.set(key, cat);
    });

    const cards = [];
    groups.forEach(group => {
        const ownCat = ownByName.get(group.normalizedName) || null;
        // Тільки якщо є відповідна власна категорія
        if (!ownCat) return;

        group.ownCategory = ownCat;
        group.ownParentPath = getParentPath(ownCat, allCategories);
        cards.push(group);
    });

    cards.sort((a, b) => {
        const diff = b.mpCategories.length - a.mpCategories.length;
        if (diff !== 0) return diff;
        return a.name.localeCompare(b.name, 'uk');
    });

    return cards;
}

/**
 * Фільтрувати картки по пошуку + маркетплейсам + мін. 2 збіги
 */
function filterCards() {
    const query = normalizeName(wizardState.searchQuery);
    const selectedMps = wizardState.selectedMarketplaces;

    wizardState.cards = wizardState.allCards.filter(card => {
        // Пошук по назві
        if (query && !card.normalizedName.includes(query)) return false;

        // Фільтр по маркетплейсам — залишити тільки MP кат з обраних
        const relevantMp = card.mpCategories.filter(mc => selectedMps.has(mc.marketplace_id));

        // Мінімум 2 збіги (MP категорій + власна = >= 2)
        const totalMatches = relevantMp.length + 1; // +1 за власну (завжди є)
        if (totalMatches < 2) return false;

        // Зберігаємо відфільтровані MP категорії
        card._filteredMpCategories = relevantMp;
        return true;
    });
}

// ═══════════════════════════════════════════════════════════════════════════
// RENDER: FILTER PHASE
// ═══════════════════════════════════════════════════════════════════════════

function renderFilterPhase() {
    const body = document.getElementById('mapping-wizard-body');
    const progress = document.getElementById('mapping-wizard-progress');
    const prevBtn = document.getElementById('mapping-wizard-prev');
    const skipBtn = document.getElementById('mapping-wizard-skip');
    const applyBtn = document.getElementById('mapping-wizard-apply');

    progress.textContent = '';
    prevBtn.classList.add('u-hidden');
    skipBtn.classList.add('u-hidden');
    applyBtn.textContent = 'Почати';
    applyBtn.classList.remove('u-hidden');

    // Знаходимо унікальні маркетплейси
    const mpIds = new Set();
    wizardState.allCards.forEach(c => c.mpCategories.forEach(mc => mpIds.add(mc.marketplace_id)));
    wizardState.allMarketplaceIds = [...mpIds];

    // За замовчуванням всі увімкнені
    if (!wizardState.selectedMarketplaces.size) {
        wizardState.selectedMarketplaces = new Set(mpIds);
    }

    filterCards();

    let mpCheckboxes = '';
    wizardState.allMarketplaceIds.forEach(mpId => {
        const name = getMarketplaceName(mpId);
        const checked = wizardState.selectedMarketplaces.has(mpId) ? 'checked' : '';
        mpCheckboxes += `
            <label style="display:flex;align-items:center;gap:6px;cursor:pointer;">
                <input type="checkbox" class="wizard-mp-filter" data-mp-id="${mpId}" ${checked} />
                <span class="chip c-main">${escapeHtml(name)}</span>
            </label>`;
    });

    body.innerHTML = `
        <div style="margin-bottom:16px;">
            <label style="font-weight:500;margin-bottom:6px;display:block;">Пошук по назві</label>
            <input type="text" class="input-main"  id="wizard-search" placeholder="Наприклад: протеїн, спорт..." value="${escapeHtml(wizardState.searchQuery)}" />
        </div>
        <div style="margin-bottom:16px;">
            <label style="font-weight:500;margin-bottom:6px;display:block;">Маркетплейси</label>
            <div style="display:flex;gap:12px;flex-wrap:wrap;">
                ${mpCheckboxes}
            </div>
        </div>
        <div id="wizard-filter-stats" style="padding:12px 16px;background:var(--color-surface-variant);border-radius:var(--radius-m);">
            ${getFilterStatsHtml()}
        </div>
    `;

    // Обробники
    const searchInput = document.getElementById('wizard-search');
    searchInput?.addEventListener('input', () => {
        wizardState.searchQuery = searchInput.value;
        filterCards();
        updateFilterStats();
        updateStartButton();
    });

    document.querySelectorAll('.wizard-mp-filter').forEach(cb => {
        cb.addEventListener('change', () => {
            if (cb.checked) {
                wizardState.selectedMarketplaces.add(cb.dataset.mpId);
            } else {
                wizardState.selectedMarketplaces.delete(cb.dataset.mpId);
            }
            filterCards();
            updateFilterStats();
            updateStartButton();
        });
    });

    updateStartButton();
}

function getFilterStatsHtml() {
    const total = wizardState.cards.length;
    return `Знайдено груп: <strong>${total}</strong> (мін. 2 збіги з обраних маркетплейсів)`;
}

function updateFilterStats() {
    const el = document.getElementById('wizard-filter-stats');
    if (el) el.innerHTML = getFilterStatsHtml();
}

function updateStartButton() {
    const applyBtn = document.getElementById('mapping-wizard-apply');
    if (applyBtn) {
        applyBtn.disabled = wizardState.cards.length === 0;
        applyBtn.textContent = wizardState.cards.length > 0
            ? `Почати (${wizardState.cards.length})`
            : 'Немає збігів';
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// RENDER: CARD PHASE
// ═══════════════════════════════════════════════════════════════════════════

function renderCard() {
    const body = document.getElementById('mapping-wizard-body');
    const progress = document.getElementById('mapping-wizard-progress');
    const prevBtn = document.getElementById('mapping-wizard-prev');
    const skipBtn = document.getElementById('mapping-wizard-skip');
    const applyBtn = document.getElementById('mapping-wizard-apply');

    if (!body) return;

    const { cards, currentIndex } = wizardState;

    // Все оброблено
    if (currentIndex >= cards.length) {
        renderDone(body);
        progress.textContent = '';
        prevBtn.classList.remove('u-hidden');
        prevBtn.disabled = false;
        skipBtn.classList.add('u-hidden');
        applyBtn.classList.add('u-hidden');
        return;
    }

    const card = cards[currentIndex];
    const mpItems = card._filteredMpCategories || card.mpCategories;

    // UI
    progress.textContent = `${currentIndex + 1} / ${cards.length}`;
    prevBtn.classList.remove('u-hidden');
    prevBtn.disabled = currentIndex === 0;
    skipBtn.classList.remove('u-hidden');
    applyBtn.classList.remove('u-hidden');

    // Шапка — власна категорія з батьківським шляхом
    const ownParentHtml = card.ownParentPath
        ? `<div style="font-size:12px;color:var(--color-text-secondary);margin-top:2px;">${escapeHtml(card.ownParentPath)} →</div>`
        : '';

    const headerHtml = `
        <div style="padding:12px 16px;background:var(--color-surface-variant);border-radius:var(--radius-m);margin-bottom:16px;">
            <div style="font-size:13px;color:var(--color-text-secondary);">Замапити до власної:</div>
            ${ownParentHtml}
            <div style="font-size:16px;font-weight:600;margin-top:2px;">${escapeHtml(card.ownCategory.name_ua)}</div>
            <div style="font-size:11px;color:var(--color-text-secondary);margin-top:2px;">${escapeHtml(card.ownCategory.id)}</div>
        </div>`;

    // Список MP категорій з батьківськими шляхами
    let listHtml = '<div style="display:flex;flex-direction:column;gap:6px;">';
    mpItems.forEach(mpCat => {
        const parentHtml = mpCat.parentPath
            ? `<div style="font-size:11px;color:var(--color-text-secondary);margin-top:1px;">${escapeHtml(mpCat.parentPath)} →</div>`
            : '';

        listHtml += `
            <label style="display:flex;align-items:center;gap:10px;padding:8px 12px;border:1px solid var(--color-border);border-radius:var(--radius-m);cursor:pointer;">
                <input type="checkbox" class="mapping-wizard-checkbox" data-mp-id="${escapeHtml(mpCat.id)}" checked />
                <div style="flex:1;">
                    ${parentHtml}
                    <div style="font-weight:500;">${escapeHtml(mpCat.name)}</div>
                    <div style="font-size:12px;color:var(--color-text-secondary);">#${escapeHtml(mpCat.external_id)}</div>
                </div>
                <span class="chip c-main">${escapeHtml(mpCat.marketplaceName)}</span>
            </label>`;
    });
    listHtml += '</div>';

    body.innerHTML = headerHtml + listHtml;
    applyBtn.textContent = 'Замапити';
}

function renderDone(body) {
    const { results } = wizardState;
    body.innerHTML = `
        <div style="text-align:center;padding:40px 20px;">
            <span class="material-symbols-outlined" style="font-size:48px;color:var(--color-success);">check_circle</span>
            <h3 style="margin-top:12px;">Готово!</h3>
            <div style="margin-top:8px;color:var(--color-text-secondary);">
                Замаплено зв'язків: <strong>${results.mapped}</strong><br>
                Пропущено: <strong>${results.skipped}</strong>
            </div>
            <button class="btn-primary u-mt-16" onclick="document.querySelector('[data-modal-close]')?.click()">
                Закрити
            </button>
        </div>
    `;
}

// ═══════════════════════════════════════════════════════════════════════════
// ACTIONS
// ═══════════════════════════════════════════════════════════════════════════

async function applyCurrentCard() {
    const { cards, currentIndex } = wizardState;
    const card = cards[currentIndex];

    const checkboxes = document.querySelectorAll('.mapping-wizard-checkbox:checked');
    const selectedMpIds = Array.from(checkboxes).map(cb => cb.dataset.mpId);

    if (!selectedMpIds.length) {
        showToast('Оберіть хоча б одну категорію', 'warning');
        return;
    }

    const applyBtn = document.getElementById('mapping-wizard-apply');
    applyBtn.disabled = true;
    applyBtn.textContent = 'Зберігаю...';

    try {
        const ownCatId = card.ownCategory.id;

        for (const mpId of selectedMpIds) {
            await createCategoryMapping(ownCatId, mpId);
            wizardState.results.mapped++;
        }

        wizardState.currentIndex++;
        renderCard();

    } catch (error) {
        console.error('❌ Помилка маппінгу:', error);
        showToast(`Помилка: ${error.message}`, 'error');
    } finally {
        applyBtn.disabled = false;
    }
}

function skipCurrentCard() {
    wizardState.results.skipped++;
    wizardState.currentIndex++;
    renderCard();
}

function goBack() {
    if (wizardState.phase === 'cards' && wizardState.currentIndex === 0) {
        // Повернутися до фільтрів
        wizardState.phase = 'filter';
        renderFilterPhase();
        return;
    }
    if (wizardState.currentIndex > 0) {
        wizardState.currentIndex--;
        renderCard();
    }
}

function startCards() {
    if (!wizardState.cards.length) return;
    wizardState.phase = 'cards';
    wizardState.currentIndex = 0;
    wizardState.results = { mapped: 0, skipped: 0 };
    renderCard();
}

// ═══════════════════════════════════════════════════════════════════════════
// BUTTON ROUTER
// ═══════════════════════════════════════════════════════════════════════════

function handleApply() {
    if (wizardState.phase === 'filter') {
        startCards();
    } else if (wizardState.phase === 'cards') {
        applyCurrentCard();
    }
}

function handleSkip() {
    if (wizardState.phase === 'cards') {
        skipCurrentCard();
    }
}

function handlePrev() {
    goBack();
}

// ═══════════════════════════════════════════════════════════════════════════
// PUBLIC API
// ═══════════════════════════════════════════════════════════════════════════

export async function showMappingWizard() {
    const allCards = buildAllCards();

    if (!allCards.length) {
        showToast('Немає MP категорій з відповідними власними для маппінгу', 'info');
        return;
    }

    wizardState = {
        allCards,
        cards: [],
        currentIndex: 0,
        phase: 'filter',
        results: { mapped: 0, skipped: 0 },
        searchQuery: '',
        selectedMarketplaces: new Set(),
        allMarketplaceIds: []
    };

    await showModal('mapper-mapping-wizard', null);

    // Рендер фази фільтрів
    renderFilterPhase();

    // Підключаємо кнопки (один раз)
    document.getElementById('mapping-wizard-apply')?.addEventListener('click', handleApply);
    document.getElementById('mapping-wizard-skip')?.addEventListener('click', handleSkip);
    document.getElementById('mapping-wizard-prev')?.addEventListener('click', handlePrev);

    // При закритті — оновити таблицю
    const modal = document.getElementById('modal-mapper-mapping-wizard');
    if (modal) {
        const observer = new MutationObserver(() => {
            if (!document.contains(modal)) {
                observer.disconnect();
                renderCurrentTab();
            }
        });
        observer.observe(modal.parentNode || document.body, { childList: true });
    }
}
