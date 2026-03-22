# OutOfMemoryError 处理手册

## 概述

OutOfMemoryError (OOM) 表示 JVM 无法分配更多内存，通常是因为堆内存不足或内存泄漏。

## 错误类型

### 1. Java heap space
**原因**: 堆内存不足
**表现**: `java.lang.OutOfMemoryError: Java heap space`

### 2. GC overhead limit exceeded
**原因**: GC 花费过多时间但回收很少内存
**表现**: `java.lang.OutOfMemoryError: GC overhead limit exceeded`

### 3. Metaspace
**原因**: 类元数据区域不足
**表现**: `java.lang.OutOfMemoryError: Metaspace`

## 排查步骤

### 1. 收集信息
```bash
# 获取堆转储
jmap -dump:format=b,file=heap.hprof <pid>

# 查看内存使用
jstat -gc <pid> 1000

# 查看堆配置
jinfo -flags <pid>
```

### 2. 分析堆转储
使用 MAT (Memory Analyzer Tool) 或 VisualVM 分析:
- 查找大对象
- 分析对象引用链
- 识别内存泄漏点

### 3. 常见泄漏模式
- 集合类未清理
- 静态集合持续增长
- 监听器/回调未注销
- 缓存未设置上限
- 连接未正确关闭

## 解决方案

### 短期
1. 增加堆内存: `-Xmx4g`
2. 重启应用释放内存
3. 临时限流降低内存压力

### 长期
1. 修复内存泄漏
2. 优化对象生命周期
3. 使用对象池
4. 实施内存监控告警

## JVM 参数建议

```bash
# 基础配置
-Xms2g -Xmx4g

# G1 GC（推荐 Java 11+）
-XX:+UseG1GC
-XX:MaxGCPauseMillis=200

# OOM 时自动 dump
-XX:+HeapDumpOnOutOfMemoryError
-XX:HeapDumpPath=/var/log/heap-dumps/

# GC 日志
-Xlog:gc*:file=/var/log/gc.log:time,uptime:filecount=5,filesize=10M
```
