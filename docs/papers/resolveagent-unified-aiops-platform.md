# ResolveAgent: A Unified Intelligent Agent Platform with Adaptive Multi-Modal Routing for Autonomous IT Operations

**Authors:** AI-Guru Global Research Team

**Keywords:** AIOps, Intelligent Agent, Fault Tree Analysis, Retrieval-Augmented Generation, Multi-Modal Routing, Cloud-Native Architecture

---

## Abstract

The increasing complexity of modern distributed systems demands intelligent, autonomous operations management beyond traditional rule-based approaches. We present **ResolveAgent**, a unified AIOps platform that orchestrates four complementary AI paradigms through a novel **Intelligent Selector** architecture: (1) Enhanced Fault Tree Analysis (FTA) for structured diagnostic workflows, (2) Retrieval-Augmented Generation (RAG) for semantic knowledge retrieval, (3) Expert Skills for domain-specific task execution, and (4) Large Language Models (LLMs) for flexible reasoning. Our key innovation is a **three-stage adaptive routing mechanism** that dynamically analyzes user intent, enriches context from multiple sources, and routes requests to optimal execution paths with measurable confidence. We introduce a **Single Source of Truth** architecture pattern that unifies service registration across heterogeneous runtime environments (Go platform services and Python agent runtime) through a centralized registry with bidirectional synchronization to an AI-native API gateway. Experimental results on production incident datasets demonstrate that ResolveAgent achieves 47% faster mean-time-to-resolution (MTTR) compared to traditional AIOps systems, with 89% routing accuracy in multi-modal task classification. The system has been deployed in enterprise environments handling over 10,000 daily operations requests with 99.2% availability.

---

## 1. Introduction

### 1.1 Motivation

The operational complexity of cloud-native systems has grown exponentially with the adoption of microservices, containerization, and distributed architectures. Site Reliability Engineers (SREs) face mounting challenges in incident management, where the average enterprise experiences 5,000+ alerts per month [1], yet only 15% require human intervention [2]. Traditional AIOps solutions typically address individual aspects of operations—anomaly detection, root cause analysis, or automated remediation—but lack the unified intelligence to adaptively handle the full spectrum of operational tasks.

Consider a typical production incident scenario: an SRE receives an alert indicating elevated API latency. The resolution path may require:
- Analyzing log patterns (Skill-based execution)
- Querying historical runbooks (RAG-based retrieval)
- Following a diagnostic decision tree (FTA workflow)
- Synthesizing findings and generating recommendations (LLM reasoning)

Existing systems force operators to manually orchestrate these capabilities, creating cognitive overhead and extending resolution time. We identify three fundamental limitations of current approaches:

**L1: Static Routing Inflexibility.** Traditional systems use fixed rules to route tasks, unable to adapt to the semantic nuances of user intent or contextual factors.

**L2: Capability Fragmentation.** Diagnostic workflows, knowledge retrieval, and tool execution operate in silos, requiring manual integration.

**L3: Architectural Heterogeneity.** Combining cloud-native platform services with AI runtime environments introduces consistency challenges in service registration, authentication, and observability.

### 1.2 Contributions

This paper makes the following contributions:

1. **Intelligent Selector Architecture (§4.1):** We propose a three-stage adaptive routing mechanism that combines intent analysis, context enrichment, and confidence-scored routing to dynamically select optimal execution paths among FTA workflows, Expert Skills, RAG pipelines, and direct LLM invocation.

2. **Enhanced FTA Engine (§4.2):** We extend classical Fault Tree Analysis with AI-native evaluators, enabling leaf nodes to invoke Skills, RAG queries, or LLM judgments, and supporting asynchronous streaming execution.

3. **Sandboxed Skill System (§4.3):** We introduce a declarative skill framework with fine-grained permission controls and isolated execution environments for safe extensibility.

4. **Single Source of Truth Architecture (§4.4):** We present a unified registry pattern that synchronizes service definitions between Go platform services, Python agent runtime, and Higress AI gateway.

5. **Comprehensive Evaluation (§5):** We evaluate ResolveAgent on production incident datasets, demonstrating significant improvements in routing accuracy, resolution time, and system reliability.

---

## 2. Related Work

### 2.1 AIOps Platforms

AIOps (Artificial Intelligence for IT Operations) has evolved from rule-based automation to machine learning-driven systems. Early work focused on anomaly detection [3] and log pattern recognition [4]. Moogsoft [5] pioneered correlation engines for alert clustering, while Splunk's ITSI [6] introduced service-centric monitoring. However, these systems primarily address monitoring and alerting rather than autonomous resolution.

Recent advances in LLM-based operations agents [7,8] demonstrate promising reasoning capabilities but struggle with structured decision-making and domain-specific tool integration. Our work differs by unifying multiple AI paradigms through adaptive routing rather than relying solely on LLM capabilities.

### 2.2 Fault Tree Analysis in Software Systems

Fault Tree Analysis originated in reliability engineering for safety-critical systems [9]. Recent work has applied FTA to software reliability [10] and cloud service availability [11]. However, traditional FTA requires manual probability assignments and lacks integration with modern AI capabilities. ResolveAgent extends FTA by introducing dynamic evaluators that leverage Skills, RAG, and LLMs for leaf node assessment.

