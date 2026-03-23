#!/usr/bin/env python3
"""ResolveAgent Intelligent Selector Demo

这是 Intelligent Selector 功能的完整演示程序。
通过本 Demo，您可以了解：
1. 如何加载和配置 Skills
2. 如何初始化 RAG Pipeline
3. 如何创建和使用 MegaAgent
4. Intelligent Selector 如何进行智能路由

运行方式:
    # 批量测试模式（默认）
    python main.py
    
    # 交互模式
    python main.py --interactive
    
    # 指定配置文件
    python main.py --config ./config.yaml
"""

from __future__ import annotations

import asyncio
import argparse
import sys
import time
import re
from pathlib import Path
from typing import Any, Dict, List, Optional
from dataclasses import dataclass, field
from enum import Enum

# 添加项目路径到 sys.path
project_root = Path(__file__).parent.parent.parent.parent
sys.path.insert(0, str(project_root / "python" / "src"))

# 对于 Demo 演示，始终使用模拟模式以确保路由行为可预测
# 如果安装了完整的 ResolveAgent，设置 FORCE_MOCK=False 可使用真实组件
FORCE_MOCK = True

try:
    import yaml
    HAS_YAML = True
except ImportError:
    HAS_YAML = False

if FORCE_MOCK:
    RESOLVEAGENT_AVAILABLE = False
else:
    try:
        from resolveagent.agent.mega import MegaAgent
        from resolveagent.skills.loader import SkillLoader
        from resolveagent.rag.pipeline import RAGPipeline
        from resolveagent.fta.serializer import load_tree_from_yaml
        from resolveagent.fta.engine import FTAEngine
        RESOLVEAGENT_AVAILABLE = True
    except ImportError:
        RESOLVEAGENT_AVAILABLE = False


# ============================================
# 终端颜色和样式
# ============================================

class Colors:
    """终端颜色代码"""
    RESET = '\033[0m'
    BOLD = '\033[1m'
    DIM = '\033[2m'
    
    # 前景色
    RED = '\033[91m'
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    MAGENTA = '\033[95m'
    CYAN = '\033[96m'
    WHITE = '\033[97m'
    
    # 背景色
    BG_RED = '\033[41m'
    BG_GREEN = '\033[42m'
    BG_YELLOW = '\033[43m'
    BG_BLUE = '\033[44m'
    BG_MAGENTA = '\033[45m'
    BG_CYAN = '\033[46m'


def colorize(text: str, color: str, bold: bool = False) -> str:
    """为文本添加颜色"""
    prefix = Colors.BOLD if bold else ''
    return f"{prefix}{color}{text}{Colors.RESET}"


# ============================================
# 路由类型定义
# ============================================

class RouteType(Enum):
    """路由类型枚举"""
    SKILL = "skill"
    RAG = "rag"
    FTA = "fta"
    WORKFLOW = "workflow"
    CODE_ANALYSIS = "code_analysis"
    DIRECT = "direct"


ROUTE_TYPE_INFO = {
    RouteType.SKILL: {
        "name": "技能执行器",
        "icon": "🔧",
        "color": Colors.CYAN,
        "description": "执行特定功能的技能模块",
    },
    RouteType.RAG: {
        "name": "知识检索",
        "icon": "📚",
        "color": Colors.GREEN,
        "description": "检索增强生成 - 知识库查询",
    },
    RouteType.FTA: {
        "name": "故障树分析",
        "icon": "🌳",
        "color": Colors.YELLOW,
        "description": "FTA 工作流 - 复杂诊断分析",
    },
    RouteType.WORKFLOW: {
        "name": "工作流引擎",
        "icon": "⚙️",
        "color": Colors.YELLOW,
        "description": "多步骤工作流执行",
    },
    RouteType.CODE_ANALYSIS: {
        "name": "代码分析",
        "icon": "💻",
        "color": Colors.MAGENTA,
        "description": "静态代码分析 - AST/LSP",
    },
    RouteType.DIRECT: {
        "name": "直接对话",
        "icon": "💬",
        "color": Colors.BLUE,
        "description": "直接 LLM 对话回复",
    },
}


