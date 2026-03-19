// Helper to fetch dataAll from Ricardo API

function appendArrayValues(params, key, values) {
  for (const v of values) {
    if (v !== undefined && v !== null && v !== '') {
      params.append(key, String(v))
    }
  }
}

function buildqueryparam(base, requestQuery) {
  const url = new URL(base)
  const params = new URLSearchParams()

  const allowedKeys = [
    'page',
    'networks[]',
    'with-closed',
    'with-pollutants',
    'start-date',
    'latitude',
    'longitude',
    'distance'
  ]

  for (const key of allowedKeys) {
    const value = requestQuery[key]

    if (value === undefined || value === null || value === '') {
      continue
    }

    if (Array.isArray(value)) {
      appendArrayValues(params, key, value)
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
    throw new TypeError(
      'catchProxyFetchError must be provided as a function dependency'
    )
  }

  let dataAll
  try {
    ;[, dataAll] = await catchProxyFetchError(url, optionsOAuthRicardo)
  } catch (err) {
    console.error('Error fetching Ricardo data:', err)
    dataAll = null
  }
  if (!dataAll || typeof dataAll !== 'object') {
    return {}
  }
  return dataAll
}

export { fetchRicardoDataAll }
