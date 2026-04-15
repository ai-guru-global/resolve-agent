import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

type DiagnoseState = 'idle' | 'capturing' | 'processing' | 'result'

const STEPS = [
  { id: 'ocr', label: 'OCR 识别', color: 'var(--color-accent)' },
  { id: 'gemma', label: 'Gemma4 推理', color: 'var(--color-info)' },
  { id: 'skill', label: 'Skills 执行', color: 'var(--color-success)' },
]

const DIAGNOSIS = {
  title: 'Nginx 502 Bad Gateway',
  confidence: 92,
  causes: [
    { prob: 75, label: 'Upstream 服务不可用', color: 'var(--color-success)' },
    { prob: 20, label: '连接超时', color: 'var(--color-warning)' },
    { prob: 5, label: '负载均衡配置错误', color: 'var(--color-error)' },
  ],
  suggestions: [
    { name: '重启 Upstream Pod', action: true, risk: '中' },
    { name: '查看 Upstream 状态', action: false },
  ],
  similarCases: [
    { id: '#4521', title: 'Nginx 502', time: '今天 14:30', status: '已解决' },
    { id: '#3892', title: '502 频繁', time: '昨天 13:20', status: '已解决' },
    { id: '#2156', title: '上游超时', time: '前天 16:45', status: '已解决' },
  ],
}

function ProgressBar({ value, color }: { value: number; color: string }) {
  return (
    <div className="h-1 w-full rounded-full overflow-hidden" style={{ background: 'var(--color-border)' }}>
      <div
        className="h-full rounded-full transition-all duration-300"
        style={{ width: `${value}%`, background: color }}
      />
    </div>
  )
}

