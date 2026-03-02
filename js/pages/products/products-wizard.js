// js/pages/products/products-wizard.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║              PRODUCTS — WIZARD (Швидке створення товару)                ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * 4 кроки:
 *   1. Бренд + Лінійка + Категорія
 *   2. Назва UA/RU + Головне фото
 *   3. Перший варіант (SKU, назва, ціна)
 *   4. Підсумок → Створити
 *
 * Після створення — відкрити fullscreen модал для подальшого редагування.
 */

import { showModal, closeModal } from '../../components/modal/modal-main.js';
import { showToast } from '../../components/feedback/toast.js';
import { getBrands, loadBrands } from '../brands/brands-data.js';
import { getBrandLines } from '../brands/lines-data.js';
import { getCategories, loadCategories } from '../mapper/mapper-data-own.js';
import { populateSelect, reinitializeCustomSelect, initCustomSelects } from '../../components/forms/select.js';
import { addProduct } from './products-data.js';
import { addProductVariant } from './variants-data.js';
import { uploadProductPhotoFile } from '../../utils/api-client.js';
import { escapeHtml } from '../../utils/text-utils.js';
import { runHook } from './products-plugins.js';
import { buildShortName, buildFullName } from './products-crud.js';

// ═══════════════════════════════════════════════════════════════════════════
// STATE
// ═══════════════════════════════════════════════════════════════════════════

const TOTAL_STEPS = 4;
let _currentStep = 1;
let _uploadedPhotoUrl = '';

// ═══════════════════════════════════════════════════════════════════════════
// PUBLIC
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Показати wizard створення товару
 */
export async function showProductWizard() {
    _currentStep = 1;
    _uploadedPhotoUrl = '';

    await showModal('product-wizard', null);
    await populateWizardSelects();
    initWizardHandlers();
    showStep(1);
}

// ═══════════════════════════════════════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════════════════════════════════════

async function populateWizardSelects() {
    // Бренди
    let brands = getBrands();
    if (brands.length === 0) {
        await loadBrands();
        brands = getBrands();
    }
    brands.sort((a, b) => (a.name_uk || '').localeCompare(b.name_uk || '', 'uk'));
    populateSelect('wizard-brand',
        brands.map(b => ({ value: b.brand_id, text: b.name_uk || b.brand_id })),
        { placeholder: '— Оберіть бренд —' }
    );

    // Категорії
    let categories = getCategories();
    if (categories.length === 0) {
        await loadCategories();
        categories = getCategories();
    }
    categories.sort((a, b) => (a.name_ua || '').localeCompare(b.name_ua || '', 'uk'));
    populateSelect('wizard-category',
        categories.map(c => ({ value: c.id, text: c.name_ua || c.id })),
        { placeholder: '— Оберіть категорію —' }
    );

    // Init custom selects
    const body = document.getElementById('product-wizard-body');
    if (body) initCustomSelects(body);

    // Brand change → load lines
    const brandSelect = document.getElementById('wizard-brand');
    if (brandSelect) {
        brandSelect.addEventListener('change', () => {
            const lines = getBrandLines().filter(l => l.brand_id === brandSelect.value);
            lines.sort((a, b) => (a.name_uk || '').localeCompare(b.name_uk || '', 'uk'));
            populateSelect('wizard-line',
                lines.map(l => ({ value: l.line_id, text: l.name_uk || l.line_id })),
                { placeholder: '— Оберіть лінійку —' }
            );
            reinitializeCustomSelect(document.getElementById('wizard-line'));
        });
    }
}

