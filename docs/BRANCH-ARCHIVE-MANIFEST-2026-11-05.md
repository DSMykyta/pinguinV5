# Old branch archival manifest — 2026-11-05

Created before deleting legacy Git branches. **No branch is deleted by this manifest.**

Production `main` baseline: `718aad5d7a1524cff7162061ead766f46f3985b5`. The new permanent `reserve` and `work` branches were created from that baseline. The `work` branch additionally contains the new architecture proposal.

The repository had 56 branches before creating the two permanent branches. The old set consisted of 43 fully incorporated in `main`, five with unique commits but no open PR, and seven with open PRs. (The five unmerged branches below are not merged into `main`.)

## Preserve before deletion

| Existing branch | Head commit SHA | Why preserved |
|---|---|---|
| `claude/code-audit-review-Is6eo` | `f4144746be9ae53310b5df8af72258c49855751d` | Unmerged changes |
| `claude/create-new-page-vylKv` | `4ffa3f5808e427f470d86b2b4c787e1d5a7c5c9c` | Unmerged changes |
| `claude/fix-ingredient-header-6oVTn` | `e2378ab71b9516694fcc73e303ff2b364640c4fd` | Unmerged changes |
| `claude/fix-pricing-import-01Qqrf3qEVr1ZE6hx51CF4jj` | `577a9778b90b8ffbbda7a55f44ab8fb341779d2e` | Unmerged changes |
| `claude/gemini-api-integration-WPIb2` | `b174c818db9733afe1582a8595c41fe788cb6245` | Unmerged changes |
| `design/calm-chatgpt-shell-20261105` | `0af8b70f856b5bc1a7acc6ff0c5910f0159abf41` | Open PR #313: Design: calmer ChatGPT-inspired Pinguin workspace shell |
| `fix/shared-hooks-20261027` | `be9246445e25d7723244628f0b3f0f9cadb5c7b6` | Open PR #312: fix: use one hook registry across components and generators |
| `codex/ui-ux-pro-max-homepage` | `d0556204c093412df69de588f54201a328a06e80` | Open PR #311: Redesign instruments workspace with UI UX Pro Max |
| `claude/debug-managed-table-search-rocEi` | `0a970bf4db018c74b861a30f77a7b3a98f5c322b` | Open PR #285: Claude/debug managed table search roc ei |
| `claude/review-mapper-jvwfe` | `b6918de342737a1bd7c05fe26ce5db9bea13bfc7` | Open PR #230: fix: remove empty our_*_id fields from MP data JSON during import |
| `claude/redesign-tasks-page-pKiHV` | `628d8ba203fb0644ff6a912cef75b4247b3e9eb5` | Open PR #228: Claude/redesign tasks page p ki hv |
| `claude/fix-auth-syntax-error-GJdX0` | `109549461ec28a0155515ce0cdb933b8a3c44dfe` | Open PR #164: Feature: Уніфіковано індикацію завантаження через showLoader |

Target tags (only after execution of the reviewed cleanup script): `refs/tags/archive/pinguin-v5-before-three-branch-cleanup/<existing branch name>`.

**Process:** First validate current head SHAs and compare with main; ensure tag points to exact old head; then close open PRs if you deliberately want only three active branches; only afterwards delete branch refs. Old PR descriptions remain accessible even when closed. Never erase git history or force-push main to make the list shorter.

## Retention policy

- Keep `main`, `reserve`, `work` permanently.
- Do not commit new site code to `reserve`; update it to the pre-release `main` commit immediately before each release.
- Do not merge the seven historical PRs blindly: several refer to paths that were refactored or removed.
- Evaluate #312 hook registry ideas and #313 shell styles when implementing new architecture, using independent contracts and tests.
- `work` contains architecture work that is not yet ready for production.
