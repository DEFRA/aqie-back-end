import { vi, describe, test, expect, beforeEach } from 'vitest'

const mockLogger = vi.hoisted(() => ({
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn()
}))

vi.mock('../../../../helpers/logging/logger.js', () => ({
  createLogger: vi.fn().mockReturnValue(mockLogger)
}))

vi.mock('./constants.js', () => ({
  STALE_DATA_THRESHOLD_MINUTES: 65
}))

const { validateDataFreshness } = await import('./validate-data-freshness.js')

describe('validateDataFreshness', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('returns false and warns when endDateTime is null', () => {
    const result = validateDataFreshness(null, 'NO2', 'London Marylebone Road')
    expect(result).toBe(false)
    expect(mockLogger.warn).toHaveBeenCalledWith(
      'No endDateTime found for pollutant: NO2 at station: London Marylebone Road'
    )
  })

  test('returns false and warns when endDateTime is undefined', () => {
    const result = validateDataFreshness(
      undefined,
      'PM10',
      'Manchester Piccadilly'
    )
    expect(result).toBe(false)
    expect(mockLogger.warn).toHaveBeenCalledWith(
      'No endDateTime found for pollutant: PM10 at station: Manchester Piccadilly'
    )
  })

  test('uses Unknown defaults when pollutantName and stationName are omitted', () => {
    const result = validateDataFreshness(null)
    expect(result).toBe(false)
    expect(mockLogger.warn).toHaveBeenCalledWith(
      'No endDateTime found for pollutant: Unknown at station: Unknown'
    )
  })

  test('returns true for fresh data within threshold', () => {
    const recentDate = new Date(Date.now() - 30 * 60 * 1000).toISOString()
    const result = validateDataFreshness(
      recentDate,
      'NO2',
      'London Marylebone Road'
    )
    expect(result).toBe(true)
    expect(mockLogger.error).not.toHaveBeenCalled()
    expect(mockLogger.warn).not.toHaveBeenCalled()
  })

  test('returns false and logs error for stale data beyond threshold', () => {
    const staleDate = new Date(Date.now() - 90 * 60 * 1000).toISOString()
    const result = validateDataFreshness(
      staleDate,
      'NO2',
      'London Marylebone Road'
    )
    expect(result).toBe(false)
    expect(mockLogger.error).toHaveBeenCalledWith(
      expect.stringContaining("Station 'London Marylebone Road'")
    )
    expect(mockLogger.error).toHaveBeenCalledWith(
      expect.stringContaining("Pollutant 'NO2'")
    )
  })

  test('log message includes station name, pollutant name and threshold', () => {
    const staleDate = new Date(Date.now() - 70 * 60 * 1000).toISOString()
    validateDataFreshness(staleDate, 'PM10', 'Birmingham Centre')
    expect(mockLogger.error).toHaveBeenCalledWith(
      expect.stringContaining("Station 'Birmingham Centre' | Pollutant 'PM10'")
    )
    expect(mockLogger.error).toHaveBeenCalledWith(
      expect.stringContaining('65 minutes')
    )
  })

  test('returns true for data just under the threshold (64 minutes old)', () => {
    const borderDate = new Date(Date.now() - 64 * 60 * 1000).toISOString()
    const result = validateDataFreshness(borderDate, 'O3', 'Oxford Centre')
    expect(result).toBe(true)
  })

  test('returns false for data just over the threshold (66 minutes old)', () => {
    const justStaleDate = new Date(Date.now() - 66 * 60 * 1000).toISOString()
    const result = validateDataFreshness(justStaleDate, 'O3', 'Oxford Centre')
    expect(result).toBe(false)
  })
})
