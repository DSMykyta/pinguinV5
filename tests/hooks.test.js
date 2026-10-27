const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const test = require('node:test');

let importId = 0;
const load = (file) => import(`${pathToFileURL(path.resolve(__dirname, '..', file))}?test=${importId++}`);

async function pageRegistry() {
    const { createPluginRegistry } = await load('js/components/page/page-plugins.js');
    return createPluginRegistry('Fixture');
}

test('Page subscriptions can be removed without affecting healthy siblings', async () => {
    const registry = await pageRegistry();
    const calls = [];
    const off = registry.registerHook('onRender', () => calls.push('removed'));
    registry.registerHook('onRender', () => calls.push('healthy'));
    assert.equal(typeof off, 'function');
    off();
    off();
    registry.runHook('onRender');
    assert.deepEqual(calls, ['healthy']);
});

test('numeric and object priorities share stable ordering', async () => {
    const registry = await pageRegistry();
    const calls = [];
    registry.registerHook('onRender', () => calls.push('normal'), { plugin: 'normal' });
    registry.registerHook('onRender', () => calls.push('first'), { priority: 0, plugin: 'first' });
    registry.registerHook('onRender', () => calls.push('legacy'), 5);
    registry.registerHook('onRender', () => calls.push('second'), { priority: 0 });
    registry.runHook('onRender');
    assert.deepEqual(calls, ['first', 'second', 'legacy', 'normal']);
});

test('each duplicate registration has its own unsubscribe handle', async () => {
    const registry = await pageRegistry();
    let calls = 0;
    const callback = () => calls++;
    const firstOff = registry.registerHook('onRender', callback);
    const secondOff = registry.registerHook('onRender', callback);
    assert.equal(typeof firstOff, 'function');
    firstOff();
    firstOff();
    registry.runHook('onRender');
    assert.equal(calls, 1);
    secondOff();
    registry.runHook('onRender');
    assert.equal(calls, 1);
});

test('removing the current subscription during dispatch does not skip its sibling', async () => {
    const registry = await pageRegistry();
    const calls = [];
    const off = registry.registerHook('onRender', () => { calls.push('self'); off(); });
    registry.registerHook('onRender', () => calls.push('next'));
    assert.equal(typeof off, 'function');
    registry.runHook('onRender');
    registry.runHook('onRender');
    assert.deepEqual(calls, ['self', 'next', 'next']);
});

test('subscriptions added during dispatch start on the next dispatch', async () => {
    const registry = await pageRegistry();
    const calls = [];
    registry.registerHook('onRender', () => {
        calls.push('first');
        registry.registerHook('onRender', () => calls.push('late'), 0);
    });
    registry.runHook('onRender');
    assert.deepEqual(calls, ['first']);
    registry.runHook('onRender');
    assert.deepEqual(calls, ['first', 'late', 'first']);
});

test('async hooks await handlers in priority order and isolate a failure', async (t) => {
    t.mock.method(console, 'error', () => {});
    const registry = await pageRegistry();
    const calls = [];
    registry.registerHook('onInit', () => calls.push('last'), 20);
    registry.registerHook('onInit', async (value) => {
        calls.push(`start:${value}`);
        await Promise.resolve();
        calls.push('end');
        throw new Error('Fixture failure');
    }, { priority: 0, plugin: 'failing' });
    await registry.runHookAsync('onInit', 'payload');
    assert.deepEqual(calls, ['start:payload', 'end', 'last']);
});

test('sync hooks isolate thrown and rejected handlers without unhandled rejection', async (t) => {
    t.mock.method(console, 'error', () => {});
    const registry = await pageRegistry();
    const calls = [];
    registry.registerHook('onRender', () => { throw new Error('Sync failure'); });
    registry.registerHook('onRender', async () => { throw new Error('Async failure'); });
    registry.registerHook('onRender', () => calls.push('healthy'));
    registry.runHook('onRender');
    await new Promise(resolve => setImmediate(resolve));
    assert.deepEqual(calls, ['healthy']);
});

test('open registries safely support names inherited by ordinary objects', async () => {
    const registry = await pageRegistry();
    let calls = 0;
    assert.doesNotThrow(() => registry.runHook('toString'));
    registry.registerHook('__proto__', () => calls++);
    registry.runHook('__proto__');
    assert.equal(calls, 1);
});

