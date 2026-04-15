import { useState, useMemo, useCallback } from 'react';
import { X, ChevronRight, Layers, BookOpen, Wrench, AlertTriangle, RefreshCw, TrendingUp } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TooltipProvider } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type CorpusDimensionCategory = 'foundation' | 'operations' | 'diagnostics' | 'lifecycle';

interface CorpusDimension {
  id: string;
  label: string;
  category: CorpusDimensionCategory;
  description: string;
  sampleCount: number;
  qualityIndicators: string[];
  isExtended?: boolean;
}

interface VersionRadarScore {
  version: string;
  label: string;
  color: string;
  releaseDate: string;
  scores: Record<string, number>;
}

interface CategoryMeta {
  id: CorpusDimensionCategory;
  label: string;
  icon: typeof BookOpen;
  color: string;
  bgColor: string;
  borderColor: string;
}

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

const CATEGORIES: CategoryMeta[] = [
  { id: 'foundation', label: '基础知识', icon: BookOpen, color: 'text-blue-400', bgColor: 'bg-blue-500/10', borderColor: 'border-blue-500/30' },
  { id: 'operations', label: '运维实操', icon: Wrench, color: 'text-emerald-400', bgColor: 'bg-emerald-500/10', borderColor: 'border-emerald-500/30' },
  { id: 'diagnostics', label: '故障诊断', icon: AlertTriangle, color: 'text-purple-400', bgColor: 'bg-purple-500/10', borderColor: 'border-purple-500/30' },
  { id: 'lifecycle', label: '生命周期', icon: RefreshCw, color: 'text-amber-400', bgColor: 'bg-amber-500/10', borderColor: 'border-amber-500/30' },
];

const DIMENSIONS: CorpusDimension[] = [
  // Foundation
  { id: 'core_concepts', label: '核心概念', category: 'foundation', description: '产品核心概念、架构原理与设计理念的理解深度', sampleCount: 342, qualityIndicators: ['覆盖完整', '结构清晰'] },
  { id: 'glossary', label: '名词解释', category: 'foundation', description: '专业术语与领域名词的准确解释能力', sampleCount: 289, qualityIndicators: ['术语准确', '上下文充足'] },
  { id: 'feature_desc', label: '功能说明', category: 'foundation', description: '产品功能模块的描述与使用场景说明', sampleCount: 415, qualityIndicators: ['场景丰富', '描述精准'] },
  { id: 'api_docs', label: 'API接口说明', category: 'foundation', description: 'API 接口的参数、返回值与调用示例', sampleCount: 378, qualityIndicators: ['示例完整', '参数清晰'] },
  // Operations
  { id: 'ops_knowledge', label: '运维知识', category: 'operations', description: '日常运维操作的知识储备与经验积累', sampleCount: 521, qualityIndicators: ['实操性强', '场景真实'] },
  { id: 'config_writing', label: '配置编写', category: 'operations', description: '各类配置文件的编写规范与最佳模板', sampleCount: 298, qualityIndicators: ['模板规范', '兼容性好'] },
  { id: 'command_parse', label: '命令解析', category: 'operations', description: '运维命令的参数解析与执行效果说明', sampleCount: 356, qualityIndicators: ['参数完整', '示例丰富'] },
  { id: 'log_analysis', label: '日志分析', category: 'operations', description: '日志格式解读、异常模式识别与根因定位', sampleCount: 483, qualityIndicators: ['模式多样', '根因关联'] },
  { id: 'perf_tuning', label: '性能优化', category: 'operations', description: '系统性能瓶颈识别与调优方案', sampleCount: 187, qualityIndicators: ['方案可行'], isExtended: true },
  { id: 'monitor_design', label: '监控设计', category: 'operations', description: '监控指标设计、告警阈值与大盘搭建', sampleCount: 165, qualityIndicators: ['指标合理'], isExtended: true },
  { id: 'automation', label: '自动化脚本', category: 'operations', description: '运维自动化脚本编写与工具链集成', sampleCount: 142, qualityIndicators: ['可复用'], isExtended: true },
  // Diagnostics
  { id: 'error_analysis', label: '报错分析', category: 'diagnostics', description: '错误信息的分类、根因分析与修复建议', sampleCount: 467, qualityIndicators: ['根因精准', '修复可行'] },
  { id: 'alert_handling', label: '告警处理', category: 'diagnostics', description: '告警级别判断、响应流程与降噪策略', sampleCount: 392, qualityIndicators: ['分级合理', '响应及时'] },
  { id: 'troubleshoot', label: '排查方案', category: 'diagnostics', description: '故障排查的系统化方法与诊断路径', sampleCount: 534, qualityIndicators: ['路径清晰', '步骤完整'] },
  { id: 'security', label: '安全合规', category: 'diagnostics', description: '安全漏洞识别、合规检查与加固方案', sampleCount: 178, qualityIndicators: ['合规全面'], isExtended: true },
  { id: 'disaster_recovery', label: '灾备恢复', category: 'diagnostics', description: '灾备切换流程、数据恢复与容灾演练', sampleCount: 156, qualityIndicators: ['流程完整'], isExtended: true },
  // Lifecycle
  { id: 'version_timeliness', label: '版本时效', category: 'lifecycle', description: '版本发布时间线、EOL 策略与兼容性矩阵', sampleCount: 245, qualityIndicators: ['时效准确', '矩阵清晰'] },
  { id: 'version_upgrade', label: '版本升级', category: 'lifecycle', description: '版本升级路径、迁移指南与风险评估', sampleCount: 312, qualityIndicators: ['路径明确', '风险可控'] },
  { id: 'change_plan', label: '变更方案', category: 'lifecycle', description: '变更计划制定、影响评估与回滚策略', sampleCount: 387, qualityIndicators: ['评估充分', '回滚就绪'] },
  { id: 'best_practices', label: '最佳实践', category: 'lifecycle', description: '行业最佳实践总结与标准化推荐方案', sampleCount: 423, qualityIndicators: ['行业对标', '可落地'] },
  { id: 'capacity_plan', label: '容量规划', category: 'lifecycle', description: '资源容量评估、扩缩容策略与成本优化', sampleCount: 134, qualityIndicators: ['量化合理'], isExtended: true },
];

