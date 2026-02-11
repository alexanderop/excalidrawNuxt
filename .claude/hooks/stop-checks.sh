#!/usr/bin/env bash
set -euo pipefail

cd "$CLAUDE_PROJECT_DIR"

# Skip all checks if there are no file changes
if git diff --quiet HEAD && [ -z "$(git ls-files --others --exclude-standard)" ]; then
  exit 0
fi

errors=""

# 1. Lint (oxlint then eslint)
if ! bun run lint 2>&1; then
  errors+="LINT FAILED. Run 'bun run lint' to see errors and fix them.\n"
fi

# 2. Typecheck
if ! bun run typecheck 2>&1; then
  errors+="TYPECHECK FAILED. Run 'bun run typecheck' to see errors and fix them.\n"
fi

if [ -n "$errors" ]; then
  echo -e "$errors" >&2
  exit 2  # exit 2 = BLOCK Claude from stopping
fi

exit 0  # all good, Claude can stop
