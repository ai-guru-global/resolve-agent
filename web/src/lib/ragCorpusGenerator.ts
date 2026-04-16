/**
 * Frontend call-chain → RAG corpus generator.
 *
 * Mirrors the backend CallChainRAGGenerator logic so that corpus
 * documents can be previewed in the browser without a server round-trip.
 *
 * Generates two categories of corpus documents:
 *   1. Code Analysis (7 types): overview, source_file, function, flow, cross_reference, qa_pair
 *   2. Ops Scenarios  (7 types): daily_ops, deep_troubleshoot, incident_response, testing,
 *                                 architecture, feature_consulting, product_learning
 */

import type { K8sAnalysisChain, K8sSourceFile, K8sChainEdge } from '@/types/k8sCorpus';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RAGDocument {
  id: string;
  docType: string;
  title: string;
  content: string;
  metadata: Record<string, unknown>;
}

export interface RAGCorpusResult {
  documents: RAGDocument[];
  stats: {
    // Code analysis
    overview: number;
    sourceFile: number;
    function: number;
    flow: number;
    crossReference: number;
    qaPair: number;
    // Ops scenarios
    dailyOps: number;
    deepTroubleshoot: number;
    incidentResponse: number;
    testing: number;
    architecture: number;
    featureConsulting: number;
    productLearning: number;
    // Totals
    total: number;
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function baseMetadata(chain: K8sAnalysisChain, docType: string): Record<string, unknown> {
  return {
    source: 'call_chain_analysis',
    doc_type: docType,
    chain_id: chain.id,
    chain_name: chain.name,
    chain_type: chain.chainType,
    topology: chain.topology,
    version: chain.version,
    tags: chain.tags,
    components: chain.components,
  };
}

function getFilesForComponent(chain: K8sAnalysisChain, component: string): K8sSourceFile[] {
  return chain.sourceFiles.filter((sf) => sf.component === component);
}

function getEntryAndLeafFiles(chain: K8sAnalysisChain): { entries: K8sSourceFile[]; leaves: K8sSourceFile[] } {
  const asSource = new Set(chain.edges.map((e) => e.sourceFileId));
  const asTarget = new Set(chain.edges.map((e) => e.targetFileId));
  const entries = chain.sourceFiles.filter((sf) => asSource.has(sf.id) && !asTarget.has(sf.id));
  const leaves = chain.sourceFiles.filter((sf) => asTarget.has(sf.id) && !asSource.has(sf.id));
  return { entries, leaves };
}

function getCrossComponentEdges(chain: K8sAnalysisChain): (K8sChainEdge & { srcFile: K8sSourceFile; tgtFile: K8sSourceFile })[] {
  const fileMap = new Map(chain.sourceFiles.map((sf) => [sf.id, sf]));
  const results: (K8sChainEdge & { srcFile: K8sSourceFile; tgtFile: K8sSourceFile })[] = [];
  for (const edge of chain.edges) {
    const src = fileMap.get(edge.sourceFileId);
    const tgt = fileMap.get(edge.targetFileId);
    if (src && tgt && src.component !== tgt.component) {
      results.push({ ...edge, srcFile: src, tgtFile: tgt });
    }
  }
  return results;
}

// ---------------------------------------------------------------------------
// Code Analysis Generators (existing 7 types)
// ---------------------------------------------------------------------------

function generateOverview(chain: K8sAnalysisChain): RAGDocument {
  const typeLabel = chain.chainType === 'troubleshooting' ? '故障排查' : '集群初始化';
  const topoLabel = chain.topology === 'event-driven' ? '事件驱动图' : '顺序流水线';
  const dist = chain.callTypeDistribution;
  const callTypes = Object.entries(dist)
    .filter(([, v]) => v > 0)
    .map(([k, v]) => `${k}: ${v}`)
    .join(', ');

  const fileSummary = chain.sourceFiles
    .map((sf) => `- **${sf.fileName}** (\`${sf.filePath}\`) - ${sf.description} [${sf.importance}] [${sf.component}]`)
    .join('\n');

  const flowSteps = chain.flowSteps.map((s, i) => `${i + 1}. ${s}`).join('\n');

  return {
    id: `overview-${chain.id}`,
    docType: 'overview',
    title: `${chain.name} - 概览`,
    content:
      `# ${chain.name}\n\n` +
      `## 概述\n${chain.description}\n\n` +
      `## 链路特征\n` +
      `- **场景类型**: ${typeLabel}\n` +
      `- **拓扑结构**: ${topoLabel}\n` +
      `- **Kubernetes 版本**: ${chain.version}\n` +
      `- **涉及组件**: ${chain.components.join('、')}\n` +
      `- **源码文件数**: ${chain.totalFiles}\n` +
      `- **关键函数数**: ${chain.totalFunctions}\n` +
      `- **代码行数**: ${chain.totalLinesOfCode.toLocaleString()}\n` +
      `- **调用类型分布**: ${callTypes}\n\n` +
      `## 源码文件概览\n${fileSummary}\n\n` +
      `## 执行流程\n${flowSteps}\n`,
    metadata: baseMetadata(chain, 'overview'),
  };
}

function generateSourceFileDocs(chain: K8sAnalysisChain): RAGDocument[] {
  return chain.sourceFiles.map((sf) => {
    const incoming = chain.edges.filter((e) => e.targetFileId === sf.id);
    const outgoing = chain.edges.filter((e) => e.sourceFileId === sf.id);

    const fns = sf.keyFunctions
      .map((fn) => {
        let s = `\n### ${fn.name}\n**签名**: \`${fn.signature}\`\n\n${fn.description}\n`;
        if (fn.calledBy.length) s += `**被调用方**: ${fn.calledBy.join(', ')}\n`;
        if (fn.calls.length) s += `**调用目标**: ${fn.calls.join(', ')}\n`;
        if (fn.codeSnippet) s += `\n\`\`\`go\n${fn.codeSnippet}\n\`\`\`\n`;
        return s;
      })
      .join('');

    const inStr = incoming.length
      ? incoming.map((e) => `- ← ${e.label} (from ${e.sourceFileId}, type: ${e.callType})`).join('\n')
      : '无入边';
    const outStr = outgoing.length
      ? outgoing.map((e) => `- → ${e.label} (to ${e.targetFileId}, type: ${e.callType})`).join('\n')
      : '无出边';

    return {
      id: `file-${chain.id}-${sf.id}`,
      docType: 'source_file',
      title: `源码文件: ${sf.fileName}`,
      content:
        `# 源码文件: ${sf.fileName}\n\n` +
        `## 基本信息\n` +
        `- **文件路径**: \`${sf.filePath}\`\n` +
        `- **包名**: ${sf.package}\n` +
        `- **所属组件**: ${sf.component}\n` +
        `- **重要程度**: ${sf.importance}\n` +
        `- **代码行数**: ${sf.linesOfCode.toLocaleString()}\n` +
        `- **所属调用链**: ${chain.name}\n\n` +
        `## 文件说明\n${sf.description}\n\n` +
        `## 调用关系\n### 入边（被调用）\n${inStr}\n\n### 出边（调用其他）\n${outStr}\n\n` +
        `## 关键函数\n${fns}\n`,
      metadata: {
        ...baseMetadata(chain, 'source_file'),
        file_id: sf.id,
        file_path: sf.filePath,
        component: sf.component,
        importance: sf.importance,
      },
    };
  });
}

function generateFunctionDocs(chain: K8sAnalysisChain): RAGDocument[] {
  const docs: RAGDocument[] = [];
  for (const sf of chain.sourceFiles) {
    for (const fn of sf.keyFunctions) {
      const relatedEdges = chain.edges.filter((e) => e.functions.includes(fn.name));
      const edgeCtx = relatedEdges.length
        ? relatedEdges
            .map((e) => `- ${e.label} (${e.sourceFileId} → ${e.targetFileId}, type: ${e.callType})`)
            .join('\n')
        : '无直接关联边';

      const snippet = fn.codeSnippet ? `\n## 代码实现\n\`\`\`go\n${fn.codeSnippet}\n\`\`\`\n` : '';

      docs.push({
        id: `func-${chain.id}-${sf.id}-${fn.name}`,
        docType: 'function',
        title: `函数: ${fn.name}`,
        content:
          `# 函数: ${fn.name}\n\n` +
          `## 基本信息\n` +
          `- **函数签名**: \`${fn.signature}\`\n` +
          `- **所在文件**: \`${sf.filePath}\`\n` +
          `- **所属组件**: ${sf.component}\n` +
          `- **所属调用链**: ${chain.name}\n\n` +
          `## 功能说明\n${fn.description}\n\n` +
          `## 调用关系\n### 被以下函数调用\n${fn.calledBy.length ? fn.calledBy.join(', ') : '无（入口函数或类型定义）'}\n\n` +
          `### 调用以下函数\n${fn.calls.length ? fn.calls.join(', ') : '无（叶子节点）'}\n\n` +
          `## 相关调用边\n${edgeCtx}\n${snippet}`,
        metadata: {
          ...baseMetadata(chain, 'function'),
          function_name: fn.name,
          file_path: sf.filePath,
          component: sf.component,
        },
      });
    }
  }
  return docs;
}

function generateFlowDocs(chain: K8sAnalysisChain): RAGDocument[] {
  const docs: RAGDocument[] = [];
  const typeLabel = chain.chainType === 'troubleshooting' ? '故障排查' : '集群初始化';
  const topoLabel = chain.topology === 'event-driven' ? '事件驱动' : '顺序流水线';

  // Complete flow
  docs.push({
    id: `flow-complete-${chain.id}`,
    docType: 'flow_complete',
    title: `${chain.name} - 完整执行流程`,
    content:
      `# ${chain.name} - 完整执行流程\n\n` +
      `## 链路信息\n- **场景**: ${typeLabel}\n- **拓扑**: ${topoLabel}\n- **版本**: ${chain.version}\n\n` +
      `## 执行步骤\n${chain.flowSteps.map((s, i) => `**步骤 ${i + 1}**: ${s}`).join('\n')}\n\n` +
      `## 涉及源码文件\n${chain.sourceFiles.map((sf) => `- ${sf.fileName} (${sf.component}): ${sf.description}`).join('\n')}\n`,
    metadata: { ...baseMetadata(chain, 'flow_complete'), step_count: chain.flowSteps.length },
  });

  // Per-step
  chain.flowSteps.forEach((step, idx) => {
    const prev = idx > 0 ? chain.flowSteps[idx - 1] : null;
    const next = idx < chain.flowSteps.length - 1 ? chain.flowSteps[idx + 1] : null;
    const parts: string[] = [];
    if (prev) parts.push(`**前一步**: ${prev}`);
    parts.push(`**当前步骤 (${idx + 1}/${chain.flowSteps.length})**: ${step}`);
    if (next) parts.push(`**下一步**: ${next}`);

    docs.push({
      id: `flow-step-${chain.id}-${idx}`,
      docType: 'flow_step',
      title: `${chain.name} - 步骤 ${idx + 1}`,
      content:
        `# ${chain.name} - 步骤 ${idx + 1}\n\n` +
        `## 流程上下文\n${parts.join('\n')}\n\n` +
        `## 步骤详情\n${step}\n`,
      metadata: { ...baseMetadata(chain, 'flow_step'), step_index: idx },
    });
  });

  return docs;
}

function generateCrossReferenceDocs(chain: K8sAnalysisChain): RAGDocument[] {
  return getCrossComponentEdges(chain).map((edge) => ({
    id: `xref-${chain.id}-${edge.id}`,
    docType: 'cross_reference',
    title: `组件交互: ${edge.srcFile.component} → ${edge.tgtFile.component}`,
    content:
      `# 组件交互: ${edge.srcFile.component} → ${edge.tgtFile.component}\n\n` +
      `## 交互描述\n${edge.label}\n\n` +
      `## 调用类型\n${edge.callType}\n\n` +
      `## 源端\n- **组件**: ${edge.srcFile.component}\n- **文件**: ${edge.srcFile.fileName}\n\n` +
      `## 目标端\n- **组件**: ${edge.tgtFile.component}\n- **文件**: ${edge.tgtFile.fileName}\n\n` +
      `## 涉及函数\n${edge.functions.join(', ')}\n`,
    metadata: {
      ...baseMetadata(chain, 'cross_reference'),
      source_component: edge.srcFile.component,
      target_component: edge.tgtFile.component,
      call_type: edge.callType,
    },
  }));
}

function generateQAPairDocs(chain: K8sAnalysisChain): RAGDocument[] {
  const docs: RAGDocument[] = [];
  const typeLabel = chain.chainType === 'troubleshooting' ? '故障排查' : '集群初始化';
  let idx = 0;

  const addQA = (q: string, a: string) => {
    docs.push({
      id: `qa-${chain.id}-${idx}`,
      docType: 'qa_pair',
      title: q,
      content: `## 问题\n${q}\n\n## 回答\n${a}\n\n---\n*来源调用链: ${chain.name} | 类型: ${typeLabel}*\n`,
      metadata: { ...baseMetadata(chain, 'qa_pair'), question: q, qa_index: idx },
    });
    idx++;
  };

  // Generic QAs
  addQA(
    `${chain.name} 包含哪些源码文件？`,
    '涉及以下源码文件：\n' + chain.sourceFiles.map((sf) => `- ${sf.fileName} (${sf.filePath}): ${sf.description}`).join('\n'),
  );
  addQA(
    `${chain.name} 的执行流程是什么？`,
    '执行流程如下：\n' + chain.flowSteps.map((s, i) => `${i + 1}. ${s}`).join('\n'),
  );
  addQA(
    `${chain.name} 涉及哪些 Kubernetes 组件？`,
    `涉及以下组件：${chain.components.join('、')}。\n链路类型为${typeLabel}，拓扑结构为${chain.topology === 'event-driven' ? '事件驱动图' : '顺序流水线'}。`,
  );

  // Per-function QAs
  for (const sf of chain.sourceFiles) {
    for (const fn of sf.keyFunctions) {
      addQA(
        `${fn.name} 函数的作用是什么？`,
        `**${fn.name}** 位于 \`${sf.filePath}\` 文件中，属于 ${sf.component} 组件。\n\n` +
          `**功能**: ${fn.description}\n\n` +
          `**函数签名**: \`${fn.signature}\`\n` +
          (fn.calledBy.length ? `**被调用方**: ${fn.calledBy.join(', ')}\n` : '') +
          (fn.calls.length ? `**调用目标**: ${fn.calls.join(', ')}\n` : ''),
      );
    }
  }

  return docs;
}

// ---------------------------------------------------------------------------
// Ops Scenario Generators (new 7 types)
// ---------------------------------------------------------------------------

function generateDailyOpsDocs(chain: K8sAnalysisChain): RAGDocument[] {
  const docs: RAGDocument[] = [];
  const typeLabel = chain.chainType === 'troubleshooting' ? '故障排查' : '集群初始化';
  const topoLabel = chain.topology === 'event-driven' ? '事件驱动' : '顺序流水线';

  // 1. Operations overview
  const componentSummary = chain.components
    .map((c) => {
      const files = getFilesForComponent(chain, c);
      return `- **${c}**: ${files.length} 个源码文件，关键函数 ${files.reduce((s, f) => s + f.keyFunctions.length, 0)} 个`;
    })
    .join('\n');

  docs.push({
    id: `ops-overview-${chain.id}`,
    docType: 'daily_ops',
    title: `${chain.name} - 运维全景`,
    content:
      `# ${chain.name} - 运维全景\n\n` +
      `## 场景概述\n本调用链属于**${typeLabel}**场景，采用${topoLabel}拓扑，涉及 ${chain.components.length} 个核心组件。\n\n` +
      `${chain.description}\n\n` +
      `## 组件概况\n${componentSummary}\n\n` +
      `## 日常运维关注点\n` +
      chain.flowSteps.map((s, i) => `${i + 1}. ${s}`).join('\n') +
      `\n\n## 运维建议\n` +
      `- 定期检查上述 ${chain.flowSteps.length} 个流程步骤的执行状态\n` +
      `- 关注跨组件调用边界的健康状态（共 ${getCrossComponentEdges(chain).length} 个跨组件调用）\n` +
      `- 优先关注 critical 级别的源码文件变更\n`,
    metadata: { ...baseMetadata(chain, 'daily_ops'), ops_category: 'overview' },
  });

  // 2. Per-component operations guide
  for (const comp of chain.components) {
    const files = getFilesForComponent(chain, comp);
    if (files.length === 0) continue;

    const checkpoints = files
      .flatMap((sf) =>
        sf.keyFunctions.map((fn) => `- **${fn.name}** (\`${sf.fileName}\`): ${fn.description}`),
      )
      .join('\n');

    const inEdges = chain.edges.filter((e) => {
      const tgt = chain.sourceFiles.find((f) => f.id === e.targetFileId);
      return tgt?.component === comp;
    });
    const outEdges = chain.edges.filter((e) => {
      const src = chain.sourceFiles.find((f) => f.id === e.sourceFileId);
      return src?.component === comp;
    });

    docs.push({
      id: `ops-comp-${chain.id}-${comp}`,
      docType: 'daily_ops',
      title: `${chain.name} - ${comp} 组件运维指南`,
      content:
        `# ${comp} 组件运维指南\n\n` +
        `## 组件角色\n${comp} 在 ${chain.name} 调用链中包含 ${files.length} 个源码文件。\n\n` +
        `## 关键运维检查点\n${checkpoints}\n\n` +
        `## 上游依赖（入边）\n` +
        (inEdges.length
          ? inEdges.map((e) => `- ← ${e.label} (类型: ${e.callType})`).join('\n')
          : '无上游依赖') +
        `\n\n## 下游调用（出边）\n` +
        (outEdges.length
          ? outEdges.map((e) => `- → ${e.label} (类型: ${e.callType})`).join('\n')
          : '无下游调用') +
        `\n\n## 日常检查清单\n` +
        files.map((sf) => `- [ ] 确认 \`${sf.fileName}\` 运行正常（重要程度: ${sf.importance}）`).join('\n') +
        '\n',
      metadata: { ...baseMetadata(chain, 'daily_ops'), ops_category: 'component_guide', target_component: comp },
    });
  }

  // 3. Monitoring metrics guide
  const dist = chain.callTypeDistribution;
  const callEntries = Object.entries(dist).filter(([, v]) => v > 0);
  const monitoringTargets = chain.edges
    .map((e) => {
      const src = chain.sourceFiles.find((f) => f.id === e.sourceFileId);
      const tgt = chain.sourceFiles.find((f) => f.id === e.targetFileId);
      return `- **${src?.fileName ?? e.sourceFileId} → ${tgt?.fileName ?? e.targetFileId}**: ${e.label} (${e.callType})`;
    })
    .join('\n');

  docs.push({
    id: `ops-monitoring-${chain.id}`,
    docType: 'daily_ops',
    title: `${chain.name} - 监控指标指南`,
    content:
      `# ${chain.name} - 监控指标指南\n\n` +
      `## 调用类型分布\n` +
      callEntries.map(([k, v]) => `- **${k}**: ${v} 条调用边`).join('\n') +
      `\n\n## 监控目标\n以下调用边是需要重点监控的集成点：\n${monitoringTargets}\n\n` +
      `## 建议监控指标\n` +
      `- 各组件进程存活状态\n` +
      `- 跨组件调用延迟和错误率\n` +
      `- 关键函数执行耗时（尤其是 critical 级别文件中的函数）\n` +
      `- ${chain.topology === 'event-driven' ? 'Event/Watch 事件队列积压' : '流水线各阶段处理耗时'}\n`,
    metadata: { ...baseMetadata(chain, 'daily_ops'), ops_category: 'monitoring' },
  });

  // 4. Configuration management guide
  const filesByImportance = [...chain.sourceFiles].sort((a, b) => {
    const order = { critical: 0, high: 1, medium: 2 };
    return order[a.importance] - order[b.importance];
  });

  docs.push({
    id: `ops-config-${chain.id}`,
    docType: 'daily_ops',
    title: `${chain.name} - 配置管理指南`,
    content:
      `# ${chain.name} - 配置管理指南\n\n` +
      `## 配置优先级（按重要程度排序）\n` +
      filesByImportance.map((sf) => `- **[${sf.importance}]** \`${sf.filePath}\` (${sf.component}): ${sf.description}`).join('\n') +
      `\n\n## 配置审查清单\n` +
      chain.flowSteps.map((s, i) => `${i + 1}. 确认步骤「${s}」相关配置正确`).join('\n') +
      `\n\n## 拓扑相关配置要点\n` +
      (chain.topology === 'event-driven'
        ? '- 确认事件源（Event Source）配置正确\n- 检查 Watch 超时和重连策略\n- 验证事件过滤器规则'
        : '- 确认流水线各阶段的超时配置\n- 检查阶段间的重试策略\n- 验证依赖服务的连接参数') +
      '\n',
    metadata: { ...baseMetadata(chain, 'daily_ops'), ops_category: 'config' },
  });

  return docs;
}

function generateDeepTroubleshootDocs(chain: K8sAnalysisChain): RAGDocument[] {
  const docs: RAGDocument[] = [];
  const typeLabel = chain.chainType === 'troubleshooting' ? '故障排查' : '集群初始化';
  const { entries, leaves } = getEntryAndLeafFiles(chain);
  const crossEdges = getCrossComponentEdges(chain);

  // 1. Cross-component diagnosis path
  const diagPath = crossEdges
    .map((e) => `**${e.srcFile.component}** (\`${e.srcFile.fileName}\`) --[${e.callType}: ${e.label}]--> **${e.tgtFile.component}** (\`${e.tgtFile.fileName}\`)`)
    .join('\n');

  docs.push({
    id: `diag-path-${chain.id}`,
    docType: 'deep_troubleshoot',
    title: `${chain.name} - 跨组件诊断路径`,
    content:
      `# ${chain.name} - 跨组件诊断路径\n\n` +
      `## 诊断起点\n` +
      (entries.length
        ? entries.map((sf) => `- **${sf.fileName}** (${sf.component}): ${sf.description}`).join('\n')
        : '未识别到明确的入口文件，建议从第一个流程步骤开始排查') +
      `\n\n## 诊断终点\n` +
      (leaves.length
        ? leaves.map((sf) => `- **${sf.fileName}** (${sf.component}): ${sf.description}`).join('\n')
        : '未识别到明确的叶子文件') +
      `\n\n## 跨组件调用路径\n按调用方向依次排查以下边界：\n${diagPath || '无跨组件调用'}\n\n` +
      `## 诊断方法\n` +
      `1. 从入口组件开始，确认请求/事件是否正确到达\n` +
      `2. 在每个跨组件边界检查：调用是否成功、返回是否正常、延迟是否异常\n` +
      `3. 逐步向下游追踪，直到定位到故障组件\n` +
      `4. 在故障组件内部，检查关键函数的执行情况\n`,
    metadata: { ...baseMetadata(chain, 'deep_troubleshoot'), diagnosis_depth: 'deep', critical_path: true },
  });

  // 2. Critical function deep dive (for critical/high importance files)
  const criticalFiles = chain.sourceFiles.filter((sf) => sf.importance === 'critical');
  for (const sf of criticalFiles) {
    const relatedEdges = chain.edges.filter((e) => e.sourceFileId === sf.id || e.targetFileId === sf.id);
    const fnAnalysis = sf.keyFunctions
      .map((fn) => {
        const callerInfo = fn.calledBy.length ? `被 ${fn.calledBy.join(', ')} 调用` : '入口函数';
        const calleeInfo = fn.calls.length ? `调用 ${fn.calls.join(', ')}` : '叶子节点';
        return (
          `### ${fn.name}\n` +
          `- **作用**: ${fn.description}\n` +
          `- **调用链位置**: ${callerInfo} → **${fn.name}** → ${calleeInfo}\n` +
          `- **潜在故障点**: 检查函数输入参数、返回值、异常处理\n` +
          (fn.codeSnippet ? `- **参考代码**:\n\`\`\`go\n${fn.codeSnippet}\n\`\`\`\n` : '')
        );
      })
      .join('\n');

    docs.push({
      id: `diag-critical-${chain.id}-${sf.id}`,
      docType: 'deep_troubleshoot',
      title: `${chain.name} - ${sf.fileName} 深度诊断`,
      content:
        `# ${sf.fileName} 深度诊断指南\n\n` +
        `## 文件概况\n- **路径**: \`${sf.filePath}\`\n- **组件**: ${sf.component}\n- **重要程度**: ${sf.importance}\n- **相关调用边**: ${relatedEdges.length} 条\n\n` +
        `## 关键函数分析\n${fnAnalysis}\n` +
        `## 排查建议\n` +
        `- 检查该文件所有关键函数的日志输出\n` +
        `- 关注 ${relatedEdges.length} 条相关调用边的健康状态\n` +
        `- 对比正常执行路径和异常路径的差异\n`,
      metadata: {
        ...baseMetadata(chain, 'deep_troubleshoot'),
        diagnosis_depth: 'deep',
        critical_path: true,
        target_file: sf.filePath,
      },
    });
  }

  // 3. Call type failure analysis
  const dist = chain.callTypeDistribution;
  const callTypeAnalysis = Object.entries(dist)
    .filter(([, v]) => v > 0)
    .map(([callType, count]) => {
      const examples = chain.edges.filter((e) => e.callType === callType).slice(0, 3);
      const exampleStr = examples.map((e) => `  - ${e.label}`).join('\n');
      let failureModes = '';
      switch (callType) {
        case 'direct': failureModes = '函数调用异常、空指针、参数校验失败'; break;
        case 'grpc': failureModes = '连接超时、序列化错误、服务不可用(Unavailable)、截止时间超时(DeadlineExceeded)'; break;
        case 'http': failureModes = '连接拒绝、超时、4xx/5xx 状态码、TLS 证书问题'; break;
        case 'event': failureModes = '事件丢失、队列积压、事件处理延迟、重复事件'; break;
        case 'watch': failureModes = 'Watch 断开重连、ResourceVersion 过期、全量 List 退化'; break;
      }
      return `### ${callType} 调用（${count} 条）\n**典型故障模式**: ${failureModes}\n**涉及调用边**:\n${exampleStr}`;
    })
    .join('\n\n');

  docs.push({
    id: `diag-calltype-${chain.id}`,
    docType: 'deep_troubleshoot',
    title: `${chain.name} - 调用类型故障分析`,
    content:
      `# ${chain.name} - 调用类型故障分析\n\n` +
      `## 概述\n本调用链涉及 ${Object.entries(dist).filter(([, v]) => v > 0).length} 种调用类型，共 ${chain.edges.length} 条调用边。\n\n` +
      `${callTypeAnalysis}\n\n` +
      `## 通用诊断工具\n` +
      `- \`kubectl logs\`: 查看组件日志\n` +
      `- \`kubectl describe\`: 查看资源状态和事件\n` +
      `- \`kubectl get events\`: 查看集群事件\n` +
      `- 组件内置 metrics 端点: 查看调用延迟和错误计数\n`,
    metadata: { ...baseMetadata(chain, 'deep_troubleshoot'), diagnosis_depth: 'surface' },
  });

  // 4. Root cause analysis template
  const rcaSteps = chain.flowSteps
    .map((step, idx) => {
      const relatedFiles = chain.sourceFiles.filter((sf) =>
        sf.keyFunctions.some((fn) => step.toLowerCase().includes(fn.name.toLowerCase())),
      );
      const fileRef = relatedFiles.length
        ? relatedFiles.map((sf) => `\`${sf.fileName}\``).join(', ')
        : '需要进一步关联';
      return `### 故障点 ${idx + 1}: ${step}\n- **关联文件**: ${fileRef}\n- **检查项**: [ ] 该步骤是否正常执行\n- **根因假设**: （待填写）\n- **验证方法**: （待填写）`;
    })
    .join('\n\n');

  docs.push({
    id: `diag-rca-${chain.id}`,
    docType: 'deep_troubleshoot',
    title: `${chain.name} - 根因分析模板`,
    content:
      `# ${chain.name} - 根因分析模板\n\n` +
      `## 场景: ${typeLabel}\n\n` +
      `## 现象描述\n（待填写：描述观察到的具体问题表现）\n\n` +
      `## 影响范围\n- **涉及组件**: ${chain.components.join('、')}\n- **影响链路**: ${chain.name}\n\n` +
      `## 逐步排查\n${rcaSteps}\n\n` +
      `## 根因结论\n（待填写）\n\n## 修复方案\n（待填写）\n`,
    metadata: { ...baseMetadata(chain, 'deep_troubleshoot'), diagnosis_depth: 'deep', critical_path: false },
  });

  return docs;
}

function generateIncidentResponseDocs(chain: K8sAnalysisChain): RAGDocument[] {
  const docs: RAGDocument[] = [];
  const typeLabel = chain.chainType === 'troubleshooting' ? '故障排查' : '集群初始化';
  const crossEdges = getCrossComponentEdges(chain);
  const criticalFiles = chain.sourceFiles.filter((sf) => sf.importance === 'critical');

  // 1. Emergency response plan
  const steps = chain.chainType === 'troubleshooting'
    ? [...chain.flowSteps].reverse()
    : chain.flowSteps;
  const direction = chain.chainType === 'troubleshooting' ? '（从现象到根因，逆向排查）' : '（按初始化顺序逐步验证）';

  docs.push({
    id: `incident-plan-${chain.id}`,
    docType: 'incident_response',
    title: `${chain.name} - 应急预案`,
    content:
      `# ${chain.name} - 应急预案\n\n` +
      `## 场景: ${typeLabel}\n## 严重程度评估\n` +
      `- 涉及组件数: ${chain.components.length}\n` +
      `- 跨组件调用数: ${crossEdges.length}\n` +
      `- 关键文件数: ${criticalFiles.length}\n\n` +
      `## 应急响应步骤 ${direction}\n` +
      steps.map((s, i) => `**步骤 ${i + 1}**: ${s}`).join('\n') +
      `\n\n## 升级路径\n` +
      `- P2: 单组件异常，无跨组件影响\n` +
      `- P1: 跨组件调用中断，影响部分功能\n` +
      `- P0: 多组件级联故障，核心功能不可用\n\n` +
      `## 关键联系人\n（请根据实际情况填写各组件负责人）\n`,
    metadata: { ...baseMetadata(chain, 'incident_response'), severity: 'P1', response_type: 'plan' },
  });

  // 2. Fault handling checklist
  const checkItems = chain.flowSteps.map((step, idx) => {
    const relatedComp = chain.components[Math.min(idx, chain.components.length - 1)];
    const importance = idx < chain.flowSteps.length / 3 ? '高' : idx < (chain.flowSteps.length * 2) / 3 ? '中' : '低';
    return `- [ ] **[${importance}优先级]** ${step}\n  - 责任组件: ${relatedComp}\n  - 参考文件: ${chain.sourceFiles.filter((sf) => sf.component === relatedComp).map((sf) => `\`${sf.fileName}\``).join(', ') || '—'}`;
  });

  docs.push({
    id: `incident-checklist-${chain.id}`,
    docType: 'incident_response',
    title: `${chain.name} - 故障处理 Checklist`,
    content:
      `# ${chain.name} - 故障处理 Checklist\n\n` +
      `## 初始确认\n` +
      `- [ ] 确认告警来源和影响范围\n` +
      `- [ ] 通知相关值班人员\n` +
      `- [ ] 记录故障发生时间\n\n` +
      `## 逐项排查\n${checkItems.join('\n')}\n\n` +
      `## 跨组件检查\n` +
      crossEdges.map((e) => `- [ ] ${e.srcFile.component} → ${e.tgtFile.component}: ${e.label} (${e.callType})`).join('\n') +
      `\n\n## 收尾确认\n` +
      `- [ ] 确认所有组件恢复正常\n` +
      `- [ ] 更新监控告警阈值（如需）\n` +
      `- [ ] 安排复盘会议\n`,
    metadata: { ...baseMetadata(chain, 'incident_response'), severity: 'P1', response_type: 'checklist' },
  });

