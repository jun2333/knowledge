#!/usr/bin/env bash
#
# 部署知识库到 GitHub Pages（gh-pages 分支模式）
#
# 特点：不依赖 GitHub Actions，本地构建后直接把产物推到 gh-pages 分支。
# 适用：GitHub 账号无法使用 Actions（如账单问题）时的替代方案。
#
# 用法：bash scripts/deploy-github.sh
#
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DIST_DIR="$REPO_ROOT/docs/.vitepress/dist"
REMOTE="git@github.com:jun2333/knowledge.git"
BRANCH="gh-pages"
SITE_URL="https://jun2333.github.io/knowledge/"

echo "📦 ① 构建（BASE_PATH=/knowledge/）..."
cd "$REPO_ROOT"
BASE_PATH=/knowledge/ pnpm build

echo ""
echo "🚀 ② 推送到 $BRANCH 分支..."

# 在 dist 目录内建独立 git 仓库（dist 本身被主仓库 gitignore，互不影响）
cd "$DIST_DIR"
rm -rf .git
git init -q
git checkout -q -b "$BRANCH"
git add -A
git commit -q -m "deploy: $(date '+%Y-%m-%d %H:%M:%S')"
git push -f "$REMOTE" "$BRANCH:$BRANCH"

echo ""
echo "✅ 部署完成：$SITE_URL"
echo "   （首次部署后需在 GitHub 仓库设置 Pages → Source 选 gh-pages 分支）"
