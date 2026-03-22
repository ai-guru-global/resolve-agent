"""Log Analyzer Skill - 日志分析技能

该 Skill 提供日志分析功能，能够：
- 解析和过滤日志条目
- 检测常见错误模式
- 统计错误分布
- 生成分析报告和建议

使用示例:
    result = run(
        log_source="/var/log/app/application.log",
        severity="error",
        time_range_minutes=30,
    )
"""

import re
import time
from datetime import datetime, timedelta
from typing import Any
from dataclasses import dataclass, field


@dataclass
class ErrorPattern:
    """错误模式"""
    pattern: str
    count: int
    first_seen: str
    last_seen: str
    severity: str
    sample_message: str


@dataclass
class AnalysisResult:
    """分析结果"""
    issues_found: bool
    error_count: int
    patterns: list[ErrorPattern] = field(default_factory=list)
    summary: str = ""
    recommendations: list[str] = field(default_factory=list)


# 已知的错误模式及其建议
KNOWN_PATTERNS = {
    r"NullPointerException": {
        "severity": "error",
        "category": "代码缺陷",
        "recommendation": "检查空指针检查逻辑，考虑使用 Optional 类型",
    },
    r"OutOfMemoryError": {
        "severity": "critical",
        "category": "资源耗尽",
        "recommendation": "增加 JVM 堆内存配置，检查内存泄漏",
    },
    r"Connection\s*(refused|timeout|reset)": {
        "severity": "error",
        "category": "网络问题",
        "recommendation": "检查目标服务状态和网络连通性",
    },
    r"Too many open files": {
        "severity": "critical",
        "category": "资源耗尽",
        "recommendation": "增加文件描述符限制，检查文件句柄泄漏",
    },
    r"Deadlock detected": {
        "severity": "critical",
        "category": "并发问题",
        "recommendation": "分析死锁线程堆栈，优化锁获取顺序",
    },
    r"SQL\s*syntax\s*error": {
        "severity": "error",
        "category": "数据库问题",
        "recommendation": "检查 SQL 语句语法，验证参数化查询",
    },
    r"Authentication\s*(failed|error)": {
        "severity": "warn",
        "category": "安全问题",
        "recommendation": "检查认证配置，监控异常登录尝试",
    },
    r"Rate\s*limit\s*(exceeded|reached)": {
        "severity": "warn",
        "category": "限流触发",
        "recommendation": "实施请求退避策略，考虑扩容",
    },
}


def run(
    log_source: str,
    severity: str = "error",
    time_range_minutes: int = 60,
    pattern_detection: bool = True,
) -> dict[str, Any]:
    """分析日志文件并返回分析结果。
    
    该函数模拟日志分析过程。在生产环境中，应该
    连接到实际的日志系统（如 ELK、Loki、CloudWatch 等）。
    
    Args:
        log_source: 日志源路径或标识符
        severity: 最低日志级别过滤 ('debug', 'info', 'warn', 'error')
        time_range_minutes: 分析的时间范围（分钟）
        pattern_detection: 是否启用错误模式检测
    
    Returns:
        分析结果字典，包含:
        - issues_found: 是否发现问题
        - error_count: 错误总数
        - patterns: 检测到的错误模式
        - summary: 分析摘要
        - recommendations: 建议措施
    
    Example:
        >>> result = run("/var/log/app/app.log", severity="error")
        >>> if result["issues_found"]:
        ...     print(f"发现 {result['error_count']} 个错误")
    """
    start_time = time.monotonic()
    
    # 验证参数
    valid_severities = ["debug", "info", "warn", "error"]
    if severity not in valid_severities:
        raise ValueError(f"severity 必须是以下之一: {valid_severities}")
    
    if time_range_minutes < 1 or time_range_minutes > 1440:
        raise ValueError("time_range_minutes 必须在 1-1440 之间")
    
    # 模拟日志分析
    # 注意：这是演示实现，生产环境应连接真实日志系统
    analysis = _analyze_mock_logs(
        log_source=log_source,
        severity=severity,
        time_range_minutes=time_range_minutes,
        pattern_detection=pattern_detection,
    )
    
    # 生成分析摘要
    analysis.summary = _generate_summary(analysis, log_source, time_range_minutes)
    
    # 生成建议
    analysis.recommendations = _generate_recommendations(analysis)
    
    analysis_time_ms = int((time.monotonic() - start_time) * 1000)
    
    return {
        "issues_found": analysis.issues_found,
        "error_count": analysis.error_count,
        "patterns": [
            {
                "pattern": p.pattern,
                "count": p.count,
                "first_seen": p.first_seen,
                "last_seen": p.last_seen,
                "severity": p.severity,
                "sample_message": p.sample_message,
            }
            for p in analysis.patterns
        ],
        "summary": analysis.summary,
        "recommendations": analysis.recommendations,
        "metadata": {
            "log_source": log_source,
            "severity_filter": severity,
            "time_range_minutes": time_range_minutes,
            "analysis_time_ms": analysis_time_ms,
        },
    }


