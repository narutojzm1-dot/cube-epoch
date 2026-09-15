---
name: ship-gate
description: >-
  Mandatory test-then-review gate before claiming Cube Epoch (or similar
  personal web-game) work is done. Use when finishing a feature, about to
  commit/push cube-epoch, after playtesting, or when the user mentions 审查,
  测试环节, ship, or quality gate. Slash command: /ship-gate.
---

# Ship gate

Do not say a change is done, and do not `git push`, until both steps below have passing evidence in this turn.

## 1. Test

From the cube-epoch repo:

```bash
node --check game.js
node tests/static.mjs
node tests/e2e.mjs
```

If Playwright WebKit is missing, set `PLAYWRIGHT_WEBKIT_EXECUTABLE` or install the matching browser. Static checks are not enough by themselves when UI/camera/audio/combat changed — run e2e too.

Add or extend a test when you introduce a new player-visible rule (camera, audio, intro, briefing, build, combat).

## 2. Review

Spawn an independent reviewer subagent (description prefix `[reviewer]`) on the files you changed. It must not be the same pass that wrote the code.

- Severity `bug` must be fixed, then re-test, before push.
- `suggestion` / `nit`: fix if cheap, otherwise record why you skipped.

## 3. Only then

Commit, push, wait for Pages **and** the Test workflow. Report test output and review outcome to the user.

Skip this gate only if the user explicitly says not to test or not to review.
