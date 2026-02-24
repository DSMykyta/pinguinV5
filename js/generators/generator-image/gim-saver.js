// js/generators/generator-image/gim-saver.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║              IMAGE TOOL - FILE SAVER                                      ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * ПРИЗНАЧЕННЯ:
 * Збереження оброблених зображень у різних форматах.
 *
 * ЕКСПОРТОВАНІ ФУНКЦІЇ:
 * - handleSave() - Зберегти вибрані зображення
 * - updateSaveButtonText() - Оновити текст кнопки збереження
 */

import { getImageDom } from './gim-dom.js';
import { getImageState } from './gim-state.js';
import { renderThumbnails } from './gim-renderer.js';
import { getPlural } from './gim-utils.js';
import { showToast } from '../../components/ui-toast.js';

/**
 * Зберігає зображення (з конвертацією)
 */
export async function handleSave() {
    const dom = getImageDom();
    const imageState = getImageState();

    const idsToProcess = imageState.selectedIds.size > 0
        ? Array.from(imageState.selectedIds)
        : (imageState.activeId ? [imageState.activeId] : []);

    if (idsToProcess.length === 0) {
        showToast('Немає зображень для збереження', 'warning');
        return;
    }

    dom.saveBtn.disabled = true;
    showToast(`Обробка ${idsToProcess.length} зображень...`, 'info');

    const mimeType = dom.outputFormat.value;
    const isAVIF = mimeType === 'image/avif';
    const quality = 0.9;
    let extension = 'png';
    if (mimeType === 'image/jpeg') extension = 'jpg';
    if (mimeType === 'image/webp') extension = 'webp';
    if (isAVIF) extension = 'avif';

    // Перевірка підтримки AVIF
    if (isAVIF && !dom.imageCanvas.toDataURL('image/avif')) {
        showToast('Ваш браузер не підтримує конвертацію у формат AVIF.', 'error');
        dom.saveBtn.disabled = false;
        return;
    }

    // Обробляємо кожне вибране зображення
    for (const id of idsToProcess) {
        const item = imageState.files.find(f => f.id === id);
        if (!item) continue;

        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');

        const finalW = item.width;
        const finalH = item.height;

        tempCanvas.width = finalW;
        tempCanvas.height = finalH;
        tempCtx.drawImage(item.image, 0, 0, finalW, finalH);

        const dataUrl = tempCanvas.toDataURL(mimeType, quality);

        let filename = item.name.split('.').slice(0, -1).join('_');
        const a = document.createElement('a');
        a.href = dataUrl;
        a.download = `${filename}_${finalW}x${finalH}.${extension}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        await new Promise(resolve => setTimeout(resolve, 100));
    }

    showToast(`✅ ${idsToProcess.length} ${getPlural(idsToProcess.length, 'файл', 'файли', 'файлів')} збережено!`, 'success');
    dom.saveBtn.disabled = false;

    imageState.selectedIds.clear();
    renderThumbnails();
    updateSaveButtonText();
}

/**
 * Оновлює текст кнопки збереження
 */
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
