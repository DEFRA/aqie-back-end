// Helper to fetch dataAll from Ricardo API

function buildRicardoQueryParams(requestQuery) {
  // Only include params that are explicitly allowed by the Ricardo API and not empty strings
  // Always include all required params with correct values, using defaults if not present in the request
  const today = new Date().toISOString().split('T')[0]
  // Use values from the request if present, otherwise use the defaults
  const params = {
    page: requestQuery.page ?? '1',
    'networks[]': requestQuery['networks[]'] ?? '4',
    'with-closed': requestQuery['with-closed'] ?? 'false',
    'with-pollutants': requestQuery['with-pollutants'] ?? 'true',
    'start-date': requestQuery['start-date'] ?? today,
    latitude:
      requestQuery.latitude !== undefined ? requestQuery.latitude : '50.950300',
    longitude:
      requestQuery.longitude !== undefined
        ? requestQuery.longitude
        : '-1.356700',
    distance: requestQuery.distance !== undefined ? requestQuery.distance : '62'
  }
  const paramsArray = []
  for (const [key, value] of Object.entries(params)) {
    // Do not encode square brackets in 'networks[]' key
    const encodedKey =
      key === 'networks[]' ? 'networks[]' : encodeURIComponent(key)
    paramsArray.push(`${encodedKey}=${encodeURIComponent(value)}`)
  }
  return paramsArray.join('&')
}

async function fetchRicardoDataAll({
  ricardoApiAllDataUrl,
  optionsOAuthRicardo,
  requestQuery
}) {
  const paramsValues = buildRicardoQueryParams(requestQuery)

  // catchProxyFetchError must be passed in from the caller's scope
  if (typeof global.catchProxyFetchError !== 'function') {
    throw new Error(
      'catchProxyFetchError must be set globally or passed in context'
    )
  }
  // Add '?' if paramsValues is not empty and ricardoApiAllDataUrl does not already end with '?'
  let url = ricardoApiAllDataUrl
  if (paramsValues) {
    if (url.endsWith('?')) {
      url = `${url}${paramsValues}`
    } else if (url.includes('?')) {
      url = `${url}&${paramsValues}`
    } else {
      url = `${url}?${paramsValues}`
    }
  }
  let dataAll
  try {
    ;[, dataAll] = await global.catchProxyFetchError(url, optionsOAuthRicardo)
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
