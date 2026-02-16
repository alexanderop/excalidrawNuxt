---
title: Browser Test Coverage Threshold in CI
type: feat
status: active
date: 2026-02-16
---

# Browser Test Coverage Threshold in CI

Fail the GitHub Actions pipeline if browser test line coverage drops below 65%.

## Acceptance Criteria

- [ ] CI pipeline fails when browser test line coverage is below 65%
- [ ] CI pipeline passes when browser test line coverage is at or above 65%
- [ ] Non-browser tests (unit, core) still run without coverage overhead

## Context

The project already has full coverage infrastructure:

- `vitest.config.browser.ts` has v8 coverage configured with `json-summary` reporter outputting to `./coverage/browser`
- `package.json` has `test:coverage:browser` script: `vitest run --project browser --coverage`
- Vitest supports built-in `thresholds` in the coverage config — no custom scripts needed

## MVP

### 1. Add threshold to `vitest.config.browser.ts`

Add `thresholds` to the existing `coverage` block:

```typescript
// vitest.config.browser.ts — coverage section (line ~52)
coverage: {
  provider: "v8",
  include: ["packages/core/src/**/*.ts", "app/**/*.{ts,vue}"],
  exclude: ["**/*.test.ts", "**/__test-utils__/**", "**/types.ts"],
  reporter: ["text", "html", "json-summary"],
  reportsDirectory: "./coverage/browser",
  reportOnFailure: true,
  thresholds: {
    lines: 65,
  },
},
```

Vitest will automatically fail the process with a non-zero exit code when the threshold is not met.

### 2. Split CI test step in `.github/workflows/ci.yml`

Replace the single `pnpm run test` step with two steps to avoid running browser tests twice (once without coverage, once with):

```yaml
# Before:
- name: Run tests
  run: pnpm run test

# After:
- name: Run unit & core tests
  run: pnpm exec vitest run --project unit --project core --bail=1

- name: Run browser tests with coverage
  run: pnpm run test:coverage:browser -- --bail=1
```

This ensures:

- Unit and core tests run fast without coverage overhead
- Browser tests run with coverage collection + threshold enforcement
- `--bail=1` is preserved on both steps (fail fast on first test failure)

### Summary of file changes

| File                       | Change                                                 |
| -------------------------- | ------------------------------------------------------ |
| `vitest.config.browser.ts` | Add `thresholds: { lines: 65 }` to coverage config     |
| `.github/workflows/ci.yml` | Split test step into unit/core + browser-with-coverage |

## References

- Vitest coverage thresholds docs: https://vitest.dev/config/#coverage-thresholds
- Current CI workflow: `.github/workflows/ci.yml`
- Browser test config: `vitest.config.browser.ts`
