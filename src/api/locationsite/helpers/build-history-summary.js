import {
  CAPTURE_RULES,
  DAQI_AVERAGING,
  HOUR_MS,
  HOURS_PER_DAY,
  MIN_CAPTURE_RATIO,
  dailyMean,
  daqiConcentration,
  rollingMean,
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

function summarisePollutant({
  code,
  hourEnds,
  expectedHours,
  hourIndex,
  quarterIndex
}) {
  const windowValues = hourEnds.map((ms) => hourIndex.get(ms) ?? null)
  const validValues = windowValues.filter((value) => value !== null)
  const valid = validValues.length

  // Gated on the share of the whole window, so missing hours count against it.
  const periodAverage =
    valid / expectedHours >= MIN_CAPTURE_RATIO
      ? validValues.reduce((sum, value) => sum + value, 0) / valid
      : null

  const hourlyLimit = HOURLY_LIMITS[code]
  const dailyLimit = DAILY_LIMITS[code]

  const dailyMeans = hourEnds
    .filter((ms) => ms % DAY_MS === 0)
    .map((ms) => ({
      time: new Date(ms).toISOString(),
      value: dailyMean(hourIndex, ms)
    }))

  const averaging = DAQI_AVERAGING[code]
  const rolling = averaging?.rule
    ? {
        windowHours: averaging.hours,
        series: hourEnds.map((ms) => ({
          time: new Date(ms).toISOString(),
          value: rollingMean(
            hourIndex,
            ms,
            averaging.hours,
            CAPTURE_RULES[averaging.rule].min
          )
        }))
      }
    : null

  const concentration = daqiConcentration(code, { hourIndex, quarterIndex })

  return {
    periodAverage,
    dataCapture: {
      validHours: valid,
      expectedHours,
      capturePercentage: Math.round((PERCENT * valid) / expectedHours)
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
    rollingMean: rolling,
    daqi: concentration && {
      concentration: concentration.value,
      index: daqiIndexForPollutant(code, concentration.value),
      measuredAt: concentration.measuredAt,
      averagingPeriod: averaging.period
    }
  }
}

/**
 * Builds the data-capture, average, rolling-mean, exceedance and DAQI figures
 * for a station history response. Every figure follows the shared rules in
 * common/helpers/averaging.js: 75% data capture or the value is `null`, and
 * nothing is rounded except immediately before a comparison.
 *
 * `periodAverage` is the mean of the window's valid hourly means, provided at least
 * 75% of the window's hours are valid.
 *
 * @param {{ period: string, from: string|null, to: string|null, pollutants: Record<string, Array<{time: string, value: number|null}>>, leadIn?: Record<string, Array<{time: string, value: number|null}>>, fifteenMinute?: Record<string, Array<{time: string, value: number|null}>> }} history
 */
function buildHistorySummary({
  period,
  from,
  to,
  pollutants,
  leadIn = {},
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
      hourEnds,
      expectedHours,
      hourIndex: toSeriesIndex([...(leadIn[code] ?? []), ...windowPoints]),
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
