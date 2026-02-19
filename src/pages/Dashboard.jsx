const COLUMNS = [
  { label: 'Watchlist', sub: 'coming in Phase 2', width: 220 },
  { label: 'Chart',     sub: 'coming in Phase 2', width: null  },
  { label: 'Analysis',  sub: 'coming in Phase 2', width: 280 },
];

function PlaceholderCol({ label, sub, style }) {
  return (
    <div
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        ...style,
      }}
    >
      <span
        style={{
          color: 'var(--gold)',
          fontFamily: "'DM Serif Display', serif",
          fontSize: 22,
          letterSpacing: '0.02em',
        }}
      >
        {label}
      </span>
      <span
        style={{
          color: 'var(--muted)',
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 14,
        }}
      >
        {sub}
      </span>
    </div>
  );
}

export default function Dashboard() {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'grid',
        gridTemplateColumns: '220px 1fr 280px',
        gridTemplateRows: '1fr',
        overflow: 'hidden',
        minHeight: 0,
      }}
    >
      <PlaceholderCol label="Watchlist" sub="coming in Phase 2" style={{ borderRight: 'none' }} />
      <PlaceholderCol label="Chart"     sub="coming in Phase 2" style={{ borderLeft: 'none', borderRight: 'none' }} />
      <PlaceholderCol label="Analysis"  sub="coming in Phase 2" style={{ borderLeft: 'none' }} />
    </div>
  );
}
