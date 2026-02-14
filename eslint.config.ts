import pluginVitest from "@vitest/eslint-plugin";
import skipFormatting from "@vue/eslint-config-prettier/skip-formatting";
import { defineConfigWithVueTs, vueTsConfigs } from "@vue/eslint-config-typescript";
import pluginImportX from "eslint-plugin-import-x";
import pluginOxlint from "eslint-plugin-oxlint";
import pluginUnicorn from "eslint-plugin-unicorn";
import pluginVue from "eslint-plugin-vue";
import pluginLocal from "./eslint-rules";

export default defineConfigWithVueTs(
  {
    ignores: [
      "**/dist/**",
      "**/coverage/**",
      "**/node_modules/**",
      "**/.nuxt/**",
      "**/.output/**",
      "excalidraw/**",
      "eslint-rules/**",
    ],
  },

  pluginVue.configs["flat/essential"],
  vueTsConfigs.recommended,
  pluginUnicorn.configs.recommended,

  // =============================================
  // Vue component rules
  // =============================================
  {
    name: "app/vue-component-rules",
    files: ["app/**/*.vue"],
    rules: {
      // Naming conventions
      "vue/multi-word-component-names": ["error", { ignores: ["App", "Layout", "index"] }],
      "vue/component-name-in-template-casing": [
        "error",
        "PascalCase",
        {
          registeredComponentsOnly: false,
        },
      ],
      "vue/prop-name-casing": ["error", "camelCase"],
      "vue/custom-event-name-casing": ["error", "kebab-case"],

      // Dead code detection
      "vue/no-unused-properties": [
        "error",
        {
          groups: ["props", "data", "computed", "methods"],
        },
      ],
      "vue/no-unused-refs": "error",
      "vue/no-unused-emit-declarations": "error",

      // Vue 3.5+ APIs
      "vue/define-props-destructuring": "error",
      "vue/prefer-use-template-ref": "error",

      // Explicit component APIs
      "vue/require-expose": "warn",
      "vue/require-explicit-slots": "warn",

      // Template readability
      "vue/max-template-depth": ["error", { maxDepth: 8 }],
      "vue/max-props": ["error", { maxProps: 6 }],
    },
  },

  // =============================================
  // TypeScript style guide — Must-Have Rules
  // =============================================
  {
    name: "app/typescript-style",
    files: ["app/**/*.{ts,vue}", "packages/core/src/**/*.ts"],
    rules: {
      // Cyclomatic complexity
      complexity: ["warn", { max: 10 }],

      // No nested ternaries
      "no-nested-ternary": "error",

      // Banned syntax patterns
      "no-restricted-syntax": [
        "error",
        // No enums
        {
          selector: "TSEnumDeclaration",
          message: "Use literal unions or `as const` objects instead of enums.",
        },
        // No else-if
        {
          selector: "IfStatement > IfStatement.alternate",
          message: "Avoid `else if`. Prefer early returns or ternary operators.",
        },
        // No else
        {
          selector: "IfStatement > :not(IfStatement).alternate",
          message: "Avoid `else`. Prefer early returns or ternary operators.",
        },
        // No native try/catch — use tryCatch() utility
        {
          selector: "TryStatement",
          message:
            "Use tryCatch() from @drawvue/core instead of try/catch. Returns Result<T> tuple: [error, null] | [null, data].",
        },
        // No hardcoded route strings
        {
          selector:
            'CallExpression[callee.property.name="push"][callee.object.name="router"] > Literal:first-child',
          message: "Use named routes instead of hardcoded path strings.",
        },
        {
          selector:
            'CallExpression[callee.property.name="push"][callee.object.name="router"] > TemplateLiteral:first-child',
          message: "Use named routes instead of template literals.",
        },
        // No function props — use defineEmits instead of callback props
        {
          selector:
            'CallExpression[callee.name="defineProps"] TSTypeLiteral > TSPropertySignature > TSTypeAnnotation > TSFunctionType',
          message: "Props should not be functions. Use defineEmits instead of callback props.",
        },
        {
          selector:
            'CallExpression[callee.name="defineProps"] TSTypeLiteral > TSPropertySignature > TSTypeAnnotation > TSTypeReference[typeName.name="Function"]',
          message:
            "Props should not use the Function type. Use defineEmits instead of callback props.",
        },
      ],
    },
  },

  // =============================================
  // Local rules — callback object props detection
  // =============================================
  {
    name: "app/local-rules",
    files: ["app/**/*.vue"],
    plugins: { local: pluginLocal },
    rules: {
      "local/no-callback-object-props": "error",
    },
  },

  // =============================================
  // Feature boundary enforcement (import rules)
  // =============================================
  {
    name: "app/import-boundaries",
    files: ["app/**/*.{ts,vue}"],
    plugins: { "import-x": pluginImportX },
    rules: {
      "import-x/no-restricted-paths": [
        "error",
        {
          zones: [
            // Features cannot import from pages (pages are top-level orchestrators)
            {
              target: "./app/features",
              from: "./app/pages",
            },
          ],
        },
      ],
    },
  },

  // =============================================
  // Vitest test rules
  // =============================================
  {
    name: "app/vitest-rules",
    files: [
      "app/**/__tests__/**/*.{ts,spec.ts}",
      "app/**/*.test.ts",
      "app/**/*.spec.ts",
      "packages/core/src/**/__tests__/**/*.{ts,spec.ts}",
      "packages/core/src/**/*.test.ts",
      "packages/core/src/**/*.spec.ts",
    ],
    plugins: { vitest: pluginVitest },
    rules: {
      ...pluginVitest.configs.recommended.rules,

      // Test structure
      "vitest/consistent-test-it": ["error", { fn: "it" }],
      "vitest/prefer-hooks-on-top": "error",
      "vitest/prefer-hooks-in-order": "error",
      "vitest/no-duplicate-hooks": "error",
      "vitest/require-top-level-describe": "error",
      "vitest/max-nested-describe": ["error", { max: 2 }],
      "vitest/no-conditional-in-test": "warn",

      // Better assertions
      "vitest/prefer-to-be": "error",
      "vitest/prefer-to-have-length": "error",
      "vitest/prefer-to-contain": "error",
      "vitest/prefer-mock-promise-shorthand": "error",

      // Prefer Vitest locators over querySelector
      "no-restricted-syntax": [
        "warn",
        {
          selector: "CallExpression[callee.property.name=/^querySelector(All)?$/]",
          message:
            "Prefer page.getByRole(), page.getByText(), or page.getByTestId() over querySelector.",
        },
      ],
    },
  },

  // =============================================
  // Unit tests: flat tests (no beforeEach/afterEach)
  // =============================================
  {
    name: "app/vitest-unit-flat-tests",
    files: ["app/**/*.unit.test.ts", "packages/core/src/**/*.unit.test.ts"],
    rules: {
      "vitest/no-hooks": ["warn", { allow: ["beforeAll", "afterAll"] }],
    },
  },

  // =============================================
  // Unicorn overrides
  // =============================================
  {
    name: "app/unicorn-overrides",
    rules: {
      // Enable non-recommended rules that add value
      "unicorn/better-regex": "warn",
      "unicorn/custom-error-definition": "error",
      "unicorn/no-unused-properties": "warn",
      "unicorn/consistent-destructuring": "warn",

      // Disable rules that conflict with project conventions
      "unicorn/no-null": "off",
      "unicorn/filename-case": "off",
      "unicorn/prevent-abbreviations": "off",
      "unicorn/no-array-callback-reference": "off",
      "unicorn/no-await-expression-member": "off",
      "unicorn/no-array-reduce": "off",
      "unicorn/no-useless-undefined": "off",
    },
  },

  // =============================================
  // Disable rules handled by Oxlint
  // =============================================
  ...pluginOxlint.buildFromOxlintConfigFile("./.oxlintrc.json"),

  skipFormatting,
);
