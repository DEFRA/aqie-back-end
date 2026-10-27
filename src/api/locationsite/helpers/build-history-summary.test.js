import { describe, it, expect } from 'vitest'
import { buildHistorySummary } from './build-history-summary.js'

const HOUR_MS = 60 * 60 * 1000
const DAY_MS = 24 * HOUR_MS
const QUARTER_MS = 15 * 60 * 1000

// 24h window of hour-ending stamps: 10:00 on the 20th to 09:00 on the 21st.
const TO_24H = Date.parse('2026-10-21T09:00:00Z')
const FROM_24H = TO_24H - 23 * HOUR_MS

// 7d window: ends 23:00 on the 26th, so it holds exactly seven UTC midnights.
const TO_7D = Date.parse('2026-10-26T23:00:00Z')
const FROM_7D = TO_7D - 167 * HOUR_MS

const iso = (ms) => new Date(ms).toISOString()

/** Hourly points for `count` hours ending at `endMs`; a function or constant supplies values. */
function hourly(endMs, count, value) {
  return Array.from({ length: count }, (_, i) => {
    const ms = endMs - (count - 1 - i) * HOUR_MS
    return {
      time: iso(ms),
      value: typeof value === 'function' ? value(i, ms) : value
    }
  })
}

function window24h(pollutants, extra = {}) {
  return buildHistorySummary({
    period: '24h',
    from: iso(FROM_24H),
    to: iso(TO_24H),
    pollutants,
    ...extra
  })
}

const NO_DATA = { PM25: [], PM10: [], NO2: [], O3: [], SO2: [] }

