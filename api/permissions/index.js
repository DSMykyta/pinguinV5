// api/permissions/index.js

// =========================================================================
// PERMISSIONS API - ПОВНЕ УПРАВЛІННЯ ПРАВАМИ
// =========================================================================
// ПРИЗНАЧЕННЯ:
// Повний CRUD для прав доступу (PermissionsCatalog) + управління призначеннями (RolePermissions).
//
// ЕНДПОІНТИ:
// --- CATALOG (сами права) ---
// GET    /api/permissions?action=list          → список всіх прав з каталогу
// POST   /api/permissions { action: 'create' } → створити нове право
// PUT    /api/permissions { action: 'update' } → оновити право
// DELETE /api/permissions                      → видалити право
//
// --- ASSIGNMENTS (призначення прав ролям) ---
// GET    /api/permissions?action=assignments   → список прав з роллями
// PUT    /api/permissions { action: 'assign' } → призначити право роллям
//
// --- USER PERMISSIONS (для фронтенду) ---
// GET    /api/permissions?action=user-permissions&role=viewer → список прав для ролі (без авторизації)
//
// GOOGLE SHEETS ТАБЛИЦІ:
// - PermissionsCatalog: permission_key | permission_label | category | subcategory | description | created_at
// - RolePermissions: role_id | permission_key | granted
// =========================================================================

const { corsMiddleware } = require('../utils/cors');
const { verifyToken, extractTokenFromHeader } = require('../utils/jwt');
const { getValues, updateValues, appendValues } = require('../utils/google-sheets');

// =========================================================================
// MAIN ROUTER
// =========================================================================