export default function Diagnose() {
  const navigate = useNavigate()
  const [state, setState] = useState<DiagnoseState>('idle')
  const [progress, setProgress] = useState({ ocr: 0, gemma: 0, skill: 0 })
  const [activeStep, setActiveStep] = useState<string | null>(null)
  const [showConfirm, setShowConfirm] = useState(false)
  const [showResult, setShowResult] = useState(false)

  const start = () => {
    setState('capturing')
    setTimeout(() => {
      setState('processing')
      runProcessing()
    }, 600)
  }

  const runProcessing = () => {
    setActiveStep('ocr')
    let p = 0
    const ocrInt = setInterval(() => {
      p += Math.random() * 18 + 7
      setProgress((prev) => ({ ...prev, ocr: Math.min(p, 100) }))
      if (p >= 100) {
        clearInterval(ocrInt)
        setActiveStep('gemma')
        let g = 0
        const gemInt = setInterval(() => {
          g += Math.random() * 12 + 4
          setProgress((prev) => ({ ...prev, gemma: Math.min(g, 100) }))
          if (g >= 100) {
            clearInterval(gemInt)
            setActiveStep('skill')
            let s = 0
            const skInt = setInterval(() => {
              s += Math.random() * 22 + 10
              setProgress((prev) => ({ ...prev, skill: Math.min(s, 100) }))
              if (s >= 100) {
                clearInterval(skInt)
                setActiveStep(null)
                setState('result')
                setTimeout(() => setShowResult(true), 200)
              }
            }, 180)
          }
        }, 180)
      }
    }, 180)
  }

  const reset = () => {
    setState('idle')
    setShowResult(false)
    setProgress({ ocr: 0, gemma: 0, skill: 0 })
    setActiveStep(null)
  }

  return (
    <div className="min-h-screen px-5 pt-5 space-y-4" style={{ background: 'var(--color-bg)' }}>
      {/* Header */}
      <div className="flex items-center justify-between animate-fade-up">
        <h1
          className="text-title"
          style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text-primary)' }}
        >
          {state === 'idle' ? '拍照诊断' : state === 'result' ? '诊断结果' : '分析中'}
        </h1>
        <button
          onClick={() => navigate('/')}
          className="w-9 h-9 rounded-xl flex items-center justify-center text-lg transition-all active:scale-90"
          style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
        >
          ✕
        </button>
      </div>

      {/* Idle State */}
      {state === 'idle' && (
        <div className="space-y-5 animate-fade-up" style={{ animationDelay: '60ms' }}>
          {/* Camera Viewfinder */}
          <button
            onClick={start}
            className="w-full aspect-[4/3] rounded-3xl overflow-hidden relative flex items-center justify-center transition-all active:scale-[0.99]"
            style={{
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
            }}
          >
            <div className="flex flex-col items-center gap-3">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center"
                style={{ background: 'oklch(68% 0.15 75 / 0.15)', border: '1px solid oklch(68% 0.15 75 / 0.25)' }}
              >
                <span style={{ fontSize: '28px', color: 'var(--color-accent)' }}>◉</span>
              </div>
              <p className="text-label" style={{ color: 'var(--color-text-secondary)' }}>
                点击拍摄错误页面
              </p>
            </div>
            {/* Corner guides */}
            {[
              { top: 12, left: 12, border: 'border-t-2 border-l-2' },
              { top: 12, right: 12, border: 'border-t-2 border-r-2' },
              { bottom: 12, left: 12, border: 'border-b-2 border-l-2' },
              { bottom: 12, right: 12, border: 'border-b-2 border-r-2' },
            ].map((pos, i) => (
              <div
                key={i}
                className={`absolute ${pos.border} rounded-bl-lg rounded-tr-lg`}
                style={{
                  top: pos.top ? pos.top : undefined,
                  bottom: pos.bottom ? pos.bottom : undefined,
                  left: pos.left ? pos.left : undefined,
                  right: pos.right ? pos.right : undefined,
                  borderColor: 'var(--color-accent)',
                  opacity: 0.5,
                }}
              />
            ))}
          </button>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={start}
              className="flex items-center justify-center gap-2 py-4 rounded-2xl font-semibold text-label transition-all active:scale-95"
              style={{
                background: 'var(--color-accent)',
                color: 'var(--color-bg)',
                fontFamily: 'var(--font-display)',
                letterSpacing: '0.01em',
              }}
            >
              <span>◉</span>
              <span>拍照诊断</span>
            </button>
            <button
              onClick={start}
              className="flex items-center justify-center gap-2 py-4 rounded-2xl text-label font-medium transition-all active:scale-95"
              style={{
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-text-secondary)',
                fontFamily: 'var(--font-display)',
              }}
            >
              <span>✎</span>
              <span>描述问题</span>
            </button>
          </div>

          {/* Recent Photos */}
          <div className="space-y-2">
            <p className="text-micro font-medium" style={{ color: 'var(--color-text-tertiary)', paddingLeft: '4px' }}>
              最近照片
            </p>
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
              {[1, 2, 3].map((i) => (
                <button
                  key={i}
                  onClick={start}
                  className="shrink-0 w-20 h-20 rounded-2xl overflow-hidden transition-all active:scale-95"
                  style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
                >
                  <div
                    className="w-full h-full flex items-center justify-center"
                    style={{ background: 'var(--color-surface-raised)' }}
                  >
                    <span style={{ fontSize: '24px', opacity: 0.3 }}>◉</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Capturing */}
      {state === 'capturing' && (
        <div className="flex flex-col items-center justify-center min-h-[50vh] animate-fade-in">
          <div className="relative mb-6">
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center animate-pulse-glow"
              style={{ background: 'oklch(68% 0.15 75 / 0.15)' }}
            >
              <span style={{ fontSize: '32px', color: 'var(--color-accent)' }}>◉</span>
            </div>
          </div>
          <p className="text-label" style={{ color: 'var(--color-text-secondary)', fontFamily: 'var(--font-display)' }}>
            准备拍摄...
          </p>
        </div>
      )}

      {/* Processing */}
      {state === 'processing' && (
        <div className="space-y-4 animate-fade-up">
          <div
            className="rounded-3xl p-5"
            style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
          >
            <div className="text-center mb-5">
              <div
                className="w-12 h-12 rounded-2xl mx-auto mb-3 flex items-center justify-center animate-spin-slow"
                style={{ background: 'oklch(68% 0.15 75 / 0.15)' }}
              >
                <span style={{ fontSize: '22px', color: 'var(--color-accent)' }}>◈</span>
              </div>
              <p className="text-label font-semibold" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text-primary)' }}>
                正在分析
              </p>
              <p className="text-micro mt-1" style={{ color: 'var(--color-text-tertiary)' }}>
                本地推理 · 数据不出设备
              </p>
            </div>

            {/* Steps */}
            <div className="space-y-4">
              {STEPS.map((step, i) => {
                const prog = progress[step.id as keyof typeof progress] ?? 0
                const isActive = activeStep === step.id
                const isDone = prog >= 100
                return (
                  <div key={step.id} className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div
                          className="w-6 h-6 rounded-full flex items-center justify-center text-micro font-bold"
                          style={{
                            background: isDone
                              ? step.color
                              : isActive
                              ? 'oklch(68% 0.15 75 / 0.3)'
                              : 'var(--color-border)',
                            color: isDone || isActive ? 'var(--color-bg)' : 'var(--color-text-tertiary)',
                            fontFamily: 'var(--font-display)',
                            transition: 'all var(--duration-base) var(--ease-out-quart)',
                          }}
                        >
                          {isDone ? '✓' : i + 1}
                        </div>
                        <span
                          className="text-label"
                          style={{
                            color: isDone || isActive ? 'var(--color-text-primary)' : 'var(--color-text-tertiary)',
                            fontFamily: 'var(--font-display)',
                            transition: 'color var(--duration-base)',
                          }}
                        >
                          {step.label}
                        </span>
                      </div>
                      <span className="text-micro" style={{ color: 'var(--color-text-tertiary)' }}>
                        {Math.round(prog)}%
                      </span>
                    </div>
                    <div className="ml-3.5 h-1 rounded-full overflow-hidden" style={{ background: 'var(--color-border)' }}>
                      <div
                        className="h-full rounded-full transition-all duration-200"
                        style={{
                          width: `${prog}%`,
                          background: isDone ? step.color : 'var(--color-accent)',
                        }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Result */}
      {state === 'result' && showResult && (
        <div className="space-y-4 animate-fade-up">
          {/* Success Banner */}
          <div
            className="flex items-center gap-3 p-4 rounded-2xl"
            style={{
              background: 'oklch(65% 0.18 145 / 0.12)',
              border: '1px solid oklch(65% 0.18 145 / 0.2)',
            }}
          >
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: 'oklch(65% 0.18 145 / 0.2)' }}
            >
              <span style={{ fontSize: '18px' }}>✓</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-label font-semibold" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text-primary)' }}>
                诊断完成
              </p>
              <p className="text-micro" style={{ color: 'var(--color-text-secondary)' }}>
                耗时 2.3s · Gemma4-7B INT4
              </p>
            </div>
            <div className="text-right">
              <p
                className="text-title"
                style={{ fontFamily: 'var(--font-display)', color: 'var(--color-success)' }}
              >
                {DIAGNOSIS.confidence}%
              </p>
              <p className="text-micro" style={{ color: 'var(--color-text-tertiary)' }}>置信度</p>
            </div>
          </div>

          {/* Diagnosis Card */}
          <div
            className="rounded-2xl p-4 space-y-4"
            style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
          >
            <div>
              <p className="text-micro font-medium mb-1" style={{ color: 'var(--color-text-tertiary)' }}>
                识别问题
              </p>
              <p className="text-label font-semibold" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text-primary)' }}>
                {DIAGNOSIS.title}
              </p>
            </div>

            {/* Confidence */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <span className="text-micro" style={{ color: 'var(--color-text-secondary)' }}>置信度</span>
                <span
                  className="text-label font-bold"
                  style={{ fontFamily: 'var(--font-display)', color: 'var(--color-accent)' }}
                >
                  {DIAGNOSIS.confidence}%
                </span>
              </div>
              <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--color-border)' }}>
                <div
                  className="h-full rounded-full"
                  style={{ width: `${DIAGNOSIS.confidence}%`, background: 'var(--color-accent)' }}
                />
              </div>
            </div>

            {/* Causes */}
            <div className="space-y-2.5">
              <p className="text-micro font-medium" style={{ color: 'var(--color-text-tertiary)' }}>
                可能原因
              </p>
              {DIAGNOSIS.causes.map((cause, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-micro w-8 text-right shrink-0" style={{ color: 'var(--color-text-secondary)' }}>
                    {cause.prob}%
                  </span>
                  <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: 'var(--color-border)' }}>
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${cause.prob}%`, background: cause.color }}
                    />
                  </div>
                  <span className="text-micro w-36 shrink-0" style={{ color: 'var(--color-text-secondary)' }}>
                    {cause.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Suggestions */}
          <div
            className="rounded-2xl p-4 space-y-2"
            style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
          >
            <p className="text-micro font-medium mb-2" style={{ color: 'var(--color-text-tertiary)' }}>
              💡 建议操作
            </p>
            {DIAGNOSIS.suggestions.map((s, i) => (
              <div
                key={i}
                className="flex items-center justify-between p-3 rounded-xl transition-all"
                style={{ background: 'var(--color-surface-raised)' }}
              >
                <div className="flex items-center gap-2">
                  <span style={{ color: 'var(--color-text-secondary)', fontSize: '14px' }}>
                    {s.action ? '◈' : '○'}
                  </span>
                  <span className="text-label" style={{ color: 'var(--color-text-primary)' }}>
                    {s.name}
                  </span>
                </div>
                {s.action ? (
                  <button
                    onClick={() => setShowConfirm(true)}
                    className="px-3 py-1.5 rounded-xl text-micro font-semibold transition-all active:scale-95"
                    style={{
                      background: 'var(--color-accent-glow)',
                      color: 'var(--color-accent)',
                      border: '1px solid oklch(68% 0.15 75 / 0.25)',
                      fontFamily: 'var(--font-display)',
                    }}
                  >
                    执行
                  </button>
                ) : (
                  <button
                    className="px-3 py-1.5 rounded-xl text-micro transition-all active:scale-95"
                    style={{
                      background: 'var(--color-surface)',
                      color: 'var(--color-text-secondary)',
                      border: '1px solid var(--color-border)',
                    }}
                  >
                    详情
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Similar Cases */}
          <div
            className="rounded-2xl p-4"
            style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
          >
            <p className="text-micro font-medium mb-2" style={{ color: 'var(--color-text-tertiary)' }}>
              📖 相似案例
            </p>
            {DIAGNOSIS.similarCases.map((c, i) => (
              <div
                key={i}
                className="flex items-center justify-between py-2.5"
                style={{ borderBottom: i < 2 ? '1px solid var(--color-border)' : 'none' }}
              >
                <div className="flex items-center gap-2">
                  <span className="text-micro font-mono" style={{ color: 'var(--color-accent)' }}>
                    {c.id}
                  </span>
                  <span className="text-micro" style={{ color: 'var(--color-text-secondary)' }}>
                    {c.title}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-micro" style={{ color: 'var(--color-text-tertiary)' }}>
                    {c.time}
                  </span>
                  <span
                    className="text-micro font-medium px-2 py-0.5 rounded-full"
                    style={{ background: 'oklch(65% 0.18 145 / 0.12)', color: 'var(--color-success)' }}
                  >
                    {c.status}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="flex gap-2 pb-4">
            <button
              onClick={reset}
              className="flex-1 py-3.5 rounded-2xl text-label font-medium transition-all active:scale-95"
              style={{
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-text-secondary)',
                fontFamily: 'var(--font-display)',
              }}
            >
              再次诊断
            </button>
            <button
              onClick={() => { reset(); navigate('/') }}
              className="flex-1 py-3.5 rounded-2xl text-label font-semibold transition-all active:scale-95"
              style={{
                background: 'var(--color-accent)',
                color: 'var(--color-bg)',
                fontFamily: 'var(--font-display)',
              }}
            >
              返回
            </button>
          </div>
        </div>
      )}

      {/* Confirm Modal */}
      {showConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center animate-fade-in safe-bottom"
          style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}
        >
          <div
            className="w-full max-w-md rounded-t-3xl p-5 space-y-4"
            style={{
              background: 'var(--color-surface)',
              borderTop: '1px solid var(--color-border)',
              paddingBottom: 'max(24px, env(safe-area-inset-bottom))',
            }}
          >
            <div
              className="w-10 h-1 rounded-full mx-auto mb-2"
              style={{ background: 'var(--color-border)' }}
            />
            <div className="text-center">
              <p className="text-title mb-1" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text-primary)' }}>
                ⚠️ 操作确认
              </p>
            </div>
            <div
              className="rounded-2xl p-4 space-y-2.5"
              style={{ background: 'var(--color-surface-raised)' }}
            >
              <div className="flex items-start gap-2">
                <span className="text-micro shrink-0 mt-0.5" style={{ color: 'var(--color-text-tertiary)' }}>命令:</span>
                <code
                  className="text-micro font-mono"
                  style={{ color: 'var(--color-accent)', wordBreak: 'break-all' }}
                >
                  kubectl rollout restart deployment upstream-api
                </code>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-micro shrink-0" style={{ color: 'var(--color-text-tertiary)' }}>影响:</span>
                <span className="text-micro" style={{ color: 'var(--color-text-secondary)' }}>
                  将重启 3 个 Pod，终止现有连接
                </span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-micro shrink-0" style={{ color: 'var(--color-text-tertiary)' }}>风险:</span>
                <span className="text-micro font-semibold" style={{ color: 'var(--color-warning)' }}>
                  🟡 中
                </span>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 py-3.5 rounded-2xl text-label font-medium transition-all active:scale-95"
                style={{
                  background: 'var(--color-surface-raised)',
                  border: '1px solid var(--color-border)',
                  color: 'var(--color-text-secondary)',
                  fontFamily: 'var(--font-display)',
                }}
              >
                取消
              </button>
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 py-3.5 rounded-2xl text-label font-semibold transition-all active:scale-95"
                style={{
                  background: 'var(--color-error)',
                  color: 'var(--color-text-primary)',
                  fontFamily: 'var(--font-display)',
                }}
              >
                确认执行
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
