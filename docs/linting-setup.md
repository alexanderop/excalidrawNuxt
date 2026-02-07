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

## Banned Patterns (enforced by lint)

| Pattern | Alternative |
|---------|-------------|
| `as Type` assertions | Type guards or proper typing |
| `enum` declarations | Literal unions or `as const` objects |
| `else` / `else if` | Early returns |
| Native `try/catch` | `tryCatch()` from `~/utils/tryCatch` |
| Nested ternaries | Functions with early returns |
| Hardcoded route strings | Named routes |
