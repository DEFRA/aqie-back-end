/**
 * Single implementation of the data-capture and averaging rules shared by the
 * map DAQI and the station history endpoint (DAQI, Last 24 hours and Last 7
 * days).
 *
 * Rules:
 *  - An average exists only if at least 75% of its inputs are valid:
 *      hourly mean   3 of 4 fifteen-minute means
 *      8-hour mean   6 of 8 hourly means
 *      daily mean   18 of 24 hourly means
 *  - Below that the result is `null`. There is no fallback to "whatever is
 *    available".
 *  - Missing hours count as invalid. Windows are walked on a fixed time grid,
 *    never by array length, so a gap cannot make eight readings span ten hours.
 *  - Nothing is rounded here. Means stay unrounded so intermediate values can
 *    feed later means; use roundConcentration() only immediately before a
 *    comparison or for display.
 *
 * Times are the END of the averaging period (a reading for 09:00-10:00 is
 * stamped 10:00), matching the upstream endDateTime.
 */

const MINUTES_PER_HOUR = 60
const MS_PER_MINUTE = 60 * 1000
const HOUR_MS = MINUTES_PER_HOUR * MS_PER_MINUTE
const QUARTER_HOURS_MS = HOUR_MS / 4
const HOURS_PER_DAY = 24
const QUARTERS_PER_HOUR = 4
const O3_ROLLING_HOURS = 8

/** Minimum valid inputs out of `size` for each averaging period (75%). */
const CAPTURE_RULES = {
  hourlyFromQuarters: { size: QUARTERS_PER_HOUR, min: 3 },
  rolling8h: { size: O3_ROLLING_HOURS, min: 6 },
  daily: { size: HOURS_PER_DAY, min: 18 },
  rolling24h: { size: HOURS_PER_DAY, min: 18 }
}

/** Minimum share of expected hours that must be valid for a period average. */
const MIN_CAPTURE_RATIO = 0.75

// A float sum such as 66.49999999999999 should round as 66.5 would.
const SIGNIFICANT_DIGITS = 12

/**
 * Rounds a concentration to a whole number. The only rounding used before a
 * DAQI band or legal-limit comparison and for display.
 *
 * @param {number} value
 * @returns {number}
 */
function roundConcentration(value) {
  return Math.round(Number.parseFloat(value.toPrecision(SIGNIFICANT_DIGITS)))
}

function isValidValue(value) {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
}

/**
 * Indexes points by end time. Negative or non-numeric values (the -9999 and
 * -99 "no reading" sentinels) are stored as null. If a time appears twice a
 * valid value wins over an invalid one.
 *
 * @param {Array<{ time: string|number, value: number|null }>} points
 * @returns {Map<number, number|null>}
 */
function toSeriesIndex(points) {
  const index = new Map()
  for (const point of points ?? []) {
    const ms =
      typeof point.time === 'number' ? point.time : Date.parse(point.time)
    if (Number.isNaN(ms)) {
      continue
    }
    const value = isValidValue(point.value) ? point.value : null
    if (value !== null || !index.has(ms)) {
      index.set(ms, value)
    }
  }
  return index
}

/**
 * Mean of the `size` periods ending at `endMs`, or null if fewer than `min`
 * of them are valid.
 */
function meanOverGrid(index, endMs, size, stepMs, min) {
  let sum = 0
  let valid = 0
  for (let i = 0; i < size; i++) {
    const value = index.get(endMs - i * stepMs)
    if (value !== null && value !== undefined) {
      sum += value
      valid++
    }
  }
  return valid >= min ? sum / valid : null
}

/** Hourly mean from four fifteen-minute means (at least 3 valid). */
function hourlyMeanFromQuarters(quarterIndex, hourEndMs) {
  const { size, min } = CAPTURE_RULES.hourlyFromQuarters
  return meanOverGrid(quarterIndex, hourEndMs, size, QUARTER_HOURS_MS, min)
}

/** Rolling mean of the `hours` hourly means ending at `endMs`. */
function rollingMean(hourIndex, endMs, hours, min) {
  return meanOverGrid(hourIndex, endMs, hours, HOUR_MS, min)
}

