import { useQueries } from '@tanstack/react-query';
import useTickerStore from '../../store/useTickerStore';
import WatchlistItem from './WatchlistItem';

function SkeletonRow() {
  return (
    <div
      style={{
        padding: '10px 14px 10px 15px',
        borderBottom: '1px solid var(--border)',
        display: 'grid',
        gridTemplateColumns: '1fr auto',
        gridTemplateRows: 'auto auto',
        gap: '5px 8px',
      }}
    >
      <div className="skeleton" style={{ height: 15, width: '55%' }} />
      <div className="skeleton" style={{ height: 15, width: 56, marginLeft: 'auto' }} />
      <div className="skeleton" style={{ height: 13, width: '70%' }} />
      <div className="skeleton" style={{ height: 13, width: 42, marginLeft: 'auto' }} />
    </div>
  );
}

async function fetchQuote(ticker) {
  const res = await fetch(`/api/quote/${ticker}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data;
}

export default function Watchlist() {
  const { watchlist } = useTickerStore();

  const results = useQueries({
    queries: watchlist.map((ticker) => ({
      queryKey: ['quote', ticker],
      queryFn: () => fetchQuote(ticker),
      staleTime: 30_000,
      retry: 1,
    })),
  });

  return (
    <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
      {watchlist.map((ticker, i) => {
        const { data, error, isPending } = results[i];
        if (isPending) return <SkeletonRow key={ticker} />;
        return (
          <WatchlistItem
            key={ticker}
            ticker={ticker}
            data={data}
            error={error}
          />
        );
      })}
    </div>
  );
}
