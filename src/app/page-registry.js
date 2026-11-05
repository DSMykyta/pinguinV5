import { isPageType } from './page-types.js';
import { manifest as overviewManifest } from '../features/overview/manifest.js';

const PAGE_ID = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;
const PAGE_PATH = /^\/(?:[a-z][a-z0-9]*(?:-[a-z0-9]+)*(?:\/[a-z][a-z0-9]*(?:-[a-z0-9]+)*)*)?$/;

/** Normalize browser paths before matching a page. */
export function normalizePathname(pathname) {
  if (typeof pathname !== 'string') return '/';
  const path = pathname.split(/[?#]/, 1)[0];
  if (!path || path === '/') return '/';
  const leadingSlash = path.startsWith('/') ? path : '/' + path;
  return leadingSlash.replace(/\/+$/, '') || '/';
}

function validatePage(page) {
  if (!page || typeof page !== 'object') throw new TypeError('Page manifest must be an object');
  if (!PAGE_ID.test(page.id)) throw new TypeError('Invalid page id: ' + page.id);
  if (!PAGE_PATH.test(page.route)) throw new TypeError('Invalid page route: ' + page.route);
  if (!isPageType(page.type)) throw new TypeError('Invalid page type: ' + page.type);
  if (!page.title || typeof page.title !== 'string') throw new TypeError('Page title is required');
  if (typeof page.load !== 'function') throw new TypeError('Page load() function is required');
  if (page.navigation != null) {
    if (typeof page.navigation !== 'object' || !page.navigation.icon) {
      throw new TypeError('Navigation must include an icon');
    }
    if (typeof page.navigation.icon !== 'string') throw new TypeError('Navigation icon must be a string');
  }
}

export function createPageRegistry(manifests) {
  if (!Array.isArray(manifests)) throw new TypeError('Expected an array of page manifests');

  const routes = new Map();
  const ids = new Set();
  const navigation = [];
  for (const page of manifests) {
    validatePage(page);
    if (routes.has(page.route) || ids.has(page.id)) {
      throw new Error('Duplicate page id or route: ' + page.id);
    }
    ids.add(page.id);
    routes.set(page.route, Object.freeze({ ...page }));
    if (page.navigation) navigation.push(page);
  }

  return Object.freeze({
    resolve(pathname) {
      return routes.get(normalizePathname(pathname)) ?? null;
    },
    getNavigation() {
      return [...navigation].sort((a, b) =>
        (a.navigation.order ?? 0) - (b.navigation.order ?? 0));
    },
  });
}

/** Only shipped, functional pages belong here. */
export const pageRegistry = createPageRegistry([overviewManifest]);
