"""Agent Message Bus - Agent 间订阅-发布消息总线."""

from __future__ import annotations

import asyncio
import contextlib
import logging
from collections import defaultdict
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Any, Callable

logger = logging.getLogger(__name__)


class MessagePriority(Enum):
    """消息优先级."""

    LOW = "low"
    NORMAL = "normal"
    HIGH = "high"
    CRITICAL = "critical"


@dataclass
class AgentMessage:
    """Agent 间消息.

    支持:
    - 发布-订阅模式
    - 请求-响应模式 (通过 correlation_id)
    - 优先级队列
    """

    id: str
    channel: str  # 消息通道
    sender: str  # 发送者 ID
    message_type: str  # 消息类型
    content: Any  # 消息内容

    priority: MessagePriority = MessagePriority.NORMAL
    correlation_id: str | None = None  # 用于请求-响应关联
    reply_to: str | None = None  # 回复地址

    timestamp: str = field(default_factory=lambda: datetime.now().isoformat())
    ttl_seconds: float = 300.0  # 消息过期时间
    metadata: dict[str, Any] = field(default_factory=dict)


@dataclass
class Subscription:
    """订阅信息."""

    agent_id: str
    channel: str
    callback: Callable[[AgentMessage], Any]
    filter_fn: Callable[[AgentMessage], bool] | None = None  # 可选的过滤函数


class AgentMessageBus:
    """Agent 间消息总线 - 订阅-发布模式.

    特性:
    - 异步消息传递
    - 多订阅者支持
    - 消息过滤
    - 请求-响应模式
    - 消息持久化 (可选)

    Example:
        >>> bus = AgentMessageBus()
        >>>
        >>> # 订阅者 A
        >>> await bus.subscribe("agent-a", "code_analysis.completed",
        ...     lambda msg: handle_result(msg))
        >>>
        >>> # 发布者 B
        >>> await bus.publish(AgentMessage(
        ...     id="msg-1",
        ...     channel="code_analysis.completed",
        ...     sender="agent-b",
        ...     message_type="event",
        ...     content={"result": "..."}
        ... ))
        >>>
        >>> # 请求-响应
        >>> response = await bus.request(
        ...     sender="agent-c",
        ...     channel="skill.execute",
        ...     content={"skill": "web-search", "params": {...}},
        ...     timeout=30.0
        ... )
    """

    def __init__(self, enable_logging: bool = True) -> None:
        self._subscriptions: dict[str, list[Subscription]] = defaultdict(list)
        self._pending_requests: dict[str, asyncio.Future[AgentMessage]] = {}
        self._enable_logging = enable_logging

        # 消息队列
        self._message_queue: asyncio.Queue[AgentMessage] = asyncio.Queue()
        self._worker_task: asyncio.Task | None = None

        # 启动 worker
        self._started = False

    async def start(self) -> None:
        """启动消息总线."""
        if self._started:
            return
        self._worker_task = asyncio.create_task(self._process_messages())
        self._started = True
        logger.info("Agent message bus started")

    async def stop(self) -> None:
        """停止消息总线."""
        if self._worker_task:
            self._worker_task.cancel()
            with contextlib.suppress(asyncio.CancelledError):
                await self._worker_task
        self._started = False
        logger.info("Agent message bus stopped")

    async def _process_messages(self) -> None:
        """异步处理消息队列."""
        while True:
            try:
                message = await asyncio.wait_for(
                    self._message_queue.get(),
                    timeout=1.0,
                )
                await self._deliver_message(message)
            except TimeoutError:
                continue
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error("Error processing message: %s", e)

    async def _deliver_message(self, message: AgentMessage) -> None:
        """投递消息到订阅者."""
        channel_subs = self._subscriptions.get(message.channel, [])

        if not channel_subs and self._enable_logging:
            logger.debug(
                "No subscribers for channel",
                extra={"channel": message.channel, "message_id": message.id},
            )

        for sub in channel_subs:
            try:
                # 应用过滤器
                if sub.filter_fn and not sub.filter_fn(message):
                    continue

                # 异步投递
                if asyncio.iscoroutinefunction(sub.callback):
                    await sub.callback(message)
                else:
                    sub.callback(message)

                if self._enable_logging:
                    logger.debug(
                        "Message delivered",
                        extra={
                            "message_id": message.id,
                            "channel": message.channel,
                            "subscriber": sub.agent_id,
                        },
                    )

            except Exception as e:
                logger.error(
                    "Failed to deliver message to subscriber",
                    extra={
                        "message_id": message.id,
                        "subscriber": sub.agent_id,
                        "error": str(e),
                    },
                )

        # 处理请求-响应模式
        if message.correlation_id and message.correlation_id in self._pending_requests:
            future = self._pending_requests.pop(message.correlation_id)
            if not future.done():
                future.set_result(message)

    async def subscribe(
        self,
        agent_id: str,
        channel: str,
        callback: Callable[[AgentMessage], Any],
        filter_fn: Callable[[AgentMessage], bool] | None = None,
    ) -> None:
        """订阅频道.

        Args:
            agent_id: 订阅者 ID
            channel: 频道名称 (支持通配符如 "code_analysis.*")
            callback: 回调函数
            filter_fn: 可选的过滤函数
        """
        sub = Subscription(
            agent_id=agent_id,
            channel=channel,
            callback=callback,
            filter_fn=filter_fn,
        )
        self._subscriptions[channel].append(sub)

        if self._enable_logging:
            logger.info(
                "Subscription added",
                extra={"agent_id": agent_id, "channel": channel},
            )

    async def unsubscribe(self, agent_id: str, channel: str) -> None:
        """取消订阅.

        Args:
            agent_id: 订阅者 ID
            channel: 频道名称
        """
        if channel in self._subscriptions:
            self._subscriptions[channel] = [
                s for s in self._subscriptions[channel] if s.agent_id != agent_id
            ]

    async def publish(self, message: AgentMessage) -> None:
        """发布消息.

        Args:
            message: AgentMessage 对象
        """
        # 入队异步处理
        await self._message_queue.put(message)

        if self._enable_logging:
            logger.debug(
                "Message published",
                extra={
                    "message_id": message.id,
                    "channel": message.channel,
                    "priority": message.priority.value,
                },
            )

    async def request(
        self,
        sender: str,
        channel: str,
        content: Any,
        timeout: float = 30.0,
        message_type: str = "request",
        correlation_id: str | None = None,
    ) -> AgentMessage | None:
        """发送请求并等待响应 (请求-响应模式).

        Args:
            sender: 发送者 ID
            channel: 频道名称
            content: 请求内容
            timeout: 超时时间
            message_type: 消息类型
            correlation_id: 关联 ID (自动生成如果为 None)

        Returns:
            响应消息或 None
        """
        if correlation_id is None:
            import uuid

            correlation_id = str(uuid.uuid4())

        message = AgentMessage(
            id=str(uuid.uuid4()),
            channel=channel,
            sender=sender,
            message_type=message_type,
            content=content,
            correlation_id=correlation_id,
        )

        # 创建 Future 等待响应
        future: asyncio.Future[AgentMessage] = asyncio.Future()
        self._pending_requests[correlation_id] = future

        # 订阅响应 (reply_to 频道)
        reply_channel = message.reply_to or f"{sender}.reply"

        def reply_handler(msg: AgentMessage) -> None:
            if not future.done():
                future.set_result(msg)

        await self.subscribe(sender, reply_channel, reply_handler)

        try:
            # 发布请求
            await self.publish(message)

            # 等待响应
            response = await asyncio.wait_for(future, timeout=timeout)
            return response

        except TimeoutError:
            logger.warning(
                "Request timeout",
                extra={"correlation_id": correlation_id, "channel": channel},
            )
            return None

        finally:
            # 清理订阅
            await self.unsubscribe(sender, reply_channel)
            if correlation_id in self._pending_requests:
                del self._pending_requests[correlation_id]

    async def broadcast(
        self,
        sender: str,
        channel: str,
        content: Any,
        priority: MessagePriority = MessagePriority.NORMAL,
    ) -> None:
        """广播消息到所有订阅者.

        Args:
            sender: 发送者 ID
            channel: 频道名称
            content: 消息内容
            priority: 优先级
        """
        import uuid

        message = AgentMessage(
            id=str(uuid.uuid4()),
            channel=channel,
            sender=sender,
            message_type="broadcast",
            content=content,
            priority=priority,
        )
        await self.publish(message)

    def get_subscriptions(self, agent_id: str) -> list[str]:
        """获取 agent 的所有订阅频道.

        Args:
            agent_id: Agent ID

        Returns:
            频道列表
        """
        channels = []
        for channel, subs in self._subscriptions.items():
            if any(s.agent_id == agent_id for s in subs):
                channels.append(channel)
        return channels

    def get_channel_subscriber_count(self, channel: str) -> int:
        """获取频道订阅者数量.

        Args:
            channel: 频道名称

        Returns:
            订阅者数量
        """
        return len(self._subscriptions.get(channel, []))


