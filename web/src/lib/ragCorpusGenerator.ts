/**
 * Frontend call-chain → RAG corpus generator.
 *
 * Mirrors the backend CallChainRAGGenerator logic so that corpus
 * documents can be previewed in the browser without a server round-trip.
 */

import type { K8sAnalysisChain } from '@/types/k8sCorpus';

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
    overview: number;
    sourceFile: number;
    function: number;
    flow: number;
    crossReference: number;
    qaPair: number;
    total: number;
  };
}

// ---------------------------------------------------------------------------
// Generator
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
  const docs: RAGDocument[] = [];
  const fileMap = new Map(chain.sourceFiles.map((sf) => [sf.id, sf]));

  // Cross-component edges
  for (const edge of chain.edges) {
    const src = fileMap.get(edge.sourceFileId);
    const tgt = fileMap.get(edge.targetFileId);
    if (!src || !tgt || src.component === tgt.component) continue;

    docs.push({
      id: `xref-${chain.id}-${edge.id}`,
      docType: 'cross_reference',
      title: `组件交互: ${src.component} → ${tgt.component}`,
      content:
        `# 组件交互: ${src.component} → ${tgt.component}\n\n` +
        `## 交互描述\n${edge.label}\n\n` +
        `## 调用类型\n${edge.callType}\n\n` +
        `## 源端\n- **组件**: ${src.component}\n- **文件**: ${src.fileName}\n\n` +
        `## 目标端\n- **组件**: ${tgt.component}\n- **文件**: ${tgt.fileName}\n\n` +
        `## 涉及函数\n${edge.functions.join(', ')}\n`,
      metadata: {
        ...baseMetadata(chain, 'cross_reference'),
        source_component: src.component,
        target_component: tgt.component,
        call_type: edge.callType,
      },
    });
  }

  return docs;
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

/**
 * Generate a complete RAG corpus from a K8s call chain.
 */
export function generateRAGCorpus(chain: K8sAnalysisChain): RAGCorpusResult {
  const overview = [generateOverview(chain)];
  const sourceFiles = generateSourceFileDocs(chain);
  const functions = generateFunctionDocs(chain);
  const flow = generateFlowDocs(chain);
  const crossRef = generateCrossReferenceDocs(chain);
  const qaPairs = generateQAPairDocs(chain);

  const documents = [...overview, ...sourceFiles, ...functions, ...flow, ...crossRef, ...qaPairs];

  return {
    documents,
    stats: {
      overview: overview.length,
      sourceFile: sourceFiles.length,
      function: functions.length,
      flow: flow.length,
      crossReference: crossRef.length,
      qaPair: qaPairs.length,
      total: documents.length,
    },
  };
}
