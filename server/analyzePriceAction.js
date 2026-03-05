/**
 * analyzePriceAction.js
 *
 * Accepts the last 60 OHLCV candles for a single ticker and returns a
 * structured volume/price-action analysis object used by the SEPA scoring
 * pipeline and (eventually) the analysis sidebar.
 *
 * Input candles must be sorted ascending by time (oldest first) and each
 * object must contain: { time, open, high, low, close, volume }
 */

'use strict';

// ── Constants ─────────────────────────────────────────────────────────────────

/**
 * Volume must fall below this fraction of the 50-day average for a session
 * to count as "dry" (supply exhaustion / tight base action).
 */
const DRY_UP_THRESHOLD = 0.50;

/**
 * Minimum number of consecutive dry-volume sessions required to flag volumeDryUp.
 * Minervini looks for 3+ tight days as evidence of controlled, low-supply action.
 */
const DRY_UP_MIN_SESSIONS = 3;

/**
 * Multiplier against 50-day average volume for a session to qualify as
 * climax volume. 2.5× is a conservative threshold; true blow-offs can be 4–6×.
 */
const CLIMAX_VOL_MULTIPLIER = 2.5;

/**
 * A climax session must also have a daily range (high − low) wider than
 * this multiple of the 20-day average range — filters out high-volume
 * inside days that are not genuine climax moves.
 */
const CLIMAX_RANGE_MULTIPLIER = 1.5;

// ── Private helpers ───────────────────────────────────────────────────────────

/**
 * Simple moving average of closing prices.
 * Returns null if the array has fewer than `period` elements.
 * @param {number[]} closes  Array of close prices, oldest first.
 * @param {number}   period
 * @returns {number|null}
 */
function closeSMA(closes, period) {
  if (closes.length < period) return null;
  const slice = closes.slice(-period);
  return slice.reduce((s, v) => s + v, 0) / period;
}

// ── Main export ───────────────────────────────────────────────────────────────

/**
 * Analyzes price action and volume characteristics.
 *
 * @param {Array<{time: number, open: number, high: number, low: number, close: number, volume: number}>} ohlcvData
 *   OHLCV array sorted ascending (oldest → newest). Expects ≥ 50 candles for
 *   meaningful results; returns neutral defaults for shorter arrays.
 *
 * @returns {{
 *   distributionDays: number,
 *   accumulationDays: number,
 *   volumeDryUp: boolean,
 *   climaxVolume: boolean,
 *   pocketPivot: boolean,
 *   volumeTrend: 'bullish'|'bearish'|'neutral'
 * }}
 */
