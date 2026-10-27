# Shared Hook Registry Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Resolve architecture finding M01: one hook implementation with consistent ordering, error isolation, async dispatch and subscription disposal.

**Architecture:** A dependency-free `createHookRegistry` owns subscription behavior per instance. Existing page, component and generator APIs delegate to it while retaining event names and public exports. Domain state and value-transforming filters keep their own responsibilities.

**Tech Stack:** JavaScript ES modules; Node 24 built-in test runner; existing Vite build. No new runtime or test dependency.

**Spec:** `docs/PROJECT-OVERVIEW.md`, architecture audit M01 (2026-10-27), and the user's instruction to fix the audited problems one at a time.

## Global Constraints

- Preserve current call sites: options `{ plugin, priority }` and legacy numeric priority.
- Each registration returns an idempotent unsubscribe for that registration, including duplicate callbacks.
- Sync dispatch isolates throws and rejected async callbacks; async dispatch awaits handlers sequentially and isolates failures.
- Registry instances never share subscriptions. Existing named-event registries retain their event allowlists; page registries remain open.
- Keep disabled generators disabled and avoid completing planned AI/product features.
- Publish this problem as one reviewable change before broader lifecycle, table, repository or workflow changes.

## Review Focus

- Removing a callback during dispatch must not skip an unrelated callback.
- The same callback registered twice needs independent unsubscribe handles.
- Invalid callbacks and prototype-like event names must not crash a dispatch.
- Rejected promises from a handler must not escape error isolation or block healthy siblings.
- Numeric and object priorities must yield the same stable ordering through component adapters.

---

### Task 1: Unify hook behavior and migrate consumers

**Files:**
- Create: `js/utils/utils-hooks.js`, `tests/hooks.test.js`.
- Modify: hook registries in Page, Table, Editor, Modal, Avatar, Table Generator, Magic, Image, and thin compatibility registries for disabled Link/SEO.
- Modify: `js/components/table/table-main.js` to forward hook options.
- Modify: hook contract sections in `docs/PROJECT-OVERVIEW.md`.

**Interfaces:**
- Consumes: existing exported registration/dispatch APIs and event names.
- Produces: `createHookRegistry({ name?, events? })` returning `registerHook`, `runHook`, `runHookAsync`, `clearHooks`, `getRegisteredHooks`.
- `registerHook(event, callback, optionsOrPriority?)` returns `() => void`; `runHookAsync` returns `Promise<void>`; `clearHooks` clears subscriptions without altering allowed events.

- [x] **Step 1:** Add regression tests against existing public APIs for awaited Avatar hooks, Page unsubscribe/object priority, component error isolation, instance separation, duplicate unsubscribe and destroy cleanup. Use actual modules and lightweight DOM roots only where required.
- [x] **Step 2:** Run `node --test tests/hooks.test.js`; confirm failures reflect the identified contracts, not test setup.
- [x] **Step 3:** Implement shared registry and migrate existing registries through delegation. Preserve state and non-hook APIs; do not change filter semantics.
- [x] **Step 4:** Run `node --test tests/hooks.test.js`, then `npm run check`. Expected: all hook tests and full suite pass; functions count stays within limit; Vite build succeeds.
- [x] **Step 5:** Review the complete change independently, address material findings with regression tests, and commit the fix with its tests and updated contract documentation.

## Verification record

- Initial regression run: 17 failing, 4 passing tests against the prior implementations.
- Shared registry and adapter tests: 22 passing tests. A final compatibility regression preserved unbound callback receivers (RED → GREEN).
- `npm run check`: 67 passing tests, 0 failures; Vercel functions 9/12; production build successful.
- Independent read-only review: no Critical, Important or Minor findings. Additional mutation/reentrancy checks passed.
- Scope: M01 only. Plugin loading/full component lifecycle, value-transforming filters and feature activation remain separate work. Existing synchronous dispatch does not cancel handler work already in progress or prevent a handler from explicitly triggering recursion.
