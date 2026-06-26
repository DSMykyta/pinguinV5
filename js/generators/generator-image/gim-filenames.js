// js/generators/generator-image/gim-filenames.js

/**
 * IMAGE TOOL - FILE NAMES
 *
 * Owns editable image names for the image tool.
 * Other modules should not parse, sanitize, or deduplicate download names directly.
 */

const MIME_EXTENSION_MAP = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/avif': 'avif',
    'image/gif': 'gif',
    'image/svg+xml': 'svg',
    'image/tiff': 'tif'
};

const RESERVED_FILENAME_CHARS = /[<>:"/\\|?*\u0000-\u001f]/g;

export function getEditableFileBaseName(item) {
    if (!item) return 'image';

    const rawName = item.baseName || item.name || item.file?.name || '';
    return normalizeEditableFileBaseName(rawName, item.name || item.file?.name || 'image');
}

export function normalizeEditableFileBaseName(value, fallback = 'image') {
    const fallbackBase = stripExtension(fallback) || 'image';
    const cleanBase = sanitizeFileBaseName(stripExtension(value));

    return cleanBase || sanitizeFileBaseName(fallbackBase) || 'image';
}

export function setEditableFileBaseName(item, value) {
    if (!item) return;
    item.baseName = normalizeEditableFileBaseName(value, item.name || item.file?.name || 'image');
}

export function getItemSourceExtension(item) {
    const fromName = extractExtension(item?.name || item?.file?.name || '');
    if (fromName) return fromName;

    const mimeExt = MIME_EXTENSION_MAP[item?.file?.type];
    return mimeExt ? mimeExt.toUpperCase() : '';
}

export function getOutputExtension(mimeType) {
    return MIME_EXTENSION_MAP[mimeType] || 'png';
}

export function createDownloadNameRegistry() {
    return new Map();
}

export function buildDownloadFileName(item, extension, registry, width, height) {
    const baseName = getUniqueBaseName(getEditableFileBaseName(item), registry);
    const sizePart = Number.isFinite(width) && Number.isFinite(height) ? `_${width}x${height}` : '';
    return `${baseName}${sizePart}.${extension}`;
}

function getUniqueBaseName(baseName, registry) {
    const cleanBase = sanitizeFileBaseName(baseName) || 'image';
    if (!registry) return cleanBase;

    const key = cleanBase.toLowerCase();
    const index = registry.get(key) || 0;
    registry.set(key, index + 1);

    return index === 0 ? cleanBase : `${cleanBase}-${index}`;
}

function stripExtension(value) {
    const name = String(value || '').trim();
    if (!name) return '';

    const slashIndex = Math.max(name.lastIndexOf('/'), name.lastIndexOf('\\'));
    const fileName = slashIndex >= 0 ? name.slice(slashIndex + 1) : name;
    const dotIndex = fileName.lastIndexOf('.');

    return dotIndex > 0 ? fileName.slice(0, dotIndex) : fileName;
}

function extractExtension(value) {
    const name = String(value || '').trim();
    const dotIndex = name.lastIndexOf('.');

    return dotIndex > 0 ? name.slice(dotIndex + 1).toUpperCase() : '';
}

function sanitizeFileBaseName(value) {
    return String(value || '')
        .replace(RESERVED_FILENAME_CHARS, '-')
        .replace(/\s+/g, ' ')
        .replace(/[. ]+$/g, '')
        .trim();
}
