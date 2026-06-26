// js/generators/generator-image/gim-saver.js

/**
 * IMAGE TOOL - FILE SAVER
 *
 * Owns exporting processed images. Both normal browser download and direct
 * folder saving use the same render/name pipeline.
 */

import { getImageDom } from './gim-dom.js';
import { getImageState } from './gim-state.js';
import { renderThumbnails } from './gim-renderer.js';
import { buildDownloadFileName, createDownloadNameRegistry, getOutputExtension } from './gim-filenames.js';
import { getPlural } from './gim-utils.js';
import { showToast } from '../../components/feedback/toast.js';

export async function handleSave() {
    const dom = getImageDom();
    const imageState = getImageState();
    const idsToProcess = getIdsToProcess(imageState);

    if (!validateIdsToProcess(idsToProcess)) return;

    await saveProcessedImages({
        dom,
        imageState,
        idsToProcess,
        saveBlob: downloadBlob
    });
}

export async function handleSaveToFolder() {
    const dom = getImageDom();
    const imageState = getImageState();
    const idsToProcess = getIdsToProcess(imageState);

    if (!validateIdsToProcess(idsToProcess)) return;

    if (!window.showDirectoryPicker) {
        showToast('Браузер не підтримує вибір папки. Використай Chrome/Edge або стандартне збереження.', 'warning');
        return;
    }

    let directoryHandle;
    try {
        directoryHandle = await window.showDirectoryPicker({ mode: 'readwrite' });
    } catch (error) {
        if (error?.name !== 'AbortError') {
            console.error('[GIM Saver] Directory picker failed:', error);
            showToast('Не вдалося обрати папку для збереження', 'error');
        }
        return;
    }

    await saveProcessedImages({
        dom,
        imageState,
        idsToProcess,
        saveBlob: (blob, fileName) => writeBlobToDirectory(directoryHandle, blob, fileName)
    });
}

async function saveProcessedImages({ dom, imageState, idsToProcess, saveBlob }) {
    setSaveButtonsDisabled(dom, true);
    showToast(`Обробка ${idsToProcess.length} зображень...`, 'info');

    const mimeType = dom.outputFormat.value;
    const quality = 0.9;
    const extension = getOutputExtension(mimeType);
    const downloadNameRegistry = createDownloadNameRegistry();

    if (!supportsCanvasMimeType(dom.imageCanvas, mimeType)) {
        showToast('Браузер не підтримує обраний формат.', 'error');
        setSaveButtonsDisabled(dom, false);
        return;
    }

    try {
        for (const id of idsToProcess) {
            const item = imageState.files.find(f => f.id === id);
            if (!item) continue;

            const { blob, width, height } = await createProcessedBlob(item, mimeType, quality);
            const fileName = buildDownloadFileName(item, extension, downloadNameRegistry, width, height);

            await saveBlob(blob, fileName);
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        showToast(`${idsToProcess.length} ${getPlural(idsToProcess.length, 'файл', 'файли', 'файлів')} збережено`, 'success');

        imageState.selectedIds.clear();
        renderThumbnails();
        updateSaveButtonText();
    } catch (error) {
        console.error('[GIM Saver] Save failed:', error);
        showToast('Не вдалося зберегти зображення', 'error');
    } finally {
        setSaveButtonsDisabled(dom, false);
    }
}

function getIdsToProcess(imageState) {
    return imageState.selectedIds.size > 0
        ? Array.from(imageState.selectedIds)
        : (imageState.activeId ? [imageState.activeId] : []);
}

function validateIdsToProcess(idsToProcess) {
    if (idsToProcess.length > 0) return true;
    showToast('Немає зображень для збереження', 'warning');
    return false;
}

function setSaveButtonsDisabled(dom, disabled) {
    dom.saveBtn.disabled = disabled;
    if (dom.saveFolderBtn) dom.saveFolderBtn.disabled = disabled;
}

function supportsCanvasMimeType(canvas, mimeType) {
    if (!mimeType || mimeType === 'image/png') return true;
    return canvas.toDataURL(mimeType).startsWith(`data:${mimeType}`);
}

async function createProcessedBlob(item, mimeType, quality) {
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    const finalW = item.width;
    const finalH = item.height;

    tempCanvas.width = finalW;
    tempCanvas.height = finalH;

    if (mimeType === 'image/jpeg') {
        tempCtx.fillStyle = '#ffffff';
        tempCtx.fillRect(0, 0, finalW, finalH);
    }

    tempCtx.drawImage(item.image, 0, 0, finalW, finalH);

    const blob = await canvasToBlob(tempCanvas, mimeType, quality);
    return { blob, width: finalW, height: finalH };
}

function canvasToBlob(canvas, mimeType, quality) {
    return new Promise((resolve, reject) => {
        canvas.toBlob((blob) => {
            if (blob) {
                resolve(blob);
            } else {
                reject(new Error(`Canvas export failed for ${mimeType}`));
            }
        }, mimeType, quality);
    });
}

async function downloadBlob(blob, fileName) {
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = objectUrl;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(objectUrl);
}

async function writeBlobToDirectory(directoryHandle, blob, fileName) {
    const safeFileName = await getAvailableFileName(directoryHandle, fileName);
    const fileHandle = await directoryHandle.getFileHandle(safeFileName, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(blob);
    await writable.close();
}

async function getAvailableFileName(directoryHandle, fileName) {
    const dotIndex = fileName.lastIndexOf('.');
    const baseName = dotIndex > 0 ? fileName.slice(0, dotIndex) : fileName;
    const extension = dotIndex > 0 ? fileName.slice(dotIndex) : '';

    let index = 0;
    while (true) {
        const candidate = index === 0 ? fileName : `${baseName}-${index}${extension}`;
        try {
            await directoryHandle.getFileHandle(candidate);
            index += 1;
        } catch (error) {
            if (error?.name === 'NotFoundError') return candidate;
            throw error;
        }
    }
}

export function updateSaveButtonText() {
    const dom = getImageDom();
    const imageState = getImageState();
    const count = imageState.selectedIds.size;
    const label = dom.saveBtn.querySelector('.panel-item-text');
    if (!label) return;

    if (count > 0) {
        label.textContent = `Зберегти ${count} ${getPlural(count, 'файл', 'файли', 'файлів')}`;
    } else {
        label.textContent = 'Зберегти результат';
    }
}
