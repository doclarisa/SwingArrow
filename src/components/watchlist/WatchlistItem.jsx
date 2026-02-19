import useTickerStore from '../../store/useTickerStore';
import { formatPrice } from '../../utils/formatters';

function formatChangePercent(n) {
  if (n == null || isNaN(n)) return '—';
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(2)}%`;
}

export default function WatchlistItem({ ticker, data, error }) {
  const { activeTicker, setActiveTicker } = useTickerStore();
  const isActive = activeTicker === ticker;
  const isPositive = data?.changePercent >= 0;

  return (
    <button
      onClick={() => setActiveTicker(ticker)}
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr auto',
        gridTemplateRows: 'auto auto',
        columnGap: 8,
        rowGap: 2,
        width: '100%',
        padding: '10px 14px 10px 12px',
        background: isActive ? 'var(--surface2)' : 'transparent',
        borderLeft: `3px solid ${isActive ? 'var(--gold)' : 'transparent'}`,
        borderRight: 'none',
        borderTop: 'none',
        borderBottom: '1px solid var(--border)',
        cursor: 'pointer',
        textAlign: 'left',
        transition: 'background 0.12s',
      }}
    >
      {/* Ticker symbol — top left */}
      <span
        style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 15,
          fontWeight: 700,
          color: error ? 'var(--red)' : 'var(--text)',
          lineHeight: 1.3,
        }}
      >
        {ticker}
      </span>

      {/* Price — top right */}
      <span
        style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 15,
          fontWeight: 500,
          color: error ? 'var(--muted)' : 'var(--text)',
          lineHeight: 1.3,
          textAlign: 'right',
        }}
      >
        {error ? '—' : (data ? formatPrice(data.price) : '—')}
      </span>

      {/* Company name — bottom left */}
      <span
        style={{
          fontSize: 13,
          color: error ? 'var(--red)' : 'var(--muted)',
          lineHeight: 1.3,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {error ? 'unavailable' : (data?.shortName ?? '')}
      </span>

      {/* % Change — bottom right */}
      <span
        style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 14,
          color: error
            ? 'var(--muted)'
            : (data ? (isPositive ? '#2ecc71' : '#e74c3c') : 'var(--muted)'),
          lineHeight: 1.3,
          textAlign: 'right',
        }}
      >
        {error ? '—' : (data ? formatChangePercent(data.changePercent) : '—')}
      </span>
    </button>
  );
}
