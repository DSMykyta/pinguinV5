#!/usr/bin/env bash
# One-time authorized cleanup: keep main, work, reserve, legacy. No tags.
set -euo pipefail
repo="${GITHUB_REPOSITORY:?}"
expected="718aad5d7a1524cff7162061ead766f46f3985b5"

head_sha() { gh api "repos/$repo/branches/$1" --jq '.commit.sha'; }
main_sha="$(head_sha main)"
legacy_sha="$(head_sha legacy)"
reserve_sha="$(head_sha reserve)"
work_sha="$(head_sha work)"
for entry in "main:$main_sha" "legacy:$legacy_sha" "reserve:$reserve_sha"; do
  [[ "${entry#*:}" == "$expected" ]] || { echo "::error::Changed required baseline: $entry"; exit 1; }
done
[[ -n "$work_sha" ]] || { echo "::error::work branch missing"; exit 1; }
echo "Confirmed main/reserve/legacy snapshot and work branch."

branches="$(gh api "repos/$repo/branches?per_page=100")"
[[ "$(jq 'length' <<<"$branches")" -lt 100 ]] || { echo "::error::Pagination required"; exit 1; }
mapfile -t names < <(jq -r '.[].name' <<<"$branches")
keep='^(main|work|reserve|legacy)$'
for branch in "${names[@]}"; do
  [[ "$branch" =~ $keep ]] && continue
  is_protected="$(jq -r --arg n "$branch" '.[] | select(.name == $n) | .protected' <<<"$branches")"
  [[ "$is_protected" == "false" ]] || { echo "::error::Protected branch $branch; stopping"; exit 1; }
done

prs="$(gh api "repos/$repo/pulls?state=open&per_page=100")"
[[ "$(jq 'length' <<<"$prs")" -lt 100 ]] || { echo "::error::PR pagination required"; exit 1; }

deleted=0
closed=0
for branch in "${names[@]}"; do
  [[ "$branch" =~ $keep ]] && { echo "KEEP: $branch"; continue; }
  while IFS= read -r number; do
    [[ -z "$number" ]] && continue
    gh api --method PATCH "repos/$repo/pulls/$number" -f state=closed --silent
    echo "CLOSED PR: #$number"
    closed=$((closed+1))
  done < <(jq -r --arg n "$branch" --arg repo "$repo" '.[] | select(.head.ref == $n and .head.repo.full_name == $repo) | .number' <<<"$prs")
  gh api --method DELETE "repos/$repo/git/refs/heads/$branch" --silent
  echo "DELETED: $branch"
  deleted=$((deleted+1))
done

after="$(gh api "repos/$repo/branches?per_page=100")"
mapfile -t remaining < <(jq -r '.[].name' <<<"$after")
echo "Remaining branches: ${remaining[*]}"
[[ "${#remaining[@]}" -eq 4 ]] || { echo "::error::Expected exactly four branches"; exit 1; }
for name in main work reserve legacy; do
  printf '%s\n' "${remaining[@]}" | grep -Fxq "$name" || { echo "::error::Missing $name"; exit 1; }
done
echo "SUCCESS: $deleted obsolete branches removed; $closed PRs closed; exactly four branches left."
