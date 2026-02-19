const INVESTED_PCT = 78;
const CASH_PCT = 22;

export default function PortfolioSummary() {
  return (
    <div style={{ padding: '14px 14px 16px' }}>
      {/* Section label */}
      <p
        style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 11,
          color: 'var(--muted)',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          marginBottom: 10,
        }}
      >
        Portfolio
      </p>

      {/* Total value */}
      <p
        style={{
          fontFamily: "'DM Serif Display', serif",
          fontSize: 20,
          color: 'var(--text)',
          lineHeight: 1.2,
          marginBottom: 4,
        }}
      >
        $124,380
      </p>

      {/* Today's gain */}
      <p
        style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 14,
          color: '#2ecc71',
          marginBottom: 12,
        }}
      >
        +$4,210 today
      </p>

      {/* Exposure label row */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 5,
        }}
      >
        <span
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 11,
            color: 'var(--muted)',
          }}
        >
          Invested
        </span>
        <span
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 11,
            color: 'var(--muted)',
          }}
        >
          Cash
        </span>
      </div>

      {/* Exposure bar */}
      <div
        style={{
          height: 6,
          borderRadius: 3,
          background: 'var(--border)',
          overflow: 'hidden',
          display: 'flex',
        }}
      >
        <div
          style={{
            width: `${INVESTED_PCT}%`,
            background: 'linear-gradient(90deg, var(--gold), var(--green))',
            borderRadius: '3px 0 0 3px',
          }}
        />
        <div
          style={{
            width: `${CASH_PCT}%`,
            background: 'var(--surface2)',
          }}
        />
      </div>

      {/* Percentage labels */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginTop: 4,
        }}
      >
        <span
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 11,
            color: 'var(--gold)',
          }}
        >
          {INVESTED_PCT}%
        </span>
        <span
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 11,
            color: 'var(--muted)',
          }}
        >
          {CASH_PCT}%
        </span>
      </div>
    </div>
  );
}
