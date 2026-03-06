// js/pages/images/images-data.js

/*
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                        IMAGES — DATA                                     ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  🔌 ПЛАГІН (viewless) — Агрегація image_url з аркушів Banners + Blog     ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

import { imagesState } from './images-state.js';
import { PRODUCTS_SPREADSHEET_ID as SPREADSHEET_ID } from '../../config/spreadsheet-config.js';

const GID_BANNERS = '1208466784';
const GID_BLOG = '908847151';
const ENRICH_LIMIT = 150;

function parseImageUrls(value) {
    if (value == null) return [];
    const raw = String(value).trim();
    if (!raw) return [];

    if (raw.startsWith('[')) {
        try {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) {
                return parsed.map(item => String(item).trim()).filter(Boolean);
            }
        } catch {
            // ignore invalid JSON and fallback to split
        }
    }

    return raw.split(/[\n,]+/).map(item => item.trim()).filter(Boolean);
}

function sanitizeIdPart(value) {
    return String(value || '').replace(/[^\w-]/g, '_');
}

function extractDriveFileId(url) {
    const safeUrl = String(url || '');
    const fromPath = safeUrl.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (fromPath?.[1]) return fromPath[1];

    try {
        const parsed = new URL(safeUrl);
        return parsed.searchParams.get('id') || '';
    } catch {
        return '';
    }
}

function toPreviewUrl(url) {
    const fileId = extractDriveFileId(url);
    if (fileId) return `https://drive.google.com/thumbnail?id=${fileId}&sz=w400`;
    return String(url || '').trim();
}

function getFileName(url, fallback = 'image') {
    const fileId = extractDriveFileId(url);
    try {
        const parsed = new URL(url);
        const parts = parsed.pathname.split('/').filter(Boolean);
        const last = decodeURIComponent(parts[parts.length - 1] || '').trim();
        if (last && last !== 'view' && last !== 'uc') return last;
    } catch {
        // ignore
    }

    if (fileId) return `drive-${fileId}`;
    return fallback;
}

function getFileFormat(fileName) {
    const match = String(fileName || '').match(/\.([a-zA-Z0-9]+)$/);
    return match ? match[1].toUpperCase() : 'N/A';
}

function formatBytes(bytes) {
    if (!Number.isFinite(bytes) || bytes <= 0) return '';
    if (bytes < 1024) return `${bytes} B`;
    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} KB`;
    return `${(kb / 1024).toFixed(2)} MB`;
}

function getImageDimensions(url) {
    return new Promise((resolve) => {
        if (!url) {
            resolve('');
            return;
        }

        const img = new Image();
        let done = false;
        const finish = (value) => {
            if (done) return;
            done = true;
            resolve(value);
        };

        img.onload = () => finish(`${img.naturalWidth}x${img.naturalHeight}`);
        img.onerror = () => finish('');

        setTimeout(() => finish(''), 7000);
        img.src = url;
    });
}

async function getContentLength(url) {
    if (!url) return null;
    try {
        const response = await fetch(url, { method: 'HEAD' });
        if (!response.ok) return null;
        const raw = response.headers.get('content-length');
        const parsed = Number(raw);
        return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
    } catch {
        return null;
    }
}

async function loadCsvRowsByGid(gid) {
    const csvUrl = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/export?format=csv&gid=${gid}`;
    const response = await fetch(csvUrl);
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }

    const csvText = await response.text();
    if (typeof Papa === 'undefined') {
        throw new Error('PapaParse library is not loaded');
    }

    const parsed = Papa.parse(csvText, { header: true, skipEmptyLines: true });
    return parsed.data || [];
}

function collectImages(rows, sourceName, idField, typeField) {
    const images = [];

    rows.forEach((row, rowIndex) => {
        const urls = parseImageUrls(row.image_url);
        urls.forEach((imagePath, imageIndex) => {
            const fileName = getFileName(imagePath, `${sourceName}-${rowIndex + 1}-${imageIndex + 1}`);
            const imageType = String(row[typeField] || sourceName).trim() || sourceName;
            const sourceId = sanitizeIdPart(row[idField] || `${rowIndex + 1}`);

            images.push({
                image_id: `${sourceName}-${sourceId}-${imageIndex + 1}`,
                image_type: imageType,
                image_path: String(imagePath || '').trim(),
                file_name: fileName,
                image_format: getFileFormat(fileName),
                image_size: '',
                image_weight: '',
                preview_url: toPreviewUrl(imagePath),
                name_short: fileName
            });
        });
    });

    return images;
}

async function enrichImage(item) {
    const [dimensions, bytes] = await Promise.all([
        getImageDimensions(item.preview_url || item.image_path),
        getContentLength(item.image_path)
    ]);

    if (dimensions) item.image_size = dimensions;
    if (bytes) item.image_weight = formatBytes(bytes);
}

export async function loadImages() {
    try {
        const [bannersRows, blogRows] = await Promise.all([
            loadCsvRowsByGid(GID_BANNERS),
            loadCsvRowsByGid(GID_BLOG)
        ]);

        const merged = [
            ...collectImages(bannersRows, 'banner', 'banner_id', 'banner_type'),
            ...collectImages(blogRows, 'blog', 'blog_id', 'blog_type')
        ];

        const unique = [];
        const seen = new Set();
        merged.forEach((item) => {
            const key = item.image_path;
            if (!key || seen.has(key)) return;
            seen.add(key);
            unique.push(item);
        });

        const enrichTargets = unique.slice(0, ENRICH_LIMIT);
        await Promise.allSettled(enrichTargets.map(item => enrichImage(item)));

        imagesState.images = unique;
        imagesState._dataLoaded = true;
        return imagesState.images;
    } catch (error) {
        console.error('❌ Помилка завантаження зображень:', error);
        throw error;
    }
}

export function getImages() {
    return imagesState.images || [];
}
