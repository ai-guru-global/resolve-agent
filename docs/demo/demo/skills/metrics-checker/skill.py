"""Metrics Checker Skill - 指标检查技能

该 Skill 用于检查系统指标是否超过预设阈值，
支持 CPU、内存、磁盘、网络等多种指标类型。

使用示例:
    result = run(metric="cpu_usage", threshold=90, duration_minutes=5)
"""

import random
import time
from typing import Any
from dataclasses import dataclass


@dataclass
class MetricData:
    """指标数据"""
    current: float
    avg: float
    max: float
    min: float
    trend: str


# 指标单位映射
METRIC_UNITS = {
    "cpu_usage": "%",
    "memory_usage": "%",
    "disk_usage": "%",
    "network_io": "MB/s",
    "request_latency": "ms",
}


def run(
    metric: str,
    threshold: float,
    duration_minutes: int = 5,
) -> dict[str, Any]:
    """检查系统指标并返回分析结果。
    
    Args:
        metric: 指标名称
        threshold: 告警阈值
        duration_minutes: 检查的时间窗口
    
    Returns:
        指标检查结果
    """
    valid_metrics = list(METRIC_UNITS.keys())
    if metric not in valid_metrics:
        raise ValueError(f"metric 必须是以下之一: {valid_metrics}")
    
    if threshold < 0:
        raise ValueError("threshold 必须为非负数")
    
    # 获取指标数据（模拟）
    data = _get_mock_metric_data(metric, duration_minutes)
    
    # 判断是否超过阈值
    exceeded = data.current > threshold or data.max > threshold
    
    unit = METRIC_UNITS.get(metric, "")
    
    return {
        "exceeded": exceeded,
        "current_value": data.current,
        "avg_value": data.avg,
        "max_value": data.max,
        "min_value": data.min,
        "trend": data.trend,
        "threshold": threshold,
        "unit": unit,
        "message": _generate_message(metric, data, threshold, exceeded, unit),
    }


def _get_mock_metric_data(metric: str, duration_minutes: int) -> MetricData:
    """生成模拟指标数据。"""
    # 基于指标类型生成合理的模拟值
    base_values = {
        "cpu_usage": (45, 85),      # (基准值, 波动范围上限)
        "memory_usage": (60, 90),
        "disk_usage": (55, 75),
        "network_io": (50, 200),
        "request_latency": (100, 500),
    }
    
    base, max_range = base_values.get(metric, (50, 100))
    
    # 生成模拟数据点
    values = [
        base + random.uniform(-10, max_range - base) * random.random()
        for _ in range(duration_minutes)
    ]
    
    current = values[-1]
    avg = sum(values) / len(values)
    max_val = max(values)
    min_val = min(values)
    
    # 判断趋势
    if len(values) >= 2:
        first_half_avg = sum(values[:len(values)//2]) / (len(values)//2)
        second_half_avg = sum(values[len(values)//2:]) / (len(values) - len(values)//2)
        
        if second_half_avg > first_half_avg * 1.1:
            trend = "increasing"
        elif second_half_avg < first_half_avg * 0.9:
            trend = "decreasing"
        else:
            trend = "stable"
    else:
        trend = "stable"
    
    return MetricData(
        current=round(current, 2),
        avg=round(avg, 2),
        max=round(max_val, 2),
        min=round(min_val, 2),
        trend=trend,
    )


def _generate_message(
    metric: str,
    data: MetricData,
    threshold: float,
    exceeded: bool,
    unit: str,
) -> str:
    """生成描述消息。"""
    status = "超过阈值" if exceeded else "正常"
    
    return (
        f"{metric} 当前状态: {status}。"
        f"当前值: {data.current}{unit}, "
        f"平均值: {data.avg}{unit}, "
        f"最大值: {data.max}{unit}, "
        f"阈值: {threshold}{unit}, "
        f"趋势: {data.trend}。"
    )


if __name__ == "__main__":
    result = run(metric="cpu_usage", threshold=80, duration_minutes=5)
    print(result["message"])
