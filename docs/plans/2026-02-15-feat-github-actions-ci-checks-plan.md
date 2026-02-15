---
title: "feat: Add GitHub Actions CI checks for PRs"
type: feat
status: completed
date: 2026-02-15
---

# Add GitHub Actions CI Checks for PRs

Run lint, typecheck, and all tests automatically on every pull request.

## Acceptance Criteria

- [x] CI runs on every PR targeting `main`
- [x] CI also runs on pushes to `main` (catch post-merge breaks)
- [x] Linting passes (oxlint + eslint, **without** `--fix`)
- [x] Format check passes (`oxfmt --check`)
- [x] Type check passes (`nuxi typecheck`)
- [x] All 3 vitest projects pass (core unit, app unit, browser)
- [x] Playwright Chromium is installed for browser tests
- [x] Bun dependencies are cached for fast repeat runs
- [ ] PR status checks block merge on failure (requires GitHub branch protection settings)

## Context

The project has **no CI** today. Pre-commit hooks run lint + typecheck locally, but nothing enforces checks on PRs. The repo is a Bun monorepo with `@drawvue/core` (must build before tests) and a Nuxt 4 app.

**Key constraint:** The `lint` script uses `--fix` flags, which is wrong for CI. The workflow must run linters in check-only mode.

## Implementation

### 1. Add CI-only lint scripts to `package.json`

```jsonc
// package.json — new scripts
"lint:oxlint:ci": "oxlint . --ignore-path .gitignore",
"lint:eslint:ci": "eslint .",
"lint:ci": "run-s lint:oxlint:ci lint:eslint:ci"
```

### 2. Create `.github/workflows/ci.yml`

Single job, sequential steps:

```yaml
name: CI

on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: true

jobs:
  check:
    runs-on: ubuntu-latest
    timeout-minutes: 15

    steps:
      - uses: actions/checkout@v4

      - uses: oven-sh/setup-bun@v2
        with:
          bun-version: "1.3.x"

      - name: Install dependencies
        run: bun install --frozen-lockfile

      - name: Build core library
        run: bun run core:build

      - name: Format check
        run: bun run fmt:check

      - name: Lint
        run: bun run lint:ci

      - name: Typecheck
        run: bun run typecheck

      - name: Install Playwright Chromium
        run: bunx playwright install chromium --with-deps

      - name: Run tests
        run: bun run test
```

**Step ordering rationale:**

1. `bun install` triggers `postinstall` → `nuxt prepare` (generates `.nuxt/` types needed for typecheck)
2. `core:build` must run before tests (app imports `@drawvue/core`)
3. Format + lint + typecheck run before tests (fast-fail on cheap checks)
4. Playwright install before tests (browser tests need Chromium)
5. `bun run test` runs all 3 vitest projects with `--bail=1`

**Concurrency:** `cancel-in-progress: true` cancels stale runs when new commits are pushed to the same PR.

### 3. Files to create/modify

| File                       | Action                                                               |
| -------------------------- | -------------------------------------------------------------------- |
| `.github/workflows/ci.yml` | **Create** — workflow file                                           |
| `package.json`             | **Edit** — add `lint:ci`, `lint:oxlint:ci`, `lint:eslint:ci` scripts |

## References

- `package.json:8-26` — existing scripts
- `vitest.config.ts:11-17` — three test projects
- `vitest.config.browser.ts` — Playwright browser config
- `docs/linting-setup.md` — dual linter architecture
