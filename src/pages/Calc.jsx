import { useState } from 'react'
import { calculatePositionSize, calculateRiskReward, calculateStopLoss } from '../utils/tradingCalc'

// ─── Shared styles ────────────────────────────────────────────────────────────

const inputStyle = {
  width: '100%',
  background: 'var(--surface2)',
  border: '1px solid var(--border)',
  borderRadius: 5,
  color: 'var(--text)',
  fontSize: 14,
  padding: '7px 10px',
  fontFamily: "'JetBrains Mono', monospace",
  outline: 'none',
  boxSizing: 'border-box',
}

const labelStyle = {
  fontSize: 11,
  color: 'var(--muted)',
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  fontFamily: "'JetBrains Mono', monospace",
  marginBottom: 4,
  display: 'block',
}

const resultLabelStyle = {
  fontSize: 11,
  color: 'var(--muted)',
  fontFamily: "'JetBrains Mono', monospace",
  letterSpacing: '0.05em',
  textTransform: 'uppercase',
}

const resultValueStyle = {
  fontSize: 20,
  fontWeight: 700,
  color: 'var(--text)',
  fontFamily: "'JetBrains Mono', monospace',",
}

const dividerStyle = {
  height: 1,
  background: 'var(--border)',
  margin: '14px 0',
}

function Field({ label, children }) {
  return (
    <div>
      <span style={labelStyle}>{label}</span>
      {children}
    </div>
  )
}

function ResultRow({ label, value, color, large }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '4px 0' }}>
      <span style={resultLabelStyle}>{label}</span>
      <span style={{
        fontFamily: "'JetBrains Mono', monospace",
        fontWeight: large ? 700 : 600,
        fontSize: large ? 22 : 15,
        color: color || 'var(--text)',
      }}>
        {value}
      </span>
    </div>
  )
}

const cardStyle = {
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  borderRadius: 8,
  padding: 20,
  display: 'flex',
  flexDirection: 'column',
  gap: 12,
}

const sectionTitle = {
  fontFamily: "'DM Serif Display', serif",
  fontSize: 17,
  color: 'var(--gold)',
  marginBottom: 4,
}

// ─── Position Size Calculator ─────────────────────────────────────────────────

