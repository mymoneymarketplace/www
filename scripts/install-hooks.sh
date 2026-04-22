#!/usr/bin/env sh
# install-hooks.sh — install git hooks for the mmm-site repo.
#
# Copies a thin .git/hooks/pre-commit shim that invokes
# scripts/pre-commit-audit.js. The shim is idempotent — re-running this
# script overwrites any prior install.
#
# Usage:  sh scripts/install-hooks.sh
#
# Bypass once:  SKIP_AUDIT=1 git commit ...   or   git commit --no-verify

set -eu

REPO_ROOT="$(git rev-parse --show-toplevel)"
HOOK_DIR="$REPO_ROOT/.git/hooks"
HOOK_PATH="$HOOK_DIR/pre-commit"

mkdir -p "$HOOK_DIR"

cat > "$HOOK_PATH" <<'HOOK'
#!/usr/bin/env sh
# Auto-installed by scripts/install-hooks.sh. Do not edit here — edit the
# installer and re-run `sh scripts/install-hooks.sh`.
REPO_ROOT="$(git rev-parse --show-toplevel)"
exec node "$REPO_ROOT/scripts/pre-commit-audit.js"
HOOK

chmod +x "$HOOK_PATH"

echo "Installed pre-commit hook at $HOOK_PATH"
echo "To bypass once: SKIP_AUDIT=1 git commit ...   or   git commit --no-verify"
