"""运维咨询问答技能 - 基于知识库的智能问答。"""

from __future__ import annotations

from typing import Optional


# 内置运维知识库
KNOWLEDGE_BASE: dict[str, dict[str, str]] = {
    "ecs重启": {
        "answer": (
            "ECS 实例重启操作步骤:\n"
            "1. 登录专有云控制台，进入 ECS 管理页面\n"
            "2. 找到目标实例，确认实例当前状态\n"
            "3. 点击「更多」->「实例状态」->「重启」\n"
            "4. 选择重启方式（普通重启/强制重启）\n"
            "5. 确认重启后等待实例状态变为「运行中」\n"
            "注意: 强制重启可能导致未保存数据丢失，建议优先使用普通重启。"
        ),
        "references": "KB-ECS-001, 专有云ECS运维手册-3.2节",
        "category": "ecs",
    },
    "安全组": {
        "answer": (
            "安全组规则配置指南:\n"
            "1. 登录控制台，进入「网络与安全」->「安全组」\n"
            "2. 选择目标安全组，点击「配置规则」\n"
            "3. 添加规则时需指定: 方向(入/出)、协议、端口范围、授权对象\n"
            "4. 常用端口: SSH(22), HTTP(80), HTTPS(443), RDP(3389)\n"
            "5. 规则优先级: 1-100，数字越小优先级越高\n"
            "注意: 安全组规则变更即时生效，请谨慎操作。"
        ),
        "references": "KB-VPC-003, 专有云网络安全配置手册",
        "category": "network",
    },
    "网络故障排查": {
        "answer": (
            "网络故障排查清单:\n"
            "1. 检查 ECS 实例安全组规则是否放行目标端口\n"
            "2. 检查 VPC 路由表配置是否正确\n"
            "3. 使用 ping/telnet/traceroute 测试连通性\n"
            "4. 检查网络 ACL 是否有拒绝规则\n"
            "5. 确认 ECS 内部防火墙(iptables/firewalld)配置\n"
            "6. 检查 DNS 解析是否正常\n"
            "7. 查看交换机端口流量和错误计数"
        ),
        "references": "KB-NET-001, 专有云网络故障排查SOP",
        "category": "network",
    },
    "数据库连接": {
        "answer": (
            "RDS 数据库连接问题排查:\n"
            "1. 确认 RDS 实例状态是否为「运行中」\n"
            "2. 检查白名单是否包含应用服务器 IP\n"
            "3. 验证连接地址和端口是否正确\n"
            "4. 检查账号密码是否正确\n"
            "5. 确认连接数是否达到上限（查看 max_connections）\n"
            "6. 检查网络连通性（安全组、VPC 对等连接）\n"
            "7. 查看 RDS 错误日志获取详细错误信息"
        ),
        "references": "KB-RDS-002, 专有云RDS连接问题处理手册",
        "category": "database",
    },
    "k8s节点": {
        "answer": (
            "K8s 节点 NotReady 处理步骤:\n"
            "1. 执行 kubectl get nodes 查看节点状态\n"
            "2. 执行 kubectl describe node <node-name> 查看详细信息\n"
            "3. 检查 kubelet 服务状态: systemctl status kubelet\n"
            "4. 查看 kubelet 日志: journalctl -u kubelet -f\n"
            "5. 检查节点资源使用情况（CPU/内存/磁盘）\n"
            "6. 检查容器运行时(docker/containerd)状态\n"
            "7. 如资源不足，考虑驱逐 Pod 或扩容节点"
        ),
        "references": "KB-K8S-005, 专有云容器服务故障处理手册",
        "category": "k8s",
    },
    "磁盘扩容": {
        "answer": (
            "云盘扩容操作步骤:\n"
            "1. 在控制台找到目标云盘，点击「扩容」\n"
            "2. 设置扩容后的容量大小\n"
            "3. 扩容完成后登录 ECS 实例\n"
            "4. Linux: 使用 growpart 和 resize2fs/xfs_growfs 扩展分区和文件系统\n"
            "5. Windows: 使用磁盘管理工具扩展卷\n"
            "注意: 建议在扩容前创建快照备份。"
        ),
        "references": "KB-ECS-010, 专有云云盘管理手册",
        "category": "storage",
    },
    "负载均衡": {
        "answer": (
            "SLB 健康检查失败排查:\n"
            "1. 确认后端服务器的服务是否正常运行\n"
            "2. 检查健康检查端口和路径配置\n"
            "3. 在后端服务器本地测试健康检查接口\n"
            "4. 检查后端服务器安全组是否放行健康检查端口\n"
            "5. 确认健康检查超时时间和间隔设置合理\n"
            "6. 查看 SLB 访问日志排查具体错误"
        ),
        "references": "KB-SLB-001, 专有云SLB运维手册",
        "category": "network",
    },
}


def _match_knowledge(question: str) -> tuple[Optional[dict[str, str]], float]:
    """在知识库中匹配最相关的条目。"""
    question_lower = question.lower()
    best_match = None
    best_score = 0.0

    for key, entry in KNOWLEDGE_BASE.items():
        key_chars = set(key)
        match_count = sum(1 for ch in key_chars if ch in question_lower)
        score = match_count / len(key_chars) if key_chars else 0.0

        if score > best_score:
            best_score = score
            best_match = entry

    return best_match, best_score


def run(
    question: str = "",
    context: str = "",
    category: str = "general",
) -> dict[str, object]:
    """运维咨询问答入口函数。

    Args:
        question: 咨询问题。
        context: 上下文信息。
        category: 问题分类。

    Returns:
        包含回答、参考来源和置信度的字典。
    """
    if not question.strip():
        return {
            "answer": "请提供您的运维咨询问题。",
            "references": "",
            "confidence": 0.0,
        }

    match, score = _match_knowledge(question)

    if match and score >= 0.5:
        return {
            "answer": match["answer"],
            "references": match["references"],
            "confidence": round(min(score + 0.2, 1.0), 2),
        }

    return {
        "answer": (
            f"关于「{question}」的问题，建议参考以下排查思路:\n"
            "1. 确认问题现象和影响范围\n"
            "2. 收集相关日志和监控数据\n"
            "3. 查询运维知识库获取标准处理流程\n"
            "4. 如需进一步协助，请提交工单至二线团队\n"
            "\n如需更精确的回答，请提供更多上下文信息。"
        ),
        "references": "通用运维排查SOP",
        "confidence": 0.3,
    }