function PositionCalc() {
  const [accountSize, setAccountSize] = useState('50000')
  const [riskPct,     setRiskPct]     = useState('2')
  const [entryPrice,  setEntryPrice]  = useState('')
  const [stopPrice,   setStopPrice]   = useState('')
  const [targetPrice, setTargetPrice] = useState('')

  const entry   = parseFloat(entryPrice)
  const stop    = parseFloat(stopPrice)
  const target  = parseFloat(targetPrice)
  const account = parseFloat(accountSize)
  const risk    = parseFloat(riskPct) / 100

  const valid = entry > 0 && stop > 0 && stop < entry && account > 0 && risk > 0

  let pos = null
  let rr  = null
  if (valid) {
    pos = calculatePositionSize(account, risk, entry, stop)
    if (target > entry) {
      rr = calculateRiskReward(entry, stop, target)
    }
  }

  const fmt$ = v => `$${v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

  return (
    <div style={cardStyle}>
      <div style={sectionTitle}>Position Size Calculator</div>

      {/* Inputs */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <Field label="Account Size ($)">
          <input
            type="number"
            value={accountSize}
            onChange={e => setAccountSize(e.target.value)}
            style={inputStyle}
            min="0"
          />
        </Field>
        <Field label="Risk Per Trade (%)">
          <input
            type="number"
            value={riskPct}
            onChange={e => setRiskPct(e.target.value)}
            style={inputStyle}
            min="0"
            max="100"
            step="0.5"
          />
        </Field>
        <Field label="Entry Price ($)">
          <input
            type="number"
            value={entryPrice}
            onChange={e => {
              setEntryPrice(e.target.value)
              if (e.target.value) {
                const autoStop = calculateStopLoss(parseFloat(e.target.value))
                setStopPrice(autoStop.toFixed(2))
              }
            }}
            placeholder="138.50"
            style={inputStyle}
            min="0"
            step="0.01"
          />
        </Field>
        <Field label="Stop Loss Price ($)">
          <input
            type="number"
            value={stopPrice}
            onChange={e => setStopPrice(e.target.value)}
            placeholder="128.11"
            style={inputStyle}
            min="0"
            step="0.01"
          />
        </Field>
      </div>

      <Field label="Target Price ($) — for R/R">
        <input
          type="number"
          value={targetPrice}
          onChange={e => setTargetPrice(e.target.value)}
          placeholder="155.00"
          style={inputStyle}
          min="0"
          step="0.01"
        />
      </Field>

      <div style={dividerStyle} />

      {/* Results */}
      {!valid ? (
        <div style={{ color: 'var(--muted)', fontFamily: "'JetBrains Mono', monospace", fontSize: 13, textAlign: 'center', padding: '8px 0' }}>
          Enter entry price &amp; stop loss to calculate
        </div>
      ) : (
        <>
          <ResultRow label="Max Risk $"        value={fmt$(pos.riskDollars)}  color="var(--red)" />
          <ResultRow label="Shares to Buy"     value={pos.shares.toLocaleString()} large />
          <ResultRow label="Capital Required"  value={fmt$(pos.positionValue)} />
          <ResultRow label="% of Account"      value={`${((pos.positionValue / account) * 100).toFixed(1)}%`} color="var(--muted)" />
          {rr && (
            <ResultRow
              label="Risk / Reward"
              value={`${rr.ratio.toFixed(2)}:1`}
              color={rr.ratio >= 2 ? 'var(--green)' : rr.ratio >= 1 ? 'var(--gold)' : 'var(--red)'}
              large
            />
          )}
        </>
      )}
    </div>
  )
}

// ─── R Multiple Calculator ────────────────────────────────────────────────────

function RMultipleCalc() {
  const [entry,     setEntry]     = useState('')
  const [exitPrice, setExitPrice] = useState('')
  const [stop,      setStop]      = useState('')

  const e = parseFloat(entry)
  const x = parseFloat(exitPrice)
  const s = parseFloat(stop)

  const valid = e > 0 && x > 0 && s > 0 && s < e

  let rMultiple   = null
  let result      = null
  let pnlPerShare = null

  if (valid) {
    const risk  = e - s
    rMultiple   = (x - e) / risk
    pnlPerShare = x - e
    result      = x > e ? 'Win' : x < e ? 'Loss' : 'Breakeven'
  }

  const resultColors = { Win: 'var(--green)', Loss: 'var(--red)', Breakeven: 'var(--gold)' }

  return (
    <div style={cardStyle}>
      <div style={sectionTitle}>R Multiple Calculator</div>

      <Field label="Entry Price ($)">
        <input
          type="number"
          value={entry}
          onChange={e => {
            setEntry(e.target.value)
            if (e.target.value) {
              const autoStop = calculateStopLoss(parseFloat(e.target.value))
              setStop(autoStop.toFixed(2))
            }
          }}
          placeholder="138.50"
          style={inputStyle}
          min="0"
          step="0.01"
        />
      </Field>
      <Field label="Exit Price ($)">
        <input
          type="number"
          value={exitPrice}
          onChange={e => setExitPrice(e.target.value)}
          placeholder="155.00"
          style={inputStyle}
          min="0"
          step="0.01"
        />
      </Field>
      <Field label="Stop Loss ($)">
        <input
          type="number"
          value={stop}
          onChange={e => setStop(e.target.value)}
          placeholder="128.11"
          style={inputStyle}
          min="0"
          step="0.01"
        />
      </Field>

      <div style={dividerStyle} />

      {!valid ? (
        <div style={{ color: 'var(--muted)', fontFamily: "'JetBrains Mono', monospace", fontSize: 13, textAlign: 'center', padding: '8px 0' }}>
          Enter all three prices to calculate
        </div>
      ) : (
        <>
          <ResultRow
            label="R Multiple"
            value={`${rMultiple >= 0 ? '+' : ''}${rMultiple.toFixed(2)}R`}
            color={rMultiple >= 2 ? 'var(--green)' : rMultiple >= 0 ? 'var(--gold)' : 'var(--red)'}
            large
          />
          <ResultRow
            label="Result"
            value={result}
            color={resultColors[result]}
          />
          <ResultRow
            label="P&L per Share"
            value={`${pnlPerShare >= 0 ? '+' : ''}$${Math.abs(pnlPerShare).toFixed(2)}`}
            color={pnlPerShare >= 0 ? 'var(--green)' : 'var(--red)'}
          />
        </>
      )}
    </div>
  )
}

// ─── Reference Card ───────────────────────────────────────────────────────────

const RULES = [
  {
    title: "O'NEIL RULES",
    items: [
      'Cut losses at 7–8%',
      'Buy near 52-week high',
      'Follow the market trend',
      'Volume confirms breakout',
      'Never average down on losers',
      'Take 20–25% gains when offered',
    ],
  },
  {
    title: 'MINERVINI RULES',
    items: [
      'Buy Stage 2 only',
      'RS Rating > 80',
      'EPS growth > 25%',
      'Tight base < 15% depth',
      'Low-risk pivot entry',
      'Stop < 10% from entry',
    ],
  },
  {
    title: 'DARVAS RULES',
    items: [
      'Use box theory',
      'Buy breakout of box top',
      'Stop just below box floor',
      'Let winners run freely',
      'Never average down',
      'Ignore market noise',
    ],
  },
]

function ReferenceCard() {
  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 8,
      padding: '18px 20px',
      display: 'grid',
      gridTemplateColumns: '1fr 1fr 1fr',
      gap: 24,
    }}>
      {RULES.map(({ title, items }) => (
        <div key={title}>
          <div style={{
            fontFamily: "'DM Serif Display', serif",
            fontSize: 14,
            color: 'var(--gold)',
            letterSpacing: '0.02em',
            marginBottom: 10,
          }}>
            {title}
          </div>
          <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 5 }}>
            {items.map(item => (
              <li
                key={item}
                style={{
                  fontSize: 12,
                  color: 'var(--muted)',
                  fontFamily: "'JetBrains Mono', monospace",
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 7,
                }}
              >
                <span style={{ color: 'var(--gold)', flexShrink: 0, marginTop: 1 }}>›</span>
                {item}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Calc() {
  return (
    <div style={{
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      overflow: 'auto',
      padding: 16,
      gap: 16,
    }}>
      {/* Page title */}
      <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 22, color: 'var(--text)' }}>
        Position <span style={{ color: 'var(--gold)' }}>Calculator</span>
      </div>

      {/* Two calculators side by side */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <PositionCalc />
        <RMultipleCalc />
      </div>

      {/* Reference card full-width below */}
      <ReferenceCard />
    </div>
  )
}
