"""ResolveNet Intelligent Selector Demo

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

import asyncio
import argparse
import sys
from pathlib import Path
from typing import Any
from dataclasses import dataclass

# 添加项目路径到 sys.path
project_root = Path(__file__).parent.parent.parent.parent
sys.path.insert(0, str(project_root / "python" / "src"))

try:
    import yaml
    from resolvenet.agent.mega import MegaAgent
    from resolvenet.skills.loader import SkillLoader
    from resolvenet.rag.pipeline import RAGPipeline
    from resolvenet.fta.serializer import load_tree_from_yaml
    from resolvenet.fta.engine import FTAEngine
    RESOLVENET_AVAILABLE = True
except ImportError:
    RESOLVENET_AVAILABLE = False
    print("警告: ResolveNet 模块未安装，将使用模拟模式运行")


@dataclass
class DemoConfig:
    """Demo 配置"""
    skills_dir: Path = Path("skills")
    workflows_dir: Path = Path("workflows")
    rag_dir: Path = Path("rag")
    agents_dir: Path = Path("agents")
    default_agent: str = "support-agent"


class MockMegaAgent:
    """模拟 MegaAgent，用于演示"""
    
    def __init__(self, name: str, model_id: str, system_prompt: str, selector_strategy: str):
        self.name = name
        self.model_id = model_id
        self.system_prompt = system_prompt
        self.selector_strategy = selector_strategy
        
        # 关键词到路由的映射
        self.routing_rules = {
            "skill:web-search": ["搜索", "search", "查找", "find", "lookup", "搜一下", "查一下"],
            "skill:log-analyzer": ["日志", "log", "错误", "error", "异常", "exception", "报错"],
            "fta:incident-diagnosis": ["故障", "诊断", "diagnose", "troubleshoot", "排查", "incident"],
            "rag:support-knowledge-base": ["怎么", "如何", "how", "文档", "手册", "指南", "502", "OOM"],
        }
    
    async def reply(self, message: dict[str, Any]) -> dict[str, Any]:
        """处理消息并返回路由决策"""
        content = message.get("content", "").lower()
        
        # 根据关键词匹配路由
        route_type = "direct"
        route_target = ""
        confidence = 0.95
        
        for route, keywords in self.routing_rules.items():
            for keyword in keywords:
                if keyword.lower() in content:
                    parts = route.split(":")
                    route_type = parts[0]
                    route_target = parts[1] if len(parts) > 1 else ""
                    confidence = 0.85 + (0.1 if keyword in content else 0)
                    break
            if route_type != "direct":
                break
        
        return {
            "role": "assistant",
            "content": f"[{self.name}] 已通过 {route_type} 路由处理您的请求",
            "metadata": {
                "route_type": route_type,
                "route_target": route_target,
                "confidence": round(confidence, 2),
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


class DemoRunner:
    """Demo 运行器
    
    负责初始化所有组件并运行演示场景。
    """
    
    def __init__(self, config: DemoConfig):
        self.config = config
        
        if RESOLVENET_AVAILABLE:
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
        print("=" * 60)
        print("ResolveNet Intelligent Selector Demo")
        print("=" * 60)
        print()
        
        if not RESOLVENET_AVAILABLE:
            print("(模拟模式运行)\n")
        
        await self._load_skills()
        await self._init_rag()
        await self._load_workflows()
        await self._create_agent()
        
        print()
        print("=" * 60)
        print("初始化完成！")
        print("=" * 60)
        print()
    
    async def _load_skills(self) -> None:
        """加载所有 Skills"""
        print("[1/4] 加载 Skills...")
        
        skills_dir = self.config.skills_dir
        if not skills_dir.exists():
            print(f"  警告: Skills 目录不存在: {skills_dir}")
            return
        
        for skill_dir in skills_dir.iterdir():
            if skill_dir.is_dir():
                manifest_file = skill_dir / "manifest.yaml"
                if manifest_file.exists():
                    try:
                        skill = self.skill_loader.load_from_directory(str(skill_dir))
                        self.loaded_skills.append(skill.manifest.name)
                        print(f"  ✓ {skill.manifest.name} (v{skill.manifest.version})")
                    except Exception as e:
                        print(f"  ✗ {skill_dir.name}: {e}")
        
        print(f"  共加载 {len(self.loaded_skills)} 个 Skills")
    
    async def _init_rag(self) -> None:
        """初始化 RAG Pipeline"""
        print("\n[2/4] 初始化 RAG Pipeline...")
        
        documents_dir = self.config.rag_dir / "documents"
        
        # 加载文档
        documents = []
        if documents_dir.exists():
            for doc_file in documents_dir.glob("*.md"):
                content = doc_file.read_text(encoding="utf-8")
                documents.append({
                    "content": content,
                    "metadata": {
                        "source": doc_file.name,
                        "type": "runbook",
                    },
                })
                print(f"  ✓ 加载文档: {doc_file.name}")
        
        # 导入文档到 RAG
        if documents:
            result = await self.rag_pipeline.ingest(
                collection_id="support-knowledge-base",
                documents=documents,
            )
            print(f"  共导入 {result['documents_processed']} 个文档")
        else:
            print("  使用模拟文档进行演示")
            mock_docs = [
                {"content": "502 Bad Gateway 错误处理...", "metadata": {"topic": "502-error"}},
                {"content": "OutOfMemoryError 处理手册...", "metadata": {"topic": "oom-error"}},
                {"content": "数据库连接池问题...", "metadata": {"topic": "db-connection"}},
            ]
            await self.rag_pipeline.ingest("support-knowledge-base", mock_docs)
            print(f"  导入 {len(mock_docs)} 个模拟文档")
    
    async def _load_workflows(self) -> None:
        """加载工作流定义"""
        print("\n[3/4] 加载 Workflows...")
        
        workflows_dir = self.config.workflows_dir
        if not workflows_dir.exists():
            print(f"  警告: Workflows 目录不存在: {workflows_dir}")
            return
        
        for wf_file in workflows_dir.glob("*.yaml"):
            try:
                if RESOLVENET_AVAILABLE:
                    tree = load_tree_from_yaml(str(wf_file))
                    self.loaded_workflows.append(tree.id)
                    print(f"  ✓ {tree.name} ({tree.id})")
                    print(f"    - 基础事件: {len(tree.get_basic_events())} 个")
                    print(f"    - 逻辑门: {len(tree.gates)} 个")
                else:
                    # 模拟加载
                    self.loaded_workflows.append(wf_file.stem)
                    print(f"  ✓ {wf_file.stem} (模拟加载)")
            except Exception as e:
                print(f"  ✗ {wf_file.name}: {e}")
        
        print(f"  共加载 {len(self.loaded_workflows)} 个 Workflows")
    
    async def _create_agent(self) -> None:
        """创建 MegaAgent"""
        print("\n[4/4] 创建 MegaAgent...")
        
        agent_config_file = self.config.agents_dir / f"{self.config.default_agent}.yaml"
        
        # 加载 Agent 配置
        agent_conf = {}
        if agent_config_file.exists():
            try:
                with open(agent_config_file, encoding="utf-8") as f:
                    config = yaml.safe_load(f)
                    agent_conf = config.get("agent", {}).get("config", {})
            except Exception:
                pass
        
        if RESOLVENET_AVAILABLE:
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
        
        print(f"  ✓ Agent 已创建: {self.agent.name}")
        print(f"    - 路由策略: {self.agent.selector_strategy}")
        print(f"    - 可用 Skills: {', '.join(self.loaded_skills) if self.loaded_skills else 'N/A'}")
    
    async def run_batch_demo(self) -> None:
        """运行批量测试场景"""
        print("\n" + "=" * 60)
        print("批量测试场景")
        print("=" * 60 + "\n")
        
        # 定义测试场景
        scenarios = [
            {
                "name": "Web 搜索",
                "input": "帮我搜索 Kubernetes 最佳实践",
                "expected_route": "skill:web-search",
                "description": "预期路由到 web-search Skill",
            },
            {
                "name": "日志分析",
                "input": "分析一下 /var/log/app 的错误日志",
                "expected_route": "skill:log-analyzer",
                "description": "预期路由到 log-analyzer Skill",
            },
            {
                "name": "知识库查询",
                "input": "502 错误怎么处理？",
                "expected_route": "rag:support-knowledge-base",
                "description": "预期路由到 RAG Pipeline",
            },
            {
                "name": "故障诊断",
                "input": "线上服务响应变慢，帮我诊断一下原因",
                "expected_route": "fta:incident-diagnosis",
                "description": "预期路由到 FTA Workflow",
            },
            {
                "name": "简单对话",
                "input": "你好，你是谁？",
                "expected_route": "direct",
                "description": "预期直接由 LLM 回复",
            },
        ]
        
        # 执行测试
        passed = 0
        failed = 0
        
        for i, scenario in enumerate(scenarios, 1):
            print(f"--- 场景 {i}: {scenario['name']} ---")
            print(f"描述: {scenario['description']}")
            print(f"输入: {scenario['input']}")
            print(f"预期: {scenario['expected_route']}")
            
            response = await self.agent.reply({"content": scenario["input"]})
            metadata = response.get("metadata", {})
            
            route_type = metadata.get("route_type", "unknown")
            route_target = metadata.get("route_target", "")
            confidence = metadata.get("confidence", 0)
            
            actual_route = f"{route_type}:{route_target}" if route_target else route_type
            
            # 判断是否符合预期
            expected = scenario["expected_route"]
            match = actual_route == expected or expected in actual_route or route_type in expected
            status = "✓ 符合预期" if match else "✗ 不符合预期"
            
            if match:
                passed += 1
            else:
                failed += 1
            
            print(f"实际: {actual_route}")
            print(f"置信度: {confidence:.2f}")
            print(f"结果: {status}")
            print()
        
        # 输出总结
        print("=" * 60)
        print(f"测试完成: {passed} 通过, {failed} 失败")
        print("=" * 60)
    
    async def run_interactive(self) -> None:
        """运行交互模式"""
        print("\n" + "=" * 60)
        print("交互模式")
        print("=" * 60)
        print("输入问题进行测试，输入 'quit' 或 'exit' 退出")
        print()
        
        while True:
            try:
                user_input = input("You: ").strip()
                
                if not user_input:
                    continue
                
                if user_input.lower() in ["quit", "exit", "q"]:
                    print("\n再见！")
                    break
                
                # 调用 Agent
                response = await self.agent.reply({"content": user_input})
                
                # 显示路由决策
                metadata = response.get("metadata", {})
                route_type = metadata.get("route_type", "unknown")
                route_target = metadata.get("route_target", "")
                confidence = metadata.get("confidence", 0)
                
                print(f"\n[路由决策]")
                print(f"  类型: {route_type}")
                print(f"  目标: {route_target or 'N/A'}")
                print(f"  置信度: {confidence:.2f}")
                print()
                
                # 显示响应
                content = response.get("content", "")
                print(f"Assistant: {content}")
                print()
                
            except KeyboardInterrupt:
                print("\n\n再见！")
                break
            except Exception as e:
                print(f"\n错误: {e}\n")


async def main():
    """主函数"""
    parser = argparse.ArgumentParser(
        description="ResolveNet Intelligent Selector Demo",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
示例:
  python main.py                    # 运行批量测试
  python main.py --interactive      # 交互模式
  python main.py --config my.yaml   # 使用自定义配置
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
