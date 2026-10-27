import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  fetchPollutantHistory,
  REQUEST_CODE,
  PERIOD_DAYS,
  ROW_CAP
} from './fetch-pollutant-history.js'

vi.mock('../../../config/index.js', () => ({
  config: {
    get: vi.fn((key) => {
      if (key === 'ricardoApiSiteIdUrl') {
        return 'https://uk-air-api.example.com/api/pollutant_measurement_datas?'
      }
      return null
    })
  }
}))

const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() }

const HOUR_MS = 60 * 60 * 1000

/** Builds an hourly row ending at `end`. */
function hourlyRow(end, value) {
  const endMs = Date.parse(end)
  return {
    startDateTime: new Date(endMs - HOUR_MS).toISOString(),
    endDateTime: new Date(endMs).toISOString(),
    value
  }
}

/** Builds a 15-minute row ending at `end`. */
function quarterHourRow(end, value) {
  const endMs = Date.parse(end)
  return {
    startDateTime: new Date(endMs - HOUR_MS / 4).toISOString(),
    endDateTime: new Date(endMs).toISOString(),
    value
  }
}

function hourlySeries(latestIso, count, value = 10) {
  const latestMs = Date.parse(latestIso)
  return Array.from({ length: count }, (_, i) =>
    hourlyRow(
      new Date(latestMs - (count - 1 - i) * HOUR_MS).toISOString(),
      value
    )
  )
}

/** Returns rows for the requested pollutant based on a code -> rows map. */
function fetchStub(rowsByCode, statusCode = 200) {
  return vi.fn(async (url) => {
    const requested = new URL(url).searchParams.get('pollutant-name')
    return [statusCode, { member: rowsByCode[requested] ?? [] }]
  })
}

const baseArgs = {
  siteId: 'UKA00315',
  period: '24h',
  accessToken: 'token-123',
  logger
}

