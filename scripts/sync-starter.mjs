#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { createRequire } from 'node:module'

// 把「快速上手」文章从基座包 @kb/site 同步到本实例的内容目录。
// 来源文件随 @kb/site 发布，所以不依赖任何仓库外的路径。
//
// 用法：pnpm sync:starter

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

// 实例配置里的内容目录（配置是 ESM，动态 import 读取）
const cfg = (await import(pathToFileURL(path.join(ROOT, 'knowledge.config.mjs')).href)).default ?? {}
const contentRoot = path.resolve(ROOT, cfg.contentRoot ?? './docs')

// 从本实例的依赖里定位 @kb/site
let siteDir
try {
  const require = createRequire(path.join(ROOT, 'package.json'))
  siteDir = path.dirname(require.resolve('@kb/site/package.json'))
} catch {
  console.error('❌ 未找到依赖 @kb/site（先在实例根跑 pnpm install）')
  process.exit(1)
}

const SRC = path.join(siteDir, 'templates/getting-started/index.md')
if (!fs.existsSync(SRC)) {
  console.error(`❌ @kb/site 里未找到上手文：${SRC}`)
  process.exit(1)
}

const destDir = path.join(contentRoot, 'getting-started')
const dest = path.join(destDir, 'index.md')

const next = fs.readFileSync(SRC, 'utf-8')
const current = fs.existsSync(dest) ? fs.readFileSync(dest, 'utf-8') : null

if (current === next) {
  console.log(`✓ 已是最新（${path.relative(ROOT, dest)}）`)
} else {
  fs.mkdirSync(destDir, { recursive: true })
  fs.writeFileSync(dest, next)
  console.log(`✓ 已同步 ${path.relative(ROOT, dest)}`)
}
