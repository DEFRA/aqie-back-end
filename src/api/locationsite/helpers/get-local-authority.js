import { createLogger } from '../../../helpers/logging/logger.js'
import { config } from '../../../config/index.js'
import { latLngToNationalGrid } from './lat-lng-to-national-grid.js'

const logger = createLogger()
const FETCH_TIMEOUT_MS = 5000

async function getLocalAuthorityForCoords(lat, lng) {
  const apiKey = config.get('osNamesApiKey')
  if (!apiKey) {
    return null
  }

  const { easting, northing } = latLngToNationalGrid(lat, lng)

  const baseUrl = config.get('osNamesApiUrl')
  const url = `${baseUrl}nearest?point=${easting},${northing}&radius=1000&key=${apiKey}`

  const response = await fetch(url, {
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS)
  })
  if (!response.ok) {
    logger.warn(
      `OS Names /nearest returned ${response.status} for (${lat}, ${lng})`
    )
    return null
  }

  const data = await response.json()
  const entry = data?.results?.[0]?.GAZETTEER_ENTRY
  if (!entry) {
    return null
  }

  return entry.COUNTY_UNITARY || entry.DISTRICT_BOROUGH || null
}

export { getLocalAuthorityForCoords }
