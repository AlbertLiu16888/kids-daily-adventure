#!/bin/bash
# Deploy Kids Daily Adventure to GitHub Pages
set -e

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

GH="${HOME}/.local/bin/gh"
REPO="kids-daily-adventure"
USER="AlbertLiu16888"

echo "==> Working in: $ROOT"

# Init git if needed
if [ ! -d .git ]; then
  git init -b main
fi

# Set up .gitignore
cat > .gitignore <<'EOF'
.DS_Store
__pycache__/
*.pyc
generation_log.json
node_modules/
EOF

# Check if remote exists
if ! git remote get-url origin >/dev/null 2>&1; then
  echo "==> Creating GitHub repo $USER/$REPO"
  "$GH" repo create "$USER/$REPO" --public --source=. --remote=origin \
    --description "每日互動探索遊戲：給 2~4 歲小朋友（仙貝與旺旺龍）" || true
  # If repo exists already, just add remote
  if ! git remote get-url origin >/dev/null 2>&1; then
    git remote add origin "https://github.com/$USER/$REPO.git"
  fi
fi

# Commit
git add -A
git commit -m "feat: 仙貝與旺旺龍的每日探險 v1.0 — 6 地點 × 18 任務 × 糖果收集" || echo "nothing to commit"

# Push
git branch -M main
git push -u origin main --force

# Enable Pages
echo "==> Enabling GitHub Pages"
"$GH" api -X POST "repos/$USER/$REPO/pages" \
  -f "source[branch]=main" -f "source[path]=/" 2>/dev/null || \
"$GH" api -X PUT "repos/$USER/$REPO/pages" \
  -f "source[branch]=main" -f "source[path]=/" 2>/dev/null || \
echo "(Pages may already be enabled)"

echo ""
echo "==> Deployment complete"
echo "==> Game URL: https://$USER.github.io/$REPO/"
echo "==> Repo URL: https://github.com/$USER/$REPO"
