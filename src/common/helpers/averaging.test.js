import { describe, it, expect } from 'vitest'
import {
  CAPTURE_RULES,
  HOUR_MS,
  QUARTER_HOURS_MS,
  dailyMean,
  daqiConcentration,
  deriveHourlyFromQuarters,
  hourlyMeanFromQuarters,
  latestValid,
  rollingMean,
  roundConcentration,
  toSeriesIndex
} from './averaging.js'

const T0 = Date.parse('2026-10-20T00:00:00Z')

/** Hourly points ending at T0 + 1h ... T0 + n h; `values[i]` null marks a gap. */
function hourly(values, startMs = T0 + HOUR_MS) {
  return values.map((value, i) => ({
    time: new Date(startMs + i * HOUR_MS).toISOString(),
    value
  }))
}

function quarters(values, startMs) {
  return values.map((value, i) => ({
    time: new Date(startMs + i * QUARTER_HOURS_MS).toISOString(),
    value
  }))
}

const endOf = (points) => Date.parse(points.at(-1).time)

describe('#roundConcentration', () => {
  it.each([
    [67.49, 67],
    [67.5, 68],
    [0.4, 0],
    [66.4999, 66],
    [66.49999999999999, 67] // float error on a true 66.5
  ])('rounds %s to %s', (input, expected) => {
    expect(roundConcentration(input)).toBe(expected)
  })
})

describe('#toSeriesIndex', () => {
  it('stores sentinels and non-numbers as null and skips bad times', () => {
    const index = toSeriesIndex([
      { time: '2026-10-20T01:00:00Z', value: -9999 },
      { time: '2026-10-20T02:00:00Z', value: -99 },
      { time: '2026-10-20T03:00:00Z', value: '5' },
      { time: '2026-10-20T04:00:00Z', value: 7 },
      { time: 'not a date', value: 1 },
      { time: Date.parse('2026-10-20T05:00:00Z'), value: 2 }
    ])
    expect([...index.values()]).toEqual([null, null, null, 7, 2])
  })

  it('lets a valid duplicate win over an invalid one, in either order', () => {
    const a = toSeriesIndex([
      { time: '2026-10-20T01:00:00Z', value: null },
      { time: '2026-10-20T01:00:00Z', value: 4 }
    ])
    const b = toSeriesIndex([
      { time: '2026-10-20T01:00:00Z', value: 4 },
      { time: '2026-10-20T01:00:00Z', value: null }
    ])
    expect(a.get(Date.parse('2026-10-20T01:00:00Z'))).toBe(4)
    expect(b.get(Date.parse('2026-10-20T01:00:00Z'))).toBe(4)
  })

  it('handles undefined input', () => {
    expect(toSeriesIndex(undefined).size).toBe(0)
  })
})

describe('#hourlyMeanFromQuarters (3 of 4)', () => {
  const hourEnd = T0 + HOUR_MS
  const start = T0 + QUARTER_HOURS_MS

  it.each([
    [[1, 2, 3, 4], 2.5],
    [[1, 2, 3, null], 2],
    [[null, 2, 3, 4], 3]
  ])('is valid with %j', (values, expected) => {
    const index = toSeriesIndex(quarters(values, start))
    expect(hourlyMeanFromQuarters(index, hourEnd)).toBe(expected)
  })

  it.each([[[1, 2, null, null]], [[null, null, null, 4]], [[]]])(
    'is null with %j',
    (values) => {
      const index = toSeriesIndex(quarters(values, start))
      expect(hourlyMeanFromQuarters(index, hourEnd)).toBeNull()
    }
  )

  it('does not round the mean', () => {
    const index = toSeriesIndex(quarters([1, 1, 2, null], start))
    expect(hourlyMeanFromQuarters(index, hourEnd)).toBeCloseTo(4 / 3, 10)
  })
})

describe('#rollingMean', () => {
  const eight = CAPTURE_RULES.rolling8h
  const day = CAPTURE_RULES.rolling24h

  it('8-hour mean needs 6 of 8', () => {
    const six = hourly([1, 2, 3, 4, 5, 6, null, null])
    const five = hourly([1, 2, 3, 4, 5, null, null, null])
    expect(
      rollingMean(toSeriesIndex(six), endOf(six), 8, eight.min)
    ).toBeCloseTo(3.5)
    expect(
      rollingMean(toSeriesIndex(five), endOf(five), 8, eight.min)
    ).toBeNull()
  })

  it('24-hour mean needs 18 of 24', () => {
    const make = (validCount) =>
      hourly(Array.from({ length: 24 }, (_, i) => (i < validCount ? 10 : null)))
    const ok = make(18)
    const short = make(17)
    expect(rollingMean(toSeriesIndex(ok), endOf(ok), 24, day.min)).toBe(10)
    expect(
      rollingMean(toSeriesIndex(short), endOf(short), 24, day.min)
    ).toBeNull()
  })

  it('counts hours missing from the data as invalid rather than shrinking the window', () => {
    // Eight readings spread over ten hours: only 8 of the last 8 grid hours
    // would be valid if gaps were ignored, but two grid hours are absent.
    const points = hourly([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]).filter(
      (_, i) => i !== 3 && i !== 4 && i !== 5
    )
    const index = toSeriesIndex(points)
    expect(rollingMean(index, endOf(points), 8, eight.min)).toBeNull()
  })

  it('uses unrounded inputs', () => {
    const points = hourly([10.4, 10.4, 10.4, 10.4, 10.4, 10.4, 10.4, 10.9])
    const mean = rollingMean(toSeriesIndex(points), endOf(points), 8, 6)
    expect(mean).toBeCloseTo(10.4625, 10)
  })
})

