import { useState } from 'react';
import ChartHeader from './ChartHeader';
import ChartPanel from './ChartPanel';

export default function CenterPanel() {
  const [timeframe, setTimeframe] = useState('3M');

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        minWidth: 0,
        background: 'var(--bg)',
      }}
    >
      <ChartHeader timeframe={timeframe} onTimeframeChange={setTimeframe} />
      <ChartPanel timeframe={timeframe} />
    </div>
  );
}
