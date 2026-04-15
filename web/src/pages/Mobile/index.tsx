export default function Mobile() {
  return (
    <div className="h-full flex items-center justify-center" style={{ background: '#ffffff' }}>
      <iframe
        src="http://localhost:4000"
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
