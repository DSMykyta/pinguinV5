// js/pages/blog/blog-plugins.js

/**
 * Система хуків для сторінки Blog.
 */

import { createPluginRegistry } from '../../components/page/page-plugins.js';

const blogPlugins = createPluginRegistry('Blog');

export const registerBlogPlugin = blogPlugins.registerHook;
export const runHook = blogPlugins.runHook;
export { blogPlugins };