async function handler(req, res) {
  try {
    // GET requests
    if (req.method === 'GET') {
      const { action } = req.query || {};

      // Публічний endpoint для отримання прав користувача (не потрібна авторизація)
      if (action === 'user-permissions') {
        return await handleGetUserPermissions(req, res);
      }

      // Решта GET endpoints потребують admin права
      const authCheck = await checkAdminAuth(req);
      if (!authCheck.authorized) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: authCheck.message
        });
      }

      if (action === 'assignments') {
        // GET /api/permissions?action=assignments - список прав з роллями
        return await handleListPermissionAssignments(req, res);
      } else {
        // GET /api/permissions?action=list - список прав з каталогу (за замовчуванням)
        return await handleListPermissions(req, res);
      }
    }

    // Перевірка авторизації для POST/PUT/DELETE (тільки admin має доступ)
    const authCheck = await checkAdminAuth(req);
    if (!authCheck.authorized) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: authCheck.message
      });
    }

    // POST requests
    if (req.method === 'POST') {
      const { action } = req.body || {};

      if (action === 'create') {
        // POST /api/permissions { action: 'create' } - створити нове право
        return await handleCreatePermission(req, res);
      } else {
        return res.status(400).json({ error: 'Invalid action. Use "create"' });
      }
    }

    // PUT requests
    if (req.method === 'PUT') {
      const { action } = req.body || {};

      if (action === 'update') {
        // PUT /api/permissions { action: 'update' } - оновити право
        return await handleUpdatePermission(req, res);
      } else if (action === 'assign') {
        // PUT /api/permissions { action: 'assign' } - призначити право роллям
        return await handleAssignPermission(req, res);
      } else {
        return res.status(400).json({ error: 'Invalid action. Use "update" or "assign"' });
      }
    }

    // DELETE requests
    if (req.method === 'DELETE') {
      // DELETE /api/permissions - видалити право
      return await handleDeletePermission(req, res);
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
// HANDLER: LIST PERMISSIONS (Каталог прав)
// =========================================================================

async function handleListPermissions(req, res) {
  try {
    // Читання таблиці PermissionsCatalog (A=key, B=label, C=category, D=subcategory, E=description, F=created_at)
    const catalogData = await getValues('PermissionsCatalog!A2:F1000', 'users');

    // Побудувати масив прав
    const permissions = catalogData
      .filter(row => row[0]) // Тільки рядки з permission_key
      .map(row => ({
        permission_key: row[0],
        permission_label: row[1] || '',
        category: row[2] || '',
        subcategory: row[3] || null,
        description: row[4] || '',
        created_at: row[5] || ''
      }));

    return res.status(200).json({
      success: true,
      permissions
    });
  } catch (error) {
    console.error('Error listing permissions:', error);
    return res.status(500).json({
      error: 'Failed to list permissions',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

// =========================================================================
// HANDLER: LIST PERMISSION ASSIGNMENTS (Права з роллями)
// =========================================================================

async function handleListPermissionAssignments(req, res) {
  try {
    // Читання каталогу прав
    const catalogData = await getValues('PermissionsCatalog!A2:F1000', 'users');

    // Читання призначень (A=role_id, B=permission_key, C=granted)
    const assignmentsData = await getValues('RolePermissions!A2:C1000', 'users');

    // Побудувати масив прав з роллями
    const permissions = catalogData
      .filter(row => row[0]) // Тільки рядки з permission_key
      .map(row => {
        const permissionKey = row[0];

        // Знайти всі ролі які мають це право
        const roles = assignmentsData
          .filter(assignRow => assignRow[1] === permissionKey && assignRow[2] === 'TRUE')
          .map(assignRow => assignRow[0]); // role_id

        return {
          permission_key: permissionKey,
          permission_label: row[1] || '',
          category: row[2] || '',
          subcategory: row[3] || null,
          description: row[4] || '',
          roles: roles
        };
      });

    return res.status(200).json({
      success: true,
      permissions
    });
  } catch (error) {
    console.error('Error listing permission assignments:', error);
    return res.status(500).json({
      error: 'Failed to list permission assignments',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

// =========================================================================
// HANDLER: CREATE PERMISSION
// =========================================================================

async function handleCreatePermission(req, res) {
  try {
    const { permission_key, permission_label, category, subcategory, description } = req.body;

    // Валідація
    if (!permission_key || !permission_label || !category) {
      return res.status(400).json({ error: 'Missing required fields: permission_key, permission_label, category' });
    }

    // Перевірити чи не існує вже таке право
    const catalogData = await getValues('PermissionsCatalog!A2:F1000', 'users');
    const exists = catalogData.some(row => row[0] === permission_key);

    if (exists) {
      return res.status(409).json({ error: 'Permission already exists' });
    }

    // Додати новий рядок
    const newRow = [
      permission_key,
      permission_label,
      category,
      subcategory || '',
      description || '',
      new Date().toISOString()
    ];

    await appendValues('PermissionsCatalog!A2:F2', [newRow], 'users');

    return res.status(201).json({
      success: true,
      message: 'Permission created successfully',
      permission: {
        permission_key,
        permission_label,
        category,
        subcategory: subcategory || null,
        description: description || ''
      }
    });
  } catch (error) {
    console.error('Error creating permission:', error);
    return res.status(500).json({
      error: 'Failed to create permission',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

// =========================================================================
// HANDLER: UPDATE PERMISSION
// =========================================================================

async function handleUpdatePermission(req, res) {
  try {
    const { permission_key, permission_label, category, subcategory, description } = req.body;

    if (!permission_key) {
      return res.status(400).json({ error: 'Missing permission_key' });
    }

    // Читання каталогу
    const catalogData = await getValues('PermissionsCatalog!A2:F1000', 'users');

    // Знайти індекс права
    const index = catalogData.findIndex(row => row[0] === permission_key);

    if (index === -1) {
      return res.status(404).json({ error: 'Permission not found' });
    }

    // Оновити дані (зберігаємо created_at)
    catalogData[index] = [
      permission_key,
      permission_label || catalogData[index][1],
      category || catalogData[index][2],
      subcategory !== undefined ? subcategory : catalogData[index][3],
      description !== undefined ? description : catalogData[index][4],
      catalogData[index][5] // created_at
    ];

    // Записати назад
    await updateValues('PermissionsCatalog!A2:F1000', catalogData, 'users');

    return res.status(200).json({
      success: true,
      message: 'Permission updated successfully'
    });
  } catch (error) {
    console.error('Error updating permission:', error);
    return res.status(500).json({
      error: 'Failed to update permission',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

// =========================================================================
// HANDLER: DELETE PERMISSION
// =========================================================================

async function handleDeletePermission(req, res) {
  try {
    const { permission_key } = req.body;

    if (!permission_key) {
      return res.status(400).json({ error: 'Missing permission_key' });
    }

    // Читання каталогу
    const catalogData = await getValues('PermissionsCatalog!A2:F1000', 'users');

    // Видалити право
    const filteredCatalog = catalogData.filter(row => row[0] !== permission_key);

    if (filteredCatalog.length === catalogData.length) {
      return res.status(404).json({ error: 'Permission not found' });
    }

    // Також видалити всі призначення цього права
    const assignmentsData = await getValues('RolePermissions!A2:C1000', 'users');
    const filteredAssignments = assignmentsData.filter(row => row[1] !== permission_key);

    // Записати назад
    await updateValues('PermissionsCatalog!A2:F1000', filteredCatalog, 'users');
    await updateValues('RolePermissions!A2:C1000', filteredAssignments, 'users');

    return res.status(200).json({
      success: true,
      message: 'Permission deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting permission:', error);
    return res.status(500).json({
      error: 'Failed to delete permission',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

// =========================================================================
// HANDLER: ASSIGN PERMISSION (Призначити право роллям)
// =========================================================================

async function handleAssignPermission(req, res) {
  try {
    const { permission_key, roles } = req.body;

    if (!permission_key) {
      return res.status(400).json({ error: 'Missing permission_key' });
    }

    if (!Array.isArray(roles)) {
      return res.status(400).json({ error: 'roles must be an array' });
    }

    // Перевірити чи існує таке право
    const catalogData = await getValues('PermissionsCatalog!A2:F1000', 'users');
    const permissionExists = catalogData.some(row => row[0] === permission_key);

    if (!permissionExists) {
      return res.status(404).json({ error: 'Permission not found in catalog' });
    }

    // Читання всіх призначень
    const assignmentsData = await getValues('RolePermissions!A2:C1000', 'users');

    // Видалити всі рядки для цього permission_key
    const filteredAssignments = assignmentsData.filter(row => row[1] !== permission_key);

    // Додати нові рядки для обраних ролей
    const newRows = roles.map(roleId => [
      roleId,           // A: role_id
      permission_key,   // B: permission_key
      'TRUE'            // C: granted
    ]);

    // Об'єднати
    const updatedAssignments = [...filteredAssignments, ...newRows];

    // Записати назад
    await updateValues('RolePermissions!A2:C1000', updatedAssignments, 'users');

    return res.status(200).json({
      success: true,
      message: 'Permission assigned successfully'
    });
  } catch (error) {
    console.error('Error assigning permission:', error);
    return res.status(500).json({
      error: 'Failed to assign permission',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

// =========================================================================
// HANDLER: GET USER PERMISSIONS (Публічний endpoint)
// =========================================================================

async function handleGetUserPermissions(req, res) {
  try {
    const { role } = req.query || {};

    if (!role) {
      return res.status(400).json({ error: 'Missing role parameter' });
    }

    // Читання таблиці RolePermissions (A=role_id, B=permission_key, C=granted)
    const assignmentsData = await getValues('RolePermissions!A2:C1000', 'users');

    // Фільтрувати права для цієї ролі (де granted=TRUE)
    const permissions = assignmentsData
      .filter(row => row[0] === role && row[2] === 'TRUE')
      .map(row => row[1]); // permission_key

    return res.status(200).json({
      success: true,
      role,
      permissions
    });
  } catch (error) {
    console.error('Error getting user permissions:', error);
    return res.status(500).json({
      error: 'Failed to get user permissions',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

// =========================================================================
// EXPORT
// =========================================================================

module.exports = async (req, res) => {
  return corsMiddleware(req, res, () => handler(req, res));
};
