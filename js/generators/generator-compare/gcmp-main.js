// js/generators/generator-compare/gcmp-main.js

/**
 * COMPARE GENERATOR — Генератор порівняльних зображень
 *
 * Завантажує 2–3 фото, генерує 1000x1000 порівняльне зображення.
 */

import { registerAsideInitializer } from '../../layout/layout-main.js';
import { slugify } from '../../utils/utils-transliterate.js';

const SIZE = 1000;
const MAX_SLOTS = 3;

const state = {
    slotCount: 2,
    images: [null, null, null],
    scales: [100, 100, 100],
    showArrow: true
};

export function getCompareState() {
    return state;
}

function setupSide(i) {
    const slot = document.getElementById(`cmp-preview-${i}`);
    const fileInput = document.getElementById(`cmp-file-${i}`);
    const pickBtn = document.getElementById(`cmp-pick-${i}`);

    if (!slot || !fileInput) return;

    if (pickBtn) {
        pickBtn.addEventListener('click', (e) => {
            e.preventDefault();
            fileInput.click();
        });
    }

    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            loadImage(e.target.files[0], i);
            e.target.value = '';
        }
    });

    slot.addEventListener('dragover', (e) => e.preventDefault());
    slot.addEventListener('drop', (e) => {
        e.preventDefault();
        if (e.dataTransfer.files.length > 0) {
            loadImage(e.dataTransfer.files[0], i);
        }
    });
}

function loadImage(file, i) {
    if (!file.type.startsWith('image/')) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
            state.images[i] = img;
            renderSlot(i);
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

function renderSlot(i) {
    const slot = document.getElementById(`cmp-preview-${i}`);
    if (!slot) return;

    if (state.images[i]) {
        slot.innerHTML = '';
        const preview = document.createElement('img');
        preview.className = 'photo-main-img';
        preview.src = state.images[i].src;
        preview.style.transform = `scale(${state.scales[i] / 100})`;
        slot.appendChild(preview);

        const delBtn = document.createElement('button');
        delBtn.className = 'btn-icon cmp-slot-delete';
        delBtn.innerHTML = '<span class="material-symbols-outlined">close</span>';
        delBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            state.images[i] = null;
            state.scales[i] = 100;
            renderSlot(i);
        });
        slot.appendChild(delBtn);

        const slider = document.createElement('input');
        slider.type = 'range';
        slider.min = '50';
        slider.max = '200';
        slider.value = state.scales[i];
        slider.className = 'cmp-scale-slider';
        slider.addEventListener('input', () => {
            state.scales[i] = parseInt(slider.value);
            preview.style.transform = `scale(${state.scales[i] / 100})`;
        });
        slot.appendChild(slider);

        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.id = `cmp-file-${i}`;
        fileInput.accept = 'image/*';
        fileInput.className = 'u-hidden';
        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                loadImage(e.target.files[0], i);
                e.target.value = '';
            }
        });
        slot.appendChild(fileInput);
        slot.classList.add('has-image');
    } else {
        slot.innerHTML = `
            <div class="content-line">
                <div class="input-box">
                    <input type="url" id="cmp-url-${i}" placeholder="URL або перетягніть файл...">
                </div>
                <button type="button" class="btn-icon ci-action" id="cmp-pick-${i}"
                    data-dz-pick data-tooltip="Вибрати файл" data-tooltip-always>
                    <span class="material-symbols-outlined">folder_open</span>
                </button>
            </div>
            <input type="file" id="cmp-file-${i}" accept="image/*" class="u-hidden">
        `;
        slot.classList.remove('has-image');
        setupSide(i);
    }
}

function setupAddSlot() {
    const btn = document.getElementById('cmp-add-slot');
    if (!btn) return;

    btn.addEventListener('click', () => {
        if (state.slotCount < MAX_SLOTS) {
            state.slotCount++;
        } else {
            state.images[2] = null;
            state.scales[2] = 100;
            state.slotCount = 2;
            renderSlot(2);
        }
        updateSlotCount();
    });
}

function updateSlotCount() {
    const photosArea = document.querySelector('#tab-compare .cmp-photos-area');
    const labelsArea = document.querySelector('#tab-compare .cmp-labels-area');
    if (photosArea) photosArea.dataset.slots = state.slotCount;
    if (labelsArea) labelsArea.dataset.slots = state.slotCount;

    // Показати/сховати 3-й слот
    const slot2 = document.getElementById('cmp-preview-2');
    const arrow1 = document.getElementById('cmp-arrow-1');
    const label2 = document.getElementById('cmp-label-2');
    const addBtn = document.getElementById('cmp-add-slot');

    if (state.slotCount === 3) {
        slot2?.classList.remove('u-hidden');
        arrow1?.classList.remove('u-hidden');
        label2?.classList.remove('u-hidden');
        if (addBtn) addBtn.querySelector('.material-symbols-outlined').textContent = 'remove';
    } else {
        slot2?.classList.add('u-hidden');
        arrow1?.classList.add('u-hidden');
        label2?.classList.add('u-hidden');
        if (addBtn) addBtn.querySelector('.material-symbols-outlined').textContent = 'add';
    }
}

