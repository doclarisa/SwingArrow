import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import useTickerStore from '../store/useTickerStore';
import { formatPrice } from '../utils/formatters';

// ── Helpers ────────────────────────────────────────────────────────────────────

function isMarketOpen() {
  const now  = new Date();
  const day  = now.getUTCDay(); // 0=Sun, 6=Sat
  if (day === 0 || day === 6) return false;
  const mins = now.getUTCHours() * 60 + now.getUTCMinutes();
  return mins >= 870 && mins < 1260; // 14:30–21:00 UTC == 9:30–4:00 PM ET
}

function fmtPct(n) {
  if (n == null || isNaN(n)) return '—';
  const p = n * 100;
  return `${p >= 0 ? '+' : ''}${p.toFixed(1)}%`;
}

function fmtChg(n) {
  if (n == null || isNaN(n)) return '—';
  return `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`;
}

// Grade by ratio (setupScore is 0–1)
function grade(ratio) {
  if (ratio >= 0.875) return { l: 'A', c: '#2ecc71' };
  if (ratio >= 0.625) return { l: 'B', c: '#c9a84c' };
  if (ratio >= 0.375) return { l: 'C', c: '#e67e22' };
  return { l: 'D', c: '#e74c3c' };
}

function stageColor(s) {
  return ({ 1: '#3498db', 2: '#2ecc71', 3: '#c9a84c', 4: '#e74c3c' })[s] ?? 'var(--muted)';
}

function rsColor(r) {
  if (r == null) return 'var(--muted)';
  if (r >= 90)   return '#c9a84c';
  if (r >= 80)   return '#2ecc71';
  return 'var(--text)';
}

// Border keyed off passed count (setupPassed) rather than ratio
function rowBorder(passed) {
  if (passed >= 7) return 'var(--gold)';
  if (passed >= 5) return '#2ecc71';
  return 'transparent';
}

// ── Column definitions ─────────────────────────────────────────────────────────

const COLS = [
  { key: 'rank',            label: '#',        w: 36,  sortable: false, align: 'right'  },
  { key: 'ticker',          label: 'Ticker',   w: 70,  sortable: true,  align: 'left',   type: 'str' },
  { key: 'company',         label: 'Company',  w: null, sortable: true, align: 'left',   type: 'str' },
  { key: 'price',           label: 'Price',    w: 80,  sortable: true,  align: 'right',  type: 'num' },
  { key: 'changePercent',   label: 'Change%',  w: 80,  sortable: true,  align: 'right',  type: 'num' },
  { key: 'rsRating',        label: 'RS',       w: 48,  sortable: true,  align: 'right',  type: 'num' },
  { key: 'epsGrowth',       label: 'EPS Gr.',  w: 72,  sortable: true,  align: 'right',  type: 'num' },
  { key: 'revenueGrowth',   label: 'Rev Gr.',  w: 72,  sortable: true,  align: 'right',  type: 'num' },
  { key: 'operatingMargin', label: 'Margin',   w: 72,  sortable: true,  align: 'right',  type: 'num' },
  { key: 'weekHighPercent', label: '52W%',     w: 65,  sortable: true,  align: 'right',  type: 'num' },
  { key: 'volumeRatio',     label: 'Vol×',     w: 65,  sortable: true,  align: 'right',  type: 'num' },
  { key: 'setupScore',      label: 'Score',    w: 78,  sortable: true,  align: 'center', type: 'num' },
  { key: 'stage',           label: 'Stage',    w: 60,  sortable: true,  align: 'center', type: 'num' },
  { key: 'action',          label: '',         w: 90,  sortable: false, align: 'center' },
];

// ── Sub-components ─────────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <tr>
      {COLS.map((c) => (
        <td key={c.key} style={{ padding: '10px 8px' }}>
          <span
            className="skeleton"
            style={{
              display: 'block',
              height: 13,
              borderRadius: 3,
              width: c.w ? `${Math.round(c.w * 0.65)}px` : '75%',
            }}
          />
        </td>
      ))}
    </tr>
  );
}

function SortArrow({ dir }) {
  return (
    <span style={{ marginLeft: 3, fontSize: 9, opacity: 0.85 }}>
      {dir === 'asc' ? '▲' : '▼'}
    </span>
  );
}

// ── Filter button shared style ─────────────────────────────────────────────────

