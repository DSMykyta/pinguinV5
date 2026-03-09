// js/pages/blog/blog-data.js

/*
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                        BLOG — DATA                                       ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  🔌 ПЛАГІН (viewless) — Завантаження та CRUD через Google Sheets API     ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

import { blogState } from './blog-state.js';
import { callSheetsAPI } from '../../utils/utils-api-client.js';
import { PRODUCTS_SPREADSHEET_ID as SPREADSHEET_ID } from '../../config/spreadsheet-config.js';
import { generateNextId } from '../../utils/utils-id.js';

const SHEET_NAME = 'Blog';
const SHEET_GID = '908847151';
const SHEET_RANGE = `${SHEET_NAME}!A:T`;
const COLUMN_IDS = [
    'blog_id',
    'blog_ext_id',
    'blog_ext_site',
    'blog_target',
    'blog_group',
    'blog_type',
    'blog_sort_order',
    'status',
    'blog_name_ua',
    'blog_name_ru',
    'url_ua',
    'url_ru',
    'url',
    'blog_display_none_ua',
    'blog_display_none_ru',
    'blog_text_ua',
    'blog_text_ru',
    'image_url',
    'created_at',
    'created_by'
];

function nowDateTime() {
    return new Date().toISOString().replace('T', ' ').slice(0, 19);
}

function inferIdPrefix(existingIds, fallback) {
    const existing = (existingIds || []).find(id => typeof id === 'string' && id.includes('-'));
    const match = existing?.match(/^([a-zA-Z]+-)/);
    return match ? match[1] : fallback;
}

function normalizeRecord(record = {}) {
    const normalized = {};
    COLUMN_IDS.forEach((key) => {
        normalized[key] = record[key] != null ? String(record[key]).trim() : '';
    });
    return normalized;
}

function buildBlogRow(record) {
    return COLUMN_IDS.map(key => record[key] ?? '');
}

export async function loadBlogPosts() {
    try {
        const csvUrl = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/export?format=csv&gid=${SHEET_GID}`;
        const response = await fetch(csvUrl);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const csvText = await response.text();
        if (typeof Papa === 'undefined') {
            throw new Error('PapaParse library is not loaded');
        }

        const parsed = Papa.parse(csvText, { header: true, skipEmptyLines: true });
        const rows = parsed.data || [];

        blogState.posts = rows.map((row, index) => ({
            ...normalizeRecord(row),
            _rowIndex: index + 2
        }));

        blogState._dataLoaded = true;
        return blogState.posts;
    } catch (error) {
        console.error('❌ Помилка завантаження блогу:', error);
        throw error;
    }
}

export function getBlogPosts() {
    return blogState.posts || [];
}

export async function addBlogPost(postData = {}) {
    try {
        const prefix = inferIdPrefix(
            blogState.posts.map(item => item.blog_id),
            'blog-'
        );

        const normalized = normalizeRecord({
            ...postData,
            blog_id: postData.blog_id || generateNextId(prefix, blogState.posts.map(item => item.blog_id)),
            created_at: postData.created_at || nowDateTime(),
            created_by: postData.created_by || ''
        });

        await callSheetsAPI('append', {
            range: SHEET_RANGE,
            values: [buildBlogRow(normalized)],
            spreadsheetType: 'products'
        });

        const newEntry = {
            ...normalized,
            _rowIndex: blogState.posts.length + 2
        };
        blogState.posts.push(newEntry);
        return newEntry;
    } catch (error) {
        console.error('❌ Помилка додавання поста:', error);
        throw error;
    }
}

export async function updateBlogPost(blogId, updates = {}) {
    try {
        const entry = blogState.posts.find(item => item.blog_id === blogId);
        if (!entry) {
            throw new Error(`Пост ${blogId} не знайдено`);
        }

        const merged = normalizeRecord({ ...entry, ...updates });
        await callSheetsAPI('update', {
            range: `${SHEET_NAME}!A${entry._rowIndex}:T${entry._rowIndex}`,
            values: [buildBlogRow(merged)],
            spreadsheetType: 'products'
        });

        Object.assign(entry, merged);
        return entry;
    } catch (error) {
        console.error('❌ Помилка оновлення поста:', error);
        throw error;
    }
}

export async function deleteBlogPost(blogId) {
    try {
        const index = blogState.posts.findIndex(item => item.blog_id === blogId);
        if (index === -1) {
            throw new Error(`Пост ${blogId} не знайдено`);
        }

        const entry = blogState.posts[index];
        const rowIndex = entry._rowIndex;

        await callSheetsAPI('batchUpdateSpreadsheet', {
            requests: [{
                deleteDimension: {
                    range: {
                        sheetId: parseInt(SHEET_GID, 10),
                        dimension: 'ROWS',
                        startIndex: rowIndex - 1,
                        endIndex: rowIndex
                    }
                }
            }],
            spreadsheetType: 'products'
        });

        blogState.posts.splice(index, 1);
        blogState.posts.forEach(item => {
            if (item._rowIndex > rowIndex) item._rowIndex -= 1;
        });

        return true;
    } catch (error) {
        console.error('❌ Помилка видалення поста:', error);
        throw error;
    }
}