function analyzePriceAction(ohlcvData) {
  const NEUTRAL = {
    distributionDays: 0,
    accumulationDays: 0,
    volumeDryUp:      false,
    climaxVolume:     false,
    pocketPivot:      false,
    volumeTrend:      'neutral',
  };

  if (!Array.isArray(ohlcvData) || ohlcvData.length < 50) return NEUTRAL;

  // Work only with the most recent 60 sessions so the function is O(1)-bounded
  const data = ohlcvData.slice(-60);
  const n    = data.length;

  // ── Baseline: 50-session average volume ────────────────────────────────────
  //
  // Everything in volume analysis is relative to this number.
  // We use the last 50 bars of the working window (same length as a 50-day SMA).
  const avg50Vol = data
    .slice(-50)
    .reduce((sum, c) => sum + (c.volume || 0), 0) / 50;

  if (avg50Vol === 0) return NEUTRAL; // guard against all-zero volume data


  // ── 1. Distribution & Accumulation Days (last 10 sessions) ─────────────────
  //
  // O'Neil / IBD definition (adapted):
  //   Distribution day — closes LOWER than the prior close on volume that
  //     exceeds the 50-day average. Signals institutional selling pressure.
  //   Accumulation day — closes HIGHER than the prior close on volume that
  //     exceeds the 50-day average. Signals institutional demand.
  //
  // 5+ distribution days within a rolling 4-week window is a warning sign
  // that a market or individual stock is under distribution.

  const last10 = data.slice(-10); // window: last 10 candles
  let distributionDays = 0;
  let accumulationDays = 0;

  for (let i = 1; i < last10.length; i++) {
    const prev  = last10[i - 1];
    const curr  = last10[i];
    const vol   = curr.volume || 0;

    if (vol <= avg50Vol) continue; // only above-average volume days count

    const closeChange = curr.close - prev.close;
    if (closeChange < 0) {
      distributionDays++;
    } else if (closeChange > 0) {
      accumulationDays++;
    }
    // Flat closes on high volume are ambiguous — not counted either way
  }


  // ── 2. Volume Dry-Up Detection ─────────────────────────────────────────────
  //
  // "Tight and dry" action: 3+ consecutive sessions where volume contracts to
  // ≤ 50% of the 50-day average. This indicates supply is being withdrawn —
  // sellers are no longer aggressive — which often precedes a breakout.
  // Minervini looks for this signature within a constructive base pattern.
  //
  // We scan only the last 10 sessions for recency; older dry-ups are stale.

  let volumeDryUp     = false;
  let consecutiveDry  = 0;
  const dryCheckStart = Math.max(0, n - 10);

  for (let i = dryCheckStart; i < n; i++) {
    const vol = data[i].volume || 0;
    if (vol < avg50Vol * DRY_UP_THRESHOLD) {
      consecutiveDry++;
      if (consecutiveDry >= DRY_UP_MIN_SESSIONS) {
        volumeDryUp = true;
        break;
      }
    } else {
      consecutiveDry = 0; // non-dry session resets the streak
    }
  }


  // ── 3. Climax Volume Detection ─────────────────────────────────────────────
  //
  // A climax volume session has two distinguishing features:
  //   (a) Volume ≥ 2.5× the 50-day average — genuine institutional-size activity
  //   (b) Day range (high − low) > 1.5× the 20-day average range — wide spread
  //       confirms that the volume is moving price, not just dark-pool noise
  //
  // Context matters: a climax up-day after a multi-week advance is an exhaustion
  // signal (distribution). The same pattern on day 1 of a breakout can be
  // a powerful continuation signal. The consumer of this function must apply
  // that context; the function only flags the raw condition.
  //
  // We evaluate only the most recent completed session.

  // 20-day average true range (simplified: high − low, no gap adjustment)
  const last20 = data.slice(-20);
  const avgRange = last20.reduce((sum, c) => sum + (c.high - c.low), 0) / last20.length;

  const latestBar   = data[n - 1];
  const latestVol   = latestBar.volume || 0;
  const latestRange = latestBar.high - latestBar.low;

  const climaxVolume =
    latestVol   >= avg50Vol  * CLIMAX_VOL_MULTIPLIER &&
    latestRange >  avgRange  * CLIMAX_RANGE_MULTIPLIER;


  // ── 4. Pocket Pivot Detection (Minervini) ──────────────────────────────────
  //
  // A pocket pivot is a low-risk buy point within an existing uptrend.
  // Minervini's criteria:
  //   (a) The stock closes UP on the day vs. the prior close
  //   (b) The day's volume exceeds the HIGHEST volume recorded on any DOWN day
  //       (close < prior close) in the prior 10 trading sessions
  //   (c) Ideally occurs near or above a key moving average (10d / 50d), not
  //       in a failed breakdown — this context check is left to the caller
  //
  // The logic: if today's demand (up-day volume) is greater than the biggest
  // prior supply day, buyers are overwhelmingly more aggressive than sellers.
  // This often precedes a sustained move without the stock having to form a
  // full base and break out through a pivot point.

  let pocketPivot = false;

  if (n >= 12) {
    const todayIdx   = n - 1;
    const today      = data[todayIdx];
    const priorClose = data[todayIdx - 1].close;
    const isUpDay    = today.close > priorClose;

    if (isUpDay) {
      // Scan the prior 10 sessions (todayIdx-10 … todayIdx-1) for down days
      let highestDownDayVol = 0;
      for (let i = Math.max(1, todayIdx - 10); i < todayIdx; i++) {
        const isDownDay = data[i].close < data[i - 1].close;
        if (isDownDay) {
          highestDownDayVol = Math.max(highestDownDayVol, data[i].volume || 0);
        }
      }

      // Pocket pivot confirmed only when there were actual down days to compare against
      if (highestDownDayVol > 0 && (today.volume || 0) > highestDownDayVol) {
        pocketPivot = true;
      }
    }
  }


  // ── 5. Volume Trend ────────────────────────────────────────────────────────
  //
  // Composite signal derived from two independent metrics over the last 10 sessions:
  //
  //   Metric A — Day-count balance:
  //     More accumulation days than distribution days → bullish pressure
  //     More distribution days → bearish pressure
  //
  //   Metric B — Average volume on up days vs. down days:
  //     Higher avg volume on up days → demand > supply (bullish)
  //     Higher avg volume on down days → supply > demand (bearish)
  //
  // Both metrics must agree (or one must be significantly dominant) to produce
  // a directional reading; conflicting signals return 'neutral'.

  const upDayVols   = [];
  const downDayVols = [];

  for (let i = 1; i < last10.length; i++) {
    const vol = last10[i].volume || 0;
    if (last10[i].close >= last10[i - 1].close) {
      upDayVols.push(vol);
    } else {
      downDayVols.push(vol);
    }
  }

  const avgUpVol   = upDayVols.length
    ? upDayVols.reduce((a, b) => a + b, 0) / upDayVols.length
    : 0;
  const avgDownVol = downDayVols.length
    ? downDayVols.reduce((a, b) => a + b, 0) / downDayVols.length
    : 0;

  // Both metrics bullish
  const metricABullish = accumulationDays > distributionDays;
  const metricABearish = distributionDays > accumulationDays;
  const metricBBullish = avgUpVol > avgDownVol * 1.1; // 10% threshold avoids noise
  const metricBBearish = avgDownVol > avgUpVol * 1.1;

  let volumeTrend;
  if (metricABullish && metricBBullish) {
    volumeTrend = 'bullish';
  } else if (metricABearish && metricBBearish) {
    volumeTrend = 'bearish';
  } else if (metricABullish || metricBBullish) {
    volumeTrend = 'bullish'; // one strong signal with no opposing signal
  } else if (metricABearish || metricBBearish) {
    volumeTrend = 'bearish';
  } else {
    volumeTrend = 'neutral';
  }


  // ── Result ─────────────────────────────────────────────────────────────────

  return {
    distributionDays,
    accumulationDays,
    volumeDryUp,
    climaxVolume,
    pocketPivot,
    volumeTrend,
  };
}

