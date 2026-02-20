import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import useTickerStore from '../../store/useTickerStore';
import { calculatePositionSize } from '../../utils/tradingCalc';
import { formatPrice, formatCurrency } from '../../utils/formatters';

function Row({ label, value, valueColor, mono = true }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'baseline',
        padding: '5px 0',
        borderBottom: '1px solid var(--border)',
      }}
    >
      <span style={{ fontSize: 13, color: 'var(--muted)' }}>{label}</span>
      <span
        style={{
          fontFamily: mono ? "'JetBrains Mono', monospace" : undefined,
          fontSize: 13,
          color: valueColor || 'var(--text)',
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
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '5px 0',
        borderBottom: '1px solid var(--border)',
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
            width: 80,
            background: 'var(--surface2)',
            border: '1px solid var(--border)',
            borderRadius: 4,
            color: 'var(--text)',
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 13,
            padding: '2px 6px',
            textAlign: 'right',
            outline: 'none',
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

export default function TradePlan() {
  const { activeTicker } = useTickerStore();
  const [accountSize, setAccountSize] = useState(50000);
  const [riskPct, setRiskPct]         = useState(2);

  const { data: quote } = useQuery({
    queryKey: ['quote', activeTicker],
    staleTime: 30_000,
  });

  const price = quote?.price;

  // Auto-calculated levels
  const entry   = price  != null ? price  * 1.005 : null;
  const stop    = entry  != null ? entry  * 0.925 : null;
  const target1 = entry  != null ? entry  * 1.15  : null;
  const target2 = entry  != null ? entry  * 1.25  : null;

  // Position sizing
  const sizing = entry != null && stop != null
    ? calculatePositionSize(accountSize, riskPct / 100, entry, stop)
    : null;

  // R:R ratio
  const rr1 = entry != null && stop != null && target1 != null
    ? (target1 - entry) / (entry - stop)
    : null;
  const rr2 = entry != null && stop != null && target2 != null
    ? (target2 - entry) / (entry - stop)
    : null;

  // R:R bar width (capped at 100%)
  const barPct1 = rr1 != null ? Math.min(rr1 / 3, 1) * 100 : 0;
  const barPct2 = rr2 != null ? Math.min(rr2 / 3, 1) * 100 : 0;

  const fmt = (n) => (n != null ? formatPrice(n) : '—');

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
        Trade Plan
      </span>

      {/* Account inputs */}
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

      {/* Price levels */}
      <div style={{ marginTop: 6 }}>
        <Row label="Current"  value={fmt(price)}   />
        <Row label="Entry"    value={fmt(entry)}   valueColor="var(--gold)" />
        <Row label="Stop"     value={fmt(stop)}    valueColor="#e74c3c" />
        <Row label="Target 1" value={fmt(target1)} valueColor="#2ecc71" />
        <Row label="Target 2" value={fmt(target2)} valueColor="#2ecc71" />
      </div>

      {/* Position sizing */}
      {sizing && (
        <div style={{ marginTop: 4 }}>
          <Row label="Shares"      value={sizing.shares.toLocaleString()} />
          <Row label="Position $"  value={formatCurrency(sizing.positionValue)} />
          <Row label="Risk $"      value={formatCurrency(sizing.riskDollars)} valueColor="#e74c3c" />
        </div>
      )}

      {/* R:R bars */}
      {rr1 != null && (
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
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: 12,
                  fontFamily: "'JetBrains Mono', monospace",
                  color: 'var(--muted)',
                  marginBottom: 3,
                }}
              >
                <span>{label}</span>
              </div>
              <div
                style={{
                  height: 5,
                  borderRadius: 3,
                  background: 'var(--border)',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    height: '100%',
                    width: `${w}%`,
                    borderRadius: 3,
                    background: 'linear-gradient(90deg, var(--gold), #2ecc71)',
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
