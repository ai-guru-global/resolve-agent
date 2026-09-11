import { useState } from 'react'

const settings = [
  {
    section: '模型',
    items: [
      { icon: '◈', label: '当前模型', value: 'Gemma4-7B INT4', action: '切换' },
      { icon: '▼', label: '模型管理', value: '已下载 2 个', action: '管理' },
      { icon: '⚡', label: '推理设备', value: 'NPU (45 TOPS)', action: null },
    ],
  },
  {
    section: '隐私与安全',
    items: [
      { icon: '◈', label: '数据处理', value: '100% 本地', action: null },
      { icon: '◈', label: '生物识别', value: '已启用', action: '管理' },
      { icon: '◈', label: '高风险操作确认', value: '已开启', action: null },
    ],
  },
  {
    section: '企业功能',
    items: [
      { icon: '◈', label: '云端同步', value: '未连接', action: '连接' },
      { icon: '◈', label: '企业 Skills Hub', value: '未连接', action: '连接' },
      { icon: '◈', label: '审计日志', value: '已开启', action: '查看' },
    ],
  },
  {
    section: '应用',
    items: [
      { icon: '◈', label: '语言', value: '简体中文', action: null },
      { icon: '◈', label: '通知', value: '已开启', action: null },
      { icon: '◈', label: 'Edge Gallery', value: 'v2.4.1', action: null },
    ],
  },
]

