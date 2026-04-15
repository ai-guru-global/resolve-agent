import { X, ArrowRight, ArrowLeft } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { K8sSourceFile } from '@/types/k8sCorpus';

interface CodeSnippetPanelProps {
  sourceFile: K8sSourceFile | null;
  onClose: () => void;
}

const IMPORTANCE_MAP: Record<string, { label: string; className: string }> = {
  critical: { label: 'Critical', className: 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300' },
  high: { label: 'High', className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300' },
  medium: { label: 'Medium', className: 'bg-slate-100 text-slate-600 dark:bg-slate-800/50 dark:text-slate-300' },
};

export default function CodeSnippetPanel({ sourceFile, onClose }: CodeSnippetPanelProps) {
  if (!sourceFile) return null;

  const imp = IMPORTANCE_MAP[sourceFile.importance] ?? IMPORTANCE_MAP.medium!;

  return (
    <div className="border-l border-border/30 pl-5 space-y-4 animate-slide-up overflow-y-auto max-h-[560px]" style={{ animationDuration: '0.3s' }}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold truncate">{sourceFile.fileName}</h4>
        <button
          onClick={onClose}
          className="rounded-md p-1 hover:bg-muted/50 transition-colors text-muted-foreground hover:text-foreground shrink-0"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* File path */}
      <p className="text-[11px] font-mono text-muted-foreground break-all">{sourceFile.filePath}</p>

      {/* Badges */}
      <div className="flex flex-wrap gap-1.5">
        <Badge variant="outline" className="text-[10px]">{sourceFile.component}</Badge>
        <Badge variant="outline" className="text-[10px]">pkg: {sourceFile.package}</Badge>
        <span className={cn('text-[10px] px-1.5 py-0.5 rounded-md font-medium', imp.className)}>
          {imp.label}
        </span>
      </div>

      {/* Description */}
      <p className="text-[12px] text-muted-foreground leading-relaxed">{sourceFile.description}</p>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-md bg-muted/20 border border-border/20 px-3 py-2 text-center">
          <p className="text-lg font-display font-bold tabular-nums text-primary">
            {sourceFile.keyFunctions.length}
          </p>
          <p className="text-[10px] text-muted-foreground">关键函数</p>
        </div>
        <div className="rounded-md bg-muted/20 border border-border/20 px-3 py-2 text-center">
          <p className="text-lg font-display font-bold tabular-nums">
            {sourceFile.linesOfCode.toLocaleString()}
          </p>
          <p className="text-[10px] text-muted-foreground">代码行数</p>
        </div>
      </div>

      {/* Key Functions */}
      <div>
        <p className="text-[11px] text-muted-foreground/50 uppercase tracking-wider font-semibold mb-3">
          关键函数
        </p>
        <div className="space-y-4">
          {sourceFile.keyFunctions.map((fn) => (
            <div key={fn.name} className="space-y-2">
              {/* Function name */}
              <div>
                <p className="font-mono font-semibold text-xs text-primary">{fn.name}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">{fn.description}</p>
              </div>

              {/* Signature */}
              <div className="bg-muted/20 rounded-md px-2.5 py-1.5 text-[10px] font-mono text-muted-foreground break-all">
                {fn.signature}
              </div>

              {/* Code snippet */}
              <pre className="bg-muted/30 rounded-md p-3 text-[11px] font-mono overflow-x-auto leading-relaxed border border-border/10">
                <code>{fn.codeSnippet}</code>
              </pre>

              {/* Call relations */}
              {(fn.calledBy.length > 0 || fn.calls.length > 0) && (
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-muted-foreground">
                  {fn.calledBy.length > 0 && (
                    <span className="flex items-center gap-1">
                      <ArrowLeft className="h-2.5 w-2.5" />
                      {fn.calledBy.join(', ')}
                    </span>
                  )}
                  {fn.calls.length > 0 && (
                    <span className="flex items-center gap-1">
                      <ArrowRight className="h-2.5 w-2.5" />
                      {fn.calls.join(', ')}
                    </span>
                  )}
                </div>
              )}

              {/* Separator between functions */}
              <div className="border-b border-border/10" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
