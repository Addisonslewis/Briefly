#!/usr/bin/env bash
# Installs the repo's git hooks. Run once after cloning: bash scripts/install-hooks.sh
set -euo pipefail
root="$(git rev-parse --show-toplevel)"
cp "$root/scripts/pre-commit" "$root/.git/hooks/pre-commit"
chmod +x "$root/.git/hooks/pre-commit"
echo "✅ Installed pre-commit secret scanner -> .git/hooks/pre-commit"
command -v gitleaks >/dev/null 2>&1 \
  && echo "   gitleaks detected — will be used for thorough scanning." \
  || echo "   (Optional: 'brew install gitleaks' for deeper scanning; the built-in fallback works without it.)"
