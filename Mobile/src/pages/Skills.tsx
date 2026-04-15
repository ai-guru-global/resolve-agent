import { useState } from 'react'

const skills = {
  diagnostic: [
    { id: 'log_analyzer', name: 'Log Analyzer', desc: '分析日志文件，提取错误模式', installed: true, readonly: true },
    { id: 'error_classifier', name: 'Error Classifier', desc: '分类错误类型，给出标准解决方案', installed: true, readonly: true },
    { id: 'metric_querier', name: 'Metric Querier', desc: '查询监控指标', installed: true, readonly: true },
    { id: 'config_reader', name: 'Config Reader', desc: '读取配置文件内容', installed: false, readonly: true },
  ],
  action: [
    { id: 'service_restart', name: 'Service Restart', desc: '重启指定服务', installed: true, readonly: false, risk: '中' },
    { id: 'config_backup', name: 'Config Backup', desc: '备份配置文件', installed: false, readonly: false, risk: '低' },
    { id: 'log_cleanup', name: 'Log Cleanup', desc: '清理日志文件', installed: false, readonly: false, risk: '中' },
    { id: 'shell_runner', name: 'Shell Runner', desc: '执行 Shell 命令', installed: false, readonly: false, risk: '高' },
  ],
  cloud: [
    { id: 'cloud_sync', name: 'Enterprise Sync', desc: '同步到企业知识库', installed: true, readonly: false },
    { id: 'case_upload', name: 'Case Upload', desc: '上报诊断案例', installed: false, readonly: false },
  ],
}

const riskConfig: Record<string, { bg: string; color: string }> = {
  低: { bg: 'oklch(65% 0.18 145 / 0.15)', color: 'var(--color-success)' },
  中: { bg: 'oklch(72% 0.16 85 / 0.15)', color: 'var(--color-warning)' },
  高: { bg: 'oklch(60% 0.22 25 / 0.15)', color: 'var(--color-error)' },
}

const tabIcons: Record<string, string> = {
  diagnostic: '◈',
  action: '⚡',
  cloud: '☁',
}

