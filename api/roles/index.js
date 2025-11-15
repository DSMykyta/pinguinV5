// api/roles/index.js

// =========================================================================
// ROLES API - UNIFIED ENDPOINT
// =========================================================================
// ПРИЗНАЧЕННЯ:
// Об'єднаний ендпоінт для всіх операцій з ролями та правами.
// Використовує HTTP методи та action параметр для роутингу.
//
// ЕНДПОІНТИ:
// - GET  /api/roles                      → список всіх ролей
// - POST /api/roles { action: 'create' } → створення нової ролі
// - PUT  /api/roles { action: 'update' } → оновлення ролі та її прав
// - DELETE /api/roles                    → видалення ролі (якщо is_system=FALSE)
// - GET  /api/roles { action: 'get-catalog' } → каталог всіх можливих прав
//
// СТРУКТУРА:
// Всі handler функції винесені в окремі функції для читабельності.
// Головний handler роутить запити до відповідних функцій.
// Доступ тільки для ролі admin.
// =========================================================================

const { corsMiddleware } = require('../utils/cors');
const { verifyToken, extractTokenFromHeader } = require('../utils/jwt');
const { getValues, updateValues, appendValues } = require('../utils/google-sheets');

// =========================================================================
// MAIN ROUTER
// =========================================================================

