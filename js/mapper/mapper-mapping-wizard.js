// js/mapper/mapper-mapping-wizard.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║              MAPPER - CATEGORY MAPPING WIZARD                           ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Покроковий візард для маппінгу MP категорій до власних.                ║
 * ║                                                                        ║
 * ║  Логіка:                                                               ║
 * ║  1. Збирає всі незамаплені MP категорії                                ║
 * ║  2. Групує за назвою (нечіткий матч)                                   ║
 * ║  3. Для кожної групи — картка:                                         ║
 * ║     - Якщо є власна з такою назвою → "Замапити до: X"                  ║
 * ║     - Якщо немає → "Створити + замапити: X (чернетка)"                 ║
 * ║  4. Галочки для кожної MP категорії в групі                            ║
 * ║  5. Кнопка "Замапити" — одразу зберігає                                ║
 * ║  6. Навігація: Назад / Пропустити / Замапити                           ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

import { mapperState } from './mapper-state.js';
import {
    getCategories, getMpCategories, getMapCategories,
    addCategory, createCategoryMapping, isMpCategoryMapped
} from './mapper-data.js';
import { showModal, closeModal } from '../common/ui-modal.js';
import { showToast } from '../common/ui-toast.js';
import { renderCurrentTab } from './mapper-table.js';
import { escapeHtml } from '../utils/text-utils.js';

/**
 * Витягнути назву з об'єкта (будь-яке поле з "name")
 */
function extractName(obj) {
    if (!obj || typeof obj !== 'object') return '';
    if (obj.name) return obj.name;
    if (obj.name_ua) return obj.name_ua;
    if (obj.nameUa) return obj.nameUa;
    if (obj.nameRu) return obj.nameRu;
    if (obj.name_ru) return obj.name_ru;
    const nameKey = Object.keys(obj).find(k => k.toLowerCase().includes('name'));
    return nameKey ? obj[nameKey] : '';
}

/**
 * Отримати назву MP категорії (з JSON data)
 */
function getMpCatName(mpCat) {
    // Після loadMpCategories Object.assign зливає JSON data в об'єкт
    let name = extractName(mpCat);
    if (name) return name;

    // Fallback: парсити data
    if (mpCat.data) {
        try {
            const d = typeof mpCat.data === 'string' ? JSON.parse(mpCat.data) : mpCat.data;
            name = extractName(d);
        } catch (e) { /* ignore */ }
    }
    return name || mpCat.external_id || mpCat.id;
}

/**
 * Отримати назву маркетплейсу по ID
 */
function getMarketplaceName(mpId) {
    const mp = mapperState.marketplaces.find(m => m.id === mpId);
    return mp?.name || mp?.slug || mpId;
}

/**
 * Нормалізація назви для порівняння (lowercase, trim, прибрати зайві пробіли)
 */
function normalizeName(name) {
    return String(name || '').toLowerCase().trim().replace(/\s+/g, ' ');
}

// ═══════════════════════════════════════════════════════════════════════════
// WIZARD STATE
// ═══════════════════════════════════════════════════════════════════════════

let wizardState = {
    cards: [],         // Array of card groups
    currentIndex: 0,   // Current card index
    results: {         // Running totals
        created: 0,
        mapped: 0,
        skipped: 0
    }
};

// ═══════════════════════════════════════════════════════════════════════════
// GROUP UNMAPPED CATEGORIES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Згрупувати незамаплені MP категорії за назвою
 */
