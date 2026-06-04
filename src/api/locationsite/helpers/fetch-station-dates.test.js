import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  fetchStationDates,
  buildStationDatesMap,
  pollutantNameToCode
} from './fetch-station-dates.js'

vi.mock('../../../config/index.js', () => ({
  config: {
    get: vi.fn((key) => {
      if (key === 'ricardoApiPollutantMetadataUrl') {
        return 'https://mock-ricardo/api/pollutant_metadatas'
      }
      return null
    })
  }
}))

vi.mock('../../../helpers/logging/logger.js', () => ({
  createLogger: () => ({ info: vi.fn(), warn: vi.fn() })
}))

const makeRecord = (siteId, startDate, extra = {}) => ({
  siteId,
  startDate,
  pollutantName: 'Ozone',
  measurementStatus: 'current',
  ...extra
})

const makePage = (members, totalItems = members.length) => ({
  totalItems,
  member: members
})

describe('pollutantNameToCode', () => {
  it.each([
    ['Nitrogen dioxide', 'NO2'],
    ['Ozone', 'O3'],
    ['Sulphur dioxide', 'SO2'],
    ['Sulfur dioxide', 'SO2'],
    ['PM<sub>10</sub> particulate matter (Hourly measured)', 'PM10'],
    ['Non-volatile PM<sub>10</sub> (Hourly measured)', 'PM10'],
    ['PM 10 particulate matter', 'PM10'],
    ['PM<sub>2.5</sub> particulate matter (Hourly measured)', 'PM25'],
    ['Non-volatile PM2.5 (Hourly measured)', 'PM25']
  ])('%s → %s', (name, expected) => {
    expect(pollutantNameToCode(name)).toBe(expected)
  })

  it('returns null for unmapped pollutants', () => {
    expect(pollutantNameToCode('Carbon monoxide')).toBeNull()
    expect(pollutantNameToCode('Nitric oxide')).toBeNull()
    expect(
      pollutantNameToCode('Nitrogen oxides as nitrogen dioxide')
    ).toBeNull()
  })
})