function initWizardHandlers() {
    const prevBtn = document.getElementById('wizard-btn-prev');
    const nextBtn = document.getElementById('wizard-btn-next');
    const skipBtn = document.getElementById('wizard-btn-skip');
    const createBtn = document.getElementById('wizard-btn-create');

    if (prevBtn) prevBtn.onclick = () => goToStep(_currentStep - 1);
    if (nextBtn) nextBtn.onclick = () => goToStep(_currentStep + 1);
    if (skipBtn) skipBtn.onclick = () => goToStep(_currentStep + 1);
    if (createBtn) createBtn.onclick = () => handleCreateProduct();

    // Photo upload
    const uploadBtn = document.getElementById('btn-wizard-photo-upload');
    const fileInput = document.getElementById('wizard-photo-file');
    if (uploadBtn && fileInput) {
        uploadBtn.onclick = () => fileInput.click();
        fileInput.onchange = async () => {
            const file = fileInput.files?.[0];
            if (!file) return;
            await handleWizardPhotoUpload(file);
            fileInput.value = '';
        };
    }

    const removePhotoBtn = document.getElementById('btn-wizard-photo-remove');
    if (removePhotoBtn) {
        removePhotoBtn.onclick = () => {
            _uploadedPhotoUrl = '';
            const preview = document.getElementById('wizard-photo-preview');
            if (preview) preview.classList.add('u-hidden');
            const urlField = document.getElementById('wizard-photo-url');
            if (urlField) urlField.value = '';
        };
    }

    // Drag-and-drop
    const dropzone = document.getElementById('wizard-photo-dropzone');
    if (dropzone) {
        dropzone.addEventListener('dragover', (e) => { e.preventDefault(); e.stopPropagation(); });
        dropzone.addEventListener('drop', async (e) => {
            e.preventDefault();
            e.stopPropagation();
            const file = e.dataTransfer?.files?.[0];
            if (file && file.type.startsWith('image/')) {
                await handleWizardPhotoUpload(file);
            }
        });
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// STEP NAVIGATION
// ═══════════════════════════════════════════════════════════════════════════

function goToStep(step) {
    if (step < 1 || step > TOTAL_STEPS) return;

    // Валідація при переході вперед
    if (step > _currentStep && !validateStep(_currentStep)) return;

    _currentStep = step;
    showStep(step);
}

function showStep(step) {
    // Показати/сховати кроки
    for (let i = 1; i <= TOTAL_STEPS; i++) {
        const stepEl = document.getElementById(`wizard-step-${i}`);
        if (stepEl) {
            if (i === step) {
                stepEl.classList.remove('u-hidden');
            } else {
                stepEl.classList.add('u-hidden');
            }
        }
    }

    // Label
    const label = document.getElementById('wizard-step-label');
    if (label) label.textContent = `Крок ${step} / ${TOTAL_STEPS}`;

    // Buttons
    const prevBtn = document.getElementById('wizard-btn-prev');
    const nextBtn = document.getElementById('wizard-btn-next');
    const skipBtn = document.getElementById('wizard-btn-skip');
    const createBtn = document.getElementById('wizard-btn-create');

    if (prevBtn) {
        if (step === 1) {
            prevBtn.classList.add('u-hidden');
        } else {
            prevBtn.classList.remove('u-hidden');
        }
    }

    if (step === TOTAL_STEPS) {
        // Останній крок — показати "Створити"
        if (nextBtn) nextBtn.classList.add('u-hidden');
        if (skipBtn) skipBtn.classList.add('u-hidden');
        if (createBtn) createBtn.classList.remove('u-hidden');
        renderSummary();
    } else {
        if (nextBtn) nextBtn.classList.remove('u-hidden');
        if (createBtn) createBtn.classList.add('u-hidden');

        // Skip тільки для кроку 3 (варіант необов'язковий)
        if (skipBtn) {
            if (step === 3) {
                skipBtn.classList.remove('u-hidden');
            } else {
                skipBtn.classList.add('u-hidden');
            }
        }
    }
}

function validateStep(step) {
    switch (step) {
        case 1: {
            const brand = document.getElementById('wizard-brand')?.value;
            const category = document.getElementById('wizard-category')?.value;
            if (!brand) {
                showToast('Оберіть бренд', 'warning');
                return false;
            }
            if (!category) {
                showToast('Оберіть категорію', 'warning');
                return false;
            }
            return true;
        }
        case 2: {
            const nameUa = document.getElementById('wizard-name-ua')?.value.trim();
            if (!nameUa) {
                showToast('Введіть назву товару', 'warning');
                return false;
            }
            return true;
        }
        case 3:
            return true; // Варіант необов'язковий
        default:
            return true;
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// PHOTO UPLOAD
// ═══════════════════════════════════════════════════════════════════════════

async function handleWizardPhotoUpload(file) {
    const brandSelect = document.getElementById('wizard-brand');
    const brandName = brandSelect?.selectedOptions?.[0]?.textContent?.trim() || 'brand';
    const productName = document.getElementById('wizard-name-ua')?.value.trim() || 'product';

    try {
        const result = await uploadProductPhotoFile(file, brandName, productName, 1);
        if (result && result.thumbnailUrl) {
            _uploadedPhotoUrl = result.thumbnailUrl;

            const preview = document.getElementById('wizard-photo-preview');
            const previewImg = document.getElementById('wizard-photo-preview-img');
            const previewName = document.getElementById('wizard-photo-filename');

            if (preview) preview.classList.remove('u-hidden');
            if (previewImg) previewImg.src = result.thumbnailUrl;
            if (previewName) previewName.textContent = file.name;
        }
    } catch (error) {
        console.error('Wizard photo upload error:', error);
        showToast('Помилка завантаження фото', 'error');
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// SUMMARY
// ═══════════════════════════════════════════════════════════════════════════

function renderSummary() {
    const container = document.getElementById('wizard-summary');
    if (!container) return;

    const brandSelect = document.getElementById('wizard-brand');
    const lineSelect = document.getElementById('wizard-line');
    const categorySelect = document.getElementById('wizard-category');

    const brandName = brandSelect?.selectedOptions?.[0]?.textContent || '—';
    const lineName = lineSelect?.value ? (lineSelect.selectedOptions?.[0]?.textContent || '—') : '—';
    const categoryName = categorySelect?.selectedOptions?.[0]?.textContent || '—';
    const nameUa = document.getElementById('wizard-name-ua')?.value.trim() || '';
    const nameRu = document.getElementById('wizard-name-ru')?.value.trim() || '';
    const variantName = document.getElementById('wizard-variant-name')?.value.trim() || '';
    const variantSku = document.getElementById('wizard-variant-sku')?.value.trim() || '';
    const variantPrice = document.getElementById('wizard-variant-price')?.value.trim() || '';

    let html = `
        <div class="grid">
            <div class="group column col-6">
                <label class="label-l">Товар</label>
                <div class="content-bloc-container">
                    <div class="content-bloc">
                        <div class="content-line">
                            <div class="content-line-info">
                                <span class="content-line-name">${escapeHtml(nameUa)}</span>
                                ${nameRu ? `<span class="content-line-label">${escapeHtml(nameRu)}</span>` : ''}
                            </div>
                        </div>
                    </div>
                    <div class="content-bloc">
                        <div class="content-line">
                            <div class="content-line-info">
                                <span class="content-line-label">Бренд: ${escapeHtml(brandName)}</span>
                                ${lineName !== '—' ? `<span class="content-line-label">Лінійка: ${escapeHtml(lineName)}</span>` : ''}
                                <span class="content-line-label">Категорія: ${escapeHtml(categoryName)}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
    `;

    if (variantName || variantSku) {
        html += `
            <div class="group column col-6">
                <label class="label-l">Перший варіант</label>
                <div class="content-bloc">
                    <div class="content-line">
                        <div class="content-line-info">
                            ${variantName ? `<span class="content-line-name">${escapeHtml(variantName)}</span>` : ''}
                            ${variantSku ? `<span class="content-line-label">SKU: ${escapeHtml(variantSku)}</span>` : ''}
                            ${variantPrice ? `<span class="content-line-label">Ціна: ${escapeHtml(variantPrice)} грн</span>` : ''}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    if (_uploadedPhotoUrl) {
        html += `
            <div class="group column col-6">
                <label class="label-l">Фото</label>
                <div class="content-bloc">
                    <div class="content-line">
                        <div class="content-line-photo">
                            <img src="${escapeHtml(_uploadedPhotoUrl)}" alt="Фото" show>
                        </div>
                        <div class="content-line-info">
                            <span class="content-line-label">Головне фото завантажено</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    html += '</div>';
    container.innerHTML = html;
}

// ═══════════════════════════════════════════════════════════════════════════
// CREATE
// ═══════════════════════════════════════════════════════════════════════════

async function handleCreateProduct() {
    const createBtn = document.getElementById('wizard-btn-create');
    if (createBtn) createBtn.disabled = true;

    try {
        const brandId = document.getElementById('wizard-brand')?.value || '';
        const lineId = document.getElementById('wizard-line')?.value || '';
        const categoryId = document.getElementById('wizard-category')?.value || '';
        const nameUa = document.getElementById('wizard-name-ua')?.value.trim() || '';
        const nameRu = document.getElementById('wizard-name-ru')?.value.trim() || '';

        // Фото URL
        const imageUrl = _uploadedPhotoUrl
            ? JSON.stringify([_uploadedPhotoUrl])
            : (document.getElementById('wizard-photo-url')?.value.trim() || '');

        // Обчислити згенеровані назви
        const brandSelect = document.getElementById('wizard-brand');
        const lineSelect = document.getElementById('wizard-line');
        const categorySelect = document.getElementById('wizard-category');
        const brandText = brandSelect?.selectedOptions?.[0]?.textContent?.trim() || '';
        const lineText = lineSelect?.value ? (lineSelect.selectedOptions?.[0]?.textContent?.trim() || '') : '';
        const catText = categorySelect?.selectedOptions?.[0]?.textContent?.trim() || '';
        const brandPart = (brandText && !brandText.startsWith('—')) ? brandText : '';
        const linePart = (lineText && !lineText.startsWith('—')) ? lineText : '';

        const shortUa = buildShortName(brandPart, linePart, nameUa, '', '', '');
        const shortRu = buildShortName(brandPart, linePart, nameRu, '', '', '');
        // Wizard не має text_before → fallback на категорію
        const prefixUa = catText && !catText.startsWith('—') ? catText : '';
        const fullUa = buildFullName(prefixUa, shortUa, '');
        const fullRu = buildFullName(prefixUa, shortRu, '');

        // Створити товар
        const productData = {
            name_ua: nameUa,
            name_ru: nameRu,
            brand_id: brandId,
            line_id: lineId,
            category_id: categoryId,
            generated_short_ua: shortUa,
            generated_short_ru: shortRu,
            generated_full_ua: fullUa,
            generated_full_ru: fullRu,
            image_url: imageUrl,
            status: 'draft',
        };

        const newProduct = await addProduct(productData);

        if (!newProduct?.product_id) {
            showToast('Помилка створення товару', 'error');
            return;
        }

        // Створити перший варіант (якщо заповнений)
        const variantName = document.getElementById('wizard-variant-name')?.value.trim();
        const variantSku = document.getElementById('wizard-variant-sku')?.value.trim();
        const variantPrice = document.getElementById('wizard-variant-price')?.value.trim();

        if (variantName || variantSku) {
            await addProductVariant({
                product_id: newProduct.product_id,
                name_ua: variantName || nameUa,
                sku: variantSku || '',
                price: variantPrice || '',
                status: 'active',
            });
        }

        closeModal();
        showToast('Товар створено', 'success');
        runHook('onProductAdd', newProduct);
        runHook('onRender');

        // Відкрити fullscreen модал для подальшого редагування
        const { showEditProductModal } = await import('./products-crud.js');
        await showEditProductModal(newProduct.product_id);

        // Автозаповнення характеристик (бренд вже обраний, поля порожні)
        try {
            const { runAutofillAfterRender } = await import('./products-crud-autofill.js');
            runAutofillAfterRender();
        } catch { /* ignore */ }

    } catch (error) {
        console.error('Wizard create error:', error);
        showToast('Помилка створення товару', 'error');
    } finally {
        if (createBtn) createBtn.disabled = false;
    }
}
