/**
 * Revenue forecasting — ordinary least squares, no database access.
 *
 * A linear trend fitted to actual daily history, projected forward, with a
 * prediction interval from the fit's own residual variance. Not a trained
 * "AI model" — a stated, inspectable statistical method, which is the
 * honest choice when the only ground truth available is however many days
 * of this account's own history exist.
 */

export type Trend = "up" | "down" | "flat";

export type Forecast = {
  predicted: number;
  low: number;
  high: number;
  trend: Trend;
  /** How many of the trailing days actually had any data. */
  observedDays: number;
};

/**
 * `series` is one value per day, oldest first, zero-filled for days with no
 * activity — the caller supplies a complete calendar, not a sparse list, so
 * the regression's x-axis is real elapsed time.
 */
export function linearForecast(series: number[], periodsAhead: number): Forecast {
  const n = series.length;
  const observedDays = series.filter((v) => v > 0).length;

  if (n < 2 || periodsAhead <= 0) {
    const flatValue = n > 0 ? series[n - 1] : 0;
    return { predicted: Math.round(flatValue * periodsAhead), low: 0, high: Math.round(flatValue * periodsAhead * 1.5), trend: "flat", observedDays };
  }

  const xMean = (n - 1) / 2;
  const yMean = series.reduce((sum, v) => sum + v, 0) / n;

  let numerator = 0;
  let denominator = 0;
  for (let i = 0; i < n; i++) {
    numerator += (i - xMean) * (series[i] - yMean);
    denominator += (i - xMean) ** 2;
  }
  const slope = denominator === 0 ? 0 : numerator / denominator;
  const intercept = yMean - slope * xMean;

  let residualSumSq = 0;
  for (let i = 0; i < n; i++) {
    const fitted = slope * i + intercept;
    residualSumSq += (series[i] - fitted) ** 2;
  }
  const residualStdDev = Math.sqrt(residualSumSq / Math.max(1, n - 2));

  let predicted = 0;
  for (let i = n; i < n + periodsAhead; i++) {
    predicted += Math.max(0, slope * i + intercept);
  }

  // A 90% prediction interval for the sum of `periodsAhead` independent
  // future points, each carrying the fit's own residual noise.
  const intervalWidth = 1.645 * residualStdDev * Math.sqrt(periodsAhead);

  const magnitude = Math.max(Math.abs(yMean), 1);
  const trend: Trend = slope > magnitude * 0.02 ? "up" : slope < -magnitude * 0.02 ? "down" : "flat";

  return {
    predicted: Math.round(predicted),
    low: Math.max(0, Math.round(predicted - intervalWidth)),
    high: Math.round(predicted + intervalWidth),
    trend,
    observedDays,
  };
}
