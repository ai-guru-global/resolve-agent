import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom'
import Home from './pages/Home'
import Diagnose from './pages/Diagnose'
import Skills from './pages/Skills'
import History from './pages/History'
import Settings from './pages/Settings'

function TabBar() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('home')

  const tabs = [
    { id: 'home', label: '首页', path: '/', icon: '⌂' },
    { id: 'diagnose', label: '诊断', path: '/diagnose', icon: '◈' },
    { id: 'skills', label: 'Skills', path: '/skills', icon: '⚡' },
    { id: 'history', label: '历史', path: '/history', icon: '☰' },
    { id: 'settings', label: '设置', path: '/settings', icon: '◎' },
  ]

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50"
      style={{
        background: 'var(--color-surface)',
        borderTop: '1px solid var(--color-border)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      <div className="flex justify-around items-stretch h-14">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); navigate(tab.path) }}
              className="flex-1 flex flex-col items-center justify-center gap-0.5 relative transition-all"
              style={{
                color: isActive ? 'var(--color-accent)' : 'var(--color-text-tertiary)',
                transition: 'color var(--duration-fast) var(--ease-out-quart)',
              }}
            >
              {isActive && (
                <div
                  className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full"
                  style={{ background: 'var(--color-accent)' }}
                />
              )}
              <span
                className="text-base leading-none"
                style={{ fontFamily: 'var(--font-display)', fontSize: '18px' }}
              >
                {tab.icon}
              </span>
              <span
                className="text-micro font-medium leading-none"
                style={{ fontFamily: 'var(--font-display)', letterSpacing: '0.02em' }}
              >
                {tab.label}
              </span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}

function PhoneFrame({ children }: { children: React.ReactNode }) {
  const [time, setTime] = useState('')
  const [battery] = useState(87)
  const [signal] = useState(4)

  useEffect(() => {
    const update = () => {
      const now = new Date()
      setTime(`${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`)
    }
    update()
    const t = setInterval(update, 1000)
    return () => clearInterval(t)
  }, [])

  return (
    <div
      style={{
        display: 'inline-block',
        width: '390px',
        height: '844px',
        position: 'relative',
        borderRadius: '54px',
        padding: '12px',
        background: 'linear-gradient(145deg, #2a2a2a 0%, #111111 50%, #1e1e1e 100%)',
        boxShadow: `
          0 0 0 1px rgba(255,255,255,0.08),
          0 0 0 2px rgba(0,0,0,0.9),
          inset 0 1px 1px rgba(255,255,255,0.06),
          inset 0 -1px 1px rgba(0,0,0,0.5),
          0 60px 120px rgba(0,0,0,0.5),
          0 15px 40px rgba(0,0,0,0.35)
        `,
        flexShrink: 0,
      }}
    >
      {/* Side buttons */}
      <div style={{ position: 'absolute', left: '-3px', top: '128px', width: '3px', height: '30px', borderRadius: '3px 0 0 3px', background: 'linear-gradient(90deg, #2c2c2c, #1a1a1a)', boxShadow: 'inset 1px 0 2px rgba(0,0,0,0.6)' }} />
      <div style={{ position: 'absolute', left: '-3px', top: '174px', width: '3px', height: '30px', borderRadius: '3px 0 0 3px', background: 'linear-gradient(90deg, #2c2c2c, #1a1a1a)', boxShadow: 'inset 1px 0 2px rgba(0,0,0,0.6)' }} />
      <div style={{ position: 'absolute', right: '-3px', top: '162px', width: '3px', height: '62px', borderRadius: '0 3px 3px 0', background: 'linear-gradient(270deg, #2c2c2c, #1a1a1a)', boxShadow: 'inset -1px 0 2px rgba(0,0,0,0.6)' }} />

      {/* Screen */}
      <div style={{ width: '100%', height: '100%', borderRadius: '44px', overflow: 'hidden', position: 'relative', background: '#000' }}>

        {/* Status bar */}
        <div style={{ position: 'absolute', top: '0px', left: '0px', right: '0px', height: '48px', display: 'flex', alignItems: 'flex-end', paddingLeft: '24px', paddingBottom: '8px', zIndex: 90, pointerEvents: 'none' }}>
          <span style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif', fontSize: '15px', fontWeight: '600', color: '#fff', letterSpacing: '-0.01em' }}>{time}</span>
        </div>

        {/* Dynamic Island */}
        <div style={{ position: 'absolute', top: '12px', left: '50%', transform: 'translateX(-50%)', width: '126px', height: '36px', borderRadius: '20px', background: '#000', zIndex: 100, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ position: 'absolute', left: '14px', width: '12px', height: '12px', borderRadius: '50%', background: '#0a0a12', boxShadow: 'inset 0 0 1px 0.5px rgba(40,40,60,0.8), 0 0 0 1px rgba(20,20,30,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(60,80,120,0.6) 0%, transparent 70%)', position: 'absolute', top: '2px', left: '2px' }} />
          </div>
          <div style={{ width: '36px', height: '4px', borderRadius: '2px', background: '#0a0a12', position: 'absolute' }} />
        </div>

        {/* Status icons right */}
        <div style={{ position: 'absolute', top: '0px', left: '0px', right: '0px', height: '48px', display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-end', paddingRight: '24px', paddingBottom: '8px', gap: '5px', zIndex: 90, pointerEvents: 'none' }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '2px', height: '12px', marginRight: '1px' }}>
            {[{h:4,act:true},{h:6,act:true},{h:8,act:true},{h:10,act:signal>=4}].map((bar,i) => (
              <div key={i} style={{ width: '3px', height: `${bar.h}px`, borderRadius: '1.5px', background: bar.act ? '#fff' : 'rgba(255,255,255,0.25)' }} />
            ))}
          </div>
          <svg width="16" height="12" viewBox="0 0 16 12" fill="none">
            <path d="M8 11C8.55 11 9 10.55 9 10V9.5C9 8.95 8.55 8.5 8 8.5C7.45 8.5 7 8.95 7 9.5V10C7 10.55 7.45 11 8 11Z" fill="#fff"/>
            <path d="M5.17 8.67C5.7 8.14 6.35 7.85 7.07 7.85H8.93C9.65 7.85 10.3 8.14 10.83 8.67C11.36 9.2 11.65 9.85 11.65 10.57C11.65 10.73 11.64 10.88 11.62 11H4.38C4.36 10.88 4.35 10.73 4.35 10.57C4.35 9.85 4.64 9.2 5.17 8.67Z" fill="#fff"/>
            <path d="M2.5 6.25C3.28 5.47 4.23 4.9 5.27 4.58C6.11 4.31 7 4.17 7.93 4.17C8.86 4.17 9.76 4.31 10.6 4.58C11.64 4.9 12.59 5.47 13.37 6.25C13.61 6.49 13.61 6.86 13.37 7.1C13.13 7.34 12.76 7.34 12.52 7.1C11.89 6.47 11.14 6.01 10.31 5.74C9.57 5.5 8.77 5.37 7.93 5.37C7.09 5.37 6.3 5.5 5.56 5.74C4.73 6.01 3.98 6.47 3.35 7.1C3.11 7.34 2.74 7.34 2.5 7.1C2.26 6.86 2.26 6.49 2.5 6.25Z" fill="#fff"/>
            <path d="M1.5 4.75C1.5 4.75 1.5 4.75 1.5 4.75C2.37 3.88 3.39 3.2 4.5 2.76C5.4 2.4 6.35 2.2 7.35 2.2C8.35 2.2 9.31 2.4 10.21 2.76C11.32 3.2 12.34 3.88 13.21 4.75C13.45 4.99 13.45 5.36 13.21 5.6C12.97 5.84 12.6 5.84 12.36 5.6C11.64 4.88 10.8 4.32 9.87 4C9.08 3.72 8.23 3.57 7.35 3.57C6.47 3.57 5.62 3.72 4.83 4C3.9 4.32 3.06 4.88 2.34 5.6C2.1 5.84 1.73 5.84 1.49 5.6C1.25 5.36 1.25 4.99 1.5 4.75Z" fill="#fff"/>
          </svg>
          <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
            <div style={{ width: '24px', height: '11px', borderRadius: '3px', border: '1px solid rgba(255,255,255,0.9)', padding: '1.5px', display: 'flex', alignItems: 'center' }}>
              <div style={{ width: `${Math.round(battery * 0.17)}px`, height: '100%', borderRadius: '1px', background: battery <= 20 ? '#ff3b30' : '#fff' }} />
            </div>
            <div style={{ width: '1.5px', height: '5px', borderRadius: '0 1.5px 1.5px 0', background: 'rgba(255,255,255,0.9)' }} />
          </div>
        </div>

        {/* App content */}
        <div className="h-full overflow-y-auto no-scrollbar" style={{ background: 'var(--color-bg)', paddingTop: '48px' }}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/diagnose" element={<Diagnose />} />
            <Route path="/skills" element={<Skills />} />
            <Route path="/history" element={<History />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
          <TabBar />
        </div>

        {/* Home indicator */}
        <div style={{ position: 'absolute', bottom: '8px', left: '50%', transform: 'translateX(-50%)', width: '126px', height: '5px', borderRadius: '2.5px', background: 'rgba(255,255,255,0.35)', zIndex: 90 }} />
      </div>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <div
        className="h-full overflow-y-auto"
        style={{ background: '#1a1a1a' }}
      >
        <div
          className="min-h-full flex flex-col items-center justify-center"
          style={{ background: '#1a1a1a' }}
        >
          {/* Phone */}
          <PhoneFrame>
            <div className="h-full" style={{ background: 'var(--color-bg)', color: 'var(--color-text-primary)' }}>
              <div className="h-full overflow-y-auto pb-20 no-scrollbar">
                <Routes>
                  <Route path="/" element={<Home />} />
                  <Route path="/diagnose" element={<Diagnose />} />
                  <Route path="/skills" element={<Skills />} />
                  <Route path="/history" element={<History />} />
                  <Route path="/settings" element={<Settings />} />
                </Routes>
              </div>
              <TabBar />
            </div>
          </PhoneFrame>
        </div>
      </div>
    </BrowserRouter>
  )
}