/** Daily mean of the 24 hourly means ending at `dayEndMs` (at least 18 valid). */
function dailyMean(hourIndex, dayEndMs) {
  const { size, min } = CAPTURE_RULES.daily
  return rollingMean(hourIndex, dayEndMs, size, min)
}

/**
 * Builds hourly means from fifteen-minute means. An hour is produced only
 * once the quarter ending exactly on the hour exists, so a part-finished
 * hour is not reported as an hour with too little data.
 *
 * @param {Array<{ time: string, value: number|null }>} quarterPoints
 * @returns {Array<{ time: string, value: number|null }>} oldest first
 */
function deriveHourlyFromQuarters(quarterPoints) {
  const quarterIndex = toSeriesIndex(quarterPoints)
  const hourEnds = [...quarterIndex.keys()]
    .filter((ms) => ms % HOUR_MS === 0)
    .sort((a, b) => a - b)
  return hourEnds.map((ms) => ({
    time: new Date(ms).toISOString(),
    value: hourlyMeanFromQuarters(quarterIndex, ms)
  }))
}

/**
 * Newest valid entry at or before `upToMs`.
 *
 * @returns {{ ms: number, value: number }|null}
 */
function latestValid(index, upToMs = Infinity) {
  let latest = null
  for (const [ms, value] of index) {
    if (value !== null && ms <= upToMs && (latest === null || ms > latest.ms)) {
      latest = { ms, value }
    }
  }
  return latest
}

/** How each pollutant's DAQI concentration is averaged. */
const DAQI_AVERAGING = {
  PM25: { period: '24-hour mean', hours: HOURS_PER_DAY, rule: 'rolling24h' },
  PM10: { period: '24-hour mean', hours: HOURS_PER_DAY, rule: 'rolling24h' },
  O3: { period: '8-hour mean', hours: O3_ROLLING_HOURS, rule: 'rolling8h' },
  NO2: { period: '1-hour mean' },
  SO2: { period: '15-minute mean' }
}

/**
 * The unrounded concentration the DAQI index is based on for one pollutant,
 * evaluated at the pollutant's newest valid reading at or before `upToMs`.
 * Returns null when there is no reading or the capture rule is not met.
 *
 * NO2 uses the hourly mean, PM2.5/PM10 the 24-hour mean, O3 the 8-hour mean
 * and SO2 the latest 15-minute mean (so SO2 needs fifteen-minute data).
 *
 * @param {string} code
 * @param {{ hourIndex?: Map<number, number|null>, quarterIndex?: Map<number, number|null> }} series
 * @param {number} [upToMs]
 * @returns {{ value: number, measuredAt: string }|null}
 */
function daqiConcentration(code, series, upToMs = Infinity) {
  const averaging = DAQI_AVERAGING[code]
  if (!averaging) {
    return null
  }

  if (code === 'SO2') {
    const latestQuarter = latestValid(series.quarterIndex ?? new Map(), upToMs)
    return latestQuarter && toResult(latestQuarter.value, latestQuarter.ms)
  }

  const hourIndex = series.hourIndex ?? new Map()
  const latestHour = latestValid(hourIndex, upToMs)
  if (!latestHour) {
    return null
  }
  if (!averaging.rule) {
    return toResult(latestHour.value, latestHour.ms)
  }

  const value = rollingMean(
    hourIndex,
    latestHour.ms,
    averaging.hours,
    CAPTURE_RULES[averaging.rule].min
  )
  return value === null ? null : toResult(value, latestHour.ms)
}

function toResult(value, ms) {
  return { value, measuredAt: new Date(ms).toISOString() }
}

/** Interval in minutes of a Ricardo row (end minus start), or NaN if unknown. */
function intervalMinutes(row) {
  return (
    (Date.parse(row?.endDateTime) - Date.parse(row?.startDateTime)) /
    MS_PER_MINUTE
  )
}

export {
  CAPTURE_RULES,
  DAQI_AVERAGING,
  HOURS_PER_DAY,
  HOUR_MS,
  MIN_CAPTURE_RATIO,
  QUARTER_HOURS_MS,
  dailyMean,
  daqiConcentration,
  deriveHourlyFromQuarters,
  hourlyMeanFromQuarters,
  intervalMinutes,
  latestValid,
  meanOverGrid,
  rollingMean,
  roundConcentration,
  toSeriesIndex
}
