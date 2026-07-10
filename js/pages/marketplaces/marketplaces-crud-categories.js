// js/pages/marketplaces/marketplaces-crud-categories.js

/**
 * Дерево категорій маркетплейсу, прив'язки та завантаження довідників.
 */

import { getCategories } from '../../data/entities-data.js';
import { getMarketplaces } from '../../data/marketplaces-data.js';
import {
    createCategoryMapping,
    deleteCategoryMapping,
    getMapCategories
} from '../../data/mappings-data.js';
import { uploadReferenceFile, callSheetsAPI } from '../../utils/utils-api-client.js';
import { renderAvatarState } from '../../components/avatar/avatar-ui-states.js';
import { showToast } from '../../components/feedback/toast.js';
import { escapeHtml } from '../../utils/utils-text.js';
import { showMappingPicker } from './marketplaces-crud-mappings.js';
import {
    resolveMpField,
    extractMpName,
    synthesizeMissingParents
} from './marketplaces-crud-utils.js';

export function populateMpCategories(allData, catMapping, slug, marketplaceId) {
    const container = document.getElementById('mp-data-cat-container');
    const statsEl = document.getElementById('mp-data-cat-stats');
    if (!container) return;
    const searchInput = container._charmSearchInput;

    const updateStats = (shown, total) => {
        if (statsEl) statsEl.textContent = `Показано ${shown} з ${total}`;
    };

    const render = () => {
        if (allData.length === 0) {
            container.innerHTML = renderAvatarState('empty', {
                message: 'Категорії відсутні', size: 'medium',
                containerClass: 'empty-state', avatarClass: 'empty-state-avatar',
                messageClass: 'avatar-state-message', showMessage: true
            });
        } else {
            renderMpCategoryTree(container, [...allData], catMapping, slug, marketplaceId);
        }
        updateStats(allData.length, allData.length);
    };

    const catSearchColumns = ['name', 'external_id'];

    // DOM-based пошук з авторозгортанням батьків
    const applySearch = (query) => {
        const q = query.toLowerCase().trim();
        const tree = container.querySelector('.tree');
        if (!tree) return;

        const allLi = tree.querySelectorAll('li');

        if (!q) {
            allLi.forEach(li => {
                li.style.display = '';
                li.classList.remove('open');
            });
            updateStats(allData.length, allData.length);
            return;
        }

        // Сховати все
        allLi.forEach(li => {
            li.style.display = 'none';
            li.classList.remove('open');
        });

        // Знайти співпадіння
        let matchCount = 0;
        allLi.forEach(li => {
            const nameEl = li.querySelector(':scope > .tree-item-content > .tree-item-name');
            if (!nameEl) return;

            let matches = false;
            if (catSearchColumns.includes('name')) {
                matches = nameEl.textContent.toLowerCase().includes(q);
            }
            if (!matches && catSearchColumns.includes('external_id')) {
                const extId = li.dataset.extId || li.dataset.id || '';
                matches = extId.toLowerCase().includes(q);
            }

            if (matches) {
                matchCount++;
                li.style.display = '';
                // Показати і розгорнути всіх батьків
                let parent = li.parentElement?.closest('li');
                while (parent) {
                    parent.style.display = '';
                    parent.classList.add('open');
                    parent = parent.parentElement?.closest('li');
                }
            }
        });

        updateStats(matchCount, allData.length);
    };

    if (searchInput) {
        searchInput.value = '';
        searchInput.oninput = (e) => applySearch(e.target.value);
    }

    // Expand/Collapse all
    const expandBtn = document.getElementById('mp-tree-expand-all');
    const collapseBtn = document.getElementById('mp-tree-collapse-all');
    if (expandBtn) expandBtn.onclick = () => {
        container.querySelectorAll('li.has-children').forEach(li => li.classList.add('open'));
    };
    if (collapseBtn) collapseBtn.onclick = () => {
        container.querySelectorAll('li.has-children').forEach(li => li.classList.remove('open'));
    };

    render();
}

/**
 * Знайти маппінг для MP категорії
 */
function findCatMapping(mpCat) {
    const mapCats = getMapCategories();
    return mapCats.find(m =>
        m.mp_category_id === mpCat.id || m.mp_category_id === mpCat.external_id
    );
}

/**
 * Рендерити дерево MP категорій
 */
