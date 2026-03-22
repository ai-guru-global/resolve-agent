"""Web Search Skill - 互联网搜索技能

该 Skill 提供互联网搜索功能，可用于获取最新信息、
查找文档、搜索技术解决方案等场景。

使用示例:
    result = run(query="Python 3.12 新特性", num_results=5)
"""

import time
import hashlib
from typing import Any
from dataclasses import dataclass


@dataclass
class SearchResult:
    """单条搜索结果"""
    title: str
    url: str
    snippet: str
    relevance_score: float


def run(
    query: str,
    num_results: int = 5,
    language: str = "zh",
) -> dict[str, Any]:
    """执行网络搜索并返回结果。
    
    该函数模拟了一个网络搜索引擎的行为。在生产环境中，
    应该替换为实际的搜索 API 调用（如 Google Search API、
    Bing Search API 或自建搜索服务）。
    
    Args:
        query: 搜索查询字符串，支持自然语言查询
        num_results: 期望返回的结果数量，范围 1-20
        language: 搜索语言偏好，支持 'zh', 'en' 等
    
    Returns:
        包含搜索结果的字典，结构如下:
        {
            "results": [...],      # 搜索结果列表
            "total_found": int,    # 总结果数
            "search_time_ms": int, # 搜索耗时
            "query": str,          # 原始查询
            "language": str,       # 使用的语言
        }
    
    Raises:
        ValueError: 当 query 为空或 num_results 超出范围时
    
    Example:
        >>> result = run("Kubernetes 最佳实践", num_results=3)
        >>> print(result["total_found"])
        3
    """
    # 参数验证
    if not query or not query.strip():
        raise ValueError("查询字符串不能为空")
    
    if not 1 <= num_results <= 20:
        raise ValueError("num_results 必须在 1-20 之间")
    
    start_time = time.monotonic()
    
    # 清理查询字符串
    query = query.strip()
    
    # 生成模拟搜索结果
    # 注意：这是模拟实现，生产环境应调用真实搜索 API
    results = _generate_mock_results(query, num_results, language)
    
    # 计算搜索耗时
    search_time_ms = int((time.monotonic() - start_time) * 1000)
    
    return {
        "results": [
            {
                "title": r.title,
                "url": r.url,
                "snippet": r.snippet,
                "relevance_score": r.relevance_score,
            }
            for r in results
        ],
        "total_found": len(results),
        "search_time_ms": search_time_ms,
        "query": query,
        "language": language,
    }


def _generate_mock_results(
    query: str,
    num_results: int,
    language: str,
) -> list[SearchResult]:
    """生成模拟搜索结果。
    
    这个函数用于演示目的，生成与查询相关的模拟结果。
    在实际应用中，应该替换为真实的搜索 API 调用。
    """
    # 使用查询生成伪随机但确定性的结果
    query_hash = hashlib.md5(query.encode()).hexdigest()
    
    templates = [
        {
            "title": f"{query} - 完整指南与最佳实践",
            "domain": "docs.example.com",
            "snippet": f"本文详细介绍了 {query} 的核心概念、实施步骤和常见问题解决方案...",
        },
        {
            "title": f"深入理解 {query}：从入门到精通",
            "domain": "blog.tech.com",
            "snippet": f"通过实际案例学习 {query}，包含代码示例和性能优化建议...",
        },
        {
            "title": f"{query} 官方文档",
            "domain": "official.docs.io",
            "snippet": f"官方权威文档，涵盖 {query} 的所有 API 和配置选项...",
        },
        {
            "title": f"{query} 常见问题 FAQ",
            "domain": "stackoverflow.com",
            "snippet": f"社区整理的 {query} 常见问题和解决方案集合...",
        },
        {
            "title": f"{query} 实战教程",
            "domain": "tutorial.dev",
            "snippet": f"手把手教你掌握 {query}，包含完整项目实例...",
        },
    ]
    
    results = []
    for i in range(min(num_results, len(templates))):
        template = templates[i]
        results.append(
            SearchResult(
                title=template["title"],
                url=f"https://{template['domain']}/{query_hash[:8]}/article-{i+1}",
                snippet=template["snippet"],
                relevance_score=round(0.95 - (i * 0.05), 2),
            )
        )
    
    return results


# 测试入口
if __name__ == "__main__":
    # 运行简单测试
    result = run("Kubernetes 部署最佳实践", num_results=3)
    print(f"找到 {result['total_found']} 条结果，耗时 {result['search_time_ms']}ms")
    for r in result["results"]:
        print(f"  - {r['title']}")
        print(f"    {r['url']}")
