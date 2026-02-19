/**
 * Calculate the stop-loss price given an entry and a percentage below entry.
 * @param {number} entry  - Entry price
 * @param {number} pct    - Stop distance as a decimal (default 7.5%)
 * @returns {number}
 */
export function calculateStopLoss(entry, pct = 0.075) {
  return entry * (1 - pct);
}

/**
 * Calculate the number of shares to buy to risk a fixed dollar amount.
 * @param {number} accountSize - Total account value in dollars
 * @param {number} riskPct     - Fraction of account to risk (e.g. 0.01 = 1%)
 * @param {number} entry       - Entry price per share
 * @param {number} stop        - Stop-loss price per share
 * @returns {{ shares: number, riskDollars: number, positionValue: number }}
 */
export function calculatePositionSize(accountSize, riskPct, entry, stop) {
  const riskDollars = accountSize * riskPct;
  const riskPerShare = entry - stop;
  if (riskPerShare <= 0) return { shares: 0, riskDollars, positionValue: 0 };
  const shares = Math.floor(riskDollars / riskPerShare);
  return {
    shares,
    riskDollars,
    positionValue: shares * entry,
  };
}

/**
 * Calculate a Simple Moving Average over an array of OHLCV candles.
 * @param {Array<{time: number, close: number}>} data   - Candle array (ascending time)
 * @param {number} period                               - SMA period (e.g. 50, 200)
 * @returns {Array<{time: number, value: number}>}
 */
export function calculateSMA(data, period) {
  if (!data || data.length < period) return [];
  const result = [];
  let sum = 0;
  for (let i = 0; i < data.length; i++) {
    sum += data[i].close;
    if (i >= period) sum -= data[i - period].close;
    if (i >= period - 1) {
      result.push({ time: data[i].time, value: parseFloat((sum / period).toFixed(4)) });
    }
  }
  return result;
}

/**
 * Calculate risk/reward ratio and reward dollar amount.
 * @param {number} entry  - Entry price
 * @param {number} stop   - Stop-loss price
 * @param {number} target - Profit target price
 * @returns {{ ratio: number, riskAmount: number, rewardAmount: number }}
 */
export function calculateRiskReward(entry, stop, target) {
  const riskAmount = entry - stop;
  const rewardAmount = target - entry;
  if (riskAmount <= 0) return { ratio: 0, riskAmount, rewardAmount };
  return {
    ratio: rewardAmount / riskAmount,
    riskAmount,
    rewardAmount,
  };
}