  // 3. Quick recovery playbook
  const recoverySteps = chain.flowSteps.map((step, idx) => {
    const isBoundary = crossEdges.some((e) => {
      const srcIdx = chain.sourceFiles.findIndex((sf) => sf.id === e.sourceFileId);
      return srcIdx === idx || srcIdx === idx - 1;
    });
    return `${idx + 1}. ${step}${isBoundary ? ' **[回滚点]**' : ''}`;
  });

  docs.push({
    id: `incident-recovery-${chain.id}`,
    docType: 'incident_response',
    title: `${chain.name} - 快速恢复方案`,
    content:
      `# ${chain.name} - 快速恢复方案\n\n` +
      `## 恢复策略\n` +
      (chain.chainType === 'troubleshooting'
        ? '针对故障排查场景，按照从下游到上游的顺序逐步恢复：'
        : '针对初始化场景，确认前序阶段成功后再推进下一阶段：') +
      `\n\n## 恢复步骤（含回滚点标记）\n` +
      recoverySteps.join('\n') +
      `\n\n## 回滚注意事项\n` +
      `- 在标记为 **[回滚点]** 的步骤处可以安全回退\n` +
      `- 回滚前确认上游组件状态\n` +
      `- 记录回滚操作的时间和原因\n\n` +
      `## 恢复后验证\n` +
      chain.components.map((c) => `- [ ] ${c} 组件功能正常`).join('\n') +
      '\n',
    metadata: { ...baseMetadata(chain, 'incident_response'), severity: 'P1', response_type: 'playbook' },
  });