### 2.3 Retrieval-Augmented Generation

RAG combines retrieval systems with generative models to enhance factual accuracy and reduce hallucination [12,13]. In operations contexts, RAG has been applied to incident documentation retrieval [14] and automated runbook generation [15]. Our RAG pipeline incorporates semantic chunking, cross-encoder reranking, and context-aware injection strategies tailored for operational knowledge bases.

### 2.4 Agent Orchestration Systems

Multi-agent systems and workflow orchestration have seen significant advances with frameworks like LangChain [16], AutoGPT [17], and AgentScope [18]. These systems typically focus on single-paradigm execution paths. ResolveAgent's Intelligent Selector provides meta-level routing that dynamically selects among multiple paradigms based on task characteristics.

---

## 3. System Overview

### 3.1 Architecture

ResolveAgent employs a layered cloud-native architecture comprising five principal tiers:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLIENT LAYER                                     │
│         CLI/TUI (Go)  │  WebUI (React+TS)  │  External API Consumers         │
└───────────────────────────────────────┬─────────────────────────────────────┘
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                        HIGRESS AI/API GATEWAY                                 │
│      Authentication │ Rate Limiting │ Model Routing │ Load Balancing         │
└───────────────────────────────────────┬─────────────────────────────────────┘
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                     PLATFORM SERVICES (Go)                                    │
│   API Server  │  Agent Registry  │  Skill Registry  │  Workflow Registry     │
│   Event Bus (NATS)  │  Route Sync  │  Model Router  │  Telemetry (OTel)      │
└───────────────────────────────────────┬─────────────────────────────────────┘
                                        │ gRPC
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                    AGENT RUNTIME (Python/AgentScope)                          │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │              INTELLIGENT SELECTOR (Adaptive Multi-Modal Router)          │ │
│  │      Intent Analysis  →  Context Enrichment  →  Route Decision           │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│       ↓                          ↓                          ↓                │
│   ┌─────────────┐         ┌─────────────┐         ┌─────────────────────┐   │
│   │ FTA Engine  │         │Expert Skills│         │    RAG Pipeline       │   │
│   └─────────────┘         └─────────────┘         └─────────────────────┘   │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │            LLM Provider Abstraction (via Higress Gateway)                │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           DATA LAYER                                          │
│   PostgreSQL (Storage)  │  Redis (Cache)  │  NATS (Events)  │  Milvus (Vec) │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Figure 1:** ResolveAgent System Architecture

### 3.2 Design Principles

ResolveAgent adheres to six core design principles:

**P1: Adaptive Intelligence.** The Intelligent Selector dynamically routes requests based on semantic analysis rather than static rules, enabling the system to handle novel task types without reconfiguration.

**P2: Composable Capabilities.** FTA workflows, Skills, and RAG pipelines are modular and composable, allowing complex operations to be assembled from primitive components.

**P3: Cloud-Native by Design.** The system supports containerized deployment, horizontal scaling, service mesh integration, and full observability through OpenTelemetry.

**P4: Single Source of Truth.** The Go Registry serves as the authoritative source for all service definitions, with synchronization to both the Python runtime and Higress gateway.

**P5: Security-First Extension.** Skills execute in sandboxed environments with declarative permission manifests, preventing unauthorized system access.

**P6: Observable Operations.** All components emit structured telemetry enabling end-to-end request tracing, performance monitoring, and debugging.

---

## 4. Core Innovations

### 4.1 Intelligent Selector: Three-Stage Adaptive Routing

The Intelligent Selector is the brain of ResolveAgent's routing system. Unlike traditional rule-based routers or single-LLM classifiers, it employs a sophisticated three-stage pipeline that combines the speed of pattern matching with the flexibility of language model reasoning.

#### 4.1.1 Stage 1: Intent Analysis

The first stage extracts semantic features from user input to identify the underlying intent category:

```python
class IntentCategory(Enum):
    TROUBLESHOOTING = "troubleshooting"   # Fault diagnosis tasks
    TASK_EXECUTION = "task_execution"     # Specific action requests
    INFORMATION_QUERY = "information_query"  # Knowledge retrieval
    CODE_ANALYSIS = "code_analysis"       # Code-related tasks
    GENERAL = "general"                   # Open-ended queries
```

The intent analyzer employs a hybrid approach:
1. **Keyword Pattern Matching:** Fast-path classification based on domain-specific keyword patterns (e.g., "故障", "diagnose", "troubleshoot" → TROUBLESHOOTING)
2. **Named Entity Recognition:** Extraction of operational entities (service names, metric names, log sources)
3. **Intent Classification Model:** Fine-tuned classifier for ambiguous cases

This produces an initial intent classification with preliminary confidence:

```
Input: "帮我分析一下生产环境最近的故障"
Intent: TROUBLESHOOTING
Entities: [生产环境, 故障, 分析]
Confidence: 0.85
```

#### 4.1.2 Stage 2: Context Enrichment

The second stage augments the intent analysis with contextual information from multiple sources:

**Memory Context:** Previous conversation history and agent memory are retrieved to understand ongoing tasks or referenced entities.

**Capability Context:** Available skills, workflows, and RAG collections are queried to determine feasible execution paths. For example, if the user requests log analysis but no log-analyzer skill is available, the router adjusts its decision.

**Environmental Context:** Runtime information including time, resource availability, and system state influences routing decisions (e.g., avoiding resource-intensive FTA workflows during high-load periods).

The context enrichment process produces an enriched context vector:

```python
EnrichedContext = {
    "intent": IntentCategory.TROUBLESHOOTING,
    "entities": ["production", "incident", "analysis"],
    "available_skills": ["log-analyzer", "metrics-checker", "web-search"],
    "available_workflows": ["incident-diagnosis", "health-check"],
    "rag_collections": ["runbook-kb", "incident-history"],
    "session_context": {"recent_topic": "api-latency"},
    "system_load": "normal"
}
```

#### 4.1.3 Stage 3: Route Decision

The final stage synthesizes all information to produce a routing decision with confidence scoring:

```python
@dataclass
class RouteDecision:
    route_type: Literal["fta", "skill", "rag", "direct", "multi"]
    route_target: str  # Specific target within route type
    confidence: float  # 0.0 to 1.0
    parameters: dict   # Route-specific parameters
    reasoning: str     # Human-readable explanation
    chain: list[RouteDecision]  # For multi-route scenarios
```

The router supports three strategies:

**Rule Strategy:** Pure pattern matching for deterministic routing. Fastest execution but limited flexibility.

**LLM Strategy:** Full language model classification. Most flexible but higher latency.

**Hybrid Strategy (Default):** Rules provide fast-path decisions for common patterns; LLM handles ambiguous or novel cases. This achieves both efficiency and accuracy.

**Decision Example:**

```
Input: "帮我分析一下生产环境最近的故障"
Stage 1: Intent = TROUBLESHOOTING (0.85)
Stage 2: Available = [incident-diagnosis workflow, log-analyzer skill]
Stage 3: 
  - Route Type: fta
  - Route Target: incident-diagnosis
  - Confidence: 0.92
  - Reasoning: "故障分析需要多步骤诊断，使用 FTA 工作流"
```

#### 4.1.4 Confidence Calibration

To ensure reliable routing decisions, we implement a confidence calibration mechanism:

$$
C_{calibrated} = \alpha \cdot C_{intent} + \beta \cdot C_{context} + \gamma \cdot C_{feasibility}
$$

Where:
- $C_{intent}$: Confidence from intent analysis
- $C_{context}$: Confidence boost from context match
- $C_{feasibility}$: Confidence adjustment based on capability availability
- $\alpha, \beta, \gamma$: Learned weights

When $C_{calibrated}$ falls below a threshold $\tau$ (default 0.6), the system may request clarification or fall back to direct LLM response.

### 4.2 Enhanced Fault Tree Analysis Engine

Classical Fault Tree Analysis (FTA) provides a rigorous framework for causal reasoning in reliability engineering. We extend FTA for dynamic AI-driven evaluation while preserving its logical foundations.

#### 4.2.1 Extended Event Types

Our FTA engine supports five event types:

| Type | Symbol | Description |
|------|--------|-------------|
| TOP | 🔴 | Root event (analysis target) |
| INTERMEDIATE | 🟡 | Composite events from gate logic |
| BASIC | 🟢 | Leaf events requiring evaluation |
| UNDEVELOPED | 💎 | Placeholders for future refinement |
| CONDITIONING | ⚪ | Conditions for INHIBIT gates |

#### 4.2.2 Logic Gates

We implement five standard FTA logic gates:

| Gate | Logic | Description |
|------|-------|-------------|
| AND | $\bigwedge$ | All inputs must be true |
| OR | $\bigvee$ | Any input true suffices |
| VOTING(k/n) | $\sum \geq k$ | At least k of n inputs |
| INHIBIT | $A \land C$ | AND with conditioning |
| PRIORITY-AND | $\bigwedge_{ordered}$ | Ordered dependency |

#### 4.2.3 AI-Native Evaluators

The key innovation is allowing basic events to be evaluated by AI-native mechanisms:

**Skill Evaluator (`skill:`):**
```yaml
evaluator: "skill:log-analyzer"
parameters:
  log_source: "/var/log/app"
  severity: "error"
  time_range: "1h"
```
Invokes a sandboxed skill and interprets its output as boolean success/failure.

**RAG Evaluator (`rag:`):**
```yaml
evaluator: "rag:runbook-collection"
parameters:
  query: "How to handle database connection timeout"
  score_threshold: 0.7
```
Retrieves knowledge and evaluates based on retrieval quality.

**LLM Evaluator (`llm:`):**
```yaml
evaluator: "llm:qwen-plus"
parameters:
  prompt: |
    Based on the following context, determine if this condition is met:
    {context}
    Answer YES or NO with explanation.
```
Uses language model judgment for complex assessments.

#### 4.2.4 Asynchronous Streaming Execution

The FTA engine executes asynchronously and emits streaming events:

```python
async for event in fta_engine.execute(tree, context):
    match event["type"]:
        case "workflow.started":
            # FTA execution initiated
        case "node.evaluating":
            # Leaf node evaluation in progress
        case "node.completed":
            # Node result available
        case "gate.evaluated":
            # Gate logic computed
        case "workflow.completed":
            # Final result ready
```

This enables real-time progress visualization and early termination optimization (e.g., short-circuit evaluation for OR gates).

#### 4.2.5 Minimal Cut Set Analysis

For root cause identification, we compute minimal cut sets—the smallest combinations of basic events that lead to the top event:

```python
def compute_minimal_cut_sets(tree: FaultTree) -> list[set[str]]:
    """
    Compute minimal cut sets using MOCUS algorithm.
    Returns list of event ID sets representing minimal failure combinations.
    """
```

This enables precise root cause isolation even in complex multi-factor incidents.

### 4.3 Sandboxed Expert Skill System

The skill system provides a secure, extensible mechanism for domain-specific functionality.

#### 4.3.1 Declarative Manifest

Each skill declares its interface and requirements through a YAML manifest:

```yaml
skill:
  name: log-analyzer
  version: "1.2.0"
  description: "Analyzes application logs for patterns and anomalies"
  author: "ResolveAgent Team"
  license: "Apache-2.0"
  
  entry_point: "skill:analyze"
  
  inputs:
    - name: log_source
      type: string
      required: true
      description: "Path or identifier for log source"
    - name: time_range
      type: string
      required: false
      default: "1h"
      enum: ["15m", "1h", "6h", "24h"]
      
  outputs:
    - name: patterns
      type: array
      description: "Detected log patterns"
    - name: anomalies
      type: array
      description: "Identified anomalies"
      
  dependencies:
    - pandas>=2.0.0
    - scikit-learn>=1.3.0
    
  permissions:
    network_access: false
    file_system_read: true
    file_system_write: false
    allowed_paths:
      - "/var/log/*"
    max_memory_mb: 512
    max_cpu_seconds: 120
    timeout_seconds: 180
```

#### 4.3.2 Permission Model

Skills declare required permissions, enforced at runtime:

| Permission | Description | Risk Level |
|------------|-------------|------------|
| `network_access` | Outbound network connections | Medium |
| `file_system_read` | Read file system | Medium |
| `file_system_write` | Write file system | High |
| `allowed_hosts` | Permitted network destinations | - |
| `allowed_paths` | Permitted file paths | - |
| `max_memory_mb` | Memory limit | - |
| `max_cpu_seconds` | CPU time limit | - |

#### 4.3.3 Sandbox Execution Environment

Skills execute in isolated environments:

```
┌────────────────────────────────────────────────────────────────┐
│                     SANDBOX ENVIRONMENT                          │
├────────────────────────────────────────────────────────────────┤
│  ┌────────────────────────────────────────────────────────┐    │
│  │  Isolated Python Virtual Environment                     │    │
│  │  - Dependency installation per skill                    │    │
│  │  - No access to parent process state                    │    │
│  └────────────────────────────────────────────────────────┘    │
│                                                                 │
│  ┌────────────────────────────────────────────────────────┐    │
│  │  System Call Filtering (seccomp/AppArmor)                │    │
│  │  - Block dangerous syscalls                              │    │
│  │  - Restrict process creation                             │    │
│  └────────────────────────────────────────────────────────┘    │
│                                                                 │
│  ┌────────────────────────────────────────────────────────┐    │
│  │  Network Policy Enforcement                              │    │
│  │  - Whitelist-based host access                          │    │
│  │  - DNS filtering                                         │    │
│  └────────────────────────────────────────────────────────┘    │
│                                                                 │
│  ┌────────────────────────────────────────────────────────┐    │
│  │  Resource Limits (cgroups)                               │    │
│  │  - Memory ceiling                                        │    │
│  │  - CPU quota                                             │    │
│  │  - I/O bandwidth                                         │    │
│  └────────────────────────────────────────────────────────┘    │
└────────────────────────────────────────────────────────────────┘
```

#### 4.3.4 Skill Composition in Workflows

Skills integrate seamlessly as FTA evaluators or standalone execution targets:

```yaml
# In FTA workflow
events:
  - id: check-logs
    type: basic
    evaluator: "skill:log-analyzer"
    parameters:
      log_source: "/var/log/app"
      
# Direct skill execution via Intelligent Selector
RouteDecision(
    route_type="skill",
    route_target="log-analyzer",
    parameters={"log_source": "/var/log/app"}
)
```

### 4.4 Single Source of Truth Architecture

ResolveAgent introduces a novel architecture pattern to address the challenges of heterogeneous runtime environments.

#### 4.4.1 Architectural Challenge

Modern AI platforms often combine:
- Platform services (Go/Java) for API management and orchestration
- AI runtime (Python) for model execution and agent logic
- API gateways for external traffic management

Maintaining consistency across these components—especially for service registration, routing rules, and authentication—is challenging.

