// server/accounts.js

// =========================================================================
// ACCOUNT DATA SERVICE
// =========================================================================
// ПРИЗНАЧЕННЯ:
// Єдина точка читання, валідації та зміни акаунтів у закритому Users sheet.
// Публічний API ніколи не повертає password_hash.
//
// СХЕМА USERS:
// A id, B username, C password_hash, D role, E created_at, F last_login,
// G display_name, H avatar, I menu, J status, K updated_at, L updated_by,
// M password_changed_at, N auth_version.
//
// СУМІСНІСТЬ:
// Старі рядки без J:N вважаються active з auth_version=1.
// =========================================================================

const bcrypt = require('bcryptjs');
const { randomUUID } = require('node:crypto');
const {
  appendValues,
  batchUpdate,
  getValues,
} = require('./utils/google-sheets');
const { requireAccessToken } = require('./utils/auth-guard');

const USERS_RANGE = 'Users!A2:N1000';
const USER_APPEND_RANGE = 'Users!A:N';
const ALLOWED_ROLES = new Set(['admin', 'editor', 'viewer']);
const ALLOWED_STATUSES = new Set(['active', 'disabled']);
const ALLOWED_AVATARS = new Set(['', 'koala', 'otter', 'penguin', 'beaver', 'panda', 'lion']);

class AccountError extends Error {
  constructor(status, message) {
    super(message);
    this.name = 'AccountError';
    this.status = status;
  }
}

function parseAccount(row, index) {
  const authVersion = Number.parseInt(row[13], 10);

  return {
    rowIndex: index + 2,
    id: String(row[0] || '').trim(),
    username: String(row[1] || '').trim(),
    passwordHash: String(row[2] || ''),
    role: normalizeRole(row[3]),
    createdAt: String(row[4] || ''),
    lastLogin: String(row[5] || ''),
    displayName: String(row[6] || '').trim(),
    avatar: normalizeAvatar(row[7]),
    menu: parseSheetBoolean(row[8]),
    status: normalizeStatus(row[9]),
    updatedAt: String(row[10] || ''),
    updatedBy: String(row[11] || ''),
    passwordChangedAt: String(row[12] || ''),
    authVersion: Number.isInteger(authVersion) && authVersion > 0 ? authVersion : 1,
  };
}

function toProfile(account) {
  return {
    id: account.id,
    username: account.username,
    role: account.role,
    display_name: account.displayName || account.username,
    avatar: account.avatar,
    menu: account.menu,
    status: account.status,
    created_at: account.createdAt,
    last_login: account.lastLogin,
  };
}

function toAdminAccount(account) {
  return {
    ...toProfile(account),
    updated_at: account.updatedAt,
    updated_by: account.updatedBy,
    password_changed_at: account.passwordChangedAt,
  };
}

async function loadAccounts() {
  const rows = await getValues(USERS_RANGE, 'users');
  return rows
    .map(parseAccount)
    .filter(account => account.id && account.username);
}

async function findAccountById(id) {
  const accounts = await loadAccounts();
  return accounts.find(account => account.id === id) || null;
}

async function findAccountByUsername(username) {
  const normalized = String(username || '').trim().toLowerCase();
  if (!normalized) return null;

  const accounts = await loadAccounts();
  return accounts.find(account => account.username.toLowerCase() === normalized) || null;
}

async function authenticateAccount(req, res, options = {}) {
  const tokenUser = requireAccessToken(req, res);
  if (!tokenUser) return null;

  const account = await findAccountById(tokenUser.id);
  if (!account || account.status !== 'active') {
    res.status(401).json({ error: 'Account is disabled or no longer exists' });
    return null;
  }

  const tokenVersion = normalizeAuthVersion(tokenUser.authVersion);
  if (tokenVersion !== account.authVersion) {
    res.status(401).json({ error: 'Session is no longer valid' });
    return null;
  }

  if (options.roles && !options.roles.includes(account.role)) {
    res.status(403).json({ error: 'Insufficient permissions' });
    return null;
  }

  req.user = {
    id: account.id,
    username: account.username,
    role: account.role,
    authVersion: account.authVersion,
    type: 'access',
  };

  return account;
}

