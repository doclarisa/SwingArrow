const PLACEHOLDER_INDICES = [
  { symbol: 'SPY', price: '592.14', change: '+0.82%', positive: true },
  { symbol: 'QQQ', price: '511.37', change: '+1.24%', positive: true },
  { symbol: 'IWM', price: '218.55', change: '-0.31%', positive: false },
  { symbol: 'DIA', price: '438.90', change: '+0.47%', positive: true },
  { symbol: 'VIX', price: '14.82', change: '-3.10%', positive: false },
  { symbol: 'BTC', price: '67,240', change: '+2.18%', positive: true },
  { symbol: 'GLD', price: '231.60', change: '+0.55%', positive: true },
];

export default function BottomBar() {
  return (
    <footer
      style={{
        height: 40,
        background: 'var(--surface)',
        borderTop: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        padding: '0 20px',
        gap: 28,
        flexShrink: 0,
        overflow: 'hidden',
      }}
    >
      {PLACEHOLDER_INDICES.map(({ symbol, price, change, positive }) => (
        <div
          key={symbol}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 7,
            flexShrink: 0,
          }}
        >
          <span
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: 'var(--muted)',
              letterSpacing: '0.04em',
              fontFamily: "'JetBrains Mono', monospace",
            }}
          >
            {symbol}
          </span>
          <span
            style={{
              fontSize: 14,
              color: 'var(--text)',
              fontFamily: "'JetBrains Mono', monospace",
            }}
          >
            {price}
          </span>
          <span
            style={{
              fontSize: 14,
              color: positive ? '#2ecc71' : '#e74c3c',
              fontFamily: "'JetBrains Mono', monospace",
            }}
          >
            {change}
          </span>
        </div>
      ))}

      {/* Spacer + timestamp */}
      <div style={{ flex: 1 }} />
      <span
        style={{
          fontSize: 10,
          color: 'var(--muted)',
          fontFamily: "'JetBrains Mono', monospace",
          flexShrink: 0,
        }}
      >
        Placeholder data — live feed coming soon
      </span>
    </footer>
  );
}
