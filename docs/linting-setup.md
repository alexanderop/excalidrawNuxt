# Linting Setup

This project uses a dual-linter approach: Oxlint for speed, ESLint for comprehensive rules.

## Architecture

```
bun run lint
  └── run-s lint:*
        ├── lint:oxlint (fast, Rust-based, catches basics)
        └── lint:eslint (comprehensive Vue/TS/import rules)
```

Oxlint runs 50-100x faster than ESLint. It handles correctness, suspicious patterns, and basic TypeScript rules. ESLint handles Vue-specific rules, import boundaries, and custom patterns.

## Key Files

- `.oxlintrc.json` - Oxlint configuration
- `eslint.config.ts` - ESLint flat config (not `.eslintrc`)
- `app/utils/tryCatch.ts` - Required utility since native try/catch is banned

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
import pluginOxlint from 'eslint-plugin-oxlint'

export default defineConfigWithVueTs(
  // ... other configs
  ...pluginOxlint.buildFromOxlintConfigFile('./.oxlintrc.json'),
)
```

### Unicorn Error Messages
The `unicorn/error-message` rule requires all `new Error()` calls to include a message string. Empty `new Error()` will fail linting.

### Multi-word Component Names (Filename-Based)
The `vue/multi-word-component-names` rule checks the **filename**, not `defineOptions({ name })`. Single-word filenames like `Toolbar.vue` fail.

**Fixes:**
- Rename to multi-word: `DrawingToolbar.vue`, `MainToolbar.vue`
- Or add to `ignores` array in `eslint.config.ts` (only for shared/generic components)

## Cross-Feature Import Isolation

Features in `app/features/` are independent modules. ESLint enforces that no feature imports from another feature via `import-x/no-restricted-paths` zones.

**Current features with isolation zones:**
- `code`, `groups`, `linear-editor`, `rendering`, `selection`, `tools`

**Features on disk without isolation zones (not yet enforced):**
- `binding`, `canvas`, `elements`, `theme`

Each zone allows imports from its own directory **and from `theme`** (shared exception). Some features have additional exceptions:
```typescript
{ target: './app/features/groups', from: './app/features', except: ['./groups', './theme'] },
{ target: './app/features/code', from: './app/features', except: ['./code', './theme', './elements', './selection', './tools'] },
{ target: './app/features/rendering', from: './app/features', except: ['./rendering', './theme', './code'] },
{ target: './app/features/tools', from: './app/features', except: ['./tools', './theme', './code'] },
```

**Adding a new feature:** Add a matching zone in `eslint.config.ts` under the "Cross-feature isolation" comment:
```typescript
{ target: './app/features/<name>', from: './app/features', except: ['./<name>', './theme'] },
```

Features can import from shared code (`app/shared/`, `app/utils/`, etc.) and from `app/features/theme/`, but never from each other. If two features need shared logic, extract it to `app/shared/` or `app/utils/`.

## Banned Patterns (enforced by lint)

| Pattern | Alternative |
|---------|-------------|
| `as Type` assertions | Type guards or proper typing (convention, not lint-enforced) |
| `enum` declarations | Literal unions or `as const` objects |
| `else` / `else if` | Early returns |
| Native `try/catch` | `tryCatch()` from `~/utils/tryCatch` |
| Nested ternaries | Functions with early returns |
| Hardcoded route strings | Named routes |
| `console.log` | Remove or use `console.warn`/`console.error` (oxlint) |
| `any` type | Proper types (oxlint: `typescript/no-explicit-any`) |

## Oxlint Rules (`.oxlintrc.json`)

- **Categories:** `correctness` (error), `suspicious` (warn)
- **Explicit rules:** `typescript/no-explicit-any` (error), `eslint/no-console` (error, allows `warn`/`error`)

## ESLint Sections Summary

The flat config in `eslint.config.ts` is organized into named sections:

1. **`app/vue-component-rules`** — PascalCase templates, dead code detection, max-template-depth (8), max-props (6), Vue 3.5+ APIs (`define-props-destructuring`, `prefer-use-template-ref`)
2. **`app/typescript-style`** — Complexity (max 10), no nested ternaries, banned syntax (enums, else, try/catch, hardcoded routes)
3. **`app/import-boundaries`** — Feature isolation zones, shared code cannot import from features/pages
4. **`app/vitest-rules`** — `it()` not `test()`, hooks on top, max 2 nested describes, prefer Vitest locators over `querySelector`
5. **`app/vitest-unit-flat-tests`** — Warns on `beforeEach`/`afterEach` in `*.unit.test.ts` (allows `beforeAll`/`afterAll`)
6. **`app/unicorn-overrides`** — Enables `better-regex`, `custom-error-definition`, `consistent-destructuring`; disables `no-null`, `filename-case`, `prevent-abbreviations`, `no-array-callback-reference`, `no-await-expression-member`, `no-array-reduce`, `no-useless-undefined`

## Pre-commit Hooks

Configured via `simple-git-hooks` + `lint-staged`:
- On commit, staged `*.{ts,vue}` files run through `oxlint --fix` then `eslint --fix --cache`
- After linting, `bun run typecheck` runs (`nuxi typecheck`)
