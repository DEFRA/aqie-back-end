import { createLogger } from '../../../helpers/logging/logger.js'
import { config } from '../../../config/index.js'

const logger = createLogger()
const FETCH_TIMEOUT_MS = 5000

async function getLocalAuthorityForCoords(lat, lng) {
  const baseUrl = config.get('postcodesApiUrl')
  const base = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`
  const url = new URL('postcodes', base)
  url.searchParams.set('lon', String(lng))
  url.searchParams.set('lat', String(lat))
  url.searchParams.set('radius', '2000')
  url.searchParams.set('wideSearch', 'true')

  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS)
    })
    if (!response.ok) {
      logger.warn(
        `postcodes.io /postcodes returned ${response.status} for (${lat}, ${lng})`
      )
      return null
    }

    const data = await response.json()
    const result = data?.result?.[0]
    return result?.admin_district || null
  } catch (error) {
    logger.warn(
      `Error fetching local authority for (${lat}, ${lng}): ${error.message}`
    )
    return null
  }
}

export { getLocalAuthorityForCoords }