function buildCards() {
    const mpCategories = getMpCategories();
    const ownCategories = getCategories();

    // Фільтруємо тільки незамаплені
    const unmapped = mpCategories.filter(c => !isMpCategoryMapped(c.id));

    if (!unmapped.length) return [];

    // Групуємо по нормалізованій назві
    const groups = new Map();

    unmapped.forEach(mpCat => {
        const name = getMpCatName(mpCat);
        const key = normalizeName(name);

        if (!groups.has(key)) {
            groups.set(key, {
                name: name,           // Оригінальна назва (перша зустрічена)
                normalizedName: key,
                mpCategories: [],
                ownCategory: null      // Знайдена власна категорія
            });
        }

        groups.get(key).mpCategories.push({
            id: mpCat.id,
            external_id: mpCat.external_id,
            marketplace_id: mpCat.marketplace_id,
            marketplaceName: getMarketplaceName(mpCat.marketplace_id),
            name: name
        });
    });

    // Шукаємо відповідні власні категорії
    const ownByName = new Map();
    ownCategories.forEach(cat => {
        const key = normalizeName(cat.name_ua);
        if (key && !ownByName.has(key)) {
            ownByName.set(key, cat);
        }
    });

    const cards = [];
    groups.forEach(group => {
        group.ownCategory = ownByName.get(group.normalizedName) || null;
        cards.push(group);
    });

    // Сортуємо: спочатку ті де є власна (легші), потім нові
    cards.sort((a, b) => {
        if (a.ownCategory && !b.ownCategory) return -1;
        if (!a.ownCategory && b.ownCategory) return 1;
        return a.name.localeCompare(b.name, 'uk');
    });

    return cards;
}

// ═══════════════════════════════════════════════════════════════════════════
// RENDER
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Рендер поточної картки
 */
function renderCard() {
    const body = document.getElementById('mapping-wizard-body');
    const progress = document.getElementById('mapping-wizard-progress');
    const prevBtn = document.getElementById('mapping-wizard-prev');
    const skipBtn = document.getElementById('mapping-wizard-skip');
    const applyBtn = document.getElementById('mapping-wizard-apply');

    if (!body) return;

    const { cards, currentIndex } = wizardState;

    // Якщо все оброблено
    if (currentIndex >= cards.length) {
        renderDone(body);
        progress.textContent = '';
        prevBtn.disabled = currentIndex === 0;
        skipBtn.classList.add('u-hidden');
        applyBtn.classList.add('u-hidden');
        return;
    }

    const card = cards[currentIndex];
    const hasOwn = !!card.ownCategory;

    // Прогрес
    progress.textContent = `${currentIndex + 1} / ${cards.length}`;

    // Навігація
    prevBtn.disabled = currentIndex === 0;
    skipBtn.classList.remove('u-hidden');
    applyBtn.classList.remove('u-hidden');

    // Шапка картки
    const headerHtml = hasOwn
        ? `<div style="padding:12px 16px;background:var(--color-surface-variant);border-radius:var(--radius-m);margin-bottom:16px;">
               <div style="font-size:13px;color:var(--color-text-secondary);">Замапити до існуючої:</div>
               <div style="font-size:16px;font-weight:600;margin-top:2px;">${escapeHtml(card.ownCategory.name_ua)}</div>
               <div style="font-size:12px;color:var(--color-text-secondary);margin-top:2px;">${escapeHtml(card.ownCategory.id)}</div>
           </div>`
        : `<div style="padding:12px 16px;background:var(--color-warning-container, #fff3e0);border-radius:var(--radius-m);margin-bottom:16px;">
               <div style="font-size:13px;color:var(--color-text-secondary);">Створити + замапити:</div>
               <div style="font-size:16px;font-weight:600;margin-top:2px;">${escapeHtml(card.name)} <span style="font-size:12px;font-weight:400;opacity:0.7;">(чернетка)</span></div>
           </div>`;

    // Список MP категорій з галочками
    let listHtml = '<div style="display:flex;flex-direction:column;gap:6px;">';
    card.mpCategories.forEach((mpCat, i) => {
        listHtml += `
            <label style="display:flex;align-items:center;gap:10px;padding:8px 12px;border:1px solid var(--color-border);border-radius:var(--radius-m);cursor:pointer;">
                <input type="checkbox" class="mapping-wizard-checkbox" data-mp-id="${escapeHtml(mpCat.id)}" checked />
                <div style="flex:1;">
                    <div style="font-weight:500;">${escapeHtml(mpCat.name)}</div>
                    <div style="font-size:12px;color:var(--color-text-secondary);">#${escapeHtml(mpCat.external_id)}</div>
                </div>
                <span class="chip chip-active">${escapeHtml(mpCat.marketplaceName)}</span>
            </label>`;
    });
    listHtml += '</div>';

    body.innerHTML = headerHtml + listHtml;

    // Оновити текст кнопки
    applyBtn.textContent = hasOwn ? 'Замапити' : 'Створити + замапити';
}

