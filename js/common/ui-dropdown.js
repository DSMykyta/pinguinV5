export function initDropdowns() {
    // Add document click listener only once
    const initialized = Symbol.for('dropdownDocumentListener');
    if (!window[initialized]) {
        document.addEventListener('click', (e) => {
            document.querySelectorAll('.dropdown-wrapper.is-open').forEach(openWrapper => {
                if (!openWrapper.contains(e.target)) {
                    openWrapper.classList.remove('is-open');
                }
            });
        });
        window[initialized] = true;
    }

    // Select only uninitialized triggers
    const triggers = document.querySelectorAll('[data-dropdown-trigger]:not([data-dropdown-init])');
    triggers.forEach(trigger => {
        trigger.dataset.dropdownInit = 'true';

        const wrapper = trigger.closest('.dropdown-wrapper');
        if (!wrapper) return;

        // Mark wrapper as initialized to prevent duplicate mouse listeners
        if (wrapper.dataset.dropdownInit) return;
        wrapper.dataset.dropdownInit = 'true';

        trigger.addEventListener('click', (e) => {
            e.stopPropagation();

            const isOpen = wrapper.classList.contains('is-open');

            // Close other open wrappers
            document.querySelectorAll('.dropdown-wrapper.is-open').forEach(openWrapper => {
                if (openWrapper !== wrapper) {
                    openWrapper.classList.remove('is-open');
                }
            });

            // Toggle current wrapper
            wrapper.classList.toggle('is-open');
        });

        // Mouse interaction handlers (added only once per wrapper)
        let closeTimeout;
        wrapper.addEventListener('mouseleave', () => {
            closeTimeout = setTimeout(() => {
                wrapper.classList.remove('is-open');
            }, 300);
        });
        wrapper.addEventListener('mouseenter', () => {
            clearTimeout(closeTimeout);
        });
    });
}