/**
 * detectCandlePatterns(ohlcvData)
 *
 * Scans the last 10 candles for seven classic reversal and continuation
 * patterns. Returns an array of detected patterns sorted by recency
 * (most recent candle index first). Multiple patterns can fire on the
 * same candle (e.g. a shooting star that is also part of a bearish engulf).
 *
 * @param {Array<{time,open,high,low,close,volume}>} ohlcvData
 *   OHLCV array sorted ascending (oldest → newest). Min 3 candles required.
 *
 * @returns {Array<{
 *   patternName: string,
 *   bullishOrBearish: 'bullish'|'bearish',
 *   confidence: 'high'|'medium',
 *   index: number
 * }>}
 *   `index` is the position of the pattern's completing candle in the
 *   original ohlcvData array (not the internal 10-candle slice).
 */
function detectCandlePatterns(ohlcvData) {
  if (!Array.isArray(ohlcvData) || ohlcvData.length < 3) return [];

  // Work with the last 10 candles; translate slice indices back to original
  const data   = ohlcvData.slice(-10);
  const n      = data.length;
  const offset = ohlcvData.length - n; // e.g. if data has 60 bars, offset = 50

  // ── Candle geometry helpers ───────────────────────────────────────────────

  // Real body length (always positive)
  const body  = (c) => Math.abs(c.close - c.open);

  // Upper shadow: distance from body top to high
  const upper = (c) => c.high - Math.max(c.open, c.close);

  // Lower shadow: distance from body bottom to low
  const lower = (c) => Math.min(c.open, c.close) - c.low;

  // Total candle range
  const range = (c) => c.high - c.low;

  // Directional helpers
  const bull = (c) => c.close > c.open;
  const bear = (c) => c.close < c.open;

  // Average body size over the window — normalises "large" vs "small" body thresholds
  // so the function adapts to low-volatility and high-volatility regimes equally.
  const avgBody = data.reduce((s, c) => s + body(c), 0) / n || 1;

  const detected = [];

  function add(patternName, bullishOrBearish, confidence, i) {
    detected.push({
      patternName,
      bullishOrBearish,
      confidence,
      index: offset + i, // position in the caller's original array
    });
  }

  // ── Pattern scan ─────────────────────────────────────────────────────────

  for (let i = 0; i < n; i++) {
    const c = data[i];
    const r = range(c);

    if (r === 0) continue; // skip candles with no movement (data gaps, halts)

    // ── Single-candle patterns ──────────────────────────────────────────────

    // Shooting Star — bearish reversal signal after an advance
    //
    // Shape: long upper shadow (≥ 60% of total range), small or absent lower
    // shadow (≤ 10% of range). The body can be bullish or bearish; what matters
    // is that buyers drove price up sharply intraday but sellers pushed it back
    // down, leaving a long "tail" pointing skyward.
    //
    // High confidence: upper shadow ≥ 70% of range (even more aggressive rejection).
    {
      const upPct = upper(c) / r;
      const loPct = lower(c) / r;
      if (upPct >= 0.60 && loPct <= 0.10) {
        add('Shooting Star', 'bearish', upPct >= 0.70 ? 'high' : 'medium', i);
      }
    }

    // Hammer / Pin Bar — bullish reversal signal after a decline
    //
    // Shape: long lower shadow (≥ 60% of total range), small or absent upper
    // shadow (≤ 10% of range). Sellers drove price sharply lower intraday but
    // buyers absorbed supply and pushed price back near the open, leaving a
    // "hammer handle" or "pin" below the body. Also covers the dragonfly doji
    // (open ≈ close at the high) which has the same significance.
    //
    // High confidence: lower shadow ≥ 70% of range.
    {
      const upPct = upper(c) / r;
      const loPct = lower(c) / r;
      if (loPct >= 0.60 && upPct <= 0.10) {
        add('Hammer', 'bullish', loPct >= 0.70 ? 'high' : 'medium', i);
      }
    }

    if (i < 1) continue; // two-candle patterns require a prior bar
    const p = data[i - 1]; // prior (preceding) candle

    // ── Two-candle patterns ─────────────────────────────────────────────────

    // Bullish Engulfing — bullish reversal
    //
    // Day 1 (p): bearish close (supply in control)
    // Day 2 (c): bullish candle whose BODY fully contains Day 1's body —
    //   opens at or below p's close AND closes at or above p's open.
    //   This means demand completely absorbed prior-day supply and then some,
    //   a sign of aggressive institutional buying stepping in.
    //
    // High confidence: Day 2's body is 1.5× the window's average body size,
    //   indicating a large, convincing demand candle rather than a small engulf.
    if (bear(p) && bull(c) &&
        c.open  <= p.close && // opens at or below Day 1 close (body bottom)
        c.close >= p.open) {  // closes at or above Day 1 open (body top)
      add('Bullish Engulfing', 'bullish', body(c) > avgBody * 1.5 ? 'high' : 'medium', i);
    }

    // Bearish Engulfing — bearish reversal
    //
    // Day 1 (p): bullish close (demand in control)
    // Day 2 (c): bearish candle whose body fully contains Day 1's body —
    //   opens at or above p's close AND closes at or below p's open.
    //   Supply overwhelmed prior-day demand; often marks a local top.
    //
    // High confidence: same 1.5× body-size criterion as above.
    if (bull(p) && bear(c) &&
        c.open  >= p.close && // opens at or above Day 1 close (body top)
        c.close <= p.open) {  // closes at or below Day 1 open (body bottom)
      add('Bearish Engulfing', 'bearish', body(c) > avgBody * 1.5 ? 'high' : 'medium', i);
    }

    if (i < 2) continue; // three-candle patterns require two prior bars
    const pp = data[i - 2]; // two candles back (the first in the trio)

    // ── Three-candle patterns ───────────────────────────────────────────────

    // Evening Star — bearish reversal (three-candle)
    //
    // Candle 1 (pp): strong bullish candle — buyers in command
    // Candle 2 (p):  small body (indecision / "star") — buying momentum stalls;
    //                the real body is less than 35% of the average body size
    // Candle 3 (c):  strong bearish candle that closes BELOW the midpoint of
    //                Candle 1's body, confirming sellers have taken control
    //
    // In strict textbook form the star gaps above Candle 1's close; in modern
    // liquid equity markets intraday gaps are common but overnight gaps are not
    // guaranteed, so we omit the gap requirement and rely on the body-size and
    // penetration criteria instead.
    //
    // High confidence: Candle 3 closes in the lower quarter of Candle 1's body
    //   (i.e. below pp.open + 25% of pp's body), indicating deep penetration.
    if (bull(pp) && body(pp) > avgBody * 0.8 &&          // 1: solid bullish
        body(p) < avgBody * 0.35 &&                       // 2: indecision star
        bear(c) && body(c) > avgBody * 0.8 &&             // 3: solid bearish
        c.close < (pp.open + pp.close) / 2) {             // 3 closes below c1 midpoint
      const deepPenetration = c.close < pp.open + body(pp) * 0.25;
      add('Evening Star', 'bearish', deepPenetration ? 'high' : 'medium', i);
    }

    // Three Black Crows — bearish continuation / reversal (three-candle)
    //
    // Three consecutive large bearish candles where each session:
    //   (a) opens INSIDE the prior candle's real body (not a gap-down open,
    //       which would suggest panic rather than controlled distribution)
    //   (b) closes LOWER than the prior close (persistent downward pressure)
    //   (c) has a small upper shadow (≤ 30% of body), meaning sellers held
    //       control through the session with little bullish pushback
    //
    // All three bodies must be at least 70% of the average body size to
    // confirm sustained institutional selling rather than noise.
    // Confidence is always 'high' because the three-bar confirmation with
    // the open-inside-body criterion already filters aggressively.
    if (bear(pp) && bear(p) && bear(c) &&
        body(pp) > avgBody * 0.7 && body(p) > avgBody * 0.7 && body(c) > avgBody * 0.7 &&
        p.open  < pp.open  && p.open  > pp.close &&  // p opens inside pp's body
        c.open  < p.open   && c.open  > p.close  &&  // c opens inside p's body
        p.close < pp.close && c.close < p.close  &&  // progressively lower closes
        upper(pp) < body(pp) * 0.3 &&                // small upper wick on all three
        upper(p)  < body(p)  * 0.3 &&
        upper(c)  < body(c)  * 0.3) {
      add('Three Black Crows', 'bearish', 'high', i);
    }

    // Three White Soldiers — bullish continuation / reversal (three-candle)
    //
    // The mirror image of Three Black Crows: three consecutive large bullish
    // candles where each session:
    //   (a) opens INSIDE the prior candle's real body
    //   (b) closes HIGHER than the prior close
    //   (c) has a small lower shadow (≤ 30% of body), confirming buyers held
    //       price near the highs with minimal intraday retreat
    //
    // Signals sustained institutional accumulation. Confidence is always 'high'
    // for the same reason as Three Black Crows.
    if (bull(pp) && bull(p) && bull(c) &&
        body(pp) > avgBody * 0.7 && body(p) > avgBody * 0.7 && body(c) > avgBody * 0.7 &&
        p.open  > pp.open  && p.open  < pp.close &&  // p opens inside pp's body
        c.open  > p.open   && c.open  < p.close  &&  // c opens inside p's body
        p.close > pp.close && c.close > p.close  &&  // progressively higher closes
        lower(pp) < body(pp) * 0.3 &&                // small lower wick on all three
        lower(p)  < body(p)  * 0.3 &&
        lower(c)  < body(c)  * 0.3) {
      add('Three White Soldiers', 'bullish', 'high', i);
    }
  }

  // Most recent completing candle first (highest original-array index first)
  detected.sort((a, b) => b.index - a.index);
  return detected;
}

