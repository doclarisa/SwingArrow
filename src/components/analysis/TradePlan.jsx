import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import useTickerStore from '../../store/useTickerStore';
import { calculatePositionSize } from '../../utils/tradingCalc';
import { formatPrice, formatCurrency } from '../../utils/formatters';
import { API_BASE } from '../../lib/api';

// ── Shared sub-components ──────────────────────────────────────────────────────

function Row({ label, value, valueColor, mono = true, dimmed = false }) {
  return (
    <div
      style={{
        display:        'flex',
        justifyContent: 'space-between',
        alignItems:     'baseline',
        padding:        '5px 0',
        borderBottom:   '1px solid var(--border)',
        opacity:        dimmed ? 0.4 : 1,
      }}
    >
      <span style={{ fontSize: 13, color: 'var(--muted)' }}>{label}</span>
      <span
        style={{
          fontFamily: mono ? "'JetBrains Mono', monospace" : undefined,
          fontSize:   13,
          color:      dimmed ? 'var(--muted)' : (valueColor || 'var(--text)'),
          fontWeight: 600,
        }}
      >
        {value}
      </span>
    </div>
  );
}

function InputRow({ label, value, onChange, prefix, suffix }) {
  return (
    <div
      style={{
        display:        'flex',
        justifyContent: 'space-between',
        alignItems:     'center',
        padding:        '5px 0',
        borderBottom:   '1px solid var(--border)',
      }}
    >
      <span style={{ fontSize: 13, color: 'var(--muted)' }}>{label}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        {prefix && (
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, color: 'var(--muted)' }}>
            {prefix}
          </span>
        )}
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          style={{
            width:      80,
            background: 'var(--surface2)',
            border:     '1px solid var(--border)',
            borderRadius: 4,
            color:      'var(--text)',
            fontFamily: "'JetBrains Mono', monospace",
            fontSize:   13,
            padding:    '2px 6px',
            textAlign:  'right',
            outline:    'none',
          }}
          min={0}
        />
        {suffix && (
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, color: 'var(--muted)' }}>
            {suffix}
          </span>
        )}
      </div>
    </div>
  );
}

// ── State-specific UI fragments ────────────────────────────────────────────────

// 'caution' — yellow banner injected above the price-level rows
function CautionBanner() {
  return (
    <div
      style={{
        display:      'flex',
        alignItems:   'center',
        gap:          7,
        margin:       '8px 0',
        padding:      '7px 10px',
        borderRadius: 4,
        background:   '#c9a84c18',
        border:       '1px solid #c9a84c40',
      }}
    >
      <span style={{ fontSize: 14, flexShrink: 0 }}>⚠</span>
      <span
        style={{
          fontSize:   12,
          color:      '#c9a84c',
          lineHeight: 1.4,
        }}
      >
        Mixed signals — consider reducing position size
      </span>
    </div>
  );
}

// 'monitor' — note shown in place of position sizing
function MonitorNote() {
  return (
    <div
      style={{
        marginTop:    8,
        padding:      '7px 10px',
        borderRadius: 4,
        background:   'var(--surface2)',
        border:       '1px solid var(--border)',
      }}
    >
      <span
        style={{
          fontSize:   12,
          color:      'var(--muted)',
          fontStyle:  'italic',
          lineHeight: 1.4,
        }}
      >
        Awaiting valid setup — levels shown for reference only
      </span>
    </div>
  );
}

