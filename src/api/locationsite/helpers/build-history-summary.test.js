import { describe, it, expect } from 'vitest'
import { buildHistorySummary } from './build-history-summary.js'

const HOUR_MS = 60 * 60 * 1000
const DAY_MS = 24 * HOUR_MS
const QUARTER_MS = 15 * 60 * 1000

// 24h window of hour-ending stamps: 10:00 on the 20th to 09:00 on the 21st.
const TO_24H = Date.parse('2026-10-21T09:00:00Z')
const FROM_24H = TO_24H - 23 * HOUR_MS

// 7d window: seven complete UTC days, 01:00 on the 20th to 00:00 on the 27th
// (hour-ending stamps), so it holds exactly seven UTC midnights.
const TO_7D = Date.parse('2026-10-27T00:00:00Z')
const FROM_7D = TO_7D - 167 * HOUR_MS

const iso = (ms) => new Date(ms).toISOString()

// The first midnight in the 7d window; day k ends k days after it.
const FIRST_DAY_END = FROM_7D - HOUR_MS + DAY_MS
const dayIndex = (ms) =>
  (Math.ceil(ms / DAY_MS) * DAY_MS - FIRST_DAY_END) / DAY_MS
/** 1-24: which hour of its UTC day an hour-ending stamp is (00:00 is hour 24). */
const hourPosition = (ms) =>
  (ms / HOUR_MS) % 24 === 0 ? 24 : (ms / HOUR_MS) % 24

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
        capturePercentage: 100,
        isLowDataCapture: false
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

  describe('7-day average is the mean of the valid daily means', () => {
    // Day k (0-6) is the k-th complete UTC day in the window, ending at the
    // k-th midnight. `days[k]` is { value, valid }: that many valid hours at
    // that value.
    function sevenDay(days) {
      const all = hourly(TO_7D, 168, (_, ms) => {
        const day = days[dayIndex(ms)]
        return day && hourPosition(ms) <= day.valid ? day.value : null
      })
      return buildHistorySummary({
        period: '7d',
        from: iso(FROM_7D),
        to: iso(TO_7D),
        pollutants: { ...NO_DATA, O3: all }
      }).pollutants.O3
    }

    const full = (value) => ({ value, valid: 24 })
    const partial = (value, valid) => ({ value, valid })

    it('averages the daily means, not the hourly values', () => {
      // 4 days at 10 and 3 days of 18 valid hours at 100.
      // Mean of daily means = (4*10 + 3*100) / 7; the mean of the hours is 42.4.
      const result = sevenDay([
        full(10),
        full(10),
        full(10),
        full(10),
        partial(100, 18),
        partial(100, 18),
        partial(100, 18)
      ])
      expect(result.dataCapture.validHours).toBe(150)
      expect(result.dailyMeans.map((d) => d.value)).toEqual([
        10, 10, 10, 10, 100, 100, 100
      ])
      expect(result.periodAverage).toBeCloseTo((4 * 10 + 3 * 100) / 7, 10)
      expect(result.dataCapture.isLowDataCapture).toBe(false)
    })

    it('leaves out a day with fewer than 18 valid hours while capture is still 75% or more', () => {
      // Five full days at 10, two days of 17 valid hours at 100. 154 of the
      // window's 168 hours are valid, but only the first five days have a
      // valid daily mean.
      const result = sevenDay([
        full(10),
        full(10),
        full(10),
        full(10),
        full(10),
        partial(100, 17),
        partial(100, 17)
      ])
      expect(result.dataCapture.validHours).toBe(154)
      expect(result.dailyMeans.map((d) => d.value)).toEqual([
        10,
        10,
        10,
        10,
        10,
        null,
        null
      ])
      expect(result.periodAverage).toBe(10)
      expect(result.dataCapture.isLowDataCapture).toBe(false)
    })

    it('withholds the average and flags low data capture below 75% of the window hours', () => {
      const week = (lastDayValid) =>
        sevenDay([
          full(10),
          full(10),
          full(10),
          full(10),
          full(10),
          partial(10, 6),
          partial(10, lastDayValid)
        ])

      // 5 days x 24 + 6 + 0 = 126 (exactly 75%)
      const atThreshold = week(0)
      expect(atThreshold.dataCapture.validHours).toBe(126)
      expect(atThreshold.dataCapture.capturePercentage).toBe(75)
      expect(atThreshold.dataCapture.isLowDataCapture).toBe(false)
      expect(atThreshold.periodAverage).toBe(10)

      const belowThreshold = sevenDay([
        full(10),
        full(10),
        full(10),
        full(10),
        full(10),
        partial(10, 5)
      ])
      expect(belowThreshold.dataCapture.validHours).toBe(125)
      expect(belowThreshold.periodAverage).toBeNull()
      expect(belowThreshold.dataCapture.isLowDataCapture).toBe(true)
    })

    it('uses exactly the hours behind the seven daily means for capture', () => {
      const result = sevenDay(Array.from({ length: 7 }, () => full(10)))
      expect(result.dataCapture).toMatchObject({
        validHours: 168,
        expectedHours: 168,
        capturePercentage: 100
      })
      expect(result.dailyMeans).toHaveLength(7)
    })

    it('keeps the daily means unrounded', () => {
      const result = sevenDay([
        full(10.4),
        full(10.4),
        full(10.4),
        full(10.4),
        full(10.4),
        full(10.4),
        full(10.9)
      ])
      expect(result.periodAverage).toBeCloseTo((6 * 10.4 + 10.9) / 7, 10)
    })
  })

  describe('low data capture flag', () => {
    it('is true exactly when the average is withheld, for a 24-hour window', () => {
      const flag = (validCount) => {
        const points = hourly(TO_24H, 24, (i) =>
          i < 24 - validCount ? null : 20
        )
        const { dataCapture, periodAverage } = window24h({
          ...NO_DATA,
          NO2: points
        }).pollutants.NO2
        return [dataCapture.isLowDataCapture, periodAverage === null]
      }
      expect(flag(18)).toEqual([false, false])
      expect(flag(17)).toEqual([true, true])
    })

    it('is true for a pollutant with no readings, independently of others', () => {
      const summary = window24h({
        ...NO_DATA,
        NO2: hourly(TO_24H, 24, 20)
      })
      expect(summary.pollutants.NO2.dataCapture.isLowDataCapture).toBe(false)
      expect(summary.pollutants.O3.dataCapture.isLowDataCapture).toBe(true)
    })
  })

  describe('response contents', () => {
    it('no longer returns a rolling-mean series; the DAQI value comes from the window alone', () => {
      const summary = window24h({ ...NO_DATA, PM25: hourly(TO_24H, 24, 30) })
      expect(summary.pollutants.PM25).not.toHaveProperty('rollingMean')
      expect(summary.pollutants.PM25.daqi).toMatchObject({
        concentration: 30,
        averagingPeriod: '24-hour mean'
      })
    })

    it('uses an 8-hour mean for O3 from the last 8 hours of the window', () => {
      // Earlier hours are high, the last 8 are 50: the DAQI value is 50.
      const points = hourly(TO_24H, 24, (i) => (i < 16 ? 200 : 50))
      const { daqi } = window24h({ ...NO_DATA, O3: points }).pollutants.O3
      expect(daqi).toMatchObject({
        concentration: 50,
        averagingPeriod: '8-hour mean'
      })
    })

    it('PM2.5 DAQI concentration equals the 24-hour average when the newest hour is valid', () => {
      const points = hourly(TO_24H, 24, (i) => 5 + i)
      const { daqi, periodAverage } = window24h({
        ...NO_DATA,
        PM25: points
      }).pollutants.PM25
      expect(daqi.concentration).toBeCloseTo(periodAverage, 10)
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
      const all = hourly(TO_7D, 168, (_, ms) =>
        hourPosition(ms) > validPerDay
          ? null
          : (dayValues[dayIndex(ms)] ?? null)
      )
      return buildHistorySummary({
        period: '7d',
        from: iso(FROM_7D),
        to: iso(TO_7D),
        pollutants: { ...NO_DATA, PM10: all }
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
