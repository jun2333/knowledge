# Elasticsearch 入门

> **优先级：P1** — 搜索引擎是后端中间件三件套（Redis/Kafka/ES）之一。学习重点是"它解决什么问题、和 MySQL 什么区别、什么时候该用它"，而不是背 API。

::: tip 背景
Elasticsearch（ES）是**搜索/日志的事实标准**。你可能已经在 mall 里见过它两次而没意识到：**mall-search 服务（商品搜索）** 和 **ELK 日志平台（logstash.conf 输出到 ES）**。本文讲清楚"ES 是啥、为什么用它、什么时候不该用"。
:::

## ES 是什么

**分布式搜索引擎 + 文档存储**。核心不是"存"，而是"**全文搜索**"——在海量数据里秒级搜出包含某个词的记录。

```
本质：基于 Lucene 封装的分布式搜索引擎
擅长：全文模糊搜索、海量数据聚合分析
不是：关系型数据库（没有事务、JOIN、强一致）
```

**为什么不叫"数据库"**：它存数据，但模型是"文档 + 倒排索引"，和 MySQL 的行列表完全两套设计。

## 核心概念（一套"类数据库"术语）

| ES 术语 | 类比 MySQL | 说明 |
|---------|-----------|------|
| **Index（索引）** | Database/Table | 一类文档的集合（如 `mall-product`） |
| **Document（文档）** | Row | 一条数据（JSON 格式） |
| **Mapping（映射）** | Schema | 字段类型定义 |
| **倒排索引** | 无（B+树） | **核心**：词 → 文档的映射 |

**倒排索引（为什么搜得快）**：

```
文档："华为手机真不错"  → 分词：华为/手机/真不错
倒排表：华为 → [doc1, doc5]   手机 → [doc1, doc9]
搜索"手机" → 直接查倒排表 → 秒回 doc1, doc9

对比 MySQL：LIKE '%手机%' → 全表扫描（前导 % 索引失效）
```

**MySQL 用 B+树（按前缀查），ES 用倒排索引（按词查）**——这就是"模糊搜索"场景 ES 碾压 MySQL 的根本原因。

## 和 MySQL 的对比（什么时候该用 ES）

| | MySQL | Elasticsearch |
|--|-------|--------------|
| 定位 | 业务数据源（事务、强一致） | 搜索、分析、日志 |
| 搜索 | `LIKE '%x%'` 全表扫 | 倒排索引，毫秒级 |
| 事务 | ✅ | ❌ |
| 数据一致性 | 强一致 | 近实时（写入 ~1s 后可搜） |
| 存储模型 | 行 + 外键 + 表关联 | 文档 + 无强关联 |

**黄金法则**：**MySQL 做主存储，ES 做搜索副本**——数据写入 MySQL，同步一份到 ES 供搜索（CQRS 思想：写走 MySQL，读走 ES）。

```
业务数据 → MySQL（权威）
    └→ 同步 → ES（搜索/分析用副本）
```

mall-search 就是这个模式：商品在 MySQL，同步一份到 ES 供商品搜索。

## 两大用途（mall 里都见过）

**① 业务搜索**（mall-search 服务）

```yaml
# mall-search/application-dev.yml
spring:
  elasticsearch:
    uris: localhost:9200
```
商品数据同步进 ES → 搜索接口查 ES → 秒回结果。

**② 日志收集（ELK 平台）**

```
应用 logback → TCP → Logstash → ES（logstash.conf 的 output）
索引：mall-record-2026.09.02
→ Kibana 可视化查日志
```

**同一个 ES，两个用途**：搜索用（业务）+ 日志用（ELK）——一个是"查数据"，一个是"查日志"，底层都是"全文搜得快"。

## 使用姿势（Java 侧，了解即可）

```java
// ① Spring Data Elasticsearch：接口即操作（类似 JPA）
public interface ProductRepository extends ElasticsearchRepository<Product, Long> {
    List<Product> findByNameContaining(String keyword);   // 方法名即查询
}

// ② 或原生 API 拼查询（Query DSL）
SearchSourceBuilder sourceBuilder = new SearchSourceBuilder();
sourceBuilder.query(QueryBuilders.matchQuery("name", keyword));   // match：分词匹配
sourceBuilder.from(0).size(10);                                   // 分页
```

**对应前端**：ES 的 Query DSL ≈ 前端调搜索接口传参，后端拼 ES 查询。TS 里用官方 client（`@elastic/elasticsearch`）也一样。

## 前端类比（理解它的位置）

```js
// ES ≈ 前端的一个"搜索后端"：
// 全文搜索（模糊搜到所有含关键词的记录）  ≈ 不存在的 JS 原生能力，靠后端 ES
// ELK 日志 ≈ Sentry / 日志平台的后端存储
// 一套 ES 服务，既可做搜索也可做日志存储
```

## 学习建议

1. **先想清楚"为什么用"**：全文模糊搜索、海量日志检索 → 用 ES；事务型业务 → 别用
2. **mall 里看实际**：`mall-search` 模块（搜索用）+ `document/elk/logstash.conf`（日志用）
3. **概念优先**：倒排索引（为什么快）、Index/Document/Mapping（术语）、MySQL 主存 + ES 副本（架构）
4. **不背 API**：搜索查询用的时候查文档，重点是"该不该用它"

## 相关

- [Redis 入门](/service/redis-intro) - 另一种"数据不一定放 MySQL"的思路
- [消息队列（Kafka）入门](/service/mq-intro) - 数据同步/削峰的中转站
- [Spring Boot 入门](/service/spring-boot) - 应用开发，里面讲了日志链路（logback → Logstash）
