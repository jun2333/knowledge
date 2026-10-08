#!/usr/bin/env node
/**
 * service/ 拆目录的映射表（单一真相源）
 *
 * 背景：VitePress 的 sidebar 按「路径前缀」匹配。要让「Node 服务端 / Java 服务端 /
 * 后端基础」三个顶层入口各自拥有独立侧边栏，必须让它们的文章落在不同路径前缀下。
 *
 * 只拆 3 个子目录（node / java / common），其余 27 篇留在 service/ 根下。
 *
 * 导出：MAPPING = { 'node-core.md': 'node/node-core.md', ... }
 *       GROUPS  = { node: [...], java: [...], common: [...] }
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const SERVICE = path.join(ROOT, 'docs/service')

/** 文件名 → 相对 service/ 的新路径 */
export const MAPPING = {
  // ── node/：Node 服务端（3 篇）
  'node-core': 'node/node-core',
  'node-high-concurrency': 'node/node-high-concurrency',
  'node-deployment': 'node/node-deployment',

  // ── java/：Java 服务端（9 篇）
  'java-basics': 'java/java-basics',
  'java-concurrency': 'java/java-concurrency',
  'java-high-concurrency': 'java/java-high-concurrency',
  'java-jvm': 'java/java-jvm',
  'java-collections': 'java/java-collections',
  'spring-boot': 'java/spring-boot',
  'spring-principles': 'java/spring-principles',
  'spring-cloud': 'java/spring-cloud',
  'java-deployment': 'java/java-deployment',

  // ── common/：后端基础（公共，10 篇）
  database: 'common/database',
  'mysql-advanced': 'common/mysql-advanced',
  'redis-intro': 'common/redis-intro',
  'mq-intro': 'common/mq-intro',
  elasticsearch: 'common/elasticsearch',
  'distributed-basics': 'common/distributed-basics',
  'concurrency-locks': 'common/concurrency-locks',
  'data-distribution-locks': 'common/data-distribution-locks',
  'design-patterns': 'common/design-patterns',
  'linux-basics': 'common/linux-basics',
}

/** 分组 → 该组文件名（用于生成 sidebar） */
export const GROUPS = {
  node: ['node-core', 'node-high-concurrency', 'node-deployment'],
  java: [
    'java-basics',
    'java-concurrency',
    'java-high-concurrency',
    'java-jvm',
    'java-collections',
    'spring-boot',
    'spring-principles',
    'spring-cloud',
    'java-deployment',
  ],
  common: [
    'database',
    'mysql-advanced',
    'redis-intro',
    'mq-intro',
    'elasticsearch',
    'distributed-basics',
    'concurrency-locks',
    'data-distribution-locks',
    'design-patterns',
    'linux-basics',
  ],
}

/** 未移动的文件（留在 service/ 根下） */
export const UNMOVED = [
  'roadmap',
  'express', 'koa', 'egg', 'nest', 'fastify',
  'typeorm', 'mybatis-plus',
  'restful-api', 'auth', 'permission-design', 'bff', 'graphql', 'serverless', 'short-url-design',
  'docker', 'pm2', 'backend-testing', 'node-vs-java', 'troubleshooting',
]

/** 校验：映射与磁盘必须完全吻合，多一个少一个都报错 */
export function verify() {
  const onDisk = fs
    .readdirSync(SERVICE, { withFileTypes: true })
    .filter((e) => e.isFile() && e.name.endsWith('.md'))
    .map((e) => e.name.replace(/\.md$/, ''))
    .sort()

  const mapped = Object.keys(MAPPING).sort()
  const expected = [...mapped, ...UNMOVED].sort()

  const problems = []
  if (onDisk.length !== expected.length) {
    problems.push(`磁盘 ${onDisk.length} 篇 ≠ 预期 ${expected.length} 篇`)
  }
  for (const f of onDisk) {
    if (!expected.includes(f)) problems.push(`磁盘有但未归类: ${f}`)
  }
  for (const f of expected) {
    if (!onDisk.includes(f)) problems.push(`归类了但磁盘没有: ${f}`)
  }
  // 分组内文件名必须与 MAPPING 一致
  for (const [g, files] of Object.entries(GROUPS)) {
    for (const f of files) {
      if (!MAPPING[f]?.startsWith(`${g}/`)) {
        problems.push(`GROUPS.${g} 里的 ${f} 与 MAPPING 不一致（${MAPPING[f] ?? '未映射'}）`)
      }
    }
  }
  return { ok: problems.length === 0, problems, onDisk }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { ok, problems, onDisk } = verify()
  console.log(`service/ 共 ${onDisk.length} 篇`)
  console.log(`  移动: ${Object.keys(MAPPING).length} 篇（node ${GROUPS.node.length} / java ${GROUPS.java.length} / common ${GROUPS.common.length}）`)
  console.log(`  留原位: ${UNMOVED.length} 篇`)
  if (ok) {
    console.log('  ✅ 映射表与磁盘完全吻合')
  } else {
    console.log('  ❌ 问题:')
    for (const p of problems) console.log(`    - ${p}`)
    process.exit(1)
  }
}