# ============================================
# 配置类
# ============================================

@dataclass
class DemoConfig:
    """Demo 配置"""
    skills_dir: Path = field(default_factory=lambda: Path("skills"))
    workflows_dir: Path = field(default_factory=lambda: Path("workflows"))
    rag_dir: Path = field(default_factory=lambda: Path("rag"))
    agents_dir: Path = field(default_factory=lambda: Path("agents"))
    default_agent: str = "support-agent"


# ============================================
# 模拟组件
# ============================================

class MockIntelligentSelector:
    """模拟智能选择器 - 核心路由决策引擎"""
    
    def __init__(self, strategy: str = "hybrid"):
        self.strategy = strategy
        
        # 路由规则配置（按优先级排序）
        self.routing_rules = [
            # Skill 路由 - 高优先级
            {
                "route": ("skill", "web-search"),
                "keywords": ["搜索", "search", "查找", "find", "lookup", "搜一下", "查一下", "网上", "互联网"],
                "base_confidence": 0.90,
            },
            {
                "route": ("skill", "log-analyzer"),
                "keywords": ["日志", "log", "报错", "exception", "堆栈", "stack", "trace", "分析日志"],
                "base_confidence": 0.88,
            },
            {
                "route": ("skill", "metrics-checker"),
                "keywords": ["指标", "metric", "cpu", "内存", "memory", "磁盘", "disk", "监控", "性能", "使用情况"],
                "base_confidence": 0.88,
            },
            # FTA/Workflow 路由
            {
                "route": ("fta", "incident-diagnosis"),
                "keywords": ["故障", "诊断", "diagnose", "troubleshoot", "排查", "incident", "根因", "root cause"],
                "base_confidence": 0.90,
            },
            # RAG 路由 - 知识查询（怎么/如何类问题）
            {
                "route": ("rag", "support-knowledge-base"),
                "keywords": ["怎么", "如何", "how", "文档", "手册", "指南", "runbook", "502", "oom", "连接"],
                "base_confidence": 0.82,
            },
            # 代码分析路由 - 低优先级
            {
                "route": ("code_analysis", "static-analyzer"),
                "keywords": ["代码", "code", "分析代码", "review", "静态分析", "ast", "语法", "bug", "漏洞"],
                "base_confidence": 0.85,
            },
        ]
    
    def analyze_intent(self, text: str) -> dict:
        """分析用户意图"""
        text_lower = text.lower()
        
        best_match = None
        best_score = 0.0
        matched_keywords = []
        
        for rule in self.routing_rules:
            route_type, route_target = rule["route"]
            score = 0.0
            keywords_found = []
            
            for keyword in rule["keywords"]:
                if keyword.lower() in text_lower:
                    # 根据关键词长度给予不同权重
                    weight = len(keyword) / 10.0 + 0.1
                    score += weight * rule["base_confidence"]
                    keywords_found.append(keyword)
            
            if score > best_score:
                best_score = score
                best_match = (route_type, route_target)
                matched_keywords = keywords_found
        
        if best_match and best_score > 0.05:
            route_type, route_target = best_match
            # 标准化置信度 (0.75 - 0.95)
            confidence = min(0.95, 0.75 + best_score * 0.3)
            return {
                "route_type": route_type,
                "route_target": route_target,
                "confidence": round(confidence, 2),
                "matched_keywords": matched_keywords,
                "intent_category": self._get_intent_category(route_type),
            }
        
        return {
            "route_type": "direct",
            "route_target": "",
            "confidence": 0.95,
            "matched_keywords": [],
            "intent_category": "general_conversation",
        }
    
    def _get_intent_category(self, route_type: str) -> str:
        """获取意图类别"""
        categories = {
            "skill": "task_execution",
            "rag": "information_retrieval",
            "fta": "complex_analysis",
            "workflow": "complex_analysis",
            "code_analysis": "code_review",
            "direct": "general_conversation",
        }
        return categories.get(route_type, "unknown")