describe('#buildHistorySummary', () => {
  describe('capture and window average (75% rule)', () => {
    it('reports counts, percentage and an unrounded average at 100% capture', () => {
      const summary = window24h({
        ...NO_DATA,
        NO2: hourly(TO_24H, 24, (i) => 10.25 + (i % 2))
      })
      const { dataCapture, periodAverage } = summary.pollutants.NO2
      expect(dataCapture).toEqual({
        validHours: 24,
        expectedHours: 24,
        capturePercentage: 100
      })
      expect(periodAverage).toBeCloseTo(10.75, 10)
    })

    it('gives an average at exactly 75% (18 of 24)', () => {
      const points = hourly(TO_24H, 24, (i) => (i < 6 ? null : 20))
      const { periodAverage, dataCapture } = window24h({
        ...NO_DATA,
        NO2: points
      }).pollutants.NO2
      expect(dataCapture).toMatchObject({
        validHours: 18,
        capturePercentage: 75
      })
      expect(periodAverage).toBe(20)
    })

    it('gives no average below 75% (17 of 24) but still reports capture', () => {
      const points = hourly(TO_24H, 24, (i) => (i < 7 ? null : 20))
      const { periodAverage, dataCapture } = window24h({
        ...NO_DATA,
        NO2: points
      }).pollutants.NO2
      expect(periodAverage).toBeNull()
      expect(dataCapture).toMatchObject({
        validHours: 17,
        capturePercentage: 71
      })
    })

    it('counts hours absent from the series as missing', () => {
      const points = hourly(TO_24H, 24, 20).slice(10)
      const { periodAverage, dataCapture } = window24h({
        ...NO_DATA,
        NO2: points
      }).pollutants.NO2
      expect(dataCapture).toMatchObject({ validHours: 14, expectedHours: 24 })
      expect(periodAverage).toBeNull()
    })

    it('uses 168 expected hours for 7d and applies 75% (126) to it', () => {
      const build = (valid) =>
        buildHistorySummary({
          period: '7d',
          from: iso(FROM_7D),
          to: iso(TO_7D),
          pollutants: {
            ...NO_DATA,
            O3: hourly(TO_7D, 168, (i) => (i < 168 - valid ? null : 40))
          }
        }).pollutants.O3
      expect(build(126).periodAverage).toBe(40)
      expect(build(126).dataCapture.expectedHours).toBe(168)
      expect(build(125).periodAverage).toBeNull()
    })

    it('returns zero capture and null values when the station has no data', () => {
      const summary = buildHistorySummary({
        period: '24h',
        from: null,
        to: null,
        pollutants: NO_DATA
      })
      expect(summary.daqiIndex).toBeNull()
      expect(summary.measuredAt).toBeNull()
      expect(summary.pollutants.PM25).toMatchObject({
        periodAverage: null,
        dataCapture: {
          validHours: 0,
          expectedHours: 24,
          capturePercentage: 0
        },
        daqi: null,
        dailyMeans: []
      })
    })

    it('tolerates a response with no pollutants', () => {
      const summary = buildHistorySummary({
        period: '24h',
        from: null,
        to: null
      })
      expect(summary.pollutants).toEqual({})
    })
  })

  describe('rolling means and lead-in', () => {
    it('gives the first window hours a 24-hour mean using lead-in', () => {
      const leadIn = hourly(FROM_24H - HOUR_MS, 24, 10)
      const points = hourly(TO_24H, 24, 30)
      const { rollingMean } = window24h(
        { ...NO_DATA, PM25: points },
        { leadIn: { PM25: leadIn } }
      ).pollutants.PM25

      expect(rollingMean.windowHours).toBe(24)
      expect(rollingMean.series).toHaveLength(24)
      // First window hour: 1 window value (30) + 23 lead-in values (10)
      expect(rollingMean.series[0].value).toBeCloseTo((30 + 23 * 10) / 24, 10)
      expect(rollingMean.series.at(-1).value).toBe(30)
    })

    it('has no rolling mean for the first hours without lead-in', () => {
      const points = hourly(TO_24H, 24, 30)
      const { rollingMean } = window24h({ ...NO_DATA, PM25: points }).pollutants
        .PM25
      expect(rollingMean.series[0].value).toBeNull()
      expect(rollingMean.series[16].value).toBeNull() // 17 valid hours
      expect(rollingMean.series[17].value).toBe(30) // 18 valid hours
    })

    it('uses an 8-hour mean for O3 and none for NO2 or SO2', () => {
      const summary = window24h({ ...NO_DATA, O3: hourly(TO_24H, 24, 50) })
      expect(summary.pollutants.O3.rollingMean.windowHours).toBe(8)
      expect(summary.pollutants.O3.rollingMean.series[5].value).toBe(50) // 6 valid
      expect(summary.pollutants.O3.rollingMean.series[4].value).toBeNull()
      expect(summary.pollutants.NO2.rollingMean).toBeNull()
      expect(summary.pollutants.SO2.rollingMean).toBeNull()
    })
  })

  describe('exceedances compare rounded means to the legal limit', () => {
    const no2 = (value) =>
      window24h({ ...NO_DATA, NO2: hourly(TO_24H, 24, value) }).pollutants.NO2

    it.each([
      [200.4, 0],
      [200.5, 24],
      [201, 24]
    ])('NO2 hourly %s gives %s exceedances', (value, count) => {
      expect(no2(value).hourlyExceedances).toBe(count)
    })

    it('has no hourly exceedance count for pollutants without an hourly limit', () => {
      const summary = window24h({ ...NO_DATA, PM10: hourly(TO_24H, 24, 90) })
      expect(summary.pollutants.PM10.hourlyExceedances).toBeNull()
      expect(summary.pollutants.PM25.hourlyExceedances).toBeNull()
    })

    function pm10Week(dayValues, validPerDay = 24) {
      // Day k ends at the k-th UTC midnight in the window. Its 24 hours begin
      // in the lead-in for the first day, so the series spans 192 hours.
      const all = hourly(TO_7D, 192, (_, ms) => {
        const dayEnd = Math.ceil(ms / DAY_MS) * DAY_MS
        const k = (dayEnd - FROM_7D) / DAY_MS
        const hourOfDay = (ms / HOUR_MS) % 24
        const position = hourOfDay === 0 ? 24 : hourOfDay
        return position > validPerDay ? null : (dayValues[k] ?? null)
      })
      return buildHistorySummary({
        period: '7d',
        from: iso(FROM_7D),
        to: iso(TO_7D),
        pollutants: { ...NO_DATA, PM10: all.slice(24) },
        leadIn: { PM10: all.slice(0, 24) }
      }).pollutants.PM10
    }

    it('yields seven daily means for a 7-day window, one per UTC day', () => {
      const result = pm10Week([10, 20, 30, 40, 50, 60, 70])
      expect(result.dailyMeans).toHaveLength(7)
      expect(
        result.dailyMeans.every((d) => d.time.endsWith('T00:00:00.000Z'))
      ).toBe(true)
    })

    it('counts a day over the PM10 daily limit using the rounded mean', () => {
      // 50.4 rounds to 50 (not over), 50.5 rounds to 51 (over)
      const result = pm10Week([50.4, 50.5, 50.5, 10, 10, 10, 10])
      expect(result.dailyExceedances).toBe(2)
    })

    it('does not count or report a day with fewer than 18 valid hours', () => {
      const result = pm10Week([90, 90, 90, 90, 90, 90, 90], 17)
      expect(result.dailyMeans.every((d) => d.value === null)).toBe(true)
      expect(result.dailyExceedances).toBe(0)
    })

    it('reports a daily mean at exactly 18 valid hours', () => {
      const result = pm10Week([90, 90, 90, 90, 90, 90, 90], 18)
      expect(result.dailyMeans.every((d) => d.value === 90)).toBe(true)
      expect(result.dailyExceedances).toBe(7)
    })

    it('has no daily exceedance count for pollutants without a daily limit', () => {
      expect(no2(10).dailyExceedances).toBeNull()
    })
  })

  describe('DAQI', () => {
    it('banding uses the rounded concentration of an unrounded mean', () => {
      // NO2 67.4 rounds to 67 (band 1); 67.5 rounds to 68 (band 2)
      const at = (value) =>
        window24h({ ...NO_DATA, NO2: hourly(TO_24H, 24, value) }).pollutants.NO2
          .daqi
      expect(at(67.4)).toMatchObject({ concentration: 67.4, index: 1 })
      expect(at(67.5)).toMatchObject({ concentration: 67.5, index: 2 })
    })

    it('PM25 uses the 24-hour mean and is null when capture is below 75%', () => {
      const ok = window24h({ ...NO_DATA, PM25: hourly(TO_24H, 24, 12) })
      expect(ok.pollutants.PM25.daqi).toMatchObject({
        concentration: 12,
        index: 2,
        averagingPeriod: '24-hour mean'
      })

      const short = window24h({
        ...NO_DATA,
        PM25: hourly(TO_24H, 24, (i) => (i < 7 ? null : 12))
      })
      expect(short.pollutants.PM25.daqi).toBeNull()
    })

    it('SO2 uses the latest valid 15-minute mean', () => {
      const quarters = [1, 2, 300, null].map((value, i) => ({
        time: iso(TO_24H - (3 - i) * QUARTER_MS),
        value
      }))
      const summary = window24h(
        { ...NO_DATA, SO2: hourly(TO_24H, 24, 5) },
        { fifteenMinute: { SO2: quarters } }
      )
      expect(summary.pollutants.SO2.daqi).toMatchObject({
        concentration: 300,
        index: 4,
        averagingPeriod: '15-minute mean',
        measuredAt: iso(TO_24H - QUARTER_MS)
      })
    })

    it('SO2 has no DAQI value without 15-minute data', () => {
      const summary = window24h({ ...NO_DATA, SO2: hourly(TO_24H, 24, 300) })
      expect(summary.pollutants.SO2.daqi).toBeNull()
    })

    it('overall index is the highest pollutant index, with the newest measuredAt', () => {
      const summary = window24h({
        ...NO_DATA,
        NO2: hourly(TO_24H, 24, 30),
        PM10: hourly(TO_24H, 24, 40)
      })
      // NO2 30 -> 1, PM10 40 -> 3
      expect(summary.daqiIndex).toBe(3)
      expect(summary.measuredAt).toBe(iso(TO_24H))
    })

    it('overall index is null when no pollutant qualifies', () => {
      const summary = window24h({
        ...NO_DATA,
        PM10: hourly(TO_24H, 24, (i) => (i < 20 ? null : 40))
      })
      expect(summary.daqiIndex).toBeNull()
    })
  })
})
