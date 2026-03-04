import { useQuery } from '@tanstack/react-query';
import useTickerStore from '../../store/useTickerStore';
import { API_BASE } from '../../lib/api';

// ── Color maps ─────────────────────────────────────────────────────────────────

const TREND_COLOR = {
  green:  '#2ecc71',
  yellow: '#c9a84c',
  orange: '#e67e22',
  red:    '#e74c3c',
};

const VERDICT_COLOR = {
  actionable: '#2ecc71',
  watch:      '#c9a84c',
  wait:       '#e67e22',
  avoid:      '#e74c3c',
};

const VOL_LABEL = {
  bullish: 'Demand in control',
  bearish: 'Supply pressure',
  neutral: 'Volume balanced',
};
const VOL_ICON  = { bullish: '▲', bearish: '▼', neutral: '—' };
const VOL_COLOR = { bullish: '#2ecc71', bearish: '#e74c3c', neutral: 'var(--muted)' };

// ── Shared sub-components ──────────────────────────────────────────────────────

function Skeleton({ width = 60, height = 12 }) {
  return (
    <span
      className="skeleton"
      style={{ display: 'inline-block', width, height, borderRadius: 3 }}
    />
  );
}

function DataRow({ icon, iconColor, label, detail, noBorder = false }) {
  return (
    <div
      style={{
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'space-between',
        padding:        '6px 0',
        borderBottom:   noBorder ? 'none' : '1px solid var(--border)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize:   14,
            fontWeight: 700,
            color:      iconColor,
            width:      16,
            textAlign:  'center',
            flexShrink: 0,
          }}
        >
          {icon}
        </span>
        <span style={{ fontSize: 13, color: 'var(--text)' }}>{label}</span>
      </div>
      {detail != null && (
        <span
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize:   12,
            color:      'var(--muted)',
            flexShrink: 0,
          }}
        >
          {detail}
        </span>
      )}
    </div>
  );
}