class MockMegaAgent:
    """模拟 MegaAgent，用于演示"""
    
    def __init__(self, name: str, model_id: str, system_prompt: str, selector_strategy: str):
        self.name = name
        self.model_id = model_id
        self.system_prompt = system_prompt
        self.selector_strategy = selector_strategy
        self.selector = MockIntelligentSelector(strategy=selector_strategy)
        
        # 模拟响应模板
        self.response_templates = {
            "skill": "已调用 {target} 技能处理您的请求。",
            "rag": "从知识库 {target} 中检索到相关信息。",
            "fta": "已启动故障树分析工作流 {target} 进行诊断。",
            "workflow": "已执行工作流 {target}。",
            "code_analysis": "已完成代码静态分析 ({target})。",
            "direct": "我是 {name}，很高兴为您服务！",
        }
    
    async def reply(self, message: dict[str, Any]) -> dict[str, Any]:
        """处理消息并返回路由决策"""
        content = message.get("content", "")
        
        # 模拟处理延迟
        await asyncio.sleep(0.1)
        
        # 使用智能选择器分析意图
        decision = self.selector.analyze_intent(content)
        
        route_type = decision["route_type"]
        route_target = decision["route_target"]
        
        # 生成响应
        template = self.response_templates.get(route_type, self.response_templates["direct"])
        response_content = template.format(target=route_target, name=self.name)
        
        return {
            "role": "assistant",
            "content": response_content,
            "metadata": {
                "route_type": route_type,
                "route_target": route_target,
                "confidence": decision["confidence"],
                "matched_keywords": decision["matched_keywords"],
                "intent_category": decision["intent_category"],
                "strategy": self.selector_strategy,
            },
        }


class MockSkillLoader:
    """模拟 SkillLoader"""
    
    def __init__(self):
        self._loaded = {}
    
    def load_from_directory(self, path: str):
        """模拟加载 Skill"""
        skill_name = Path(path).name
        
        class MockSkill:
            def __init__(self, name):
                self.manifest = type('Manifest', (), {'name': name, 'version': '1.0.0'})()
        
        skill = MockSkill(skill_name)
        self._loaded[skill_name] = skill
        return skill


class MockRAGPipeline:
    """模拟 RAG Pipeline"""
    
    async def ingest(self, collection_id: str, documents: list) -> dict:
        return {"documents_processed": len(documents), "chunks_created": len(documents) * 3}


# ============================================
# Demo 运行器
# ============================================

