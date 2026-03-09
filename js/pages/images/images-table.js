// js/pages/images/images-table.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                    IMAGES — TABLE RENDERING                              ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

import { getImages } from './images-data.js';
import { imagesState } from './images-state.js';
import { createManagedTable, col } from '../../components/table/table-main.js';
import { registerImagesPlugin } from './images-plugins.js';
import { initColumnsCharm } from '../../components/charms/charm-columns.js';
import { escapeHtml } from '../../utils/utils-text.js';

let _imagesManagedTable = null;

export function getColumns() {
    return [
        col('preview_url', 'Фото', 'photo', { span: 1, sortable: false }),
        col('image_type', 'Тип', 'text', { span: 1, sortable: true, filterable: true }),
        col('image_path', 'Шлях', 'text', { span: 3, sortable: true }),
        col('file_name', 'Назва файла', 'name', { span: 3, sortable: true }),
        col('image_format', 'Формат', 'tag', {
            span: 1,
            color: 'c-tertiary',
            sortable: true,
            filterable: true
        }),
        col('image_size', 'Розмір', 'code', {
            span: 1,
            sortable: true,
            render: (value) => value ? `<code>${escapeHtml(value)}</code>` : '<span class="text-muted">—</span>'
        }),
        col('image_weight', 'Вага', 'code', {
            span: 2,
            sortable: true,
            render: (value) => value ? `<code>${escapeHtml(value)}</code>` : '<span class="text-muted">—</span>'
        })
    ];
}

function initImagesTable() {
    const visibleCols = [
        'preview_url',
        'image_type',
        'image_path',
        'file_name',
        'image_format',
        'image_size',
        'image_weight'
    ];

    const searchCols = ['image_type', 'image_path', 'file_name', 'image_format', 'image_size', 'image_weight'];

    _imagesManagedTable = createManagedTable({
        container: 'images-table-container',
        columns: getColumns().map(c => ({
            ...c,
            searchable: searchCols.includes(c.id) || c.searchable === true,
            checked: visibleCols.includes(c.id)
        })),
        data: getImages(),
        statsId: null,
        paginationId: null,
        tableConfig: {
            getRowId: (row) => row.image_id,
            emptyState: { message: 'Зображення не знайдено' },
            withContainer: false,
            plugins: {
                sorting: {
                    columnTypes: {
                        image_type: 'string',
                        image_path: 'string',
                        file_name: 'string',
                        image_format: 'string',
                        image_size: 'string',
                        image_weight: 'string'
                    }
                },
                filters: {
                    filterColumns: [
                        { id: 'image_type', label: 'Тип', filterType: 'values' },
                        { id: 'image_format', label: 'Формат', filterType: 'values' }
                    ]
                }
            }
        },
        preFilter: null,
        pageSize: null,
        checkboxPrefix: 'images'
    });

    imagesState.tableAPI = _imagesManagedTable.tableAPI;
    imagesState.managedTable = _imagesManagedTable;
    initColumnsCharm();
}

export function renderImagesTable() {
    if (!_imagesManagedTable) {
        if (!document.getElementById('images-table-container')) return;
        initImagesTable();
        return;
    }
    _imagesManagedTable.updateData(getImages());
}

export function renderImagesTableRowsOnly() {
    if (_imagesManagedTable) {
        _imagesManagedTable.refilter();
    } else {
        renderImagesTable();
    }
}

export function resetImagesTableAPI() {
    if (_imagesManagedTable) {
        _imagesManagedTable.destroy();
        _imagesManagedTable = null;
    }
    imagesState.tableAPI = null;
    imagesState.managedTable = null;
}

export function init() {
    registerImagesPlugin('onInit', () => {
        renderImagesTable();
    });
    registerImagesPlugin('onRender', () => {
        if (imagesState.managedTable) {
            imagesState.managedTable.refilter();
        }
    });
}
