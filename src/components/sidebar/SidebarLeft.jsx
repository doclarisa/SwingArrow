import Watchlist from '../watchlist/Watchlist';
import StageMap from './StageMap';
import PortfolioSummary from './PortfolioSummary';

function Divider() {
  return (
    <div
      style={{
        height: 1,
        background: 'var(--border)',
        flexShrink: 0,
      }}
    />
  );
}

function SectionHeader({ label }) {
  return (
    <div
      style={{
        padding: '12px 14px 8px',
        flexShrink: 0,
      }}
    >
      <span
        style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 11,
          fontWeight: 600,
          color: 'var(--muted)',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
        }}
      >
        {label}
      </span>
    </div>
  );
}

export default function SidebarLeft() {
  return (
    <aside
      style={{
        width: 220,
        background: 'var(--surface)',
        borderRight: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        height: '100%',
      }}
    >
      {/* Watchlist header */}
      <SectionHeader label="Watchlist" />
      <Divider />

      {/* Watchlist rows — flex: 1 so it takes remaining space, then scrolls */}
      <Watchlist />

      <Divider />

      {/* Stage Map — fixed height, no scroll */}
      <div style={{ flexShrink: 0 }}>
        <StageMap />
      </div>

      <Divider />

      {/* Portfolio Summary — fixed height, no scroll */}
      <div style={{ flexShrink: 0 }}>
        <PortfolioSummary />
      </div>
    </aside>
  );
}
