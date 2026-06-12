// server/access-policy.js

// =========================================================================
// BACKEND ACCESS POLICY
// =========================================================================
// Central source of truth for supported roles and backend capabilities.
// Endpoint guards must fail closed: an unknown role has no capabilities.
// =========================================================================

const ROLES = Object.freeze({
  ADMIN: 'admin',
  EDITOR: 'editor',
  VIEWER: 'viewer',
});

const CAPABILITIES = Object.freeze({
  ACCOUNTS_MANAGE: 'accounts.manage',
  DRIVE_READ: 'drive.read',
  DRIVE_WRITE: 'drive.write',
  SHEETS_READ: 'sheets.read',
  SHEETS_WRITE: 'sheets.write',
});

const ROLE_CAPABILITIES = Object.freeze({
  [ROLES.ADMIN]: Object.freeze(Object.values(CAPABILITIES)),
  [ROLES.EDITOR]: Object.freeze([
    CAPABILITIES.DRIVE_READ,
    CAPABILITIES.DRIVE_WRITE,
    CAPABILITIES.SHEETS_READ,
    CAPABILITIES.SHEETS_WRITE,
  ]),
  [ROLES.VIEWER]: Object.freeze([
    CAPABILITIES.DRIVE_READ,
    CAPABILITIES.SHEETS_READ,
  ]),
});

function isKnownRole(role) {
  return Object.hasOwn(ROLE_CAPABILITIES, role);
}

function getCapabilities(role) {
  return isKnownRole(role) ? [...ROLE_CAPABILITIES[role]] : [];
}

function hasCapability(role, capability) {
  return isKnownRole(role) && ROLE_CAPABILITIES[role].includes(capability);
}

module.exports = {
  CAPABILITIES,
  ROLES,
  getCapabilities,
  hasCapability,
  isKnownRole,
};
