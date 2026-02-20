import { useQuery } from '@tanstack/react-query';
import useTickerStore from '../../store/useTickerStore';
import { API_BASE } from '../../lib/api';

async function fetchFundamentals(ticker) {
  const r = await fetch(`${API_BASE}/api/fundamentals/${ticker}`);
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}
async function fetchRS(ticker) {
  const r = await fetch(`${API_BASE}/api/rs/${ticker}`);
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}
function fetchQuote(ticker) {
  return fetch(`${API_BASE}/api/quote/${ticker}`).then((r) => r.json());
}

function pct(n) {
  if (n == null || isNaN(n)) return null;
  return n * 100;
}

function grade(score) {
  if (score >= 7) return { letter: 'A', color: '#2ecc71' };
  if (score >= 5) return { letter: 'B', color: '#c9a84c' };
  if (score >= 3) return { letter: 'C', color: '#e67e22' };
  return { letter: 'D', color: '#e74c3c' };
}

function buildCriteria(fund, rs, quote) {
  const price      = quote?.price;
  const high52     = fund?.fiftyTwoWeekHigh;
  const low52      = fund?.fiftyTwoWeekLow;
  const avgVol     = fund?.averageVolume;
  const vol        = fund?.volume;
  const rsRating   = rs?.rs;
  const egPct      = pct(fund?.earningsGrowth);
  const rgPct      = pct(fund?.revenueGrowth);
  const omPct      = pct(fund?.operatingMargins);

  // Price within 25% of 52-week high
  const nearHigh = price != null && high52 != null
    ? price >= high52 * 0.75
    : null;

  // Price above 52-week midpoint
  const aboveMid = price != null && high52 != null && low52 != null
    ? price > (high52 + low52) / 2
    : null;

  // Volume above average (today's vs avg)
  const volAboveAvg = vol != null && avgVol != null
    ? vol >= avgVol
    : null;

  return [
    {
      label: 'RS Rating ≥ 70',
      pass: rsRating != null ? rsRating >= 70 : null,
      detail: rsRating != null ? `RS ${rsRating}` : null,
    },
    {
      label: 'EPS Growth ≥ 25%',
      pass: egPct != null ? egPct >= 25 : null,
      detail: egPct != null ? `${egPct.toFixed(1)}%` : null,
    },
    {
      label: 'Revenue Growth ≥ 20%',
      pass: rgPct != null ? rgPct >= 20 : null,
      detail: rgPct != null ? `${rgPct.toFixed(1)}%` : null,
    },
    {
      label: 'Operating Margin > 0%',
      pass: omPct != null ? omPct > 0 : null,
      detail: omPct != null ? `${omPct.toFixed(1)}%` : null,
    },
    {
      label: 'Within 25% of 52w High',
      pass: nearHigh,
      detail: high52 != null ? `Hi $${high52.toFixed(2)}` : null,
    },
    {
      label: 'Above 52w Midpoint',
      pass: aboveMid,
      detail: low52 != null && high52 != null
        ? `Mid $${((high52 + low52) / 2).toFixed(2)}`
        : null,
    },
    {
      label: 'Volume ≥ Average',
      pass: volAboveAvg,
      detail: vol != null ? `${(vol / 1_000_000).toFixed(1)}M` : null,
    },
    {
      label: 'Forward PE < 50',
      pass: fund?.forwardPE != null ? fund.forwardPE < 50 : null,
      detail: fund?.forwardPE != null ? `PE ${fund.forwardPE.toFixed(1)}` : null,
    },
  ];
}

function CriteriaRow({ label, pass, detail }) {
  const isLoading = pass === undefined;
  const isNA      = pass === null;

  let icon, iconColor;
  if (isLoading || isNA) {
    icon = '—'; iconColor = 'var(--muted)';
  } else if (pass) {
    icon = '✓'; iconColor = '#2ecc71';
  } else {
    icon = '✗'; iconColor = '#e74c3c';
  }

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '6px 0',
        borderBottom: '1px solid var(--border)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 14,
            fontWeight: 700,
            color: iconColor,
            width: 16,
            textAlign: 'center',
            flexShrink: 0,
          }}
        >
          {isLoading ? <span className="skeleton" style={{ display: 'inline-block', width: 14, height: 14, borderRadius: 3 }} /> : icon}
        </span>
        <span style={{ fontSize: 13, color: 'var(--text)' }}>{label}</span>
      </div>
      <span
        style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 12,
          color: 'var(--muted)',
        }}
      >
        {isLoading
          ? <span className="skeleton" style={{ display: 'inline-block', width: 40, height: 12, borderRadius: 3 }} />
          : (detail ?? 'N/A')}
      </span>
    </div>
  );
}

export default function SepaChecklist() {
  const { activeTicker } = useTickerStore();

  const { data: fund, isLoading: fundLoading } = useQuery({
    queryKey: ['fundamentals', activeTicker],
    queryFn: () => fetchFundamentals(activeTicker),
    staleTime: 60_000,
    retry: 1,
  });

  const { data: rsData, isLoading: rsLoading } = useQuery({
    queryKey: ['rs', activeTicker],
    queryFn: () => fetchRS(activeTicker),
    staleTime: 60_000,
    retry: 1,
  });

  const { data: quote } = useQuery({
    queryKey: ['quote', activeTicker],
    staleTime: 30_000,
  });

  const isLoading = fundLoading || rsLoading;

  const criteria = isLoading
    ? Array(8).fill({ label: '...', pass: undefined, detail: undefined })
    : buildCriteria(fund, rsData, quote);

  const passCount = criteria.filter((c) => c.pass === true).length;
  const { letter, color: gradeColor } = isLoading
    ? { letter: '—', color: 'var(--muted)' }
    : grade(passCount);

  return (
    <div style={{ padding: '14px 16px' }}>
      {/* Section header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 10,
        }}
      >
        <span
          style={{
            fontFamily: "'DM Serif Display', serif",
            fontSize: 15,
            color: 'var(--gold)',
            letterSpacing: '0.03em',
          }}
        >
          SEPA Checklist
        </span>
        {/* Setup Score badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: 'var(--muted)' }}>
            {isLoading ? '—' : `${passCount}/8`}
          </span>
          <span
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 18,
              fontWeight: 700,
              color: gradeColor,
              minWidth: 22,
              textAlign: 'center',
            }}
          >
            {letter}
          </span>
        </div>
      </div>

      {/* Criteria rows */}
      <div>
        {criteria.map((c, i) => (
          <CriteriaRow key={i} label={c.label} pass={c.pass} detail={c.detail} />
        ))}
      </div>
    </div>
  );
}
