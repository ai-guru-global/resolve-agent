const MOBILE_APP_URL: string = import.meta.env.VITE_MOBILE_APP_URL ?? '/mobile/';

export default function Mobile() {
  return (
    <div className="h-full flex items-center justify-center" style={{ background: '#ffffff' }}>
      <iframe
        src={MOBILE_APP_URL}
        title="Mobile AI Ops"
        style={{
          width: '390px',
          height: '844px',
          border: 'none',
          overflow: 'hidden',
          display: 'block',
          borderRadius: '54px',
        }}
      />
    </div>
  )
}
