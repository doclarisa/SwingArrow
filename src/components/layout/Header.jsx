import { NavLink } from 'react-router-dom';

function MarketStatusPill() {
  const now = new Date();
  const day = now.getUTCDay();
  const hours = now.getUTCHours();
  const minutes = now.getUTCMinutes();
  const totalMinutes = hours * 60 + minutes;

  // NYSE: Mon–Fri 14:30–21:00 UTC
  const isWeekday = day >= 1 && day <= 5;
  const isMarketHours = totalMinutes >= 870 && totalMinutes < 1260; // 14:30–21:00
  const isPreMarket = isWeekday && totalMinutes >= 540 && totalMinutes < 870; // 09:00–14:30
  const isAfterHours = isWeekday && totalMinutes >= 1260 && totalMinutes < 1440; // 21:00–24:00

  let label, color;
  if (isWeekday && isMarketHours) {
    label = 'Market Open';
    color = 'var(--green)';
  } else if (isPreMarket) {
    label = 'Pre-Market';
    color = 'var(--gold)';
  } else if (isAfterHours) {
    label = 'After Hours';
    color = 'var(--blue)';
  } else {
    label = 'Market Closed';
    color = 'var(--red)';
  }

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '3px 10px',
        borderRadius: '999px',
        border: `1px solid ${color}22`,
        background: `${color}18`,
        color,
        fontSize: '14px',
        fontWeight: 600,
        letterSpacing: '0.05em',
        fontFamily: "'JetBrains Mono', monospace",
      }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          background: color,
          flexShrink: 0,
          boxShadow: `0 0 6px ${color}`,
        }}
      />
      {label}
    </span>
  );
}

const navLinks = [
  { to: '/', label: 'Dashboard' },
  { to: '/screener', label: 'Screener' },
  { to: '/journal', label: 'Journal' },
  { to: '/calc', label: 'Calc' },
  { to: '/news', label: 'News' },
];

export default function Header() {
  return (
    <header
      style={{
        height: 56,
        background: 'var(--surface)',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        padding: '0 20px',
        gap: 32,
        flexShrink: 0,
        zIndex: 100,
      }}
    >
      {/* Logo */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          userSelect: 'none',
        }}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <path
            d="M3 17L9 11L13 15L21 7"
            stroke="var(--gold)"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M16 7H21V12"
            stroke="var(--gold)"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <span
          style={{
            fontFamily: "'DM Serif Display', serif",
            fontSize: 22,
            color: 'var(--text)',
            letterSpacing: '-0.02em',
          }}
        >
          Swing<span style={{ color: 'var(--gold)' }}>Arrow</span>
        </span>
      </div>

      {/* Nav links */}
      <nav style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        {navLinks.map(({ to, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            style={({ isActive }) => ({
              padding: '5px 12px',
              borderRadius: 6,
              fontSize: 15,
              fontWeight: 500,
              color: isActive ? 'var(--gold)' : '#c9b99a',
              background: isActive ? 'var(--surface2)' : 'transparent',
              transition: 'color 0.15s, background 0.15s',
            })}
          >
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Market status */}
      <MarketStatusPill />
    </header>
  );
}
