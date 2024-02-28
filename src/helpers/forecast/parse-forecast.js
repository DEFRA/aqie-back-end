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
    coordinates: coordinates
      .slice(0, 2)
      .map((c) => dmsToDecimal(c[1], c[2], c[3]))
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
    value: parseInt(values[i], 10)
  }))

  return {
    name,
    updated,
    location,
    forecast
  }
}

function dmsToDecimal(d, m, s, dir) {
  const degrees = parseFloat(d)
  const minutes = parseFloat(m)
  const seconds = parseFloat(s)
  const decimal = degrees + minutes / 60 + seconds / 3600
  if (dir === 'S' || dir === 'W') return -decimal
  return decimal
}

export { parseForecast }