function Chip({ label, color }) {
  return (
    <span
      style={{
        display:    'inline-flex',
        alignItems: 'center',
        padding:    '2px 7px',
        borderRadius: 3,
        background: `${color}18`,
        border:     `1px solid ${color}40`,
        color,
        fontFamily: "'JetBrains Mono', monospace",
        fontSize:   11,
        fontWeight: 600,
        marginRight: 4,
      }}
    >
      {label}
    </span>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function PriceActionPanel() {
  const { activeTicker } = useTickerStore();

  const { data, isLoading } = useQuery({
    queryKey: ['price-action', activeTicker],
    queryFn:  () =>
      fetch(`${API_BASE}/api/price-action/${activeTicker}`)
        .then((r) => r.json()),
    staleTime: 60_000,
    retry:     1,
  });

  // ── Derived display values ──────────────────────────────────────────────────

  const trendCtx  = data?.trendContext;
  const vol       = data?.volumeAnalysis;
  const patterns  = data?.candlePatterns ?? [];
  const topPat    = patterns[0] ?? null;
  const score     = data?.score;
  const verdict   = data?.verdict;

  const vt         = vol?.volumeTrend ?? 'neutral';
  const trendColor = trendCtx ? (TREND_COLOR[trendCtx.color] ?? 'var(--muted)') : 'var(--muted)';

  const scoreColor = score == null ? 'var(--muted)'
    : score >= 75 ? '#2ecc71'
    : score >= 55 ? '#c9a84c'
    : score >= 35 ? '#e67e22'
    : '#e74c3c';

  const patternIcon  = topPat?.bullishOrBearish === 'bullish' ? '↑'
                     : topPat?.bullishOrBearish === 'bearish' ? '↓'
                     : '—';
  const patternColor = topPat?.bullishOrBearish === 'bullish' ? '#2ecc71'
                     : topPat?.bullishOrBearish === 'bearish' ? '#e74c3c'
                     : 'var(--muted)';

  const hasActiveSignal = vol && (vol.pocketPivot || vol.volumeDryUp || vol.climaxVolume);

  // ── Loading skeleton ────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div style={{ padding: '14px 16px' }}>
        <div
          style={{
            display:       'flex',
            alignItems:    'center',
            justifyContent:'space-between',
            marginBottom:  10,
          }}
        >
          <span
            style={{
              fontFamily:    "'DM Serif Display', serif",
              fontSize:      15,
              color:         'var(--gold)',
              letterSpacing: '0.03em',
            }}
          >
            Price Action
          </span>
          <Skeleton width={24} height={18} />
        </div>
        {[80, 130, 100, 90].map((w, i) => (
          <div
            key={i}
            style={{
              display:      'flex',
              alignItems:   'center',
              gap:          8,
              padding:      '6px 0',
              borderBottom: '1px solid var(--border)',
            }}
          >
            <Skeleton width={14} height={14} />
            <Skeleton width={w} />
          </div>
        ))}
      </div>
    );
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div style={{ padding: '14px 16px' }}>

      {/* ── Header: title + composite score ── */}
      <div
        style={{
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'space-between',
          marginBottom:   10,
        }}
      >
        <span
          style={{
            fontFamily:    "'DM Serif Display', serif",
            fontSize:      15,
            color:         'var(--gold)',
            letterSpacing: '0.03em',
          }}
        >
          Price Action
        </span>
        <span
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize:   18,
            fontWeight: 700,
            color:      scoreColor,
            minWidth:   32,
            textAlign:  'right',
          }}
        >
          {score != null ? score : '—'}
        </span>
      </div>

      {/* ── 1. Trend context ── */}
      <div
        style={{
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'space-between',
          padding:        '6px 0',
          borderBottom:   '1px solid var(--border)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span
            style={{
              display:    'inline-block',
              width:      8,
              height:     8,
              borderRadius: '50%',
              background: trendColor,
              flexShrink: 0,
              marginLeft: 4,
            }}
          />
          <span style={{ fontSize: 13, color: 'var(--text)' }}>
            {trendCtx?.humanReadableLabel ?? '—'}
          </span>
        </div>
        <span
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize:   12,
            color:      'var(--muted)',
          }}
        >
          {trendCtx?.vs50sma ?? '—'}
        </span>
      </div>

      {/* ── 2. Volume verdict ── */}
      <DataRow
        icon={VOL_ICON[vt]}
        iconColor={VOL_COLOR[vt]}
        label={VOL_LABEL[vt]}
        detail={vol ? `${vol.accumulationDays}A / ${vol.distributionDays}D` : null}
      />

      {/* ── 3. Active volume signal chips (only when present) ── */}
      {hasActiveSignal && (
        <div
          style={{
            display:      'flex',
            flexWrap:     'wrap',
            paddingTop:   6,
            paddingBottom: 6,
            borderBottom: '1px solid var(--border)',
          }}
        >
          {vol.pocketPivot  && <Chip label="Pocket Pivot"  color="#2ecc71" />}
          {vol.volumeDryUp  && <Chip label="Volume Dry-Up" color="#2ecc71" />}
          {vol.climaxVolume && <Chip label="Climax Volume" color="#e74c3c" />}
        </div>
      )}

      {/* ── 4. Most recent candle pattern ── */}
      <DataRow
        icon={patternIcon}
        iconColor={patternColor}
        label={topPat ? topPat.patternName : 'No pattern detected'}
        detail={topPat ? topPat.confidence : null}
      />

      {/* ── 5. Verdict badge ── */}
      <div
        style={{
          marginTop:   12,
          padding:     '8px 12px',
          borderRadius: 5,
          background:  verdict ? `${VERDICT_COLOR[verdict]}14` : 'var(--surface2)',
          border:      `1px solid ${verdict ? VERDICT_COLOR[verdict] + '40' : 'var(--border)'}`,
          display:     'flex',
          alignItems:  'center',
          justifyContent: 'space-between',
        }}
      >
        <span
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize:   13,
            fontWeight: 700,
            color:      verdict ? VERDICT_COLOR[verdict] : 'var(--muted)',
          }}
        >
          {data?.verdictLabel ?? '—'}
        </span>
        <span
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize:   12,
            color:      'var(--muted)',
          }}
        >
          {score != null ? `${score}/100` : ''}
        </span>
      </div>
    </div>
  );
}
