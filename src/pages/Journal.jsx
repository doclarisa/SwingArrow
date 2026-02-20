import { useState, useEffect } from 'react'
import { calculateStopLoss } from '../utils/tradingCalc'

const STORAGE_KEY = 'swingarrow_journal'

const SETUP_TYPES = ['Breakout', 'Pullback', 'Reversal', 'Continuation', 'Earnings Play']

const SAMPLE_TRADES = [
  {
    id: 1,
    ticker: 'NVDA',
    setupType: 'Breakout',
    stage: 2,
    entryDate: '2024-11-04',
    entryPrice: 138.50,
    exitDate: '2024-11-22',
    exitPrice: 147.20,
    shares: 50,
    stopLoss: 128.11,
    notes: 'Clean breakout above ATH on massive volume. Held through earnings cleanly.',
  },
  {
    id: 2,
    ticker: 'META',
    setupType: 'Pullback',
    stage: 2,
    entryDate: '2024-10-14',
    entryPrice: 576.00,
    exitDate: '2024-11-01',
    exitPrice: 603.00,
    shares: 20,
    stopLoss: 532.20,
    notes: '3-week tight pullback to 10wk MA. Strong relative strength vs SPY.',
  },
  {
    id: 3,
    ticker: 'TSLA',
    setupType: 'Breakout',
    stage: 3,
    entryDate: '2024-12-02',
    entryPrice: 352.00,
    exitDate: '2024-12-12',
    exitPrice: 319.00,
    shares: 30,
    stopLoss: 325.60,
    notes: 'Stopped out. Market rolled over the same week. Late stage base.',
  },
  {
    id: 4,
    ticker: 'AMD',
    setupType: 'Reversal',
    stage: 1,
    entryDate: '2025-01-08',
    entryPrice: 122.00,
    exitDate: null,
    exitPrice: null,
    shares: 60,
    stopLoss: 112.85,
    notes: 'Long base breakout attempt. Watching for follow-through volume.',
  },
  {
    id: 5,
    ticker: 'AAPL',
    setupType: 'Pullback',
    stage: 2,
    entryDate: '2024-09-10',
    entryPrice: 220.00,
    exitDate: '2024-10-01',
    exitPrice: 226.50,
    shares: 40,
    stopLoss: 203.50,
    notes: 'Textbook 21ema bounce with tight weekly action into earnings.',
  },
]

function derived(trade) {
  const entry = Number(trade.entryPrice)
  const stop  = Number(trade.stopLoss)
  const isOpen = trade.exitPrice == null
  const exit  = isOpen ? null : Number(trade.exitPrice)

  let result    = 'Open'
  let rMultiple = null
  let pnl       = null
  let holdDays  = null

  if (!isOpen) {
    result = exit >= entry ? 'Win' : 'Loss'
    const risk = entry - stop
    if (risk > 0) rMultiple = (exit - entry) / risk
    pnl = (exit - entry) * Number(trade.shares)
  }

  if (!isOpen && trade.entryDate && trade.exitDate) {
    holdDays = Math.round(
      (new Date(trade.exitDate) - new Date(trade.entryDate)) / 86400000
    )
  }

  return { result, rMultiple, pnl, holdDays }
}

function computeStats(trades) {
  const closed = trades.filter(t => t.exitPrice != null)
  const wins   = closed.filter(t => derived(t).result === 'Win')
  const rMs    = closed.map(t => derived(t).rMultiple).filter(v => v != null)
  const pnls   = closed.map(t => derived(t).pnl).filter(v => v != null)
  const days   = trades.map(t => derived(t).holdDays).filter(v => v != null)

  return {
    total:       trades.length,
    winRate:     closed.length ? ((wins.length / closed.length) * 100).toFixed(1) : null,
    avgRR:       rMs.length    ? (rMs.reduce((a, b) => a + b, 0) / rMs.length).toFixed(2) : null,
    totalPnl:    pnls.length   ? pnls.reduce((a, b) => a + b, 0) : null,
    bestTrade:   pnls.length   ? Math.max(...pnls) : null,
    worstTrade:  pnls.length   ? Math.min(...pnls) : null,
    avgHoldDays: days.length   ? (days.reduce((a, b) => a + b, 0) / days.length).toFixed(1) : null,
  }
}

// ─── Stats Bar ────────────────────────────────────────────────────────────────