function filterBtn(active) {
  return {
    padding: '4px 10px',
    borderRadius: 4,
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 12,
    fontWeight: 600,
    background: active ? 'var(--gold)' : 'transparent',
    color: active ? '#0a0d0f' : 'var(--muted)',
    border: `1px solid ${active ? 'var(--gold)' : 'var(--border)'}`,
    cursor: 'pointer',
    transition: 'all 0.1s',
  };
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function Scanner() {
  const navigate        = useNavigate();
  const setActiveTicker = useTickerStore((s) => s.setActiveTicker);

  // Filters
  const [minRS,       setMinRS]    = useState(1);
  const [minEPS,      setMinEPS]   = useState(0);
  const [minScore,    setMinScore] = useState(1);
  const [stageFilter, setStage]    = useState('All');
  const [volSurge,    setVolSurge] = useState(false);

  // Sort
  const [sortCol, setSortCol] = useState('setupScore');
  const [sortDir, setSortDir] = useState('desc');

  // Countdown
  const [countdown, setCountdown] = useState(60);

  const { data, isLoading, dataUpdatedAt } = useQuery({
    queryKey: ['scanner'],
    queryFn: async () => {
      const r = await fetch('/api/scanner');
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    },
    staleTime: 60_000,
    refetchInterval: isMarketOpen() ? 60_000 : false,
    retry: 1,
  });

  // Reset countdown whenever data refreshes
  useEffect(() => {
    setCountdown(60);
  }, [dataUpdatedAt]);

  // Tick every second
  useEffect(() => {
    const t = setInterval(() => setCountdown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(t);
  }, []);

  const handleSort = (col) => {
    if (sortCol === col) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortCol(col);
      setSortDir('desc');
    }
  };

  const handleAnalyze = (ticker) => {
    setActiveTicker(ticker);
    navigate('/');
  };

  const resetFilters = () => {
    setMinRS(1);
    setMinEPS(0);
    setMinScore(1);
    setStage('All');
    setVolSurge(false);
  };

  // Filter + sort
  const filtered = useMemo(() => {
    if (!data) return [];
    return [...data]
      .filter((row) => {
        // RS: null counts as fail (no data = no RS signal)
        if ((row.rsRating ?? -1) < minRS) return false;
        // EPS: if data is missing (null/undefined), pass through — show N/A in cell
        if (row.epsGrowth != null && row.epsGrowth * 100 < minEPS) return false;
        // Score threshold: use raw passed count, not ratio
        if ((row.setupPassed ?? 0) < minScore) return false;
        if (stageFilter !== 'All' && row.stage !== Number(stageFilter)) return false;
        if (volSurge && (row.volumeRatio ?? 0) < 1.25) return false;
        return true;
      })
      .sort((a, b) => {
        const aRaw = a[sortCol];
        const bRaw = b[sortCol];
        if (aRaw == null && bRaw == null) return 0;
        if (aRaw == null) return 1;
        if (bRaw == null) return -1;
        if (typeof aRaw === 'string') {
          return sortDir === 'asc' ? aRaw.localeCompare(bRaw) : bRaw.localeCompare(aRaw);
        }
        return sortDir === 'asc' ? aRaw - bRaw : bRaw - aRaw;
      });
  }, [data, minRS, minEPS, minScore, stageFilter, volSurge, sortCol, sortDir]);

  // Summary counts (over unfiltered data)
  const totalCount  = data?.length ?? 20;
  const stage2Count = data?.filter((r) => r.stage === 2).length ?? 0;
  const score7Count = data?.filter((r) => (r.setupPassed ?? 0) >= 7).length ?? 0;
  const lastUpdated = dataUpdatedAt
    ? new Date(dataUpdatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : '—';

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        height: '100%',
        overflow: 'hidden',
      }}
    >
      {/* ── Filter bar ──────────────────────────────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 20,
          padding: '10px 20px',
          background: 'var(--surface)',
          borderBottom: '1px solid var(--border)',
          flexShrink: 0,
          flexWrap: 'wrap',
        }}
      >
        {/* RS slider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: 'var(--muted)' }}>
            RS ≥
          </span>
          <input
            type="range"
            min={0}
            max={99}
            value={minRS}
            onChange={(e) => setMinRS(Number(e.target.value))}
            style={{ width: 90, accentColor: 'var(--gold)', cursor: 'pointer' }}
          />
          <span
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 13,
              color: 'var(--gold)',
              width: 22,
              textAlign: 'right',
            }}
          >
            {minRS}
          </span>
        </div>

        {/* EPS growth input */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: 'var(--muted)' }}>
            EPS Gr. ≥
          </span>
          <input
            type="number"
            value={minEPS}
            onChange={(e) => setMinEPS(Number(e.target.value))}
            style={{
              width: 52,
              background: 'var(--surface2)',
              border: '1px solid var(--border)',
              borderRadius: 4,
              color: 'var(--text)',
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 12,
              padding: '3px 6px',
              outline: 'none',
            }}
          />
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: 'var(--muted)' }}>%</span>
        </div>

        {/* Setup Score buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: 'var(--muted)' }}>
            Score ≥
          </span>
          <div style={{ display: 'flex', gap: 3 }}>
            {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
              <button key={s} onClick={() => setMinScore(s)} style={filterBtn(minScore === s)}>
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Stage toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: 'var(--muted)' }}>
            Stage
          </span>
          <div style={{ display: 'flex', gap: 3 }}>
            {['All', '1', '2', '3', '4'].map((s) => (
              <button key={s} onClick={() => setStage(s)} style={filterBtn(stageFilter === s)}>
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Volume surge toggle */}
        <button onClick={() => setVolSurge((v) => !v)} style={{ ...filterBtn(volSurge), padding: '4px 12px' }}>
          Vol &gt; 1.25×
        </button>

        {/* Reset */}
        <button
          onClick={resetFilters}
          style={{
            marginLeft: 'auto',
            padding: '4px 14px',
            borderRadius: 4,
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 12,
            fontWeight: 600,
            background: 'transparent',
            color: 'var(--gold)',
            border: '1px solid var(--gold)',
            cursor: 'pointer',
          }}
        >
          Reset
        </button>
      </div>

      {/* ── Summary bar ─────────────────────────────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          padding: '7px 20px',
          background: 'var(--bg)',
          borderBottom: '1px solid var(--border)',
          flexShrink: 0,
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 12,
          color: 'var(--muted)',
        }}
      >
        <span>
          Scanning <span style={{ color: 'var(--text)' }}>{totalCount}</span> stocks
        </span>
        <span style={{ color: 'var(--border)' }}>|</span>
        <span>
          <span style={{ color: 'var(--text)' }}>{isLoading ? '—' : filtered.length}</span> passed filters
        </span>
        <span style={{ color: 'var(--border)' }}>|</span>
        <span>
          <span style={{ color: '#2ecc71' }}>{isLoading ? '—' : stage2Count}</span> Stage 2
        </span>
        <span style={{ color: 'var(--border)' }}>|</span>
        <span>
          <span style={{ color: 'var(--gold)' }}>{isLoading ? '—' : score7Count}</span> Score ≥ 7
        </span>
        <span style={{ color: 'var(--border)' }}>|</span>
        <span>
          Last updated: <span style={{ color: 'var(--text)' }}>{lastUpdated}</span>
        </span>
        {!isLoading && (
          <span>
            · next in{' '}
            <span
              style={{
                color: countdown <= 10 ? '#e74c3c' : 'var(--muted)',
                fontWeight: countdown <= 10 ? 700 : 400,
              }}
            >
              {countdown}s
            </span>
          </span>
        )}
      </div>

      {/* ── Table ───────────────────────────────────────────────────────────── */}
      <div style={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 13,
          }}
        >
          <thead>
            <tr
              style={{
                background: 'var(--surface)',
                position: 'sticky',
                top: 0,
                zIndex: 2,
              }}
            >
              {COLS.map((col) => (
                <th
                  key={col.key}
                  onClick={col.sortable ? () => handleSort(col.key) : undefined}
                  style={{
                    padding: '10px 8px',
                    textAlign: col.align,
                    fontWeight: 600,
                    fontSize: 11,
                    color: sortCol === col.key ? 'var(--gold)' : 'var(--muted)',
                    borderBottom: '1px solid var(--border)',
                    cursor: col.sortable ? 'pointer' : 'default',
                    userSelect: 'none',
                    whiteSpace: 'nowrap',
                    width: col.w ? `${col.w}px` : undefined,
                  }}
                >
                  {col.label}
                  {col.sortable && sortCol === col.key && <SortArrow dir={sortDir} />}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {isLoading ? (
              Array(10).fill(null).map((_, i) => <SkeletonRow key={i} />)
            ) : filtered.length === 0 ? (
              <tr>
                <td
                  colSpan={COLS.length}
                  style={{
                    textAlign: 'center',
                    padding: '48px 0',
                    color: 'var(--muted)',
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 13,
                  }}
                >
                  No results match current filters
                </td>
              </tr>
            ) : (
              filtered.map((row, i) => {
                const { l: gradeLetter, c: gradeColor } = grade(row.setupScore); // ratio 0–1
                const isPos = (row.changePercent ?? 0) >= 0;
                const bgBase = i % 2 === 0 ? 'var(--bg)' : 'var(--surface)';

                return (
                  <tr
                    key={row.ticker}
                    style={{
                      borderBottom: '1px solid var(--border)',
                      borderLeft: `3px solid ${rowBorder(row.setupPassed ?? 0)}`,
                      background: bgBase,
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--surface2)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = bgBase; }}
                  >
                    {/* # */}
                    <td style={{ padding: '10px 8px', textAlign: 'right', color: 'var(--muted)', fontSize: 11 }}>
                      {i + 1}
                    </td>

                    {/* Ticker */}
                    <td style={{ padding: '10px 8px', color: 'var(--gold)', fontWeight: 700 }}>
                      {row.ticker}
                    </td>

                    {/* Company */}
                    <td
                      style={{
                        padding: '10px 8px',
                        color: 'var(--text)',
                        maxWidth: 200,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {row.company ?? '—'}
                    </td>

                    {/* Price */}
                    <td style={{ padding: '10px 8px', textAlign: 'right', color: 'var(--text)' }}>
                      {row.price != null ? formatPrice(row.price) : '—'}
                    </td>

                    {/* Change% */}
                    <td style={{ padding: '10px 8px', textAlign: 'right', color: isPos ? '#2ecc71' : '#e74c3c' }}>
                      {fmtChg(row.changePercent)}
                    </td>

                    {/* RS */}
                    <td
                      style={{
                        padding: '10px 8px',
                        textAlign: 'right',
                        color: rsColor(row.rsRating),
                        fontWeight: 700,
                      }}
                    >
                      {row.rsRating ?? '—'}
                    </td>

                    {/* EPS Gr. */}
                    <td style={{ padding: '10px 8px', textAlign: 'right', color: 'var(--text)' }}>
                      {fmtPct(row.epsGrowth)}
                    </td>

                    {/* Rev Gr. */}
                    <td style={{ padding: '10px 8px', textAlign: 'right', color: 'var(--text)' }}>
                      {fmtPct(row.revenueGrowth)}
                    </td>

                    {/* Margin */}
                    <td style={{ padding: '10px 8px', textAlign: 'right', color: 'var(--text)' }}>
                      {fmtPct(row.operatingMargin)}
                    </td>

                    {/* 52W% */}
                    <td style={{ padding: '10px 8px', textAlign: 'right', color: 'var(--text)' }}>
                      {row.weekHighPercent != null
                        ? `${(row.weekHighPercent * 100).toFixed(1)}%`
                        : '—'}
                    </td>

                    {/* Vol× */}
                    <td
                      style={{
                        padding: '10px 8px',
                        textAlign: 'right',
                        color: (row.volumeRatio ?? 0) >= 1.25 ? '#2ecc71' : 'var(--text)',
                      }}
                    >
                      {row.volumeRatio != null ? `${row.volumeRatio.toFixed(2)}×` : '—'}
                    </td>

                    {/* Score — shows passed/available e.g. "5/7 B" */}
                    <td style={{ padding: '10px 8px', textAlign: 'center' }}>
                      <span style={{ color: 'var(--muted)', fontSize: 11 }}>
                        {row.setupPassed ?? 0}/{row.setupMax ?? 8}{' '}
                      </span>
                      <span style={{ fontWeight: 700, color: gradeColor }}>{gradeLetter}</span>
                    </td>

                    {/* Stage */}
                    <td style={{ padding: '10px 8px', textAlign: 'center' }}>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '2px 7px',
                          borderRadius: 3,
                          fontSize: 11,
                          fontWeight: 600,
                          color: stageColor(row.stage),
                          border: `1px solid ${stageColor(row.stage)}40`,
                          background: `${stageColor(row.stage)}12`,
                        }}
                      >
                        {row.stage ?? '—'}
                      </span>
                    </td>

                    {/* Action */}
                    <td style={{ padding: '10px 8px', textAlign: 'center' }}>
                      <button
                        onClick={() => handleAnalyze(row.ticker)}
                        style={{
                          padding: '4px 10px',
                          borderRadius: 4,
                          fontFamily: "'JetBrains Mono', monospace",
                          fontSize: 11,
                          fontWeight: 600,
                          background: 'transparent',
                          color: 'var(--gold)',
                          border: '1px solid var(--gold)',
                          cursor: 'pointer',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        Analyze →
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
