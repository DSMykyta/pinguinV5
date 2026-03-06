// js/components/charms/charm-scroll-fade.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                    SCROLL FADE CHARM                                    ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║                                                                          ║
 * ║  Gradient + arrow indicator for scrollable containers.                   ║
 * ║  Shows when content overflows — hides when scrolled to edge.            ║
 * ║  Auto-discovery via MutationObserver.                                   ║
 * ║                                                                          ║
 * ║  USAGE:                                                                  ║
 * ║  <div scroll-fade style="overflow-y: auto;">                            ║
 * ║    <!-- scrollable content -->                                          ║
 * ║  </div>                                                                  ║
 * ║                                                                          ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

let _observing = false;

const SELECTOR = '[scroll-fade]';

export function initScrollFadeCharm(scope = document) {
    scope.querySelectorAll(SELECTOR).forEach(el => {
        if (el._scrollFadeInit) return;
        el._scrollFadeInit = true;
        setupScrollFade(el);
    });

    if (!_observing) {
        _observing = true;
        startObserver();
    }
}

function startObserver() {
    const observer = new MutationObserver(mutations => {
        for (const m of mutations) {
            if (m.type !== 'childList') continue;
            for (const node of m.addedNodes) {
                if (node.nodeType !== 1) continue;
                discover(node);
            }
        }
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
}

function discover(node) {
    if (node.matches?.(SELECTOR) && !node._scrollFadeInit) {
        node._scrollFadeInit = true;
        setupScrollFade(node);
    }
    node.querySelectorAll?.(SELECTOR).forEach(el => {
        if (el._scrollFadeInit) return;
        el._scrollFadeInit = true;
        setupScrollFade(el);
    });
}

// ═══════════════════════════════════════════════════════════════════════════
// SETUP
// ═══════════════════════════════════════════════════════════════════════════

function setupScrollFade(el) {
    // Wrap element in a relative container for indicator positioning
    const wrapper = document.createElement('div');
    wrapper.className = 'scroll-fade-wrapper';
    el.parentNode.insertBefore(wrapper, el);
    wrapper.appendChild(el);

    // Create indicators
    const topIndicator = createIndicator('top', 'keyboard_arrow_up');
    const bottomIndicator = createIndicator('bottom', 'keyboard_arrow_down');
    wrapper.insertBefore(topIndicator, el);
    wrapper.appendChild(bottomIndicator);

    // Scroll handler
    function update() {
        const { scrollTop, scrollHeight, clientHeight } = el;
        const threshold = 5;

        topIndicator.classList.toggle('visible', scrollTop > threshold);
        bottomIndicator.classList.toggle('visible', scrollTop + clientHeight < scrollHeight - threshold);
    }

    el.addEventListener('scroll', update, { passive: true });

    // Click arrows to scroll
    topIndicator.addEventListener('click', () => {
        el.scrollBy({ top: -200, behavior: 'smooth' });
    });
    bottomIndicator.addEventListener('click', () => {
        el.scrollBy({ top: 200, behavior: 'smooth' });
    });

    // Initial check + delayed re-check for async content
    update();
    requestAnimationFrame(update);

    // Re-check when children change (items added/removed)
    const contentObserver = new MutationObserver(update);
    contentObserver.observe(el, { childList: true, subtree: true });

    // Store ref for potential cleanup
    el._scrollFadeCleanup = () => {
        contentObserver.disconnect();
        el.removeEventListener('scroll', update);
    };
}

function createIndicator(position, iconName) {
    const indicator = document.createElement('div');
    indicator.className = `scroll-fade-indicator scroll-fade-${position}`;

    const arrow = document.createElement('span');
    arrow.className = 'material-symbols-outlined scroll-fade-arrow';
    arrow.textContent = iconName;
    indicator.appendChild(arrow);

    return indicator;
}