class DemoRunner:
    """Demo 运行器
    
    负责初始化所有组件并运行演示场景。
    """
    
    def __init__(self, config: DemoConfig):
        self.config = config
        
        if RESOLVEAGENT_AVAILABLE:
            self.skill_loader = SkillLoader()
            self.rag_pipeline = RAGPipeline()
            self.fta_engine = FTAEngine()
        else:
            self.skill_loader = MockSkillLoader()
            self.rag_pipeline = MockRAGPipeline()
            self.fta_engine = None
        
        self.agent = None
        self.loaded_skills: list[str] = []
        self.loaded_workflows: list[str] = []
    
    async def setup(self) -> None:
        """初始化所有组件"""
        self._print_banner()
        
        if not RESOLVEAGENT_AVAILABLE:
            print(colorize("(模拟模式运行 - ResolveAgent 模块未安装)\n", Colors.YELLOW))
        
        await self._load_skills()
        await self._init_rag()
        await self._load_workflows()
        await self._create_agent()
        
        self._print_setup_complete()
    
    def _print_banner(self) -> None:
        """打印欢迎横幅"""
        banner = """
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║     🧠  ResolveAgent Intelligent Selector Demo  🧠           ║
║                                                              ║
║     智能路由决策引擎演示                                      ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
"""
        print(colorize(banner, Colors.CYAN, bold=True))
    
    def _print_setup_complete(self) -> None:
        """打印初始化完成信息"""
        print("\n" + "═" * 60)
        print(colorize("✓ 初始化完成！", Colors.GREEN, bold=True))
        print("═" * 60)
        
        # 打印可用的路由目标
        print("\n" + colorize("可用的路由目标:", Colors.CYAN, bold=True))
        print("─" * 40)
        
        for route_type, info in ROUTE_TYPE_INFO.items():
            icon = info["icon"]
            name = info["name"]
            desc = info["description"]
            color = info["color"]
            print(f"  {icon}  {colorize(name, color, bold=True)}")
            print(f"      {colorize(desc, Colors.DIM)}")
        
        print()
    
    async def _load_skills(self) -> None:
        """加载所有 Skills"""
        print(colorize("[1/4] 加载 Skills...", Colors.BLUE, bold=True))
        
        skills_dir = self.config.skills_dir
        if not skills_dir.exists():
            print(colorize(f"  ⚠ Skills 目录不存在: {skills_dir}", Colors.YELLOW))
            return
        
        for skill_dir in skills_dir.iterdir():
            if skill_dir.is_dir():
                manifest_file = skill_dir / "manifest.yaml"
                if manifest_file.exists():
                    try:
                        skill = self.skill_loader.load_from_directory(str(skill_dir))
                        self.loaded_skills.append(skill.manifest.name)
                        print(f"  {colorize('✓', Colors.GREEN)} {skill.manifest.name} (v{skill.manifest.version})")
                    except Exception as e:
                        print(f"  {colorize('✗', Colors.RED)} {skill_dir.name}: {e}")
        
        print(f"  共加载 {colorize(str(len(self.loaded_skills)), Colors.CYAN, bold=True)} 个 Skills")
    
    async def _init_rag(self) -> None:
        """初始化 RAG Pipeline"""
        print(f"\n{colorize('[2/4] 初始化 RAG Pipeline...', Colors.BLUE, bold=True)}")
        
        documents_dir = self.config.rag_dir / "documents"
        
        documents = []
        if documents_dir.exists():
            for doc_file in documents_dir.glob("*.md"):
                try:
                    content = doc_file.read_text(encoding="utf-8")
                    documents.append({
                        "content": content,
                        "metadata": {"source": doc_file.name, "type": "runbook"},
                    })
                    print(f"  {colorize('✓', Colors.GREEN)} 加载文档: {doc_file.name}")
                except Exception as e:
                    print(f"  {colorize('✗', Colors.RED)} {doc_file.name}: {e}")
        
        if documents:
            result = await self.rag_pipeline.ingest(
                collection_id="support-knowledge-base",
                documents=documents,
            )
            print(f"  共导入 {colorize(str(result['documents_processed']), Colors.CYAN, bold=True)} 个文档")
        else:
            print(f"  {colorize('⚠', Colors.YELLOW)} 使用模拟文档进行演示")
            mock_docs = [
                {"content": "502 Bad Gateway 错误处理...", "metadata": {"topic": "502-error"}},
                {"content": "OutOfMemoryError 处理手册...", "metadata": {"topic": "oom-error"}},
                {"content": "数据库连接池问题...", "metadata": {"topic": "db-connection"}},
            ]
            await self.rag_pipeline.ingest("support-knowledge-base", mock_docs)
            print(f"  导入 {len(mock_docs)} 个模拟文档")
    
    async def _load_workflows(self) -> None:
        """加载工作流定义"""
        print(f"\n{colorize('[3/4] 加载 Workflows...', Colors.BLUE, bold=True)}")
        
        workflows_dir = self.config.workflows_dir
        if not workflows_dir.exists():
            print(colorize(f"  ⚠ Workflows 目录不存在: {workflows_dir}", Colors.YELLOW))
            return
        
        for wf_file in workflows_dir.glob("*.yaml"):
            try:
                if RESOLVEAGENT_AVAILABLE:
                    tree = load_tree_from_yaml(str(wf_file))
                    self.loaded_workflows.append(tree.id)
                    print(f"  {colorize('✓', Colors.GREEN)} {tree.name} ({tree.id})")
                    print(f"    - 基础事件: {len(tree.get_basic_events())} 个")
                    print(f"    - 逻辑门: {len(tree.gates)} 个")
                else:
                    self.loaded_workflows.append(wf_file.stem)
                    print(f"  {colorize('✓', Colors.GREEN)} {wf_file.stem} (模拟加载)")
            except Exception as e:
                print(f"  {colorize('✗', Colors.RED)} {wf_file.name}: {e}")
        
        print(f"  共加载 {colorize(str(len(self.loaded_workflows)), Colors.CYAN, bold=True)} 个 Workflows")
    
    async def _create_agent(self) -> None:
        """创建 MegaAgent"""
        print(f"\n{colorize('[4/4] 创建 MegaAgent...', Colors.BLUE, bold=True)}")
        
        agent_config_file = self.config.agents_dir / f"{self.config.default_agent}.yaml"
        
        agent_conf = {}
        if agent_config_file.exists() and HAS_YAML:
            try:
                with open(agent_config_file, encoding="utf-8") as f:
                    config = yaml.safe_load(f)
                    agent_conf = config.get("agent", {}).get("config", {})
            except Exception:
                pass
        
        if RESOLVEAGENT_AVAILABLE:
            self.agent = MegaAgent(
                name=self.config.default_agent,
                model_id=agent_conf.get("model_id", "qwen-plus"),
                system_prompt=agent_conf.get("system_prompt", "你是一个智能助手。"),
                selector_strategy=agent_conf.get("selector_config", {}).get("strategy", "hybrid"),
            )
        else:
            self.agent = MockMegaAgent(
                name=self.config.default_agent,
                model_id=agent_conf.get("model_id", "qwen-plus"),
                system_prompt=agent_conf.get("system_prompt", "你是一个智能助手。"),
                selector_strategy=agent_conf.get("selector_config", {}).get("strategy", "hybrid"),
            )
        
        print(f"  {colorize('✓', Colors.GREEN)} Agent 已创建: {colorize(self.agent.name, Colors.CYAN, bold=True)}")
        print(f"    - 路由策略: {self.agent.selector_strategy}")
        print(f"    - 可用 Skills: {', '.join(self.loaded_skills) if self.loaded_skills else 'N/A'}")
    
    def _print_route_decision(self, metadata: dict) -> None:
        """打印路由决策详情（带可视化效果）"""
        route_type_str = metadata.get("route_type", "unknown")
        route_target = metadata.get("route_target", "")
        confidence = metadata.get("confidence", 0)
        matched_keywords = metadata.get("matched_keywords", [])
        intent_category = metadata.get("intent_category", "")
        
        # 获取路由类型信息
        try:
            route_type = RouteType(route_type_str)
            type_info = ROUTE_TYPE_INFO[route_type]
        except (ValueError, KeyError):
            type_info = {
                "name": route_type_str,
                "icon": "❓",
                "color": Colors.WHITE,
                "description": "",
            }
        
        icon = type_info["icon"]
        name = type_info["name"]
        color = type_info["color"]
        
        # 打印决策框
        print()
        print("┌" + "─" * 58 + "┐")
        print("│" + colorize("  🧠 INTELLIGENT SELECTOR 路由决策", Colors.CYAN, bold=True).ljust(67) + "│")
        print("├" + "─" * 58 + "┤")
        
        # 路由类型行
        type_line = f"│  路由类型: {icon}  {colorize(name, color, bold=True)}"
        print(type_line.ljust(68) + "│")
        
        # 路由目标行
        if route_target:
            target_line = f"│  路由目标: {colorize(route_target, Colors.WHITE, bold=True)}"
            print(target_line.ljust(68) + "│")
        
        # 置信度条
        confidence_pct = int(confidence * 100)
        bar_width = 30
        filled = int(bar_width * confidence)
        empty = bar_width - filled
        
        if confidence >= 0.8:
            bar_color = Colors.GREEN
        elif confidence >= 0.6:
            bar_color = Colors.YELLOW
        else:
            bar_color = Colors.RED
        
        bar = colorize("█" * filled, bar_color) + colorize("░" * empty, Colors.DIM)
        conf_line = f"│  置信度:   [{bar}] {confidence_pct}%"
        print(conf_line.ljust(78) + "│")
        
        # 意图类别
        if intent_category:
            intent_line = f"│  意图类别: {intent_category}"
            print(intent_line.ljust(60) + "│")
        
        # 匹配关键词
        if matched_keywords:
            kw_str = ", ".join(matched_keywords[:5])
            kw_line = f"│  匹配关键词: {colorize(kw_str, Colors.YELLOW)}"
            print(kw_line.ljust(68) + "│")
        
        print("└" + "─" * 58 + "┘")
    
    async def run_batch_demo(self) -> None:
        """运行批量测试场景"""
        print("\n" + "═" * 60)
        print(colorize("📋 批量测试场景", Colors.CYAN, bold=True))
        print("═" * 60 + "\n")
        
        # 定义测试场景
        scenarios = [
            {
                "name": "🔍 Web 搜索",
                "input": "帮我搜索 Kubernetes 最佳实践",
                "expected_route": "skill",
                "expected_target": "web-search",
                "description": "预期路由到 web-search Skill",
            },
            {
                "name": "📝 日志分析",
                "input": "分析一下 /var/log/app 的错误日志",
                "expected_route": "skill",
                "expected_target": "log-analyzer",
                "description": "预期路由到 log-analyzer Skill",
            },
            {
                "name": "📊 指标检查",
                "input": "检查一下服务器的 CPU 和内存使用情况",
                "expected_route": "skill",
                "expected_target": "metrics-checker",
                "description": "预期路由到 metrics-checker Skill",
            },
            {
                "name": "📚 知识库查询",
                "input": "502 错误怎么处理？",
                "expected_route": "rag",
                "expected_target": "support-knowledge-base",
                "description": "预期路由到 RAG Pipeline",
            },
            {
                "name": "🌳 故障诊断",
                "input": "线上服务响应变慢，帮我诊断一下原因",
                "expected_route": "fta",
                "expected_target": "incident-diagnosis",
                "description": "预期路由到 FTA Workflow",
            },
            {
                "name": "💻 代码分析",
                "input": "帮我分析一下这段代码有没有潜在的bug",
                "expected_route": "code_analysis",
                "expected_target": "static-analyzer",
                "description": "预期路由到代码分析引擎",
            },
            {
                "name": "💬 简单对话",
                "input": "你好，你是谁？",
                "expected_route": "direct",
                "expected_target": "",
                "description": "预期直接由 LLM 回复",
            },
        ]
        
        # 执行测试
        passed = 0
        failed = 0
        
        for i, scenario in enumerate(scenarios, 1):
            print(f"\n{'─' * 60}")
            print(f"{colorize(f'场景 {i}:', Colors.BLUE, bold=True)} {scenario['name']}")
            print(f"{'─' * 60}")
            print(f"{colorize('描述:', Colors.DIM)} {scenario['description']}")
            print(f"{colorize('输入:', Colors.WHITE, bold=True)} {scenario['input']}")
            print(f"{colorize('预期:', Colors.DIM)} {scenario['expected_route']}:{scenario['expected_target']}")
            
            response = await self.agent.reply({"content": scenario["input"]})
            metadata = response.get("metadata", {})
            
            # 打印路由决策
            self._print_route_decision(metadata)
            
            route_type = metadata.get("route_type", "unknown")
            route_target = metadata.get("route_target", "")
            
            # 判断是否符合预期
            expected_type = scenario["expected_route"]
            expected_target = scenario["expected_target"]
            
            type_match = route_type == expected_type
            target_match = (not expected_target) or (expected_target in route_target) or (route_target in expected_target)
            match = type_match and target_match
            
            if match:
                passed += 1
                status = colorize("✓ 符合预期", Colors.GREEN, bold=True)
            else:
                failed += 1
                status = colorize("✗ 不符合预期", Colors.RED, bold=True)
            
            print(f"\n{colorize('结果:', Colors.WHITE, bold=True)} {status}")
        
        # 输出总结
        print("\n" + "═" * 60)
        total = passed + failed
        rate = passed / total * 100 if total > 0 else 0
        
        summary_color = Colors.GREEN if rate >= 80 else (Colors.YELLOW if rate >= 60 else Colors.RED)
        print(colorize(f"测试完成: {passed}/{total} 通过 ({rate:.0f}%)", summary_color, bold=True))
        print("═" * 60)
    
    async def run_interactive(self) -> None:
        """运行交互模式"""
        print("\n" + "═" * 60)
        print(colorize("🎮 交互模式", Colors.CYAN, bold=True))
        print("═" * 60)
        print(f"\n{colorize('提示:', Colors.YELLOW)} 输入问题进行测试，观察智能路由如何工作")
        print(f"{colorize('退出:', Colors.DIM)} 输入 'quit', 'exit' 或 'q'\n")
        
        # 显示示例提示
        print(colorize("示例问题:", Colors.CYAN))
        examples = [
            "帮我搜索 Docker 教程",
            "502 错误怎么处理？",
            "分析一下系统日志",
            "线上服务故障，帮我诊断",
            "检查一下 CPU 使用率",
            "帮我分析这段代码",
        ]
        for ex in examples:
            print(f"  • {colorize(ex, Colors.DIM)}")
        print()
        
        while True:
            try:
                user_input = input(colorize("You: ", Colors.GREEN, bold=True)).strip()
                
                if not user_input:
                    continue
                
                if user_input.lower() in ["quit", "exit", "q"]:
                    print(colorize("\n👋 再见！\n", Colors.CYAN))
                    break
                
                # 调用 Agent
                response = await self.agent.reply({"content": user_input})
                
                # 显示路由决策
                metadata = response.get("metadata", {})
                self._print_route_decision(metadata)
                
                # 显示响应
                content = response.get("content", "")
                print(f"\n{colorize('Assistant:', Colors.BLUE, bold=True)} {content}")
                print()
                
            except KeyboardInterrupt:
                print(colorize("\n\n👋 再见！\n", Colors.CYAN))
                break
            except Exception as e:
                print(colorize(f"\n❌ 错误: {e}\n", Colors.RED))


