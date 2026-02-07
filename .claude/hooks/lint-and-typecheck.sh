#!/bin/bash
# Runs lint + typecheck after agent edits a file.
# Exit code 2 = block and feed stderr back to the agent as feedback.

cd "$CLAUDE_PROJECT_DIR" || exit 1

LINT_OUTPUT=$(bun run lint 2>&1)
LINT_CODE=$?

TYPECHECK_OUTPUT=$(bun run typecheck 2>&1)
TYPECHECK_CODE=$?

if [ $LINT_CODE -ne 0 ] || [ $TYPECHECK_CODE -ne 0 ]; then
  if [ $LINT_CODE -ne 0 ]; then
    echo "=== ESLint errors ===" >&2
    echo "$LINT_OUTPUT" >&2
  fi
  if [ $TYPECHECK_CODE -ne 0 ]; then
    echo "=== TypeCheck errors ===" >&2
    echo "$TYPECHECK_OUTPUT" >&2
  fi
  exit 2
fi

exit 0