  // 4. Postmortem template
  docs.push({
    id: `incident-postmortem-${chain.id}`,
    docType: 'incident_response',
    title: `${chain.name} - 复盘总结模板`,
    content:
      `# ${chain.name} - 故障复盘总结\n\n` +
      `## 基本信息\n` +
      `- **故障时间**: （待填写）\n` +
      `- **持续时长**: （待填写）\n` +
      `- **严重程度**: P（待填写）\n` +
      `- **影响范围**: ${chain.components.join('、')}\n\n` +
      `## 时间线\n` +
      chain.flowSteps.map((s, i) => `| T+${i} | ${s} | 状态: （待填写） |`).join('\n') +
      `\n\n## 影响分析\n` +
      `- **受影响组件**: ${chain.components.join('、')}\n` +
      `- **受影响调用链**: ${chain.name}\n` +
      `- **跨组件影响**: ${crossEdges.length} 条跨组件调用\n\n` +
      `## 根因分析\n` +
      `**直接原因**: （待填写）\n\n` +
      `**根本原因**: （待填写）\n\n` +
      `## 关键文件参考\n` +
      criticalFiles.map((sf) => `- \`${sf.filePath}\` (${sf.component}): ${sf.description}`).join('\n') +
      `\n\n## 改进措施\n` +
      `| 措施 | 负责人 | 截止日期 | 状态 |\n|------|--------|----------|------|\n| （待填写） | | | |\n`,
    metadata: { ...baseMetadata(chain, 'incident_response'), severity: 'P1', response_type: 'postmortem' },
  });

