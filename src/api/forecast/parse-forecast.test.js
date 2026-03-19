import { parseForecast } from './parse-forecast.js'

const VALID_DESCRIPTION =
  'Location: 51&deg;52&acute;29.64&quot;N    0&deg;03&acute;29.52&quot;E <br />index levels are forecast to be  <br />Wed: 2 Thu: 3 Fri: 3 Sat: 3 Sun: 3 '

describe('parseForecast', () => {
  test('Should parse a valid row', () => {
    const input = {
      title: 'TEST SITE',
      pubDate: 'Wed, 28 Feb 2024 06:00:00 +0000',
      description: VALID_DESCRIPTION
    }
    const result = parseForecast(input)

    expect(result.name).toBe('TEST SITE')
    expect(result.location.coordinates[0]).toBeCloseTo(51.8749)
    expect(result.location.coordinates[1]).toBeCloseTo(0.0562)
  })

  test('Should return negative coordinate for W direction', () => {
    const input = {
      title: 'WEST SITE',
      pubDate: 'Wed, 28 Feb 2024 06:00:00 +0000',
      description:
        'Location: 51&deg;52&acute;29.64&quot;N    0&deg;03&acute;29.52&quot;W <br />index levels are forecast to be  <br />Wed: 2 Thu: 3 '
    }
    const result = parseForecast(input)

    expect(result.location.coordinates[1]).toBeCloseTo(-0.0562)
  })

  test('Should return negative coordinate for S direction', () => {
    const input = {
      title: 'SOUTH SITE',
      pubDate: 'Wed, 28 Feb 2024 06:00:00 +0000',
      description:
        'Location: 51&deg;52&acute;29.64&quot;S    0&deg;03&acute;29.52&quot;E <br />index levels are forecast to be  <br />Mon: 1 Tue: 2 '
    }
    const result = parseForecast(input)

    expect(result.location.coordinates[0]).toBeCloseTo(-51.8749)
  })

  test('Should throw when description has no coordinates', () => {
    const input = {
      title: 'BAD SITE',
      pubDate: 'Wed, 28 Feb 2024 06:00:00 +0000',
      description: 'No coordinates here <br />index <br />Wed: 2 '
    }

    expect(() => parseForecast(input)).toThrow('failed to parse coordinates')
  })

  test('Should throw when forecast readings cannot be parsed', () => {
    const input = {
      title: 'BAD FORECAST',
      pubDate: 'Wed, 28 Feb 2024 06:00:00 +0000',
      description:
        'Location: 51&deg;52&acute;29.64&quot;N    0&deg;03&acute;29.52&quot;E <br />index levels are forecast to be  <br />no valid readings here'
    }

    expect(() => parseForecast(input)).toThrow('Failed to parse readings')
  })

  test('Should parse forecast day/value pairs correctly', () => {
    const input = {
      title: 'TEST SITE',
      pubDate: 'Wed, 28 Feb 2024 06:00:00 +0000',
      description: VALID_DESCRIPTION
    }
    const result = parseForecast(input)

    expect(result.forecast).toEqual([
      { day: 'Wed', value: 2 },
      { day: 'Thu', value: 3 },
      { day: 'Fri', value: 3 },
      { day: 'Sat', value: 3 },
      { day: 'Sun', value: 3 }
    ])
  })
})
