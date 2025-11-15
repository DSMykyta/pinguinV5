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
  const startTime = Date.now();
  try {
    console.log('📥 Завантаження каталогу прав...');

    // Читання таблиці PermissionsCatalog (A=key, B=label, C=category, D=subcategory, E=description, F=created_at)
    console.log('🔍 Спроба читання PermissionsCatalog!A2:F10000 з users spreadsheet...');

    let catalogData;
    try {
      catalogData = await getValues('PermissionsCatalog!A2:F10000', 'users');
      const elapsed = Date.now() - startTime;
      console.log(`✅ Отримано ${catalogData?.length || 0} рядків з Google Sheets за ${elapsed}ms`);
    } catch (sheetsError) {
      const elapsed = Date.now() - startTime;
      console.error(`❌ Помилка Google Sheets API (${elapsed}ms):`, sheetsError.message);
      return res.status(500).json({
        error: 'Failed to access Google Sheets',
        details: sheetsError.message,
        elapsed: `${elapsed}ms`
      });
    }

    if (!catalogData || !Array.isArray(catalogData)) {
      console.error('❌ catalogData не є масивом:', typeof catalogData);
      return res.status(500).json({ error: 'Invalid data from Google Sheets' });
    }

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

    const totalElapsed = Date.now() - startTime;
    console.log(`✅ Завантажено ${permissions.length} прав з каталогу за ${totalElapsed}ms`);

    return res.status(200).json({
      success: true,
      permissions
    });
  } catch (error) {
    const elapsed = Date.now() - startTime;
    console.error(`❌ Error listing permissions (${elapsed}ms):`, error.message);
    return res.status(500).json({
      error: 'Failed to list permissions',
      details: error.message,
      elapsed: `${elapsed}ms`
    });
  }
}

// =========================================================================
// HANDLER: LIST PERMISSION ASSIGNMENTS (Права з роллями)
// =========================================================================

