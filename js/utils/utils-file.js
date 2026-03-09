// js/utils/utils-file.js

/*
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                    FILE UTILS — РОБОТА З ФАЙЛАМИ                       ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  📋 fetchImageAsFile, formatFileSize, extractFileName, extractExtension ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

/**
 * Скачати зображення з URL і повернути як File об'єкт
 * @param {string} url - URL зображення
 * @returns {Promise<File>} File готовий для upload
 * @throws {Error} Якщо URL недоступний або не є зображенням
 */
export async function fetchImageAsFile(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const blob = await res.blob();
    if (!blob.type.startsWith('image/')) throw new Error('URL не є зображенням');
    const ext = blob.type.split('/')[1] || 'jpg';
    return new File([blob], `photo.${ext}`, { type: blob.type });
}

/**
 * Форматувати розмір файлу у людський формат
 * @param {number} bytes - Розмір у байтах
 * @returns {string} Форматований розмір (B / KB / MB)
 */
export function formatFileSize(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Витягти ім'я файлу з URL
 * @param {string} url - URL файлу
 * @param {string} [fallback='file'] - Запасне ім'я
 * @returns {string} Ім'я файлу
 */
export function extractFileName(url, fallback = 'file') {
    try {
        const pathname = new URL(url).pathname;
        return pathname.split('/').pop() || fallback;
    } catch {
        return fallback;
    }
}

/**
 * Витягти розширення файлу з імені (UPPERCASE)
 * @param {string} name - Ім'я файлу
 * @returns {string} Розширення без крапки, великими літерами (або '' якщо немає)
 */
export function extractExtension(name) {
    if (!name) return '';
    const dot = name.lastIndexOf('.');
    return dot > 0 ? name.slice(dot + 1).toUpperCase() : '';
}
