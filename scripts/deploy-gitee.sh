#!/usr/bin/env bash
#
# 部署 VitePress 静态站到 Gitee Pages
#
# 原理：Gitee Pages 免费版不执行构建命令，只能托管仓库内的静态文件。
# 因此本脚本在本地构建带 base 路径的静态站，并把产物同步到 gh-pages 分支，
# 之后只需在 Gitee 仓库「服务 → Gitee Pages」选择 gh-pages 分支，点击「更新」即可。
#
# 用法：bash scripts/deploy-gitee.sh
# 可通过环境变量覆盖默认值：
#   BASE_PATH=/custom/ pnpm build 的 base 路径（默认 /frontend-knowledge-summary/）
#   REMOTE=origin 推送的远程名（默认 origin）
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BASE_PATH="${BASE_PATH:-/frontend-knowledge-summary/}"
REMOTE="${REMOTE:-origin}"
BRANCH="gh-pages"
DIST_DIR="$ROOT_DIR/docs/.vitepress/dist"
SITE_URL="https://jun2333.gitee.io/frontend-knowledge-summary/"

cd "$ROOT_DIR"

echo ">> [1/3] 构建静态站 (base=$BASE_PATH)"
BASE_PATH="$BASE_PATH" pnpm build

# 用 git worktree 操作 gh-pages 分支，避免影响当前工作区
TMP_WORKTREE="$(mktemp -d /tmp/gitee-pages.XXXXXX)"
trap 'git worktree remove "$TMP_WORKTREE" --force >/dev/null 2>&1 || true' EXIT

echo ">> [2/3] 同步构建产物到 $BRANCH 分支"
if git show-ref --verify --quiet "refs/heads/$BRANCH"; then
  git worktree add "$TMP_WORKTREE" "$BRANCH" >/dev/null
else
  # 首次部署：创建孤儿分支（不继承 master 历史）
  git worktree add --detach "$TMP_WORKTREE" >/dev/null
  git -C "$TMP_WORKTREE" checkout --orphan "$BRANCH" >/dev/null
fi

# 清空 worktree 中的旧文件（保留 .git）
git -C "$TMP_WORKTREE" rm -rf . >/dev/null 2>&1 || true
find "$TMP_WORKTREE" -mindepth 1 ! -path "$TMP_WORKTREE/.git" ! -name '.git' -exec rm -rf {} + 2>/dev/null || true

# 拷贝构建产物
cp -R "$DIST_DIR"/. "$TMP_WORKTREE"/

# 提交并推送
git -C "$TMP_WORKTREE" add -A
if git -C "$TMP_WORKTREE" diff --cached --quiet; then
  echo ">> 构建产物无变化，跳过提交推送"
else
  git -C "$TMP_WORKTREE" commit -m "deploy: 更新知识库 ($(date '+%Y-%m-%d %H:%M'))" >/dev/null
  echo ">> [3/3] 推送 $BRANCH 到 $REMOTE"
  git -C "$TMP_WORKTREE" push "$REMOTE" "$BRANCH"
fi

git worktree remove "$TMP_WORKTREE" --force >/dev/null
trap - EXIT

echo ""
echo "✅ 部署产物已推送到 $REMOTE/$BRANCH"
echo "   下一步（需在 Gitee 网页操作）："
echo "   1. 进入仓库「服务 → Gitee Pages」"
echo "   2. 部署分支选择 ${BRANCH}，部署目录留空"
echo "   3. 点击「启动」，完成后访问：$SITE_URL"
echo "   以后每次更新内容，重新执行本脚本，再在 Gitee Pages 页面点「更新」"