class MessageBusRegistry:
    """消息总线注册表 - 管理多个消息总线实例.

    Example:
        >>> registry = MessageBusRegistry()
        >>> bus = registry.get_or_create("default")
        >>> registry.register("analysis", MessageBus())
        >>> analysis_bus = registry.get("analysis")
    """

    def __init__(self) -> None:
        self._buses: dict[str, AgentMessageBus] = {}
        self._lock = asyncio.Lock()

    async def get_or_create(
        self,
        name: str,
        **kwargs: Any,
    ) -> AgentMessageBus:
        """获取或创建消息总线.

        Args:
            name: 总线名称
            **kwargs: 传递给 AgentMessageBus 的参数

        Returns:
            AgentMessageBus 实例
        """
        async with self._lock:
            if name not in self._buses:
                self._buses[name] = AgentMessageBus(**kwargs)
                await self._buses[name].start()
            return self._buses[name]

    async def get(self, name: str) -> AgentMessageBus | None:
        """获取消息总线 (不创建).

        Args:
            name: 总线名称

        Returns:
            AgentMessageBus 或 None
        """
        return self._buses.get(name)

    async def register(self, name: str, bus: AgentMessageBus) -> None:
        """注册消息总线.

        Args:
            name: 总线名称
            bus: AgentMessageBus 实例
        """
        async with self._lock:
            self._buses[name] = bus

    async def close(self, name: str) -> None:
        """关闭并移除消息总线.

        Args:
            name: 总线名称
        """
        async with self._lock:
            if name in self._buses:
                await self._buses[name].stop()
                del self._buses[name]

    async def close_all(self) -> None:
        """关闭所有消息总线."""
        async with self._lock:
            for bus in self._buses.values():
                await bus.stop()
            self._buses.clear()