const VERSION_SCORES: VersionRadarScore[] = [
  {
    version: 'v0.1',
    label: 'MegaAgent v0.1',
    color: 'hsl(220, 15%, 55%)',
    releaseDate: '2025-06',
    scores: {
      core_concepts: 45, glossary: 40, feature_desc: 42, api_docs: 35,
      ops_knowledge: 48, config_writing: 38, command_parse: 44, log_analysis: 50,
      perf_tuning: 32, monitor_design: 30, automation: 28,
      error_analysis: 52, alert_handling: 46, troubleshoot: 48,
      security: 35, disaster_recovery: 30,
      version_timeliness: 38, version_upgrade: 36, change_plan: 42, best_practices: 40,
      capacity_plan: 28,
    },
  },
  {
    version: 'v0.5',
    label: 'MegaAgent v0.5',
    color: 'hsl(38, 80%, 55%)',
    releaseDate: '2025-09',
    scores: {
      core_concepts: 62, glossary: 58, feature_desc: 65, api_docs: 55,
      ops_knowledge: 70, config_writing: 60, command_parse: 68, log_analysis: 72,
      perf_tuning: 55, monitor_design: 52, automation: 48,
      error_analysis: 75, alert_handling: 70, troubleshoot: 73,
      security: 52, disaster_recovery: 48,
      version_timeliness: 56, version_upgrade: 54, change_plan: 62, best_practices: 60,
      capacity_plan: 45,
    },
  },
  {
    version: 'v1.0',
    label: 'MegaAgent v1.0',
    color: 'hsl(142, 71%, 45%)',
    releaseDate: '2026-01',
    scores: {
      core_concepts: 78, glossary: 75, feature_desc: 80, api_docs: 72,
      ops_knowledge: 85, config_writing: 79, command_parse: 84, log_analysis: 88,
      perf_tuning: 74, monitor_design: 70, automation: 68,
      error_analysis: 90, alert_handling: 86, troubleshoot: 91,
      security: 72, disaster_recovery: 66,
      version_timeliness: 73, version_upgrade: 71, change_plan: 80, best_practices: 78,
      capacity_plan: 62,
    },
  },
  {
    version: 'v1.5',
    label: 'MegaAgent v1.5',
    color: 'hsl(220, 70%, 55%)',
    releaseDate: '2026-04',
    scores: {
      core_concepts: 91, glossary: 88, feature_desc: 92, api_docs: 86,
      ops_knowledge: 94, config_writing: 90, command_parse: 93, log_analysis: 95,
      perf_tuning: 87, monitor_design: 84, automation: 82,
      error_analysis: 96, alert_handling: 93, troubleshoot: 97,
      security: 85, disaster_recovery: 80,
      version_timeliness: 86, version_upgrade: 84, change_plan: 90, best_practices: 91,
      capacity_plan: 78,
    },
  },
];