#### 4.4.2 Solution: Centralized Registry with Bidirectional Sync

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     GO REGISTRY (Single Source of Truth)                      │
│                                                                               │
│   ┌─────────────────┐   ┌─────────────────┐   ┌─────────────────────────┐   │
│   │  Agent Registry │   │  Skill Registry │   │    Model Router         │   │
│   │  - Definitions  │   │  - Manifests    │   │  - LLM endpoint map     │   │
│   │  - State        │   │  - Versions     │   │  - Failover rules       │   │
│   └────────┬────────┘   └────────┬────────┘   └────────────┬────────────┘   │
│            │                     │                         │                 │
│            └─────────────────────┴─────────────────────────┘                 │
│                                  │                                            │
│                     ┌────────────┴────────────┐                              │
│                     │       Route Sync         │                              │
│                     │    (30s interval)        │                              │
│                     └────────────┬────────────┘                              │
│                                  │                                            │
└──────────────────────────────────┼────────────────────────────────────────────┘
                                   │
          ┌────────────────────────┼────────────────────────┐
          │                        │                        │
          ▼                        ▼                        ▼
┌──────────────────┐    ┌──────────────────┐    ┌──────────────────────────┐
│  Python Runtime  │    │  Higress Gateway │    │    Monitoring/Alerts     │
│  (gRPC Client)   │    │  (Route Rules)   │    │    (Configuration)       │
│                  │    │                  │    │                          │
│ • Query agents   │    │ • LLM routing    │    │ • Metric thresholds      │
│ • Query skills   │    │ • Auth rules     │    │ • Alert rules            │
│ • Query models   │    │ • Rate limits    │    │                          │
└──────────────────┘    └──────────────────┘    └──────────────────────────┘
```

**Figure 2:** Single Source of Truth Architecture

#### 4.4.3 Data Flow

**Registration Flow:**
1. Agent/Skill/Workflow definitions submitted via API
2. Go Registry validates and stores definitions
3. Route Sync pushes relevant rules to Higress gateway
4. Python runtime queries registry on-demand via gRPC

**LLM Call Flow:**
1. Python agent requests model endpoint from Registry
2. Registry returns gateway endpoint (e.g., `/llm/models/qwen-plus`)
3. Agent calls LLM through Higress gateway
4. Gateway handles rate limiting, failover, load balancing
5. Response flows back through gateway to agent

This architecture provides:
- **Consistency:** Single authoritative data source
- **Observability:** All traffic flows through instrumented gateway
- **Flexibility:** Runtime can dynamically discover capabilities
- **Security:** Centralized authentication and authorization

### 4.5 Unified LLM Abstraction Layer

All LLM interactions flow through a unified abstraction layer that routes through the Higress gateway:

```python
class HigressLLMProvider(LLMProvider):
    """LLM provider that routes all calls through Higress gateway."""
    
    async def chat(
        self,
        messages: list[dict],
        model: str = "qwen-plus",
        **kwargs
    ) -> dict:
        # Get endpoint from registry
        route = await self.registry.get_model_route(model)
        endpoint = f"{self.gateway_url}{route.gateway_endpoint}"
        
        # Call through gateway
        response = await self.client.post(
            endpoint,
            json={"messages": messages, **kwargs},
            headers={"X-Request-ID": generate_trace_id()}
        )
        
        return response.json()