function StatCard({ label, value, color }) {
  return (
    <div
      style={{
        flex: 1,
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 8,
        padding: '10px 14px',
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
        minWidth: 0,
      }}
    >
      <div style={{ fontSize: 11, color: 'var(--muted)', fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.05em', textTransform: 'uppercase' }}>
        {label}
      </div>
      <div style={{ fontSize: 18, fontWeight: 700, color: color || 'var(--text)', fontFamily: "'JetBrains Mono', monospace", whiteSpace: 'nowrap' }}>
        {value}
      </div>
    </div>
  )
}

function StatsBar({ stats }) {
  const fmt$ = v => v == null ? '—' : `${v >= 0 ? '+' : ''}$${Math.abs(v).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}${v < 0 ? ' loss' : ''}`
  const pnlColor = stats.totalPnl == null ? 'var(--text)' : stats.totalPnl >= 0 ? 'var(--green)' : 'var(--red)'

  return (
    <div style={{ display: 'flex', gap: 10, flexShrink: 0 }}>
      <StatCard label="Total Trades"   value={stats.total} />
      <StatCard label="Win Rate"        value={stats.winRate  != null ? `${stats.winRate}%`  : '—'} color={stats.winRate >= 50 ? 'var(--green)' : stats.winRate != null ? 'var(--red)' : undefined} />
      <StatCard label="Avg R:R"         value={stats.avgRR    != null ? `${stats.avgRR}R`    : '—'} color={stats.avgRR >= 2 ? 'var(--green)' : stats.avgRR != null ? 'var(--gold)' : undefined} />
      <StatCard label="Total P&L"       value={stats.totalPnl != null ? `${stats.totalPnl >= 0 ? '+' : ''}$${Math.abs(stats.totalPnl).toFixed(0)}` : '—'} color={pnlColor} />
      <StatCard label="Best Trade"      value={stats.bestTrade  != null ? `+$${stats.bestTrade.toFixed(0)}`  : '—'} color="var(--green)" />
      <StatCard label="Worst Trade"     value={stats.worstTrade != null ? `-$${Math.abs(stats.worstTrade).toFixed(0)}` : '—'} color="var(--red)" />
      <StatCard label="Avg Hold Days"   value={stats.avgHoldDays != null ? `${stats.avgHoldDays}d` : '—'} />
    </div>
  )
}

// ─── Trade Form ───────────────────────────────────────────────────────────────

const inputStyle = {
  width: '100%',
  background: 'var(--surface2)',
  border: '1px solid var(--border)',
  borderRadius: 5,
  color: 'var(--text)',
  fontSize: 13,
  padding: '6px 9px',
  fontFamily: "'JetBrains Mono', monospace",
  outline: 'none',
  boxSizing: 'border-box',
}

const labelStyle = {
  fontSize: 11,
  color: 'var(--muted)',
  letterSpacing: '0.05em',
  textTransform: 'uppercase',
  fontFamily: "'JetBrains Mono', monospace",
  marginBottom: 3,
  display: 'block',
}

function Field({ label, children }) {
  return (
    <div>
      <span style={labelStyle}>{label}</span>
      {children}
    </div>
  )
}

function TradeForm({ form, onChange, onSubmit }) {
  return (
    <div
      style={{
        width: '40%',
        flexShrink: 0,
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 8,
        padding: '16px',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}
    >
      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--gold)', fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.05em' }}>
        + NEW TRADE
      </div>

      <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {/* Row: Ticker + Setup Type */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <Field label="Ticker">
            <input
              name="ticker"
              value={form.ticker}
              onChange={onChange}
              placeholder="NVDA"
              required
              style={{ ...inputStyle, textTransform: 'uppercase' }}
            />
          </Field>
          <Field label="Setup Type">
            <select name="setupType" value={form.setupType} onChange={onChange} style={inputStyle}>
              {SETUP_TYPES.map(s => <option key={s}>{s}</option>)}
            </select>
          </Field>
        </div>

        {/* Row: Stage + Shares */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <Field label="Stage (1–4)">
            <select name="stage" value={form.stage} onChange={onChange} style={inputStyle}>
              {[1, 2, 3, 4].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </Field>
          <Field label="Shares">
            <input
              name="shares"
              type="number"
              min="1"
              value={form.shares}
              onChange={onChange}
              placeholder="100"
              required
              style={inputStyle}
            />
          </Field>
        </div>

        {/* Row: Entry Date + Entry Price */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <Field label="Entry Date">
            <input
              name="entryDate"
              type="date"
              value={form.entryDate}
              onChange={onChange}
              required
              style={inputStyle}
            />
          </Field>
          <Field label="Entry Price $">
            <input
              name="entryPrice"
              type="number"
              step="0.01"
              min="0"
              value={form.entryPrice}
              onChange={onChange}
              placeholder="138.50"
              required
              style={inputStyle}
            />
          </Field>
        </div>

        {/* Stop Loss (auto) */}
        <Field label="Stop Loss $ (auto @ −7.5%)">
          <input
            name="stopLoss"
            type="number"
            step="0.01"
            min="0"
            value={form.stopLoss}
            onChange={onChange}
            placeholder="128.11"
            style={inputStyle}
          />
        </Field>

        {/* Row: Exit Date + Exit Price */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <Field label="Exit Date (opt)">
            <input
              name="exitDate"
              type="date"
              value={form.exitDate}
              onChange={onChange}
              style={inputStyle}
            />
          </Field>
          <Field label="Exit Price $ (opt)">
            <input
              name="exitPrice"
              type="number"
              step="0.01"
              min="0"
              value={form.exitPrice}
              onChange={onChange}
              placeholder="leave blank = open"
              style={inputStyle}
            />
          </Field>
        </div>

        {/* Notes */}
        <Field label="Notes">
          <textarea
            name="notes"
            value={form.notes}
            onChange={onChange}
            rows={3}
            placeholder="Setup rationale, market conditions, lessons..."
            style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.4 }}
          />
        </Field>

        <button
          type="submit"
          style={{
            marginTop: 4,
            padding: '8px',
            background: 'var(--gold)',
            color: '#0d0d0d',
            border: 'none',
            borderRadius: 5,
            fontSize: 13,
            fontWeight: 700,
            fontFamily: "'JetBrains Mono', monospace",
            cursor: 'pointer',
            letterSpacing: '0.04em',
          }}
        >
          ADD TRADE
        </button>
      </form>
    </div>
  )
}

// ─── Trades Table ─────────────────────────────────────────────────────────────

const COLS = [
  { key: 'ticker',    label: 'Ticker',     sortable: true,  width: 64  },
  { key: 'setupType', label: 'Setup',      sortable: true,  width: 100 },
  { key: 'stage',     label: 'Stage',      sortable: true,  width: 50  },
  { key: 'entryDate', label: 'Entry Date', sortable: true,  width: 90  },
  { key: 'entryPrice',label: 'Entry $',    sortable: true,  width: 72  },
  { key: 'exitDate',  label: 'Exit Date',  sortable: true,  width: 90  },
  { key: 'exitPrice', label: 'Exit $',     sortable: true,  width: 72  },
  { key: 'shares',    label: 'Shares',     sortable: true,  width: 60  },
  { key: 'stopLoss',  label: 'Stop $',     sortable: true,  width: 72  },
  { key: 'result',    label: 'Result',     sortable: true,  width: 60  },
  { key: 'rMultiple', label: 'R×',         sortable: true,  width: 56  },
  { key: 'pnl',       label: 'P&L $',      sortable: true,  width: 80  },
  { key: 'notes',     label: 'Notes',      sortable: false, flex: 1    },
  { key: '_del',      label: '',           sortable: false, width: 48  },
]

function Th({ col, sortCol, sortDir, onSort }) {
  const active = sortCol === col.key
  return (
    <th
      onClick={col.sortable ? () => onSort(col.key) : undefined}
      style={{
        padding: '7px 8px',
        textAlign: 'left',
        fontSize: 10,
        fontWeight: 600,
        color: active ? 'var(--gold)' : 'var(--muted)',
        fontFamily: "'JetBrains Mono', monospace",
        letterSpacing: '0.07em',
        textTransform: 'uppercase',
        whiteSpace: 'nowrap',
        cursor: col.sortable ? 'pointer' : 'default',
        userSelect: 'none',
        width: col.width || 'auto',
        background: 'var(--surface)',
        borderBottom: '1px solid var(--border)',
        position: 'sticky',
        top: 0,
        zIndex: 1,
      }}
    >
      {col.label}
      {active && <span style={{ marginLeft: 3 }}>{sortDir === 'asc' ? '↑' : '↓'}</span>}
    </th>
  )
}

function ResultBadge({ result }) {
  const colors = { Win: 'var(--green)', Loss: 'var(--red)', Open: 'var(--gold)' }
  const c = colors[result] || 'var(--muted)'
  return (
    <span style={{
      fontSize: 11,
      fontWeight: 700,
      color: c,
      fontFamily: "'JetBrains Mono', monospace",
    }}>
      {result}
    </span>
  )
}

function RCell({ value }) {
  if (value == null) return <span style={{ color: 'var(--muted)' }}>—</span>
  const color = value >= 2 ? 'var(--green)' : value >= 0 ? '#a0c070' : 'var(--red)'
  return (
    <span style={{ color, fontFamily: "'JetBrains Mono', monospace", fontWeight: 600 }}>
      {value >= 0 ? '+' : ''}{value.toFixed(2)}R
    </span>
  )
}

function PnlCell({ value }) {
  if (value == null) return <span style={{ color: 'var(--muted)' }}>—</span>
  const color = value >= 0 ? 'var(--green)' : 'var(--red)'
  return (
    <span style={{ color, fontFamily: "'JetBrains Mono', monospace" }}>
      {value >= 0 ? '+' : ''}${Math.abs(value).toFixed(0)}
    </span>
  )
}

function NotesCell({ text }) {
  const [hovered, setHovered] = useState(false)
  if (!text) return <span style={{ color: 'var(--muted)' }}>—</span>
  const truncated = text.length > 40 ? text.slice(0, 40) + '…' : text
  return (
    <span
      style={{ position: 'relative', cursor: 'default' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <span style={{ color: 'var(--muted)', fontSize: 12 }}>{truncated}</span>
      {hovered && text.length > 40 && (
        <div style={{
          position: 'absolute',
          bottom: '100%',
          left: 0,
          zIndex: 50,
          background: '#1a1a2e',
          border: '1px solid var(--border)',
          borderRadius: 6,
          padding: '8px 12px',
          fontSize: 12,
          color: 'var(--text)',
          maxWidth: 280,
          lineHeight: 1.5,
          whiteSpace: 'normal',
          boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
          pointerEvents: 'none',
        }}>
          {text}
        </div>
      )}
    </span>
  )
}

function TradesTable({ trades, sortCol, sortDir, onSort, onDelete }) {
  const rowBorderColor = result =>
    result === 'Win' ? 'var(--green)' : result === 'Loss' ? 'var(--red)' : 'var(--gold)'

  return (
    <div style={{
      flex: 1,
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 8,
      overflow: 'auto',
      minWidth: 0,
    }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
        <thead>
          <tr>
            {COLS.map(col => (
              <Th key={col.key} col={col} sortCol={sortCol} sortDir={sortDir} onSort={onSort} />
            ))}
          </tr>
        </thead>
        <tbody>
          {trades.length === 0 && (
            <tr>
              <td colSpan={COLS.length} style={{ textAlign: 'center', padding: 32, color: 'var(--muted)', fontFamily: "'JetBrains Mono', monospace", fontSize: 13 }}>
                No trades yet — add your first trade.
              </td>
            </tr>
          )}
          {trades.map(trade => {
            const { result, rMultiple, pnl } = derived(trade)
            const borderColor = rowBorderColor(result)
            return (
              <tr
                key={trade.id}
                style={{ borderLeft: `3px solid ${borderColor}` }}
              >
                <td style={td}>{trade.ticker}</td>
                <td style={{ ...td, color: 'var(--muted)' }}>{trade.setupType}</td>
                <td style={td}>{trade.stage}</td>
                <td style={{ ...td, color: 'var(--muted)' }}>{trade.entryDate}</td>
                <td style={td}>${Number(trade.entryPrice).toFixed(2)}</td>
                <td style={{ ...td, color: 'var(--muted)' }}>{trade.exitDate || '—'}</td>
                <td style={td}>{trade.exitPrice ? `$${Number(trade.exitPrice).toFixed(2)}` : '—'}</td>
                <td style={td}>{trade.shares}</td>
                <td style={{ ...td, color: 'var(--muted)' }}>${Number(trade.stopLoss).toFixed(2)}</td>
                <td style={td}><ResultBadge result={result} /></td>
                <td style={td}><RCell value={rMultiple} /></td>
                <td style={td}><PnlCell value={pnl} /></td>
                <td style={{ ...td, maxWidth: 200 }}><NotesCell text={trade.notes} /></td>
                <td style={{ ...td, textAlign: 'center' }}>
                  <button
                    onClick={() => onDelete(trade.id)}
                    className="sw-btn"
                    style={{ padding: '2px 7px', fontSize: 13, color: 'var(--red)', borderColor: 'transparent' }}
                    title="Delete trade"
                  >
                    🗑
                  </button>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

const td = {
  padding: '7px 8px',
  borderBottom: '1px solid var(--border)33',
  color: 'var(--text)',
  fontFamily: "'JetBrains Mono', monospace",
  whiteSpace: 'nowrap',
  verticalAlign: 'middle',
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const EMPTY_FORM = {
  ticker:    '',
  setupType: 'Breakout',
  stage:     '2',
  entryDate: '',
  entryPrice:'',
  exitDate:  '',
  exitPrice: '',
  shares:    '',
  stopLoss:  '',
  notes:     '',
}

export default function Journal() {
  const [trades, setTrades] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      return stored ? JSON.parse(stored) : SAMPLE_TRADES
    } catch {
      return SAMPLE_TRADES
    }
  })

  const [form,    setForm]    = useState(EMPTY_FORM)
  const [sortCol, setSortCol] = useState('entryDate')
  const [sortDir, setSortDir] = useState('desc')

  // Persist on every change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trades))
  }, [trades])

  // Auto-calculate stop loss when entry price changes
  useEffect(() => {
    if (form.entryPrice) {
      const stop = calculateStopLoss(Number(form.entryPrice))
      setForm(f => ({ ...f, stopLoss: stop.toFixed(2) }))
    }
  }, [form.entryPrice])

  function handleFormChange(e) {
    const { name, value } = e.target
    setForm(f => ({ ...f, [name]: value }))
  }

  function handleAddTrade(e) {
    e.preventDefault()
    if (!form.ticker || !form.entryDate || !form.entryPrice || !form.shares) return
    const newTrade = {
      id:         Date.now(),
      ticker:     form.ticker.toUpperCase().trim(),
      setupType:  form.setupType,
      stage:      Number(form.stage),
      entryDate:  form.entryDate,
      entryPrice: Number(form.entryPrice),
      exitDate:   form.exitDate  || null,
      exitPrice:  form.exitPrice ? Number(form.exitPrice) : null,
      shares:     Number(form.shares),
      stopLoss:   Number(form.stopLoss),
      notes:      form.notes,
    }
    setTrades(prev => [newTrade, ...prev])
    setForm(EMPTY_FORM)
  }

  function handleDeleteTrade(id) {
    if (window.confirm('Delete this trade? This cannot be undone.')) {
      setTrades(prev => prev.filter(t => t.id !== id))
    }
  }

  function handleSort(col) {
    if (sortCol === col) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortCol(col)
      setSortDir('desc')
    }
  }

  const stats = computeStats(trades)

  const sortedTrades = [...trades].sort((a, b) => {
    let av, bv
    if (sortCol === 'result')    { av = derived(a).result;    bv = derived(b).result    }
    else if (sortCol === 'rMultiple') { av = derived(a).rMultiple; bv = derived(b).rMultiple }
    else if (sortCol === 'pnl')  { av = derived(a).pnl;       bv = derived(b).pnl       }
    else                         { av = a[sortCol];            bv = b[sortCol]            }

    if (av == null && bv == null) return 0
    if (av == null) return 1
    if (bv == null) return -1
    if (typeof av === 'string') return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av)
    return sortDir === 'asc' ? av - bv : bv - av
  })

  return (
    <div style={{
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      padding: 16,
      gap: 12,
    }}>
      <StatsBar stats={stats} />

      <div style={{ flex: 1, display: 'flex', gap: 12, minHeight: 0, overflow: 'hidden' }}>
        <TradeForm form={form} onChange={handleFormChange} onSubmit={handleAddTrade} />
        <TradesTable
          trades={sortedTrades}
          sortCol={sortCol}
          sortDir={sortDir}
          onSort={handleSort}
          onDelete={handleDeleteTrade}
        />
      </div>
    </div>
  )
}