test('page instances keep subscriptions and optional functions independent', async () => {
    const a = await pageRegistry();
    const b = await pageRegistry();
    let calls = 0;
    a.registerHook('onRender', () => calls++);
    a.registerOptionalFunction('fixture', () => 'A');
    b.runHook('onRender');
    assert.equal(calls, 0);
    assert.equal(b.optionalFunctions.fixture, undefined);
    a.runHook('onRender');
    assert.equal(calls, 1);
    assert.equal(a.optionalFunctions.fixture(), 'A');
});

test('dispatch preserves unbound callbacks without exposing subscription internals', async () => {
    const registry = await pageRegistry();
    const receivers = [];
    registry.registerHook('onRender', function () {
        'use strict';
        receivers.push(this);
    });
    registry.runHook('onRender');
    await registry.runHookAsync('onRender');
    assert.deepEqual(receivers, [undefined, undefined]);
});

test('Table destroy invokes cleanup once and removes all subscriptions', async () => {
    const { createTableState } = await load('js/components/table/table-state.js');
    const state = createTableState();
    let destroyed = 0, rendered = 0;
    state.registerHook('onDestroy', () => destroyed++);
    state.registerHook('onRender', () => rendered++);
    state.selectRow('row-1');
    state.destroy();
    state.destroy();
    state.runHook('onRender');
    assert.equal(destroyed, 1);
    assert.equal(rendered, 0);
    assert.deepEqual(state.getSelectedRows(), []);
});

const adapters = [
    ['Table', 'js/components/table/table-state.js', m => m.createTableState(), 'onRender'],
    ['Editor', 'js/components/editor/editor-state.js', m => m.createEditorState('fixture', { querySelector: () => null }, {}), 'onInput'],
    ['Modal', 'js/components/modal/modal-state.js', m => m, 'onAfterOpen'],
    ['Avatar', 'js/components/avatar/avatar-state.js', m => m, 'onInit'],
    ['Table Generator', 'js/generators/generator-table/gt-state.js', m => m, 'onInit'],
    ['Magic', 'js/generators/generator-magic/gm-state.js', m => m, 'onAfterParse'],
    ['Image', 'js/generators/generator-image/gim-plugins.js', m => ({ ...m, registerHook: m.registerImagePlugin }), 'onLoad'],
    ['Link compatibility', 'js/generators/generator-link/gln-plugins.js', m => ({ ...m, registerHook: m.registerLinksPlugin }), 'onReset'],
    ['SEO compatibility', 'js/generators/generator-seo/gse-plugins.js', m => ({ ...m, registerHook: m.registerSeoPlugin }), 'onReset'],
];

for (const [name, file, create, event] of adapters) {
    test(`${name} uses the common ordering, async dispatch and unsubscribe contract`, async () => {
        const registry = create(await load(file));
        const calls = [];
        const off = registry.registerHook(event, () => calls.push('removed'));
        registry.registerHook(event, () => calls.push('last'), 20);
        registry.registerHook(event, async (payload) => {
            await Promise.resolve();
            calls.push(payload);
        }, { priority: 0, plugin: 'fixture' });
        assert.equal(typeof off, 'function');
        off();
        assert.equal(typeof registry.runHookAsync, 'function');
        await registry.runHookAsync(event, 'first');
        assert.deepEqual(calls, ['first', 'last']);
    });
}

test('Avatar async lifecycle calls its registered init handlers', async (t) => {
    t.mock.method(console, 'error', () => {});
    const avatar = await load('js/components/avatar/avatar-state.js');
    let initialized = false;
    avatar.registerHook('onInit', async () => {
        await Promise.resolve();
        initialized = true;
    }, { plugin: 'fixture' });
    await avatar.runHookAsync('onInit');
    assert.equal(initialized, true);
});

test('bounded registries reject unknown hooks and invalid callbacks safely', async (t) => {
    t.mock.method(console, 'warn', () => {});
    t.mock.method(console, 'error', () => {});
    const { createTableState } = await load('js/components/table/table-state.js');
    const registry = createTableState();
    let called = false;
    const off = registry.registerHook('not-a-table-event', () => { called = true; });
    registry.registerHook('onRender', null);
    assert.equal(typeof off, 'function');
    registry.runHook('not-a-table-event');
    registry.runHook('onRender');
    assert.equal(called, false);
});