  return docs;
}

function generateTestingDocs(chain: K8sAnalysisChain): RAGDocument[] {
  const docs: RAGDocument[] = [];
  const crossEdges = getCrossComponentEdges(chain);

  // 1. Unit test cases per source file
  for (const sf of chain.sourceFiles) {
    const testCases = sf.keyFunctions.map((fn) => {
      const inputScenario = fn.calledBy.length
        ? `由 ${fn.calledBy.join(', ')} 触发调用`
        : '作为入口函数直接调用';
      const downstream = fn.calls.length
        ? `验证对 ${fn.calls.join(', ')} 的调用行为`
        : '验证最终输出或返回值';
      return (
        `### Test_${fn.name}\n` +
        `- **测试目标**: ${fn.description}\n` +
        `- **函数签名**: \`${fn.signature}\`\n` +
        `- **输入场景**: ${inputScenario}\n` +
        `- **预期行为**: ${fn.description}\n` +
        `- **下游验证**: ${downstream}\n` +
        `- **边界条件**: 空输入、异常参数、超时场景\n`
      );
    });

    docs.push({
      id: `test-unit-${chain.id}-${sf.id}`,
      docType: 'testing',
      title: `单元测试: ${sf.fileName}`,
      content:
        `# 单元测试用例: ${sf.fileName}\n\n` +
        `## 文件信息\n- **路径**: \`${sf.filePath}\`\n- **组件**: ${sf.component}\n- **函数数**: ${sf.keyFunctions.length}\n\n` +
        `## 测试用例\n${testCases.join('\n')}\n`,
      metadata: {
        ...baseMetadata(chain, 'testing'),
        test_type: 'unit',
        target_file: sf.filePath,
      },
    });
  }

  // 2. Integration test plan
  const edgesByType = new Map<string, typeof chain.edges>();
  for (const e of chain.edges) {
    const arr = edgesByType.get(e.callType) ?? [];
    arr.push(e);
    edgesByType.set(e.callType, arr);
  }
  const fileMap = new Map(chain.sourceFiles.map((sf) => [sf.id, sf]));

  const integrationScenarios = Array.from(edgesByType.entries())
    .map(([callType, edges]) => {
      const scenarios = edges.map((e) => {
        const src = fileMap.get(e.sourceFileId);
        const tgt = fileMap.get(e.targetFileId);
        const isCross = src && tgt && src.component !== tgt.component;
        return `- ${isCross ? '**[跨组件]** ' : ''}${src?.fileName ?? e.sourceFileId} → ${tgt?.fileName ?? e.targetFileId}: ${e.label}`;
      });
      return `### ${callType} 调用集成测试\n${scenarios.join('\n')}`;
    })
    .join('\n\n');

  docs.push({
    id: `test-integration-${chain.id}`,
    docType: 'testing',
    title: `${chain.name} - 集成测试方案`,
    content:
      `# ${chain.name} - 集成测试方案\n\n` +
      `## 概述\n共 ${chain.edges.length} 条调用边需要集成测试验证，其中 ${crossEdges.length} 条跨组件调用。\n\n` +
      `## 测试场景（按调用类型分组）\n${integrationScenarios}\n\n` +
      `## 测试环境要求\n` +
      `- 所有 ${chain.components.length} 个组件 (${chain.components.join(', ')}) 正常运行\n` +
      `- Kubernetes 版本: ${chain.version}\n` +
      `- 需要的访问权限: cluster-admin 或等效权限\n`,
    metadata: { ...baseMetadata(chain, 'testing'), test_type: 'integration' },
  });

  // 3. Performance baseline
  const hotFiles = [...chain.sourceFiles].sort((a, b) => {
    const aEdges = chain.edges.filter((e) => e.sourceFileId === a.id || e.targetFileId === a.id).length;
    const bEdges = chain.edges.filter((e) => e.sourceFileId === b.id || e.targetFileId === b.id).length;
    return bEdges - aEdges;
  });

  docs.push({
    id: `test-perf-${chain.id}`,
    docType: 'testing',
    title: `${chain.name} - 性能测试基线`,
    content:
      `# ${chain.name} - 性能测试基线\n\n` +
      `## 链路规模\n- 源码文件: ${chain.totalFiles}\n- 关键函数: ${chain.totalFunctions}\n- 代码行数: ${chain.totalLinesOfCode.toLocaleString()}\n- 调用边: ${chain.edges.length}\n\n` +
      `## 热点路径（按边密度排序）\n` +
      hotFiles.slice(0, 5).map((sf) => {
        const edgeCount = chain.edges.filter((e) => e.sourceFileId === sf.id || e.targetFileId === sf.id).length;
        return `- **${sf.fileName}** (${sf.component}): ${edgeCount} 条关联边, ${sf.linesOfCode} LOC`;
      }).join('\n') +
      `\n\n## 建议基线指标\n` +
      `| 指标 | 基线值 | 说明 |\n|------|--------|------|\n` +
      `| 端到端延迟 | < 5s | 完整链路执行时间 |\n` +
      `| 跨组件调用延迟 | < 500ms | 单次跨组件调用 |\n` +
      `| 函数执行耗时 | < 100ms | 单个关键函数 |\n` +
      `| 内存占用 | 基于组件 | 各组件运行时内存 |\n`,
    metadata: { ...baseMetadata(chain, 'testing'), test_type: 'performance' },
  });

  // 4. Regression test points
  docs.push({
    id: `test-regression-${chain.id}`,
    docType: 'testing',
    title: `${chain.name} - 回归测试要点`,
    content:
      `# ${chain.name} - 回归测试要点\n\n` +
      `## 关键回归点\n以下跨组件调用边代表关键行为契约，代码变更后必须回归验证：\n\n` +
      crossEdges.map((e) =>
        `### ${e.srcFile.component} → ${e.tgtFile.component}\n` +
        `- **调用描述**: ${e.label}\n` +
        `- **调用类型**: ${e.callType}\n` +
        `- **涉及函数**: ${e.functions.join(', ')}\n` +
        `- **行为契约**: 确保 ${e.srcFile.fileName} 对 ${e.tgtFile.fileName} 的 ${e.callType} 调用语义不变\n`,
      ).join('\n') +
      `\n## 回归测试策略\n` +
      `- 每次涉及上述文件的变更，必须执行对应的集成测试\n` +
      `- 跨组件接口变更需要双方组件所有者确认\n` +
      `- 调用类型变更（如 direct → grpc）需要全量回归\n`,
    metadata: { ...baseMetadata(chain, 'testing'), test_type: 'regression' },
  });

  return docs;
}

