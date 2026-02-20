import { useQuery } from '@tanstack/react-query';
import useTickerStore from '../../store/useTickerStore';
import { formatPrice } from '../../utils/formatters';
import { API_BASE } from '../../lib/api';

const TIMEFRAMES = ['1D', 'W', 'M', '3M', '1Y'];

function fmtPct(n) {
  if (n == null || isNaN(n)) return '—';
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(2)}%`;
}

export default function ChartHeader({ timeframe, onTimeframeChange }) {
  const { activeTicker } = useTickerStore();

  const { data: quote } = useQuery({
    queryKey: ['quote', activeTicker],
    queryFn: () => fetch(`${API_BASE}/api/quote/${activeTicker}`).then((r) => r.json()),
    staleTime: 30_000,
  });

  const isPositive = (quote?.changePercent ?? 0) >= 0;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 20px',
        borderBottom: '1px solid var(--border)',
        background: 'var(--surface)',
        flexShrink: 0,
        gap: 16,
        minWidth: 0,
      }}
    >
      {/* ── Left: ticker + company name + stage badge ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0 }}>
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontFamily: "'DM Serif Display', serif",
              fontSize: 28,
              color: 'var(--text)',
              lineHeight: 1,
            }}
          >
            {activeTicker}
          </div>
          <div
            style={{
              fontSize: 14,
              color: 'var(--muted)',
              marginTop: 3,
              lineHeight: 1,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {quote?.shortName ?? '—'}
          </div>
        </div>

        {/* Stage badge — hardcoded Stage 2 */}
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            padding: '4px 10px',
            borderRadius: 4,
            background: 'rgba(46, 204, 113, 0.12)',
            border: '1px solid rgba(46, 204, 113, 0.28)',
            color: '#2ecc71',
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 12,
            fontWeight: 600,
            flexShrink: 0,
          }}
        >
          Stage 2
        </span>
      </div>

      {/* ── Right: price + change + timeframe buttons ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexShrink: 0 }}>
        {/* Price + % change */}
        <div style={{ textAlign: 'right' }}>
          <div
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 24,
              color: 'var(--text)',
              lineHeight: 1,
            }}
          >
            {quote ? formatPrice(quote.price) : '—'}
          </div>
          <div
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 16,
              color: isPositive ? '#2ecc71' : '#e74c3c',
              marginTop: 3,
              lineHeight: 1,
            }}
          >
            {quote ? fmtPct(quote.changePercent) : '—'}
          </div>
        </div>

        {/* Timeframe selector */}
        <div style={{ display: 'flex', gap: 4 }}>
          {TIMEFRAMES.map((tf) => {
            const active = timeframe === tf;
            return (
              <button
                key={tf}
                onClick={() => onTimeframeChange(tf)}
                style={{
                  padding: '5px 10px',
                  borderRadius: 5,
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 13,
                  fontWeight: 600,
                  background: active ? 'var(--gold)' : 'transparent',
                  color: active ? '#0a0d0f' : 'var(--muted)',
                  border: `1px solid ${active ? 'var(--gold)' : 'var(--border)'}`,
                  transition: 'all 0.12s',
                }}
              >
                {tf}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