/**
 * classifyTrendContext(ohlcvData, sepaData)
 *
 * Combines price-to-MA relationships, distance from the 52-week high, and
 * the volume-analysis results from analyzePriceAction() to classify where a
 * stock currently sits within its trend cycle.
 *
 * The five possible states map to Minervini's stage analysis:
 *   'breakout'      — price near 52-week high, above both MAs, bullish volume
 *   'uptrend'       — healthy Stage 2 advance above both MAs
 *   'pullback'      — constructive retreat to the 20-day or 50-day MA
 *   'caution'       — distribution present, MA structure broken, or climax volume
 *   'misclassified' — stock is in Stage 1 or Stage 4 and should not be in a
 *                     swing-long watchlist
 *
 * @param {Array<{time,open,high,low,close,volume}>} ohlcvData
 *   OHLCV sorted ascending. Requires ≥ 50 candles for SMA50 to be meaningful.
 *
 * @param {{
 *   stage?:            number,   // 1-4 from SEPA analysis; null/undefined = unknown
 *   fiftyTwoWeekHigh?: number,   // from Yahoo Finance quoteSummary
 *   volumeTrend?:      string,   // 'bullish'|'bearish'|'neutral' from analyzePriceAction
 *   distributionDays?: number,
 *   volumeDryUp?:      boolean,
 *   pocketPivot?:      boolean,
 *   climaxVolume?:     boolean,
 * }} sepaData  Volume analysis + fundamental context. All fields optional.
 *
 * @returns {{
 *   state:             'breakout'|'uptrend'|'pullback'|'caution'|'misclassified',
 *   humanReadableLabel: string,   // e.g. "Stage 2 — Pullback"
 *   color:             'green'|'yellow'|'orange'|'red',
 *   vs20sma:           string,    // e.g. "+3.2%"  (diagnostic)
 *   vs50sma:           string,    // e.g. "-1.1%"  (diagnostic)
 *   distFromHigh:      string|null // e.g. "-4.7%" (diagnostic)
 * }}
 */