function setupArrowToggle() {
    document.querySelectorAll('#tab-compare .cmp-arrow').forEach(arrow => {
        arrow.addEventListener('click', () => {
            state.showArrow = !state.showArrow;
            document.querySelectorAll('#tab-compare .cmp-arrow').forEach(a => {
                a.classList.toggle('cmp-arrow-off', !state.showArrow);
            });
        });
    });
}

/**
 * Генерує 1000x1000 порівняльне зображення
 */
function generateAndDownload() {
    const canvas = document.createElement('canvas');
    canvas.width = SIZE;
    canvas.height = SIZE;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, SIZE, SIZE);

    const title = document.getElementById('cmp-title')?.value || '';
    const footer = document.getElementById('cmp-footer')?.value || '';
    const labels = [];
    for (let i = 0; i < state.slotCount; i++) {
        labels.push(document.getElementById(`cmp-label-${i}`)?.value || '');
    }

    const FONT = 'Geologica, sans-serif';
    const n = state.slotCount;

    // === Заголовок: Y 0–275 ===
    ctx.fillStyle = '#000000';
    ctx.font = `400 50px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(title, SIZE / 2, 275 / 2);

    // === Фото зона: Y 275–725 ===
    const photoY = 275;
    const photoH = 450;
    const colW = SIZE / n;

    for (let i = 0; i < n; i++) {
        const x = colW * i;

        if (state.images[i]) {
            drawFitted(ctx, state.images[i], x, photoY, colW, photoH, state.scales[i] / 100);
        }

        // Стрілка між слотами
        if (state.showArrow && i < n - 1) {
            const arrowSize = 60;
            const arrowX = x + colW - arrowSize / 2;
            const arrowY2 = photoY + photoH / 2 - arrowSize / 2;
            const scale = arrowSize / 24;

            ctx.save();
            ctx.translate(arrowX, arrowY2);
            ctx.scale(scale, scale);
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 2;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.beginPath();
            ctx.moveTo(4, 12);
            ctx.lineTo(20, 12);
            ctx.moveTo(20, 12);
            ctx.lineTo(16, 8);
            ctx.moveTo(20, 12);
            ctx.lineTo(16, 16);
            ctx.stroke();
            ctx.restore();
        }
    }

    // === Підписи: Y 725–776 ===
    ctx.fillStyle = '#000000';
    ctx.font = `400 25px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let i = 0; i < n; i++) {
        ctx.fillText(labels[i], colW * i + colW / 2, 725 + 51 / 2);
    }

    // === Футер: Y 776–1000 ===
    ctx.font = `400 35px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    const footerY = 776;
    const footerH = 224;
    const lineH = 44;
    const maxW = 800;

    const words = footer.split(' ');
    const lines = [];
    let currentLine = '';

    for (const word of words) {
        const test = currentLine ? currentLine + ' ' + word : word;
        if (ctx.measureText(test).width > maxW) {
            lines.push(currentLine);
            currentLine = word;
        } else {
            currentLine = test;
        }
    }
    if (currentLine) lines.push(currentLine);

    const totalTextH = lines.length * lineH;
    const startY = footerY + (footerH - totalTextH) / 2;

    lines.forEach((line, i) => {
        ctx.fillText(line, SIZE / 2, startY + i * lineH);
    });

    const slug = slugify(title || 'compare');
    const a = document.createElement('a');
    a.href = canvas.toDataURL('image/jpeg', 0.95);
    a.download = `${slug}.jpg`;
    a.click();
}

function drawFitted(ctx, img, x, y, maxW, maxH, scale = 1) {
    const ratio = img.width / img.height;
    let w = maxW;
    let h = w / ratio;

    if (h > maxH) {
        h = maxH;
        w = h * ratio;
    }

    w *= scale;
    h *= scale;

    const dx = x + (maxW - w) / 2;
    const dy = y + (maxH - h) / 2;

    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, maxW, maxH);
    ctx.clip();
    ctx.drawImage(img, dx, dy, w, h);
    ctx.restore();
}

function setupSaveBtn() {
    const btn = document.getElementById('cmp-save-btn');
    if (!btn) return;
    btn.addEventListener('click', generateAndDownload);
}

registerAsideInitializer('aside-compare', () => {
    setupSaveBtn();
});

export function initCompare() {
    const slot = document.getElementById('cmp-preview-0');
    if (!slot) return;

    for (let i = 0; i < MAX_SLOTS; i++) {
        setupSide(i);
    }
    setupArrowToggle();
    setupAddSlot();
}