def _analyze_mock_logs(
    log_source: str,
    severity: str,
    time_range_minutes: int,
    pattern_detection: bool,
) -> AnalysisResult:
    """模拟日志分析过程。"""
    
    # 模拟检测到的错误模式
    now = datetime.now()
    mock_patterns = [
        ErrorPattern(
            pattern="NullPointerException",
            count=15,
            first_seen=(now - timedelta(minutes=45)).isoformat(),
            last_seen=(now - timedelta(minutes=5)).isoformat(),
            severity="error",
            sample_message="java.lang.NullPointerException at com.example.Service.process(Service.java:42)",
        ),
        ErrorPattern(
            pattern="Connection timeout",
            count=8,
            first_seen=(now - timedelta(minutes=30)).isoformat(),
            last_seen=(now - timedelta(minutes=10)).isoformat(),
            severity="error",
            sample_message="Connection timeout after 30000ms connecting to redis://localhost:6379",
        ),
        ErrorPattern(
            pattern="OutOfMemoryError",
            count=3,
            first_seen=(now - timedelta(minutes=20)).isoformat(),
            last_seen=(now - timedelta(minutes=2)).isoformat(),
            severity="critical",
            sample_message="java.lang.OutOfMemoryError: Java heap space",
        ),
    ]
    
    total_errors = sum(p.count for p in mock_patterns)
    
    return AnalysisResult(
        issues_found=total_errors > 0,
        error_count=total_errors,
        patterns=mock_patterns if pattern_detection else [],
    )


def _generate_summary(
    analysis: AnalysisResult,
    log_source: str,
    time_range_minutes: int,
) -> str:
    """生成分析摘要。"""
    if not analysis.issues_found:
        return f"在过去 {time_range_minutes} 分钟内，{log_source} 未发现异常。"
    
    pattern_summary = ", ".join(
        f"{p.pattern}({p.count}次)"
        for p in sorted(analysis.patterns, key=lambda x: -x.count)[:3]
    )
    
    return (
        f"在过去 {time_range_minutes} 分钟内，{log_source} "
        f"共发现 {analysis.error_count} 个错误，"
        f"涉及 {len(analysis.patterns)} 种错误模式。"
        f"主要问题: {pattern_summary}。"
    )


def _generate_recommendations(analysis: AnalysisResult) -> list[str]:
    """基于分析结果生成建议。"""
    recommendations = []
    
    for pattern in analysis.patterns:
        for regex, info in KNOWN_PATTERNS.items():
            if re.search(regex, pattern.pattern, re.IGNORECASE):
                rec = f"[{info['category']}] {pattern.pattern}: {info['recommendation']}"
                if rec not in recommendations:
                    recommendations.append(rec)
                break
    
    # 通用建议
    if analysis.error_count > 10:
        recommendations.append("[通用] 错误数量较多，建议立即排查并增加监控告警")
    
    if any(p.severity == "critical" for p in analysis.patterns):
        recommendations.append("[紧急] 存在严重级别错误，建议立即处理")
    
    return recommendations


if __name__ == "__main__":
    result = run(
        log_source="/var/log/app/application.log",
        severity="error",
        time_range_minutes=60,
    )
    print(f"分析摘要: {result['summary']}")
    print(f"\n建议措施:")
    for rec in result["recommendations"]:
        print(f"  - {rec}")
