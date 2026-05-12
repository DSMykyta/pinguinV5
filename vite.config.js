import { defineConfig } from 'vite';
import { resolve } from 'path';
import { cpSync, existsSync, mkdirSync } from 'fs';

// Сторінки додатку (entry points)
const APP_PAGES = [
    'index.html',
    'products.html',
    'brands.html',
    'entities.html',
    'marketplaces.html',
    'keywords.html',
    'glossary.html',
    'blog.html',
    'banners.html',
    'banned-words.html',
    'images.html',
    'price.html',
    'tasks.html',
    'design-system.html',
    'redirect-target.html',
    'MIGRATION-GUIDE.html',
];

const input = {};
for (const file of APP_PAGES) {
    input[file.replace('.html', '')] = resolve(__dirname, file);
}

// Плагін: копіювання статичних файлів в dist
function copyStaticPlugin() {
    return {
        name: 'copy-static',
        closeBundle() {
            const dirs = ['templates', 'icon', 'resources'];
            for (const dir of dirs) {
                if (existsSync(dir)) {
                    cpSync(dir, resolve(__dirname, 'dist', dir), { recursive: true });
                }
            }
            // theme-init.js — блокуючий скрипт в <head> (не модуль)
            if (existsSync('js/theme-init.js')) {
                const jsDir = resolve(__dirname, 'dist', 'js');
                mkdirSync(jsDir, { recursive: true });
                cpSync('js/theme-init.js', resolve(jsDir, 'theme-init.js'));
            }
        }
    };
}

export default defineConfig({
    plugins: [copyStaticPlugin()],
    publicDir: false,

    build: {
        outDir: 'dist',
        rollupOptions: {
            input,
            output: {
                entryFileNames: 'assets/[name]-[hash].js',
                chunkFileNames: 'assets/[name]-[hash].js',
                assetFileNames: 'assets/[name]-[hash][extname]',
            }
        },
        minify: 'esbuild',
        cssMinify: true,
    },

    server: {
        port: 3000,
        open: true,
    }
});
