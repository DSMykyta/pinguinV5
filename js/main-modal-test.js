// js/main-modal-test.js

/*
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                       MAIN — MODAL TEST PAGE                            ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Тестова сторінка: всі модалі проекту з фейковими даними               ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

import { initCore } from './main-core.js';
import {
    showModal,
    showConfirmModal,
    showDeleteConfirm,
    showResetConfirm,
    showCloseConfirm,
} from './components/modal/modal-main.js';

document.addEventListener('DOMContentLoaded', async () => {
    await initCore();
    initModalTestButtons();
    initFakeDataFillers();
});

// ── Кнопки для JS-генерованих модалів (confirm/delete/reset/close) ──

function initModalTestButtons() {
    document.getElementById('btn-test-confirm')?.addEventListener('click', async () => {
        const result = await showConfirmModal({
            title: 'Підтвердити дію?',
            message: 'Ви збираєтесь змінити статус <span class="tag c-red">12</span> товарів на "Активний". Продовжити?',
            confirmText: 'Так, змінити',
            cancelText: 'Скасувати',
        });
        console.log('[test] showConfirmModal result:', result);
    });

    document.getElementById('btn-test-delete-confirm')?.addEventListener('click', async () => {
        const result = await showDeleteConfirm({
            itemName: 'Optimum Nutrition',
        });
        console.log('[test] showDeleteConfirm result:', result);
    });

    document.getElementById('btn-test-reset-confirm')?.addEventListener('click', async () => {
        const result = await showResetConfirm();
        console.log('[test] showResetConfirm result:', result);
    });

    document.getElementById('btn-test-close-confirm')?.addEventListener('click', async () => {
        const result = await showCloseConfirm();
        console.log('[test] showCloseConfirm result:', result);
    });

    // ── Brands ──

    document.getElementById('btn-test-delete-brand')?.addEventListener('click', async () => {
        const r = await showConfirmModal({
            title: 'Видалити бренд?',
            message: 'Ви впевнені, що хочете видалити бренд "Optimum Nutrition"?',
            confirmText: 'Видалити',
            cancelText: 'Скасувати',
            details: [
                '3 лінійки буде видалено',
                '2 посилання буде видалено',
                '1 прив\'язка до МП буде видалено',
            ],
        });
        console.log('[test] delete brand:', r);
    });

    document.getElementById('btn-test-unlink-line')?.addEventListener('click', async () => {
        const r = await showConfirmModal({
            title: 'Відв\'язати лінійку?',
            message: 'Ви впевнені, що хочете відв\'язати лінійку "Gold Standard 100% Whey" від цього бренду?',
            confirmText: 'Відв\'язати',
            cancelText: 'Скасувати',
        });
        console.log('[test] unlink line:', r);
    });

    document.getElementById('btn-test-delete-link')?.addEventListener('click', async () => {
        const r = await showConfirmModal({
            title: 'Видалити посилання?',
            message: 'Ви впевнені, що хочете видалити "optimumnutrition.com"?',
            confirmText: 'Видалити',
            cancelText: 'Скасувати',
        });
        console.log('[test] delete link:', r);
    });

    document.getElementById('btn-test-replace-logo')?.addEventListener('click', async () => {
        const r = await showConfirmModal({
            title: 'Замінити логотип?',
            message: 'Поточний логотип буде замінено новим.',
            confirmText: 'Так',
            cancelText: 'Скасувати',
        });
        console.log('[test] replace logo:', r);
    });

    document.getElementById('btn-test-delete-line')?.addEventListener('click', async () => {
        const r = await showConfirmModal({
            title: 'Видалити лінійку?',
            message: 'Ви впевнені, що хочете видалити лінійку "Gold Standard 100% Whey"?',
            confirmText: 'Видалити',
            cancelText: 'Скасувати',
        });
        console.log('[test] delete line:', r);
    });

    // ── Keywords ──

    document.getElementById('btn-test-delete-keyword')?.addEventListener('click', async () => {
        const r = await showConfirmModal({
            title: 'Видалити ключове слово?',
            message: 'Ви впевнені, що хочете видалити "Протеїн"?',
            confirmText: 'Видалити',
            cancelText: 'Скасувати',
        });
        console.log('[test] delete keyword:', r);
    });

    // ── Mapper: Categories ──

    document.getElementById('btn-test-delete-category')?.addEventListener('click', async () => {
        const r = await showConfirmModal({
            title: 'Видалити категорію?',
            message: 'Ви впевнені, що хочете видалити категорію "Спортивне харчування"?',
            confirmText: 'Видалити',
            cancelText: 'Скасувати',
            details: [
                '3 прив\'язок до МП буде видалено',
                '5 характеристик буде відв\'язано',
            ],
        });
        console.log('[test] delete category:', r);
    });

    document.getElementById('btn-test-unlink-char-from-cat')?.addEventListener('click', async () => {
        const r = await showConfirmModal({
            title: 'Відв\'язати характеристику?',
            message: 'Ви впевнені, що хочете відв\'язати характеристику "Вага нетто" від цієї категорії?',
            confirmText: 'Відв\'язати',
            cancelText: 'Скасувати',
        });
        console.log('[test] unlink char from cat:', r);
    });

    document.getElementById('btn-test-unmap-category')?.addEventListener('click', async () => {
        const r = await showConfirmModal({
            title: 'Відв\'язати категорію',
            message: 'Зняти прив\'язку з маркетплейсу?',
        });
        console.log('[test] unmap category:', r);
    });

    // ── Mapper: Characteristics ──

    document.getElementById('btn-test-delete-characteristic')?.addEventListener('click', async () => {
        const r = await showConfirmModal({
            title: 'Видалити характеристику?',
            message: 'Ви впевнені, що хочете видалити характеристику "Вага нетто"?',
            confirmText: 'Видалити',
            cancelText: 'Скасувати',
            details: [
                '2 прив\'язок до МП буде видалено',
                '8 опцій буде відв\'язано',
            ],
        });
        console.log('[test] delete characteristic:', r);
    });

    document.getElementById('btn-test-unlink-opt-from-char')?.addEventListener('click', async () => {
        const r = await showConfirmModal({
            title: 'Відв\'язати опцію?',
            message: 'Ви впевнені, що хочете відв\'язати опцію "Шоколад" від цієї характеристики?',
            confirmText: 'Відв\'язати',
            cancelText: 'Скасувати',
        });
        console.log('[test] unlink opt from char:', r);
    });

    document.getElementById('btn-test-unmap-characteristic')?.addEventListener('click', async () => {
        const r = await showConfirmModal({
            title: 'Відв\'язати характеристику',
            message: 'Зняти прив\'язку з маркетплейсу?',
        });
        console.log('[test] unmap characteristic:', r);
    });

    // ── Mapper: Options ──

    document.getElementById('btn-test-delete-option')?.addEventListener('click', async () => {
        const r = await showConfirmModal({
            title: 'Видалити опцію?',
            message: 'Ви впевнені, що хочете видалити опцію "Шоколад"?',
            confirmText: 'Видалити',
            cancelText: 'Скасувати',
            details: [
                '1 прив\'язка до МП буде видалено',
                '3 дочірніх опцій буде відв\'язано',
            ],
        });
        console.log('[test] delete option:', r);
    });

    document.getElementById('btn-test-unlink-child-option')?.addEventListener('click', async () => {
        const r = await showConfirmModal({
            title: 'Відв\'язати дочірню опцію?',
            message: 'Ви впевнені, що хочете відв\'язати опцію "Молочний шоколад" від батьківської?',
            confirmText: 'Відв\'язати',
            cancelText: 'Скасувати',
        });
        console.log('[test] unlink child option:', r);
    });

    document.getElementById('btn-test-unmap-option')?.addEventListener('click', async () => {
        const r = await showConfirmModal({
            title: 'Відв\'язати опцію',
            message: 'Зняти прив\'язку з маркетплейсу?',
        });
        console.log('[test] unmap option:', r);
    });

    // ── Mapper: Marketplaces ──

    document.getElementById('btn-test-delete-marketplace')?.addEventListener('click', async () => {
        const r = await showConfirmModal({
            title: 'Видалити маркетплейс?',
            message: 'Ви впевнені, що хочете видалити маркетплейс "Rozetka"?',
            confirmText: 'Видалити',
            cancelText: 'Скасувати',
            details: [
                '1247 категорій МП',
                '856 характеристик МП',
                '12430 опцій МП',
                '342 прив\'язок буде видалено',
            ],
        });
        console.log('[test] delete marketplace:', r);
    });

    document.getElementById('btn-test-delete-mp-refs-all')?.addEventListener('click', async () => {
        const r = await showConfirmModal({
            title: 'Видалити довідники?',
            message: 'Всі довідники маркетплейсу "Rozetka" буде видалено.',
            confirmText: 'Видалити',
            cancelText: 'Скасувати',
        });
        console.log('[test] delete mp refs all:', r);
    });

    document.getElementById('btn-test-delete-mp-ref')?.addEventListener('click', async () => {
        const r = await showConfirmModal({
            title: 'Видалити довідник?',
            message: 'Довідник "Категорії" маркетплейсу "Rozetka" буде видалено.',
            confirmText: 'Видалити',
            cancelText: 'Скасувати',
        });
        console.log('[test] delete mp ref:', r);
    });

    document.getElementById('btn-test-confirm-map')?.addEventListener('click', async () => {
        const r = await showConfirmModal({
            title: 'Замапити?',
            message: 'Прив\'язати "Спортивне харчування" → "Rozetka: Спортивне харчування"?',
            confirmText: 'Замапити',
            cancelText: 'Скасувати',
        });
        console.log('[test] confirm map:', r);
    });

    // ── Banned Words ──

    document.getElementById('btn-test-close-tab-banned')?.addEventListener('click', async () => {
        const r = await showConfirmModal({
            title: 'Закрити таб?',
            message: 'Таб буде закрито. Продовжити?',
            confirmText: 'Закрити',
            cancelText: 'Скасувати',
        });
        console.log('[test] close tab banned:', r);
    });

    // ── Price ──

    document.getElementById('btn-test-confirm-price-import')?.addEventListener('click', async () => {
        const r = await showConfirmModal({
            title: 'Імпорт прайсу',
            message: 'Імпортувати прайс-лист? Існуючі дані буде оновлено.',
            confirmText: 'Імпортувати',
            cancelText: 'Скасувати',
        });
        console.log('[test] price import:', r);
    });

    // ── Layout ──

    document.getElementById('btn-test-close-tab-layout')?.addEventListener('click', async () => {
        const r = await showConfirmModal({
            title: 'Закрити таб?',
            message: 'Незбережені зміни буде втрачено.',
            confirmText: 'Закрити',
            cancelText: 'Залишити',
            avatarState: 'confirmClose',
        });
        console.log('[test] close tab layout:', r);
    });
}

// ── Заповнення фейковими даними після відкриття модалу ──

function initFakeDataFillers() {
    document.addEventListener('modal-opened', (e) => {
        const { modalId, modalElement } = e.detail;
        if (!modalElement) return;

        // Невелика затримка щоб DOM встиг оновитись
        requestAnimationFrame(() => {
            const filler = FAKE_DATA_FILLERS[modalId];
            if (filler) filler(modalElement);
        });
    });
}

// ── Фейкові дані для кожного модалу ──

const FAKE_DATA_FILLERS = {

    // ─── BRANDS ───

    'brand-edit': (el) => {
        setText(el, '#brand-modal-title', 'Optimum Nutrition');
        setValue(el, '#brand-id', 'bran-A1B2C3');
        setValue(el, '#brand-name-uk', 'Optimum Nutrition');

        // Status badge
        const dot = el.querySelector('#brand-status-badge');
        if (dot) { dot.className = 'dot c-green'; dot.title = 'Активний'; }

        // Status switch
        const activeRadio = el.querySelector('#brand-status-yes');
        if (activeRadio) activeRadio.checked = true;

        // Country — add option and select
        const countrySelect = el.querySelector('#brand-country');
        if (countrySelect) {
            countrySelect.innerHTML = `
                <option value="">— Оберіть країну —</option>
                <option value="US" selected>США</option>
                <option value="DE">Німеччина</option>
                <option value="UA">Україна</option>
            `;
        }

        // Alt names
        const altContainer = el.querySelector('#brand-names-alt-container');
        if (altContainer) {
            altContainer.innerHTML = `
                <div class="content-bloc">
                    <div class="content-line">
                        <div class="input-box">
                            <input type="text" value="ON">
                        </div>
                    </div>
                </div>
                <div class="content-bloc">
                    <div class="content-line">
                        <div class="input-box">
                            <input type="text" value="Оптимум Нутрішн">
                        </div>
                    </div>
                </div>
            `;
        }

        // Logo URL
        setValue(el, '#brand-logo-url', 'https://example.com/logos/on-logo.png');
        setValue(el, '#brand-logo-url-field', 'https://example.com/logos/on-logo.png');

        // Show delete button
        const deleteBtn = el.querySelector('#btn-delete-brand');
        if (deleteBtn) deleteBtn.classList.remove('u-hidden');

        // Links section
        const linksContainer = el.querySelector('#brand-links-container');
        if (linksContainer) {
            linksContainer.innerHTML = `
                <div class="content-bloc">
                    <div class="content-line">
                        <div class="input-box">
                            <input type="url" value="https://www.optimumnutrition.com">
                        </div>
                    </div>
                </div>
                <div class="content-bloc">
                    <div class="content-line">
                        <div class="input-box">
                            <input type="url" value="https://www.instagram.com/optimumnutrition">
                        </div>
                    </div>
                </div>
            `;
        }
    },

    'line-edit': (el) => {
        setText(el, '#line-modal-title', 'Gold Standard 100% Whey');
        setValue(el, '#line-id', 'line-X1Y2Z3');
        setValue(el, '#line-name-uk', 'Gold Standard 100% Whey');
        setValue(el, '#line-logo-url', 'https://example.com/logos/gs-whey.png');

        const brandSelect = el.querySelector('#line-brand-id');
        if (brandSelect) {
            brandSelect.innerHTML = `
                <option value="">-- Оберіть бренд --</option>
                <option value="bran-A1B2C3" selected>Optimum Nutrition</option>
                <option value="bran-D4E5F6">MuscleTech</option>
                <option value="bran-G7H8I9">BSN</option>
            `;
        }

        const deleteBtn = el.querySelector('#delete-line');
        if (deleteBtn) deleteBtn.classList.remove('u-hidden');
    },

    // ─── BANNED WORDS ───

    'banned-word-edit': (el) => {
        setText(el, '#modal-title', 'Редагування: "лікує"');
        setValue(el, '#banned-word-local-id', 'ban-M1N2O3');
        setValue(el, '#banned-word-group-name', 'Медичні твердження');
        setValue(el, '#banned-word-severity', 'high');
        setValue(el, '#banned-word-name-uk', 'лікує, вилікує, зцілює');
        setValue(el, '#banned-word-name-ru', 'лечит, вылечит, исцеляет');
        setValue(el, '#banned-word-explaine', 'Заборонено використовувати медичні твердження для харчових добавок згідно з законодавством.');
        setValue(el, '#banned-word-hint', 'Використовуйте: "сприяє", "підтримує", "допомагає підтримувати"');

        const typeSelect = el.querySelector('#banned-word-type');
        if (typeSelect) {
            typeSelect.innerHTML = `
                <option value="">-- Оберіть тип --</option>
                <option value="medical" selected>Медичне твердження</option>
                <option value="prohibited">Заборонене слово</option>
                <option value="slang">Сленг</option>
            `;
        }

        // Badge — checked
        const badge = el.querySelector('#banned-word-checked-badge');
        if (badge) {
            badge.className = 'badge c-green clickable';
            badge.dataset.status = 'TRUE';
            badge.innerHTML = `
                <span class="material-symbols-outlined" style="font-size: 16px;">check_circle</span>
                <span>Так</span>
            `;
        }

        // Severity icon
        const severityIcon = el.querySelector('#severity-trigger-icon');
        if (severityIcon) severityIcon.textContent = 'brightness_alert';
    },

    'banned-words-list-modal': (el) => {
        // Just set empty state, table would need JS init
        const container = el.querySelector('#modal-banned-words-table-container');
        if (container) {
            container.innerHTML = `
                <div style="padding:24px; text-align:center; color:var(--color-on-surface-v);">
                    Таблиця заборонених слів (потребує initManagedTable)
                </div>
            `;
        }
    },

    'product-text-view': (el) => {
        setText(el, '#product-modal-title', 'Протеїн Gold Standard 100% Whey Chocolate 2.27 кг');
        setText(el, '#product-modal-id', 'ID: PROD-2024-0042');
        setValue(el, '#product-modal-product-id', 'PROD-2024-0042');

        const badge = el.querySelector('#product-modal-status-badge');
        if (badge) {
            badge.className = 'badge c-green clickable';
            badge.innerHTML = `
                <span class="material-symbols-outlined" style="font-size: 16px;">check_circle</span>
                <span>Так</span>
            `;
        }

        // Field pills
        const fieldPills = el.querySelector('#product-text-field-pills');
        if (fieldPills) {
            fieldPills.innerHTML = `
                <button class="chip active">Опис</button>
                <button class="chip">Характеристики</button>
                <button class="chip">Склад</button>
            `;
        }

        // Content
        const content = el.querySelector('.product-text-content');
        if (content) {
            content.innerHTML = `
                <div class="rich-editor-content" style="padding:16px;">
                    <p><strong>Gold Standard 100% Whey</strong> від Optimum Nutrition — це преміальний сироватковий протеїн, який містить 24 г білка на порцію.</p>
                    <p>Збагачений <mark class="highlight-banned">BCAA</mark> та глютаміном для максимального відновлення після тренувань.</p>
                    <p>Цей продукт <mark class="highlight-banned">лікує</mark> втому та допомагає наростити м'язову масу.</p>
                </div>
            `;
        }
    },

    // ─── KEYWORDS ───

    'keywords-edit': (el) => {
        setText(el, '#keyword-modal-title', 'Протеїн');
        setValue(el, '#keyword-local-id', 'glo-K1L2M3');
        setValue(el, '#keyword-name-uk', 'Протеїн');
        setValue(el, '#keyword-name-ru', 'Протеин');
        setValue(el, '#keyword-name-en', 'Protein');
        setValue(el, '#keyword-name-lat', 'Proteinum');
        setValue(el, '#keyword-name-alt', 'Білок, Whey, Сироватковий протеїн, Казеїн');
        setValue(el, '#keyword-trigers', 'протеїн, protein, whey, казеїн, casein');
        setValue(el, '#keyword-keywords-ua', 'протеїн, сироватковий, казеїновий, ізолят, концентрат, гідролізат');
        setValue(el, '#keyword-keywords-ru', 'протеин, сывороточный, казеиновый, изолят, концентрат, гидролизат');

        // Param type
        const paramType = el.querySelector('#keyword-param-type-select');
        if (paramType) {
            const opt = paramType.querySelector('option[value="category"]');
            if (opt) opt.selected = true;
        }

        // Show delete button
        const deleteBtn = el.querySelector('#delete-keyword');
        if (deleteBtn) deleteBtn.classList.remove('u-hidden');
    },

    // ─── MAPPER ───

    'mapper-category-edit': (el) => {
        setText(el, '#category-modal-title', 'Спортивне харчування');

        const dot = el.querySelector('#category-grouping-dot');
        if (dot) { dot.className = 'dot c-green'; dot.title = 'Товарна'; }

        const parentSelect = el.querySelector('#mapper-category-parent');
        if (parentSelect) {
            parentSelect.innerHTML = `
                <option value="">— Без батьківської —</option>
                <option value="cat-ROOT1">Здоров'я та спорт</option>
                <option value="cat-ROOT2" selected>Харчові добавки</option>
            `;
        }

        setValue(el, '#mapper-category-name-ua', 'Спортивне харчування');
        setValue(el, '#mapper-category-name-ru', 'Спортивное питание');

        const deleteBtn = el.querySelector('#delete-mapper-category');
        if (deleteBtn) deleteBtn.classList.remove('u-hidden');
    },

    'mapper-characteristic-edit': (el) => {
        setText(el, '#char-modal-title', 'Вага нетто');

        const dot = el.querySelector('#char-global-dot');
        if (dot) { dot.className = 'dot c-green'; dot.title = 'Глобальна'; }

        const globalSwitch = el.querySelector('#mapper-char-global-yes');
        if (globalSwitch) globalSwitch.checked = true;

        setValue(el, '#mapper-char-name-ua', 'Вага нетто');
        setValue(el, '#mapper-char-name-ru', 'Вес нетто');
        setValue(el, '#mapper-char-hint', 'Вказуйте вагу у грамах або кілограмах');
        setValue(el, '#mapper-char-unit', 'г');
        setValue(el, '#mapper-char-sort-order', '5');

        // Block select
        const blockSelect = el.querySelector('#mapper-char-block');
        if (blockSelect) {
            const opt = blockSelect.querySelector('option[value="1"]');
            if (opt) opt.selected = true;
        }

        // Type select
        const typeSelect = el.querySelector('#mapper-char-type');
        if (typeSelect) {
            const opt = typeSelect.querySelector('option[value="Decimal"]');
            if (opt) opt.selected = true;
        }

        const deleteBtn = el.querySelector('#delete-mapper-characteristic');
        if (deleteBtn) deleteBtn.classList.remove('u-hidden');
    },

    'mapper-option-edit': (el) => {
        setText(el, '#option-modal-title', 'Шоколад');

        const charSelect = el.querySelector('#mapper-option-char');
        if (charSelect) {
            charSelect.innerHTML = `
                <option value="">-- Оберіть характеристику --</option>
                <option value="char-001" selected>Смак</option>
                <option value="char-002">Колір</option>
                <option value="char-003">Розмір</option>
            `;
        }

        const parentSelect = el.querySelector('#mapper-option-parent');
        if (parentSelect) {
            parentSelect.innerHTML = `
                <option value="" selected>— Без батьківської опції —</option>
                <option value="opt-P1">Солодкий</option>
            `;
        }

        setValue(el, '#mapper-option-value-ua', 'Шоколад');
        setValue(el, '#mapper-option-value-ru', 'Шоколад');
        setValue(el, '#mapper-option-order', '3');

        const deleteBtn = el.querySelector('#delete-mapper-option');
        if (deleteBtn) deleteBtn.classList.remove('u-hidden');
    },

    'mapper-marketplace-edit': (el) => {
        setText(el, '#modal-title', 'Редагування: Rozetka');
        setValue(el, '#mapper-mp-name', 'Rozetka');
        setValue(el, '#mapper-mp-slug', 'rozetka');

        // Active switch
        const activeRadio = el.querySelector('#mapper-mp-active-yes');
        if (activeRadio) activeRadio.checked = true;

        // Normalization fields
        setValue(el, '#mapper-mp-cm-cat-name', 'nameUa');
        setValue(el, '#mapper-mp-cm-cat-parent', 'parentId');
        setValue(el, '#mapper-mp-cm-char-name', 'title');
        setValue(el, '#mapper-mp-cm-char-type', 'type');
        setValue(el, '#mapper-mp-cm-opt-name', 'name_uk');
        setValue(el, '#mapper-mp-cm-opt-char-id', 'characteristicId');
        setValue(el, '#mapper-mp-cm-opt-char-name', 'characteristicTitle');
    },

    'mapper-mp-data': (el) => {
        setText(el, '#mp-data-modal-title', 'Rozetka');

        const dot = el.querySelector('#mp-data-status-dot');
        if (dot) { dot.className = 'dot c-green'; dot.title = 'Активний'; }

        setValue(el, '#mapper-mp-name', 'Rozetka');
        setValue(el, '#mapper-mp-slug', 'rozetka');

        // Counts
        setText(el, '#mp-data-ref-count', '3');
        setText(el, '#mp-data-cat-count', '1247');
        setText(el, '#mp-data-char-count', '856');
        setText(el, '#mp-data-opt-count', '12430');
        setText(el, '#mp-data-cat-stats', 'Показано 50 з 1247');

        // Normalization
        setValue(el, '#mapper-mp-cm-cat-name', 'nameUa');
        setValue(el, '#mapper-mp-cm-cat-parent', 'parentId');
        setValue(el, '#mapper-mp-cm-char-name', 'title');
        setValue(el, '#mapper-mp-cm-char-type', 'type');
        setValue(el, '#mapper-mp-cm-opt-name', 'name_uk');
        setValue(el, '#mapper-mp-cm-opt-char-id', 'characteristicId');
        setValue(el, '#mapper-mp-cm-opt-char-name', 'characteristicTitle');
    },

    'mapper-import': (el) => {
        const mpSelect = el.querySelector('#mapper-import-marketplace');
        if (mpSelect) {
            mpSelect.innerHTML = `
                <option value="">— Оберіть маркетплейс —</option>
                <option value="mp-rozetka" selected>Rozetka</option>
                <option value="mp-prom">Prom.ua</option>
                <option value="mp-hotline">Hotline</option>
            `;
        }

        // Show file input
        const fileGroup = el.querySelector('#import-file-group');
        if (fileGroup) fileGroup.classList.remove('u-hidden');

        const filenameEl = el.querySelector('#mapper-import-filename');
        if (filenameEl) filenameEl.textContent = 'rozetka_categories_2024.xlsx';

        const importBtn = el.querySelector('#execute-mapper-import');
        if (importBtn) importBtn.disabled = false;
    },

    'mapper-import-wizard': (el) => {
        const wizardContent = el.querySelector('#wizard-content');
        if (wizardContent) {
            wizardContent.innerHTML = `
                <div style="padding:16px;">
                    <h3 style="margin-bottom:12px;">Крок 1: Вибір типу імпорту</h3>
                    <p class="body-m" style="margin-bottom:16px;">Оберіть тип даних для імпорту як власний довідник:</p>
                    <div style="display:flex; gap:12px;">
                        <div class="content-bloc" style="flex:1; padding:16px; cursor:pointer; border:2px solid var(--color-primary);">
                            <strong>Категорії</strong>
                            <p class="body-s">1247 категорій від Rozetka</p>
                        </div>
                        <div class="content-bloc" style="flex:1; padding:16px; cursor:pointer;">
                            <strong>Характеристики</strong>
                            <p class="body-s">856 характеристик від Rozetka</p>
                        </div>
                        <div class="content-bloc" style="flex:1; padding:16px; cursor:pointer;">
                            <strong>Опції</strong>
                            <p class="body-s">12430 опцій від Rozetka</p>
                        </div>
                    </div>
                </div>
            `;
        }

        const wizardButtons = el.querySelector('.wizard-buttons');
        if (wizardButtons) {
            wizardButtons.innerHTML = `
                <button class="btn-secondary" disabled>Назад</button>
                <button class="btn-primary">Далі</button>
            `;
        }
    },

    'mapper-mapping-wizard': (el) => {
        setText(el, '#mapping-wizard-title', 'Маппінг категорій → Rozetka');
        setText(el, '#mapping-wizard-progress', '3 / 47');

        const body = el.querySelector('#mapping-wizard-body');
        if (body) {
            body.innerHTML = `
                <div style="padding:16px;">
                    <div class="content-bloc" style="padding:16px; margin-bottom:16px;">
                        <div style="display:flex; align-items:center; gap:12px; margin-bottom:12px;">
                            <span class="badge c-blue">Власна</span>
                            <strong style="font-size:16px;">Спортивне харчування</strong>
                        </div>
                        <p class="body-s" style="color:var(--color-on-surface-v)">Батьківська: Харчові добавки</p>
                    </div>

                    <p class="body-m" style="margin-bottom:12px;">Оберіть відповідну категорію Rozetka:</p>

                    <div style="display:flex; flex-direction:column; gap:8px;">
                        <label class="content-bloc" style="padding:12px; cursor:pointer; display:flex; align-items:center; gap:12px; border:2px solid var(--color-primary);">
                            <input type="radio" name="mapping" checked>
                            <div>
                                <strong>Спортивне харчування</strong>
                                <p class="body-s">ID: 4626174 → Спорт та відпочинок → Спортивне харчування</p>
                            </div>
                            <span class="badge c-green" style="margin-left:auto;">98%</span>
                        </label>
                        <label class="content-bloc" style="padding:12px; cursor:pointer; display:flex; align-items:center; gap:12px;">
                            <input type="radio" name="mapping">
                            <div>
                                <strong>Спортивні добавки</strong>
                                <p class="body-s">ID: 4626189 → Спорт → Добавки</p>
                            </div>
                            <span class="badge c-yellow" style="margin-left:auto;">72%</span>
                        </label>
                        <label class="content-bloc" style="padding:12px; cursor:pointer; display:flex; align-items:center; gap:12px;">
                            <input type="radio" name="mapping">
                            <div>
                                <strong>Харчові добавки</strong>
                                <p class="body-s">ID: 4630112 → Здоров'я → Добавки</p>
                            </div>
                            <span class="badge c-red" style="margin-left:auto;">45%</span>
                        </label>
                    </div>
                </div>
            `;
        }
    },

    'mapper-bindings': (el) => {
        setText(el, '#bindings-modal-title', 'Прив\'язки: Спортивне харчування');

        const rows = el.querySelector('#bindings-modal-rows');
        if (rows) {
            rows.innerHTML = `
                <div class="bindings-row" style="display:flex; align-items:center; gap:12px; padding:12px; border-bottom:1px solid var(--color-outline-v);">
                    <span class="badge c-blue">Rozetka</span>
                    <span>→</span>
                    <strong>Спортивне харчування</strong>
                    <span class="body-s" style="color:var(--color-on-surface-v); margin-left:auto;">ID: 4626174</span>
                </div>
                <div class="bindings-row" style="display:flex; align-items:center; gap:12px; padding:12px; border-bottom:1px solid var(--color-outline-v);">
                    <span class="badge c-green">Prom.ua</span>
                    <span>→</span>
                    <strong>Спортивне харчування та добавки</strong>
                    <span class="body-s" style="color:var(--color-on-surface-v); margin-left:auto;">ID: 982</span>
                </div>
                <div class="bindings-row" style="display:flex; align-items:center; gap:12px; padding:12px;">
                    <span class="badge c-yellow">Hotline</span>
                    <span>→</span>
                    <span style="color:var(--color-on-surface-v); font-style:italic;">Не замаплено</span>
                </div>
            `;
        }
    },

    'mapper-map-to-mp': (el) => {
        const mpSelect = el.querySelector('#map-modal-marketplace');
        if (mpSelect) {
            mpSelect.innerHTML = `
                <option value="">— Оберіть маркетплейс —</option>
                <option value="mp-rozetka" selected>Rozetka</option>
                <option value="mp-prom">Prom.ua</option>
                <option value="mp-hotline">Hotline</option>
            `;
        }

        const entitySelect = el.querySelector('#map-modal-entity');
        if (entitySelect) {
            entitySelect.disabled = false;
            entitySelect.innerHTML = `
                <option value="">— Оберіть значення МП —</option>
                <option value="rz-4626174">Спортивне харчування (4626174)</option>
                <option value="rz-4626189">Спортивні добавки (4626189)</option>
                <option value="rz-4630112">Харчові добавки (4630112)</option>
            `;
        }

        const confirmBtn = el.querySelector('#map-modal-confirm');
        if (confirmBtn) confirmBtn.disabled = false;
    },

    // ─── ЗАГАЛЬНІ ───

    'glossary-view': (el) => {
        setText(el, '#modal-title', 'Протеїн');

        const content = el.querySelector('#glossary-content');
        if (content) {
            content.innerHTML = `
                <h2>Протеїн (Protein)</h2>
                <p><strong>Протеїн</strong> — це макронутрієнт, що складається з амінокислот і є основним будівельним матеріалом для м'язової тканини.</p>
                <h3>Види протеїну</h3>
                <ul>
                    <li><strong>Сироватковий (Whey)</strong> — швидке засвоєння, ідеальний після тренування</li>
                    <li><strong>Казеїновий (Casein)</strong> — повільне засвоєння, підходить перед сном</li>
                    <li><strong>Рослинний</strong> — соєвий, гороховий, рисовий</li>
                    <li><strong>Яєчний</strong> — високий BCAA профіль</li>
                </ul>
                <h3>Добова норма</h3>
                <p>Рекомендовано 1.6–2.2 г на кг ваги тіла для спортсменів.</p>
            `;
        }
    },

    'preview-modal': (el) => {
        const target = el.querySelector('#preview-content-target');
        if (target) {
            target.innerHTML = `
                <div class="rich-editor-content">
                    <h2>Optimum Nutrition Gold Standard 100% Whey</h2>
                    <p>Преміальний сироватковий протеїн з 24 г білка на порцію. Містить суміш ізоляту, концентрату та гідролізату сироваткового білка.</p>
                    <p><strong>Смак:</strong> Подвійний шоколад</p>
                    <p><strong>Вага:</strong> 2.27 кг (73 порції)</p>
                </div>
            `;
        }
    },

    'preview-modal-table': (el) => {
        const target = el.querySelector('#preview-content-target-table');
        if (target) {
            target.innerHTML = `
                <table style="width:100%; border-collapse:collapse;">
                    <thead>
                        <tr style="border-bottom:2px solid var(--color-outline-v);">
                            <th style="text-align:left; padding:8px;">Характеристика</th>
                            <th style="text-align:left; padding:8px;">Значення</th>
                            <th style="text-align:left; padding:8px;">Одиниця</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr style="border-bottom:1px solid var(--color-outline-v);"><td style="padding:8px;">Білок</td><td style="padding:8px;">24</td><td style="padding:8px;">г</td></tr>
                        <tr style="border-bottom:1px solid var(--color-outline-v);"><td style="padding:8px;">Жири</td><td style="padding:8px;">1.5</td><td style="padding:8px;">г</td></tr>
                        <tr style="border-bottom:1px solid var(--color-outline-v);"><td style="padding:8px;">Вуглеводи</td><td style="padding:8px;">3</td><td style="padding:8px;">г</td></tr>
                        <tr style="border-bottom:1px solid var(--color-outline-v);"><td style="padding:8px;">BCAA</td><td style="padding:8px;">5.5</td><td style="padding:8px;">г</td></tr>
                        <tr><td style="padding:8px;">Калорійність</td><td style="padding:8px;">120</td><td style="padding:8px;">ккал</td></tr>
                    </tbody>
                </table>
            `;
        }
    },

    'preview-modal-text': (el) => {
        const target = el.querySelector('#preview-content-target-text');
        if (target) {
            target.innerHTML = `
                <div class="rich-editor-content">
                    <p>Gold Standard 100% Whey від Optimum Nutrition — це #1 протеїн у світі вже понад 20 років.</p>
                    <p>Кожна порція містить 24 г преміального сироваткового білка з первинним джерелом у вигляді ізоляту.</p>
                    <p>Низький вміст жиру (1.5 г) та цукру (1 г) робить його ідеальним для будь-якої дієти.</p>
                </div>
            `;
        }
    },

    'magic-modal': (el) => {
        const textarea = el.querySelector('#magic-text');
        if (textarea) {
            textarea.value = `Білок 24 г
Жири 1.5 г
Насичені жири 0.5 г
Вуглеводи 3 г
Цукор 1 г
Натрій 130 мг
Кальцій 160 мг
Холестерин 35 мг
BCAA 5.5 г
Глютамін 4 г`;
        }

        // Hints sidebar
        const sidebar = el.querySelector('#magic-hints-sidebar');
        if (sidebar) {
            sidebar.innerHTML = `
                <div style="padding:16px;">
                    <h4 style="margin-bottom:8px;">Підказки</h4>
                    <p class="body-s" style="margin-bottom:8px;">Вставте текст складу у форматі "Назва Значення Одиниця"</p>
                    <p class="body-s" style="margin-bottom:8px;">Кожна характеристика — з нового рядка</p>
                    <div class="badge c-green" style="margin-top:12px;">10 рядків розпізнано</div>
                </div>
            `;
        }
    },

    // Auth login — заповнюємо фейк credentials
    'auth-login-modal': (el) => {
        setValue(el, '#auth-username', 'admin');
        setValue(el, '#auth-password', 'demo1234');
    },

    // Info modal — заповнюємо контент
    'info-modal': (el) => {
        setText(el, '#modal-title', 'Про розділ "Бренди"');
        const content = el.querySelector('#info-content');
        if (content) {
            content.innerHTML = `
                <h3>Управління брендами</h3>
                <p>У цьому розділі ви можете додавати, редагувати та видаляти бренди.</p>
                <p>Кожен бренд може мати:</p>
                <ul>
                    <li>Основну інформацію (назва, країна, логотип)</li>
                    <li>Альтернативні назви</li>
                    <li>Лінійки продуктів</li>
                    <li>Посилання на офіційні сайти</li>
                    <li>Прив'язки до маркетплейсів</li>
                    <li>Розгорнутий опис (rich text)</li>
                </ul>
            `;
        }
    },
};

// ── Utility helpers ──

function setValue(parent, selector, value) {
    const el = parent.querySelector(selector);
    if (el) el.value = value;
}

function setText(parent, selector, text) {
    const el = parent.querySelector(selector);
    if (el) el.textContent = text;
}