function classifyTrendContext(ohlcvData, sepaData = {}) {
  // Returned when there is not enough price history to make a determination
  const INSUFFICIENT = {
    state:              'caution',
    humanReadableLabel: 'Insufficient Data',
    color:              'orange',
    vs20sma:            null,
    vs50sma:            null,
    distFromHigh:       null,
  };

  if (!Array.isArray(ohlcvData) || ohlcvData.length < 50) return INSUFFICIENT;

  // ── Price-to-MA computation ────────────────────────────────────────────────

  const closes       = ohlcvData.map((c) => c.close);
  const currentPrice = closes[closes.length - 1];

  const sma20 = closeSMA(closes, 20);
  const sma50 = closeSMA(closes, 50);

  if (!sma20 || !sma50 || !currentPrice) return INSUFFICIENT;

  // Percentage distance of current price from each moving average
  // Positive = price above the MA; negative = below
  const vs20 = (currentPrice - sma20) / sma20 * 100;
  const vs50 = (currentPrice - sma50) / sma50 * 100;

  const aboveMA20    = currentPrice > sma20;
  const aboveMA50    = currentPrice > sma50;
  // 20-day above 50-day confirms a healthy upward MA stack (Stage 2 structure)
  const ma20AboveMA50 = sma20 > sma50;

  // ── Contextual inputs from sepaData (all optional) ────────────────────────

  const stage           = sepaData.stage           ?? null;  // 1-4 or unknown
  const fiftyTwoWeekHigh = sepaData.fiftyTwoWeekHigh ?? null;
  const volumeTrend     = sepaData.volumeTrend     ?? 'neutral';
  const distributionDays = sepaData.distributionDays ?? 0;
  const volumeDryUp     = sepaData.volumeDryUp     ?? false;
  const pocketPivot     = sepaData.pocketPivot     ?? false;
  const climaxVolume    = sepaData.climaxVolume    ?? false;

  // Distance from 52-week high as a percentage (≤ 0; e.g. -5 = 5% below the high)
  const distFromHighPct = fiftyTwoWeekHigh && fiftyTwoWeekHigh > 0
    ? (currentPrice - fiftyTwoWeekHigh) / fiftyTwoWeekHigh * 100
    : null;

  // ── Classification decision tree ───────────────────────────────────────────
  //
  // Rules are evaluated top-to-bottom; the first match wins.
  // Structural failures (wrong stage, deeply broken MA) override everything.

  let state;

  // ── MISCLASSIFIED ──────────────────────────────────────────────────────────
  // Stage 1 (base-building / neglected): no trend yet — risk-off.
  // Stage 4 (downtrend): institutional sellers in control — never buy.
  if (stage === 1 || stage === 4) {
    state = 'misclassified';
  }

  // Price > 15% below 50-day SMA regardless of stated stage: structural downtrend.
  // Catching a falling knife at this depth is statistically a losing strategy.
  else if (vs50 < -15) {
    state = 'misclassified';
  }

  // ── CAUTION ───────────────────────────────────────────────────────────────
  // Stage 3 (top / late distribution): the uptrend is aging; odds worsen.
  else if (stage === 3) {
    state = 'caution';
  }

  // Heavy distribution: ≥ 4 above-average-volume down days in the last 10 sessions
  // signals institutions are actively reducing positions.
  else if (distributionDays >= 4) {
    state = 'caution';
  }

  // Climax volume below the 50-day MA is pure capitulation / institutional dumping.
  else if (climaxVolume && !aboveMA50) {
    state = 'caution';
  }

  // Below the 50-day MA: key support lost, uptrend structure broken.
  // May recover, but entering here means fighting the trend.
  else if (!aboveMA50) {
    state = 'caution';
  }

  // ── BREAKOUT ──────────────────────────────────────────────────────────────
  // All conditions must be green:
  //   • Price above both MAs (healthy MA stack)
  //   • Within 5% of the 52-week high (near the highs, not extended)
  //     or a pocket pivot just fired (quieter demand-led entry)
  //   • Bullish volume trend OR active pocket pivot signal
  //   • Fewer than 3 distribution days (institutions not selling into strength)
  else if (
    aboveMA20 && aboveMA50 &&
    (distFromHighPct === null || distFromHighPct >= -5 || pocketPivot) &&
    (volumeTrend === 'bullish' || pocketPivot) &&
    distributionDays < 3
  ) {
    state = 'breakout';
  }

  // ── UPTREND ───────────────────────────────────────────────────────────────
  // Above both MAs with the 20-day stacked above the 50-day: classic Stage 2.
  // Downgrade to caution if distribution is accumulating (3 days is a yellow flag).
  else if (aboveMA20 && aboveMA50 && ma20AboveMA50) {
    state = distributionDays >= 3 ? 'caution' : 'uptrend';
  }

  // Above both MAs but 20-day has crossed below 50-day: MA stack deteriorating.
  // Still above key support but losing momentum — treat as caution.
  else if (aboveMA20 && aboveMA50 && !ma20AboveMA50) {
    state = 'caution';
  }

  // ── PULLBACK ──────────────────────────────────────────────────────────────
  // Above the 50-day MA (long-term uptrend intact) but at or below the 20-day
  // MA (short-term momentum stalled). This is a normal, healthy correction.
  //
  // Constructive pullback: volume is drying up (supply exhausted, sellers done).
  // Unhealthy pullback: heavy volume on down days (active distribution) → caution.
  else if (aboveMA50 && !aboveMA20) {
    state = (volumeTrend === 'bearish' && !volumeDryUp) ? 'caution' : 'pullback';
  }

  // ── FALLBACK ──────────────────────────────────────────────────────────────
  else {
    state = 'caution';
  }

  // ── Output formatting ──────────────────────────────────────────────────────

  const STATE_LABELS = {
    breakout:      'Breakout',
    uptrend:       'Uptrend',
    pullback:      'Pullback',
    caution:       'Caution',
    misclassified: 'Misclassified',
  };

  const COLOR_MAP = {
    breakout:      'green',
    uptrend:       'green',
    pullback:      'yellow',
    caution:       'orange',
    misclassified: 'red',
  };

  // Prefix with stage when known (mirrors Minervini stage framing)
  const stagePrefix = stage ? `Stage ${stage} — ` : '';
  const humanReadableLabel = `${stagePrefix}${STATE_LABELS[state]}`;

  const fmtPct = (v) => `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`;

  return {
    state,
    humanReadableLabel,
    color:        COLOR_MAP[state],
    vs20sma:      fmtPct(vs20),
    vs50sma:      fmtPct(vs50),
    distFromHigh: distFromHighPct !== null ? fmtPct(distFromHighPct) : null,
  };
}

