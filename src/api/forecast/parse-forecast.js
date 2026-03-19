import {
  SECONDS_PER_HOUR,
  MINUTES_PER_HOUR
} from '../pollutants/helpers/common/constants.js'

function parseForecast(item) {
  const name = item.title
  const updated = new Date(item.pubDate)

  // Extract all the coordinate numbers from the first section
  const coordinates = [
    ...item.description.matchAll(
      /(\d+)&deg;(\d+)&acute;(\d+\.?\d+?)&quot;([NSEW])/g
    )
  ]

  if (coordinates.length !== 2) {
    throw new Error('failed to parse coordinates: ' + item.description)
  }

  const location = {
    type: 'Point',
    coordinates: coordinates.slice(0, 2).map(([, d, m, s, dir]) => {
      return dmsToDecimal(d, m, s, dir)
    })
  }

  // Extract the day text and the corresponding values from the last section
  const forecasts = item.description.split('<br />')[2]
  const days = forecasts.match(/\w{3}/g)
  const values = forecasts.match(/\d+/g)

  if (!days || !values || days.length !== values.length) {
    throw new Error(`Failed to parse readings: ${forecasts}`)
  }

  // Reformat the readings
  const forecast = days.map((day, i) => ({
    day,
    value: Number.parseInt(values[i], 10)
  }))

  return {
    name,
    updated,
    location,
    forecast
  }
}

function dmsToDecimal(d, m, s, dir) {
  const degrees = Number.parseFloat(d)
  const minutes = Number.parseFloat(m)
  const seconds = Number.parseFloat(s)
  const decimal =
    degrees + minutes / MINUTES_PER_HOUR + seconds / SECONDS_PER_HOUR
  if (dir === 'S' || dir === 'W') {
    return -decimal
  }
  return decimal
}

export { parseForecast }
