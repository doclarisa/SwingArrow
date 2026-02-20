const ALERTS = [
  {
    type: 'breakout',
    color: '#2ecc71',
    bg: 'rgba(46, 204, 113, 0.08)',
    border: 'rgba(46, 204, 113, 0.25)',
    icon: '↑',
    title: 'Breakout Detected',
    body: 'NVDA cleared pivot $175.40 on 2.3× average volume.',
    time: '2 min ago',
  },
  {
    type: 'scanner',
    color: '#c9a84c',
    bg: 'rgba(201, 168, 76, 0.08)',
    border: 'rgba(201, 168, 76, 0.25)',
    icon: '⟳',
    title: 'Scanner Hit',
    body: 'META entered Stage 2 base pattern — 7 weeks tight.',
    time: '18 min ago',
  },
  {
    type: 'news',
    color: '#3498db',
    bg: 'rgba(52, 152, 219, 0.08)',
    border: 'rgba(52, 152, 219, 0.25)',
    icon: '!',
    title: 'Catalyst News',
    body: 'NVDA awarded $4B DoD AI inference contract.',
    time: '1 hr ago',
  },
  {
    type: 'stop',
    color: '#e74c3c',
    bg: 'rgba(231, 76, 60, 0.08)',
    border: 'rgba(231, 76, 60, 0.25)',
    icon: '✕',
    title: 'Stop Alert',
    body: 'SMCI closed below 8-day EMA — consider trimming.',
    time: '3 hr ago',
  },
  {
    type: 'target',
    color: '#2ecc71',
    bg: 'rgba(46, 204, 113, 0.08)',
    border: 'rgba(46, 204, 113, 0.25)',
    icon: '★',
    title: 'Target Reached',
    body: 'AMD hit +20% target from $148 entry. Consider partial exit.',
    time: '5 hr ago',
  },
];

function AlertCard({ alert }) {
  return (
    <div
      style={{
        background: alert.bg,
        border: `1px solid ${alert.border}`,
        borderRadius: 6,
        padding: '8px 10px',
        marginBottom: 6,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 4 }}>
        <span
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 12,
            fontWeight: 700,
            color: alert.color,
            width: 16,
            textAlign: 'center',
            flexShrink: 0,
          }}
        >
          {alert.icon}
        </span>
        <span
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: alert.color,
          }}
        >
          {alert.title}
        </span>
        <span
          style={{
            marginLeft: 'auto',
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 11,
            color: 'var(--muted)',
            flexShrink: 0,
          }}
        >
          {alert.time}
        </span>
      </div>
      <p
        style={{
          margin: 0,
          fontSize: 12,
          color: 'var(--text)',
          lineHeight: 1.45,
          paddingLeft: 23,
        }}
      >
        {alert.body}
      </p>
    </div>
  );
}

export default function AlertsFeed() {
  return (
    <div style={{ padding: '14px 16px' }}>
      <span
        style={{
          fontFamily: "'DM Serif Display', serif",
          fontSize: 15,
          color: 'var(--gold)',
          letterSpacing: '0.03em',
          display: 'block',
          marginBottom: 10,
        }}
      >
        Alerts
      </span>
      {ALERTS.map((a, i) => (
        <AlertCard key={i} alert={a} />
      ))}
    </div>
  );
}