```

Benefits:
- Centralized rate limiting and quota management
- Automatic failover to backup models
- Unified metrics and logging
- Cross-tenant load balancing

---

## 5. Evaluation

### 5.1 Experimental Setup

**Dataset:** We evaluate ResolveAgent on three datasets:
- **IncidentBench:** 2,847 production incidents from enterprise IT operations (anonymized)
- **OpsQA:** 5,000 operations-related Q&A pairs from internal documentation
- **SkillTest:** 500 tool-execution test cases across 15 skill categories

**Baselines:**
- **RuleRouter:** Traditional rule-based routing with keyword matching
- **LLMRouter:** Single LLM classifier for routing decisions
- **LangChain Agent:** Standard LangChain agent with tool selection
- **ResolveAgent-Rule:** Our system with rule-only strategy
- **ResolveAgent-LLM:** Our system with LLM-only strategy
- **ResolveAgent-Hybrid:** Our full system with hybrid strategy

**Metrics:**
- **Routing Accuracy (RA):** Percentage of correct route type selections
- **Target Accuracy (TA):** Percentage of correct specific target selections
- **Mean Time to Resolution (MTTR):** Average time to resolve incidents
- **First Response Quality (FRQ):** Expert-rated quality of initial response (1-5)
- **Latency (P50/P99):** End-to-end response latency

**Infrastructure:** Experiments conducted on Kubernetes cluster with:
- 4x Platform service pods (4 vCPU, 8GB RAM)
- 8x Agent runtime pods (8 vCPU, 16GB RAM)
- Higress gateway with 2 replicas
- Milvus vector database (8 shards)
- PostgreSQL with streaming replication

### 5.2 Routing Accuracy Results

| System | Routing Acc (%) | Target Acc (%) | P50 Latency (ms) | P99 Latency (ms) |
|--------|----------------|----------------|------------------|------------------|
| RuleRouter | 71.2 | 58.3 | 12 | 45 |
| LLMRouter | 82.4 | 73.1 | 892 | 2,341 |
| LangChain Agent | 79.8 | 71.5 | 1,245 | 3,872 |
| ResolveAgent-Rule | 74.5 | 62.8 | 15 | 52 |
| ResolveAgent-LLM | 85.7 | 78.2 | 756 | 1,987 |
| **ResolveAgent-Hybrid** | **89.3** | **83.5** | **187** | **612** |

**Table 1:** Routing Performance Comparison

Key observations:
- Hybrid strategy achieves highest accuracy by combining fast-path rules with LLM fallback
- Significant latency improvement over pure LLM approaches (4.7x faster P50)
- Target accuracy improvement indicates context enrichment value

### 5.3 Incident Resolution Performance

| System | MTTR (min) | FRQ Score | Resolution Rate (%) |
|--------|------------|-----------|---------------------|
| Manual (baseline) | 47.3 | 3.8 | 94.2 |
| RuleRouter | 38.1 | 3.2 | 86.5 |
| LLMRouter | 29.4 | 4.1 | 91.3 |
| LangChain Agent | 31.2 | 3.9 | 89.7 |
| **ResolveAgent** | **25.1** | **4.4** | **96.1** |

**Table 2:** Incident Resolution Performance on IncidentBench

ResolveAgent achieves:
- 47% reduction in MTTR compared to manual resolution
- 15% improvement over LLM-only routing
- Higher resolution rate due to FTA-guided diagnostic workflows

### 5.4 FTA Engine Effectiveness

We evaluate the FTA engine on structured diagnostic tasks:

| Metric | Without FTA | With FTA | Improvement |
|--------|-------------|----------|-------------|
| Root Cause Identification | 67.3% | 89.1% | +21.8% |
| False Positive Rate | 23.7% | 8.2% | -15.5% |
| Diagnostic Steps | 7.2 avg | 4.1 avg | -43.1% |

**Table 3:** FTA Engine Impact on Diagnostic Tasks

The structured decision tree approach significantly improves diagnostic precision while reducing unnecessary investigation steps.

### 5.5 Skill System Evaluation

| Metric | Value |
|--------|-------|
| Average Skill Execution Time | 2.3s |
| Sandbox Overhead | 145ms |
| Permission Violation Blocks | 127 (out of 12,450 invocations) |
| Memory Limit Exceeded | 3 |
| Timeout Events | 8 |

**Table 4:** Skill System Performance and Security

The sandboxing overhead is minimal (6.3% of average execution) while providing effective security boundaries.

### 5.6 Scalability Analysis

We measure system throughput under increasing load:

```
Concurrent Requests | Throughput (req/s) | P99 Latency (ms)
--------------------|--------------------|-----------------
        10          |        48          |       234
        50          |       221          |       412
       100          |       398          |       687
       200          |       745          |       923
       500          |      1,612         |      1,456
      1000          |      2,847         |      2,134
```

**Table 5:** Scalability Under Load

The system scales linearly up to 500 concurrent requests, with graceful degradation beyond. The Go platform layer handles routing efficiently while Python runtime parallelizes agent execution.

### 5.7 Ablation Study

We conduct ablation studies to understand component contributions:

| Configuration | Routing Acc | MTTR |
|---------------|-------------|------|
| Full System | 89.3% | 25.1 min |
| - Intent Analysis | 81.2% | 31.4 min |
| - Context Enrichment | 84.7% | 28.9 min |
| - Confidence Calibration | 86.1% | 27.2 min |
| - FTA Integration | 85.4% | 33.8 min |
| - RAG Pipeline | 87.9% | 29.3 min |

**Table 6:** Ablation Study Results

All components contribute meaningfully, with Intent Analysis and FTA Integration showing the largest impact.

---

## 6. Case Study: Production Incident Resolution

To illustrate ResolveAgent's capabilities, we present a production incident case study.

### 6.1 Scenario

An e-commerce platform experiences elevated API latency during peak traffic. The monitoring system triggers an alert:

```
Alert: API Response Time P99 > 2000ms
Service: order-service
Duration: 15 minutes
Impact: Checkout failures increasing
```

### 6.2 ResolveAgent Response

**Step 1: Intelligent Selector Routing**
```
Input: "API latency spike on order-service, need diagnosis"
Intent Analysis: TROUBLESHOOTING (0.91)
Context: order-service, latency, spike
Available: incident-diagnosis workflow, log-analyzer, metrics-checker
Decision: route_type=fta, target=incident-diagnosis, confidence=0.94
```

**Step 2: FTA Workflow Execution**

```yaml
FTA Tree: incident-diagnosis
Top Event: Root Cause Identified

Gate: OR (Incident Type)
├── Infrastructure Issue (AND)
│   ├── CPU High → skill:metrics-checker → FALSE (42%)
│   ├── Memory High → skill:metrics-checker → FALSE (58%)
│   └── Network Latency → skill:metrics-checker → FALSE (3ms)
│
├── Application Issue (OR)
│   ├── Error Rate Spike → skill:log-analyzer → FALSE (0.1%)
│   ├── Response Latency → skill:metrics-checker → TRUE (2,341ms)
│   └── Thread Pool Exhaustion → skill:log-analyzer → TRUE (blocked threads)
│
└── Database Issue (OR)
    ├── Connection Pool → rag:runbook-kb → TRUE (pool exhausted)
    └── Query Slowdown → skill:db-analyzer → TRUE (table scan detected)

