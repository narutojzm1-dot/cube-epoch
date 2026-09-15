---
name: ship-gate
description: >-
  Mandatory test, review, GitHub PR, and CI gate before Cube Epoch ships.
  Use when finishing a feature, about to commit/push cube-epoch, after
  playtesting, or when the user mentions 审查, 测试, PR, CI, CD, or /ship-gate.
---

# Ship gate

Do not push `origin main`. Do not say the change is live until the PR is merged and Pages has deployed.

## 1. Local test

```bash
node --check game.js
node tests/static.mjs
node tests/e2e.mjs
```

Add or extend a test when you add a player-visible rule.

## 2. Review

Spawn an independent reviewer subagent (`description` prefix `[reviewer]`) on the changed files. Same-pass self-review does not count.

- `bug`: fix, re-test, then continue
- `suggestion` / `nit`: fix if cheap, otherwise say why you skipped

## 3. Pull request

```bash
git checkout -b <topic>
git push -u origin HEAD
gh pr create --base main --fill
```

Wait for the `Test` checks (`static` and `e2e`) to go green. Then:

```bash
gh pr merge --squash --delete-branch
```

Do not `git push origin main`.

## 4. CD

After merge, wait for **Test** and **Deploy Pages** on `main`. Confirm `https://narutojzm1-dot.github.io/cube-epoch/` serves the new commit.

Skip this gate only if the user explicitly says not to use PR/CI.
