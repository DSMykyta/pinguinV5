// js/components/avatar/avatar-config.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                      AVATAR SYSTEM - CONFIGURATION                        ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * Централізована конфігурація системи аватарів.
 * Всі константи, розміри, шляхи та налаштування.
 */

/**
 * Базовий шлях до ресурсів аватарів
 */
export const AVATAR_BASE_PATH = 'resources/avatars';
export const AVATAR_HD_PATH = 'resources/avatars/1056';

/**
 * Доступні тварини для аватарів
 */
export const AVAILABLE_ANIMALS = [
    'koala',
    'otter',
    'penguin',
    'beaver',
    'panda',
    'lion'
];

/**
 * Тварина за замовчуванням (fallback)
 */
export const DEFAULT_ANIMAL = 'penguin';

/**
 * Доступні емоції
 */
export const AVAILABLE_EMOTIONS = [
    'calm',
    'happy',
    'sad',
    'angry',  // В файлах: angry (в коді іноді mad)
    'confused',
    'suspicion'
];

/**
 * Мапінг емоцій (для сумісності з різними назвами)
 */
export const EMOTION_ALIASES = {
    'mad': 'angry',
    'anger': 'angry',
    'suspicious': 'suspicion'
};

/**
 * Емоція за замовчуванням
 */
export const DEFAULT_EMOTION = 'calm';

/**
 * Розміри аватарів
 */
export const AVATAR_SIZES = {
    xs: '24px',
    sm: '32px',
    md: '48px',
    lg: '80px',
    xl: '120px',
    xxl: '160px'
};

/**
 * Налаштування для різних контекстів використання
 */
export const AVATAR_CONTEXTS = {
    // Аватар в панелі користувача
    userPanel: {
        size: 'sm',
        emotion: 'calm',
        useHD: false
    },
    // Аватар в таблицях
    table: {
        size: 'xs',
        emotion: 'calm',
        useHD: false
    },
    // Empty state
    emptyState: {
        size: 'xl',
        useHD: true
    },
    // No results state
    noResults: {
        size: 'xxl',
        useHD: true
    },
    // Modal states
    modal: {
        size: 'lg',
        useHD: true
    },
    // Selector preview
    selectorPreview: {
        size: 'md',
        emotion: 'calm',
        useHD: false
    },
    // Selector option
    selectorOption: {
        size: 'sm',
        emotion: 'calm',
        useHD: false
    }
};

/**
 * Конфігурація станів UI (для avatar-ui-states.js)
 */
export const UI_STATES_CONFIG = {
    // Порожній стан (немає даних)
    empty: {
        emotion: 'sad',
        messages: [
            'Поки про це нічого не відомо',
            'Ми не знаємо що це таке',
            'Дані відсутні',
            'Спочатку треба додати щось'
        ]
    },

    // Успішна операція
    success: {
        emotion: 'happy',
        messages: [
            'Готово!',
            'Успішно збережено',
            'Чудово, все працює!',
            'Виконано без помилок'
        ]
    },

    // Результати пошуку не знайдені
    noResults: {
        emotion: 'confused',
        messages: [
            'Ти взагалі про що?',
            'Вперше про таке чую',
            'Я не певен що таке існує',
            'Я такого тобі не покажу',
            'Я нічого не зрозумів'
        ]
    },

    // Помилка
    error: {
        emotion: 'angry',
        messages: [
            'Щось пішло не так',
            'Помилка!',
            'Не вдалося виконати',
            'Це не спрацювало'
        ]
    },

    // Завантаження
    loading: {
        emotion: 'calm',
        messages: [
            'Завантаження...',
            'Зачекайте хвилинку',
            'Обробка даних...',
            'Майже готово'
        ]
    },

    // Підтвердження закриття
    confirmClose: {
        emotion: 'suspicion',
        messages: [
            'Точно закрити?',
            'Ти впевнений?',
            'Може залишимо?',
            'Не передумав?',
            'Закриваємо?'
        ]
    },

    // Підтвердження перезавантаження
    confirmReload: {
        emotion: 'confused',
        messages: [
            'Перезавантажити?',
            'Оновити сторінку?',
            'Почати з початку?',
            'Завантажити знову?',
            'Перезапустити?'
        ]
    },

    // Підтвердження скидання/видалення
    confirmReset: {
        emotion: 'angry',
        messages: [
            'Скинути все?',
            'Видалити зміни?',
            'Повернути як було?',
            'Втратити всі зміни?',
            'Точно скинути?'
        ]
    },

    // Підтвердження видалення
    confirmDelete: {
        emotion: 'angry',
        messages: [
            'Видалити назавжди?',
            'Точно видалити?',
            'Без можливості відновлення!',
            'Це не повернути!',
            'Впевнений?'
        ]
    },

    // Авторизація/вхід
    authLogin: {
        emotion: 'suspicion',
        messages: [
            'Хто ти такий?',
            'Ти точно маєш доступ?',
            'Покажи свої креденшли',
            'А ти хто?',
            'Я тебе не знаю',
            'Підозріло...'
        ]
    },

    // Потрібна авторизація
    authRequired: {
        emotion: 'suspicion',
        messages: [
            'Спочатку увійди',
            'Авторизуйся для доступу',
            'Потрібен вхід в систему',
            'Без авторизації не покажу'
        ]
    },

    // Привітання в кабінеті користувача
    // Використовує рандомну емоцію з масиву emotions (замість фіксованої emotion)
    cabinetGreeting: {
        emotion: 'happy',
        emotions: ['happy', 'calm', 'suspicion', 'confused'],
        messages: [
            'О, це знову ти? Ну заходь...',
            'Що, знову працювати? Ех...',
            'Я тебе чекав! Ні, не чекав. Жартую.',
            'Привіт! Ти виглядаєш як людина з задачами.',
            'Тихо! Я думаю... Ні, вже передумав.',
            'А, це ти. Я думав хтось важливий.',
            'Ласкаво просимо в хаос!',
            'Сьогодні чудовий день щоб закрити задачу!',
            'Знову тут? Відпочинок — це міф?',
            'Заходь, не стій на порозі!'
        ]
    }
};

/**
 * Маппінг модалів на стани аватарів
 * Використовується для автоматичного рендерингу аватарів в модалах
 */
export const MODAL_AVATAR_MAPPING = {
    'confirm-delete-modal': {
        stateType: 'confirmDelete',
        avatarContainerId: 'confirm-delete-avatar-container',
        messageContainerId: 'confirm-delete-avatar-message'
    },
    'auth-login-modal': {
        stateType: 'authLogin',
        avatarContainerId: 'auth-login-avatar-container',
        messageContainerId: 'auth-login-avatar-message'
    }
};

/**
 * Кольори для текстових аватарів
 */
export const TEXT_AVATAR_COLORS = [
    '#f44336', '#e91e63', '#9c27b0', '#673ab7',
    '#3f51b5', '#2196f3', '#03a9f4', '#00bcd4',
    '#009688', '#4caf50', '#8bc34a', '#cddc39',
    '#ffc107', '#ff9800', '#ff5722', '#795548'
];