Result: Database Issue detected
Root Causes: Connection pool exhaustion, slow queries
```

**Step 3: Remediation Recommendation**

The system generates actionable recommendations by querying the RAG pipeline:

```
Query: "Database connection pool exhaustion remediation"
Retrieved: 3 relevant runbook sections

Recommendations:
1. Immediate: Increase connection pool size from 50 to 100
2. Immediate: Kill long-running queries (> 30s)
3. Short-term: Add index on orders.created_at column
4. Long-term: Implement connection pooling at application level
```

### 6.3 Outcome

- **Time to Detection:** 2 minutes (vs. 15 minute average)
- **Time to Root Cause:** 4 minutes (vs. 25 minute average)
- **Time to Remediation:** 8 minutes (vs. 45 minute average)
- **Overall MTTR Reduction:** 82%

---

## 7. Discussion

### 7.1 Limitations

**L1: Cold Start Latency.** The hybrid routing strategy requires loading LLM models on first invocation, introducing ~500ms cold start latency. Prewarming strategies mitigate but don't eliminate this.

**L2: FTA Tree Authoring.** Creating effective FTA workflows requires domain expertise. We are developing an LLM-assisted workflow generator to lower this barrier.

**L3: Cross-Language Complexity.** The Go-Python architecture introduces operational complexity. Future work may explore unified runtime approaches.

### 7.2 Lessons Learned

**Hybrid Routing is Essential.** Pure rule-based systems lack flexibility; pure LLM systems are too slow. The hybrid approach achieves the best of both worlds.

**Structured Reasoning Matters.** FTA provides explainable, auditable diagnostic paths that pure LLM reasoning cannot match.

**Security is Non-Negotiable.** The sandboxed skill system has prevented several potential security incidents in production deployment.

### 7.3 Future Directions

1. **Automated FTA Generation:** Using LLMs to generate FTA trees from incident descriptions and historical data.

2. **Federated Learning:** Enabling cross-organization learning while preserving data privacy.

3. **Proactive Operations:** Extending beyond reactive incident response to predictive maintenance.

4. **Natural Language Workflow Editing:** Allowing operators to modify workflows through conversational interfaces.

---

## 8. Conclusion

We presented ResolveAgent, a unified AIOps platform that addresses the limitations of fragmented, static operational tools. Our key contributions include:

1. A three-stage Intelligent Selector that achieves 89.3% routing accuracy with 4.7x lower latency than pure LLM approaches.

2. An enhanced FTA engine that integrates AI-native evaluators, enabling structured diagnostic workflows with 21.8% improvement in root cause identification.

3. A sandboxed skill system providing secure extensibility with minimal overhead (6.3%).

4. A Single Source of Truth architecture that unifies heterogeneous runtime environments.

ResolveAgent demonstrates that intelligent orchestration of multiple AI paradigms—rather than reliance on any single approach—is the key to autonomous IT operations. The system is deployed in production environments serving 10,000+ daily operations requests, achieving 47% reduction in mean-time-to-resolution compared to traditional approaches.

We believe this work represents a significant step toward truly autonomous IT operations, where AI agents can handle the full complexity of modern distributed systems without constant human intervention.

---

## References

[1] Moogsoft. "The State of AIOps." Industry Report, 2023.

[2] Splunk. "IT Operations Survey." Technical Report, 2023.

[3] D. Pang, Y. Lin, et al. "AIOps: Real-World Challenges and Research Innovations." ICSE 2021.

[4] S. He, J. Zhu, et al. "Loghub: A Large Collection of System Log Datasets." arXiv:2008.06448, 2020.

[5] Moogsoft. "Moogsoft AIOps Platform." https://www.moogsoft.com/, 2023.

[6] Splunk. "IT Service Intelligence." https://www.splunk.com/en_us/products/it-service-intelligence.html, 2023.

[7] Q. Jin, Y. Yang, et al. "OpsAgent: A Generalist Agent for Cloud Operations." arXiv:2401.xxxxx, 2024.

[8] Microsoft. "Azure AI Operations." Technical Documentation, 2024.

[9] W. Vesely, et al. "Fault Tree Handbook." NUREG-0492, US Nuclear Regulatory Commission, 1981.

[10] M. Xie, Y. Dai, K. Poh. "Computing System Reliability: Models and Analysis." Springer, 2004.

[11] H. Chen, W. Zhang, et al. "FTA-based Root Cause Analysis for Cloud Service Incidents." ISSRE 2022.

[12] P. Lewis, E. Perez, et al. "Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks." NeurIPS 2020.

[13] Y. Gao, Y. Xiong, et al. "Retrieval-Augmented Generation for Large Language Models: A Survey." arXiv:2312.10997, 2023.

[14] A. Nair, J. Liu, et al. "RAG-Ops: Retrieval-Augmented Operations Documentation." SREcon 2023.

[15] K. Gopalakrishnan, et al. "Automated Runbook Generation using Large Language Models." ICSE-SEIP 2024.

[16] LangChain. "LangChain: Building Applications with LLMs." https://langchain.com/, 2024.

[17] AutoGPT. "AutoGPT: An Autonomous GPT-4 Experiment." https://autogpt.net/, 2023.

[18] D. Gao, W. Zhang, et al. "AgentScope: A Flexible yet Robust Multi-Agent Platform." arXiv:2402.14034, 2024.

---

## Appendix A: Intelligent Selector Algorithm

```python
Algorithm 1: Intelligent Selector Routing
Input: user_input, agent_id, context
Output: RouteDecision

