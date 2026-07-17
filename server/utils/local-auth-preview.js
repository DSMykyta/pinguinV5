// Explicit local-only authentication bypass for interface verification.
// It requires both the environment flag and a loopback Host header, and is
// disabled for every Vercel Preview/Production deployment.

const { getCapabilities } = require('../access-policy');

const LOCAL_AUTH_PREVIEW_TOKEN = 'local-auth-preview';
const BLOCKED_VERCEL_ENVS = new Set(['preview', 'production']);
const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '::1']);

function firstHeaderValue(value) {
  const header = Array.isArray(value) ? value[0] : value;
  return String(header || '').split(',')[0].trim();
}

function extractHostname(value) {
  const host = firstHeaderValue(value).toLowerCase();
  if (!host) return '';
  if (host.startsWith('[')) return host.slice(1, host.indexOf(']'));
  return host.split(':')[0];
}

function isLocalAuthPreviewRequest(req) {
  if (process.env.LOCAL_AUTH_BYPASS !== 'true') return false;

  const vercelEnv = String(process.env.VERCEL_ENV || '').toLowerCase();
  if (BLOCKED_VERCEL_ENVS.has(vercelEnv)) return false;

  const forwardedHost = firstHeaderValue(req.headers?.['x-forwarded-host']);
  const hostname = extractHostname(forwardedHost || req.headers?.host);
  if (!LOOPBACK_HOSTS.has(hostname)) return false;

  return firstHeaderValue(req.headers?.authorization) === `Bearer ${LOCAL_AUTH_PREVIEW_TOKEN}`;
}

function createLocalPreviewAccount() {
  return {
    rowIndex: 0,
    id: 'local-preview-admin',
    username: 'local-preview',
    passwordHash: '',
    role: 'admin',
    createdAt: '',
    lastLogin: '',
    displayName: 'Локальний перегляд',
    avatar: 'penguin',
    menu: false,
    status: 'active',
    updatedAt: '',
    updatedBy: '',
    passwordChangedAt: '',
    authVersion: 1,
    capabilities: getCapabilities('admin'),
  };
}

module.exports = {
  LOCAL_AUTH_PREVIEW_TOKEN,
  createLocalPreviewAccount,
  isLocalAuthPreviewRequest,
};