// 'suppressed' — replaces the entire body below the header
function SuppressedCard({ reason }) {
  return (
    <div
      style={{
        marginTop:    10,
        padding:      '12px',
        borderRadius: 5,
        background:   '#e74c3c0e',
        border:       '1px solid #e74c3c40',
      }}
    >
      <div
        style={{
          fontFamily:   "'JetBrains Mono', monospace",
          fontSize:     11,
          fontWeight:   700,
          color:        '#e74c3c',
          letterSpacing:'0.06em',
          marginBottom: 8,
        }}
      >
        SETUP SUPPRESSED
      </div>
      <div
        style={{
          fontSize:     12,
          color:        'var(--text)',
          lineHeight:   1.55,
          marginBottom: 10,
        }}
      >
        {reason ?? 'This stock does not currently meet the minimum criteria for a trade plan.'}
      </div>
      <div
        style={{
          fontSize:  11,
          color:     'var(--muted)',
          fontStyle: 'italic',
        }}
      >
        Add to watchlist and revisit when conditions improve.
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function TradePlan() {
  const { activeTicker } = useTickerStore();
  const [accountSize, setAccountSize] = useState(50000);
  const [riskPct, setRiskPct]         = useState(2);

  // Quote for live price
  const { data: quote } = useQuery({
    queryKey: ['quote', activeTicker],
    staleTime: 30_000,
  });

  // Read tradePlanState from the same cache key PriceActionPanel populates.
  // React Query deduplicates the request — no extra network call is made here.
  const { data: paData } = useQuery({
    queryKey: ['price-action', activeTicker],
    queryFn:  () =>
      fetch(`${API_BASE}/api/price-action/${activeTicker}`)
        .then((r) => r.json()),
    staleTime: 60_000,
    retry:     1,
  });

  // Default to 'full' while loading so nothing is hidden on first render
  const tradePlanState    = paData?.tradePlanState    ?? 'full';
  const suppressionReason = paData?.suppressionReason ?? null;

  // ── Computed levels ────────────────────────────────────────────────────────

  const price   = quote?.price;
  const entry   = price  != null ? price  * 1.005 : null;
  const stop    = entry  != null ? entry  * 0.925 : null;
  const target1 = entry  != null ? entry  * 1.15  : null;
  const target2 = entry  != null ? entry  * 1.25  : null;

  const sizing = entry != null && stop != null
    ? calculatePositionSize(accountSize, riskPct / 100, entry, stop)
    : null;

  const rr1 = entry != null && stop != null && target1 != null
    ? (target1 - entry) / (entry - stop) : null;
  const rr2 = entry != null && stop != null && target2 != null
    ? (target2 - entry) / (entry - stop) : null;

  const barPct1 = rr1 != null ? Math.min(rr1 / 3, 1) * 100 : 0;
  const barPct2 = rr2 != null ? Math.min(rr2 / 3, 1) * 100 : 0;

  const fmt = (n) => (n != null ? formatPrice(n) : '—');

  // For 'monitor': show computed values but dim the unconfirmed fields
  const dimLevels = tradePlanState === 'monitor';

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div style={{ padding: '14px 16px' }}>
      {/* Header — always visible */}
      <span
        style={{
          fontFamily:    "'DM Serif Display', serif",
          fontSize:      15,
          color:         'var(--gold)',
          letterSpacing: '0.03em',
          display:       'block',
          marginBottom:  10,
        }}
      >
        Trade Plan
      </span>

      {/* ── SUPPRESSED: replace body with warning card ── */}
      {tradePlanState === 'suppressed' && (
        <SuppressedCard reason={suppressionReason} />
      )}

      {/* ── ALL OTHER STATES: show the plan (full / caution / monitor) ── */}
      {tradePlanState !== 'suppressed' && (
        <>
          {/* Account inputs — always interactive */}
          <InputRow
            label="Account Size"
            value={accountSize}
            onChange={setAccountSize}
            prefix="$"
          />
          <InputRow
            label="Risk Per Trade"
            value={riskPct}
            onChange={setRiskPct}
            suffix="%"
          />

          {/* 'caution' banner — shown above price levels */}
          {tradePlanState === 'caution' && <CautionBanner />}

          {/* Price levels */}
          <div style={{ marginTop: tradePlanState === 'caution' ? 0 : 6 }}>
            <Row label="Current"  value={fmt(price)}   />
            <Row label="Entry"    value={fmt(entry)}   valueColor="var(--gold)" dimmed={dimLevels} />
            <Row label="Stop"     value={fmt(stop)}    valueColor="#e74c3c"     dimmed={dimLevels} />
            <Row label="Target 1" value={fmt(target1)} valueColor="#2ecc71"     dimmed={dimLevels} />
            <Row label="Target 2" value={fmt(target2)} valueColor="#2ecc71"     dimmed={dimLevels} />
          </div>

          {/* 'monitor': suppress sizing + R:R; show note instead */}
          {tradePlanState === 'monitor' && <MonitorNote />}

          {/* 'full' / 'caution': show position sizing */}
          {tradePlanState !== 'monitor' && sizing && (
            <div style={{ marginTop: 4 }}>
              <Row label="Shares"     value={sizing.shares.toLocaleString()} />
              <Row label="Position $" value={formatCurrency(sizing.positionValue)} />
              <Row label="Risk $"     value={formatCurrency(sizing.riskDollars)} valueColor="#e74c3c" />
            </div>
          )}

          {/* 'full' / 'caution': show R:R bars */}
          {tradePlanState !== 'monitor' && rr1 != null && (
            <div style={{ marginTop: 10 }}>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 6 }}>
                Risk / Reward
              </div>
              {[
                { label: `T1  1:${rr1.toFixed(2)}`, pct: barPct1 },
                { label: `T2  1:${rr2?.toFixed(2) ?? '—'}`, pct: barPct2 },
              ].map(({ label, pct: w }) => (
                <div key={label} style={{ marginBottom: 6 }}>
                  <div
                    style={{
                      display:        'flex',
                      justifyContent: 'space-between',
                      fontSize:       12,
                      fontFamily:     "'JetBrains Mono', monospace",
                      color:          'var(--muted)',
                      marginBottom:   3,
                    }}
                  >
                    <span>{label}</span>
                  </div>
                  <div
                    style={{
                      height:     5,
                      borderRadius: 3,
                      background: 'var(--border)',
                      overflow:   'hidden',
                    }}
                  >
                    <div
                      style={{
                        height:     '100%',
                        width:      `${w}%`,
                        borderRadius: 3,
                        background: 'linear-gradient(90deg, var(--gold), #2ecc71)',
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