async function createAccount(input, actor) {
  const username = validateUsername(input.username);
  const password = validatePassword(input.password);
  const role = validateRole(input.role || 'viewer');
  const displayName = validateDisplayName(input.display_name || username);
  const avatar = validateAvatar(input.avatar || '');
  const menu = input.menu === true;

  const accounts = await loadAccounts();
  if (accounts.some(account => account.username.toLowerCase() === username.toLowerCase())) {
    throw new AccountError(409, 'Username already exists');
  }

  const now = new Date().toISOString();
  const account = {
    id: randomUUID(),
    username,
    passwordHash: await bcrypt.hash(password, 12),
    role,
    createdAt: now,
    lastLogin: '',
    displayName,
    avatar,
    menu,
    status: 'active',
    updatedAt: now,
    updatedBy: actor.username,
    passwordChangedAt: now,
    authVersion: 1,
  };

  await appendValues(USER_APPEND_RANGE, [[
    account.id,
    account.username,
    account.passwordHash,
    account.role,
    account.createdAt,
    account.lastLogin,
    account.displayName,
    account.avatar,
    toSheetBoolean(account.menu),
    account.status,
    account.updatedAt,
    account.updatedBy,
    account.passwordChangedAt,
    String(account.authVersion),
  ]], 'users');

  return toAdminAccount(account);
}

async function updateAccount(id, input, actor) {
  const accounts = await loadAccounts();
  const account = accounts.find(item => item.id === id);
  if (!account) throw new AccountError(404, 'Account not found');

  const nextRole = input.role === undefined ? account.role : validateRole(input.role);
  const nextStatus = input.status === undefined ? account.status : validateStatus(input.status);
  const nextDisplayName = input.display_name === undefined
    ? account.displayName
    : validateDisplayName(input.display_name);
  const nextAvatar = input.avatar === undefined ? account.avatar : validateAvatar(input.avatar);
  const nextMenu = input.menu === undefined ? account.menu : input.menu === true;

  if (account.id === actor.id && (nextRole !== 'admin' || nextStatus !== 'active')) {
    throw new AccountError(409, 'You cannot demote or disable your own admin account');
  }

  const removesActiveAdmin = account.role === 'admin'
    && account.status === 'active'
    && (nextRole !== 'admin' || nextStatus !== 'active');

  if (removesActiveAdmin) {
    const activeAdmins = accounts.filter(item => item.role === 'admin' && item.status === 'active');
    if (activeAdmins.length <= 1) {
      throw new AccountError(409, 'At least one active administrator is required');
    }
  }

  const securityChanged = nextRole !== account.role || nextStatus !== account.status;
  const now = new Date().toISOString();
  const authVersion = securityChanged ? account.authVersion + 1 : account.authVersion;

  await batchUpdate([
    { range: `Users!D${account.rowIndex}`, values: [[nextRole]] },
    {
      range: `Users!G${account.rowIndex}:J${account.rowIndex}`,
      values: [[nextDisplayName, nextAvatar, toSheetBoolean(nextMenu), nextStatus]],
    },
    {
      range: `Users!K${account.rowIndex}:L${account.rowIndex}`,
      values: [[now, actor.username]],
    },
    { range: `Users!N${account.rowIndex}`, values: [[String(authVersion)]] },
  ], 'users');

  return toAdminAccount({
    ...account,
    role: nextRole,
    displayName: nextDisplayName,
    avatar: nextAvatar,
    menu: nextMenu,
    status: nextStatus,
    updatedAt: now,
    updatedBy: actor.username,
    authVersion,
  });
}