describe('buildStationDatesMap', () => {
  describe('openDates', () => {
    it('returns empty maps for an empty records array', () => {
      const { openDates, closeDates, currentPollutants } = buildStationDatesMap(
        []
      )
      expect(openDates.size).toBe(0)
      expect(closeDates.size).toBe(0)
      expect(currentPollutants.size).toBe(0)
    })

    it('maps a single record to its startDate', () => {
      const { openDates } = buildStationDatesMap([
        makeRecord('UKA00001', '2010-01-01T00:00:00+00:00')
      ])
      expect(openDates.get('UKA00001')).toBe('2010-01-01T00:00:00+00:00')
    })

    it('picks the earliest startDate across multiple records for the same station', () => {
      const { openDates } = buildStationDatesMap([
        makeRecord('UKA00001', '2012-06-01T00:00:00+00:00'),
        makeRecord('UKA00001', '2006-06-15T00:00:00+01:00'),
        makeRecord('UKA00001', '2009-03-10T00:00:00+00:00')
      ])
      expect(openDates.get('UKA00001')).toBe('2006-06-15T00:00:00+01:00')
    })

    it('handles multiple stations independently', () => {
      const { openDates } = buildStationDatesMap([
        makeRecord('UKA00001', '2010-01-01T00:00:00+00:00'),
        makeRecord('UKA00002', '2005-03-15T00:00:00+00:00'),
        makeRecord('UKA00001', '2008-07-20T00:00:00+00:00')
      ])
      expect(openDates.get('UKA00001')).toBe('2008-07-20T00:00:00+00:00')
      expect(openDates.get('UKA00002')).toBe('2005-03-15T00:00:00+00:00')
    })

    it('skips records missing siteId', () => {
      const { openDates } = buildStationDatesMap([
        { startDate: '2010-01-01T00:00:00+00:00' },
        makeRecord('UKA00001', '2010-06-01T00:00:00+00:00')
      ])
      expect(openDates.size).toBe(1)
    })

    it('skips records missing startDate', () => {
      const { openDates } = buildStationDatesMap([
        { siteId: 'UKA00001' },
        makeRecord('UKA00002', '2010-06-01T00:00:00+00:00')
      ])
      expect(openDates.size).toBe(1)
      expect(openDates.get('UKA00002')).toBeDefined()
    })
  })

  describe('closeDates', () => {
    it('picks the latest endDate from closed pollutant records', () => {
      const { closeDates } = buildStationDatesMap([
        makeRecord('UKA00001', '2006-01-01T00:00:00+00:00', {
          endDate: '2010-06-01T00:00:00+00:00',
          measurementStatus: 'closed'
        }),
        makeRecord('UKA00001', '2006-01-01T00:00:00+00:00', {
          endDate: '2015-03-15T00:00:00+00:00',
          measurementStatus: 'closed'
        })
      ])
      expect(closeDates.get('UKA00001')).toBe('2015-03-15T00:00:00+00:00')
    })

    it('does not set a closeDate for stations with only current pollutants', () => {
      const { closeDates } = buildStationDatesMap([
        makeRecord('UKA00001', '2010-01-01T00:00:00+00:00', {
          measurementStatus: 'current'
        })
      ])
      expect(closeDates.has('UKA00001')).toBe(false)
    })

    it('ignores endDate on records where measurementStatus is not closed', () => {
      const { closeDates } = buildStationDatesMap([
        makeRecord('UKA00001', '2010-01-01T00:00:00+00:00', {
          endDate: '2024-01-01T00:00:00+00:00',
          measurementStatus: 'current'
        })
      ])
      expect(closeDates.has('UKA00001')).toBe(false)
    })

    it('skips closed records missing endDate', () => {
      const { closeDates } = buildStationDatesMap([
        makeRecord('UKA00001', '2010-01-01T00:00:00+00:00', {
          measurementStatus: 'closed'
        })
      ])
      expect(closeDates.has('UKA00001')).toBe(false)
    })
  })

  describe('currentPollutants', () => {
    it('collects current pollutant codes for a station', () => {
      const { currentPollutants } = buildStationDatesMap([
        makeRecord('UKA00001', '2010-01-01T00:00:00+00:00', {
          pollutantName: 'Nitrogen dioxide',
          measurementStatus: 'current'
        }),
        makeRecord('UKA00001', '2010-01-01T00:00:00+00:00', {
          pollutantName: 'Ozone',
          measurementStatus: 'current'
        })
      ])
      expect(currentPollutants.get('UKA00001')).toEqual(new Set(['NO2', 'O3']))
    })

    it('does not include closed pollutants', () => {
      const { currentPollutants } = buildStationDatesMap([
        makeRecord('UKA00001', '2006-01-01T00:00:00+00:00', {
          pollutantName: 'Carbon monoxide',
          measurementStatus: 'closed',
          endDate: '2012-01-01T00:00:00+00:00'
        }),
        makeRecord('UKA00001', '2006-01-01T00:00:00+00:00', {
          pollutantName: 'Nitrogen dioxide',
          measurementStatus: 'current'
        })
      ])
      expect(currentPollutants.get('UKA00001')).toEqual(new Set(['NO2']))
    })

    it('does not include unmapped pollutant names', () => {
      const { currentPollutants } = buildStationDatesMap([
        makeRecord('UKA00001', '2010-01-01T00:00:00+00:00', {
          pollutantName: 'Carbon monoxide',
          measurementStatus: 'current'
        })
      ])
      expect(currentPollutants.has('UKA00001')).toBe(false)
    })

    it('correctly maps Ricardo HTML pollutant names to short codes', () => {
      const { currentPollutants } = buildStationDatesMap([
        makeRecord('UKA00001', '2010-01-01T00:00:00+00:00', {
          pollutantName: 'PM<sub>10</sub> particulate matter (Hourly measured)',
          measurementStatus: 'current'
        }),
        makeRecord('UKA00001', '2010-01-01T00:00:00+00:00', {
          pollutantName:
            'PM<sub>2.5</sub> particulate matter (Hourly measured)',
          measurementStatus: 'current'
        })
      ])
      expect(currentPollutants.get('UKA00001')).toEqual(
        new Set(['PM10', 'PM25'])
      )
    })

    it('returns empty currentPollutants map for empty records', () => {
      const { currentPollutants } = buildStationDatesMap([])
      expect(currentPollutants.size).toBe(0)
    })
  })
})