function generateArchitectureDocs(chain: K8sAnalysisChain): RAGDocument[] {
  const docs: RAGDocument[] = [];
  const crossEdges = getCrossComponentEdges(chain);
  const topoLabel = chain.topology === 'event-driven' ? '事件驱动' : '顺序流水线';

  // 1. Architecture overview & analysis
  const compCoupling = chain.components.map((comp) => {
    const files = getFilesForComponent(chain, comp);
    const outEdges = chain.edges.filter((e) => files.some((f) => f.id === e.sourceFileId));
    const inEdges = chain.edges.filter((e) => files.some((f) => f.id === e.targetFileId));
    return { comp, files: files.length, outEdges: outEdges.length, inEdges: inEdges.length, total: outEdges.length + inEdges.length };
  });
  const maxCoupling = compCoupling.reduce((max, c) => (c.total > max.total ? c : max), compCoupling[0]!);

  docs.push({
    id: `arch-overview-${chain.id}`,
    docType: 'architecture',
    title: `${chain.name} - 架构分析`,
    content:
      `# ${chain.name} - 架构分析\n\n` +
      `## 拓扑类型: ${topoLabel}\n\n` +
      `## 复杂度指标\n` +
      `- 组件数: ${chain.components.length}\n` +
      `- 源码文件数: ${chain.totalFiles}\n` +
      `- 关键函数数: ${chain.totalFunctions}\n` +
      `- 代码行数: ${chain.totalLinesOfCode.toLocaleString()}\n` +
      `- 调用边数: ${chain.edges.length}\n` +
      `- 跨组件边数: ${crossEdges.length}\n\n` +
      `## 组件耦合度分析\n` +
      compCoupling.map((c) => `- **${c.comp}**: ${c.files} 文件, ${c.outEdges} 出边, ${c.inEdges} 入边 (总耦合度: ${c.total})`).join('\n') +
      `\n\n## 发现\n` +
      `- 耦合度最高的组件: **${maxCoupling.comp}** (${maxCoupling.total} 条边)\n` +
      `- 跨组件调用占比: ${chain.edges.length > 0 ? Math.round((crossEdges.length / chain.edges.length) * 100) : 0}%\n` +
      `- 代码分布${chain.sourceFiles.some((sf) => sf.linesOfCode > chain.totalLinesOfCode * 0.3) ? '不均匀（存在大文件）' : '相对均匀'}\n`,
    metadata: { ...baseMetadata(chain, 'architecture'), improvement_area: 'coupling' },
  });

  // 2. Per-component improvement suggestions
  for (const comp of chain.components) {
    const files = getFilesForComponent(chain, comp);
    if (files.length === 0) continue;
    const totalFns = files.reduce((s, f) => s + f.keyFunctions.length, 0);
    const totalLoc = files.reduce((s, f) => s + f.linesOfCode, 0);
    const compEdges = chain.edges.filter((e) => files.some((f) => f.id === e.sourceFileId || f.id === e.targetFileId));
    const callTypes = new Set(compEdges.map((e) => e.callType));

    const suggestions: string[] = [];
    if (files.some((f) => f.keyFunctions.length > 5)) {
      suggestions.push('- 存在函数过多的文件，建议按职责拆分');
    }
    if (files.some((f) => f.linesOfCode > 2000)) {
      suggestions.push('- 存在大文件（>2000 LOC），建议提取独立模块');
    }
    if (callTypes.size > 2) {
      suggestions.push(`- 使用了 ${callTypes.size} 种调用类型 (${Array.from(callTypes).join(', ')})，建议统一通信协议`);
    }
    if (suggestions.length === 0) {
      suggestions.push('- 当前架构指标正常，建议保持现有设计');
    }

    docs.push({
      id: `arch-comp-${chain.id}-${comp}`,
      docType: 'architecture',
      title: `${chain.name} - ${comp} 改进建议`,
      content:
        `# ${comp} 组件 - 架构改进建议\n\n` +
        `## 组件指标\n` +
        `- 文件数: ${files.length}\n` +
        `- 函数数: ${totalFns}\n` +
        `- 代码行数: ${totalLoc.toLocaleString()}\n` +
        `- 关联调用边: ${compEdges.length}\n` +
        `- 使用的调用类型: ${Array.from(callTypes).join(', ')}\n\n` +
        `## 文件清单\n` +
        files.map((sf) => `- \`${sf.fileName}\`: ${sf.linesOfCode} LOC, ${sf.keyFunctions.length} 函数 [${sf.importance}]`).join('\n') +
        `\n\n## 改进建议\n${suggestions.join('\n')}\n`,
      metadata: { ...baseMetadata(chain, 'architecture'), improvement_area: 'complexity', target_component: comp },
    });
  }

  // 3. Design pattern analysis
  docs.push({
    id: `arch-patterns-${chain.id}`,
    docType: 'architecture',
    title: `${chain.name} - 设计模式分析`,
    content:
      `# ${chain.name} - 设计模式分析\n\n` +
      `## 当前拓扑: ${topoLabel}\n\n` +
      (chain.topology === 'event-driven'
        ? `## 识别到的模式\n` +
          `### 观察者/发布-订阅模式\n` +
          `本链路采用事件驱动拓扑，组件间通过 Event 和 Watch 机制通信。\n` +
          `- Event 调用: ${chain.callTypeDistribution.event} 条\n` +
          `- Watch 调用: ${chain.callTypeDistribution.watch} 条\n\n` +
          `### 改进方向\n` +
          `- 考虑引入事件去重机制，避免重复处理\n` +
          `- 评估是否需要事件持久化/回放能力\n` +
          `- 优化 Watch 的重连策略和 ResourceVersion 管理\n`
        : `## 识别到的模式\n` +
          `### 管道/阶段执行器模式\n` +
          `本链路采用顺序流水线拓扑，${chain.flowSteps.length} 个阶段依次执行。\n` +
          `- 直接调用: ${chain.callTypeDistribution.direct} 条\n\n` +
          `### 改进方向\n` +
          `- 考虑在阶段间添加检查点（Checkpoint），支持断点续执行\n` +
          `- 评估各阶段是否可以并行化\n` +
          `- 增强阶段间的错误传递和回滚机制\n`) +
      `\n## 通用改进建议\n` +
      `- 提高组件间接口的标准化程度\n` +
      `- 增加调用链的可观测性（Tracing/Metrics/Logging）\n` +
      `- 考虑引入熔断器（Circuit Breaker）保护跨组件调用\n`,
    metadata: { ...baseMetadata(chain, 'architecture'), improvement_area: 'patterns' },
  });

  // 4. Optimization strategy
  const dist = chain.callTypeDistribution;
  const optimizations: string[] = [];
  if (dist.http > 2) optimizations.push('- **HTTP 调用优化**: 考虑连接池复用、请求合并、缓存策略');
  if (dist.grpc > 2) optimizations.push('- **gRPC 调用优化**: 启用连接复用、考虑双向流式调用减少 RTT');
  if (dist.watch > 0) optimizations.push('- **Watch 效率优化**: 使用 SharedInformer 减少 API Server 负载、优化事件过滤');
  if (dist.event > 0) optimizations.push('- **事件处理优化**: 批量处理事件、使用工作队列削峰');
  if (optimizations.length === 0) optimizations.push('- 当前调用模式较简单，暂无特殊优化建议');

  docs.push({
    id: `arch-optim-${chain.id}`,
    docType: 'architecture',
    title: `${chain.name} - 优化策略`,
    content:
      `# ${chain.name} - 优化策略\n\n` +
      `## 调用类型分布\n` +
      Object.entries(dist).filter(([, v]) => v > 0).map(([k, v]) => `- ${k}: ${v} 条`).join('\n') +
      `\n\n## 优化建议\n${optimizations.join('\n')}\n\n` +
      `## 代码级优化目标\n` +
      chain.sourceFiles
        .filter((sf) => sf.importance === 'critical')
        .map((sf) => `- \`${sf.fileName}\`: 重点优化（critical 级别，${sf.linesOfCode} LOC）`)
        .join('\n') +
      `\n\n## 架构级优化目标\n` +
      `- 降低 ${chain.components.length > 2 ? '最高耦合组件的边数' : '组件间的直接依赖'}\n` +
      `- 提升关键路径的吞吐量和可靠性\n`,
    metadata: { ...baseMetadata(chain, 'architecture'), improvement_area: 'optimization' },
  });

  return docs;
}

