// js/generators/generator-image/gim-logic.js

import { getImageDom } from './gim-dom.js';
import { showToast } from '../../common/ui-toast.js';
import { initCustomSelects } from '../../common/ui-select.js';
import { closeModal } from '../../common/ui-modal.js';
import { debounce } from '../../utils/common-utils.js';

/**
 * Глобальний стан
 */
const imageState = {
    files: [], // Масив об'єктів { id: string, file: File, image: HTMLImageElement, width: number, height: number, name: string }
    activeId: null,
    selectedIds: new Set(),
    counter: 0
    // currentMode більше не потрібен у глобальному стані, керується UI
};

/**
 * Ініціалізація DOM, завантаження зображень та обробка подій.
 */
export function initImageToolLogic() {
    const dom = getImageDom();
    if (!dom.imageInput) return;

    const asidePanel = dom.outputFormat.closest('.panel-fragment');
    if (asidePanel) {
        initCustomSelects(asidePanel);
    }

    resetState();
    setupFileHandlers();
    setupToolHandlers();

    document.body.addEventListener('click', (e) => {
        const confirmBtn = e.target.closest('#confirm-clear-action');
        if (confirmBtn) {
            const activePanel = document.querySelector('#panel-right .panel-fragment.is-active');
            if (activePanel && activePanel.id === 'aside-image-tool') {
                const icon = dom.reloadBtn.querySelector('.material-symbols-outlined');
                dom.reloadBtn.disabled = true;
                icon?.classList.add('is-spinning');
                resetState();
                showToast('Інструмент очищено', 'info');
                setTimeout(() => {
                    dom.reloadBtn.disabled = false;
                    icon?.classList.remove('is-spinning');
                }, 500);
                closeModal();
            }
        }
    });

    window.addEventListener('resize', () => {
        const activeItem = imageState.files.find(f => f.id === imageState.activeId);
        if (activeItem) {
            debounce(() => updateCanvasDisplay(activeItem.image), 100)();
        }
    });

    console.log('✅ Логіка Image Tool ініціалізована (v2).');
}

// ============================================
// БАЗОВА ЛОГІКА СТАНУ І ФАЙЛІВ
// ============================================

function setupFileHandlers() {
    const dom = getImageDom();
    
    dom.selectFileBtn.addEventListener('click', (e) => {
        e.preventDefault(); 
        dom.imageInput.click();
    });

    dom.imageInput.addEventListener('change', (e) => {
        handleFileLoad(e.target.files);
        e.target.value = '';
    });
    
    // --- ▼ НОВА ЛОГІКА: Завантаження з URL ▼ ---
    dom.loadUrlBtn.addEventListener('click', handleUrlLoad);
    // --- ▲ КІНЕЦЬ ▲ ---

    const canvasArea = dom.imageCanvas.closest('.canvas-area');
    const dragDropOverlay = dom.dragDropOverlay;

    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        canvasArea.addEventListener(eventName, preventDefaults, false);
    });
    
    canvasArea.addEventListener('dragenter', (e) => {
         if (dragDropOverlay.classList.contains('visible')) {
            dragDropOverlay.classList.add('dragover');
         }
    }, false);

    canvasArea.addEventListener('dragleave', (e) => {
        if (e.relatedTarget === null || !canvasArea.contains(e.relatedTarget)) {
             dragDropOverlay.classList.remove('dragover');
        }
    }, false);

    canvasArea.addEventListener('drop', (e) => {
        dragDropOverlay.classList.remove('visible', 'dragover');
        let dt = e.dataTransfer;
        handleFileLoad(dt.files);
    }, false);
}

function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}

/**
 * --- ▼ НОВА ФУНКЦІЯ: Завантаження з URL ▼ ---
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
        // УВАГА: Це спрацює, тільки якщо сервер (напр. imgur) дозволяє CORS.
        // Якщо ні, браузер заблокує запит.
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Помилка завантаження: ${response.statusText}`);
        }
        
        const blob = await response.blob();
        
        // Визначаємо ім'я файлу з URL
        let fileName;
        try {
            const urlObj = new URL(url);
            fileName = urlObj.pathname.substring(urlObj.pathname.lastIndexOf('/') + 1) || 'image.png';
        } catch (e) {
            fileName = 'image.png';
        }

        // Перевіряємо, чи це зображення
        if (!blob.type.startsWith('image/')) {
            showToast(`Завантажений файл не є зображенням (${blob.type})`, 'error');
            return;
        }

        const file = new File([blob], fileName, { type: blob.type });
        
        handleFileLoad([file]); // Передаємо як масив
        dom.imageUrlInput.value = '';

    } catch (error) {
        console.error('Помилка завантаження URL:', error);
        showToast('Помилка завантаження URL. Перевірте посилання та CORS.', 'error', 5000);
    }
}
// --- ▲ КІНЕЦЬ ▲ ---

/**
 * Завантажує файли та додає їх у state
 */
