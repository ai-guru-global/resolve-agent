/**
 * kudig 结构化标准方案语料导入脚本
 *
 * 从 GitHub 仓库 kudig-io/kudig-database 的 topic-structural-trouble-shooting 目录
 * 拉取 Kubernetes 排查语料，解析 Markdown 文档并通过 bulkCreateSolutions API 批量导入。
 *
 * 用法:
 *   npx tsx scripts/import-kudig-solutions.ts --api-url http://localhost:8080
 *   npx tsx scripts/import-kudig-solutions.ts --dry-run
 *   npx tsx scripts/import-kudig-solutions.ts --api-url http://localhost:8080 --github-token ghp_xxx
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface GitHubContent {
  name: string;
  path: string;
  type: 'file' | 'dir';
  download_url: string | null;
}

interface ParsedSolution {
  title: string;
  problem_symptoms: string;
  key_information: string;
  troubleshooting_steps: string;
  resolution_steps: string;
  domain: string;
  component: string;
  severity: string;
  tags: string[];
  search_keywords: string;
  source_uri: string;
  metadata: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const GITHUB_REPO = 'kudig-io/kudig-database';
const GITHUB_BRANCH = 'main';
const CORPUS_DIR = 'topic-structural-trouble-shooting';
const GITHUB_API = `https://api.github.com/repos/${GITHUB_REPO}/contents/${CORPUS_DIR}`;
const GITHUB_RAW = `https://raw.githubusercontent.com/${GITHUB_REPO}/${GITHUB_BRANCH}/${CORPUS_DIR}`;

const HIGH_SEVERITY_DIRS = ['01-control-plane'];

// Section heading patterns for four-element extraction
const SYMPTOM_PATTERNS = [
  /^#+\s*.*(问题现象|故障现象|症状|问题表现|影响分析|现象|Quick.*Diagnosis|快速诊断)/i,
];
const KEY_INFO_PATTERNS = [
  /^#+\s*.*(关键信息|诊断信息|日志|关键数据|核心.*信息|信息采集)/i,
];
const TROUBLESHOOT_PATTERNS = [
  /^#+\s*.*(排查步骤|诊断步骤|排查流程|排查方法|故障排查|Troubleshoot|排查.*方法)/i,
];
const RESOLUTION_PATTERNS = [
  /^#+\s*.*(解决方案|修复步骤|解决步骤|修复方法|处置|解决.*措施|风险控制)/i,
];

// ---------------------------------------------------------------------------
// CLI argument parsing
// ---------------------------------------------------------------------------

function parseArgs(): {
  apiUrl: string;
  githubToken: string;
  dryRun: boolean;
  batchSize: number;
} {
  const args = process.argv.slice(2);
  let apiUrl = 'http://localhost:8080';
  let githubToken = '';
  let dryRun = false;
  let batchSize = 10;

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--api-url':
        apiUrl = args[++i];
        break;
      case '--github-token':
        githubToken = args[++i];
        break;
      case '--dry-run':
        dryRun = true;
        break;
      case '--batch-size':
        batchSize = parseInt(args[++i], 10);
        break;
      case '--help':
        console.log(`Usage: npx tsx scripts/import-kudig-solutions.ts [options]

Options:
  --api-url <url>       API base URL (default: http://localhost:8080)
  --github-token <tok>  GitHub personal access token (optional, for rate limits)
  --dry-run             Parse and display without importing
  --batch-size <n>      Solutions per bulk request (default: 10)
  --help                Show this help`);
        process.exit(0);
    }
  }

  return { apiUrl, githubToken, dryRun, batchSize };
}

// ---------------------------------------------------------------------------
// GitHub API helpers
// ---------------------------------------------------------------------------

function githubHeaders(token: string): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github.v3+json',
    'User-Agent': 'kudig-importer',
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

async function fetchJSON<T>(url: string, token: string): Promise<T> {
  const res = await fetch(url, { headers: githubHeaders(token) });
  if (!res.ok) {
    throw new Error(`GitHub API error: ${res.status} ${res.statusText} - ${url}`);
  }
  return res.json() as Promise<T>;
}

async function fetchText(url: string, token: string): Promise<string> {
  const headers: Record<string, string> = { 'User-Agent': 'kudig-importer' };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  const res = await fetch(url, { headers });
  if (!res.ok) {
    throw new Error(`Fetch error: ${res.status} ${res.statusText} - ${url}`);
  }
  return res.text();
}

// ---------------------------------------------------------------------------
// Discovery: enumerate all .md files in the corpus directory
// ---------------------------------------------------------------------------

async function discoverFiles(token: string): Promise<{ path: string; dirName: string; fileName: string; rawUrl: string }[]> {
  console.log(`[Discovery] Fetching directory listing from ${GITHUB_API} ...`);
  const topLevel = await fetchJSON<GitHubContent[]>(GITHUB_API, token);

  const dirs = topLevel.filter((item) => item.type === 'dir');
  console.log(`[Discovery] Found ${dirs.length} subdirectories`);

  const files: { path: string; dirName: string; fileName: string; rawUrl: string }[] = [];

  for (const dir of dirs) {
    const dirUrl = `https://api.github.com/repos/${GITHUB_REPO}/contents/${dir.path}`;
    const dirContents = await fetchJSON<GitHubContent[]>(dirUrl, token);

    const mdFiles = dirContents.filter(
      (item) => item.type === 'file' && item.name.endsWith('.md') && item.name !== 'README.md',
    );

    for (const file of mdFiles) {
      files.push({
        path: file.path,
        dirName: dir.name,
        fileName: file.name.replace(/\.md$/, ''),
        rawUrl: `${GITHUB_RAW}/${dir.name}/${file.name}`,
      });
    }

    console.log(`  [${dir.name}] ${mdFiles.length} markdown files`);
  }

  console.log(`[Discovery] Total: ${files.length} files to process\n`);
  return files;
}

// ---------------------------------------------------------------------------
// Markdown parsing
// ---------------------------------------------------------------------------

interface Section {
  heading: string;
  level: number;
  content: string;
}

function splitMarkdownSections(md: string): Section[] {
  const lines = md.split('\n');
  const sections: Section[] = [];
  let currentHeading = '';
  let currentLevel = 0;
  let currentContent: string[] = [];

  for (const line of lines) {
    const match = line.match(/^(#{1,4})\s+(.+)/);
    if (match) {
      if (currentHeading || currentContent.length > 0) {
        sections.push({
          heading: currentHeading,
          level: currentLevel,
          content: currentContent.join('\n').trim(),
        });
      }
      currentLevel = match[1].length;
      currentHeading = match[2].trim();
      currentContent = [];
    } else {
      currentContent.push(line);
    }
  }

  // Last section
  if (currentHeading || currentContent.length > 0) {
    sections.push({
      heading: currentHeading,
      level: currentLevel,
      content: currentContent.join('\n').trim(),
    });
  }

  return sections;
}

function matchSection(sections: Section[], patterns: RegExp[]): string {
  for (const pattern of patterns) {
    const found = sections.find((s) => pattern.test(`${'#'.repeat(s.level)} ${s.heading}`));
    if (found) {
      // Also collect sub-sections under this heading
      const idx = sections.indexOf(found);
      let content = found.content;
      for (let i = idx + 1; i < sections.length; i++) {
        if (sections[i].level <= found.level) break;
        content += `\n\n${'#'.repeat(sections[i].level)} ${sections[i].heading}\n${sections[i].content}`;
      }
      return content.trim();
    }
  }
  return '';
}

function extractTitle(md: string): string {
  const match = md.match(/^#\s+(.+)/m);
  return match ? match[1].trim() : '';
}

function extractSearchKeywords(title: string, component: string, tags: string[]): string {
  const words = new Set<string>();
  // From title - extract English/Chinese terms
  title.split(/[\s/,，、]+/).forEach((w) => words.add(w.toLowerCase()));
  words.add(component);
  tags.forEach((t) => words.add(t));
  return Array.from(words).filter((w) => w.length > 1).join(' ');
}

function deriveComponent(fileName: string): string {
  // Convert filename patterns like "01-pod-troubleshooting" to "pod"
  return fileName
    .replace(/^\d+-/, '')                 // Remove leading number prefix
    .replace(/-troubleshooting$/, '')     // Remove -troubleshooting suffix
    .replace(/-guide$/, '')               // Remove -guide suffix
    .replace(/-故障排查指南$/, '')           // Remove Chinese suffix
    .replace(/-排查$/, '');               // Remove Chinese suffix
}

function deriveTags(dirName: string, component: string): string[] {
  const tags = ['k8s', component];

  // Add category-level tags
  const categoryMap: Record<string, string[]> = {
    '01-control-plane': ['control-plane'],
    '02-node-components': ['node'],
    '03-networking': ['networking'],
    '04-storage': ['storage'],
    '05-workloads': ['workloads'],
    '06-security-auth': ['security', 'auth'],
    '07-resources-scheduling': ['resources', 'scheduling'],
    '08-cluster-operations': ['operations'],
    '09-cloud-provider': ['cloud'],
    '10-ai-ml-workloads': ['ai', 'ml'],
    '11-gitops-devops': ['gitops', 'devops'],
    '12-monitoring-observability': ['monitoring', 'observability'],
  };

  const extra = categoryMap[dirName];
  if (extra) {
    tags.push(...extra);
  }

  return [...new Set(tags)];
}

function parseMarkdown(
  md: string,
  dirName: string,
  fileName: string,
  rawUrl: string,
): ParsedSolution {
  const title = extractTitle(md) || `${fileName} 故障排查指南`;
  const sections = splitMarkdownSections(md);

  const problemSymptoms = matchSection(sections, SYMPTOM_PATTERNS);
  const keyInformation = matchSection(sections, KEY_INFO_PATTERNS);
  const troubleshootingSteps = matchSection(sections, TROUBLESHOOT_PATTERNS);
  const resolutionSteps = matchSection(sections, RESOLUTION_PATTERNS);

  // Fallback: if specific sections not found, split content roughly
  const allContent = sections.map((s) => s.content).join('\n\n');
  const component = deriveComponent(fileName);
  const tags = deriveTags(dirName, component);
  const severity = HIGH_SEVERITY_DIRS.some((d) => dirName.startsWith(d)) ? 'high' : 'medium';

  return {
    title,
    problem_symptoms: problemSymptoms || allContent.slice(0, 2000),
    key_information: keyInformation || '',
    troubleshooting_steps: troubleshootingSteps || '',
    resolution_steps: resolutionSteps || '',
    domain: 'kubernetes',
    component,
    severity,
    tags,
    search_keywords: extractSearchKeywords(title, component, tags),
    source_uri: rawUrl,
    metadata: { source: 'kudig', category: dirName },
  };
}

// ---------------------------------------------------------------------------
// API import
// ---------------------------------------------------------------------------

async function bulkImport(
  apiUrl: string,
  solutions: ParsedSolution[],
  batchSize: number,
): Promise<number> {
  let totalCreated = 0;

  for (let i = 0; i < solutions.length; i += batchSize) {
    const batch = solutions.slice(i, i + batchSize);
    const payload = batch.map((sol) => ({
      ...sol,
      version: 1,
      status: 'active',
      rag_collection_id: 'kudig-solutions',
      rag_document_id: '',
      related_skill_names: [],
      related_workflow_ids: [],
      created_by: 'kudig-importer',
    }));

    console.log(`[Import] Sending batch ${Math.floor(i / batchSize) + 1} (${batch.length} solutions)...`);

    const res = await fetch(`${apiUrl}/api/v1/solutions/bulk`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ solutions: payload }),
    });

    if (!res.ok) {
      const body = await res.text();
      console.error(`[Import] Batch failed: ${res.status} ${res.statusText}\n${body}`);
      continue;
    }

    const result = (await res.json()) as { created: number };
    totalCreated += result.created;
    console.log(`  Created: ${result.created}`);
  }

  return totalCreated;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const { apiUrl, githubToken, dryRun, batchSize } = parseArgs();

  console.log('=== kudig 结构化标准方案语料导入工具 ===\n');
  console.log(`API URL:      ${apiUrl}`);
  console.log(`GitHub Token: ${githubToken ? '***' : '(none - unauthenticated)'}`);
  console.log(`Dry Run:      ${dryRun}`);
  console.log(`Batch Size:   ${batchSize}\n`);

  // Phase 1: Discovery
  const files = await discoverFiles(githubToken);

  if (files.length === 0) {
    console.log('No markdown files found. Exiting.');
    return;
  }

  // Phase 2 & 3: Download + Parse
  const solutions: ParsedSolution[] = [];

  for (const file of files) {
    try {
      console.log(`[Parse] ${file.dirName}/${file.fileName}.md`);
      const md = await fetchText(file.rawUrl, githubToken);
      const parsed = parseMarkdown(md, file.dirName, file.fileName, file.rawUrl);
      solutions.push(parsed);

      if (dryRun) {
        console.log(`  Title:      ${parsed.title}`);
        console.log(`  Component:  ${parsed.component}`);
        console.log(`  Severity:   ${parsed.severity}`);
        console.log(`  Tags:       ${parsed.tags.join(', ')}`);
        console.log(`  Symptoms:   ${parsed.problem_symptoms.slice(0, 80)}...`);
        console.log('');
      }
    } catch (err) {
      console.error(`[Error] Failed to process ${file.path}: ${err}`);
    }
  }

  console.log(`\n[Summary] Parsed ${solutions.length} solutions from ${files.length} files\n`);

  // Phase 4: Import
  if (dryRun) {
    console.log('[Dry Run] Skipping API import. Use without --dry-run to import.');
    // Print a summary table
    console.log('\n--- Solution Summary ---');
    console.log(
      `${'Title'.padEnd(45)} ${'Component'.padEnd(15)} ${'Severity'.padEnd(10)} Tags`,
    );
    console.log('-'.repeat(100));
    for (const sol of solutions) {
      console.log(
        `${sol.title.slice(0, 44).padEnd(45)} ${sol.component.padEnd(15)} ${sol.severity.padEnd(10)} ${sol.tags.join(', ')}`,
      );
    }
  } else {
    const created = await bulkImport(apiUrl, solutions, batchSize);
    console.log(`\n[Done] Successfully imported ${created} solutions.`);
  }
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
