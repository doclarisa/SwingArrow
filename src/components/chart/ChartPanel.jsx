import { useEffect, useRef } from 'react';
import {
  createChart,
  CandlestickSeries,
  LineSeries,
  HistogramSeries,
} from 'lightweight-charts';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import useTickerStore from '../../store/useTickerStore';
import { calculateSMA } from '../../utils/tradingCalc';

// Map UI timeframe labels to Yahoo Finance params
const TIMEFRAME_CONFIG = {
  '1D': { interval: '5m',  range: '1d'  },
  'W':  { interval: '60m', range: '5d'  },
  'M':  { interval: '1d',  range: '1mo' },
  '3M': { interval: '1d',  range: '3mo' },
  '1Y': { interval: '1d',  range: '1y'  },
};

async function fetchHistory(ticker, interval, range) {
  const res = await fetch(`/api/history/${ticker}?interval=${interval}&range=${range}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data;
}

export default function ChartPanel({ timeframe }) {
  const { activeTicker } = useTickerStore();
  const containerRef = useRef(null);
  const chartRef     = useRef(null);
  const seriesRef    = useRef({ candle: null, sma50: null, sma200: null, volume: null });

  const { interval, range } = TIMEFRAME_CONFIG[timeframe] ?? TIMEFRAME_CONFIG['3M'];

  const { data, isFetching } = useQuery({
    queryKey: ['history', activeTicker, timeframe],
    queryFn: () => fetchHistory(activeTicker, interval, range),
    staleTime: 60_000,
    retry: 1,
    // Keep previous data visible while new ticker/timeframe loads
    placeholderData: keepPreviousData,
  });

  // ── Create chart once on mount ──
  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      layout: {
        background: { color: '#0f1318' },
        textColor: '#9ca3af',
        fontFamily: "'JetBrains Mono', monospace",
      },
      grid: {
        vertLines: { color: '#1e2428' },
        horzLines: { color: '#1e2428' },
      },
      crosshair: { mode: 1 },
      timeScale: {
        borderColor: '#1e2428',
        timeVisible: true,
        secondsVisible: false,
      },
      // Right scale: main price axis, leaving bottom 22% for volume
      rightPriceScale: {
        borderColor: '#1e2428',
        scaleMargins: { top: 0.05, bottom: 0.22 },
      },
      // Left scale: hidden, used for volume bars
      leftPriceScale: {
        visible: false,
        scaleMargins: { top: 0.82, bottom: 0 },
      },
      width: containerRef.current.clientWidth,
      height: containerRef.current.clientHeight,
    });

    chartRef.current = chart;

    // Candlestick series (right scale)
    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor:        '#2ecc71',
      downColor:      '#e74c3c',
      borderUpColor:  '#2ecc71',
      borderDownColor:'#e74c3c',
      wickUpColor:    '#2ecc71',
      wickDownColor:  '#e74c3c',
    });

    // 50-period SMA (blue, right scale)
    const sma50 = chart.addSeries(LineSeries, {
      color:                '#3498db',
      lineWidth:            1.5,
      priceLineVisible:     false,
      lastValueVisible:     false,
      crosshairMarkerVisible: false,
    });

    // 200-period SMA (red 60% opacity, right scale)
    const sma200 = chart.addSeries(LineSeries, {
      color:                'rgba(231, 76, 60, 0.6)',
      lineWidth:            1.5,
      priceLineVisible:     false,
      lastValueVisible:     false,
      crosshairMarkerVisible: false,
    });

    // Volume histogram (left scale — hidden axis, bottom 18% of chart)
    const volumeSeries = chart.addSeries(HistogramSeries, {
      priceFormat:      { type: 'volume' },
      priceScaleId:     'left',
      lastValueVisible: false,
      priceLineVisible: false,
    });

    seriesRef.current = { candle: candleSeries, sma50, sma200, volume: volumeSeries };

    // ── ResizeObserver — keep chart filling its container ──
    const ro = new ResizeObserver((entries) => {
      if (!entries[0] || !chartRef.current) return;
      const { width, height } = entries[0].contentRect;
      chartRef.current.resize(width, height);
    });
    ro.observe(containerRef.current);

    return () => {
      ro.disconnect();
      chart.remove();
      chartRef.current = null;
    };
  }, []); // intentionally empty — chart lifecycle is mount/unmount only

  // ── Push new data into existing series whenever query resolves ──
  useEffect(() => {
    const { candle, sma50, sma200, volume } = seriesRef.current;
    if (!data || !candle) return;

    const valid = data.filter((d) => d.open != null && d.close != null);
    if (valid.length === 0) return;

    // Candlesticks
    candle.setData(
      valid.map(({ time, open, high, low, close }) => ({ time, open, high, low, close }))
    );

    // Volume — green/red bars at 50% opacity
    volume.setData(
      valid.map(({ time, volume: vol, open, close }) => ({
        time,
        value: vol || 0,
        color: close >= open ? 'rgba(46, 204, 113, 0.5)' : 'rgba(231, 76, 60, 0.5)',
      }))
    );

    // SMAs — meaningful when we have enough daily candles
    sma50.setData(calculateSMA(valid, 50));
    sma200.setData(calculateSMA(valid, 200));

    chartRef.current.timeScale().fitContent();
  }, [data]);

  return (
    <div style={{ position: 'relative', flex: 1, minHeight: 0 }}>
      {/* Chart canvas fills parent */}
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />

      {/* Subtle pulsing overlay while fetching — chart stays mounted */}
      {isFetching && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(15, 19, 24, 0.45)',
            pointerEvents: 'none',
            zIndex: 10,
            animation: 'skeleton-pulse 1.4s ease-in-out infinite',
          }}
        />
      )}
    </div>
  );
}