function handleFileLoad(files) {
    if (!files || files.length === 0) return;
    
    getImageDom().dragDropOverlay.classList.remove('visible');
    
    let firstFileId = null;

    Array.from(files).forEach((file, index) => {
        if (!file.type.startsWith('image/')) {
            // Виняток для .tif, який браузер може не розпізнати
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
                    image: img, // Зберігаємо ОРИГІНАЛЬНЕ зображення
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
                // Це спрацює для .tif у більшості браузерів
                showToast(`Помилка: Браузер не зміг прочитати файл ${file.name}. Можливо, формат .tif не підтримується.`, 'error', 5000);
            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
    });
}

/**
 * Встановлює активне зображення (для показу в Canvas)
 */
function setActiveImage(id) {
    const dom = getImageDom();
    const activeItem = imageState.files.find(f => f.id === id);
    if (!activeItem) return;

    imageState.activeId = id;

    // 1. Оновлюємо Canvas (використовуємо ПОТОЧНЕ зображення)
    updateCanvasDisplay(activeItem.image);

    // 2. Оновлюємо Aside (поля вводу)
    dom.resizeWidth.value = activeItem.width;
    dom.resizeHeight.value = activeItem.height;
    dom.canvasWidth.value = activeItem.width;
    dom.canvasHeight.value = activeItem.height;
    dom.canvasWidth.placeholder = activeItem.width;
    dom.canvasHeight.placeholder = activeItem.height;
    
    dom.saveBtn.disabled = false;
    
    // 3. Оновлюємо активний клас мініатюр
    renderThumbnails();
}

/**
 * Оновлює Canvas, масштабуючи зображення (зберігаючи пропорції).
 */
function updateCanvasDisplay(image) {
    const dom = getImageDom();
    const canvas = dom.imageCanvas;
    const ctx = canvas.getContext('2d');
    const container = canvas.closest('.canvas-area');

    if (!container || !image) return;

    const containerHeight = container.clientHeight - 32; // -32px padding
    const containerWidth = container.clientWidth - 32;

    let newWidth = image.width;
    let newHeight = image.height;
    const ratio = image.width / image.height;
    
    if (image.height > containerHeight && containerHeight > 0) {
        newHeight = containerHeight;
        newWidth = newHeight * ratio;
    }
    
    if (newWidth > containerWidth && containerWidth > 0) {
        newWidth = containerWidth;
        newHeight = newWidth / ratio;
    }
    
    canvas.width = image.width;
    canvas.height = image.height;
    
    canvas.style.width = `${Math.round(newWidth)}px`;
    canvas.style.height = `${Math.round(newHeight)}px`;

    ctx.clearRect(0, 0, image.width, image.height);
    ctx.drawImage(image, 0, 0, image.width, image.height);
}

/**
 * Рендеринг мініатюр
 */
function renderThumbnails() {
    const dom = getImageDom();
    dom.thumbnailsArea.innerHTML = '';
    
    if (imageState.files.length === 0) {
        dom.thumbnailsArea.appendChild(dom.emptyState);
        dom.emptyState.classList.remove('u-hidden');
        resetCanvasState();
        return;
    }
    
    dom.emptyState.classList.add('u-hidden');

    imageState.files.forEach(item => {
        const div = document.createElement('div');
        div.className = `thumbnail-item${item.id === imageState.activeId ? ' active' : ''}`;
        div.dataset.id = item.id;
        
        const isChecked = imageState.selectedIds.has(item.id);
        
        div.innerHTML = `
            <input type="checkbox" class="row-checkbox" data-id="${item.id}" ${isChecked ? 'checked' : ''}>
            <img src="${item.image.src}" alt="${item.name}">
            <div class="thumbnail-item-info">
                <strong>${item.name}</strong>
                <span>${item.width} x ${item.height} px</span>
            </div>
            <button class="tab-close-btn" data-delete-id="${item.id}" aria-label="Видалити">
                <span class="material-symbols-outlined">close</span>
            </button>
        `;
        
        div.querySelector('.thumbnail-item-info').addEventListener('click', () => {
            setActiveImage(item.id);
        });
        
        div.querySelector('.row-checkbox').addEventListener('change', (e) => {
            if (e.target.checked) {
                imageState.selectedIds.add(item.id);
            } else {
                imageState.selectedIds.delete(item.id);
            }
            updateSaveButtonText();
        });

        div.querySelector('.tab-close-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            deleteImage(item.id);
        });

        dom.thumbnailsArea.appendChild(div);
    });
}

/**
 * Видалення зображення зі state
 */
