import { useState, useEffect } from 'react'

// Shown immediately while the API loads (avoids blank bar on first paint)
const FALLBACK = [
  { symbol: 'SPY', price: null, changePercent: null },
  { symbol: 'QQQ', price: null, changePercent: null },
  { symbol: 'IWM', price: null, changePercent: null },
  { symbol: 'DIA', price: null, changePercent: null },
  { symbol: 'VIX', price: null, changePercent: null },
  { symbol: 'GLD', price: null, changePercent: null },
  { symbol: 'BTC', price: null, changePercent: null },
]

function fmtPrice(symbol, price) {
  if (price == null) return '—'
  if (symbol === 'BTC') return price.toLocaleString('en-US', { maximumFractionDigits: 0 })
  return price.toFixed(2)
}

export default function BottomBar() {
  const [indices,   setIndices]   = useState(FALLBACK)
  const [condition, setCondition] = useState(null)

  // Live index quotes — refresh every 60 s
  useEffect(() => {
    async function load() {
      try {
        const r = await fetch('/api/indices')
        if (r.ok) setIndices(await r.json())
      } catch { /* keep previous data on error */ }
    }
    load()
    const id = setInterval(load, 60_000)
    return () => clearInterval(id)
  }, [])

  // Market condition — refresh every 5 min (slow endpoint, hits 200d of data)
  useEffect(() => {
    async function load() {
      try {
        const r = await fetch('/api/market-condition')
        if (r.ok) setCondition(await r.json())
      } catch { /* keep previous */ }
    }
    load()
    const id = setInterval(load, 5 * 60_000)
    return () => clearInterval(id)
  }, [])

  const conditionColor =
    condition?.condition === 'CONFIRMED UPTREND'       ? 'var(--green)'
    : condition?.condition === 'UPTREND UNDER PRESSURE' ? 'var(--gold)'
    : condition?.condition === 'MARKET IN CORRECTION'   ? 'var(--red)'
    : 'var(--muted)'

  return (
    <footer
      style={{
        height: 40,
        background: 'var(--surface)',
        borderTop: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        padding: '0 20px',
        gap: 28,
        flexShrink: 0,
        overflow: 'hidden',
      }}
    >
      {indices.map(({ symbol, price, changePercent }) => {
        const positive = changePercent == null || changePercent >= 0
        return (
          <div key={symbol} style={{ display: 'flex', alignItems: 'center', gap: 7, flexShrink: 0 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--muted)', fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.04em' }}>
              {symbol}
            </span>
            <span style={{ fontSize: 13, color: 'var(--text)', fontFamily: "'JetBrains Mono', monospace" }}>
              {fmtPrice(symbol, price)}
            </span>
            {changePercent != null && (
              <span style={{ fontSize: 13, color: positive ? 'var(--green)' : 'var(--red)', fontFamily: "'JetBrains Mono', monospace" }}>
                {positive ? '+' : ''}{changePercent.toFixed(2)}%
              </span>
            )}
          </div>
        )
      })}

      <div style={{ flex: 1 }} />

      {/* Market Condition label (right side) */}
      {condition ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: conditionColor,
              fontFamily: "'JetBrains Mono', monospace",
              letterSpacing: '0.06em',
            }}
          >
            ● {condition.condition}
          </span>
          <span style={{ fontSize: 10, color: 'var(--muted)', fontFamily: "'JetBrains Mono', monospace" }}>
            50SMA {condition.spyVs50sma} · 200SMA {condition.spyVs200sma} · D-Days {condition.distributionDays}
          </span>
        </div>
      ) : (
        <span style={{ fontSize: 10, color: 'var(--muted)', fontFamily: "'JetBrains Mono', monospace" }}>
          Loading market data…
        </span>
      )}
    </footer>
  )
}
