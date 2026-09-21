#!/usr/bin/env node
/**
 * 同步「本地专属内容」到 docs/（线上构建经 config.mts 的 LOCAL_ONLY + srcExclude 排除）
 *
 * 目前同步两组：
 *   ① resume/interview-questions → docs/interview-questions
 *   ② resume/resume-v4-*.md      → docs/resume/（简历批注副本）
 *
 * 为什么不能直接 symlink / 引用：
 *   resume 包的 markdown 里可能包含 Vue 模板语法（{{ }}）和裸标签
 *   （<script> / <style> / <T> 等），VitePress 会用 Vue 编译器去解析，
 *   把 {{ }} 当插值、把 <script> 当副作用标签，导致构建失败。
 *
 * 这里的处理策略（只处理「围栏代码块之外」的内容，代码块内不动）：
 *   - {{  →  {&#8203;{    （插入零宽空格断开，Vue 不再识别为插值，视觉无差异）
 *   - }}  →  }&#8203;}    （同理）
 *   - <标签  → &lt;标签  （转实体，避免被当成组件/副作用标签）
 *
 * 注意：HTML 实体 &#123; 对「非法插值」无效（解码后仍是 {{...}} 继续报错），
 *       所以 {{ }} 必须用零宽字符物理断开。
 *
 * 用法：pnpm sync（= node scripts/sync-local.mjs）
 *   （本地 dev / 构建前执行一次；resume 内容更新后需重新执行）
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')

const ZW = '&#8203;' // 零宽空格，用于断开 {{ }}

/** 转义一段文本里的 Vue 冲突语法（仅用于「非代码块」文本） */
function escapeText(text) {
  return text
    // 断开插值：{{ → {ZW{ ，}} → }ZW}
    .replaceAll('{{', `{${ZW}{`)
    .replaceAll('}}', `}${ZW}}`)
    // 转义标签起始的 <（<script> / <style> / <T> / </...> 等），
    // 不影响普通用法（如 "a < b" 中 < 后跟空格）
    .replace(/<(?=[a-zA-Z/!])/g, '&lt;')
}

/** 逐行处理：围栏代码块（``` 或 ~~~）内原样保留，块外做转义 */
function escapeVueConflicts(text) {
  const lines = text.split('\n')
  let inFence = false
  return lines
    .map((line) => {
      const trimmed = line.trimStart()
      if (/^(```|~~~)/.test(trimmed)) {
        inFence = !inFence
        return line
      }
      return inFence ? line : escapeText(line)
    })
    .join('\n')
}

/** ① 面试题：resume/interview-questions → docs/interview-questions */
function syncInterviewQuestions() {
  const SRC = path.join(ROOT, 'resume/interview-questions')
  const DST = path.join(ROOT, 'docs/interview-questions')

  if (!fs.existsSync(SRC)) {
    console.error('❌ 源目录不存在:', SRC)
    process.exit(1)
  }

  fs.rmSync(DST, { recursive: true, force: true })
  fs.mkdirSync(DST, { recursive: true })

  const files = fs.readdirSync(SRC).filter((f) => f.endsWith('.md'))
  for (const f of files) {
    const raw = fs.readFileSync(path.join(SRC, f), 'utf-8')
    const escaped = escapeVueConflicts(raw)
    fs.writeFileSync(path.join(DST, f), escaped, 'utf-8')
    console.log('  ✅', f)
  }

  // 生成目录首页 index.md，否则访问 /interview-questions/（目录根）会 404
  const indexMd = [
    '# 面试题',
    '',
    '> 个人面试笔记，从 `resume/interview-questions/` 同步生成，仅本地可见。',
    '',
    ...files.map((f) => {
      const name = f.replace(/\.md$/, '')
      const raw = fs.readFileSync(path.join(SRC, f), 'utf-8')
      const m = raw.match(/^#\s+(.+)$/m)
      const title = m ? m[1].trim() : name
      return `- [${title}](./${name})`
    }),
    '',
  ].join('\n')
  fs.writeFileSync(path.join(DST, 'index.md'), indexMd, 'utf-8')
  console.log('  ✅ index.md（目录首页）')

  console.log(`面试题同步完成：${files.length} 个文件 → docs/interview-questions/`)
}

/**
 * ② 简历副本：resume/resume-v4-*.md → docs/resume/
 * 新版本简历在这里加一行即可（sidebar 链接在 config.mts 的 '/resume/' 分组同步加）
 */
const RESUME_FILES = [
  { src: 'resume/resume-v4-frontend.md', dst: 'v4-frontend.md', title: '简历 v4 · 前端版' },
  { src: 'resume/resume-v4-fullstack.md', dst: 'v4-fullstack.md', title: '简历 v4 · 全栈版' },
]

function syncResumes() {
  const DST = path.join(ROOT, 'docs/resume')
  fs.mkdirSync(DST, { recursive: true })

  for (const { src, dst, title } of RESUME_FILES) {
    const srcPath = path.join(ROOT, src)
    const dstPath = path.join(DST, dst)
    if (!fs.existsSync(srcPath)) {
      console.error('  ⚠️ 源文件不存在，跳过:', src)
      continue
    }

    const raw = fs.readFileSync(srcPath, 'utf-8')

    const out = [
      '---',
      `title: ${title}`,
      '---',
      '',
      escapeVueConflicts(raw).trimEnd(),
      '',
    ].join('\n')

    fs.writeFileSync(dstPath, out, 'utf-8')
    console.log('  ✅', src, '→', `docs/resume/${dst}`)
  }

  console.log(`简历同步完成：${RESUME_FILES.length} 个文件 → docs/resume/`)
}

function main() {
  syncInterviewQuestions()
  console.log('')
  syncResumes()
}

main()
