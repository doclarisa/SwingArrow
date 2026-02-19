const STAGES = [
  { label: 'Stage 1', pct: 18, color: 'var(--blue)' },
  { label: 'Stage 2', pct: 62, color: 'var(--green)' },
  { label: 'Stage 3', pct: 12, color: 'var(--gold)' },
  { label: 'Stage 4', pct:  8, color: 'var(--red)' },
];

export default function StageMap() {
  return (
    <div style={{ padding: '14px 14px 12px' }}>
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
        Market Stage Map
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {STAGES.map(({ label, pct, color }) => (
          <div key={label}>
            {/* Row: badge left, pct right */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 4,
              }}
            >
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 12,
                  color,
                  fontWeight: 600,
                }}
              >
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: color,
                    flexShrink: 0,
                  }}
                />
                {label}
              </span>
              <span
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 12,
                  color: 'var(--text)',
                  fontWeight: 600,
                }}
              >
                {pct}%
              </span>
            </div>

            {/* Progress bar */}
            <div
              style={{
                height: 3,
                background: 'var(--border)',
                borderRadius: 2,
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  height: '100%',
                  width: `${pct}%`,
                  background: color,
                  borderRadius: 2,
                  opacity: 0.8,
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
