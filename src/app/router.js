/**
 * Real URL navigation with browser Back/Forward support.
 * The router never displays a page itself; it only resolves routes.
 */
export function createRouter({ browserWindow, registry, onChange }) {
  if (!browserWindow || !registry || typeof onChange !== 'function') {
    throw new TypeError('Browser window, registry and onChange callback are required');
  }

  let started = false;

  function syncFromLocation() {
    const route = registry.resolve(browserWindow.location.pathname);
    onChange(route);
  }

  function navigate(path, { replace = false } = {}) {
    const route = registry.resolve(path);
    if (!route) return false;

    const currentPath = browserWindow.location.pathname.replace(/\/+$/, '') || '/';
    if (currentPath === route.route) return true;

    const method = replace ? 'replaceState' : 'pushState';
    browserWindow.history[method](null, '', route.route);
    syncFromLocation();
    return true;
  }

  function start() {
    if (started) return;
    started = true;
    browserWindow.addEventListener('popstate', syncFromLocation);
    syncFromLocation();
  }

  function stop() {
    if (!started) return;
    started = false;
    browserWindow.removeEventListener('popstate', syncFromLocation);
  }

  return Object.freeze({ navigate, start, stop });
}