// Pre-resolved references to avoid repeated undefined checks
function getLatestVersion(): VersionRadarScore {
  return VERSION_SCORES[VERSION_SCORES.length - 1] ?? VERSION_SCORES[0]!;
}
function getEarliestVersion(): VersionRadarScore {
  return VERSION_SCORES[0] ?? VERSION_SCORES[VERSION_SCORES.length - 1]!;
}
function getVersionAt(idx: number): VersionRadarScore {
  return VERSION_SCORES[idx] ?? VERSION_SCORES[0]!;
}

// ---------------------------------------------------------------------------
// Geometry helpers
// ---------------------------------------------------------------------------

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function buildPolygonPoints(cx: number, cy: number, r: number, n: number): string {
  return Array.from({ length: n }, (_, i) => {
    const { x, y } = polarToCartesian(cx, cy, r, (360 / n) * i);
    return `${x},${y}`;
  }).join(' ');
}

function getLabelAnchor(angleDeg: number): 'start' | 'middle' | 'end' {
  const a = ((angleDeg % 360) + 360) % 360;
  if (a > 355 || a < 5) return 'middle';
  if (a >= 5 && a <= 175) return 'start';
  if (a >= 185 && a <= 355) return 'end';
  return 'middle';
}

function getLabelBaseline(angleDeg: number): 'auto' | 'middle' | 'hanging' {
  const a = ((angleDeg % 360) + 360) % 360;
  if (a > 340 || a < 20) return 'auto';
  if (a >= 160 && a <= 200) return 'hanging';
  return 'middle';
}

// ---------------------------------------------------------------------------
// RadarChart SVG Component
// ---------------------------------------------------------------------------

const CX = 300;
const CY = 300;
const MAX_R = 200;
const LABEL_R = MAX_R + 35;
const RINGS = [20, 40, 60, 80, 100];

interface RadarChartProps {
  dimensions: CorpusDimension[];
  versions: VersionRadarScore[];
  activeVersions: Set<string>;
  hoveredDimension: string | null;
  selectedDimension: string | null;
  onDimensionHover: (id: string | null) => void;
  onDimensionClick: (id: string) => void;
}

