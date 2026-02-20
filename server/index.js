const express = require('express');
const cors = require('cors');
const { default: YahooFinance } = require('yahoo-finance2');

const yf = new YahooFinance({ suppressNotices: ['yahooSurvey'] });
const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json());

// GET /api/quote/:ticker — current price, % change, volume
app.get('/api/quote/:ticker', async (req, res) => {
  try {
    const { ticker } = req.params;
    const quote = await yf.quote(ticker);
    res.json({
      ticker: quote.symbol,
      price: quote.regularMarketPrice,
      change: quote.regularMarketChange,
      changePercent: quote.regularMarketChangePercent,
      volume: quote.regularMarketVolume,
      avgVolume: quote.averageDailyVolume3Month,
      marketCap: quote.marketCap,
      high: quote.regularMarketDayHigh,
      low: quote.regularMarketDayLow,
      open: quote.regularMarketOpen,
      previousClose: quote.regularMarketPreviousClose,
      fiftyTwoWeekHigh: quote.fiftyTwoWeekHigh,
      fiftyTwoWeekLow: quote.fiftyTwoWeekLow,
      shortName: quote.shortName,
    });
  } catch (err) {
    console.error(`[quote] ${req.params.ticker}:`, err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/history/:ticker — OHLCV candles, accepts ?interval=&range=
app.get('/api/history/:ticker', async (req, res) => {
  try {
    const { ticker } = req.params;
    const { interval = '1d', range = '3mo' } = req.query;

    const endDate = new Date();
    const startDate = new Date();
    switch (range) {
      case '1d':  startDate.setDate(startDate.getDate() - 1);           break;
      case '5d':  startDate.setDate(startDate.getDate() - 5);           break;
      case '1mo': startDate.setMonth(startDate.getMonth() - 1);         break;
      case '3mo': startDate.setMonth(startDate.getMonth() - 3);         break;
      case '1y':  startDate.setFullYear(startDate.getFullYear() - 1);   break;
      default:    startDate.setMonth(startDate.getMonth() - 3);
    }

    const result = await yf.chart(ticker, {
      period1: startDate,
      period2: endDate,
      interval,
    });

    const candles = (result.quotes || [])
      .filter((q) => q.open != null && q.close != null)
      .map((q) => ({
        time: Math.floor(new Date(q.date).getTime() / 1000),
        open: q.open,
        high: q.high,
        low: q.low,
        close: q.close,
        volume: q.volume || 0,
      }));

    res.json(candles);
  } catch (err) {
    console.error(`[history] ${req.params.ticker}:`, err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/fundamentals/:ticker — EPS, revenue growth, profit margins, 52wk range, volume
app.get('/api/fundamentals/:ticker', async (req, res) => {
  try {
    const { ticker } = req.params;
    const summary = await yf.quoteSummary(ticker, {
      modules: ['financialData', 'defaultKeyStatistics', 'summaryDetail'],
    });

    const fd = summary.financialData || {};
    const ks = summary.defaultKeyStatistics || {};
    const sd = summary.summaryDetail || {};

    res.json({
      // Price & range
      currentPrice: fd.currentPrice,
      fiftyTwoWeekHigh: sd.fiftyTwoWeekHigh,
      fiftyTwoWeekLow:  sd.fiftyTwoWeekLow,
      // Volume
      averageVolume:       sd.averageVolume,
      volume:              sd.regularMarketVolume,
      // EPS & valuation
      eps:        ks.trailingEps,
      forwardEps: ks.forwardEps,
      peRatio:    ks.trailingPE,
      forwardPE:  ks.forwardPE,
      // Growth & margins
      revenueGrowth:    fd.revenueGrowth,
      earningsGrowth:   fd.earningsGrowth,
      grossMargins:     fd.grossMargins,
      operatingMargins: fd.operatingMargins,
      profitMargins:    fd.profitMargins,
      returnOnEquity:   fd.returnOnEquity,
      returnOnAssets:   fd.returnOnAssets,
      // Balance sheet
      totalCash:      fd.totalCash,
      totalDebt:      fd.totalDebt,
      freeCashflow:   fd.freeCashflow,
      revenuePerShare: fd.revenuePerShare,
    });
  } catch (err) {
    console.error(`[fundamentals] ${req.params.ticker}:`, err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/rs/:ticker — Relative Strength Rating vs SPY (1–99 scale)
app.get('/api/rs/:ticker', async (req, res) => {
  try {
    const { ticker } = req.params;
    const endDate   = new Date();
    const startDate = new Date();
    startDate.setFullYear(startDate.getFullYear() - 1);

    const [tickerResult, spyResult] = await Promise.all([
      yf.chart(ticker, { period1: startDate, period2: endDate, interval: '1wk' }),
      yf.chart('SPY',  { period1: startDate, period2: endDate, interval: '1wk' }),
    ]);

    function lastClose(result) {
      const quotes = (result.quotes || []).filter((q) => q.close != null);
      if (quotes.length < 2) return null;
      return { first: quotes[0].close, last: quotes[quotes.length - 1].close };
    }

    const tData = lastClose(tickerResult);
    const sData = lastClose(spyResult);

    if (!tData || !sData) {
      return res.json({ rs: null });
    }

    const tickerReturn = (tData.last - tData.first) / tData.first;
    const spyReturn    = (sData.last - sData.first) / sData.first;

    let rs;
    if (spyReturn === 0) {
      rs = tickerReturn >= 0 ? 99 : 1;
    } else {
      rs = Math.round((tickerReturn / spyReturn) * 50 + 50);
    }
    rs = Math.max(1, Math.min(99, rs));

    res.json({ rs, tickerReturn, spyReturn });
  } catch (err) {
    console.error(`[rs] ${req.params.ticker}:`, err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/scanner — live data for 20 swing trading candidates
const SCANNER_TICKERS = [
  'NVDA','META','AAPL','MSFT','SMCI','TSLA','AMD','CRWD','PANW','MELI',
  'AMZN','GOOGL','NFLX','AVGO','ARM','PLTR','SNOW','DDOG','MDB','COIN',
];

app.get('/api/scanner', async (req, res) => {
  try {
    const endDate   = new Date();
    const startDate = new Date();
    startDate.setFullYear(startDate.getFullYear() - 1);

    // Fetch SPY weekly data once — reused for all RS calculations
    const spyChart   = await yf.chart('SPY', { period1: startDate, period2: endDate, interval: '1wk' });
    const spyQuotes  = (spyChart.quotes || []).filter((q) => q.close != null);
    const spyReturn  = spyQuotes.length >= 2
      ? (spyQuotes[spyQuotes.length - 1].close - spyQuotes[0].close) / spyQuotes[0].close
      : null;

    // For each ticker: quote + quoteSummary + weekly chart in parallel
    const settled = await Promise.allSettled(
      SCANNER_TICKERS.map(async (ticker) => {
        const [quote, summary, chart] = await Promise.all([
          yf.quote(ticker),
          yf.quoteSummary(ticker, { modules: ['financialData', 'defaultKeyStatistics', 'summaryDetail'] }),
          yf.chart(ticker, { period1: startDate, period2: endDate, interval: '1wk' }),
        ]);

        const fd = summary.financialData        || {};
        const ks = summary.defaultKeyStatistics || {};
        const sd = summary.summaryDetail        || {};

        // RS Rating
        const tQuotes = (chart.quotes || []).filter((q) => q.close != null);
        let rsRating = null;
        if (tQuotes.length >= 2 && spyReturn != null && spyReturn !== 0) {
          const tr = (tQuotes[tQuotes.length - 1].close - tQuotes[0].close) / tQuotes[0].close;
          rsRating = Math.max(1, Math.min(99, Math.round((tr / spyReturn) * 50 + 50)));
        }

        const price      = quote.regularMarketPrice;
        const high52     = sd.fiftyTwoWeekHigh;
        const low52      = sd.fiftyTwoWeekLow;
        const avgVolume  = sd.averageVolume;
        const volume     = sd.regularMarketVolume ?? quote.regularMarketVolume;
        const epsGrowth  = fd.earningsGrowth;
        const revGrowth  = fd.revenueGrowth;
        const opMargin   = fd.operatingMargins;
        const fwdPE      = ks.forwardPE;

        // Proportional setup score — only count criteria where data is available
        // Each criterion: if data is missing → skip (don't penalise)
        let setupPassed = 0;
        let setupMax    = 0;

        function criterion(dataAvailable, passes) {
          if (!dataAvailable) return; // field is null/undefined — skip entirely
          setupMax++;
          if (passes) setupPassed++;
        }

        criterion(rsRating != null,                                    rsRating >= 70);
        criterion(epsGrowth != null,                                   epsGrowth * 100 >= 25);
        criterion(revGrowth != null,                                   revGrowth * 100 >= 20);
        criterion(opMargin  != null,                                   opMargin > 0);
        criterion(price != null && high52 != null,                     price >= high52 * 0.75);
        criterion(price != null && high52 != null && low52 != null,    price > (high52 + low52) / 2);
        criterion(volume != null && avgVolume != null,                 volume >= avgVolume);
        criterion(fwdPE  != null,                                      fwdPE < 50);

        // Ratio for sorting (0–1); raw passed count used for filter thresholds
        const setupScore = setupMax > 0 ? setupPassed / setupMax : 0;

        console.log(`[SCANNER] ${ticker}: eps=${epsGrowth}, rev=${revGrowth}, rs=${rsRating}, margin=${opMargin}, passed=${setupPassed}/${setupMax}`);

        return {
          ticker,
          company:         quote.shortName || ticker,
          price,
          change:          quote.regularMarketChange,
          changePercent:   quote.regularMarketChangePercent,
          volume,
          avgVolume,
          volumeRatio:     volume != null && avgVolume != null ? volume / avgVolume : null,
          epsGrowth,
          revenueGrowth:   revGrowth,
          operatingMargin: opMargin,
          fiftyTwoWeekHigh: high52,
          fiftyTwoWeekLow:  low52,
          weekHighPercent: price != null && high52 != null ? price / high52 : null,
          rsRating,
          setupScore,   // float 0–1, for sorting
          setupPassed,  // int, for filter threshold and display
          setupMax,     // int, for display denominator
          stage: 2,
        };
      })
    );

    // Fulfilled rows keep full data; rejected rows return nulls (never crash the whole scan)
    const rows = settled.map((r, i) => {
      if (r.status === 'fulfilled') return r.value;
      console.error(`[scanner] ${SCANNER_TICKERS[i]}:`, r.reason?.message);
      return {
        ticker: SCANNER_TICKERS[i], company: null,
        price: null, change: null, changePercent: null,
        volume: null, avgVolume: null, volumeRatio: null,
        epsGrowth: null, revenueGrowth: null, operatingMargin: null,
        fiftyTwoWeekHigh: null, fiftyTwoWeekLow: null, weekHighPercent: null,
        rsRating: null, setupScore: 0, setupPassed: 0, setupMax: 0, stage: 2,
      };
    });

    res.json(rows);
  } catch (err) {
    console.error('[scanner]:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/indices — live quotes for SPY, QQQ, IWM, DIA, VIX, GLD, BTC (bottom bar)
const INDEX_MAP = [
  { symbol: 'SPY', yfTicker: 'SPY'     },
  { symbol: 'QQQ', yfTicker: 'QQQ'     },
  { symbol: 'IWM', yfTicker: 'IWM'     },
  { symbol: 'DIA', yfTicker: 'DIA'     },
  { symbol: 'VIX', yfTicker: '^VIX'    },
  { symbol: 'GLD', yfTicker: 'GLD'     },
  { symbol: 'BTC', yfTicker: 'BTC-USD' },
];

app.get('/api/indices', async (req, res) => {
  try {
    const results = await Promise.allSettled(INDEX_MAP.map(({ yfTicker }) => yf.quote(yfTicker)));
    const rows = results.map((r, i) => {
      const { symbol } = INDEX_MAP[i];
      if (r.status !== 'fulfilled') return { symbol, price: null, change: null, changePercent: null };
      const q = r.value;
      return {
        symbol,
        price:         q.regularMarketPrice,
        change:        q.regularMarketChange,
        changePercent: q.regularMarketChangePercent,
      };
    });
    res.json(rows);
  } catch (err) {
    console.error('[indices]:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/market-condition — SPY 50d/200d SMA trend analysis
app.get('/api/market-condition', async (req, res) => {
  try {
    const endDate   = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 290); // buffer for weekends/holidays

    const chart  = await yf.chart('SPY', { period1: startDate, period2: endDate, interval: '1d' });
    const quotes = (chart.quotes || []).filter((q) => q.close != null);

    if (quotes.length < 200) {
      return res.json({ condition: 'INSUFFICIENT DATA', spyVs50sma: null, spyVs200sma: null, distributionDays: 0 });
    }

    function sma(arr, period) {
      const slice = arr.slice(-period);
      return slice.reduce((sum, q) => sum + q.close, 0) / period;
    }

    const price  = quotes[quotes.length - 1].close;
    const sma50  = sma(quotes, 50);
    const sma200 = sma(quotes, 200);

    const fmt = (v) => `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`;

    // Distribution days: down-close on higher volume in last 25 sessions
    const recent = quotes.slice(-25);
    let distributionDays = 0;
    for (let i = 1; i < recent.length; i++) {
      if (recent[i].close < recent[i - 1].close && recent[i].volume > recent[i - 1].volume) {
        distributionDays++;
      }
    }

    let condition;
    if (price > sma50 && price > sma200 && sma50 > sma200) {
      condition = 'CONFIRMED UPTREND';
    } else if (price < sma50 && price > sma200) {
      condition = 'UPTREND UNDER PRESSURE';
    } else {
      condition = 'MARKET IN CORRECTION';
    }

    res.json({
      condition,
      spyVs50sma:      fmt((price - sma50)  / sma50  * 100),
      spyVs200sma:     fmt((price - sma200) / sma200 * 100),
      distributionDays,
    });
  } catch (err) {
    console.error('[market-condition]:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/news/:ticker — latest 5 news headlines
app.get('/api/news/:ticker', async (req, res) => {
  try {
    const { ticker } = req.params;
    const result = await yf.search(ticker, { newsCount: 5, quotesCount: 0 });
    const articles = (result.news || []).slice(0, 5).map((n) => ({
      title: n.title,
      publisher: n.publisher,
      link: n.link,
      publishedAt: n.providerPublishTime,
      thumbnail: n.thumbnail?.resolutions?.[0]?.url || null,
    }));
    res.json(articles);
  } catch (err) {
    console.error(`[news] ${req.params.ticker}:`, err.message);
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`SwingArrow API server running on http://localhost:${PORT}`);
});