async function handleListPermissionAssignments(req, res) {
  const startTime = Date.now();
  try {
    console.log('📥 Завантаження призначень прав...');

    // Читання каталогу прав
    console.log('🔍 Спроба читання PermissionsCatalog...');
    let catalogData;
    try {
      catalogData = await getValues('PermissionsCatalog!A2:F10000', 'users');
      const elapsed = Date.now() - startTime;
      console.log(`✅ Отримано ${catalogData?.length || 0} прав з каталогу за ${elapsed}ms`);
    } catch (sheetsError) {
      const elapsed = Date.now() - startTime;
      console.error(`❌ Помилка читання PermissionsCatalog (${elapsed}ms):`, sheetsError.message);
      return res.status(500).json({
        error: 'Failed to access PermissionsCatalog',
        details: sheetsError.message,
        elapsed: `${elapsed}ms`
      });
    }

    // Читання призначень
    console.log('🔍 Спроба читання RolePermissions...');
    let assignmentsData;
    try {
      assignmentsData = await getValues('RolePermissions!A2:C10000', 'users');
      const elapsed = Date.now() - startTime;
      console.log(`✅ Отримано ${assignmentsData?.length || 0} призначень за ${elapsed}ms`);
    } catch (sheetsError) {
      const elapsed = Date.now() - startTime;
      console.error(`❌ Помилка читання RolePermissions (${elapsed}ms):`, sheetsError.message);
      return res.status(500).json({
        error: 'Failed to access RolePermissions',
        details: sheetsError.message,
        elapsed: `${elapsed}ms`
      });
    }

    if (!catalogData || !Array.isArray(catalogData)) {
      console.error('❌ catalogData не є масивом');
      return res.status(500).json({ error: 'Invalid catalog data from Google Sheets' });
    }

    if (!assignmentsData || !Array.isArray(assignmentsData)) {
      console.error('❌ assignmentsData не є масивом');
      return res.status(500).json({ error: 'Invalid assignments data from Google Sheets' });
    }

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

    const totalElapsed = Date.now() - startTime;
    console.log(`✅ Завантажено ${permissions.length} прав з призначеннями за ${totalElapsed}ms`);

    return res.status(200).json({
      success: true,
      permissions
    });
  } catch (error) {
    const elapsed = Date.now() - startTime;
    console.error(`❌ Error listing permission assignments (${elapsed}ms):`, error.message);
    return res.status(500).json({
      error: 'Failed to list permission assignments',
      details: error.message,
      elapsed: `${elapsed}ms`
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

    console.log(`➕ Створення нового права: ${permission_key}`);

    // Перевірити чи не існує вже таке право
    const catalogData = await getValues('PermissionsCatalog!A2:F10000', 'users');
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

    console.log(`✅ Створено право: ${permission_key}`);

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
    return res.status(500).json({ error: 'Failed to create permission' });
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

    console.log(`🔄 Оновлення права: ${permission_key}`);

    // Читання каталогу
    const catalogData = await getValues('PermissionsCatalog!A2:F10000', 'users');

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
    await updateValues('PermissionsCatalog!A2:F10000', catalogData, 'users');

    console.log(`✅ Оновлено право: ${permission_key}`);

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
// HANDLER: DELETE PERMISSION
// =========================================================================

async function handleDeletePermission(req, res) {
  try {
    const { permission_key } = req.body;

    if (!permission_key) {
      return res.status(400).json({ error: 'Missing permission_key' });
    }

    console.log(`🗑️ Видалення права: ${permission_key}`);

    // Читання каталогу
    const catalogData = await getValues('PermissionsCatalog!A2:F10000', 'users');

    // Видалити право
    const filteredCatalog = catalogData.filter(row => row[0] !== permission_key);

    if (filteredCatalog.length === catalogData.length) {
      return res.status(404).json({ error: 'Permission not found' });
    }

    // Також видалити всі призначення цього права
    const assignmentsData = await getValues('RolePermissions!A2:C10000', 'users');
    const filteredAssignments = assignmentsData.filter(row => row[1] !== permission_key);

    // Записати назад
    await updateValues('PermissionsCatalog!A2:F10000', filteredCatalog, 'users');
    await updateValues('RolePermissions!A2:C10000', filteredAssignments, 'users');

    console.log(`✅ Видалено право: ${permission_key}`);

    return res.status(200).json({
      success: true,
      message: 'Permission deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting permission:', error);
    return res.status(500).json({ error: 'Failed to delete permission' });
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

    console.log(`🔄 Призначення права ${permission_key} роллям:`, roles);

    // Перевірити чи існує таке право
    const catalogData = await getValues('PermissionsCatalog!A2:F10000', 'users');
    const permissionExists = catalogData.some(row => row[0] === permission_key);

    if (!permissionExists) {
      return res.status(404).json({ error: 'Permission not found in catalog' });
    }

    // Читання всіх призначень
    const assignmentsData = await getValues('RolePermissions!A2:C10000', 'users');

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
    await updateValues('RolePermissions!A2:C10000', updatedAssignments, 'users');

    console.log(`✅ Призначено право ${permission_key}`);

    return res.status(200).json({
      success: true,
      message: 'Permission assigned successfully'
    });
  } catch (error) {
    console.error('Error assigning permission:', error);
    return res.status(500).json({ error: 'Failed to assign permission' });
  }
}

// =========================================================================
// HANDLER: GET USER PERMISSIONS (Публічний endpoint)
// =========================================================================

async function handleGetUserPermissions(req, res) {
  const startTime = Date.now();
  try {
    const { role } = req.query || {};

    if (!role) {
      return res.status(400).json({ error: 'Missing role parameter' });
    }

    console.log(`📥 Завантаження прав для ролі: ${role}`);
    console.log('🔍 Спроба читання RolePermissions!A2:C10000 з users spreadsheet...');

    let assignmentsData;
    try {
      assignmentsData = await getValues('RolePermissions!A2:C10000', 'users');
      const elapsed = Date.now() - startTime;
      console.log(`✅ Отримано ${assignmentsData?.length || 0} рядків призначень за ${elapsed}ms`);
    } catch (sheetsError) {
      const elapsed = Date.now() - startTime;
      console.error(`❌ Помилка Google Sheets API (${elapsed}ms):`, sheetsError.message);
      return res.status(500).json({
        error: 'Failed to access Google Sheets',
        details: sheetsError.message,
        elapsed: `${elapsed}ms`
      });
    }

    if (!assignmentsData || !Array.isArray(assignmentsData)) {
      console.error('❌ assignmentsData не є масивом:', typeof assignmentsData);
      return res.status(500).json({ error: 'Invalid data from Google Sheets' });
    }

    // Фільтрувати права для цієї ролі (де granted=TRUE)
    const permissions = assignmentsData
      .filter(row => row[0] === role && row[2] === 'TRUE')
      .map(row => row[1]); // permission_key

    const totalElapsed = Date.now() - startTime;
    console.log(`✅ Знайдено ${permissions.length} прав для ролі ${role} за ${totalElapsed}ms`);

    return res.status(200).json({
      success: true,
      role,
      permissions
    });
  } catch (error) {
    const elapsed = Date.now() - startTime;
    console.error(`❌ Error getting user permissions (${elapsed}ms):`, error.message);
    return res.status(500).json({
      error: 'Failed to get user permissions',
      details: error.message,
      elapsed: `${elapsed}ms`
    });
  }
}

// =========================================================================
// EXPORT
// =========================================================================

module.exports = async (req, res) => {
  return corsMiddleware(req, res, () => handler(req, res));
};