/**
 * Головний handler для роутингу roles API запитів
 * @param {Object} req - Express request об'єкт
 * @param {Object} res - Express response об'єкт
 * @returns {Promise<Object>} JSON з результатом операції
 */
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

    // GET requests
    if (req.method === 'GET') {
      const { action } = req.query || {};

      if (action === 'get-catalog') {
        return await handleGetPermissionsCatalog(req, res);
      } else {
        // GET /api/roles - список ролей
        return await handleListRoles(req, res);
      }
    }

    // POST requests
    if (req.method === 'POST') {
      const { action } = req.body || {};

      if (action === 'create') {
        return await handleCreateRole(req, res);
      } else {
        return res.status(400).json({ error: 'Invalid action. Use "create"' });
      }
    }

    // PUT requests
    if (req.method === 'PUT') {
      const { action } = req.body || {};

      if (action === 'update') {
        return await handleUpdateRole(req, res);
      } else {
        return res.status(400).json({ error: 'Invalid action. Use "update"' });
      }
    }

    // DELETE requests
    if (req.method === 'DELETE') {
      return await handleDeleteRole(req, res);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Roles API error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

// =========================================================================
// AUTH HELPER
// =========================================================================

/**
 * Перевіряє чи користувач має роль admin
 * @param {Object} req - Express request
 * @returns {Object} { authorized: boolean, message: string, user: Object|null }
 */
async function checkAdminAuth(req) {
  const token = extractTokenFromHeader(req.headers.authorization);

  if (!token) {
    return { authorized: false, message: 'No token provided', user: null };
  }

  const decoded = verifyToken(token);

  if (!decoded) {
    return { authorized: false, message: 'Invalid or expired token', user: null };
  }

  if (decoded.role !== 'admin') {
    return { authorized: false, message: 'Access denied. Admin role required.', user: null };
  }

  return { authorized: true, message: 'OK', user: decoded };
}

// =========================================================================
// HANDLER: LIST ROLES
// =========================================================================

/**
 * Повертає список всіх ролей з їхніми правами
 * @returns {Promise<Object>} JSON з масивом ролей
 */
async function handleListRoles(req, res) {
  try {
    // Читання таблиці Roles (A=role_id, B=role_name, C=role_description, D=is_system, E=created_at)
    const rolesData = await getValues('Roles!A2:E1000', 'roles');

    // Читання таблиці RolePermissions (A=role_id, B=permission_key, C=permission_category, D=granted)
    const permissionsData = await getValues('RolePermissions!A2:D10000', 'roles');

    // Побудувати масив ролей з їх правами
    const roles = rolesData
      .filter(row => row[0]) // Тільки рядки з role_id
      .map(row => {
        const roleId = row[0];
        const roleName = row[1] || '';
        const roleDescription = row[2] || '';
        const isSystem = row[3] === 'TRUE';
        const createdAt = row[4] || '';

        // Знайти всі права для цієї ролі
        const rolePermissions = permissionsData
          .filter(permRow => permRow[0] === roleId && permRow[3] === 'TRUE')
          .map(permRow => ({
            permission_key: permRow[1],
            permission_category: permRow[2] || ''
          }));

        return {
          role_id: roleId,
          role_name: roleName,
          role_description: roleDescription,
          is_system: isSystem,
          created_at: createdAt,
          permissions: rolePermissions
        };
      });

    return res.status(200).json({
      success: true,
      roles
    });
  } catch (error) {
    console.error('Error listing roles:', error);
    return res.status(500).json({ error: 'Failed to list roles' });
  }
}

// =========================================================================
// HANDLER: GET PERMISSIONS CATALOG
// =========================================================================

/**
 * Повертає каталог всіх можливих прав
 * @returns {Promise<Object>} JSON з групованими правами
 */
async function handleGetPermissionsCatalog(req, res) {
  try {
    // Каталог всіх можливих прав
    const catalog = {
      pages: [
        { key: 'page:index', label: 'Головна', category: 'pages' },
        { key: 'page:glossary', label: 'Глосарій', category: 'pages' },
        { key: 'page:entities', label: 'Сутності', category: 'pages' },
        { key: 'page:banned-words', label: 'Заборонені слова', category: 'pages' },
        { key: 'page:users-admin', label: 'Адмін панель', category: 'pages' }
      ],
      panels: [
        { key: 'panel:aside-table', label: 'Панель таблиць', category: 'panels' },
        { key: 'panel:aside-text', label: 'Панель тексту', category: 'panels' },
        { key: 'panel:aside-seo', label: 'SEO панель', category: 'panels' },
        { key: 'panel:aside-translate', label: 'Панель перекладу', category: 'panels' },
        { key: 'panel:aside-links', label: 'Панель посилань', category: 'panels' },
        { key: 'panel:aside-image-tool', label: 'Панель зображень', category: 'panels' }
      ],
      actions: {
        users: [
          { key: 'users:create', label: 'Створення користувача', category: 'actions' },
          { key: 'users:edit', label: 'Редагування користувача', category: 'actions' },
          { key: 'users:delete', label: 'Видалення користувача', category: 'actions' },
          { key: 'users:reset-password', label: 'Зміна пароля', category: 'actions' }
        ],
        bannedWords: [
          { key: 'banned-words:add', label: 'Додавання слова', category: 'actions' },
          { key: 'banned-words:edit', label: 'Редагування слова', category: 'actions' },
          { key: 'banned-words:mark-checked', label: 'Позначення перевіреним', category: 'actions' }
        ],
        entities: [
          { key: 'entities:add', label: 'Додавання сутності', category: 'actions' },
          { key: 'entities:edit', label: 'Редагування сутності', category: 'actions' },
          { key: 'entities:delete', label: 'Видалення сутності', category: 'actions' },
          { key: 'entities:manage-marketplaces', label: 'Управління маркетплейсами', category: 'actions' }
        ]
      }
    };

    return res.status(200).json({
      success: true,
      catalog
    });
  } catch (error) {
    console.error('Error getting permissions catalog:', error);
    return res.status(500).json({ error: 'Failed to get permissions catalog' });
  }
}

// =========================================================================
// HANDLER: CREATE ROLE
// =========================================================================

/**
 * Створює нову роль
 * @returns {Promise<Object>} JSON з даними створеної ролі
 */
async function handleCreateRole(req, res) {
  try {
    const { roleId, roleName, roleDescription, permissions } = req.body;

    // Валідація
    if (!roleId || !roleName) {
      return res.status(400).json({ error: 'roleId and roleName are required' });
    }

    // Перевірка чи роль вже існує
    const rolesData = await getValues('Roles!A2:A1000', 'roles');
    const exists = rolesData.some(row => row[0] === roleId);

    if (exists) {
      return res.status(400).json({ error: 'Role with this ID already exists' });
    }

    // Додати роль в таблицю Roles
    const now = new Date().toISOString();
    await appendValues('Roles!A:E', [[
      roleId,
      roleName,
      roleDescription || '',
      'FALSE', // is_system
      now
    ]], 'roles');

    // Додати права в таблицю RolePermissions
    if (permissions && Array.isArray(permissions) && permissions.length > 0) {
      const permissionRows = permissions.map(permKey => [
        roleId,
        permKey,
        getCategoryFromPermissionKey(permKey),
        'TRUE' // granted
      ]);

      await appendValues('RolePermissions!A:D', permissionRows, 'roles');
    }

    console.log(`✅ Роль створено: ${roleId}`);

    return res.status(200).json({
      success: true,
      role: {
        role_id: roleId,
        role_name: roleName,
        role_description: roleDescription || '',
        is_system: false,
        created_at: now,
        permissions: permissions || []
      }
    });
  } catch (error) {
    console.error('Error creating role:', error);
    return res.status(500).json({ error: 'Failed to create role' });
  }
}

// =========================================================================
// HANDLER: UPDATE ROLE
// =========================================================================

/**
 * Оновлює роль та її права
 * @returns {Promise<Object>} JSON з оновленими даними
 */
async function handleUpdateRole(req, res) {
  try {
    const { roleId, roleName, roleDescription, permissions } = req.body;

    // Валідація
    if (!roleId) {
      return res.status(400).json({ error: 'roleId is required' });
    }

    // Знайти роль
    const rolesData = await getValues('Roles!A2:E1000', 'roles');
    const roleIndex = rolesData.findIndex(row => row[0] === roleId);

    if (roleIndex === -1) {
      return res.status(404).json({ error: 'Role not found' });
    }

    const roleRow = rolesData[roleIndex];
    const isSystem = roleRow[3] === 'TRUE';

    // Не дозволяти редагувати системні ролі (опціонально)
    // if (isSystem) {
    //   return res.status(403).json({ error: 'Cannot modify system roles' });
    // }

    // Оновити назву та опис ролі
    const rowNumber = roleIndex + 2; // +2 тому що A2 це перший рядок даних
    await updateValues(`Roles!B${rowNumber}:C${rowNumber}`, [[
      roleName || roleRow[1],
      roleDescription !== undefined ? roleDescription : roleRow[2]
    ]], 'roles');

    // Оновити права: видалити всі старі та додати нові
    if (permissions && Array.isArray(permissions)) {
      // TODO: Реалізувати видалення старих прав та додавання нових
      // Наразі це вимагає складнішої логіки з Google Sheets
      // Можна зробити через повне перезаписування або окремі видалення
      console.warn('⚠️ Оновлення прав поки не реалізовано повністю');
    }

    console.log(`✅ Роль оновлено: ${roleId}`);

    return res.status(200).json({
      success: true,
      role: {
        role_id: roleId,
        role_name: roleName || roleRow[1],
        role_description: roleDescription !== undefined ? roleDescription : roleRow[2],
        is_system: isSystem,
        created_at: roleRow[4]
      }
    });
  } catch (error) {
    console.error('Error updating role:', error);
    return res.status(500).json({ error: 'Failed to update role' });
  }
}

// =========================================================================
// HANDLER: DELETE ROLE
// =========================================================================

/**
 * Видаляє роль (тільки якщо is_system=FALSE)
 * @returns {Promise<Object>} JSON з підтвердженням
 */
async function handleDeleteRole(req, res) {
  try {
    const { roleId } = req.body;

    // Валідація
    if (!roleId) {
      return res.status(400).json({ error: 'roleId is required' });
    }

    // Знайти роль
    const rolesData = await getValues('Roles!A2:E1000', 'roles');
    const roleIndex = rolesData.findIndex(row => row[0] === roleId);

    if (roleIndex === -1) {
      return res.status(404).json({ error: 'Role not found' });
    }

    const roleRow = rolesData[roleIndex];
    const isSystem = roleRow[3] === 'TRUE';

    // Заборонити видаленнясистемних ролей
    if (isSystem) {
      return res.status(403).json({ error: 'Cannot delete system roles' });
    }

    // TODO: Видалити роль з Roles таблиці
    // TODO: Видалити всі права з RolePermissions таблиці
    // Це вимагає складнішої логіки з Google Sheets API

    console.warn('⚠️ Видалення ролей поки не реалізовано повністю');

    return res.status(200).json({
      success: true,
      message: 'Role deletion not fully implemented yet'
    });
  } catch (error) {
    console.error('Error deleting role:', error);
    return res.status(500).json({ error: 'Failed to delete role' });
  }
}

// =========================================================================
// HELPER FUNCTIONS
// =========================================================================

/**
 * Витягує категорію з ключа права
 * @param {string} permissionKey - Ключ права (наприклад, "page:index")
 * @returns {string} Категорія ("pages", "panels", "actions")
 */
function getCategoryFromPermissionKey(permissionKey) {
  if (permissionKey.startsWith('page:')) return 'pages';
  if (permissionKey.startsWith('panel:')) return 'panels';
  if (permissionKey.startsWith('users:') ||
      permissionKey.startsWith('banned-words:') ||
      permissionKey.startsWith('entities:')) return 'actions';
  return 'other';
}

module.exports = corsMiddleware(handler);