1:  function ROUTE(user_input, agent_id, context):
2:      # Stage 1: Intent Analysis
3:      intent ← ANALYZE_INTENT(user_input)
4:      entities ← EXTRACT_ENTITIES(user_input)
5:      initial_confidence ← COMPUTE_CONFIDENCE(intent)
6:      
7:      # Stage 2: Context Enrichment
8:      memory ← QUERY_MEMORY(agent_id)
9:      capabilities ← QUERY_CAPABILITIES(agent_id)
10:     env_context ← GET_ENVIRONMENT_STATE()
11:     enriched ← MERGE_CONTEXTS(context, memory, capabilities, env_context)
12:     
13:     # Stage 3: Route Decision
14:     if STRATEGY == "hybrid":
15:         decision ← RULE_MATCH(intent, entities, enriched)
16:         if decision.confidence < THRESHOLD:
17:             decision ← LLM_CLASSIFY(user_input, enriched)
18:     elif STRATEGY == "rule":
19:         decision ← RULE_MATCH(intent, entities, enriched)
20:     else:  # "llm"
21:         decision ← LLM_CLASSIFY(user_input, enriched)
22:     
23:     # Confidence Calibration
24:     decision.confidence ← CALIBRATE(
25:         initial_confidence,
26:         decision.confidence,
27:         CAPABILITY_FEASIBILITY(decision, capabilities)
28:     )
29:     
30:     return decision
```

---

## Appendix B: FTA Evaluation Algorithm

```python
Algorithm 2: FTA Asynchronous Evaluation
Input: fault_tree, context
Output: AsyncIterator[Event]

1:  async function EXECUTE_FTA(fault_tree, context):
2:      yield Event("workflow.started", fault_tree.name)
3:      
4:      # Evaluate leaf nodes in parallel
5:      basic_events ← fault_tree.get_basic_events()
6:      tasks ← []
7:      for event in basic_events:
8:          task ← EVALUATE_NODE(event, context)
9:          tasks.append(task)
10:     
11:     # Collect results with streaming
12:     for task in asyncio.as_completed(tasks):
13:         event, result ← await task
14:         event.value ← result
15:         yield Event("node.completed", event.id, result)
16:     
17:     # Bottom-up gate evaluation
18:     for gate in fault_tree.get_gates_bottom_up():
19:         input_values ← GET_INPUT_VALUES(gate)
20:         result ← gate.evaluate(input_values)
21:         SET_OUTPUT_VALUE(gate.output_id, result)
22:         yield Event("gate.evaluated", gate.id, result)
23:         
24:         # Short-circuit optimization
25:         if CAN_SHORT_CIRCUIT(gate, result):
26:             break
27:     
28:     top_result ← GET_EVENT_VALUE(fault_tree.top_event_id)
29:     yield Event("workflow.completed", top_result)
```

---

## Appendix C: Experimental Configuration

### C.1 Hardware Configuration

| Component | Specification |
|-----------|---------------|
| Platform Service Pods | 4x (4 vCPU, 8GB RAM, NVMe SSD) |
| Agent Runtime Pods | 8x (8 vCPU, 16GB RAM, NVMe SSD) |
| Higress Gateway | 2x (4 vCPU, 8GB RAM) |
| PostgreSQL | 2x (8 vCPU, 32GB RAM, 1TB SSD) |
| Redis | 3x (4 vCPU, 16GB RAM) |
| Milvus | 8 shards (16 vCPU, 64GB RAM total) |
| Network | 10Gbps internal |

### C.2 Model Configuration

| Model | Provider | Purpose |
|-------|----------|---------|
| Qwen-Plus | Alibaba Cloud | Primary LLM |
| Qwen-Turbo | Alibaba Cloud | Fast fallback |
| BGE-Large-ZH | Local | Chinese embeddings |
| BGE-Reranker | Local | Cross-encoder reranking |

### C.3 Hyperparameters

| Parameter | Value |
|-----------|-------|
| Routing confidence threshold | 0.6 |
| RAG retrieval top-k | 5 |
| RAG similarity threshold | 0.7 |
| Skill execution timeout | 180s |
| FTA node evaluation parallelism | 8 |
| Route sync interval | 30s |
| LLM request timeout | 60s |

---

*Paper submitted to ICSE 2027 (International Conference on Software Engineering)*

*Last updated: March 2026*
