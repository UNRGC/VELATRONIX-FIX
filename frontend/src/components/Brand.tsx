/**
 * Identidad Velatronix. La marca es un trazo tipo señal que forma una "V" con un
 * punto de señal (LED) — coherente con el lenguaje "instrumento de diagnóstico".
 * La "V" usa `currentColor` (se adapta a fondo claro/oscuro); el punto es el teal de marca.
 */
export function Logo({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" aria-hidden="true" style={{ display: 'block', flexShrink: 0 }}>
      <path d="M8 11 L20 30 L32 11" stroke="currentColor" strokeWidth="4.2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="32" cy="11" r="3.4" fill="var(--accent)" />
    </svg>
  );
}

export function Wordmark({ size = 18 }: { size?: number }) {
  return (
    <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: size, letterSpacing: '-0.01em' }}>
      Vela<span style={{ color: 'var(--accent)' }}>tronix</span>
    </span>
  );
}

export function Brand({ sub, logoSize = 28, wordSize = 18 }: { sub?: string; logoSize?: number; wordSize?: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <Logo size={logoSize} />
      <div style={{ lineHeight: 1.15 }}>
        <Wordmark size={wordSize} />
        {sub && (
          <div style={{ fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--accent)', marginTop: 1 }}>
            {sub}
          </div>
        )}
      </div>
    </div>
  );
}