# ============================================
# 主函数
# ============================================

async def main():
    """主函数"""
    parser = argparse.ArgumentParser(
        description="ResolveAgent Intelligent Selector Demo - 智能路由决策引擎演示",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
示例:
  python main.py                    # 运行批量测试
  python main.py --interactive      # 交互模式
  python main.py -i                 # 交互模式（简写）

路由类型:
  skill         技能执行器 - 执行特定功能
  rag           知识检索 - RAG 知识库查询
  fta/workflow  故障树分析 - 复杂诊断工作流
  code_analysis 代码分析 - 静态代码分析
  direct        直接对话 - LLM 直接回复
        """
    )
    
    parser.add_argument(
        "--interactive", "-i",
        action="store_true",
        help="以交互模式运行"
    )
    
    parser.add_argument(
        "--config", "-c",
        type=str,
        help="配置文件路径"
    )
    
    parser.add_argument(
        "--skills-dir",
        type=str,
        default="skills",
        help="Skills 目录路径"
    )
    
    parser.add_argument(
        "--workflows-dir",
        type=str,
        default="workflows",
        help="Workflows 目录路径"
    )
    
    args = parser.parse_args()
    
    # 创建配置
    config = DemoConfig(
        skills_dir=Path(args.skills_dir),
        workflows_dir=Path(args.workflows_dir),
    )
    
    # 运行 Demo
    runner = DemoRunner(config)
    await runner.setup()
    
    if args.interactive:
        await runner.run_interactive()
    else:
        await runner.run_batch_demo()


if __name__ == "__main__":
    asyncio.run(main())
