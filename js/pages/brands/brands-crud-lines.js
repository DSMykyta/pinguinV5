// js/pages/brands/brands-crud-lines.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                    BRANDS CRUD — ЛІНІЙКИ В МОДАЛІ                       ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * Таблиця лінійок всередині модала бренду.
 * Всі зміни — чернетки до натискання "Зберегти".
 *
 * НЕ плутати з lines-table.js (таблиця на сторінці).
 */

import { getBrandLinesByBrandId, updateBrandLine } from './lines-data.js';
import { showConfirmModal } from '../../components/modal/modal-main.js';
import { showToast } from '../../components/feedback/toast.js';
import { createManagedTable, col } from '../../components/table/table-main.js';
import {
    registerActionHandlers,
    initActionHandlers,
    actionButton
} from '../../components/actions/actions-main.js';
import { initPaginationCharm } from '../../components/charms/pagination/pagination-main.js';
import { initSearchCharm } from '../../components/charms/charm-search.js';
import { initColumnsCharm } from '../../components/charms/charm-columns.js';

// ═══════════════════════════════════════════════════════════════════════════
// STATE
// ═══════════════════════════════════════════════════════════════════════════

let _brandLinesCleanup = null;
let _brandLinesManagedTable = null;
let _getCurrentBrandId = null;

// Чернетки: лінійки що відображаються в модалі (локальна копія)
let _draftLines = [];
// ID лінійок що були від'язані (pending unlink)
let _pendingUnlinks = [];

// ═══════════════════════════════════════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Ініціалізувати секцію лінійок в модалі бренду
 * @param {Function} getCurrentBrandId - callback для отримання поточного brandId
 */
export function initBrandLinesSection(getCurrentBrandId) {
    _getCurrentBrandId = getCurrentBrandId;

    const addBtn = document.getElementById('btn-add-brand-line');
    if (addBtn) {
        addBtn.onclick = async () => {
            const { showAddLineModal } = await import('./lines-crud.js');
            showAddLineModal(_getCurrentBrandId());
        };
    }

    const container = document.getElementById('brand-lines-container');
    if (container) {
        initPaginationCharm();
        initSearchCharm();
        initColumnsCharm();

        container.addEventListener('charm:refresh', (e) => {
            e.detail.waitUntil((async () => {
                const { loadBrandLines } = await import('./lines-data.js');
                await loadBrandLines();
                populateBrandLines(_getCurrentBrandId());
            })());
        });
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// RENDER
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Заповнити секцію лінійок бренду (створює локальну чернетку)
 * @param {string} brandId - ID бренду
 */
export function populateBrandLines(brandId) {
    const container = document.getElementById('brand-lines-container');
    if (!container) return;

    // Створити свіжу чернетку з реальних даних
    _draftLines = (getBrandLinesByBrandId(brandId) || []).map(l => ({ ...l }));
    _pendingUnlinks = [];

    _renderLinesTable(brandId);
}

/**
 * Внутрішній рендер таблиці з _draftLines
 */
function _renderLinesTable(brandId) {
    registerActionHandlers('brand-crud-lines', {
        edit: async (rowId) => {
            const { showEditLineModal } = await import('./lines-crud.js');
            await showEditLineModal(rowId);
        },
        unlink: async (rowId) => {
            if (!rowId) return;

            const line = _draftLines.find(l => l.line_id === rowId);
            const lineName = line?.name_uk || rowId;

            const confirmed = await showConfirmModal({
                action: 'від\'язати',
                entity: 'лінійку',
                name: lineName,
            });

            if (confirmed) {
                // Чернетка: тільки локально прибрати + запам'ятати
                _pendingUnlinks.push(rowId);
                _draftLines = _draftLines.filter(l => l.line_id !== rowId);
                _renderLinesTable(brandId);
                showToast('Лінійку буде від\'язано після збереження', 'info');
            }
        }
    });

    _brandLinesManagedTable = createManagedTable({
        container: 'brand-lines-container',
        columns: [
            { ...col('line_id', 'ID', 'tag'), searchable: true, checked: true, span: 2 },
            { ...col('name_uk', 'Назва', 'name'), searchable: true, checked: true, span: 8 },
            col('action', ' ', 'action', {
                render: (value, row) => actionButton({
                    action: 'unlink', rowId: row.line_id, context: 'brand-crud-lines'
                })
            })
        ],
        data: _draftLines,
        statsId: null,
        paginationId: null,
        tableConfig: {
            rowActionsHeader: ' ',
            rowActions: (row) => actionButton({
                action: 'edit', rowId: row.line_id, context: 'brand-crud-lines'
            }),
            getRowId: (row) => row.line_id,
            emptyState: { message: 'Лінійки відсутні' },
            withContainer: false,
            onAfterRender: (cont) => {
                if (_brandLinesCleanup) _brandLinesCleanup();
                _brandLinesCleanup = initActionHandlers(cont, 'brand-crud-lines');
            },
            plugins: {
                sorting: {
                    columnTypes: { line_id: 'id-text', name_uk: 'string' }
                }
            }
        },
        preFilter: null,
        pageSize: null,
        checkboxPrefix: 'brand-lines'
    });
}

// ═══════════════════════════════════════════════════════════════════════════
// COMMIT / DISCARD
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Зберегти всі pending зміни лінійок в API
 * Викликається з handleSaveBrand()
 */
export async function commitPendingLineChanges() {
    if (_pendingUnlinks.length === 0) return;

    const promises = _pendingUnlinks.map(lineId =>
        updateBrandLine(lineId, { brand_id: '' })
    );

    await Promise.allSettled(promises);
    _pendingUnlinks = [];
}

/**
 * Скинути всі pending зміни (при закритті без збереження)
 */
export function discardPendingLineChanges() {
    _pendingUnlinks = [];
    _draftLines = [];
}

/**
 * Чи є незбережені зміни лінійок
 */
export function hasPendingLineChanges() {
    return _pendingUnlinks.length > 0;
}