describe('#dailyMean', () => {
  it('needs 18 of 24 hourly means', () => {
    const points = hourly(
      Array.from({ length: 24 }, (_, i) => (i < 18 ? 60 : null))
    )
    expect(dailyMean(toSeriesIndex(points), endOf(points))).toBe(60)
    const short = hourly(
      Array.from({ length: 24 }, (_, i) => (i < 17 ? 60 : null))
    )
    expect(dailyMean(toSeriesIndex(short), endOf(short))).toBeNull()
  })
})

describe('#deriveHourlyFromQuarters', () => {
  it('derives an hour only once the quarter on the hour exists', () => {
    const points = quarters([1, 2, 3, 4, 5, 6], T0 + QUARTER_HOURS_MS)
    const derived = deriveHourlyFromQuarters(points)
    expect(derived).toEqual([{ time: '2026-10-20T01:00:00.000Z', value: 2.5 }])
  })

  it('applies the 3-of-4 rule per hour', () => {
    const points = quarters(
      [1, 2, 3, 4, 5, null, null, 8],
      T0 + QUARTER_HOURS_MS
    )
    expect(deriveHourlyFromQuarters(points).map((p) => p.value)).toEqual([
      2.5,
      null
    ])
  })
})

describe('#latestValid', () => {
  it('ignores invalid entries and respects the upper bound', () => {
    const index = toSeriesIndex(hourly([1, 2, null]))
    expect(latestValid(index)?.value).toBe(2)
    expect(latestValid(index, T0 + HOUR_MS)?.value).toBe(1)
    expect(latestValid(index, T0)).toBeNull()
  })
})

describe('#daqiConcentration', () => {
  it('returns null for an unknown pollutant', () => {
    expect(daqiConcentration('NOX', {})).toBeNull()
  })

  it('NO2 is the latest valid hourly mean', () => {
    const points = hourly([40, 50, null])
    const result = daqiConcentration('NO2', {
      hourIndex: toSeriesIndex(points)
    })
    expect(result).toEqual({
      value: 50,
      measuredAt: '2026-10-20T02:00:00.000Z'
    })
  })

  it('NO2 with no readings is null', () => {
    expect(daqiConcentration('NO2', {})).toBeNull()
  })

  it('PM uses the 24-hour mean ending at the latest reading', () => {
    const points = hourly(Array.from({ length: 24 }, () => 12.5))
    const result = daqiConcentration('PM25', {
      hourIndex: toSeriesIndex(points)
    })
    expect(result?.value).toBe(12.5)
    expect(result?.measuredAt).toBe(points.at(-1).time)
  })

  it('PM is null when fewer than 18 of the last 24 hours are valid', () => {
    const points = hourly(
      Array.from({ length: 24 }, (_, i) => (i >= 7 ? 12 : null))
    )
    expect(
      daqiConcentration('PM10', { hourIndex: toSeriesIndex(points) })
    ).toBeNull()
  })

  it('PM is null with a short history even if every hour present is valid', () => {
    const points = hourly([12, 12, 12, 12])
    expect(
      daqiConcentration('PM10', { hourIndex: toSeriesIndex(points) })
    ).toBeNull()
  })

  it('O3 uses the 8-hour mean and needs 6 of 8', () => {
    const ok = hourly([60, 60, null, null, 60, 60, 60, 60])
    const bad = hourly([60, 60, null, null, null, 60, 60, 60])
    expect(
      daqiConcentration('O3', { hourIndex: toSeriesIndex(ok) })?.value
    ).toBe(60)
    expect(
      daqiConcentration('O3', { hourIndex: toSeriesIndex(bad) })
    ).toBeNull()
  })

  it('SO2 is the latest valid 15-minute mean, and null without 15-minute data', () => {
    const q = quarters([5, 6, null], T0 + QUARTER_HOURS_MS)
    expect(
      daqiConcentration('SO2', { quarterIndex: toSeriesIndex(q) })
    ).toEqual({ value: 6, measuredAt: '2026-10-20T00:30:00.000Z' })
    expect(
      daqiConcentration('SO2', { hourIndex: toSeriesIndex(hourly([9])) })
    ).toBeNull()
  })

  it('evaluates at the supplied upper bound', () => {
    const points = hourly(Array.from({ length: 30 }, (_, i) => i))
    const upTo = T0 + 24 * HOUR_MS
    const result = daqiConcentration(
      'PM25',
      { hourIndex: toSeriesIndex(points) },
      upTo
    )
    expect(result?.measuredAt).toBe(new Date(upTo).toISOString())
    expect(result?.value).toBeCloseTo(11.5)
  })
})