function deleteImage(id) {
    const index = imageState.files.findIndex(f => f.id === id);
    if (index === -1) return;
    imageState.files.splice(index, 1);
    imageState.selectedIds.delete(id);
    if (imageState.activeId === id) {
        if (imageState.files.length > 0) {
            setActiveImage(imageState.files[0].id);
        } else {
            resetCanvasState();
        }
    }
    renderThumbnails();
    updateSaveButtonText();
    showToast(`Зображення видалено`, 'info', 1500);
}

/**
 * Скидає стан інструмента
 */
function resetState() {
    const dom = getImageDom();
    imageState.files.length = 0;
    imageState.activeId = null;
    imageState.selectedIds.clear();
    imageState.counter = 0;
    dom.imageInput.value = '';
    dom.imageUrlInput.value = ''; // Очищуємо URL input
    dom.thumbnailsArea.innerHTML = '';
    if (dom.emptyState) {
        dom.thumbnailsArea.appendChild(dom.emptyState);
        dom.emptyState.classList.remove('u-hidden');
    }
    resetCanvasState();
}

/**
 * Скидає стан Canvas (коли всі зображення видалено)
 */
function resetCanvasState() {
    const dom = getImageDom();
    imageState.activeId = null;
    dom.imageCanvas.width = 1;
    dom.imageCanvas.height = 1;
    dom.imageCanvas.style.width = 'auto';
    dom.imageCanvas.style.height = 'auto';
    dom.resizeWidth.value = '';
    dom.resizeHeight.value = '';
    dom.canvasWidth.value = '';
    dom.canvasHeight.value = '';
    dom.canvasWidth.placeholder = 'Поточна';
    dom.canvasHeight.placeholder = 'Поточна';
    dom.saveBtn.disabled = true;
    updateSaveButtonText();
    dom.dragDropOverlay.classList.add('visible');
}

// ============================================
// ЛОГІКА ІНСТРУМЕНТІВ (ASIDE)
// ============================================

function setupToolHandlers() {
    const dom = getImageDom();
    
    if (dom.modeSwitchContainer) {
        dom.modeSwitchContainer.addEventListener('change', (e) => {
            const input = e.target;
            if (input.name === 'gim-mode-select') {
                const mode = input.value;
                dom.modeResizeContent.classList.toggle('u-hidden', !(mode === 'resize'));
                dom.modeCanvasContent.classList.toggle('u-hidden', !(mode === 'canvas'));
            }
        });
    }

    dom.resizeWidth.addEventListener('input', updateResizeProportions);
    dom.resizeHeight.addEventListener('input', updateResizeProportions);
    dom.canvasWidth.addEventListener('input', updateCanvasProportions);
    dom.canvasHeight.addEventListener('input', updateCanvasProportions);

    // --- ▼ НОВА ЛОГІКА: Кнопки "Застосувати" ▼ ---
    dom.applyResizeBtn.addEventListener('click', () => {
        applyTransformation('resize');
    });
    dom.applyCanvasBtn.addEventListener('click', () => {
        applyTransformation('canvas');
    });
    // --- ▲ КІНЕЦЬ ▲ ---

    dom.saveBtn.addEventListener('click', handleSave);
}

/**
 * Синхронізація пропорцій для зміни розміру зображення
 */
function updateResizeProportions(e) {
    const dom = getImageDom();
    const activeItem = imageState.files.find(f => f.id === imageState.activeId);
    if (!activeItem) return;
    const currentW = activeItem.width;
    const currentH = activeItem.height;
    const ratio = currentW / currentH;

    if (e.target === dom.resizeWidth && dom.resizeWidth.value) {
        const newW = parseInt(dom.resizeWidth.value);
        if (!isNaN(newW)) dom.resizeHeight.value = Math.round(newW / ratio);
    } else if (e.target === dom.resizeHeight && dom.resizeHeight.value) {
        const newH = parseInt(dom.resizeHeight.value);
        if (!isNaN(newH)) dom.resizeWidth.value = Math.round(newH * ratio);
    }
}

/**
 * Автозаповнення полів полотна поточними розмірами
 */
function updateCanvasProportions(e) {
     const dom = getImageDom();
     const activeItem = imageState.files.find(f => f.id === imageState.activeId);
     if (!activeItem) return;
     if (!dom.canvasWidth.value) dom.canvasWidth.placeholder = activeItem.width;
     if (!dom.canvasHeight.value) dom.canvasHeight.placeholder = activeItem.height;
}

/**
 * Оновлює текст кнопки збереження
 */
function updateSaveButtonText() {
    const dom = getImageDom();
    const count = imageState.selectedIds.size;
    const label = dom.saveBtn.querySelector('.panel-item-text');
    if (!label) return;

    if (count > 0) {
        label.textContent = `Зберегти ${count} ${getPlural(count, 'файл', 'файли', 'файлів')}`;
    } else {
        label.textContent = 'Зберегти результат';
    }
}