describe('#fetchPollutantHistory', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('throws when catchProxyFetchError is not a function', async () => {
    await expect(
      fetchPollutantHistory({ ...baseArgs, catchProxyFetchError: undefined })
    ).rejects.toThrow(TypeError)
  })

  it('requests every pollutant once, using the Ricardo request codes', async () => {
    const catchProxyFetchError = fetchStub({})

    await fetchPollutantHistory({ ...baseArgs, catchProxyFetchError })

    expect(catchProxyFetchError).toHaveBeenCalledTimes(
      Object.keys(REQUEST_CODE).length
    )
    const requestedCodes = catchProxyFetchError.mock.calls.map((call) =>
      new URL(call[0]).searchParams.get('pollutant-name')
    )
    expect(requestedCodes).toContain('GE10')
    expect(requestedCodes).toContain('PM25')
    expect(requestedCodes).not.toContain('PM10')
    expect(requestedCodes).not.toContain('PM2.5')
  })

  it('uses start-date / end-date and the siteId form of station-id', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-09-30T11:30:00.000Z'))
    const catchProxyFetchError = fetchStub({})

    await fetchPollutantHistory({
      ...baseArgs,
      period: '7d',
      catchProxyFetchError
    })

    const url = new URL(catchProxyFetchError.mock.calls[0][0])
    expect(url.toString()).not.toContain('??')
    expect(url.searchParams.get('station-id')).toBe('UKA00315')
    expect(url.searchParams.get('start-date')).toBe('2026-09-21')
    expect(url.searchParams.get('end-date')).toBe('2026-09-30')
    expect(url.searchParams.has('start-date-time')).toBe(false)
    expect(url.searchParams.has('end-date-time')).toBe(false)
  })

  it('requests the lead-in: 7d window plus 24h lead-in plus padding', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-09-30T00:30:00.000Z'))
    const catchProxyFetchError = fetchStub({})

    await fetchPollutantHistory({
      ...baseArgs,
      period: '24h',
      catchProxyFetchError
    })

    const url = new URL(catchProxyFetchError.mock.calls[0][0])
    expect(url.searchParams.get('start-date')).toBe('2026-09-27')
  })

  it('derives SO2 hourly means from 15-minute rows and ignores the feed hourly SO2', async () => {
    const catchProxyFetchError = fetchStub({
      SO2: [
        hourlyRow('2026-09-30T10:00:00.000Z', 99),
        quarterHourRow('2026-09-30T09:15:00.000Z', 1),
        quarterHourRow('2026-09-30T09:30:00.000Z', 2),
        quarterHourRow('2026-09-30T09:45:00.000Z', 3),
        quarterHourRow('2026-09-30T10:00:00.000Z', 4),
        quarterHourRow('2026-09-30T10:15:00.000Z', 5),
        quarterHourRow('2026-09-30T10:30:00.000Z', 6),
        quarterHourRow('2026-09-30T10:45:00.000Z', -9999),
        quarterHourRow('2026-09-30T11:00:00.000Z', -9999)
      ]
    })

    const result = await fetchPollutantHistory({
      ...baseArgs,
      catchProxyFetchError
    })

    expect(result.pollutants.SO2).toEqual([
      { time: '2026-09-30T10:00:00.000Z', value: 2.5 },
      { time: '2026-09-30T11:00:00.000Z', value: null }
    ])
  })

  it('uses the feed hourly SO2 when there are no 15-minute rows, and never mixes 15-minute rows into other pollutants', async () => {
    const catchProxyFetchError = fetchStub({
      SO2: [
        hourlyRow('2026-09-30T10:00:00.000Z', 5),
        hourlyRow('2026-09-30T11:00:00.000Z', 8)
      ],
      NO2: [
        hourlyRow('2026-09-30T11:00:00.000Z', 20),
        quarterHourRow('2026-09-30T11:15:00.000Z', 999)
      ]
    })

    const result = await fetchPollutantHistory({
      ...baseArgs,
      catchProxyFetchError
    })

    expect(result.pollutants.SO2.map((p) => p.value)).toEqual([5, 8])
    expect(result.pollutants.NO2.map((p) => p.value)).toEqual([20])
    expect(result.fifteenMinute).toEqual({ SO2: [] })
  })

  it('returns the 24 hourly readings before the window as leadIn, with nulls kept', async () => {
    const series = hourlySeries('2026-09-30T11:00:00.000Z', 60)
    series[30] = { ...series[30], value: -9999 }
    const catchProxyFetchError = fetchStub({ PM25: series })

    const result = await fetchPollutantHistory({
      ...baseArgs,
      catchProxyFetchError
    })

    expect(result.from).toBe('2026-09-29T12:00:00.000Z')
    expect(result.leadIn.PM25).toHaveLength(24)
    expect(result.leadIn.PM25[0].time).toBe('2026-09-28T12:00:00.000Z')
    expect(result.leadIn.PM25.at(-1).time).toBe('2026-09-29T11:00:00.000Z')
    expect(result.pollutants.PM25).toHaveLength(24)
    const lastLeadInNull = result.leadIn.PM25.filter((p) => p.value === null)
    expect(lastLeadInNull.length).toBe(1)
    expect(result.leadIn.NO2).toEqual([])
  })

  it('returns SO2 15-minute readings from 45 minutes before the window start', async () => {
    const quarters = Array.from({ length: 4 * 40 }, (_, i) =>
      quarterHourRow(
        new Date(
          Date.parse('2026-09-30T11:00:00.000Z') - (4 * 40 - 1 - i) * 15 * 60000
        ).toISOString(),
        i
      )
    )
    const catchProxyFetchError = fetchStub({ SO2: quarters })

    const result = await fetchPollutantHistory({
      ...baseArgs,
      catchProxyFetchError
    })

    expect(result.from).toBe('2026-09-29T12:00:00.000Z')
    expect(result.fifteenMinute.SO2[0].time).toBe('2026-09-29T11:15:00.000Z')
    expect(result.fifteenMinute.SO2.at(-1).time).toBe(
      '2026-09-30T11:00:00.000Z'
    )
    // 96 quarters: the 24 hours of the window, which for the first hour
    // start 45 minutes before `from`
    expect(result.fifteenMinute.SO2).toHaveLength(4 * 24)
  })

  it('returns -9999 and -99 readings as null and keeps the point', async () => {
    const catchProxyFetchError = fetchStub({
      NO2: [
        hourlyRow('2026-09-30T09:00:00.000Z', -9999),
        hourlyRow('2026-09-30T10:00:00.000Z', -99),
        hourlyRow('2026-09-30T11:00:00.000Z', 32.1)
      ]
    })

    const result = await fetchPollutantHistory({
      ...baseArgs,
      catchProxyFetchError
    })

    expect(result.pollutants.NO2).toEqual([
      { time: '2026-09-30T09:00:00.000Z', value: null },
      { time: '2026-09-30T10:00:00.000Z', value: null },
      { time: '2026-09-30T11:00:00.000Z', value: 32.1 }
    ])
  })

  it('sorts each series ascending by time', async () => {
    const catchProxyFetchError = fetchStub({
      O3: [
        hourlyRow('2026-09-30T11:00:00.000Z', 3),
        hourlyRow('2026-09-30T09:00:00.000Z', 1),
        hourlyRow('2026-09-30T10:00:00.000Z', 2)
      ]
    })

    const result = await fetchPollutantHistory({
      ...baseArgs,
      catchProxyFetchError
    })

    expect(result.pollutants.O3.map((point) => point.value)).toEqual([1, 2, 3])
  })

  it('flags a response at the row cap as truncated', async () => {
    const catchProxyFetchError = vi.fn(async () => [
      200,
      {
        member: new Array(ROW_CAP).fill(
          hourlyRow('2026-09-30T11:00:00.000Z', 1)
        )
      }
    ])

    const result = await fetchPollutantHistory({
      ...baseArgs,
      catchProxyFetchError
    })

    expect(result.truncated).toBe(true)
    expect(logger.warn).toHaveBeenCalled()
  })

  it('warns once per pollutant about rows with an unexpected length, with examples, and treats them as missing', async () => {
    // The real shape seen at the autumn clock change: +01:00 start, +00:00 end.
    const clockChangeRow = {
      startDateTime: '2026-10-25T00:00:00+01:00',
      endDateTime: '2026-10-25T01:00:00+00:00',
      value: 17.9775
    }
    const catchProxyFetchError = fetchStub({
      NO2: [
        hourlyRow('2026-10-24T23:00:00.000Z', 10),
        clockChangeRow,
        hourlyRow('2026-10-25T02:00:00.000Z', 12)
      ]
    })

    const result = await fetchPollutantHistory({
      ...baseArgs,
      catchProxyFetchError
    })

    const warnings = logger.warn.mock.calls.map(([message]) => message)
    expect(warnings).toHaveLength(1)
    expect(warnings[0]).toContain('NO2 at UKA00315 has 1 row(s)')
    expect(warnings[0]).toContain('BST/GMT clock change')
    expect(warnings[0]).toContain(
      '2026-10-25T00:00:00+01:00 to 2026-10-25T01:00:00+00:00 (120 min, value 17.9775)'
    )
    expect(result.pollutants.NO2.map((point) => point.value)).toEqual([10, 12])
  })

  it('lists at most three example rows in the warning', async () => {
    const odd = (n) => ({
      startDateTime: `2026-10-25T0${n}:00:00+01:00`,
      endDateTime: `2026-10-25T0${n + 1}:30:00+00:00`,
      value: n
    })
    const catchProxyFetchError = fetchStub({
      NO2: [odd(1), odd(2), odd(3), odd(4), odd(5)]
    })

    await fetchPollutantHistory({ ...baseArgs, catchProxyFetchError })

    const [message] = logger.warn.mock.calls[0]
    expect(message).toContain('has 5 row(s)')
    expect(message.match(/ min, value /g)).toHaveLength(3)
  })

  it('does not warn when every row is 60 or 15 minutes long', async () => {
    const catchProxyFetchError = fetchStub({
      NO2: hourlySeries('2026-09-30T11:00:00.000Z', 24),
      SO2: [quarterHourRow('2026-09-30T11:00:00.000Z', 1)]
    })

    await fetchPollutantHistory({ ...baseArgs, catchProxyFetchError })

    expect(logger.warn).not.toHaveBeenCalled()
  })

  it('does not flag a response below the row cap as truncated', async () => {
    const catchProxyFetchError = fetchStub({
      NO2: hourlySeries('2026-09-30T11:00:00.000Z', 24)
    })

    const result = await fetchPollutantHistory({
      ...baseArgs,
      catchProxyFetchError
    })

    expect(result.truncated).toBe(false)
  })

  it('reports an upstream error when a pollutant call returns a non-2xx', async () => {
    const catchProxyFetchError = vi.fn(async (url) => {
      if (new URL(url).searchParams.get('pollutant-name') === 'O3') {
        return [422, { error: 'Station id not found' }]
      }
      return [200, { member: [] }]
    })

    const result = await fetchPollutantHistory({
      ...baseArgs,
      catchProxyFetchError
    })

    expect(result).toEqual({ upstreamError: true })
  })

  it('reports an upstream error on a network failure (status 0)', async () => {
    const catchProxyFetchError = vi.fn(async () => [
      0,
      { error: 'Network Error', message: 'socket hang up' }
    ])

    const result = await fetchPollutantHistory({
      ...baseArgs,
      catchProxyFetchError
    })

    expect(result).toEqual({ upstreamError: true })
  })

  it('anchors `to` on the newest reading, not on now', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-09-30T11:30:00.000Z'))
    const catchProxyFetchError = fetchStub({
      NO2: hourlySeries('2026-09-28T06:00:00.000Z', 5)
    })

    const result = await fetchPollutantHistory({
      ...baseArgs,
      catchProxyFetchError
    })

    expect(result.to).toBe('2026-09-28T06:00:00.000Z')
  })

  it('trims a 24h window to 24 inclusive hourly points', async () => {
    const catchProxyFetchError = fetchStub({
      NO2: hourlySeries('2026-09-30T11:00:00.000Z', 33)
    })

    const result = await fetchPollutantHistory({
      ...baseArgs,
      catchProxyFetchError
    })

    expect(result.pollutants.NO2).toHaveLength(PERIOD_DAYS['24h'] * 24)
    expect(result.from).toBe('2026-09-29T12:00:00.000Z')
    expect(result.to).toBe('2026-09-30T11:00:00.000Z')
  })

  it('trims a 7d window to 168 inclusive hourly points', async () => {
    const catchProxyFetchError = fetchStub({
      NO2: hourlySeries('2026-09-30T11:00:00.000Z', 178)
    })

    const result = await fetchPollutantHistory({
      ...baseArgs,
      period: '7d',
      catchProxyFetchError
    })

    expect(result.pollutants.NO2).toHaveLength(PERIOD_DAYS['7d'] * 24)
    expect(result.from).toBe('2026-09-23T12:00:00.000Z')
  })

  it('returns empty series with null bounds when no readings exist', async () => {
    const catchProxyFetchError = fetchStub({})

    const result = await fetchPollutantHistory({
      ...baseArgs,
      catchProxyFetchError
    })

    expect(result.from).toBeNull()
    expect(result.to).toBeNull()
    expect(result.truncated).toBe(false)
    expect(result.fifteenMinute).toEqual({ SO2: [] })
    expect(Object.keys(result.leadIn)).toEqual(Object.keys(REQUEST_CODE))
    expect(result.pollutants).toEqual({
      PM25: [],
      PM10: [],
      NO2: [],
      O3: [],
      SO2: []
    })
  })
})
