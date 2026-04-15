import { useNavigate } from 'react-router-dom'

const recentDiagnoses = [
  {
    id: 1, status: 'success' as const,
    title: 'Nginx 502 Bad Gateway',
    confidence: 92, cause: 'Upstream 服务不可用',
    time: '今天 14:30', resolved: true,
  },
  {
    id: 2, status: 'warning' as const,
    title: '数据库连接超时',
    confidence: 78, cause: '连接池耗尽',
    time: '今天 13:20', resolved: false,
  },
  {
    id: 3, status: 'success' as const,
    title: 'Memory Leak',
    confidence: 85, cause: '内存泄漏',
    time: '昨天 16:45', resolved: true,
  },
]

const quickActions = [
  { icon: '◉', label: '拍照诊断', accent: 'var(--color-accent)' },
  { icon: '⊞', label: '相册选取', accent: 'var(--color-text-secondary)' },
  { icon: '✎', label: '文字描述', accent: 'var(--color-text-secondary)' },
  { icon: '▶', label: '命令输入', accent: 'var(--color-text-secondary)' },
]

function StatusDot({ type }: { type: 'success' | 'warning' | 'error' }) {
  const colors = {
    success: 'var(--color-success)',
    warning: 'var(--color-warning)',
    error: 'var(--color-error)',
  }
  return (
    <span
      className="inline-block w-2 h-2 rounded-full"
      style={{ background: colors[type] }}
    />
  )
}