function generateFeatureConsultingDocs(chain: K8sAnalysisChain): RAGDocument[] {
  const docs: RAGDocument[] = [];
  const typeLabel = chain.chainType === 'troubleshooting' ? '故障排查' : '集群初始化';

  // 1. Per-file API reference
  for (const sf of chain.sourceFiles) {
    const apiEntries = sf.keyFunctions
      .map((fn) => {
        return (
          `### ${fn.name}\n` +
          `| 属性 | 值 |\n|------|----|\n` +
          `| **签名** | \`${fn.signature}\` |\n` +
          `| **说明** | ${fn.description} |\n` +
          `| **调用者** | ${fn.calledBy.length ? fn.calledBy.join(', ') : '—'} |\n` +
          `| **被调用** | ${fn.calls.length ? fn.calls.join(', ') : '—'} |\n`
        );
      })
      .join('\n');

    docs.push({
      id: `consult-api-${chain.id}-${sf.id}`,
      docType: 'feature_consulting',
      title: `API 参考: ${sf.fileName}`,
      content:
        `# API 参考: ${sf.fileName}\n\n` +
        `## 文件信息\n` +
        `| 属性 | 值 |\n|------|----|\n` +
        `| **路径** | \`${sf.filePath}\` |\n` +
        `| **包名** | ${sf.package} |\n` +
        `| **组件** | ${sf.component} |\n` +
        `| **重要程度** | ${sf.importance} |\n` +
        `| **代码行数** | ${sf.linesOfCode} |\n\n` +
        `## 函数 API\n${apiEntries}\n`,
      metadata: {
        ...baseMetadata(chain, 'feature_consulting'),
        consulting_type: 'api_ref',
        target_file: sf.filePath,
      },
    });
  }

  // 2. Configuration parameter guide
  const configRelated = chain.sourceFiles.flatMap((sf) =>
    sf.keyFunctions
      .filter((fn) => {
        const text = `${fn.name} ${fn.description} ${fn.codeSnippet}`.toLowerCase();
        return /config|param|setting|option|flag|env|timeout|interval|threshold/i.test(text);
      })
      .map((fn) => ({ fn, file: sf })),
  );

  docs.push({
    id: `consult-config-${chain.id}`,
    docType: 'feature_consulting',
    title: `${chain.name} - 配置参数详解`,
    content:
      `# ${chain.name} - 配置参数详解\n\n` +
      `## 场景: ${typeLabel}\n\n` +
      (configRelated.length > 0
        ? `## 配置相关函数\n` +
          configRelated
            .map((cr) => `### ${cr.fn.name} (\`${cr.file.fileName}\`)\n${cr.fn.description}\n\n签名: \`${cr.fn.signature}\`\n`)
            .join('\n')
        : `## 配置相关函数\n本链路中未识别到明确的配置管理函数。以下按组件列出可能涉及配置的文件：\n\n` +
          chain.sourceFiles.map((sf) => `- \`${sf.fileName}\` (${sf.component}): ${sf.description}`).join('\n')) +
      `\n\n## 运行时配置建议\n` +
      `- 确认 Kubernetes 版本 ${chain.version} 的默认配置适用性\n` +
      `- 检查各组件的启动参数和环境变量\n` +
      `- 验证跨组件调用的超时和重试配置\n`,
    metadata: { ...baseMetadata(chain, 'feature_consulting'), consulting_type: 'config' },
  });

  // 3. Best practices guide
  const crossEdges = getCrossComponentEdges(chain);
  docs.push({
    id: `consult-bestpractice-${chain.id}`,
    docType: 'feature_consulting',
    title: `${chain.name} - 最佳实践指南`,
    content:
      `# ${chain.name} - 最佳实践指南\n\n` +
      `## 场景: ${typeLabel}\n\n` +
      `## 组件交互最佳实践\n` +
      crossEdges
        .map((e) => `- **${e.srcFile.component} → ${e.tgtFile.component}** (${e.callType}): 确保 ${e.label} 的调用契约稳定`)
        .join('\n') +
      `\n\n## 调用类型使用建议\n` +
      Object.entries(chain.callTypeDistribution)
        .filter(([, v]) => v > 0)
        .map(([k, v]) => {
          const advice: Record<string, string> = {
            direct: '适合同进程内调用，注意避免循环依赖',
            grpc: '适合跨进程强类型调用，维护好 proto 文件版本',
            http: '适合松耦合调用，注意幂等性设计',
            event: '适合异步解耦，注意事件幂等处理',
            watch: '适合状态同步，注意重连和全量 List 退化',
          };
          return `- **${k}** (${v} 条): ${advice[k] ?? '注意调用可靠性'}`;
        })
        .join('\n') +
      `\n\n## 代码质量建议\n` +
      `- 为 critical 级别文件维护充分的单元测试\n` +
      `- 跨组件接口变更需要联合评审\n` +
      `- 保持流程步骤的可观测性（日志/指标/追踪）\n`,
    metadata: { ...baseMetadata(chain, 'feature_consulting'), consulting_type: 'best_practice' },
  });

  return docs;
}

