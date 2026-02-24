// js/generators/generator-image/gim-loader.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║              IMAGE TOOL - FILE LOADER                                     ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * ПРИЗНАЧЕННЯ:
 * Завантаження файлів зображень (з диска, URL, drag-drop).
 *
 * ЕКСПОРТОВАНІ ФУНКЦІЇ:
 * - setupFileHandlers() - Налаштувати обробники завантаження файлів
 * - handleFileLoad(files) - Завантажити файли
 */

import { getImageDom } from './gim-dom.js';
import { getImageState } from './gim-state.js';
import { renderThumbnails, setActiveImage } from './gim-renderer.js';
import { showToast } from '../../components/ui-toast.js';

/**
 * Налаштовує обробники для завантаження файлів
 */
export function setupFileHandlers() {
    const dom = getImageDom();

    dom.selectFileBtn.addEventListener('click', (e) => {
        e.preventDefault();
        dom.imageInput.click();
    });

    dom.imageInput.addEventListener('change', (e) => {
        handleFileLoad(e.target.files);
        e.target.value = '';
    });

    dom.loadUrlBtn.addEventListener('click', handleUrlLoad);

    const dropzone = dom.dropzone;

    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropzone.addEventListener(eventName, preventDefaults, false);
    });

    dropzone.addEventListener('dragenter', () => {
        dropzone.classList.add('dragover');
    });

    dropzone.addEventListener('dragleave', (e) => {
        if (e.relatedTarget === null || !dropzone.contains(e.relatedTarget)) {
            dropzone.classList.remove('dragover');
        }
    });

    dropzone.addEventListener('drop', (e) => {
        dropzone.classList.remove('dragover');
        handleFileLoad(e.dataTransfer.files);
    });
}

function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}

/**
 * Завантаження з URL
 */
async function handleUrlLoad() {
    const dom = getImageDom();
    const url = dom.imageUrlInput.value.trim();
    if (!url) {
        showToast('Введіть URL зображення', 'warning');
        return;
    }

    showToast('Завантаження з URL...', 'info');

    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Помилка завантаження: ${response.statusText}`);
        }

        const blob = await response.blob();

        let fileName;
        try {
            const urlObj = new URL(url);
            fileName = urlObj.pathname.substring(urlObj.pathname.lastIndexOf('/') + 1) || 'image.png';
        } catch (e) {
            fileName = 'image.png';
        }

        if (!blob.type.startsWith('image/')) {
            showToast(`Завантажений файл не є зображенням (${blob.type})`, 'error');
            return;
        }

        const file = new File([blob], fileName, { type: blob.type });

        handleFileLoad([file]);
        dom.imageUrlInput.value = '';

    } catch (error) {
        console.error('Помилка завантаження URL:', error);
        showToast('Помилка завантаження URL. Перевірте посилання та CORS.', 'error', 5000);
    }
}

/**
 * Завантажує файли та додає їх у state
 * @param {FileList} files - Список файлів
 */
export function handleFileLoad(files) {
    if (!files || files.length === 0) return;

    const dom = getImageDom();
    const imageState = getImageState();

    let firstFileId = null;

    Array.from(files).forEach((file, index) => {
        if (!file.type.startsWith('image/')) {
            if (file.type !== 'image/tiff') {
                showToast(`Файл ${file.name} не є зображенням.`, 'warning');
                return;
            }
        }

        const newId = `img-${++imageState.counter}`;
        if (index === 0 && imageState.activeId === null) {
            firstFileId = newId;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                const fileItem = {
                    id: newId,
                    file: file,
                    image: img,
                    width: img.width,
                    height: img.height,
                    name: file.name
                };
                imageState.files.push(fileItem);
                renderThumbnails();

                if (firstFileId === newId) {
                    setActiveImage(newId);
                }
            };
            img.onerror = () => {
                showToast(`Помилка: Браузер не зміг прочитати файл ${file.name}. Можливо, формат .tif не підтримується.`, 'error', 5000);
            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
    });
}
