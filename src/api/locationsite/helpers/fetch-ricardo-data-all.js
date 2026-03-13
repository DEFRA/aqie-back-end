// Helper to fetch dataAll from Ricardo API

function buildqueryparam(base, requestQuery) {
  const url = new URL(base) // base URL without query params
  const params = new URLSearchParams()

  // List of keys we accept from the query
  const allowedKeys = [
    'page',
    'networks[]', // note the square brackets for repeated values
    'with-closed',
    'with-pollutants',
    'start-date',
    'latitude',
    'longitude',
    'distance'
  ]

  for (const key of allowedKeys) {
    const value = requestQuery[key]

    // Skip if undefined, null, or empty string
    if (value === undefined || value === null || value === '') continue

    // Handle arrays (or repeated 'networks[]')
    if (Array.isArray(value)) {
      for (const v of value) {
        if (v !== undefined && v !== null && v !== '') {
          params.append(key, String(v))
        }
      }
    } else {
      params.set(key, String(value))
    }
  }

  url.search = params.toString()
  return url.toString()
}

async function fetchRicardoDataAll({
  ricardoApiAllDataUrl,
  optionsOAuthRicardo,
  requestQuery,
  catchProxyFetchError
}) {
  const url = buildqueryparam(ricardoApiAllDataUrl, requestQuery)

  if (typeof catchProxyFetchError !== 'function') {
    throw new Error(
      'catchProxyFetchError must be provided as a function dependency'
    )
  }

  let dataAll
  try {
    ;[, dataAll] = await catchProxyFetchError(url, optionsOAuthRicardo)
  } catch (err) {
    // Log the error for debugging purposes
    console.error('Error fetching Ricardo data:', err)
    dataAll = undefined
  }
  if (!dataAll || typeof dataAll !== 'object') {
    // Optionally log a warning here
    return {}
  }
  return dataAll
}

export { fetchRicardoDataAll }