/**
 * Рендер фінального стану
 */
function renderDone(body) {
    const { results } = wizardState;
    body.innerHTML = `
        <div style="text-align:center;padding:40px 20px;">
            <span class="material-symbols-outlined" style="font-size:48px;color:var(--color-success);">check_circle</span>
            <h3 style="margin-top:12px;">Готово!</h3>
            <div style="margin-top:8px;color:var(--color-text-secondary);">
                Створено категорій: <strong>${results.created}</strong><br>
                Замаплено зв'язків: <strong>${results.mapped}</strong><br>
                Пропущено: <strong>${results.skipped}</strong>
            </div>
            <button class="btn btn-primary u-mt-16" onclick="document.querySelector('[data-modal-close]')?.click()">
                Закрити
            </button>
        </div>
    `;
}

// ═══════════════════════════════════════════════════════════════════════════
// ACTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Замапити поточну картку
 */
async function applyCurrentCard() {
    const { cards, currentIndex } = wizardState;
    const card = cards[currentIndex];

    // Зібрати обрані MP категорії
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
        let ownCatId;

        if (card.ownCategory) {
            // Є власна — просто мапимо
            ownCatId = card.ownCategory.id;
        } else {
            // Немає — створюємо чернетку
            const newCat = await addCategory({
                name_ua: card.name,
                name_ru: ''
            });
            ownCatId = newCat.id;
            wizardState.results.created++;
        }

        // Мапимо обрані MP категорії
        for (const mpId of selectedMpIds) {
            await createCategoryMapping(ownCatId, mpId);
            wizardState.results.mapped++;
        }

        // Наступна картка
        wizardState.currentIndex++;
        renderCard();

    } catch (error) {
        console.error('❌ Помилка маппінгу:', error);
        showToast(`Помилка: ${error.message}`, 'error');
    } finally {
        applyBtn.disabled = false;
    }
}

/**
 * Пропустити поточну картку
 */
function skipCurrentCard() {
    wizardState.results.skipped++;
    wizardState.currentIndex++;
    renderCard();
}

/**
 * Повернутися на попередню картку
 */
function goBack() {
    if (wizardState.currentIndex > 0) {
        wizardState.currentIndex--;
        renderCard();
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// PUBLIC API
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Відкрити модалку маппінг-візарда
 */
export async function showMappingWizard() {
    // Побудувати картки
    const cards = buildCards();

    if (!cards.length) {
        showToast('Всі MP категорії вже замаплені', 'info');
        return;
    }

    // Ініціалізуємо стан
    wizardState = {
        cards,
        currentIndex: 0,
        results: { created: 0, mapped: 0, skipped: 0 }
    };

    // Показати модалку
    await showModal('mapper-mapping-wizard', null);

    // Рендеримо першу картку
    renderCard();

    // Підключаємо кнопки
    const applyBtn = document.getElementById('mapping-wizard-apply');
    const skipBtn = document.getElementById('mapping-wizard-skip');
    const prevBtn = document.getElementById('mapping-wizard-prev');

    applyBtn?.addEventListener('click', applyCurrentCard);
    skipBtn?.addEventListener('click', skipCurrentCard);
    prevBtn?.addEventListener('click', goBack);

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
