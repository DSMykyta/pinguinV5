# Pinguin Git branch policy — confirmed 2026-11-05

Only four permanent branches:

| Branch | Role | Protection | Deployment |
|---|---|---|---|
| `main` | Approved, released version | Never force-push; merge only after tests and review | Vercel Production |
| `work` | Living development branch for one feature at a time | Preserve after each release; never auto-delete | Vercel Preview |
| `reserve` | Snapshot of the previous confirmed production commit | Move to old `main` SHA immediately before release; no direct feature commits | No Production |
| `legacy` | **Immutable snapshot of old Pinguin V5** | Never update, merge into, or delete | No Production |

## Baseline

On 2026-11-05 `legacy` was created from `main` at `718aad5d7a1524cff7162061ead766f46f3985b5`. This snapshot reflects the old Production version, not a future Pinguin Next build.

`reserve` was initially created at that same SHA. `work` branched from old `main` and contains discussion documents; **nothing new is production-ready**.

## Release protocol

1. Implement and test **one self-contained feature** in `work` with no production data mutation.
2. Verify GitHub CI and Vercel Preview. Review behavior, permissions, usability, mobile and accessibility.
3. Record current Production SHA. Update `reserve` to that SHA **before publishing**, provided the deployment is confirmed and no concurrent release is occurring.
4. Submit or update a PR `work` → `main`; merge only after explicit acceptance, and verify new Production deployment.
5. Synchronize `work` with `main` **without deleting the branch**.
6. If rollout fails, revert/rollback using `reserve` and the known-good Vercel deployment. Git changes alone do not revert data mutations.

`main` and `work` are **fixed roles**, not branch names swapped between releases.

## GitHub configuration

GitHub `Automatically delete head branches` is **disabled** as requested so the permanent `work` branch survives merge. Consider a ruleset protecting `main` and `legacy` from direct writes/deletion, while allowing controlled updates to `reserve`.

## Legacy branch cleanup decision

The owner explicitly requested that **all other branch refs be removed**, including ones with unique commits and open PRs. Old work is considered obsolete. Existing open legacy PRs are to be closed, **not merged**.

Branch deletion is a repository reference cleanup, not a rebuild of the present `main` tree. Code reduction proceeds separately through incremental architecture migration on `work`.

## Architecture work

The design in `PINGUIN-NEXT-ARCHITECTURE-PROPOSAL.md` remains a proposal. No new application implementation is approved merely by creating this branch-policy document.
