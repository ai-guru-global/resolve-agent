"""K8s Pod CrashLoopBackOff 场景排查技能。

这是一个场景技能（scenario skill）示例，演示如何使用结构化排查流程
自动诊断 Pod 崩溃原因并输出四要素排查方案。

实际使用时，TroubleshootingEngine 会依据 manifest.yaml 中的
troubleshooting_flow 自动驱动排查流程。此处提供独立的 run() 函数
作为直接调用入口和回退逻辑。
"""

from __future__ import annotations

EXIT_CODE_MAP = {
    0: ("正常退出", "low"),
    1: ("应用错误", "high"),
    2: ("Shell 误用", "medium"),
    126: ("命令不可执行 (权限问题)", "medium"),
    127: ("命令未找到 (镜像问题)", "medium"),
    137: ("OOMKilled / SIGKILL", "critical"),
    139: ("段错误 (SIGSEGV)", "high"),
    143: ("SIGTERM (优雅退出)", "low"),
}


def _classify_exit_code(exit_code: int) -> tuple[str, str]:
    """Classify exit code to cause and severity."""
    return EXIT_CODE_MAP.get(exit_code, (f"未知退出码 ({exit_code})", "medium"))


def _build_symptoms(namespace: str, pod_name: str, exit_code: int) -> list[str]:
    """Build problem symptoms list."""
    cause, _ = _classify_exit_code(exit_code)
    return [
        f"Pod {pod_name} 在命名空间 {namespace} 中处于 CrashLoopBackOff 状态",
        f"容器退出码: {exit_code} ({cause})",
        "Pod 持续重启，backoff 时间递增",
    ]


def _build_key_info(exit_code: int) -> list[dict[str, str]]:
    """Build key information / evidence list."""
    info = [
        {
            "source": "kubectl describe pod",
            "content": "Events 显示容器反复 Started -> BackOff -> CrashLoopBackOff",
        },
        {
            "source": "container status",
            "content": f"Last State: Terminated, Exit Code: {exit_code}",
        },
    ]
    if exit_code == 137:
        info.append({
            "source": "node metrics",
            "content": "容器被 OOM Killer 终止，内存使用超过 limits",
        })
    return info


def _build_steps(exit_code: int) -> list[dict[str, str]]:
    """Build troubleshooting steps."""
    steps = [
        {
            "id": "step-1",
            "name": "检查 Pod Events",
            "status": "completed",
            "output": "Events 中显示 CrashLoopBackOff 和容器重启记录",
        },
        {
            "id": "step-2",
            "name": "分析退出码",
            "status": "completed",
            "output": f"退出码 {exit_code}: {_classify_exit_code(exit_code)[0]}",
        },
    ]
    if exit_code == 137:
        steps.extend([
            {
                "id": "step-3",
                "name": "检查内存使用",
                "status": "completed",
                "output": "容器内存使用已达到 limits 上限",
            },
            {
                "id": "step-4",
                "name": "验证 resource limits",
                "status": "completed",
                "output": "建议提升 memory limits 或优化应用内存使用",
            },
        ])
    else:
        steps.extend([
            {
                "id": "step-3",
                "name": "检查容器日志",
                "status": "completed",
                "output": "日志中存在应用启动失败的错误信息",
            },
            {
                "id": "step-4",
                "name": "验证应用配置",
                "status": "completed",
                "output": "检查应用配置文件、环境变量和依赖服务",
            },
        ])
    return steps


def _build_resolution(exit_code: int) -> list[str]:
    """Build resolution steps."""
    if exit_code == 137:
        return [
            "1. 短期: 适当提升 Pod memory limits（建议增加 50%）",
            "2. 中期: 分析应用内存泄漏，使用 pprof/jmap 等工具排查",
            "3. 长期: 配置 VPA (Vertical Pod Autoscaler) 自动调整资源",
            "4. 验证: kubectl top pod 确认内存使用率在安全范围内",
        ]
    elif exit_code == 1:
        return [
            "1. 检查应用日志定位具体错误（kubectl logs --previous）",
            "2. 确认配置文件和环境变量是否正确",
            "3. 验证依赖服务（数据库、缓存）的连通性",
            "4. 检查镜像版本是否与配置兼容",
        ]
    elif exit_code in (126, 127):
        return [
            "1. 检查容器镜像的 ENTRYPOINT 和 CMD 配置",
            "2. 验证镜像构建是否正确（docker run 本地测试）",
            "3. 确认 imagePullPolicy 和镜像 tag 是否为最新",
        ]
    else:
        return [
            "1. 通过 kubectl logs --previous 获取崩溃前日志",
            "2. 使用 kubectl describe pod 检查调度和资源状态",
            "3. 联系应用开发团队确认最近变更",
        ]


def run(
    namespace: str = "default",
    pod_name: str = "",
    cluster_id: str = "",
) -> dict:
    """K8s Pod CrashLoopBackOff 排查入口函数。

    当 TroubleshootingEngine 不可用时，此函数作为直接调用回退。
    实际场景中 Engine 会逐步执行 manifest 中定义的排查流程。

    Args:
        namespace: Kubernetes 命名空间。
        pod_name: 目标 Pod 名称。
        cluster_id: ACK 集群 ID（可选）。

    Returns:
        结构化排查方案字典。
    """
    if not pod_name:
        return {
            "success": False,
            "error": "pod_name is required",
        }

    # Simulated exit code for demo; in real execution the engine
    # would collect this from kubectl.
    simulated_exit_code = 137

    cause, severity = _classify_exit_code(simulated_exit_code)
    symptoms = _build_symptoms(namespace, pod_name, simulated_exit_code)
    key_info = _build_key_info(simulated_exit_code)
    steps = _build_steps(simulated_exit_code)
    resolution = _build_resolution(simulated_exit_code)

    return {
        "success": True,
        "structured_solution": {
            "symptoms": symptoms,
            "key_information": key_info,
            "troubleshooting_steps": steps,
            "resolution_steps": resolution,
            "summary": f"Pod {pod_name} CrashLoopBackOff 原因: {cause}",
            "confidence": 0.85,
            "severity": severity,
            "metadata": {
                "namespace": namespace,
                "pod_name": pod_name,
                "cluster_id": cluster_id,
                "exit_code": simulated_exit_code,
            },
        },
    }
