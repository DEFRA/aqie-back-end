import {
  DAQI_AVERAGING,
  HOUR_MS,
  HOURS_PER_DAY,
  MIN_CAPTURE_RATIO,
  dailyMean,
  daqiConcentration,
  roundConcentration,
  toSeriesIndex
} from '../../../common/helpers/averaging.js'
import {
  calculateDaqiIndex,
  daqiIndexForPollutant
} from '../../aurn/helpers/daqi-calculator.js'
import { PERIOD_DAYS } from './fetch-pollutant-history.js'

const PERCENT = 100
const DAY_MS = HOURS_PER_DAY * HOUR_MS

/** Legal limits (µg/m³). A mean exceeds one when its rounded value is above it. */
const HOURLY_LIMITS = { NO2: 200, SO2: 350 }
const DAILY_LIMITS = { PM10: 50, SO2: 125 }

/** End times of the hourly periods in the window, oldest first. */
function windowHourEnds(from, to, expectedHours) {
  const toMs = Date.parse(to)
  if (!from || Number.isNaN(toMs)) {
    return []
  }
  return Array.from(
    { length: expectedHours },
    (_, i) => toMs - (expectedHours - 1 - i) * HOUR_MS
  )
}

const exceeds = (value, limit) =>
  value !== null && roundConcentration(value) > limit

const mean = (values) =>
  values.reduce((sum, value) => sum + value, 0) / values.length

// The 7-day average is the mean of the seven daily means (each needing 18 of
// 24 valid hours). The 24-hour average is the mean of its hourly means.
const DAILY_MEAN_PERIODS = new Set(['7d'])

function summarisePollutant({
  code,
  period,
  hourEnds,
  expectedHours,
  hourIndex,
  quarterIndex
}) {
  const windowValues = hourEnds.map((ms) => hourIndex.get(ms) ?? null)
  const validValues = windowValues.filter((value) => value !== null)
  const valid = validValues.length

  const hourlyLimit = HOURLY_LIMITS[code]
  const dailyLimit = DAILY_LIMITS[code]

  const dailyMeans = hourEnds
    .filter((ms) => ms % DAY_MS === 0)
    .map((ms) => ({
      time: new Date(ms).toISOString(),
      value: dailyMean(hourIndex, ms)
    }))

  // Gated on the share of the whole window, so missing hours count against it.
  const meetsCapture = valid / expectedHours >= MIN_CAPTURE_RATIO
  const averageInputs = DAILY_MEAN_PERIODS.has(period)
    ? dailyMeans.map(({ value }) => value).filter((value) => value !== null)
    : validValues
  const periodAverage =
    meetsCapture && averageInputs.length > 0 ? mean(averageInputs) : null

  const averaging = DAQI_AVERAGING[code]
  const concentration = daqiConcentration(code, { hourIndex, quarterIndex })

  return {
    periodAverage,
    dataCapture: {
      validHours: valid,
      expectedHours,
      capturePercentage: Math.round((PERCENT * valid) / expectedHours),
      // True exactly when the average is withheld, so the "Low data capture"
      // tag and the "-" in the Average column always agree.
      isLowDataCapture: periodAverage === null
    },
    hourlyExceedances:
      hourlyLimit === undefined
        ? null
        : validValues.filter((value) => exceeds(value, hourlyLimit)).length,
    dailyExceedances:
      dailyLimit === undefined
        ? null
        : dailyMeans.filter(({ value }) => exceeds(value, dailyLimit)).length,
    dailyMeans,
    daqi: concentration && {
      concentration: concentration.value,
      index: daqiIndexForPollutant(code, concentration.value),
      measuredAt: concentration.measuredAt,
      averagingPeriod: averaging.period
    }
  }
}

/**
 * Builds the data-capture, average, daily-mean, exceedance and DAQI figures
 * for a station history response. Every figure follows the shared rules in
 * common/helpers/averaging.js: 75% data capture or the value is `null`, and
 * nothing is rounded except immediately before a comparison.
 *
 * `periodAverage` is the 7-day average for `7d` (the mean of the valid daily
 * means) and the 24-hour average for `24h` (the mean of the window's valid
 * hourly means). Either is `null` unless at least 75% of the window's hours are
 * valid, and `dataCapture.isLowDataCapture` is true exactly then.
 *
 * Everything is calculated from the window alone: a `7d` window is seven
 * complete UTC days, and the DAQI concentrations (24-hour, 8-hour, 1-hour and
 * 15-minute means) end at the window's newest reading.
 *
 * @param {{ period: string, from: string|null, to: string|null, pollutants: Record<string, Array<{time: string, value: number|null}>>, fifteenMinute?: Record<string, Array<{time: string, value: number|null}>> }} history
 */
function buildHistorySummary({
  period,
  from,
  to,
  pollutants,
  fifteenMinute = {}
}) {
  const expectedHours = PERIOD_DAYS[period] * HOURS_PER_DAY
  const hourEnds = windowHourEnds(from, to, expectedHours)

  const byCode = {}
  const daqiValues = {}
  let measuredAt = null

  for (const [code, windowPoints] of Object.entries(pollutants ?? {})) {
    byCode[code] = summarisePollutant({
      code,
      period,
      hourEnds,
      expectedHours,
      hourIndex: toSeriesIndex(windowPoints),
      quarterIndex: toSeriesIndex(fifteenMinute[code])
    })
    const daqi = byCode[code].daqi
    if (daqi) {
      daqiValues[code] = daqi.concentration
      if (!measuredAt || daqi.measuredAt > measuredAt) {
        measuredAt = daqi.measuredAt
      }
    }
  }

  return {
    daqiIndex: calculateDaqiIndex(daqiValues),
    measuredAt,
    pollutants: byCode
  }
}

export { buildHistorySummary, HOURLY_LIMITS, DAILY_LIMITS }
