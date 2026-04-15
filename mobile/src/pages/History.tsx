import { useState } from 'react'

const allHistory = [
  {
    id: 1,
    title: 'Nginx 502 Bad Gateway',
    status: 'success' as const,
    confidence: 92,
    cause: 'Upstream 服务不可用',
    time: '今天 14:30',
    duration: '2.3s',
    model: 'Gemma4-7B',
    actions: 1,
  },
  {
    id: 2,
    title: '数据库连接超时',
    status: 'warning' as const,
    confidence: 78,
    cause: '连接池耗尽',
    time: '今天 13:20',
    duration: '3.1s',
    model: 'Gemma4-7B',
    actions: 0,
  },
  {
    id: 3,
    title: 'Memory Leak',
    status: 'success' as const,
    confidence: 85,
    cause: '内存泄漏',
    time: '昨天 16:45',
    duration: '2.8s',
    model: 'Gemma4-7B',
    actions: 2,
  },
  {
    id: 4,
    title: 'Docker Container OOM',
    status: 'error' as const,
    confidence: 65,
    cause: '内存限制配置过低',
    time: '昨天 10:12',
    duration: '4.2s',
    model: 'Gemma4-7B',
    actions: 0,
  },
  {
    id: 5,
    title: 'SSL Certificate Expiring',
    status: 'warning' as const,
    confidence: 88,
    cause: '证书将在 7 天后过期',
    time: '3天前',
    duration: '1.9s',
    model: 'Gemma4-2B',
    actions: 1,
  },
]

const statusConfig = {
  success: {
    dot: 'var(--color-success)',
    badge: 'oklch(65% 0.18 145 / 0.15)',
    text: 'var(--color-success)',
    label: '已解决',
  },
  warning: {
    dot: 'var(--color-warning)',
    badge: 'oklch(72% 0.16 85 / 0.15)',
    text: 'var(--color-warning)',
    label: '处理中',
  },
  error: {
    dot: 'var(--color-error)',
    badge: 'oklch(60% 0.22 25 / 0.15)',
    text: 'var(--color-error)',
    label: '待处理',
  },
}

type FilterType = 'all' | 'success' | 'warning' | 'error'

