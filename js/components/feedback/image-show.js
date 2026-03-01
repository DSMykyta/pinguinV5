// js/components/feedback/image-show.js

/**
 * IMAGE SHOW — велике preview при наведенні на img[show]
 *
 * Чарм: атрибут `show` на <img>
 * - Через 1 сек наведення — показує велике зображення поверх всього
 * - Слідує за курсором (як тултіп)
 * - Правий клік на popup → "Відкрити зображення" відкриє повний URL
 * - Viewport boundary checking
 */

let popup = null;
let showTimer = null;
let hideTimer = null;
let currentImg = null;

export function initImageShow() {
    document.addEventListener('mouseover', onMouseOver);
    document.addEventListener('mouseout', onMouseOut);
    document.addEventListener('mousemove', onMouseMove);
}

function onMouseOver(e) {
    const img = e.target.closest('img[show]');
    if (img) {
        if (img === currentImg) return;
        clearTimers();
        currentImg = img;
        showTimer = setTimeout(() => showPopup(img, e), 1000);
        return;
    }

    // Якщо миша зайшла на popup — скасувати приховування
    if (popup && popup.contains(e.target)) {
        clearTimeout(hideTimer);
        hideTimer = null;
    }
}

function onMouseOut(e) {
    const img = e.target.closest('img[show]');
    if (img && img === currentImg) {
        const to = e.relatedTarget;

        // Якщо переходимо на popup — не ховати одразу
        if (popup && (popup === to || popup.contains(to))) {
            return;
        }

        scheduleHide();
        return;
    }

    // Якщо миша виходить з popup
    if (popup && popup.contains(e.target)) {
        const to = e.relatedTarget;

        // Якщо повертаємось на тригер img — не ховати
        if (to && to.closest('img[show]') === currentImg) {
            return;
        }

        hidePopup();
    }
}

function onMouseMove(e) {
    if (popup) {
        positionPopup(e.clientX, e.clientY);
    }
}

// ── Show / Hide ──

function showPopup(img, e) {
    if (popup) hidePopup();

    const src = img.src;
    if (!src) return;

    popup = document.createElement('div');
    popup.className = 'image-show-popup';

    const popupImg = document.createElement('img');
    popupImg.src = src;
    popupImg.alt = img.alt || '';
    popup.appendChild(popupImg);

    document.body.appendChild(popup);
    positionPopup(e.clientX, e.clientY);

    requestAnimationFrame(() => {
        if (popup) popup.classList.add('visible');
    });
}

function scheduleHide() {
    clearTimeout(hideTimer);
    hideTimer = setTimeout(() => hidePopup(), 200);
}

function hidePopup() {
    clearTimers();
    if (popup) {
        popup.remove();
        popup = null;
    }
    currentImg = null;
}

function clearTimers() {
    if (showTimer) { clearTimeout(showTimer); showTimer = null; }
    if (hideTimer) { clearTimeout(hideTimer); hideTimer = null; }
}

// ── Positioning ──

function positionPopup(cx, cy) {
    if (!popup) return;

    const offsetX = 20;
    const offsetY = 20;

    requestAnimationFrame(() => {
        if (!popup) return;

        const rect = popup.getBoundingClientRect();
        const vw = window.innerWidth;
        const vh = window.innerHeight;

        let x = cx + offsetX;
        let y = cy + offsetY;

        // Не виходити за правий край
        if (x + rect.width > vw) {
            x = cx - rect.width - offsetX;
        }

        // Не виходити за нижній край
        if (y + rect.height > vh) {
            y = cy - rect.height - offsetY;
        }

        // Не виходити за лівий/верхній край
        if (x < 0) x = 4;
        if (y < 0) y = 4;

        popup.style.left = `${x}px`;
        popup.style.top = `${y}px`;
    });
}
