---
title: Migrate from Bun to pnpm
type: refactor
status: completed
date: 2026-02-15
---

# Migrate from Bun to pnpm

Remove Bun as the package manager and replace it entirely with pnpm. Bun is only used as a package manager/script runner — zero Bun-specific runtime APIs exist in the codebase.

## Motivation

14 consecutive `fix(ci):` commits were needed to work around Bun's behavior in CI, including:

- Bun's isolated installs don't hoist transitive deps (`@vue/shared`, `@vue/runtime-core`, etc.)
- A dedicated `resolveVueEsm()` hack in `vitest.config.browser.ts` (lines 13-24) exists solely for this
- `--ignore-scripts` + manual `bunx nuxt prepare` workaround in CI for `simple-git-hooks` crash
- pnpm has mature, predictable hoisting and first-class monorepo support

## Acceptance Criteria

- [ ] `pnpm install` works locally and in CI
- [ ] `pnpm run dev`, `pnpm run build`, `pnpm run test`, `pnpm run lint`, `pnpm run typecheck` all pass
- [ ] `bun.lock` deleted, `pnpm-lock.yaml` committed
- [ ] `resolveVueEsm` workaround in `vitest.config.browser.ts` removed (or confirmed still needed)
- [ ] GitHub Actions CI passes with pnpm
- [ ] All docs updated (`bun` → `pnpm`)

## Changes

### 1. Root config files

**`package.json`** — 3 changes:

```jsonc
// BEFORE
"core:build": "bun run --filter @drawvue/core build",
"core:dev": "bun run --filter @drawvue/core dev",
// ...
"pre-commit": "bun run lint-staged && bun run typecheck"

// AFTER
"core:build": "pnpm --filter @drawvue/core run build",
"core:dev": "pnpm --filter @drawvue/core run dev",
// ...
"pre-commit": "pnpm run lint-staged && pnpm run typecheck"
```

**New file: `pnpm-workspace.yaml`**

```yaml
packages:
  - "packages/*"
```

> pnpm requires its own workspace config. The `"workspaces"` field in `package.json` can stay (npm compat) or be removed.

**Delete:** `bun.lock`

### 2. GitHub Actions CI (`.github/workflows/ci.yml`)

Replace the entire Bun setup with pnpm + Node:

```yaml
steps:
  - uses: actions/checkout@v4

  - uses: pnpm/action-setup@v4

  - uses: actions/setup-node@v4
    with:
      node-version: "22"
      cache: "pnpm"

  - name: Install dependencies
    run: pnpm install --frozen-lockfile

  - name: Build core library
    run: pnpm run core:build

  - name: Format check
    run: pnpm run fmt:check

  - name: Lint
    run: pnpm run lint:ci

  - name: Typecheck
    run: pnpm run typecheck

  - name: Install Playwright Chromium
    run: pnpm exec playwright install chromium --with-deps

  - name: Run tests
    run: pnpm run test
```

Key differences:

- `pnpm/action-setup@v4` auto-detects version from `packageManager` field (add to `package.json`)
- `actions/setup-node@v4` with `cache: "pnpm"` handles dependency caching natively
- `--ignore-scripts` workaround likely **no longer needed** — pnpm handles `postinstall` fine in CI
- `bunx` → `pnpm exec` (or `pnpm dlx` for one-off binaries)

### 3. `vitest.config.browser.ts` — remove Bun workaround

Lines 13-24 (`resolveVueEsm` function) and the 4 `@vue/*` aliases (lines 59-62) exist because Bun doesn't hoist transitive deps. With pnpm's default hoisting, these should resolve naturally.

**Try removing the workaround entirely.** If `@vue/*` ESM/CJS split issues persist (the `EMPTY_OBJ` duplication), keep the `resolve.dedupe` array and only remove the manual alias resolution.

### 4. `package.json` — add `packageManager` field

```jsonc
{
  "packageManager": "pnpm@10.11.0",
}
```

This enables Corepack and lets `pnpm/action-setup` auto-detect the version.

### 5. Documentation updates

Files referencing `bun`:

- `CLAUDE.md` — commands section + stack description
- `README.md` — stack + all usage examples
- `docs/reference/technology-stack.md`
- `docs/our-testing-strategy.md`
- `docs/linting-setup.md`
- `docs/nuxt-gotchas.md`
- `docs/bound-text-debug-notes.md`
- `docs/plans/2026-02-15-feat-github-actions-ci-checks-plan.md`
- `docs/plans/2026-02-15-feat-eraser-tool-plan.md`
- `docs/plans/2026-02-15-refactor-rendering-architecture-plan.md`
- `specs/phase3-selection-manipulation.md`
- `backlog/00-install-nuxt-ui.md`

Replace `bun run` → `pnpm run`, `bun install` → `pnpm install`, `bun add` → `pnpm add`, `bunx` → `pnpm exec`, "Bun package manager" → "pnpm package manager".

### 6. `.gitignore`

Remove any bun-specific entries (if any). Add `pnpm-lock.yaml` is NOT gitignored (it should be committed).

## References

- Bun hoisting issue workaround: `vitest.config.browser.ts:13-24`
- CI workflow: `.github/workflows/ci.yml`
- 14 fix(ci) commits: `29ca1a7`, `f89f2da`, `61f7fab`, `e37bfa0`, `2c4afaa`, `43088ed`, `09ca75a`, `08b7bc0`, `64ab1ae`, `9d94d4a`, `0c2ba28`, `d5df379`, `04745e3`, `94af337`