export default function Settings() {
  const [offlineMode, setOfflineMode] = useState(true)

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
          设置
        </h1>
      </div>

      {/* Offline Mode Banner */}
      <div
        className="flex items-center gap-3 p-4 rounded-2xl animate-fade-up"
        style={{
          background: offlineMode
            ? 'oklch(65% 0.18 145 / 0.1)'
            : 'var(--color-surface)',
          border: `1px solid ${
            offlineMode
              ? 'oklch(65% 0.18 145 / 0.25)'
              : 'var(--color-border)'
          }`,
          animationDelay: '60ms',
        }}
      >
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
          style={{
            background: offlineMode
              ? 'oklch(65% 0.18 145 / 0.15)'
              : 'var(--color-surface-raised)',
          }}
        >
          <span
            style={{
              fontSize: '15px',
              color: offlineMode ? 'var(--color-success)' : 'var(--color-text-tertiary)',
            }}
          >
            ◈
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <p
            className="text-label font-semibold"
            style={{
              fontFamily: 'var(--font-display)',
              color: 'var(--color-text-primary)',
            }}
          >
            离线模式
          </p>
          <p className="text-micro mt-0.5">
            所有诊断100%本地处理，数据不出设备
          </p>
        </div>
        <button
          onClick={() => setOfflineMode(!offlineMode)}
          className="w-12 h-7 rounded-full p-0.5 transition-all shrink-0"
          style={{
            background: offlineMode ? 'var(--color-success)' : 'var(--color-surface-raised)',
            border: `1px solid ${offlineMode ? 'var(--color-success)' : 'var(--color-border)'}`,
          }}
        >
          <div
            className="w-5 h-5 rounded-full transition-transform"
            style={{
              background: 'var(--color-text-primary)',
              transform: offlineMode ? 'translateX(20px)' : 'translateX(0)',
            }}
          />
        </button>
      </div>

      {/* Security Score */}
      <div
        className="rounded-2xl overflow-hidden animate-fade-up"
        style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          animationDelay: '120ms',
        }}
      >
        <div className="px-4 py-3 flex items-center justify-between">
          <p
            className="text-label font-semibold"
            style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text-primary)' }}
          >
            安全评分
          </p>
          <span
            className="text-title font-bold"
            style={{ fontFamily: 'var(--font-display)', color: 'var(--color-success)' }}
          >
            95/100
          </span>
        </div>
        <div
          className="h-1.5 mx-4 rounded-full overflow-hidden mb-3"
          style={{ background: 'var(--color-border)' }}
        >
          <div
            className="h-full rounded-full"
            style={{ width: '95%', background: 'var(--color-success)' }}
          />
        </div>
        <div className="px-4 pb-3 flex gap-4">
          {[
            { label: '设备加密', ok: true },
            { label: '生物识别', ok: true },
            { label: '离线优先', ok: true },
            { label: '操作审计', ok: false },
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-1">
              <span
                className="text-micro font-bold"
                style={{
                  color: item.ok ? 'var(--color-success)' : 'var(--color-text-tertiary)',
                  fontFamily: 'var(--font-display)',
                }}
              >
                {item.ok ? '✓' : '✗'}
              </span>
              <span className="text-micro" style={{ color: 'var(--color-text-tertiary)' }}>
                {item.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Settings Groups */}
      <div className="space-y-4 animate-fade-up" style={{ animationDelay: '180ms' }}>
        {settings.map((group) => (
          <div key={group.section}>
            <p
              className="text-micro font-semibold uppercase tracking-wider mb-2 px-1"
              style={{
                color: 'var(--color-text-tertiary)',
                fontFamily: 'var(--font-display)',
                letterSpacing: '0.08em',
              }}
            >
              {group.section}
            </p>
            <div
              className="rounded-2xl overflow-hidden"
              style={{
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
              }}
            >
              {group.items.map((item, i) => (
                <div
                  key={item.label}
                  className="flex items-center justify-between px-4 py-3 transition-all"
                  style={{
                    background: 'var(--color-surface)',
                    borderBottom: i < group.items.length - 1 ? '1px solid var(--color-border)' : 'none',
                  }}
                >
                  <div className="flex items-center gap-3">
                    <span
                      style={{
                        color: 'var(--color-accent)',
                        fontSize: '12px',
                        fontFamily: 'var(--font-display)',
                      }}
                    >
                      {item.icon}
                    </span>
                    <div>
                      <p
                        className="text-label"
                        style={{
                          fontFamily: 'var(--font-display)',
                          color: 'var(--color-text-primary)',
                        }}
                      >
                        {item.label}
                      </p>
                      <p className="text-micro">{item.value}</p>
                    </div>
                  </div>
                  {item.action && (
                    <button
                      className="px-3 py-1.5 rounded-xl text-micro font-semibold transition-all active:scale-95"
                      style={{
                        background: 'var(--color-accent-glow)',
                        color: 'var(--color-accent)',
                        border: '1px solid oklch(68% 0.15 75 / 0.25)',
                        fontFamily: 'var(--font-display)',
                      }}
                    >
                      {item.action}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Permission Levels */}
      <div className="animate-fade-up" style={{ animationDelay: '280ms' }}>
        <p
          className="text-micro font-semibold uppercase tracking-wider mb-2 px-1"
          style={{
            color: 'var(--color-text-tertiary)',
            fontFamily: 'var(--font-display)',
            letterSpacing: '0.08em',
          }}
        >
          权限等级
        </p>
        <div
          className="rounded-2xl overflow-hidden"
          style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
          }}
        >
          <div
            className="px-4 py-3"
            style={{
              background: 'var(--color-accent-glow)',
              borderBottom: '1px solid oklch(68% 0.15 75 / 0.2)',
            }}
          >
            <div className="flex items-center justify-between">
              <div>
                <p
                  className="text-label font-semibold"
                  style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text-primary)' }}
                >
                  现场工程师
                </p>
                <p className="text-micro" style={{ color: 'var(--color-text-secondary)' }}>
                  Level 2
                </p>
              </div>
              <span
                className="text-micro font-semibold px-2.5 py-1 rounded-full"
                style={{
                  background: 'oklch(68% 0.15 75 / 0.2)',
                  color: 'var(--color-accent)',
                  fontFamily: 'var(--font-display)',
                }}
              >
                当前
              </span>
            </div>
          </div>
          <div className="p-4 space-y-3">
            {[
              { level: '观察者', desc: '只读诊断，无操作权限', v: 0 },
              { level: '运维助手', desc: '执行低风险操作，需确认', v: 1 },
              { level: '现场工程师', desc: '执行常规运维操作', v: 2 },
              { level: '管理员', desc: '全部权限，含高风险操作', v: 3 },
            ].map((p) => (
              <div
                key={p.v}
                className="flex items-center justify-between"
              >
                <div>
                  <span
                    className="text-label"
                    style={{
                      fontFamily: 'var(--font-display)',
                      color: p.v === 2 ? 'var(--color-text-primary)' : 'var(--color-text-tertiary)',
                    }}
                  >
                    {p.level}
                  </span>
                  <span
                    className="text-micro ml-2"
                    style={{ color: 'var(--color-text-tertiary)' }}
                  >
                    {p.desc}
                  </span>
                </div>
                <span
                  className="text-micro"
                  style={{
                    fontFamily: 'var(--font-display)',
                    color: 'var(--color-text-tertiary)',
                  }}
                >
                  v{p.v}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* App Info */}
      <div
        className="text-center py-6 space-y-1 animate-fade-up"
        style={{ animationDelay: '360ms' }}
      >
        <p className="text-micro" style={{ color: 'var(--color-text-tertiary)' }}>
          Mobile AI Ops v1.0.0
        </p>
        <p
          className="text-micro"
          style={{ color: 'var(--color-text-tertiary)', opacity: 0.6 }}
        >
          Powered by Google Edge Gallery · Gemma4
        </p>
        <p
          className="text-micro"
          style={{ color: 'var(--color-text-tertiary)', opacity: 0.4 }}
        >
          © 2026 Mobile AI Ops Team
        </p>
      </div>
    </div>
  )
}
