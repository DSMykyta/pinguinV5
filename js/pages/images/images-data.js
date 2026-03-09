// js/pages/images/images-data.js

/*
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                        IMAGES — DATA                                     ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  🔌 ПЛАГІН (viewless) — Список зображень з Google Drive                  ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

import { imagesState } from './images-state.js';
import { listDriveImages } from '../../utils/utils-api-client.js';

function formatBytes(bytes) {
    const num = Number(bytes);
    if (!Number.isFinite(num) || num <= 0) return '';
    if (num < 1024) return `${num} B`;
    const kb = num / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} KB`;
    return `${(kb / 1024).toFixed(2)} MB`;
}

function getFileFormat(mimeType) {
    const map = {
        'image/png': 'PNG',
        'image/jpeg': 'JPG',
        'image/webp': 'WEBP',
        'image/svg+xml': 'SVG',
        'image/gif': 'GIF',
        'image/avif': 'AVIF',
        'image/tiff': 'TIFF',
    };
    return map[mimeType] || mimeType.replace('image/', '').toUpperCase();
}

function formatDimensions(width, height) {
    if (width && height) return `${width}x${height}`;
    return '';
}

export async function loadImages() {
    try {
        const driveImages = await listDriveImages();

        imagesState.images = driveImages.map(img => ({
            image_id: img.fileId,
            image_type: img.folder || 'root',
            image_path: img.folder ? `${img.folder}/${img.name}` : img.name,
            file_name: img.name,
            image_format: getFileFormat(img.mimeType),
            image_size: formatDimensions(img.width, img.height),
            image_weight: formatBytes(img.size),
            preview_url: img.thumbnailUrl,
        }));

        imagesState._dataLoaded = true;
        return imagesState.images;
    } catch (error) {
        console.error('[Images Data] Error:', error);
        throw error;
    }
}

export function getImages() {
    return imagesState.images || [];
}