export default function Skills() {
  const [activeTab, setActiveTab] = useState<'diagnostic' | 'action' | 'cloud'>('diagnostic')
  const [searchQuery, setSearchQuery] = useState('')

  const tabs = [
    { id: 'diagnostic' as const, label: '诊断类' },
    { id: 'action' as const, label: '操作类' },
    { id: 'cloud' as const, label: '云端协同' },
  ]

  const filtered = skills[activeTab].filter(
    (s) =>
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.desc.includes(searchQuery)
  )

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
            fontSize: 'clamp(1.25rem, 4vw, 1.5rem)',
            color: 'var(--color-text-primary)',
            fontFamily: 'var(--font-display)',
          }}
        >
          Skills 中心
        </h1>
        <p className="text-caption mt-0.5">基于 Google Edge Gallery Skills API</p>
      </div>

      {/* Search */}
      <div className="relative animate-fade-up" style={{ animationDelay: '60ms' }}>
        <span
          className="absolute left-4 top-1/2 -translate-y-1/2"
          style={{ color: 'var(--color-accent)', fontSize: '16px' }}
        >
          ◎
        </span>
        <input
          type="text"
          placeholder="搜索 Skills..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-3 rounded-2xl text-sm outline-none transition-all"
          style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            color: 'var(--color-text-primary)',
            fontFamily: 'var(--font-body)',
          }}
        />
      </div>

      {/* Tabs */}
      <div
        className="flex gap-1 p-1 rounded-2xl animate-fade-up"
        style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          animationDelay: '120ms',
        }}
      >
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-label font-medium transition-all"
              style={{
                background: isActive ? 'var(--color-accent-glow)' : 'transparent',
                color: isActive ? 'var(--color-accent)' : 'var(--color-text-tertiary)',
                fontFamily: 'var(--font-display)',
                border: isActive ? '1px solid oklch(68% 0.15 75 / 0.3)' : '1px solid transparent',
                transition: 'all var(--duration-fast) var(--ease-out-quart)',
              }}
            >
              <span style={{ fontSize: '14px' }}>{tabIcons[tab.id]}</span>
              <span>{tab.label}</span>
            </button>
          )
        })}
      </div>

      {/* Skills List */}
      <div className="space-y-2 pb-4 stagger-children">
        {filtered.map((skill, i) => {
          const risk = skill.risk ? riskConfig[skill.risk] : null
          return (
            <div
              key={skill.id}
              className="rounded-2xl p-4 animate-fade-up"
              style={{
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                animationDelay: `${160 + i * 50}ms`,
              }}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center"
                    style={{
                      background: 'var(--color-accent-glow)',
                      border: '1px solid oklch(68% 0.15 75 / 0.2)',
                    }}
                  >
                    <span
                      style={{
                        color: 'var(--color-accent)',
                        fontSize: '16px',
                        fontFamily: 'var(--font-display)',
                      }}
                    >
                      {activeTab === 'diagnostic' ? '◈' : activeTab === 'action' ? '⚡' : '☁'}
                    </span>
                  </div>
                  <div>
                    <p
                      className="text-label font-semibold"
                      style={{
                        fontFamily: 'var(--font-display)',
                        color: 'var(--color-text-primary)',
                      }}
                    >
                      {skill.name}
                    </p>
                    <p className="text-micro mt-0.5">{skill.desc}</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 mb-3">
                {skill.installed ? (
                  <span
                    className="text-micro font-semibold px-2.5 py-1 rounded-full"
                    style={{
                      background: 'oklch(65% 0.18 145 / 0.15)',
                      color: 'var(--color-success)',
                      fontFamily: 'var(--font-display)',
                    }}
                  >
                    已安装
                  </span>
                ) : (
                  <span
                    className="text-micro px-2.5 py-1 rounded-full"
                    style={{
                      background: 'var(--color-surface-raised)',
                      color: 'var(--color-text-tertiary)',
                      fontFamily: 'var(--font-display)',
                    }}
                  >
                    未安装
                  </span>
                )}
                {skill.readonly && (
                  <span
                    className="text-micro"
                    style={{ color: 'var(--color-text-tertiary)', fontFamily: 'var(--font-display)' }}
                  >
                    只读
                  </span>
                )}
                {risk && (
                  <span
                    className="text-micro font-semibold px-2.5 py-1 rounded-full"
                    style={{
                      background: risk.bg,
                      color: risk.color,
                      fontFamily: 'var(--font-display)',
                    }}
                  >
                    风险: {skill.risk}
                  </span>
                )}
              </div>

              {skill.installed ? (
                <button
                  className="w-full py-2.5 rounded-xl text-label font-medium transition-all active:scale-[0.98]"
                  style={{
                    background: skill.readonly
                      ? 'var(--color-surface-raised)'
                      : skill.risk === '高'
                      ? 'oklch(60% 0.22 25 / 0.2)'
                      : 'var(--color-accent-glow)',
                    color: skill.readonly
                      ? 'var(--color-text-tertiary)'
                      : skill.risk === '高'
                      ? 'var(--color-error)'
                      : 'var(--color-accent)',
                    fontFamily: 'var(--font-display)',
                    border: skill.readonly
                      ? '1px solid var(--color-border)'
                      : skill.risk === '高'
                      ? '1px solid oklch(60% 0.22 25 / 0.3)'
                      : '1px solid oklch(68% 0.15 75 / 0.25)',
                  }}
                >
                  {skill.readonly ? '已启用（只读）' : '执行'}
                </button>
              ) : (
                <button
                  className="w-full py-2.5 rounded-xl text-label font-medium transition-all active:scale-[0.98]"
                  style={{
                    background: 'var(--color-surface-raised)',
                    color: 'var(--color-text-secondary)',
                    fontFamily: 'var(--font-display)',
                    border: '1px solid var(--color-border)',
                  }}
                >
                  安装
                </button>
              )}
            </div>
          )
        })}

        {filtered.length === 0 && (
          <div className="text-center py-10">
            <p className="text-label" style={{ color: 'var(--color-text-tertiary)' }}>
              未找到匹配的 Skills
            </p>
          </div>
        )}
      </div>

      {/* Model Info */}
      <div
        className="rounded-2xl overflow-hidden animate-fade-up"
        style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          animationDelay: '400ms',
        }}
      >
        <div
          className="px-4 py-3"
          style={{ borderBottom: '1px solid var(--color-border)' }}
        >
          <p
            className="text-label font-semibold"
            style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text-primary)' }}
          >
            推荐模型
          </p>
        </div>
        <div className="p-4 grid grid-cols-3 gap-2">
          {[
            { name: 'Gemma4-2B', size: '1.5GB', speed: '~45 tok/s', tag: '快速', i: 0 },
            { name: 'Gemma4-7B', size: '4.5GB', speed: '~20 tok/s', tag: '均衡', i: 1 },
            { name: 'Gemma4-7B-FP16', size: '14GB', speed: '~8 tok/s', tag: '高精度', i: 2 },
          ].map((m) => (
            <div
              key={m.name}
              className="rounded-2xl p-3 text-center"
              style={{
                background: m.i === 1 ? 'var(--color-accent-glow)' : 'var(--color-surface-raised)',
                border: m.i === 1
                  ? '1px solid oklch(68% 0.15 75 / 0.3)'
                  : '1px solid var(--color-border)',
              }}
            >
              <p
                className="text-micro font-semibold"
                style={{
                  fontFamily: 'var(--font-display)',
                  color: m.i === 1 ? 'var(--color-accent)' : 'var(--color-text-primary)',
                }}
              >
                {m.name}
              </p>
              <p className="text-micro mt-0.5" style={{ color: 'var(--color-text-tertiary)' }}>
                {m.size} · {m.speed}
              </p>
              <span
                className="inline-block mt-1.5 px-2 py-0.5 rounded-full text-micro font-semibold"
                style={{
                  background: m.i === 0
                    ? 'oklch(65% 0.18 145 / 0.15)'
                    : m.i === 1
                    ? 'oklch(68% 0.15 75 / 0.2)'
                    : 'oklch(65% 0.14 240 / 0.15)',
                  color: m.i === 0
                    ? 'var(--color-success)'
                    : m.i === 1
                    ? 'var(--color-accent)'
                    : 'var(--color-info)',
                  fontFamily: 'var(--font-display)',
                }}
              >
                {m.tag}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
