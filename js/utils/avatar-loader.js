/**
 * Avatar Loader Utility
 *
 * Динамічно завантажує список доступних аватарів з папки resources/avatars/
 * Витягує унікальні назви тварин та надає функції для роботи з аватарами
 */

// Список доступних аватарів (завантажується динамічно)
let availableAvatars = [];

/**
 * Отримує список доступних аватарів
 * Сканує папку resources/avatars/ та витягує унікальні назви тварин
 */
export async function loadAvailableAvatars() {
    try {
        // Використовуємо статичний список файлів з папки
        // В production середовищі файли вже відомі
        const avatarFiles = [
            'koala-calm.png',
            'koala-happy.png',
            'koala-mad.png',
            'koala-sad.png',
            'koala-suspicion.png',
            'otter-calm.png',
            'otter-happy.png',
            'otter-mad.png',
            'otter-sad.png',
            'otter-suspicion.png',
            'penguin-anger.png',
            'penguin-calm.png',
            'penguin-mad.png',
            'penguin-sad.png',
            'penguin-suspicion.png'
        ];

        // Витягуємо унікальні назви тварин (без емоцій)
        const animalNames = new Set();

        avatarFiles.forEach(filename => {
            // Витягуємо назву тварини (все до першого дефісу)
            const match = filename.match(/^([a-z]+)-/);
            if (match) {
                animalNames.add(match[1]);
            }
        });

        // Перетворюємо в масив об'єктів з інформацією про аватар
        availableAvatars = Array.from(animalNames).map(name => ({
            name: name,
            displayName: capitalizeFirst(name),
            calmPath: `resources/avatars/${name}-calm.png`,
            happyPath: `resources/avatars/${name}-happy.png`,
            sadPath: `resources/avatars/${name}-sad.png`,
            madPath: `resources/avatars/${name}-mad.png`,
            suspicionPath: `resources/avatars/${name}-suspicion.png`
        }));

        console.log('✅ Завантажено аватари:', availableAvatars);
        return availableAvatars;
    } catch (error) {
        console.error('❌ Помилка завантаження аватарів:', error);
        return [];
    }
}

/**
 * Повертає список доступних аватарів
 */
export function getAvailableAvatars() {
    return availableAvatars;
}

/**
 * Отримує шлях до аватара за назвою тварини та емоцією
 * @param {string} animalName - Назва тварини (koala, otter, penguin)
 * @param {string} emotion - Емоція (calm, happy, sad, mad, suspicion)
 * @returns {string} Шлях до файлу аватара
 */
export function getAvatarPath(animalName, emotion = 'calm') {
    if (!animalName) {
        return null;
    }

    return `resources/avatars/${animalName}-${emotion}.png`;
}

/**
 * Генерує HTML для відображення аватара
 * @param {string} animalName - Назва тварини
 * @param {string} size - Розмір (sm, md, lg, xl)
 * @param {string} emotion - Емоція (за замовчуванням calm)
 * @returns {string} HTML код аватара
 */
export function renderAvatar(animalName, size = 'md', emotion = 'calm') {
    if (!animalName) {
        // Fallback на іконку person
        return `
            <span class="avatar avatar-${size} avatar-icon">
                <span class="material-symbols-outlined" style="font-size: inherit;">person</span>
            </span>
        `;
    }

    const path = getAvatarPath(animalName, emotion);
    return `
        <span class="avatar avatar-${size}">
            <img src="${path}" alt="${capitalizeFirst(animalName)}" onerror="this.parentElement.innerHTML='<span class=\\'material-symbols-outlined\\' style=\\'font-size: inherit;\\'>person</span>'">
        </span>
    `;
}

/**
 * Створює селектор аватарів для модалок
 * @param {string} selectedAvatar - Поточно обраний аватар
 * @param {string} containerId - ID контейнера для селектора
 */
export function renderAvatarSelector(selectedAvatar = null, containerId = 'avatar-selector') {
    const container = document.getElementById(containerId);
    if (!container) {
        console.error(`Контейнер #${containerId} не знайдено`);
        return;
    }

    if (availableAvatars.length === 0) {
        container.innerHTML = '<p style="color: var(--text-secondary);">Завантаження аватарів...</p>';
        return;
    }

    // Визначаємо ID для прихованого input та превью на основі containerId
    const inputId = containerId === 'avatar-selector' ? 'selected-avatar' : 'selected-avatar-edit';
    const previewId = containerId === 'avatar-selector' ? 'avatar-preview' : 'avatar-preview-edit';

    let html = '<div class="avatar-selector">';

    availableAvatars.forEach(avatar => {
        const isSelected = avatar.name === selectedAvatar;
        html += `
            <div class="avatar-option ${isSelected ? 'selected' : ''}"
                 data-avatar-name="${avatar.name}"
                 title="${avatar.displayName}">
                <img src="${avatar.calmPath}" alt="${avatar.displayName}">
            </div>
        `;
    });

    html += '</div>';
    container.innerHTML = html;

    // Оновлюємо превью для вже обраного аватара
    if (selectedAvatar) {
        updateAvatarPreview(selectedAvatar, previewId);
    }

    // Використовуємо event delegation замість додавання listeners до кожного елемента
    // Це запобігає memory leak при повторних викликах renderAvatarSelector
    if (!container._avatarClickHandler) {
        container._avatarClickHandler = function(e) {
            const option = e.target.closest('.avatar-option');
            if (!option) return;

            // Знімаємо виділення з усіх
            container.querySelectorAll('.avatar-option').forEach(opt => {
                opt.classList.remove('selected');
            });

            // Виділяємо обраний
            option.classList.add('selected');

            // Визначаємо правильні ID на основі containerId
            const currentInputId = container.id === 'avatar-selector' ? 'selected-avatar' : 'selected-avatar-edit';
            const currentPreviewId = container.id === 'avatar-selector' ? 'avatar-preview' : 'avatar-preview-edit';

            // Оновлюємо прихований input
            const avatarInput = document.getElementById(currentInputId);
            if (avatarInput) {
                avatarInput.value = option.dataset.avatarName;
            }

            // Оновлюємо превью
            updateAvatarPreview(option.dataset.avatarName, currentPreviewId);

            // Генеруємо подію зміни
            container.dispatchEvent(new CustomEvent('avatar-changed', {
                detail: { avatar: option.dataset.avatarName }
            }));
        };
        container.addEventListener('click', container._avatarClickHandler);
    }
}

/**
 * Оновлює превью обраного аватара
 */
function updateAvatarPreview(avatarName, previewId = 'avatar-preview') {
    const preview = document.getElementById(previewId);
    if (!preview) return;

    if (!avatarName) {
        preview.classList.add('u-hidden');
        return;
    }

    const avatar = availableAvatars.find(a => a.name === avatarName);
    if (!avatar) return;

    preview.classList.remove('u-hidden');
    preview.innerHTML = `
        <div class="avatar-preview-image">
            <img src="${avatar.calmPath}" alt="${avatar.displayName}">
        </div>
        <div class="avatar-preview-text">
            <div class="avatar-preview-label">Обраний аватар</div>
            <div class="avatar-preview-name">${avatar.displayName}</div>
        </div>
    `;
}

/**
 * Капіталізує першу літеру
 */
function capitalizeFirst(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
}

// Експорт для використання в window (для сумісності)
window.avatarLoader = {
    loadAvailableAvatars,
    getAvailableAvatars,
    getAvatarPath,
    renderAvatar,
    renderAvatarSelector
};

// Автоматично завантажуємо аватари при завантаженні модуля
loadAvailableAvatars();
