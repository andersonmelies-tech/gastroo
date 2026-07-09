export default function BrandIcon({ size = 56 }: { size?: number }) {
  return (
    <div style={{
      width: size, height: size,
      background: 'var(--brand)',
      borderRadius: size * 0.286,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0, padding: size * 0.14,
      margin: '0 auto',
    }}>
      <svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%' }}>
        <line x1="10" y1="4" x2="10" y2="14" stroke="white" strokeWidth="2.2" strokeLinecap="round"/>
        <line x1="7"  y1="4" x2="7"  y2="10" stroke="white" strokeWidth="2.2" strokeLinecap="round"/>
        <line x1="13" y1="4" x2="13" y2="10" stroke="white" strokeWidth="2.2" strokeLinecap="round"/>
        <path d="M7 10 Q10 13.5 13 10" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round"/>
        <line x1="10" y1="13" x2="10" y2="28" stroke="white" strokeWidth="2.2" strokeLinecap="round"/>
        <path d="M22 4 C22 4 25 7 25 13 L22 15" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
        <line x1="22" y1="4" x2="22" y2="28" stroke="white" strokeWidth="2.2" strokeLinecap="round"/>
      </svg>
    </div>
  )
}
