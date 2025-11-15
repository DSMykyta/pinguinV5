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
  // Перевірка авторизації для всіх операцій
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
      } else if (action === 'create-role') {
        return await handleCreateRole(req, res);
      } else {
        return res.status(400).json({ error: 'Invalid action for POST request' });
      }

    } else if (req.method === 'PUT') {
      const { action } = req.body;

      // Роутинг PUT запитів за action параметром
      if (!action) {
        return await handleUpdate(req, res);
      } else if (action === 'update-role') {
        return await handleUpdateRole(req, res);
      } else {
        return res.status(400).json({ error: 'Invalid action for PUT request' });
      }

    } else if (req.method === 'DELETE') {
      const { action } = req.body;

      // Роутинг DELETE запитів за action параметром
      if (!action) {
        return await handleDelete(req, res);
      } else if (action === 'delete-role') {
        return await handleDeleteRole(req, res);
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
// HANDLER: CREATE ROLE (POST with action=create-role)
// =========================================================================

/**
 * Створює нову роль
 * @returns {Promise<Object>} JSON з результатом
 */
async function handleCreateRole(req, res) {
  try {
    const { roleId, roleName, roleDescription, permissions } = req.body;

    // Валідація вхідних даних
    if (!roleId || !roleName) {
      return res.status(400).json({
        error: 'roleId and roleName are required'
      });
    }

    // Валідація формату roleId (тільки a-z, 0-9, дефіс)
    if (!/^[a-z0-9-]+$/.test(roleId)) {
      return res.status(400).json({
        error: 'roleId must contain only lowercase letters, numbers, and hyphens'
      });
    }

    // Перевірка унікальності roleId
    const rolesData = await getValues('Roles!A2:E1000', 'users');
    const existingRole = rolesData.find(row => row[0] === roleId);

    if (existingRole) {
      return res.status(409).json({
        error: 'Role ID already exists'
      });
    }

    // Додавання нової ролі
    const createdAt = new Date().toISOString();
    await appendValues('Roles!A:E', [[
      roleId,
      roleName,
      roleDescription || '',
      'FALSE', // is_system = FALSE для користувацьких ролей
      createdAt
    ]], 'users');

    // Додати permissions для цієї ролі якщо передані
    if (permissions && Array.isArray(permissions) && permissions.length > 0) {
      const permissionRows = permissions.map(permKey => [
        roleId,
        permKey,
        'TRUE',
        createdAt
      ]);

      for (const row of permissionRows) {
        await appendValues('RolePermissions!A:D', [row], 'users');
      }
    }

    return res.status(201).json({
      success: true,
      role: {
        role_id: roleId,
        role_name: roleName,
        role_description: roleDescription || '',
        is_system: false,
        created_at: createdAt,
        permissions: permissions || []
      }
    });
  } catch (error) {
    console.error('Create role error:', error);
    return res.status(500).json({
      error: 'Failed to create role',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

// =========================================================================
// HANDLER: UPDATE ROLE (PUT with action=update-role)
// =========================================================================

/**
 * Оновлює роль
 * @returns {Promise<Object>} JSON з результатом
 */
async function handleUpdateRole(req, res) {
  try {
    const { roleId, roleName, roleDescription, permissions } = req.body;

    // Валідація вхідних даних
    if (!roleId) {
      return res.status(400).json({
        error: 'roleId is required'
      });
    }

    // Пошук ролі
    const rolesData = await getValues('Roles!A2:E1000', 'users');
    const roleIndex = rolesData.findIndex(row => row[0] === roleId);

    if (roleIndex === -1) {
      return res.status(404).json({
        error: 'Role not found'
      });
    }

    const roleRow = rolesData[roleIndex];

    // Перевірити чи це не системна роль
    if (roleRow[3] === 'TRUE') {
      return res.status(403).json({
        error: 'Cannot modify system role'
      });
    }

    // Підготовка оновлених даних
    const updatedName = roleName || roleRow[1];
    const updatedDescription = roleDescription !== undefined ? roleDescription : (roleRow[2] || '');

    // Оновлення ролі в Roles
    const rowNumber = roleIndex + 2;
    await updateValues(`Roles!B${rowNumber}:C${rowNumber}`, [[
      updatedName,
      updatedDescription
    ]], 'users');

    // Оновити permissions якщо передані
    if (permissions && Array.isArray(permissions)) {
      // Видалити всі старі permissions для цієї ролі
      const assignmentsData = await getValues('RolePermissions!A2:D10000', 'users');
      const assignmentIndicesToDelete = [];

      assignmentsData.forEach((row, index) => {
        if (row[0] === roleId) {
          assignmentIndicesToDelete.push(index + 2);
        }
      });

      // Видалити старі призначення
      if (assignmentIndicesToDelete.length > 0) {
        const sheets = await getSheetNames('users');
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

      // Додати нові permissions
      if (permissions.length > 0) {
        const createdAt = new Date().toISOString();
        const permissionRows = permissions.map(permKey => [
          roleId,
          permKey,
          'TRUE',
          createdAt
        ]);

        for (const row of permissionRows) {
          await appendValues('RolePermissions!A:D', [row], 'users');
        }
      }
    }

    return res.status(200).json({
      success: true,
      role: {
        role_id: roleId,
        role_name: updatedName,
        role_description: updatedDescription,
        permissions: permissions || []
      }
    });
  } catch (error) {
    console.error('Update role error:', error);
    return res.status(500).json({
      error: 'Failed to update role',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

// =========================================================================
// HANDLER: DELETE ROLE (DELETE with action=delete-role)
// =========================================================================

/**
 * Видаляє роль та всі її призначення
 * @returns {Promise<Object>} JSON з результатом
 */
async function handleDeleteRole(req, res) {
  try {
    const { roleId } = req.body;

    // Валідація вхідних даних
    if (!roleId) {
      return res.status(400).json({
        error: 'roleId is required'
      });
    }

    // Пошук ролі
    const rolesData = await getValues('Roles!A2:E1000', 'users');
    const roleIndex = rolesData.findIndex(row => row[0] === roleId);

    if (roleIndex === -1) {
      return res.status(404).json({
        error: 'Role not found'
      });
    }

    const roleRow = rolesData[roleIndex];

    // Перевірити чи це не системна роль
    if (roleRow[3] === 'TRUE') {
      return res.status(403).json({
        error: 'Cannot delete system role'
      });
    }

    // Перевірити що немає користувачів з цією роллю
    const usersData = await getValues('Users!A2:H1000', 'users');
    const usersWithRole = usersData.filter(row => row[3] === roleId);

    if (usersWithRole.length > 0) {
      return res.status(409).json({
        error: `Cannot delete role. ${usersWithRole.length} user(s) have this role.`
      });
    }

    // Отримання sheetId
    const sheets = await getSheetNames('users');
    const rolesSheet = sheets.find(sheet => sheet.title === 'Roles');

    if (!rolesSheet) {
      return res.status(500).json({
        error: 'Roles sheet not found'
      });
    }

    // Видалення ролі
    const rowNumber = roleIndex + 2;
    await batchUpdateSpreadsheet([
      {
        deleteDimension: {
          range: {
            sheetId: rolesSheet.sheetId,
            dimension: 'ROWS',
            startIndex: rowNumber - 1,
            endIndex: rowNumber
          }
        }
      }
    ], 'users');

    return res.status(200).json({
      success: true,
      message: 'Role deleted successfully'
    });
  } catch (error) {
    console.error('Delete role error:', error);
    return res.status(500).json({
      error: 'Failed to delete role',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

module.exports = corsMiddleware(handler);
