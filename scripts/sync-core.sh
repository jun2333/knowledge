#!/usr/bin/env bash
# 把 kb-base 的改动同步到本项目的 node_modules。
#
# 为什么需要：实例依赖的是 registry 上的 @minijun/kb-core / kb-site，
# 直接改 kb-base 源码不会生效。pnpm 的 link 会被 install 覆盖，
# 所以用「build + rsync」这条路——不动依赖结构，每次改完基座跑一次即可。
#
#   core → dist（构建产物）
#   site → theme / config（纯源码，无构建步骤）
#
# 同步的内容是「本地覆盖」：pnpm install 实测不会冲掉它（装新依赖、改 lockfile 都试过），
# 但换基座大版本（package.json 里 @minijun/kb-core 的版本号变了）会重装整个包，
# 那时要重新跑一次本脚本。
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CORE_SRC="$ROOT/../kb-base/packages/core/dist"
SITE_SRC="$ROOT/../kb-base/packages/site"

if [ ! -d "$CORE_SRC" ]; then
  echo "找不到基座产物：$CORE_SRC"
  echo "先在 kb-base/packages/core 里执行 pnpm build"
  exit 1
fi

# 产物不完整时不要同步：半份 dist 同步进去比不同步更难排查。
# （tsc 不会删旧产物，所以 dist 里可能残留已删除源文件的旧产物；
#   基座的 build 脚本已改为先清空 dist，这里只做基本完整性检查。）
if [ ! -d "$CORE_SRC/prompts" ]; then
  echo "基座产物不完整：缺少 dist/prompts"
  echo "先在 kb-base/packages/core 里执行 pnpm build"
  exit 1
fi

CORE_TARGET=$(ls -d "$ROOT"/node_modules/.pnpm/@minijun+kb-core@*/node_modules/@minijun/kb-core 2>/dev/null | head -1)
if [ -z "$CORE_TARGET" ]; then
  echo "找不到 node_modules 里的 kb-core，先跑 pnpm install"
  exit 1
fi
rsync -a --delete "$CORE_SRC/" "$CORE_TARGET/dist/"
echo "已同步 kb-core → $CORE_TARGET/dist"

SITE_TARGET=$(ls -d "$ROOT"/node_modules/.pnpm/@minijun+kb-site@*/node_modules/@minijun/kb-site 2>/dev/null | head -1)
if [ -n "$SITE_TARGET" ]; then
  rsync -a --delete "$SITE_SRC/theme/" "$SITE_TARGET/theme/"
  rsync -a --delete "$SITE_SRC/config/" "$SITE_TARGET/config/"
  echo "已同步 kb-site → $SITE_TARGET/{theme,config}"
else
  echo "⚠️ 没找到 kb-site，跳过（前端改动不会生效）"
fi

# 打印提示词指纹：改了提示词后拿它跟评估记录里的 env.promptHash 对比，
# 能立刻确认「跑评估用的是不是新的提示词」。
FINGERPRINT=$(node --input-type=module -e "
  const m = await import('file://$CORE_TARGET/dist/prompt/index.js')
  process.stdout.write(m.promptFingerprint())
" 2>/dev/null || echo "（读取失败）")
echo "提示词指纹：$FINGERPRINT"
