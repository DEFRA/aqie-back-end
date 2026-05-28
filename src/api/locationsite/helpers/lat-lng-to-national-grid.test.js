import { describe, it, expect } from 'vitest'
import { latLngToNationalGrid } from './lat-lng-to-national-grid.js'

describe('latLngToNationalGrid', () => {
  it('returns an object with numeric easting and northing properties', () => {
    const result = latLngToNationalGrid(51.5074, -0.1278)

    expect(result).toHaveProperty('easting')
    expect(result).toHaveProperty('northing')
    expect(typeof result.easting).toBe('number')
    expect(typeof result.northing).toBe('number')
  })

  it('returns expected BNG coordinates for Reading New Town within 5m tolerance', () => {
    // Ground truth: easting/northing confirmed by calling the OS Names /nearest API
    // with these values and receiving a valid postcode result for RG6 1LD
    const { easting, northing } = latLngToNationalGrid(51.45309, -0.944067)

    expect(easting).toBeCloseTo(473468, -1) // ±5m
    expect(northing).toBeCloseTo(173207, -1) // ±5m
  })

  it('returns a higher northing for Edinburgh than for London', () => {
    const london = latLngToNationalGrid(51.5074, -0.1278)
    const edinburgh = latLngToNationalGrid(55.9533, -3.1883)

    expect(edinburgh.northing).toBeGreaterThan(london.northing)
  })

  it('returns a higher easting for an eastern location than a western one at the same latitude', () => {
    const west = latLngToNationalGrid(51.5, -2.0)
    const east = latLngToNationalGrid(51.5, 0.5)

    expect(east.easting).toBeGreaterThan(west.easting)
  })

  it('returns easting greater than 400000 for locations east of 2°W (the true origin meridian)', () => {
    // BNG false easting is 400000m, so east of 2°W the easting exceeds 400000
    const { easting } = latLngToNationalGrid(51.5, 0.0)

    expect(easting).toBeGreaterThan(400000)
  })

  it('returns easting less than 400000 for locations well west of 2°W', () => {
    const { easting } = latLngToNationalGrid(51.5, -5.0)

    expect(easting).toBeLessThan(400000)
  })
})