/**
 * getPriceActionVerdict(ohlcvData, sepaScore, sepaDetails)
 *
 * Master function: runs the three analysis helpers, fuses their output with
 * the SEPA fundamental score, and returns a single actionability verdict plus
 * a trade-plan state that controls what the UI is allowed to show the user.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * COMPOSITE SCORING (0 – 100, clamped)
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * A. SEPA Fundamentals Gate          0 – 50 pts
 *    sepaScore (0–8 passing criteria) × 6.25
 *    Missing (null) → 25 pts (neutral; no reward, no penalty)
 *
 * B. Price-Action / Volume Profile   0 – 50 pts (clamped, never negative)
 *
 *    Trend-context base score
 *      breakout       +25
 *      uptrend        +20
 *      pullback       +12
 *      caution        + 4
 *      misclassified  + 0
 *
 *    Volume signals             (additive; each applied once)
 *      volumeTrend bullish      + 8
 *      volumeTrend neutral      + 4
 *      volumeTrend bearish      + 0
 *      volumeDryUp              + 5   (supply exhausted — constructive)
 *      pocketPivot              + 7   (demand > highest prior supply day)
 *      accumulationDays ≥ 3     + 4   (institutions accumulating)
 *      climaxVolume             − 5   (potential exhaustion blow-off)
 *      distributionDays ≥ 4    −10   (heavy institutional selling)
 *      distributionDays = 3     − 5
 *      distributionDays 1–2     − 2
 *
 *    Candle patterns — all detected patterns, recency-weighted, clamped [−20, +30]
 *      Candles 1–5 (most recent): 2× weight   Candles 6–10: 1× weight
 *      Bullish Engulfing (high confidence)  +15 per occurrence × weight
 *      Other bullish (high confidence)      + 5 per occurrence × weight
 *      Other bullish (medium)               + 3 per occurrence × weight
 *      Bearish (high confidence)            − 5 per occurrence × weight
 *      Bearish (medium)                     − 2 per occurrence × weight
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * VERDICT THRESHOLDS
 * ─────────────────────────────────────────────────────────────────────────────
 *   75 – 100  actionable   High-probability setup; all gates green
 *   55 –  74  watch        Developing setup; wait for a trigger candle
 *   35 –  54  wait         Key criteria missing; revisit when conditions improve
 *    0 –  34  avoid        Structural or fundamental failure; skip
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * TRADE-PLAN STATE  (SEPA + Price-Action combined gate)
 * ─────────────────────────────────────────────────────────────────────────────
 *   full        Score ≥ 75 AND sepaScore ≥ 5 AND trend in {breakout, uptrend}
 *               → Show full trade plan (entry, target, stop)
 *
 *   caution     Score 55–74, OR score ≥ 75 with weakened fundamentals
 *               → Show trade plan with risk warnings highlighted
 *
 *   monitor     Score 35–54
 *               → Show summary only; suppress detailed trade plan
 *
 *   suppressed  Any hard-fail condition is true (see below)
 *               → Hide trade plan entirely; show suppressionReason
 *
 * Hard-fail suppression triggers (evaluated in order; first match wins):
 *   1. trendContext.state === 'misclassified'
 *      → "Stage 1 / 4 structure — stock not in a swing-tradeable trend"
 *   2. distributionDays ≥ 4 AND trendContext.state !== 'breakout'
 *      → "Heavy distribution (n distribution days) — institutions are selling"
 *   3. sepaScore is known AND sepaScore < 3
 *      → "Setup score too low (n/8 SEPA criteria passing)"
 *   4. trendContext.state === 'caution' AND distributionDays ≥ 3
 *      → "Distribution + broken MA structure — wait for base reset"
 *   5. composite score < 35
 *      → "Combined score (n/100) below minimum actionable threshold"
 *
 * @param {Array<{time,open,high,low,close,volume}>} ohlcvData
 *   OHLCV sorted ascending. Passed directly to the three sub-functions.
 *
 * @param {number|null} sepaScore
 *   Count of passing SEPA criteria (0–8).  Pass null when unavailable.
 *
 * @param {{
 *   stage?: number,            // 1–4; forwarded to classifyTrendContext
 *   fiftyTwoWeekHigh?: number, // forwarded to classifyTrendContext
 * }} sepaDetails
 *   Optional extra fields forwarded to classifyTrendContext as sepaData.
 *   Pass {} when unavailable.
 *
 * @returns {{
 *   score:             number,
 *   verdict:           'actionable'|'watch'|'wait'|'avoid',
 *   verdictLabel:      string,
 *   tradePlanState:    'full'|'caution'|'monitor'|'suppressed',
 *   suppressionReason: string|null,
 *   trendContext:      object,
 *   volumeAnalysis:    object,
 *   candlePatterns:    Array,
 *   scoreBreakdown:    { sepaPoints: number, priceActionPoints: number }
 * }}
 */