function generateProductLearningDocs(chain: K8sAnalysisChain): RAGDocument[] {
  const docs: RAGDocument[] = [];
  const typeLabel = chain.chainType === 'troubleshooting' ? '故障排查' : '集群初始化';
  const topoLabel = chain.topology === 'event-driven' ? '事件驱动图' : '顺序流水线';
  const crossEdges = getCrossComponentEdges(chain);

  // 1. Feature introduction
  docs.push({
    id: `learn-intro-${chain.id}`,
    docType: 'product_learning',
    title: `${chain.name} - 功能介绍`,
    content:
      `# ${chain.name} - 功能介绍\n\n` +
      `## 这是什么？\n${chain.description}\n\n` +
      `## 基本概念\n` +
      `- **场景类型**: ${typeLabel} — ${chain.chainType === 'troubleshooting' ? '用于诊断和解决 Kubernetes 集群中的问题' : '用于理解 Kubernetes 集群的初始化过程'}\n` +
      `- **拓扑结构**: ${topoLabel} — ${chain.topology === 'event-driven' ? '组件通过事件和监听机制异步协作' : '阶段按顺序依次执行'}\n` +
      `- **Kubernetes 版本**: ${chain.version}\n\n` +
      `## 涉及的核心组件\n` +
      chain.components.map((c) => {
        const files = getFilesForComponent(chain, c);
        return `### ${c}\n${files.map((sf) => `- ${sf.fileName}: ${sf.description}`).join('\n')}`;
      }).join('\n\n') +
      `\n\n## 为什么要了解这个链路？\n` +
      (chain.chainType === 'troubleshooting'
        ? '理解这个调用链可以帮助你快速定位和解决相关的 Kubernetes 集群问题，减少故障排查时间。'
        : '理解这个调用链可以帮助你深入了解 Kubernetes 集群的启动过程，在需要自定义初始化流程时做出正确决策。') +
      '\n',
    metadata: { ...baseMetadata(chain, 'product_learning'), learning_level: 'beginner', content_type: 'intro' },
  });

  // 2. Step-by-step tutorial
  const tutorialSteps = chain.flowSteps.map((step, idx) => {
    const relatedComps = chain.components.filter((comp) => {
      const files = getFilesForComponent(chain, comp);
      return files.some((sf) => sf.keyFunctions.some((fn) => step.toLowerCase().includes(fn.name.toLowerCase())));
    });
    return (
      `### 第 ${idx + 1} 步: ${step}\n` +
      `**相关组件**: ${relatedComps.length ? relatedComps.join(', ') : chain.components[Math.min(idx, chain.components.length - 1)]}\n\n` +
      `**理解要点**: 在这个步骤中，系统${chain.topology === 'event-driven' ? '通过事件触发相应的处理逻辑' : '执行当前阶段的任务后进入下一阶段'}。\n\n` +
      `**动手实践**: 尝试查看相关组件的日志，观察这个步骤的执行过程。\n`
    );
  });

  docs.push({
    id: `learn-tutorial-${chain.id}`,
    docType: 'product_learning',
    title: `${chain.name} - 分步教程`,
    content:
      `# ${chain.name} - 分步教程\n\n` +
      `## 前置知识\n` +
      `- 基本的 Kubernetes 概念（Pod、Node、Controller）\n` +
      `- kubectl 基本操作\n\n` +
      `## 学习目标\n` +
      `通过本教程，你将理解 ${chain.name} 的完整执行流程（${chain.flowSteps.length} 个步骤）。\n\n` +
      `## 教程步骤\n${tutorialSteps.join('\n')}\n` +
      `## 小结\n` +
      `恭喜！你已经了解了 ${chain.name} 的完整流程。` +
      `这个${typeLabel}链路涉及 ${chain.components.length} 个组件，` +
      `通过 ${chain.edges.length} 条调用边协作完成任务。\n`,
    metadata: { ...baseMetadata(chain, 'product_learning'), learning_level: 'beginner', content_type: 'tutorial' },
  });

  // 3. FAQ compilation
  const faqEntries: string[] = [];
  // Component FAQs
  for (const comp of chain.components) {
    const files = getFilesForComponent(chain, comp);
    faqEntries.push(
      `### Q: ${comp} 在这个链路中做什么？\n` +
      `**A**: ${comp} 负责以下功能：\n` +
      files.map((sf) => `- ${sf.description}`).join('\n'),
    );
  }
  // Cross-component FAQs
  for (const e of crossEdges.slice(0, 5)) {
    faqEntries.push(
      `### Q: ${e.srcFile.component} 如何与 ${e.tgtFile.component} 通信？\n` +
      `**A**: 通过 ${e.callType} 调用方式：${e.label}。涉及函数: ${e.functions.join(', ')}。`,
    );
  }
  // Critical function FAQs
  for (const sf of chain.sourceFiles.filter((f) => f.importance === 'critical')) {
    for (const fn of sf.keyFunctions.slice(0, 2)) {
      faqEntries.push(
        `### Q: ${fn.name} 什么时候被调用？\n` +
        `**A**: ${fn.name} 位于 ${sf.component} 组件的 \`${sf.fileName}\` 中。${fn.calledBy.length ? `由 ${fn.calledBy.join(', ')} 触发调用。` : '作为入口函数直接触发。'}${fn.description}`,
      );
    }
  }

  docs.push({
    id: `learn-faq-${chain.id}`,
    docType: 'product_learning',
    title: `${chain.name} - 常见问题解答`,
    content:
      `# ${chain.name} - 常见问题解答 (FAQ)\n\n` +
      faqEntries.join('\n\n') + '\n',
    metadata: { ...baseMetadata(chain, 'product_learning'), learning_level: 'beginner', content_type: 'faq' },
  });

  // 4. Concept glossary
  const terms = new Map<string, string>();
  // Components
  for (const comp of chain.components) terms.set(comp, `Kubernetes 组件，在本链路中参与${typeLabel}流程`);
  // Call types
  const callTypeDesc: Record<string, string> = {
    direct: '函数直接调用，发生在同一进程内',
    grpc: 'Google Remote Procedure Call，跨进程的强类型远程调用协议',
    http: 'HTTP 协议调用，通常用于 REST API 交互',
    event: 'Kubernetes Event 机制，用于组件间异步事件通知',
    watch: 'Kubernetes Watch 机制，用于监听资源变化',
  };
  for (const [k, v] of Object.entries(chain.callTypeDistribution)) {
    if (v > 0) terms.set(k, callTypeDesc[k] ?? '调用类型');
  }
  // Key terms from topology
  terms.set(chain.topology, chain.topology === 'event-driven' ? '事件驱动架构，组件通过事件触发和响应进行协作' : '顺序流水线架构，各阶段按序执行');

  docs.push({
    id: `learn-glossary-${chain.id}`,
    docType: 'product_learning',
    title: `${chain.name} - 术语表`,
    content:
      `# ${chain.name} - 术语表\n\n` +
      Array.from(terms.entries())
        .map(([term, desc]) => `### ${term}\n${desc}\n`)
        .join('\n'),
    metadata: { ...baseMetadata(chain, 'product_learning'), learning_level: 'beginner', content_type: 'glossary' },
  });

  // 5. Learning path
  const { entries, leaves } = getEntryAndLeafFiles(chain);
  docs.push({
    id: `learn-path-${chain.id}`,
    docType: 'product_learning',
    title: `${chain.name} - 学习路径`,
    content:
      `# ${chain.name} - 学习路径\n\n` +
      `## 建议学习顺序\n\n` +
      `### 阶段 1: 基础概念\n` +
      `- 阅读「功能介绍」了解链路全貌\n` +
      `- 学习涉及的 ${chain.components.length} 个组件: ${chain.components.join(', ')}\n\n` +
      `### 阶段 2: 入口与流程\n` +
      (chain.topology === 'event-driven'
        ? `- 从入口文件开始理解事件触发机制：\n` +
          (entries.length ? entries.map((sf) => `  - \`${sf.fileName}\` (${sf.component})`).join('\n') : '  - 从第一个流程步骤开始') +
          `\n- 跟踪事件在组件间的传递路径\n`
        : `- 按流水线阶段顺序学习：\n` +
          chain.flowSteps.slice(0, 3).map((s, i) => `  ${i + 1}. ${s}`).join('\n') +
          `\n- 理解各阶段的输入输出\n`) +
      `\n### 阶段 3: 深入细节\n` +
      `- 研究关键函数的实现细节\n` +
      `- 理解跨组件调用的通信机制\n` +
      `- 分析${leaves.length ? '终端文件: ' + leaves.map((sf) => `\`${sf.fileName}\``).join(', ') : '完整调用链的输出'}\n\n` +
      `### 阶段 4: 实践应用\n` +
      `- 完成「分步教程」中的动手练习\n` +
      `- 在测试环境中复现和观察链路行为\n` +
      `- 尝试修改配置观察链路变化\n`,
    metadata: { ...baseMetadata(chain, 'product_learning'), learning_level: 'intermediate', content_type: 'learning_path' },
  });

  return docs;
}

