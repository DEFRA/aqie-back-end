import { parseForecast } from '~/src/api/forecast/parse-forecast'

describe('parseForecast', () => {
  test('Should parse a valid row', () => {
    const input = {
      title: 'TEST SITE',
      pubDate: 'Wed, 28 Feb 2024 06:00:00 +0000',
      description:
        'Location: 51&deg;52&acute;29.64&quot;N    0&deg;03&acute;29.52&quot;E <br />index levels are forecast to be  <br />Wed: 2 Thu: 3 Fri: 3 Sat: 3 Sun: 3 '
    }
    const result = parseForecast(input)

    expect(result.name).toBe('TEST SITE')
    expect(result.location.coordinates[0]).toBeCloseTo(51.8749)
    expect(result.location.coordinates[1]).toBeCloseTo(0.0562)
  })
})