describe('fetchStationDates', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  const mockFetchPage = (members, totalItems) => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => makePage(members, totalItems)
    })
  }

  it('returns openDates, closeDates and currentPollutants maps from a single page response', async () => {
    mockFetchPage([
      makeRecord('UKA00001', '2010-01-01T00:00:00+00:00', {
        pollutantName: 'Nitrogen dioxide',
        measurementStatus: 'current'
      }),
      makeRecord('UKA00002', '2005-03-15T00:00:00+00:00', {
        endDate: '2018-06-01T00:00:00+00:00',
        measurementStatus: 'closed'
      })
    ])

    const { openDates, closeDates, currentPollutants } =
      await fetchStationDates('test-token')

    expect(fetch).toHaveBeenCalledOnce()
    expect(fetch).toHaveBeenCalledWith(
      'https://mock-ricardo/api/pollutant_metadatas?page=1',
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer test-token' })
      })
    )
    expect(openDates.get('UKA00001')).toBe('2010-01-01T00:00:00+00:00')
    expect(openDates.get('UKA00002')).toBe('2005-03-15T00:00:00+00:00')
    expect(closeDates.get('UKA00002')).toBe('2018-06-01T00:00:00+00:00')
    expect(closeDates.has('UKA00001')).toBe(false)
    expect(currentPollutants.get('UKA00001')).toEqual(new Set(['NO2']))
  })

  it('paginates until a partial page signals the last page', async () => {
    const fullPage = Array.from({ length: 30 }, (_, i) =>
      makeRecord(
        `UKA${String(i).padStart(5, '0')}`,
        '2010-01-01T00:00:00+00:00'
      )
    )
    const partialPage = [makeRecord('UKA00031', '2010-01-01T00:00:00+00:00')]

    fetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => makePage(fullPage, 31)
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => makePage(partialPage, 31)
      })

    const { openDates } = await fetchStationDates('test-token')

    expect(fetch).toHaveBeenCalledTimes(2)
    expect(openDates.size).toBe(31)
  })

  it('stops pagination and returns partial results when a page returns non-ok', async () => {
    const fullPage = Array.from({ length: 30 }, (_, i) =>
      makeRecord(
        `UKA${String(i).padStart(5, '0')}`,
        '2010-01-01T00:00:00+00:00'
      )
    )

    fetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => makePage(fullPage, 60)
      })
      .mockResolvedValueOnce({ ok: false, status: 503 })

    const { openDates } = await fetchStationDates('test-token')

    expect(fetch).toHaveBeenCalledTimes(2)
    expect(openDates.size).toBe(30)
  })

  it('returns empty maps when the first page has no members', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => makePage([], 0)
    })

    const { openDates, closeDates, currentPollutants } =
      await fetchStationDates('test-token')

    expect(openDates.size).toBe(0)
    expect(closeDates.size).toBe(0)
    expect(currentPollutants.size).toBe(0)
  })

  it('uses fallback max pages when totalItems is missing from page 1', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        member: [makeRecord('UKA00001', '2010-01-01T00:00:00+00:00')]
      })
    })

    const { openDates } = await fetchStationDates('test-token')

    expect(openDates.get('UKA00001')).toBeDefined()
  })

  it('derives maxPages from totalItems with a 20% buffer', async () => {
    const fullPage = Array.from({ length: 30 }, (_, i) =>
      makeRecord(
        `UKA${String(i).padStart(5, '0')}`,
        '2010-01-01T00:00:00+00:00'
      )
    )

    fetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => makePage(fullPage, 30)
      })
      .mockResolvedValueOnce({ ok: true, json: async () => makePage([], 30) })

    const { openDates } = await fetchStationDates('test-token')

    expect(fetch).toHaveBeenCalledTimes(2)
    expect(openDates.size).toBe(30)
  })
})