function RadarChart({
  dimensions,
  versions,
  activeVersions,
  hoveredDimension,
  selectedDimension,
  onDimensionHover,
  onDimensionClick,
}: RadarChartProps) {
  const n = dimensions.length;
  const angleStep = 360 / n;

  const dataPolygons = useMemo(() => {
    return versions
      .filter((v) => activeVersions.has(v.version))
      .map((v) => {
        const points = dimensions
          .map((dim, i) => {
            const score = (v.scores[dim.id] ?? 0) / 100;
            const { x, y } = polarToCartesian(CX, CY, MAX_R * score, angleStep * i);
            return `${x},${y}`;
          })
          .join(' ');
        return { ...v, points };
      });
  }, [dimensions, versions, activeVersions, angleStep]);

  const categoryForDim = useCallback(
    (id: string) => CATEGORIES.find((c) => c.id === dimensions.find((d) => d.id === id)?.category),
    [dimensions],
  );

  return (
    <svg viewBox="0 0 600 600" className="w-full max-w-[520px] mx-auto select-none" role="img" aria-label="MegaAgent 版本性能雷达图">
      {/* Concentric rings */}
      {RINGS.map((pct) => (
        <polygon
          key={pct}
          points={buildPolygonPoints(CX, CY, MAX_R * (pct / 100), n)}
          fill="none"
          stroke="hsl(var(--border))"
          strokeWidth={pct === 100 ? 1 : 0.5}
          strokeOpacity={pct === 100 ? 0.4 : 0.2}
        />
      ))}

      {/* Ring scale labels */}
      {RINGS.map((pct) => {
        const { x, y } = polarToCartesian(CX, CY, MAX_R * (pct / 100), 0);
        return (
          <text
            key={`label-${pct}`}
            x={x + 4}
            y={y - 4}
            className="fill-muted-foreground/40 text-[9px] font-mono"
            textAnchor="start"
          >
            {pct}
          </text>
        );
      })}

      {/* Axis lines */}
      {dimensions.map((dim, i) => {
        const angle = angleStep * i;
        const { x, y } = polarToCartesian(CX, CY, MAX_R, angle);
        const isHovered = hoveredDimension === dim.id;
        const isSelected = selectedDimension === dim.id;
        return (
          <line
            key={`axis-${dim.id}`}
            x1={CX}
            y1={CY}
            x2={x}
            y2={y}
            stroke="hsl(var(--border))"
            strokeWidth={isHovered || isSelected ? 1.5 : 0.5}
            strokeOpacity={isHovered || isSelected ? 0.6 : 0.2}
            className="transition-all duration-200"
          />
        );
      })}

      {/* Data polygons — older versions first (bottom), newest on top */}
      {dataPolygons.map((dp) => (
        <polygon
          key={`poly-${dp.version}`}
          points={dp.points}
          fill={dp.color}
          fillOpacity={0.1}
          stroke={dp.color}
          strokeWidth={dp.version === getLatestVersion().version ? 2.5 : 1.5}
          strokeLinejoin="round"
          className="transition-all duration-300"
        />
      ))}

      {/* Data points */}
      {dataPolygons.map((dp) =>
        dimensions.map((dim, i) => {
          const score = (dp.scores[dim.id] ?? 0) / 100;
          const { x, y } = polarToCartesian(CX, CY, MAX_R * score, angleStep * i);
          return (
            <circle
              key={`pt-${dp.version}-${dim.id}`}
              cx={x}
              cy={y}
              r={hoveredDimension === dim.id ? 4.5 : 3}
              fill={dp.color}
              stroke="hsl(var(--background))"
              strokeWidth={1.5}
              className="transition-all duration-200"
            />
          );
        }),
      )}

      {/* Axis labels + hit areas */}
      {dimensions.map((dim, i) => {
        const angle = angleStep * i;
        const { x, y } = polarToCartesian(CX, CY, LABEL_R, angle);
        const isHovered = hoveredDimension === dim.id;
        const isSelected = selectedDimension === dim.id;
        const cat = categoryForDim(dim.id);

        return (
          <g key={`lbl-${dim.id}`}>
            {/* Invisible hit area */}
            <circle
              cx={x}
              cy={y}
              r={20}
              fill="transparent"
              className="cursor-pointer"
              onMouseEnter={() => onDimensionHover(dim.id)}
              onMouseLeave={() => onDimensionHover(null)}
              onClick={() => onDimensionClick(dim.id)}
            />
            {/* Category dot */}
            <circle
              cx={
                getLabelAnchor(angle) === 'start'
                  ? x - 6
                  : getLabelAnchor(angle) === 'end'
                    ? x + 6
                    : x
              }
              cy={y - (getLabelBaseline(angle) === 'auto' ? 8 : getLabelBaseline(angle) === 'hanging' ? -8 : 0)}
              r={2.5}
              fill={cat ? `var(--tw-${cat.id}-dot, currentColor)` : 'currentColor'}
              className={cn(cat?.color ?? 'text-muted-foreground', 'transition-opacity duration-200')}
              opacity={isHovered || isSelected ? 1 : 0.6}
            />
            {/* Label text */}
            <text
              x={x}
              y={y}
              textAnchor={getLabelAnchor(angle)}
              dominantBaseline={getLabelBaseline(angle)}
              className={cn(
                'text-[11px] font-medium transition-all duration-200 cursor-pointer',
                isHovered || isSelected ? 'fill-foreground' : 'fill-muted-foreground',
              )}
              onMouseEnter={() => onDimensionHover(dim.id)}
              onMouseLeave={() => onDimensionHover(null)}
              onClick={() => onDimensionClick(dim.id)}
            >
              {dim.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// ---------------------------------------------------------------------------
// DimensionDetailPanel
// ---------------------------------------------------------------------------

interface DetailPanelProps {
  dimension: CorpusDimension;
  versions: VersionRadarScore[];
  onClose: () => void;
}

function DimensionDetailPanel({ dimension, versions, onClose }: DetailPanelProps) {
  const cat = CATEGORIES.find((c) => c.id === dimension.category);
  const latest = versions.length > 0 ? versions[versions.length - 1]! : getLatestVersion();
  const earliest = versions.length > 0 ? versions[0]! : getEarliestVersion();
  const latestScore = latest.scores[dimension.id] ?? 0;
  const earliestScore = earliest.scores[dimension.id] ?? 0;
  const improvement = latestScore - earliestScore;

  return (
    <div className="border-l border-border/30 pl-5 space-y-4 animate-slide-up" style={{ animationDuration: '0.3s' }}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h4 className="text-sm font-semibold">{dimension.label}</h4>
          {cat && (
            <span className={cn('text-[10px] px-1.5 py-0.5 rounded-md font-medium', cat.bgColor, cat.color)}>
              {cat.label}
            </span>
          )}
        </div>
        <button
          onClick={onClose}
          className="rounded-md p-1 hover:bg-muted/50 transition-colors text-muted-foreground hover:text-foreground"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <p className="text-[12px] text-muted-foreground leading-relaxed">{dimension.description}</p>

      {/* Version score comparison */}
      <div>
        <p className="text-[11px] text-muted-foreground/50 uppercase tracking-wider font-semibold mb-2">版本得分对比</p>
        <div className="space-y-2.5">
          {versions.map((v) => {
            const score = v.scores[dimension.id] ?? 0;
            return (
              <div key={v.version}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5">
                    <span className="inline-block h-1.5 w-1.5 rounded-full shrink-0" style={{ backgroundColor: v.color }} />
                    <span className="text-[11px] font-medium">{v.label}</span>
                  </div>
                  <span className="text-[11px] font-mono font-bold tabular-nums">{score}</span>
                </div>
                <div className="h-1.5 rounded-full bg-muted/30 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${score}%`, backgroundColor: v.color }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Improvement stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-md bg-muted/20 border border-border/20 px-3 py-2 text-center">
          <p className="text-lg font-display font-bold tabular-nums text-primary">{latestScore}</p>
          <p className="text-[10px] text-muted-foreground">最新得分</p>
        </div>
        <div className="rounded-md bg-muted/20 border border-border/20 px-3 py-2 text-center">
          <div className="flex items-center justify-center gap-1">
            <TrendingUp className="h-3.5 w-3.5 text-status-healthy" />
            <p className="text-lg font-display font-bold tabular-nums text-status-healthy">+{improvement}</p>
          </div>
          <p className="text-[10px] text-muted-foreground">累计提升</p>
        </div>
      </div>

      {/* Sample count & quality */}
      <div className="rounded-md bg-muted/20 border border-border/20 px-3 py-2">
        <div className="flex items-center justify-between">
          <p className="text-[10px] text-muted-foreground">语料数量</p>
          <p className="text-sm font-display font-bold tabular-nums">{dimension.sampleCount.toLocaleString()}</p>
        </div>
      </div>

      {/* Quality indicators */}
      {dimension.qualityIndicators.length > 0 && (
        <div>
          <p className="text-[11px] text-muted-foreground/50 uppercase tracking-wider font-semibold mb-2">质量标签</p>
          <div className="flex flex-wrap gap-1.5">
            {dimension.qualityIndicators.map((q) => (
              <Badge key={q} variant="outline" className="text-[10px] font-normal">
                {q}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Related metrics */}
      <div>
        <p className="text-[11px] text-muted-foreground/50 uppercase tracking-wider font-semibold mb-2">关联指标</p>
        <div className="space-y-1.5 text-[11px]">
          {dimension.category === 'diagnostics' && (
            <>
              <div className="flex justify-between"><span className="text-muted-foreground">路由准确率</span><span className="font-medium">94.2%</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">MTTR 改善</span><span className="font-medium">34.8%</span></div>
            </>
          )}
          {dimension.category === 'operations' && (
            <>
              <div className="flex justify-between"><span className="text-muted-foreground">执行成功率</span><span className="font-medium">93.4%</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">技能匹配率</span><span className="font-medium">96.1%</span></div>
            </>
          )}
          {dimension.category === 'foundation' && (
            <>
              <div className="flex justify-between"><span className="text-muted-foreground">RAG 检索准确率</span><span className="font-medium">91.3%</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">答案相关度</span><span className="font-medium">88.7%</span></div>
            </>
          )}
          {dimension.category === 'lifecycle' && (
            <>
              <div className="flex justify-between"><span className="text-muted-foreground">安全拦截率</span><span className="font-medium">100%</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">首次响应质量</span><span className="font-medium">87.6%</span></div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Legend
// ---------------------------------------------------------------------------

interface LegendProps {
  versions: VersionRadarScore[];
  activeVersions: Set<string>;
  onToggle: (version: string) => void;
}

function Legend({ versions, activeVersions, onToggle }: LegendProps) {
  return (
    <div className="flex items-center justify-center gap-4 pt-2">
      {versions.map((v) => {
        const active = activeVersions.has(v.version);
        return (
          <button
            key={v.version}
            onClick={() => onToggle(v.version)}
            className={cn(
              'flex items-center gap-1.5 text-[11px] font-medium transition-opacity duration-200',
              active ? 'opacity-100' : 'opacity-35',
            )}
          >
            <span className="inline-block h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: v.color }} />
            {v.label}
          </button>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Export
// ---------------------------------------------------------------------------

export default function CorpusRadarSection() {
  const [activeCategories, setActiveCategories] = useState<Set<CorpusDimensionCategory>>(
    () => new Set(CATEGORIES.map((c) => c.id)),
  );
  const [showExtended, setShowExtended] = useState(false);
  const [activeVersions, setActiveVersions] = useState<Set<string>>(
    () => new Set(VERSION_SCORES.map((v) => v.version)),
  );
  const [hoveredDimension, setHoveredDimension] = useState<string | null>(null);
  const [selectedDimension, setSelectedDimension] = useState<string | null>(null);

  const visibleDimensions = useMemo(
    () =>
      DIMENSIONS.filter(
        (d) => activeCategories.has(d.category) && (showExtended || !d.isExtended),
      ),
    [activeCategories, showExtended],
  );

  const toggleCategory = useCallback((id: CorpusDimensionCategory) => {
    setActiveCategories((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        if (next.size > 1) next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const toggleVersion = useCallback((version: string) => {
    setActiveVersions((prev) => {
      const next = new Set(prev);
      if (next.has(version)) {
        if (next.size > 1) next.delete(version);
      } else {
        next.add(version);
      }
      return next;
    });
  }, []);

  const selectedDim = selectedDimension ? DIMENSIONS.find((d) => d.id === selectedDimension) : null;

  // Summary: latest version stats
  const latest = getLatestVersion();
  const earliest = getEarliestVersion();
  const latestAvg = Math.round(
    visibleDimensions.reduce((s, d) => s + (latest.scores[d.id] ?? 0), 0) / visibleDimensions.length,
  );
  const earliestAvg = Math.round(
    visibleDimensions.reduce((s, d) => s + (earliest.scores[d.id] ?? 0), 0) / visibleDimensions.length,
  );
  const totalImprovement = latestAvg - earliestAvg;

  return (
    <div className="space-y-4">
      {/* Header + summary */}
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-base font-semibold">语料维度评估 — 版本演进</h3>
          <p className="text-sm text-muted-foreground mt-1">
            MegaAgent 各版本在 {visibleDimensions.length} 个考核维度上的性能表现与提升趋势
          </p>
        </div>
        <div className="flex items-center gap-3 text-right">
          <div>
            <p className="text-lg font-display font-bold tabular-nums text-primary">{latestAvg}</p>
            <p className="text-[10px] text-muted-foreground">{latest.label} 均分</p>
          </div>
          <div className="w-px h-8 bg-border/30" />
          <div>
            <div className="flex items-center justify-end gap-1">
              <TrendingUp className="h-3.5 w-3.5 text-status-healthy" />
              <p className="text-lg font-display font-bold tabular-nums text-status-healthy">+{totalImprovement}</p>
            </div>
            <p className="text-[10px] text-muted-foreground">累计提升</p>
          </div>
        </div>
      </div>

      {/* Category filter buttons */}
      <div className="flex flex-wrap items-center gap-2">
        {CATEGORIES.map((cat) => {
          const CatIcon = cat.icon;
          const active = activeCategories.has(cat.id);
          const dimCount = DIMENSIONS.filter(
            (d) => d.category === cat.id && (showExtended || !d.isExtended),
          ).length;
          return (
            <button
              key={cat.id}
              onClick={() => toggleCategory(cat.id)}
              className={cn(
                'flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-left transition-colors text-[11px] font-medium',
                active
                  ? cn(cat.borderColor, cat.bgColor, cat.color)
                  : 'border-border/30 text-muted-foreground hover:border-border/60',
              )}
            >
              <CatIcon className="h-3 w-3" />
              {cat.label}
              <span className={cn('text-[10px]', active ? 'opacity-70' : 'opacity-40')}>{dimCount}</span>
            </button>
          );
        })}
        <div className="w-px h-5 bg-border/30 mx-1" />
        <button
          onClick={() => setShowExtended((p) => !p)}
          className={cn(
            'flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[11px] font-medium transition-colors',
            showExtended
              ? 'border-primary/30 bg-primary/5 text-primary'
              : 'border-border/30 text-muted-foreground hover:border-border/60',
          )}
        >
          <Layers className="h-3 w-3" />
          扩展维度
        </button>
      </div>

      {/* Main chart area */}
      <Card className="border-border/30">
        <CardContent className="p-5">
          <div className={cn('flex gap-5', selectedDim ? 'flex-col lg:flex-row' : '')}>
            {/* Radar chart */}
            <div className={cn('flex-1 min-w-0', selectedDim ? 'lg:max-w-[60%]' : '')}>
              <TooltipProvider delayDuration={100}>
                {visibleDimensions.length >= 3 ? (
                  <div className="relative">
                    <RadarChartWithTooltips
                      dimensions={visibleDimensions}
                      versions={VERSION_SCORES}
                      activeVersions={activeVersions}
                      hoveredDimension={hoveredDimension}
                      selectedDimension={selectedDimension}
                      onDimensionHover={setHoveredDimension}
                      onDimensionClick={(id) =>
                        setSelectedDimension((prev) => (prev === id ? null : id))
                      }
                    />
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-64 text-sm text-muted-foreground">
                    至少需要选择 3 个维度才能显示雷达图
                  </div>
                )}
              </TooltipProvider>

              {/* Legend */}
              <Legend versions={VERSION_SCORES} activeVersions={activeVersions} onToggle={toggleVersion} />
            </div>

            {/* Detail panel */}
            {selectedDim && (
              <div className="lg:w-[280px] shrink-0">
                <DimensionDetailPanel
                  dimension={selectedDim}
                  versions={VERSION_SCORES}
                  onClose={() => setSelectedDimension(null)}
                />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Version improvement overview cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {VERSION_SCORES.map((v, idx) => {
          const vAvg = Math.round(
            visibleDimensions.reduce((s, d) => s + (v.scores[d.id] ?? 0), 0) / Math.max(visibleDimensions.length, 1),
          );
          const prevAvg = idx > 0
            ? Math.round(
                visibleDimensions.reduce((s, d) => s + (getVersionAt(idx - 1).scores[d.id] ?? 0), 0) / Math.max(visibleDimensions.length, 1),
              )
            : null;
          const delta = prevAvg !== null ? vAvg - prevAvg : null;
          const isLatest = idx === VERSION_SCORES.length - 1;

          return (
            <Card key={v.version} className={cn('border-border/30 transition-colors', isLatest && 'border-primary/30')}>
              <CardContent className="p-3.5">
                <div className="flex items-center gap-2 mb-2">
                  <span className="inline-block h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: v.color }} />
                  <p className="text-[11px] font-semibold">{v.label}</p>
                  {isLatest && (
                    <span className="text-[9px] px-1 py-0.5 rounded bg-primary/10 text-primary font-medium">Latest</span>
                  )}
                </div>
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-xl font-display font-bold tabular-nums">{vAvg}</p>
                    <p className="text-[10px] text-muted-foreground">平均得分</p>
                  </div>
                  <div className="text-right">
                    {delta !== null ? (
                      <>
                        <p className={cn('text-sm font-mono font-bold tabular-nums', delta > 0 ? 'text-status-healthy' : 'text-muted-foreground')}>
                          {delta > 0 ? `+${delta}` : delta}
                        </p>
                        <p className="text-[10px] text-muted-foreground">vs 上一版本</p>
                      </>
                    ) : (
                      <p className="text-[10px] text-muted-foreground">{v.releaseDate}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// RadarChart with floating tooltips (wrapper)
// ---------------------------------------------------------------------------

function RadarChartWithTooltips(props: RadarChartProps) {
  const { dimensions, versions, activeVersions } = props;

  return (
    <div className="relative">
      <RadarChart {...props} />
      {/* Floating tooltip layer for hovered dimension */}
      {props.hoveredDimension && (() => {
        const dim = dimensions.find((d) => d.id === props.hoveredDimension);
        if (!dim) return null;
        const idx = dimensions.indexOf(dim);
        const angle = (360 / dimensions.length) * idx;
        const { x, y } = polarToCartesian(50, 50, 43, angle);
        return (
          <div
            className="absolute pointer-events-none z-10"
            style={{
              left: `${x}%`,
              top: `${y}%`,
              transform: 'translate(-50%, -100%)',
            }}
          >
            <div className="bg-popover text-popover-foreground border border-border/50 rounded-lg shadow-lg px-3 py-2 text-[11px] space-y-1 whitespace-nowrap">
              <p className="font-semibold text-xs">{dim.label}</p>
              {versions
                .filter((v) => activeVersions.has(v.version))
                .map((v) => (
                  <div key={v.version} className="flex items-center gap-2">
                    <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ backgroundColor: v.color }} />
                    <span className="text-muted-foreground">{v.label}</span>
                    <span className="font-mono font-bold ml-auto">{v.scores[dim.id] ?? 0}</span>
                  </div>
                ))}
              <p className="text-muted-foreground/60 text-[10px] pt-0.5">
                <ChevronRight className="inline h-2.5 w-2.5" /> 点击查看详情
              </p>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