// ---------------------------------------------------------------------------
// Main Entry Point
// ---------------------------------------------------------------------------

/**
 * Generate a complete RAG corpus from a K8s call chain.
 */
export function generateRAGCorpus(chain: K8sAnalysisChain): RAGCorpusResult {
  // Code analysis
  const overview = [generateOverview(chain)];
  const sourceFiles = generateSourceFileDocs(chain);
  const functions = generateFunctionDocs(chain);
  const flow = generateFlowDocs(chain);
  const crossRef = generateCrossReferenceDocs(chain);
  const qaPairs = generateQAPairDocs(chain);

  // Ops scenarios
  const dailyOps = generateDailyOpsDocs(chain);
  const deepTroubleshoot = generateDeepTroubleshootDocs(chain);
  const incidentResponse = generateIncidentResponseDocs(chain);
  const testing = generateTestingDocs(chain);
  const architecture = generateArchitectureDocs(chain);
  const featureConsulting = generateFeatureConsultingDocs(chain);
  const productLearning = generateProductLearningDocs(chain);

  const documents = [
    ...overview, ...sourceFiles, ...functions, ...flow, ...crossRef, ...qaPairs,
    ...dailyOps, ...deepTroubleshoot, ...incidentResponse, ...testing,
    ...architecture, ...featureConsulting, ...productLearning,
  ];

  return {
    documents,
    stats: {
      overview: overview.length,
      sourceFile: sourceFiles.length,
      function: functions.length,
      flow: flow.length,
      crossReference: crossRef.length,
      qaPair: qaPairs.length,
      dailyOps: dailyOps.length,
      deepTroubleshoot: deepTroubleshoot.length,
      incidentResponse: incidentResponse.length,
      testing: testing.length,
      architecture: architecture.length,
      featureConsulting: featureConsulting.length,
      productLearning: productLearning.length,
      total: documents.length,
    },
  };
}