async function updateProfile(account, input) {
  const displayName = input.display_name === undefined
    ? account.displayName
    : validateDisplayName(input.display_name);
  const avatar = input.avatar === undefined ? account.avatar : validateAvatar(input.avatar);
  const menu = input.menu === undefined ? account.menu : input.menu === true;
  const now = new Date().toISOString();

  await batchUpdate([
    {
      range: `Users!G${account.rowIndex}:I${account.rowIndex}`,
      values: [[displayName, avatar, toSheetBoolean(menu)]],
    },
    {
      range: `Users!K${account.rowIndex}:L${account.rowIndex}`,
      values: [[now, account.username]],
    },
  ], 'users');

  return toProfile({
    ...account,
    displayName,
    avatar,
    menu,
    updatedAt: now,
    updatedBy: account.username,
  });
}

async function changePassword(account, currentPassword, newPassword) {
  if (!currentPassword) throw new AccountError(400, 'Current password is required');
  const password = validatePassword(newPassword);

  const matches = await bcrypt.compare(currentPassword, account.passwordHash);
  if (!matches) throw new AccountError(401, 'Current password is incorrect');

  await writePassword(account, password, account.username);
}

async function resetPassword(id, newPassword, actor) {
  const account = await findAccountById(id);
  if (!account) throw new AccountError(404, 'Account not found');

  const password = validatePassword(newPassword);
  await writePassword(account, password, actor.username);
}

async function writePassword(account, password, updatedBy) {
  const now = new Date().toISOString();
  const hash = await bcrypt.hash(password, 12);
  const nextAuthVersion = account.authVersion + 1;

  await batchUpdate([
    { range: `Users!C${account.rowIndex}`, values: [[hash]] },
    {
      range: `Users!K${account.rowIndex}:N${account.rowIndex}`,
      values: [[now, updatedBy, now, String(nextAuthVersion)]],
    },
  ], 'users');
}

function validateUsername(value) {
  const username = String(value || '').trim().toLowerCase();
  if (!/^[a-z0-9._-]{3,40}$/.test(username)) {
    throw new AccountError(400, 'Username must be 3-40 characters: a-z, 0-9, dot, dash or underscore');
  }
  return username;
}

function validatePassword(value) {
  const password = String(value || '');
  const byteLength = Buffer.byteLength(password, 'utf8');

  if (password.length < 10) {
    throw new AccountError(400, 'Password must be at least 10 characters long');
  }
  if (byteLength > 72) {
    throw new AccountError(400, 'Password must not exceed 72 UTF-8 bytes');
  }
  return password;
}

function validateDisplayName(value) {
  const displayName = String(value || '').trim();
  if (!displayName || displayName.length > 80) {
    throw new AccountError(400, 'Display name is required and must not exceed 80 characters');
  }
  return displayName;
}

function validateRole(value) {
  const role = normalizeRole(value);
  if (!ALLOWED_ROLES.has(role)) {
    throw new AccountError(400, 'Role must be admin, editor or viewer');
  }
  return role;
}

function validateStatus(value) {
  const status = normalizeStatus(value);
  if (!ALLOWED_STATUSES.has(status)) {
    throw new AccountError(400, 'Status must be active or disabled');
  }
  return status;
}

function validateAvatar(value) {
  const avatar = normalizeAvatar(value);
  if (!ALLOWED_AVATARS.has(avatar)) {
    throw new AccountError(400, 'Unknown avatar');
  }
  return avatar;
}

function normalizeRole(value) {
  return String(value || 'viewer').trim().toLowerCase();
}

function normalizeStatus(value) {
  return String(value || 'active').trim().toLowerCase();
}

function normalizeAvatar(value) {
  return String(value || '').trim().toLowerCase();
}

function normalizeAuthVersion(value) {
  const version = Number.parseInt(value, 10);
  return Number.isInteger(version) && version > 0 ? version : 1;
}

function parseSheetBoolean(value) {
  return value === true || String(value || '').trim().toUpperCase() === 'TRUE';
}

function toSheetBoolean(value) {
  return value ? 'TRUE' : 'FALSE';
}

module.exports = {
  AccountError,
  authenticateAccount,
  changePassword,
  createAccount,
  findAccountById,
  findAccountByUsername,
  loadAccounts,
  resetPassword,
  toAdminAccount,
  toProfile,
  updateAccount,
  updateProfile,
  validatePassword,
};