function getPriceActionVerdict(ohlcvData, sepaScore = null, sepaDetails = {}) {

  // ── Run sub-functions ──────────────────────────────────────────────────────

  const volumeAnalysis = analyzePriceAction(ohlcvData);
  const candlePatterns = detectCandlePatterns(ohlcvData);
  const trendContext   = classifyTrendContext(ohlcvData, {
    ...sepaDetails,
    ...volumeAnalysis, // spread volume signals so classifyTrendContext can use them
  });

  const {
    distributionDays,
    accumulationDays,
    volumeDryUp,
    climaxVolume,
    pocketPivot,
    volumeTrend,
  } = volumeAnalysis;

  const { state: trendState } = trendContext;

  // ── A. SEPA points (0 – 50) ────────────────────────────────────────────────

  const sepaPoints = sepaScore != null
    ? Math.round((sepaScore / 8) * 50)
    : 25; // neutral when no SEPA data is supplied

  // ── B. Price-action points ─────────────────────────────────────────────────

  // 1. Trend-context base
  const TREND_BASE = {
    breakout:      25,
    uptrend:       20,
    pullback:      12,
    caution:        4,
    misclassified:  0,
  };
  let paRaw = TREND_BASE[trendState] ?? 4;

  // 2. Volume signals
  if      (volumeTrend === 'bullish') paRaw += 8;
  else if (volumeTrend === 'neutral') paRaw += 4;
  // bearish → +0

  if (volumeDryUp)          paRaw += 5;
  if (pocketPivot)          paRaw += 7;
  if (accumulationDays >= 3) paRaw += 4;

  if (climaxVolume)                   paRaw -= 5;
  if      (distributionDays >= 4)     paRaw -= 10;
  else if (distributionDays === 3)    paRaw -= 5;
  else if (distributionDays >= 1)     paRaw -= 2;

  // 3. Candle patterns — recency-weighted across all detected patterns
  //
  // Patterns completing within the last 5 candles (candles 1–5, most recent)
  // carry 2× weight vs patterns from candles 6–10.
  //
  // Base point values per pattern:
  //   Bullish Engulfing (high confidence)  → +15  (demand overwhelms prior supply)
  //   Any other bullish (high confidence)  → + 5
  //   Any other bullish (medium)           → + 3
  //   Bearish (high confidence)            → − 5
  //   Bearish (medium)                     → − 2
  //
  // Contribution is clamped to [−20, +30] before adding to paRaw so that
  // a cluster of patterns in the same window cannot dominate the full score.
  if (candlePatterns.length > 0) {
    const recentCutoff = ohlcvData.length - 5; // patterns at index ≥ this → 2×
    let patternRaw = 0;

    for (const pat of candlePatterns) {
      const weight = pat.index >= recentCutoff ? 2 : 1;
      let pts;
      if (pat.bullishOrBearish === 'bullish') {
        pts = (pat.patternName === 'Bullish Engulfing' && pat.confidence === 'high')
          ? 15
          : pat.confidence === 'high' ? 5 : 3;
      } else {
        pts = pat.confidence === 'high' ? -5 : -2;
      }
      patternRaw += pts * weight;
    }

    paRaw += Math.max(-20, Math.min(30, patternRaw));
  }

  // Clamp price-action sub-score to 0 – 50
  const priceActionPoints = Math.max(0, Math.min(50, paRaw));

  // ── Composite score (0 – 100) ──────────────────────────────────────────────

  const score = Math.max(0, Math.min(100, sepaPoints + priceActionPoints));

  // ── Verdict ────────────────────────────────────────────────────────────────

  const VERDICT_TABLE = [
    { min: 75, verdict: 'actionable', label: 'Actionable Setup'       },
    { min: 55, verdict: 'watch',      label: 'Watch — Developing'      },
    { min: 35, verdict: 'wait',       label: 'Wait — Not Ready'        },
    { min:  0, verdict: 'avoid',      label: 'Avoid — Structural Risk' },
  ];

  const { verdict, label: verdictLabel } = VERDICT_TABLE.find((t) => score >= t.min);

  // ── Trade-plan state + suppression logic ──────────────────────────────────

  let tradePlanState;
  let suppressionReason = null;

  // Hard-fail checks (in priority order)
  if (trendState === 'misclassified') {
    tradePlanState    = 'suppressed';
    suppressionReason = 'Stage 1 / 4 structure — stock not in a swing-tradeable trend';
  } else if (distributionDays >= 4 && trendState !== 'breakout') {
    tradePlanState    = 'suppressed';
    suppressionReason = `Heavy distribution (${distributionDays} distribution days) — institutions are selling`;
  } else if (sepaScore != null && sepaScore < 3) {
    tradePlanState    = 'suppressed';
    suppressionReason = `Setup score too low (${sepaScore}/8 SEPA criteria passing)`;
  } else if (trendState === 'caution' && distributionDays >= 3) {
    tradePlanState    = 'suppressed';
    suppressionReason = 'Distribution + broken MA structure — wait for base reset';
  } else if (score < 35) {
    tradePlanState    = 'suppressed';
    suppressionReason = `Combined score (${score}/100) below minimum actionable threshold`;
  }

  // Positive path
  else if (score >= 75 && (sepaScore == null || sepaScore >= 5) &&
           (trendState === 'breakout' || trendState === 'uptrend')) {
    tradePlanState = 'full';
  } else if (score >= 55) {
    tradePlanState = 'caution';
  } else {
    // 35 – 54
    tradePlanState = 'monitor';
  }

  // ── Return ─────────────────────────────────────────────────────────────────

  return {
    score,
    verdict,
    verdictLabel,
    tradePlanState,
    suppressionReason,
    trendContext,
    volumeAnalysis,
    candlePatterns,
    scoreBreakdown: { sepaPoints, priceActionPoints },
  };
}

module.exports = {
  analyzePriceAction,
  detectCandlePatterns,
  classifyTrendContext,
  getPriceActionVerdict,
};
