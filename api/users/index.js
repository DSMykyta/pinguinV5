// api/users/index.js

// =========================================================================
// USERS API - UNIFIED ENDPOINT
// =========================================================================
// ПРИЗНАЧЕННЯ:
// Об'єднаний ендпоінт для всіх операцій з користувачами, ролями та правами.
// Використовує HTTP методи та action параметр для роутингу.
//
// АВТОРИЗАЦІЯ:
// - ПОТРІБНА (admin) для: користувачів, ролей, каталогу прав, призначень
// - НЕ ПОТРІБНА для: user-permissions (публічний доступ)
//
// ЕНДПОІНТИ:
// === КОРИСТУВАЧІ ===
// - GET    /api/users                           → list all users
// - POST   /api/users { action: create }        → create new user
// - POST   /api/users { action: reset }         → reset password
// - PUT    /api/users                           → update user
// - DELETE /api/users                           → delete user
//
// === РОЛІ ===
// - GET    /api/users?action=roles              → list all roles with permissions
//
// === ПРАВА (КАТАЛОГ) ===
// - GET    /api/users?action=permissions-catalog → list all available permissions
// - POST   /api/users { action: create-permission } → create new permission
// - PUT    /api/users { action: update-permission } → update permission
// - DELETE /api/users { action: delete-permission } → delete permission
//
// === ПРИЗНАЧЕННЯ ПРАВ ===
// - GET    /api/users?action=permissions-assignments → list permissions with assigned roles
// - POST   /api/users { action: assign-permission }  → assign permission to roles
//
// === ПУБЛІЧНИЙ ДОСТУП ===
// - GET    /api/users?action=user-permissions&role=X → get permissions for role (no auth)
//
// СТРУКТУРА:
// Всі handler функції винесені в окремі функції для читабельності.
// Головний handler роутить запити до відповідних функцій.
// =========================================================================

const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { corsMiddleware } = require('../utils/cors');
const { requireAdmin } = require('../utils/auth-middleware');
const { getValues, appendValues, updateValues, batchUpdateSpreadsheet, getSheetNames } = require('../utils/google-sheets');

// =========================================================================
// MAIN ROUTER
// =========================================================================

/**
 * Головний handler для роутингу users API запитів
 * @param {Object} req - Express request об'єкт
 * @param {Object} res - Express response об'єкт
 * @returns {Promise<Object>} JSON з результатом операції
 */
