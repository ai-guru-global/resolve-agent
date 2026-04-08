"""工单处理技能 - 自动分析、摘要和建议变更方案。"""


# 云平台组件关键词映射
COMPONENT_KEYWORDS = {
    "ECS": ["ecs", "虚拟机", "实例", "云服务器", "ssh", "登录"],
    "SLB": ["slb", "负载均衡", "健康检查", "后端服务器"],
    "RDS": ["rds", "数据库", "主备切换", "连接池", "慢查询"],
    "OSS": ["oss", "对象存储", "bucket", "存储"],
    "VPC": ["vpc", "网络", "安全组", "路由", "交换机"],
    "K8s": ["k8s", "kubernetes", "容器", "pod", "node", "集群"],
    "NAS": ["nas", "文件存储", "挂载"],
    "Redis": ["redis", "缓存", "内存"],
}

PRIORITY_KEYWORDS = {
    "critical": ["宕机", "不可用", "全部失败", "数据丢失", "生产中断"],
    "high": ["超时", "失败", "异常", "报错", "无法"],
    "medium": ["慢", "延迟", "告警", "波动"],
    "low": ["咨询", "优化", "建议", "了解"],
}


def _detect_components(content: str) -> list[str]:
    """从工单内容中检测涉及的云平台组件。"""
    content_lower = content.lower()
    detected = []
    for component, keywords in COMPONENT_KEYWORDS.items():
        if any(kw in content_lower for kw in keywords):
            detected.append(component)
    return detected if detected else ["未识别"]


def _detect_priority(content: str) -> str:
    """根据工单内容判断优先级。"""
    content_lower = content.lower()
    for priority, keywords in PRIORITY_KEYWORDS.items():
        if any(kw in content_lower for kw in keywords):
            return priority
    return "medium"


def _analyze(ticket_id: str, ticket_content: str) -> dict[str, str]:
    """分析工单内容，提取关键信息。"""
    components = _detect_components(ticket_content)
    priority = _detect_priority(ticket_content)

    analysis = (
        f"工单编号: {ticket_id}\n"
        f"优先级: {priority}\n"
        f"涉及组件: {', '.join(components)}\n"
        f"问题分类: 云平台运维\n"
        f"关键信息: {ticket_content[:200]}"
    )

    return {
        "analysis_result": analysis,
        "change_plan": "",
        "summary": "",
    }


def _summarize(ticket_id: str, ticket_content: str) -> dict[str, str]:
    """生成工单摘要。"""
    components = _detect_components(ticket_content)
    priority = _detect_priority(ticket_content)

    summary = (
        f"[{priority.upper()}] 工单 {ticket_id}: "
        f"涉及 {', '.join(components)} 组件。"
        f"问题概述: {ticket_content[:100]}..."
    )

    return {
        "analysis_result": "",
        "change_plan": "",
        "summary": summary,
    }


def _suggest(ticket_id: str, ticket_content: str) -> dict[str, str]:
    """根据工单内容建议变更方案。"""
    components = _detect_components(ticket_content)
    priority = _detect_priority(ticket_content)

    steps = [
        "1. 前置检查: 确认当前环境状态和影响范围",
        "2. 备份: 对涉及组件进行配置和数据备份",
        f"3. 变更执行: 针对 {', '.join(components)} 执行修复操作",
        "4. 验证: 确认变更生效，业务恢复正常",
        "5. 回填: 在内部系统回填变更执行情况",
    ]

    risk = "高" if priority in ("critical", "high") else "中" if priority == "medium" else "低"

    change_plan = (
        f"变更方案 - 工单 {ticket_id}\n"
        f"风险等级: {risk}\n"
        f"涉及组件: {', '.join(components)}\n"
        f"变更步骤:\n" + "\n".join(steps)
    )

    return {
        "analysis_result": "",
        "change_plan": change_plan,
        "summary": "",
    }


def run(
    ticket_id: str = "",
    ticket_content: str = "",
    action_type: str = "analyze",
) -> dict[str, str]:
    """工单处理入口函数。

    Args:
        ticket_id: 工单编号。
        ticket_content: 工单内容。
        action_type: 操作类型 (analyze/summarize/suggest)。

    Returns:
        包含处理结果的字典。
    """
    if action_type == "analyze":
        return _analyze(ticket_id, ticket_content)
    elif action_type == "summarize":
        return _summarize(ticket_id, ticket_content)
    elif action_type == "suggest":
        return _suggest(ticket_id, ticket_content)
    else:
        return {
            "analysis_result": f"未知操作类型: {action_type}",
            "change_plan": "",
            "summary": "",
        }
