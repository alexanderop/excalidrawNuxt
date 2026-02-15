# Linting Setup

This project uses a dual-linter approach: Oxlint for speed, ESLint for comprehensive rules.

## Architecture

```
pnpm run lint
  └── run-s lint:*
        ├── lint:oxlint (fast, Rust-based, catches basics)
        └── lint:eslint (comprehensive Vue/TS/import rules)
```

Oxlint runs 50-100x faster than ESLint. It handles correctness, suspicious patterns, and basic TypeScript rules. ESLint handles Vue-specific rules, import boundaries, and custom patterns.

## Key Files

- `.oxlintrc.json` - Oxlint configuration
- `eslint.config.ts` - ESLint flat config (not `.eslintrc`)
- `eslint-rules/` - Local ESLint plugin with custom rules (e.g. `no-callback-object-props`)
- `packages/core/src/utils/tryCatch.ts` - Required utility since native try/catch is banned (exported from `@drawvue/core`)

## Gotchas

### Nuxt 4 Path Patterns

ESLint file patterns must use `app/**/*` instead of `src/**/*`:

```typescript
// eslint.config.ts
files: ['app/**/*.vue'],  // NOT 'src/**/*.vue'
```

### tryCatch Utility Self-Exception

The `tryCatch.ts` utility needs an `eslint-disable-next-line` for its internal try/catch:

```typescript
// eslint-disable-next-line no-restricted-syntax -- tryCatch utility itself needs try/catch
try {
  result = fn()
}
```

### Oxlint-ESLint Integration

The `eslint-plugin-oxlint` reads `.oxlintrc.json` and automatically disables overlapping ESLint rules:

```typescript
import pluginOxlint from "eslint-plugin-oxlint";

export default defineConfigWithVueTs(
  // ... other configs
  ...pluginOxlint.buildFromOxlintConfigFile("./.oxlintrc.json"),
);
```

### Unicorn Error Messages

The `unicorn/error-message` rule requires all `new Error()` calls to include a message string. Empty `new Error()` will fail linting.

### Multi-word Component Names (Filename-Based)

The `vue/multi-word-component-names` rule checks the **filename**, not `defineOptions({ name })`. Single-word filenames like `Toolbar.vue` fail.

**Fixes:**

- Rename to multi-word: `DrawingToolbar.vue`, `MainToolbar.vue`
- Or add to `ignores` array in `eslint.config.ts` (only for shared/generic components)

## Cross-Feature Import Isolation

After the monorepo extraction, core domain features live in `packages/core/src/features/` (within the `@drawvue/core` library), while `app/features/` contains only presentation-layer components. ESLint enforces that app features cannot import from pages:

```typescript
// eslint.config.ts — app/import-boundaries
{
  target: "./app/features",
  from: "./app/pages",
}
```

Cross-feature isolation within the core package uses relative imports between features. The app layer imports exclusively from `@drawvue/core` (never internal paths).

**Core features** (`packages/core/src/features/`): binding, canvas, clipboard, code, command-palette, context-menu, elbow, elements, groups, history, image, linear-editor, properties, rendering, selection, theme, tools

**App features** (`app/features/`): canvas, clipboard, code, command-palette, dev-inspector, history, image, linear-editor, properties, rendering, selection, theme, tools

## Banned Patterns (enforced by lint)

| Pattern                             | Alternative                                                   |
| ----------------------------------- | ------------------------------------------------------------- |
| `as Type` assertions                | Type guards or proper typing (convention, not lint-enforced)  |
| `enum` declarations                 | Literal unions or `as const` objects                          |
| `else` / `else if`                  | Early returns                                                 |
| Native `try/catch`                  | `tryCatch()` from `@drawvue/core`                             |
| Nested ternaries                    | Functions with early returns                                  |
| Hardcoded route strings             | Named routes                                                  |
| Function props (`() => void`)       | `defineEmits`                                                 |
| `Function` type in props            | `defineEmits`                                                 |
| All-function interface/object props | `defineEmits` (custom rule: `local/no-callback-object-props`) |
| `console.log`                       | Remove or use `console.warn`/`console.error` (oxlint)         |
| `any` type                          | Proper types (oxlint: `typescript/no-explicit-any`)           |

## Oxlint Rules (`.oxlintrc.json`)

- **Categories:** `correctness` (error), `suspicious` (warn)
- **Explicit rules:** `typescript/no-explicit-any` (error), `eslint/no-console` (error, allows `warn`/`error`)

## ESLint Sections Summary

The flat config in `eslint.config.ts` is organized into named sections:

1. **`app/vue-component-rules`** — PascalCase templates, dead code detection, max-template-depth (8), max-props (6), Vue 3.5+ APIs (`define-props-destructuring`, `prefer-use-template-ref`)
2. **`app/typescript-style`** — Complexity (max 10), no nested ternaries, banned syntax (enums, else, try/catch, hardcoded routes, function props)
3. **`app/local-rules`** — Custom rule `local/no-callback-object-props` (catches all-function interfaces/objects used as props)
4. **`app/import-boundaries`** — Feature isolation zones, shared code cannot import from features/pages
5. **`app/vitest-rules`** — `it()` not `test()`, hooks on top, max 2 nested describes, prefer Vitest locators over `querySelector`
6. **`app/vitest-unit-flat-tests`** — Warns on `beforeEach`/`afterEach` in `*.unit.test.ts` (allows `beforeAll`/`afterAll`)
7. **`app/unicorn-overrides`** — Enables `better-regex`, `custom-error-definition`, `consistent-destructuring`; disables `no-null`, `filename-case`, `prevent-abbreviations`, `no-array-callback-reference`, `no-await-expression-member`, `no-array-reduce`, `no-useless-undefined`

## Pre-commit Hooks

Configured via `simple-git-hooks` + `lint-staged`:

- On commit, staged `*.{ts,vue}` files run through `oxlint --fix` then `eslint --fix --cache`
- After linting, `pnpm run typecheck` runs (`nuxi typecheck`)