function renderMpCategoryTree(container, data, catMapping, slug, marketplaceId) {
    const ownCategories = getCategories();

    const byParent = new Map();
    const byJsonId = new Map();

    data.forEach(item => {
        const jsonId = String(item._jsonId || item.external_id || '');
        if (jsonId) byJsonId.set(jsonId, item);
    });

    const dataSet = new Set();
    data.forEach(d => {
        if (d._jsonId) dataSet.add(String(d._jsonId));
        if (d.external_id) dataSet.add(String(d.external_id));
    });

    synthesizeMissingParents(data, catMapping, dataSet, byJsonId);

    data.forEach(item => {
        const rawParent = resolveMpField(item, 'parent_id', catMapping)
            ?? item.parentId ?? item.parent_id ?? '';
        const parentId = rawParent === 0 || rawParent === '0' || rawParent === null ? '' : String(rawParent);
        const key = (parentId && dataSet.has(parentId)) ? parentId : 'root';
        if (!byParent.has(key)) byParent.set(key, []);
        byParent.get(key).push(item);
    });

    byParent.forEach(children => {
        children.sort((a, b) => extractMpName(a, catMapping).localeCompare(extractMpName(b, catMapping), 'uk'));
    });

    const statsCache = new Map();
    function countDescendantStats(parentKey) {
        if (statsCache.has(parentKey)) return statsCache.get(parentKey);
        const children = byParent.get(parentKey);
        if (!children) { statsCache.set(parentKey, { total: 0, mapped: 0 }); return { total: 0, mapped: 0 }; }
        let total = 0, mapped = 0;
        children.forEach(child => {
            const childId = String(child._jsonId || child.external_id || '');
            if (!child._synthetic) {
                total++;
                if (findCatMapping(child)) mapped++;
            }
            const sub = countDescendantStats(childId);
            total += sub.total;
            mapped += sub.mapped;
        });
        const result = { total, mapped };
        statsCache.set(parentKey, result);
        return result;
    }

    function buildTree(parentKey, level) {
        const children = byParent.get(parentKey);
        if (!children || children.length === 0) return '';

        const items = children.map(item => {
            const jsonId = String(item._jsonId || item.external_id || '');
            const hasChildren = byParent.has(jsonId) && byParent.get(jsonId).length > 0;
            const isSynthetic = item._synthetic;
            const name = extractMpName(item, catMapping) || item.external_id || '?';

            const toggleHtml = hasChildren
                ? `<button class="toggle-btn"><span class="material-symbols-outlined">arrow_drop_down</span></button>`
                : `<span class="leaf-placeholder"></span>`;
            const childrenHtml = hasChildren ? buildTree(jsonId, level + 1) : '';
            const classes = hasChildren ? 'has-children' : '';

            let badgeHtml = '';
            if (hasChildren) {
                const stats = countDescendantStats(jsonId);
                badgeHtml = `<span class="tree-node-count">${stats.mapped}/${stats.total}</span>`;
            }

            if (isSynthetic) {
                return `
                    <li data-id="${escapeHtml(jsonId)}" class="${classes}">
                        <div class="tree-item-content">
                            ${toggleHtml}
                            <span class="tree-item-name synthetic-parent">${escapeHtml(name)}</span>
                            ${badgeHtml}
                        </div>
                        ${childrenHtml}
                    </li>
                `;
            }

            const mapping = findCatMapping(item);
            const mappedCatId = mapping?.category_id || '';
            const mappedCat = mappedCatId ? ownCategories.find(c => c.id === mappedCatId) : null;
            const mapped_label = mappedCat ? (mappedCat.name_ua || mappedCat.id) : '';
            const triggerClass = mappedCatId ? 'custom-select-trigger mapped' : 'custom-select-trigger';

            const fileId = item.file_id || '';
            let downloadBtn = '';
            let uploadBtn = '';
            if (!hasChildren) {
                downloadBtn = fileId
                    ? `<a href="https://drive.google.com/uc?export=download&id=${escapeHtml(fileId)}" target="_blank" class="btn-icon" title="Завантажити довідник" aria-label="Завантажити довідник"><span class="material-symbols-outlined">download</span></a>`
                    : '';
                uploadBtn = `<button class="btn-icon cat-upload-btn" data-cat-id="${escapeHtml(item.id)}" data-cat-ext-id="${escapeHtml(item.external_id || '')}" title="Завантажити довідник" aria-label="Завантажити довідник"><span class="material-symbols-outlined">upload</span></button>`;
            }

            return `
                <li data-id="${escapeHtml(item.id)}" data-ext-id="${escapeHtml(item.external_id || '')}" class="${classes}">
                    <div class="tree-item-content">
                        ${toggleHtml}
                        <span class="tree-item-name">${escapeHtml(name)}</span>
                        ${badgeHtml}
                        <div class="group">
                            ${downloadBtn}
                            ${uploadBtn}
                        </div>
                        <div class="${triggerClass}"
                             data-mp-cat-id="${escapeHtml(item.id)}"
                             data-current-cat-id="${escapeHtml(mappedCatId)}">
                            <span class="mp-tree-mapping-label">${mapped_label ? escapeHtml(mapped_label) : '—'}</span>
                            <svg class="custom-select-arrow" viewBox="0 0 24 24"><path d="M7 10l5 5 5-5z"/></svg>
                        </div>
                    </div>
                    ${childrenHtml}
                </li>
            `;
        }).join('');

        return `<ul class="tree-level-${Math.min(level, 5)}">${items}</ul>`;
    }

    const treeHtml = buildTree('root', 0);
    container.innerHTML = `<div class="tree">${treeHtml || renderAvatarState('empty', { message: 'Дані відсутні', size: 'medium', containerClass: 'empty-state', avatarClass: 'empty-state-avatar', messageClass: 'avatar-state-message', showMessage: true })}</div>`;

    // Toggle expand/collapse
    container.querySelectorAll('.toggle-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const li = btn.closest('li');
            if (li) li.classList.toggle('open');
        });
    });

    // Upload button per category
    if (slug) {
        container.querySelectorAll('.cat-upload-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const catId = btn.dataset.catId;
                const catExtId = btn.dataset.catExtId;
                const fileInput = document.createElement('input');
                fileInput.type = 'file';
                fileInput.accept = '.xlsx,.xls,.csv,.json,.txt,.pdf';
                fileInput.onchange = async () => {
                    const file = fileInput.files?.[0];
                    if (!file) return;
                    btn.disabled = true;
                    const icon = btn.querySelector('.material-symbols-outlined');
                    if (icon) icon.textContent = 'hourglass_empty';
                    try {
                        const result = await uploadReferenceFile(file, slug);
                        if (result?.fileId && catId) {
                            const mpCat = data.find(c => c.id === catId);
                            if (mpCat?._rowIndex) {
                                await callSheetsAPI('update', {
                                    range: `Mapper_MP_Categories!H${mpCat._rowIndex}`,
                                    values: [[result.fileId]],
                                    spreadsheetType: 'main'
                                });
                                mpCat.file_id = result.fileId;
                            }
                        }
                        // Імпорт характеристик/опцій з файлу
                        if (icon) icon.textContent = 'sync';
                        try {
                            const { importReferenceForCategory } = await import('./marketplaces-import.js');
                            const marketplace = getMarketplaces().find(m => m.slug === slug);
                            const mpCat = data.find(c => c.id === catId);
                            const mpCatData = typeof mpCat.data === 'string' ? JSON.parse(mpCat.data || '{}') : (mpCat.data || {});
                            await importReferenceForCategory(file, marketplace, {
                                external_id: mpCat.external_id,
                                name: mpCatData.name || mpCatData.name_ua || mpCat.external_id
                            });
                            showToast('Довідник завантажено та імпортовано', 'success');
                        } catch (importErr) {
                            console.error('Import failed:', importErr);
                            showToast('Файл збережено, але імпорт не вдався', 'warning');
                        }
                        // Перемалювати дерево щоб показати іконку download
                        renderMpCategoryTree(container, data, catMapping, slug, marketplaceId);
                    } catch (err) {
                        console.error('Upload failed:', err);
                        showToast('Помилка завантаження файлу', 'error');
                    } finally {
                        btn.disabled = false;
                        if (icon) icon.textContent = 'upload';
                    }
                };
                fileInput.click();
            });
        });
    }

    // Mapping trigger click → shared picker popup
    if (container._mappingClickHandler) {
        container.removeEventListener('click', container._mappingClickHandler);
    }
    const mappingClickHandler = (e) => {
        const trigger = e.target.closest('.custom-select-trigger');
        if (!trigger) return;
        e.stopPropagation();

        const mpCatId = trigger.dataset.mpCatId;
        const currentCatId = trigger.dataset.currentCatId || '';
        const mpCat = data.find(c => c.id === mpCatId);
        if (!mpCat) return;

        showMappingPicker(trigger, ownCategories, currentCatId, async (newCatId) => {
            const oldMapping = findCatMapping(mpCat);
            if (oldMapping) {
                try {
                    await deleteCategoryMapping(oldMapping.id);
                } catch (err) {
                    showToast('Помилка видалення маппінгу', 'error');
                    return;
                }
            }

            if (newCatId) {
                try {
                    await createCategoryMapping(newCatId, mpCatId);
                    showToast('Прив\'язано', 'success');
                } catch (err) {
                    showToast('Помилка створення маппінгу', 'error');
                    return;
                }
            } else if (oldMapping) {
                const undoOwnId = oldMapping.category_id;
                const undoMpId = oldMapping.mp_category_id;
                showToast('Прив\'язку знято', 'success', {
                    duration: 6000,
                    action: {
                        label: 'Відмінити',
                        onClick: async () => {
                            await createCategoryMapping(undoOwnId, undoMpId);
                            const restoredCat = ownCategories.find(c => c.id === undoOwnId);
                            trigger.dataset.currentCatId = undoOwnId;
                            trigger.classList.add('mapped');
                            const lbl = trigger.querySelector('.mp-tree-mapping-label');
                            if (lbl) lbl.textContent = restoredCat ? (restoredCat.name_ua || restoredCat.id) : undoOwnId;
                        }
                    }
                });
            }

            const newCat = newCatId ? ownCategories.find(c => c.id === newCatId) : null;
            trigger.dataset.currentCatId = newCatId || '';
            trigger.classList.toggle('mapped', !!newCatId);
            const label = trigger.querySelector('.mp-tree-mapping-label');
            if (label) label.textContent = newCat ? (newCat.name_ua || newCat.id) : '—';
        });
    };
    container.addEventListener('click', mappingClickHandler);
    container._mappingClickHandler = mappingClickHandler;
}