async function handler(req, res) {
  // Спеціальна обробка для публічного ендпоінту user-permissions (без авторизації)
  if (req.method === 'GET' && req.query.action === 'user-permissions') {
    return await handleGetUserPermissions(req, res);
  }

  // Перевірка авторизації для всіх інших операцій
  const authResult = requireAdmin(req);
  if (!authResult.authorized) {
    return res.status(authResult.status).json({ error: authResult.error });
  }

  // Роутинг за HTTP методом
  try {
    if (req.method === 'GET') {
      const { action } = req.query || {};

      // Роутинг GET запитів за action параметром
      if (!action) {
        return await handleList(req, res);
      } else if (action === 'roles') {
        return await handleListRoles(req, res);
      } else if (action === 'permissions-catalog') {
        return await handleGetPermissionsCatalog(req, res);
      } else if (action === 'permissions-assignments') {
        return await handleGetPermissionAssignments(req, res);
      } else {
        return res.status(400).json({ error: 'Invalid action for GET request' });
      }

    } else if (req.method === 'POST') {
      const { action } = req.body;

      // Роутинг POST запитів за action параметром
      if (action === 'create') {
        return await handleCreate(req, res);
      } else if (action === 'reset-password') {
        return await handleResetPassword(req, res);
      } else if (action === 'create-permission') {
        return await handleCreatePermission(req, res);
      } else if (action === 'assign-permission') {
        return await handleAssignPermission(req, res);
      } else {
        return res.status(400).json({ error: 'Invalid action for POST request' });
      }

    } else if (req.method === 'PUT') {
      const { action } = req.body;

      // Роутинг PUT запитів за action параметром
      if (!action) {
        return await handleUpdate(req, res);
      } else if (action === 'update-permission') {
        return await handleUpdatePermission(req, res);
      } else {
        return res.status(400).json({ error: 'Invalid action for PUT request' });
      }

    } else if (req.method === 'DELETE') {
      const { action } = req.body;

      // Роутинг DELETE запитів за action параметром
      if (!action) {
        return await handleDelete(req, res);
      } else if (action === 'delete-permission') {
        return await handleDeletePermission(req, res);
      } else {
        return res.status(400).json({ error: 'Invalid action for DELETE request' });
      }

    } else {
      return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Users API error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

// =========================================================================
// HANDLER: LIST USERS (GET)
// =========================================================================

/**
 * Отримує список всіх користувачів
 * @returns {Promise<Object>} JSON зі списком користувачів
 */
async function handleList(req, res) {
  try {
    // Читання користувачів з Users Database (включаючи display_name та avatar)
    const usersData = await getValues('Users!A2:H1000', 'users');

    // Перетворення в об'єкти без password_hash
    const users = usersData
      .filter(row => row[0])
      .map(row => ({
        id: row[0] || '',
        username: row[1] || '',
        // НЕ повертаємо password_hash для безпеки
        role: row[3] || 'viewer',
        created_at: row[4] || '',
        last_login: row[5] || '',
        display_name: row[6] || '',
        avatar: row[7] || ''
      }));

    return res.status(200).json({
      success: true,
      users
    });
  } catch (error) {
    console.error('Users list error:', error);
    return res.status(500).json({
      error: 'Failed to fetch users',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

// =========================================================================
// HANDLER: CREATE USER (POST with action=create)
// =========================================================================

/**
 * Створює нового користувача
 * @returns {Promise<Object>} JSON з даними нового користувача
 */
async function handleCreate(req, res) {
  try {
    const { username, password, role, displayName, avatar } = req.body;

    // Валідація вхідних даних
    if (!username || !password || !role) {
      return res.status(400).json({
        error: 'Username, password, and role are required'
      });
    }

    if (username.length < 3) {
      return res.status(400).json({
        error: 'Username must be at least 3 characters long'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        error: 'Password must be at least 6 characters long'
      });
    }

    const validRoles = ['admin', 'editor', 'viewer'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        error: 'Invalid role. Must be: admin, editor, or viewer'
      });
    }

    // Читання існуючих користувачів для перевірки унікальності
    const usersData = await getValues('Users!A2:H1000', 'users');
    const existingUser = usersData.find(row => row[1] === username);

    if (existingUser) {
      return res.status(409).json({
        error: 'Username already exists'
      });
    }

    // Генерація ID та хешування пароля
    const id = uuidv4();
    const passwordHash = await bcrypt.hash(password, 12);
    const createdAt = new Date().toISOString();

    // Додавання нового користувача в Users Database
    await appendValues('Users!A:H', [[
      id,
      username,
      passwordHash,
      role,
      createdAt,
      '',
      displayName || '',
      avatar || ''
    ]], 'users');

    return res.status(201).json({
      success: true,
      user: {
        id,
        username,
        role,
        created_at: createdAt,
        last_login: '',
        display_name: displayName || '',
        avatar: avatar || ''
      }
    });
  } catch (error) {
    console.error('Create user error:', error);
    return res.status(500).json({
      error: 'Failed to create user',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

// =========================================================================
// HANDLER: UPDATE USER (PUT)
// =========================================================================

/**
 * Оновлює дані користувача (username та/або role)
 * @returns {Promise<Object>} JSON з оновленими даними
 */
async function handleUpdate(req, res) {
  try {
    const { id, username, role, newPassword, displayName, avatar } = req.body;

    // Валідація вхідних даних
    if (!id) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    if (!username && !role && !newPassword && displayName === undefined && avatar === undefined) {
      return res.status(400).json({ error: 'At least one field must be provided for update' });
    }

    // Валідація role (якщо передано)
    if (role) {
      const validRoles = ['admin', 'editor', 'viewer'];
      if (!validRoles.includes(role)) {
        return res.status(400).json({
          error: 'Invalid role. Must be: admin, editor, or viewer'
        });
      }
    }

    // Валідація пароля (якщо передано)
    if (newPassword && newPassword.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }

    // Читання користувачів з Users Database
    const usersData = await getValues('Users!A2:H1000', 'users');

    // Пошук користувача за ID
    const userIndex = usersData.findIndex(row => row[0] === id);

    if (userIndex === -1) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userRow = usersData[userIndex];

    // Перевірка унікальності username (якщо змінюється)
    if (username && username !== userRow[1]) {
      const existingUser = usersData.find(row => row[1] === username);
      if (existingUser) {
        return res.status(409).json({ error: 'Username already exists' });
      }
    }

    // Підготовка оновлених даних
    const updatedUsername = username || userRow[1];
    const updatedRole = role || userRow[3];
    const updatedDisplayName = displayName !== undefined ? displayName : (userRow[6] || '');
    const updatedAvatar = avatar !== undefined ? avatar : (userRow[7] || '');

    // Хешувати новий пароль якщо передано
    let updatedPasswordHash = userRow[2]; // За замовчуванням старий хеш
    if (newPassword) {
      updatedPasswordHash = await bcrypt.hash(newPassword, 12);
    }

    // Оновлення в Users Database
    const rowNumber = userIndex + 2;
    await updateValues(`Users!B${rowNumber}:D${rowNumber}`, [[
      updatedUsername,
      updatedPasswordHash,
      updatedRole
    ]], 'users');

    // Оновлення display_name та avatar (окремий запит для колонок G та H)
    await updateValues(`Users!G${rowNumber}:H${rowNumber}`, [[
      updatedDisplayName,
      updatedAvatar
    ]], 'users');

    return res.status(200).json({
      success: true,
      user: {
        id,
        username: updatedUsername,
        role: updatedRole,
        display_name: updatedDisplayName,
        avatar: updatedAvatar
      }
    });
  } catch (error) {
    console.error('Update user error:', error);
    return res.status(500).json({
      error: 'Failed to update user',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

// =========================================================================
// HANDLER: DELETE USER (DELETE)
// =========================================================================

/**
 * Видаляє користувача з Users Database
 * @returns {Promise<Object>} JSON з результатом видалення
 */
async function handleDelete(req, res) {
  try {
    const { id } = req.body;

    // Валідація вхідних даних
    if (!id) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    // Перевірка що не видаляємо самого себе
    if (id === req.user.id) {
      return res.status(403).json({ error: 'Cannot delete yourself' });
    }

    // Читання користувачів з Users Database
    const usersData = await getValues('Users!A2:F1000', 'users');

    // Пошук користувача за ID
    const userIndex = usersData.findIndex(row => row[0] === id);

    if (userIndex === -1) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Отримання sheetId для Users аркушу
    const sheets = await getSheetNames('users');
    const usersSheet = sheets.find(sheet => sheet.title === 'Users');

    if (!usersSheet) {
      return res.status(500).json({ error: 'Users sheet not found' });
    }

    // Видалення рядка через batchUpdate
    const rowNumber = userIndex + 2;
    await batchUpdateSpreadsheet([
      {
        deleteDimension: {
          range: {
            sheetId: usersSheet.sheetId,
            dimension: 'ROWS',
            startIndex: rowNumber - 1,
            endIndex: rowNumber
          }
        }
      }
    ], 'users');

    return res.status(200).json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error('Delete user error:', error);
    return res.status(500).json({
      error: 'Failed to delete user',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

// =========================================================================
// HANDLER: RESET PASSWORD (POST with action=reset-password)
// =========================================================================

/**
 * Скидає пароль користувача
 * @returns {Promise<Object>} JSON з результатом
 */
async function handleResetPassword(req, res) {
  try {
    const { id, newPassword } = req.body;

    // Валідація вхідних даних
    if (!id) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    if (!newPassword) {
      return res.status(400).json({ error: 'New password is required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        error: 'Password must be at least 6 characters long'
      });
    }

    // Читання користувачів з Users Database
    const usersData = await getValues('Users!A2:F1000', 'users');

    // Пошук користувача за ID
    const userIndex = usersData.findIndex(row => row[0] === id);

    if (userIndex === -1) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Хешування нового пароля
    const newPasswordHash = await bcrypt.hash(newPassword, 12);

    // Оновлення password_hash в Users Database
    const rowNumber = userIndex + 2;
    await updateValues(`Users!C${rowNumber}`, [[newPasswordHash]], 'users');

    return res.status(200).json({
      success: true,
      message: 'Password reset successfully'
    });
  } catch (error) {
    console.error('Reset password error:', error);
    return res.status(500).json({
      error: 'Failed to reset password',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

// =========================================================================
// HANDLER: LIST ROLES (GET with action=roles)
// =========================================================================

/**
 * Отримує список всіх ролей з їх правами
 * @returns {Promise<Object>} JSON зі списком ролей
 */
async function handleListRoles(req, res) {
  try {
    // Читання ролей та прав з Users Database
    const rolesData = await getValues('Roles!A2:E1000', 'users');
    const permissionsData = await getValues('RolePermissions!A2:D10000', 'users');

    // Перетворення в об'єкти з правами
    const roles = rolesData
      .filter(row => row[0])
      .map(row => {
        const roleId = row[0];

        // Знайти всі дозволені права для цієї ролі
        const rolePermissions = permissionsData
          .filter(permRow => permRow[0] === roleId && permRow[2] === 'TRUE')
          .map(permRow => ({
            permission_key: permRow[1],
          }));

        return {
          role_id: roleId,
          role_name: row[1] || '',
          role_description: row[2] || '',
          is_system: row[3] === 'TRUE',
          created_at: row[4] || '',
          permissions: rolePermissions
        };
      });

    return res.status(200).json({
      success: true,
      roles
    });
  } catch (error) {
    console.error('List roles error:', error);
    return res.status(500).json({
      error: 'Failed to list roles',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

// =========================================================================
// HANDLER: GET PERMISSIONS CATALOG (GET with action=permissions-catalog)
// =========================================================================

/**
 * Отримує каталог всіх доступних прав
 * @returns {Promise<Object>} JSON з каталогом прав
 */
async function handleGetPermissionsCatalog(req, res) {
  try {
    // Читання каталогу прав з Users Database
    const catalogData = await getValues('PermissionsCatalog!A2:F1000', 'users');

    // Перетворення в об'єкти
    const permissions = catalogData
      .filter(row => row[0])
      .map(row => ({
        permission_key: row[0] || '',
        permission_label: row[1] || '',
        category: row[2] || '',
        subcategory: row[3] || '',
        description: row[4] || '',
        created_at: row[5] || ''
      }));

    return res.status(200).json({
      success: true,
      permissions
    });
  } catch (error) {
    console.error('Get permissions catalog error:', error);
    return res.status(500).json({
      error: 'Failed to get permissions catalog',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

// =========================================================================
// HANDLER: GET PERMISSION ASSIGNMENTS (GET with action=permissions-assignments)
// =========================================================================

/**
 * Отримує список прав з призначеними ролями
 * @returns {Promise<Object>} JSON з призначеннями прав
 */
async function handleGetPermissionAssignments(req, res) {
  try {
    // Читання каталогу прав та призначень з Users Database
    const catalogData = await getValues('PermissionsCatalog!A2:F1000', 'users');
    const assignmentsData = await getValues('RolePermissions!A2:D10000', 'users');

    // Перетворення в об'єкти з призначеннями
    const permissions = catalogData
      .filter(row => row[0])
      .map(row => {
        const permissionKey = row[0];

        // Знайти всі ролі які мають це право
        const roles = assignmentsData
          .filter(assignRow => assignRow[1] === permissionKey && assignRow[2] === 'TRUE')
          .map(assignRow => assignRow[0]);

        return {
          permission_key: permissionKey,
          permission_label: row[1] || '',
          category: row[2] || '',
          subcategory: row[3] || '',
          description: row[4] || '',
          created_at: row[5] || '',
          assigned_roles: roles
        };
      });

    return res.status(200).json({
      success: true,
      permissions
    });
  } catch (error) {
    console.error('Get permission assignments error:', error);
    return res.status(500).json({
      error: 'Failed to get permission assignments',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

// =========================================================================
// HANDLER: GET USER PERMISSIONS (GET with action=user-permissions&role=X)
// =========================================================================

/**
 * Отримує права для конкретної ролі (публічний доступ, без авторизації)
 * @returns {Promise<Object>} JSON з правами користувача
 */
async function handleGetUserPermissions(req, res) {
  try {
    const { role } = req.query;

    // Валідація ролі
    if (!role) {
      return res.status(400).json({
        error: 'Role parameter is required'
      });
    }

    // Admin має всі права автоматично
    if (role === 'admin') {
      const catalogData = await getValues('PermissionsCatalog!A2:F1000', 'users');
      const allPermissions = catalogData
        .filter(row => row[0])
        .map(row => row[0]);

      return res.status(200).json({
        success: true,
        role: 'admin',
        permissions: allPermissions
      });
    }

    // Для інших ролей - читати з RolePermissions
    const permissionsData = await getValues('RolePermissions!A2:D10000', 'users');

    const userPermissions = permissionsData
      .filter(row => row[0] === role && row[2] === 'TRUE')
      .map(row => row[1]);

    return res.status(200).json({
      success: true,
      role,
      permissions: userPermissions
    });
  } catch (error) {
    console.error('Get user permissions error:', error);
    return res.status(500).json({
      error: 'Failed to get user permissions',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

// =========================================================================
// HANDLER: CREATE PERMISSION (POST with action=create-permission)
// =========================================================================

/**
 * Створює нове право в каталозі
 * @returns {Promise<Object>} JSON з результатом
 */
async function handleCreatePermission(req, res) {
  try {
    const { permission_key, permission_label, category, subcategory, description } = req.body;

    // Валідація вхідних даних
    if (!permission_key || !permission_label || !category) {
      return res.status(400).json({
        error: 'permission_key, permission_label, and category are required'
      });
    }

    // Валідація формату ключа (тільки a-z, 0-9, дефіс, двокрапка)
    if (!/^[a-z0-9:-]+$/.test(permission_key)) {
      return res.status(400).json({
        error: 'permission_key must contain only lowercase letters, numbers, hyphens, and colons'
      });
    }

    // Перевірка унікальності ключа
    const catalogData = await getValues('PermissionsCatalog!A2:F1000', 'users');
    const existingPermission = catalogData.find(row => row[0] === permission_key);

    if (existingPermission) {
      return res.status(409).json({
        error: 'Permission key already exists'
      });
    }

    // Додавання нового права
    const createdAt = new Date().toISOString();
    await appendValues('PermissionsCatalog!A:F', [[
      permission_key,
      permission_label,
      category,
      subcategory || '',
      description || '',
      createdAt
    ]], 'users');

    return res.status(201).json({
      success: true,
      permission: {
        permission_key,
        permission_label,
        category,
        subcategory: subcategory || '',
        description: description || '',
        created_at: createdAt
      }
    });
  } catch (error) {
    console.error('Create permission error:', error);
    return res.status(500).json({
      error: 'Failed to create permission',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

// =========================================================================
// HANDLER: UPDATE PERMISSION (PUT with action=update-permission)
// =========================================================================

/**
 * Оновлює право в каталозі
 * @returns {Promise<Object>} JSON з результатом
 */
async function handleUpdatePermission(req, res) {
  try {
    const { permission_key, permission_label, category, subcategory, description } = req.body;

    // Валідація вхідних даних
    if (!permission_key) {
      return res.status(400).json({
        error: 'permission_key is required'
      });
    }

    // Пошук права
    const catalogData = await getValues('PermissionsCatalog!A2:F1000', 'users');
    const permissionIndex = catalogData.findIndex(row => row[0] === permission_key);

    if (permissionIndex === -1) {
      return res.status(404).json({
        error: 'Permission not found'
      });
    }

    const permissionRow = catalogData[permissionIndex];

    // Підготовка оновлених даних
    const updatedLabel = permission_label || permissionRow[1];
    const updatedCategory = category || permissionRow[2];
    const updatedSubcategory = subcategory !== undefined ? subcategory : (permissionRow[3] || '');
    const updatedDescription = description !== undefined ? description : (permissionRow[4] || '');

    // Оновлення в PermissionsCatalog
    const rowNumber = permissionIndex + 2;
    await updateValues(`PermissionsCatalog!B${rowNumber}:E${rowNumber}`, [[
      updatedLabel,
      updatedCategory,
      updatedSubcategory,
      updatedDescription
    ]], 'users');

    return res.status(200).json({
      success: true,
      permission: {
        permission_key,
        permission_label: updatedLabel,
        category: updatedCategory,
        subcategory: updatedSubcategory,
        description: updatedDescription
      }
    });
  } catch (error) {
    console.error('Update permission error:', error);
    return res.status(500).json({
      error: 'Failed to update permission',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

// =========================================================================
// HANDLER: DELETE PERMISSION (DELETE with action=delete-permission)
// =========================================================================

/**
 * Видаляє право з каталогу та всі його призначення
 * @returns {Promise<Object>} JSON з результатом
 */
async function handleDeletePermission(req, res) {
  try {
    const { permission_key } = req.body;

    // Валідація вхідних даних
    if (!permission_key) {
      return res.status(400).json({
        error: 'permission_key is required'
      });
    }

    // Пошук права в каталозі
    const catalogData = await getValues('PermissionsCatalog!A2:F1000', 'users');
    const permissionIndex = catalogData.findIndex(row => row[0] === permission_key);

    if (permissionIndex === -1) {
      return res.status(404).json({
        error: 'Permission not found'
      });
    }

    // Отримання sheetId для PermissionsCatalog
    const sheets = await getSheetNames('users');
    const catalogSheet = sheets.find(sheet => sheet.title === 'PermissionsCatalog');

    if (!catalogSheet) {
      return res.status(500).json({
        error: 'PermissionsCatalog sheet not found'
      });
    }

    // Видалення рядка з каталогу
    const rowNumber = permissionIndex + 2;
    await batchUpdateSpreadsheet([
      {
        deleteDimension: {
          range: {
            sheetId: catalogSheet.sheetId,
            dimension: 'ROWS',
            startIndex: rowNumber - 1,
            endIndex: rowNumber
          }
        }
      }
    ], 'users');

    // Видалити всі призначення цього права з RolePermissions
    const assignmentsData = await getValues('RolePermissions!A2:D10000', 'users');
    const assignmentIndicesToDelete = [];

    assignmentsData.forEach((row, index) => {
      if (row[1] === permission_key) {
        assignmentIndicesToDelete.push(index + 2); // +2 тому що рядок 1 - заголовки
      }
    });

    // Видалення призначень (якщо є)
    if (assignmentIndicesToDelete.length > 0) {
      const assignmentsSheet = sheets.find(sheet => sheet.title === 'RolePermissions');
      if (assignmentsSheet) {
        const deleteRequests = assignmentIndicesToDelete.reverse().map(rowNum => ({
          deleteDimension: {
            range: {
              sheetId: assignmentsSheet.sheetId,
              dimension: 'ROWS',
              startIndex: rowNum - 1,
              endIndex: rowNum
            }
          }
        }));

        await batchUpdateSpreadsheet(deleteRequests, 'users');
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Permission and all its assignments deleted successfully',
      deleted_assignments: assignmentIndicesToDelete.length
    });
  } catch (error) {
    console.error('Delete permission error:', error);
    return res.status(500).json({
      error: 'Failed to delete permission',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

// =========================================================================
// HANDLER: ASSIGN PERMISSION (POST with action=assign-permission)
// =========================================================================

/**
 * Призначає право ролям (оновлює RolePermissions таблицю)
 * @returns {Promise<Object>} JSON з результатом
 */
async function handleAssignPermission(req, res) {
  try {
    const { permission_key, roles } = req.body;

    // Валідація вхідних даних
    if (!permission_key || !roles || !Array.isArray(roles)) {
      return res.status(400).json({
        error: 'permission_key and roles (array) are required'
      });
    }

    // Перевірка що право існує
    const catalogData = await getValues('PermissionsCatalog!A2:F1000', 'users');
    const permissionExists = catalogData.some(row => row[0] === permission_key);

    if (!permissionExists) {
      return res.status(404).json({
        error: 'Permission not found in catalog'
      });
    }

    // Отримати всі існуючі ролі
    const rolesData = await getValues('Roles!A2:E1000', 'users');
    const validRoles = rolesData.map(row => row[0]);

    // Отримати поточні призначення
    const assignmentsData = await getValues('RolePermissions!A2:D10000', 'users');

    // Підготувати batch оновлення
    const updates = [];

    validRoles.forEach(roleId => {
      const shouldHavePermission = roles.includes(roleId);
      const assignmentIndex = assignmentsData.findIndex(
        row => row[0] === roleId && row[1] === permission_key
      );

      if (assignmentIndex !== -1) {
        // Запис існує - оновити granted
        const rowNumber = assignmentIndex + 2;
        updates.push({
          range: `RolePermissions!C${rowNumber}`,
          values: [[shouldHavePermission ? 'TRUE' : 'FALSE']]
        });
      } else if (shouldHavePermission) {
        // Запису немає, але має бути - додати
        updates.push({
          range: 'RolePermissions!A:D',
          values: [[roleId, permission_key, 'TRUE', new Date().toISOString()]]
        });
      }
    });

    // Виконати всі оновлення
    if (updates.length > 0) {
      // Розділити на update та append операції
      const updateOps = updates.filter(u => !u.range.includes('A:D'));
      const appendOps = updates.filter(u => u.range.includes('A:D'));

      if (updateOps.length > 0) {
        await batchUpdate(updateOps, 'users');
      }

      if (appendOps.length > 0) {
        for (const op of appendOps) {
          await appendValues(op.range, op.values, 'users');
        }
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Permission assignments updated successfully',
      permission_key,
      assigned_roles: roles
    });
  } catch (error) {
    console.error('Assign permission error:', error);
    return res.status(500).json({
      error: 'Failed to assign permission',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

module.exports = corsMiddleware(handler);