// --- ▼▼▼ НОВА ФУНКЦІЯ: ПОЕТАПНЕ ЗАСТОСУВАННЯ ЗМІН ▼▼▼ ---
/**
 * Застосовує трансформацію (resize або canvas) до АКТИВНОГО зображення.
 * Оновлює item.image в imageState.
 * @param {'resize' | 'canvas'} mode - Яку трансформацію застосувати
 */
function applyTransformation(mode) {
    const dom = getImageDom();
    const activeItem = imageState.files.find(f => f.id === imageState.activeId);
    if (!activeItem) {
        showToast('Спочатку виберіть зображення', 'warning');
        return;
    }

    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    let finalW = activeItem.width;
    let finalH = activeItem.height;

    if (mode === 'resize') {
        // РЕЖИМ 1: Зміна розміру зображення
        finalW = parseInt(dom.resizeWidth.value) || finalW;
        finalH = parseInt(dom.resizeHeight.value) || finalH;
        
        tempCanvas.width = finalW;
        tempCanvas.height = finalH;
        tempCtx.drawImage(activeItem.image, 0, 0, finalW, finalH);

    } else if (mode === 'canvas') {
        // РЕЖИМ 2: Зміна розміру полотна
        finalW = parseInt(dom.canvasWidth.value) || activeItem.width;
        finalH = parseInt(dom.canvasHeight.value) || activeItem.height;
        
        tempCanvas.width = finalW;
        tempCanvas.height = finalH;
        
        tempCtx.fillStyle = 'white'; // Заливаємо білим фоном
        tempCtx.fillRect(0, 0, finalW, finalH);
        
        const centerX = (finalW - activeItem.width) / 2;
        const centerY = (finalH - activeItem.height) / 2;
        tempCtx.drawImage(activeItem.image, centerX, centerY, activeItem.width, activeItem.height);
    }

    // Створюємо DataURL з тимчасового canvas (використовуємо PNG для збереження якості)
    const dataUrl = tempCanvas.toDataURL('image/png');
    
    // Створюємо новий об'єкт Image
    const newImg = new Image();
    newImg.onload = () => {
        // ОНОВЛЮЄМО STATE: замінюємо старе зображення на нове, оброблене
        activeItem.image = newImg;
        activeItem.width = newImg.width;
        activeItem.height = newImg.height;

        // Оновлюємо UI
        updateCanvasDisplay(newImg); // Показуємо нове зображення в головному canvas
        renderThumbnails(); // Оновлюємо мініатюру
        
        // Оновлюємо поля вводу новими розмірами
        dom.resizeWidth.value = newImg.width;
        dom.resizeHeight.value = newImg.height;
        dom.canvasWidth.value = newImg.width;
        dom.canvasHeight.value = newImg.height;
        dom.canvasWidth.placeholder = newImg.width;
        dom.canvasHeight.placeholder = newImg.height;

        showToast(`Застосовано: ${mode} (${finalW}x${finalH})`, 'success');
    };
    newImg.src = dataUrl;
}
// --- ▲▲▲ КІНЕЦЬ НОВОЇ ФУНКЦІЇ ▲▲▲ ---


// --- ▼▼▼ ОНОВЛЕНА ФУНКЦІЯ ЗБЕРЕЖЕННЯ ▼▼▼ ---
/**
 * Зберігає зображення (з конвертацією).
 * Логіка трансформації тепер видалена і знаходиться в applyTransformation.
 */
async function handleSave() {
    const dom = getImageDom();
    
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

    // Перевірка підтримки AVIF (лише один раз)
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
        
        // --- ЛОГІКУ ВИДАЛЕНО ---
        // Ми більше не перевіряємо режим і не застосовуємо трансформації тут.
        // Ми просто беремо ПОТОЧНЕ зображення (item.image), яке ВЖЕ могло бути
        // змінене через applyTransformation.
        
        const finalW = item.width;
        const finalH = item.height;

        tempCanvas.width = finalW;
        tempCanvas.height = finalH;
        tempCtx.drawImage(item.image, 0, 0, finalW, finalH); // Малюємо ПОТОЧНЕ зображення
        // --- КІНЕЦЬ ЗМІН ---
        
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
// --- ▲▲▲ КІНЕЦЬ ОНОВЛЕНОЇ ФУНКЦІЇ ▲▲▲ ---

/**
 * Utility для відмінювання слів
 */
function getPlural(number, one, two, five) {
    let n = Math.abs(number);
    n %= 100;
    if (n >= 5 && n <= 20) {
        return five;
    }
    n %= 10;
    if (n === 1) {
        return one;
    }
    if (n >= 2 && n <= 4) {
        return two;
    }
    return five;
}