export default function Home() {
  const navigate = useNavigate()

  return (
    <div
      className="min-h-screen px-5 pt-5 space-y-6"
      style={{ background: 'var(--color-bg)' }}
    >
      {/* Header */}
      <header className="flex items-start justify-between animate-fade-up">
        <div>
          <p
            className="text-micro uppercase tracking-widest mb-1"
            style={{ color: 'var(--color-accent)', fontFamily: 'var(--font-display)' }}
          >
            Mobile AI Ops
          </p>
          <h1
            className="text-display"
            style={{
              fontSize: 'clamp(1.125rem, 4vw, 1.375rem)',
              color: 'var(--color-text-primary)',
              fontFamily: 'var(--font-display)',
            }}
          >
            现场诊断
          </h1>
          <p className="text-caption mt-1">Google Edge Gallery · Gemma4 本地推理</p>
        </div>
        <button
          className="w-10 h-10 rounded-2xl flex items-center justify-center text-lg transition-all active:scale-90"
          style={{ background: 'var(--color-surface-raised)', border: '1px solid var(--color-border)' }}
          onClick={() => navigate('/settings')}
        >
          ◎
        </button>
      </header>

      {/* Search Bar */}
      <button
        onClick={() => navigate('/diagnose')}
        className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all active:scale-[0.98] animate-fade-up"
        style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          animationDelay: '80ms',
        }}
      >
        <span style={{ color: 'var(--color-accent)', fontSize: '14px' }}>◎</span>
        <span style={{ color: 'var(--color-text-tertiary)', fontSize: '0.8125rem' }}>
          拍摄错误页面或描述问题...
        </span>
      </button>

      {/* Quick Actions */}
      <div className="grid grid-cols-4 gap-2 animate-fade-up" style={{ animationDelay: '140ms' }}>
        {quickActions.map((action, i) => (
          <button
            key={action.label}
            onClick={() => navigate('/diagnose')}
            className="flex flex-col items-center gap-2 py-4 rounded-2xl transition-all active:scale-90"
            style={{
              background: i === 0 ? 'var(--color-accent-glow)' : 'var(--color-surface)',
              border: i === 0
                ? '1px solid oklch(68% 0.15 75 / 0.3)'
                : '1px solid var(--color-border)',
              animationDelay: `${180 + i * 60}ms`,
            }}
          >
            <span
              style={{
                color: action.accent,
                fontSize: '18px',
                fontFamily: 'var(--font-display)',
                lineHeight: 1,
              }}
            >
              {action.icon}
            </span>
            <span
              className="text-micro font-medium"
              style={{ color: 'var(--color-text-secondary)', fontFamily: 'var(--font-display)', letterSpacing: '0.01em' }}
            >
              {action.label}
            </span>
          </button>
        ))}
      </div>

      {/* Model Status */}
      <div
        className="rounded-2xl overflow-hidden animate-fade-up"
        style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          animationDelay: '360ms',
        }}
      >
        <div
          className="px-4 py-3 flex items-center justify-between"
          style={{ background: 'oklch(20% 0.015 75 / 0.15)' }}
        >
          <div className="flex items-center gap-3">
            <div className="relative">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: 'var(--color-accent-glow)', border: '1px solid oklch(68% 0.15 75 / 0.25)' }}
              >
                <span style={{ fontSize: '15px' }}>◈</span>
              </div>
              <div
                className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full flex items-center justify-center text-[8px]"
                style={{ background: 'var(--color-success)', color: 'var(--color-bg)' }}
              >
                ✓
              </div>
            </div>
            <div>
              <p
                className="text-label font-semibold"
                style={{ color: 'var(--color-text-primary)', fontFamily: 'var(--font-display)' }}
              >
                Gemma4-7B
              </p>
              <p className="text-micro" style={{ color: 'var(--color-text-secondary)' }}>
                INT4 · 4.5 GB · ~20 tok/s
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <span
              className="px-2.5 py-1 rounded-full text-micro font-semibold"
              style={{
                background: 'oklch(65% 0.18 145 / 0.15)',
                color: 'var(--color-success)',
                fontFamily: 'var(--font-display)',
              }}
            >
              就绪
            </span>
          </div>
        </div>
        <div className="px-4 py-2.5 flex items-center gap-4">
          {[
            { icon: '◉', label: '离线可用' },
            { icon: '◈', label: 'NPU 加速' },
            { icon: '◌', label: '100% 本地' },
          ].map((tag, i) => (
            <div key={i} className="flex items-center gap-1.5">
              <span style={{ color: 'var(--color-accent)', fontSize: '10px' }}>{tag.icon}</span>
              <span className="text-micro" style={{ color: 'var(--color-text-secondary)' }}>
                {tag.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-2 animate-fade-up" style={{ animationDelay: '420ms' }}>
        {[
          { value: '127', label: '诊断次数', sub: '本月' },
          { value: '94%', label: '准确率', sub: 'AI' },
          { value: '2.1s', label: '平均耗时', sub: '本地' },
        ].map((stat, i) => (
          <div
            key={stat.label}
            className="rounded-2xl p-4 text-center"
            style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
          >
            <p
              className="text-title mb-0.5"
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: '1.125rem',
                color: 'var(--color-text-primary)',
              }}
            >
              {stat.value}
            </p>
            <p className="text-micro" style={{ color: 'var(--color-text-secondary)' }}>
              {stat.label}
            </p>
            <p className="text-micro" style={{ color: 'var(--color-text-tertiary)' }}>
              {stat.sub}
            </p>
          </div>
        ))}
      </div>

      {/* Recent Diagnoses */}
      <section className="space-y-3 animate-fade-up" style={{ animationDelay: '480ms' }}>
        <div className="flex items-center justify-between">
          <h2 className="text-label font-semibold" style={{ fontFamily: 'var(--font-display)' }}>
            最近诊断
          </h2>
          <button
            onClick={() => navigate('/history')}
            className="text-micro font-medium transition-colors"
            style={{ color: 'var(--color-accent)' }}
          >
            查看全部 →
          </button>
        </div>

        <div className="space-y-2 stagger-children">
          {recentDiagnoses.map((item) => (
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
                  <StatusDot type={item.resolved ? 'success' : 'warning'} />
                  <span
                    className="text-label font-semibold"
                    style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text-primary)' }}
                  >
                    {item.title}
                  </span>
                </div>
                <span className="text-micro" style={{ color: 'var(--color-text-tertiary)' }}>
                  {item.time}
                </span>
              </div>

              <div
                className="flex items-center gap-4 mb-3 text-micro"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                <span>置信度 {item.confidence}%</span>
                <span>·</span>
                <span className="truncate">原因: {item.cause}</span>
              </div>

              {/* Confidence bar */}
              <div className="h-1 rounded-full mb-3" style={{ background: 'var(--color-border)' }}>
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${item.confidence}%`,
                    background: item.resolved ? 'var(--color-success)' : 'var(--color-warning)',
                  }}
                />
              </div>

              <div className="flex items-center justify-between">
                <span
                  className="text-micro font-semibold px-2.5 py-1 rounded-full"
                  style={{
                    background: item.resolved
                      ? 'oklch(65% 0.18 145 / 0.15)'
                      : 'oklch(72% 0.16 85 / 0.15)',
                    color: item.resolved ? 'var(--color-success)' : 'var(--color-warning)',
                    fontFamily: 'var(--font-display)',
                  }}
                >
                  {item.resolved ? '已解决' : '处理中'}
                </span>
                <div className="flex gap-2">
                  <button
                    className="px-3 py-1.5 rounded-xl text-micro transition-all active:scale-95"
                    style={{
                      background: 'var(--color-surface-raised)',
                      color: 'var(--color-text-secondary)',
                      border: '1px solid var(--color-border)',
                    }}
                  >
                    详情
                  </button>
                  {!item.resolved && (
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
          ))}
        </div>
      </section>

      {/* Edge Gallery Badge */}
      <div
        className="flex items-center gap-4 p-4 rounded-2xl mb-4 animate-fade-up"
        style={{
          background: 'oklch(20% 0.015 75 / 0.08)',
          border: '1px solid oklch(28% 0.015 75 / 0.15)',
          animationDelay: '600ms',
        }}
      >
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: 'oklch(68% 0.15 75 / 0.2)' }}
        >
          <span style={{ fontSize: '13px', color: 'var(--color-accent)' }}>◆</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-label font-semibold" style={{ fontFamily: 'var(--font-display)' }}>
            Google Edge Gallery
          </p>
          <p className="text-micro" style={{ color: 'var(--color-text-secondary)' }}>
            模型市场 · Skills 编排 · 本地推理
          </p>
        </div>
        <span style={{ color: 'var(--color-accent)', fontSize: '12px' }}>→</span>
      </div>
    </div>
  )
}
