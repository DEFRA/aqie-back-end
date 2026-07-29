import { describe, it, expect } from 'vitest'
import {
  daqiIndexForPollutant,
  calculateDaqiIndex,
  DAQI_BREAKPOINTS
} from './daqi-calculator.js'

describe('daqiIndexForPollutant', () => {
  it('returns null for an unknown pollutant code', () => {
    expect(daqiIndexForPollutant('CO', 50)).toBeNull()
  })

  it('returns null when value is null', () => {
    expect(daqiIndexForPollutant('NO2', null)).toBeNull()
  })

  it('returns null when value is NaN', () => {
    expect(daqiIndexForPollutant('NO2', NaN)).toBeNull()
  })

  it('returns null when value is negative', () => {
    expect(daqiIndexForPollutant('NO2', -1)).toBeNull()
  })

  describe('NO2 breakpoints', () => {
    it('returns 1 at the bottom of band 1 (0 µg/m³)', () => {
      expect(daqiIndexForPollutant('NO2', 0)).toBe(1)
    })

    it('returns 1 at the top of band 1 (67 µg/m³)', () => {
      expect(daqiIndexForPollutant('NO2', 67)).toBe(1)
    })

    it('returns 2 at 68 µg/m³', () => {
      expect(daqiIndexForPollutant('NO2', 68)).toBe(2)
    })

    it('returns 4 at 201 µg/m³', () => {
      expect(daqiIndexForPollutant('NO2', 201)).toBe(4)
    })

    it('returns 7 at 401 µg/m³', () => {
      expect(daqiIndexForPollutant('NO2', 401)).toBe(7)
    })

    it('returns 10 above the top threshold (> 600 µg/m³)', () => {
      expect(daqiIndexForPollutant('NO2', 601)).toBe(10)
    })
  })

  describe('PM10 breakpoints', () => {
    it('returns 1 at 0 µg/m³', () => {
      expect(daqiIndexForPollutant('PM10', 0)).toBe(1)
    })

    it('returns 1 at 16 µg/m³', () => {
      expect(daqiIndexForPollutant('PM10', 16)).toBe(1)
    })

    it('returns 2 at 17 µg/m³', () => {
      expect(daqiIndexForPollutant('PM10', 17)).toBe(2)
    })

    it('returns 10 above 100 µg/m³', () => {
      expect(daqiIndexForPollutant('PM10', 101)).toBe(10)
    })
  })

  describe('PM25 breakpoints', () => {
    it('returns 1 at 0 µg/m³', () => {
      expect(daqiIndexForPollutant('PM25', 0)).toBe(1)
    })

    it('returns 1 at 11 µg/m³', () => {
      expect(daqiIndexForPollutant('PM25', 11)).toBe(1)
    })

    it('returns 2 at 12 µg/m³', () => {
      expect(daqiIndexForPollutant('PM25', 12)).toBe(2)
    })

    it('returns 10 above 70 µg/m³', () => {
      expect(daqiIndexForPollutant('PM25', 71)).toBe(10)
    })
  })

  describe('O3 breakpoints', () => {
    it('returns 1 at 0 µg/m³', () => {
      expect(daqiIndexForPollutant('O3', 0)).toBe(1)
    })

    it('returns 4 at 101 µg/m³', () => {
      expect(daqiIndexForPollutant('O3', 101)).toBe(4)
    })

    it('returns 10 above 240 µg/m³', () => {
      expect(daqiIndexForPollutant('O3', 241)).toBe(10)
    })
  })

  describe('SO2 breakpoints', () => {
    it('returns 1 at 0 µg/m³', () => {
      expect(daqiIndexForPollutant('SO2', 0)).toBe(1)
    })

    it('returns 2 at 89 µg/m³', () => {
      expect(daqiIndexForPollutant('SO2', 89)).toBe(2)
    })

    it('returns 10 above 1064 µg/m³', () => {
      expect(daqiIndexForPollutant('SO2', 1065)).toBe(10)
    })
  })

  it('covers all 10 bands — the breakpoints array has exactly 9 thresholds per pollutant', () => {
    for (const thresholds of Object.values(DAQI_BREAKPOINTS)) {
      expect(thresholds).toHaveLength(9)
    }
  })
})

describe('calculateDaqiIndex', () => {
  it('returns null for an empty object', () => {
    expect(calculateDaqiIndex({})).toBeNull()
  })

  it('returns null when all values are invalid', () => {
    expect(calculateDaqiIndex({ UNKNOWN: 50 })).toBeNull()
  })

  it('returns the index for a single pollutant', () => {
    expect(calculateDaqiIndex({ NO2: 68 })).toBe(2)
  })

  it('returns the maximum index across multiple pollutants', () => {
    // NO2=68 → band 2, PM10=101 → band 10
    expect(calculateDaqiIndex({ NO2: 68, PM10: 101 })).toBe(10)
  })

  it('ignores unknown pollutant codes when calculating the max', () => {
    // CO is unknown → null, NO2=68 → band 2
    expect(calculateDaqiIndex({ CO: 9999, NO2: 68 })).toBe(2)
  })

  it('returns the higher band when two pollutants both have valid values', () => {
    // NO2=67 → band 1, PM25=12 → band 2
    expect(calculateDaqiIndex({ NO2: 67, PM25: 12 })).toBe(2)
  })
})