export default function History() {
  const [filter, setFilter] = useState<FilterType>('all')

  const filtered = allHistory.filter(
    (h) => filter === 'all' || h.status === filter
  )

  const stats = {
    total: allHistory.length,
    success: allHistory.filter((h) => h.status === 'success').length,
    warning: allHistory.filter((h) => h.status === 'warning').length,
    error: allHistory.filter((h) => h.status === 'error').length,
  }

  const filterOptions: { id: FilterType; label: string }[] = [
    { id: 'all', label: '全部' },
    { id: 'success', label: '已解决' },
    { id: 'warning', label: '处理中' },
    { id: 'error', label: '待处理' },
  ]

  return (
    <div
      className="min-h-screen px-5 pt-5 space-y-5"
      style={{ background: 'var(--color-bg)' }}
    >
      {/* Header */}
      <div className="animate-fade-up">
        <h1
          className="text-display"
          style={{
            fontSize: 'clamp(1.0625rem, 3.5vw, 1.25rem)',
            color: 'var(--color-text-primary)',
            fontFamily: 'var(--font-display)',
          }}
        >
          诊断历史
        </h1>
        <p className="text-caption mt-0.5">
          {stats.total} 次诊断 · {stats.success} 已解决
        </p>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-2 animate-fade-up" style={{ animationDelay: '60ms' }}>
        {([
          { key: 'success' as FilterType, label: '已解决', value: stats.success },
          { key: 'warning' as FilterType, label: '处理中', value: stats.warning },
          { key: 'error' as FilterType, label: '待处理', value: stats.error },
        ]).map((s) => {
          const cfg = statusConfig[s.key]
          return (
            <button
              key={s.key}
              onClick={() => setFilter(filter === s.key ? 'all' : s.key)}
              className="rounded-2xl py-3 px-2 text-center transition-all active:scale-95 animate-fade-up"
              style={{
                background: 'var(--color-surface)',
                border: `1px solid ${filter === s.key ? cfg.dot : 'var(--color-border)'}`,
                animationDelay: `${80 + stats[s.key] * 30}ms`,
              }}
            >
              <p
                className="text-title"
                style={{
                  fontFamily: 'var(--font-display)',
                  color: cfg.text,
                }}
              >
                {s.value}
              </p>
              <p className="text-micro mt-0.5">{s.label}</p>
            </button>
          )
        })}
      </div>

      {/* Filter Pills */}
      <div
        className="flex gap-2 overflow-x-auto no-scrollbar pb-1 animate-fade-up"
        style={{ animationDelay: '140ms' }}
      >
        {filterOptions.map((f) => {
          const isActive = filter === f.id
          return (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className="shrink-0 px-4 py-2 rounded-full text-label font-medium transition-all"
              style={{
                background: isActive ? 'var(--color-accent-glow)' : 'var(--color-surface)',
                color: isActive ? 'var(--color-accent)' : 'var(--color-text-tertiary)',
                fontFamily: 'var(--font-display)',
                border: isActive ? '1px solid oklch(68% 0.15 75 / 0.3)' : '1px solid var(--color-border)',
              }}
            >
              {f.label}
            </button>
          )
        })}
      </div>

      {/* History List */}
      <div className="space-y-3 pb-4 stagger-children">
        {filtered.map((item) => {
          const cfg = statusConfig[item.status]
          return (
            <div
              key={item.id}
              className="rounded-2xl p-4 transition-all active:scale-[0.99] animate-fade-up"
              style={{
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
              }}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ background: cfg.dot }}
                  />
                  <span
                    className="text-label font-semibold"
                    style={{
                      fontFamily: 'var(--font-display)',
                      color: 'var(--color-text-primary)',
                    }}
                  >
                    {item.title}
                  </span>
                </div>
                <span
                  className="text-micro font-semibold px-2.5 py-1 rounded-full"
                  style={{
                    background: cfg.badge,
                    color: cfg.text,
                    fontFamily: 'var(--font-display)',
                  }}
                >
                  {cfg.label}
                </span>
              </div>

              {/* Confidence bar */}
              <div
                className="h-1 rounded-full mb-3"
                style={{ background: 'var(--color-border)' }}
              >
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${item.confidence}%`,
                    background: cfg.dot,
                  }}
                />
              </div>

              <div className="grid grid-cols-2 gap-y-1 gap-x-4 mb-3">
                {[
                  { label: '置信度', value: `${item.confidence}%` },
                  { label: '耗时', value: item.duration },
                  { label: '原因', value: item.cause },
                  { label: '模型', value: item.model },
                ].map((field) => (
                  <div key={field.label} className="flex items-center gap-1.5">
                    <span className="text-micro" style={{ color: 'var(--color-text-tertiary)' }}>
                      {field.label}
                    </span>
                    <span
                      className="text-micro truncate"
                      style={{ color: 'var(--color-text-secondary)', fontFamily: 'var(--font-display)' }}
                    >
                      {field.value}
                    </span>
                  </div>
                ))}
              </div>

              <div
                className="flex items-center justify-between pt-3"
                style={{ borderTop: '1px solid var(--color-border)' }}
              >
                <span className="text-micro" style={{ color: 'var(--color-text-tertiary)' }}>
                  {item.time}
                </span>
                <div className="flex gap-2">
                  {item.actions > 0 && (
                    <span
                      className="px-2.5 py-1 rounded-xl text-micro font-semibold"
                      style={{
                        background: 'var(--color-accent-glow)',
                        color: 'var(--color-accent)',
                        fontFamily: 'var(--font-display)',
                      }}
                    >
                      {item.actions} 个操作
                    </span>
                  )}
                  <button
                    className="px-3 py-1.5 rounded-xl text-micro transition-all active:scale-95"
                    style={{
                      background: 'var(--color-surface-raised)',
                      color: 'var(--color-text-secondary)',
                      border: '1px solid var(--color-border)',
                      fontFamily: 'var(--font-display)',
                    }}
                  >
                    详情
                  </button>
                  {item.status !== 'success' && (
                    <button
                      className="px-3 py-1.5 rounded-xl text-micro font-semibold transition-all active:scale-95"
                      style={{
                        background: 'var(--color-accent-glow)',
                        color: 'var(--color-accent)',
                        border: '1px solid oklch(68% 0.15 75 / 0.25)',
                        fontFamily: 'var(--font-display)',
                      }}
                    >
                      继续 →
                    </button>
                  )}
                </div>
              </div>
            </div>
          )
        })}

        {filtered.length === 0 && (
          <div className="text-center py-12 animate-fade-up">
            <span
              style={{ fontSize: '26px', display: 'block', marginBottom: '12px' }}
            >
              ◻
            </span>
            <p className="text-label" style={{ color: 'var(--color-text-tertiary)' }}>
              暂无记录
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
