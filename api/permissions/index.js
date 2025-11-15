// api/permissions/index.js

// =========================================================================
// PERMISSIONS API - УПРАВЛІННЯ ПРАВАМИ ДОСТУПУ
// =========================================================================
// ПРИЗНАЧЕННЯ:
// API для управління правами доступу (permissions).
// Дозволяє редагувати які ролі мають доступ до кожного права.
//
// ЕНДПОІНТИ:
// - GET  /api/permissions → список всіх прав з роллями
// - PUT  /api/permissions → оновити ролі для конкретного права
//
// СТРУКТУРА:
// Права зберігаються в таблиці RolePermissions (role_id, permission_key, granted).
// Каталог прав (labels) хардкоджений в коді.
// При оновленні права - видаляємо старі записи, додаємо нові.
// =========================================================================

const { corsMiddleware } = require('../utils/cors');
const { verifyToken, extractTokenFromHeader } = require('../utils/jwt');
const { getValues, updateValues, appendValues } = require('../utils/google-sheets');

// =========================================================================
// MAIN ROUTER
// =========================================================================

async function handler(req, res) {
  try {
    // Перевірка авторизації (тільки admin має доступ)
    const authCheck = await checkAdminAuth(req);
    if (!authCheck.authorized) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: authCheck.message
      });
    }

    // GET - список прав
    if (req.method === 'GET') {
      return await handleListPermissions(req, res);
    }

    // PUT - оновлення ролей для права
    if (req.method === 'PUT') {
      return await handleUpdatePermission(req, res);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Permissions API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// =========================================================================
// AUTH CHECK
// =========================================================================

async function checkAdminAuth(req) {
  const authHeader = extractTokenFromHeader(req);
  if (!authHeader) {
    return { authorized: false, message: 'No token provided' };
  }

  const decoded = verifyToken(authHeader);
  if (!decoded) {
    return { authorized: false, message: 'Invalid token' };
  }

  if (decoded.role !== 'admin') {
    return { authorized: false, message: 'Admin role required' };
  }

  return { authorized: true, user: decoded };
}

// =========================================================================
// PERMISSIONS CATALOG (хардкод всіх можливих прав)
// =========================================================================

function getPermissionsCatalog() {
  return [
    // Сторінки
    { key: 'page:index', label: 'Головна', category: 'pages' },
    { key: 'page:glossary', label: 'Глосарій', category: 'pages' },
    { key: 'page:entities', label: 'Сутності', category: 'pages' },
    { key: 'page:banned-words', label: 'Заборонені слова', category: 'pages' },
    { key: 'page:users-admin', label: 'Адмін панель', category: 'pages' },

    // Панелі
    { key: 'panel:aside-table', label: 'Панель таблиць', category: 'panels' },
    { key: 'panel:aside-text', label: 'Панель тексту', category: 'panels' },
    { key: 'panel:aside-seo', label: 'SEO панель', category: 'panels' },
    { key: 'panel:aside-translate', label: 'Панель перекладу', category: 'panels' },
    { key: 'panel:aside-links', label: 'Панель посилань', category: 'panels' },
    { key: 'panel:aside-image-tool', label: 'Панель зображень', category: 'panels' },

    // Дії - Користувачі
    { key: 'users:create', label: 'Створення користувача', category: 'actions', subcategory: 'users' },
    { key: 'users:edit', label: 'Редагування користувача', category: 'actions', subcategory: 'users' },
    { key: 'users:delete', label: 'Видалення користувача', category: 'actions', subcategory: 'users' },
    { key: 'users:reset-password', label: 'Зміна пароля', category: 'actions', subcategory: 'users' },

    // Дії - Заборонені слова
    { key: 'banned-words:add', label: 'Додавання слова', category: 'actions', subcategory: 'banned-words' },
    { key: 'banned-words:edit', label: 'Редагування слова', category: 'actions', subcategory: 'banned-words' },
    { key: 'banned-words:mark-checked', label: 'Позначення перевіреним', category: 'actions', subcategory: 'banned-words' },

    // Дії - Сутності
    { key: 'entities:add', label: 'Додавання сутності', category: 'actions', subcategory: 'entities' },
    { key: 'entities:edit', label: 'Редагування сутності', category: 'actions', subcategory: 'entities' },
    { key: 'entities:delete', label: 'Видалення сутності', category: 'actions', subcategory: 'entities' },
    { key: 'entities:manage-marketplaces', label: 'Управління маркетплейсами', category: 'actions', subcategory: 'entities' }
  ];
}

// =========================================================================
// HANDLER: LIST PERMISSIONS
// =========================================================================

async function handleListPermissions(req, res) {
  try {
    console.log('📥 Завантаження прав...');

    // Отримати каталог прав
    const catalog = getPermissionsCatalog();

    // Читання таблиці RolePermissions (A=role_id, B=permission_key, C=permission_category, D=granted)
    const permissionsData = await getValues('RolePermissions!A2:D10000', 'users');

    // Побудувати масив прав з роллями
    const permissions = catalog.map(perm => {
      // Знайти всі ролі які мають це право
      const roles = permissionsData
        .filter(row => row[1] === perm.key && row[3] === 'TRUE')
        .map(row => row[0]); // role_id

      return {
        key: perm.key,
        label: perm.label,
        category: perm.category,
        subcategory: perm.subcategory || null,
        roles: roles
      };
    });

    console.log(`✅ Завантажено ${permissions.length} прав`);

    return res.status(200).json({
      success: true,
      permissions
    });
  } catch (error) {
    console.error('Error listing permissions:', error);
    return res.status(500).json({ error: 'Failed to list permissions' });
  }
}

// =========================================================================
// HANDLER: UPDATE PERMISSION
// =========================================================================

async function handleUpdatePermission(req, res) {
  try {
    const { permission_key, roles } = req.body;

    if (!permission_key) {
      return res.status(400).json({ error: 'Missing permission_key' });
    }

    if (!Array.isArray(roles)) {
      return res.status(400).json({ error: 'roles must be an array' });
    }

    console.log(`🔄 Оновлення ролей для права ${permission_key}:`, roles);

    // Перевірити чи існує таке право в каталозі
    const catalog = getPermissionsCatalog();
    const permissionExists = catalog.some(p => p.key === permission_key);

    if (!permissionExists) {
      return res.status(404).json({ error: 'Permission not found in catalog' });
    }

    // Читання всіх записів RolePermissions
    const allPermissionsData = await getValues('RolePermissions!A2:D10000', 'users');

    // Видалити всі рядки для цього permission_key
    const filteredData = allPermissionsData.filter(row => row[1] !== permission_key);

    // Додати нові рядки для обраних ролей
    const newRows = roles.map(roleId => [
      roleId,                    // A: role_id
      permission_key,            // B: permission_key
      catalog.find(p => p.key === permission_key).category, // C: category
      'TRUE'                     // D: granted
    ]);

    // Об'єднати
    const updatedData = [...filteredData, ...newRows];

    // Записати назад в таблицю
    await updateValues('RolePermissions!A2:D10000', updatedData, 'users');

    console.log(`✅ Оновлено ролі для ${permission_key}`);

    return res.status(200).json({
      success: true,
      message: 'Permission updated successfully'
    });
  } catch (error) {
    console.error('Error updating permission:', error);
    return res.status(500).json({ error: 'Failed to update permission' });
  }
}

// =========================================================================
// EXPORT
// =========================================================================

module.exports = async (req, res) => {
  return corsMiddleware(req, res, () => handler(req, res));
};
