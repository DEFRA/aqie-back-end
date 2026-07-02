import { createLogger } from '../../../helpers/logging/logger.js'
import { config } from '../../../config/index.js'

const logger = createLogger()
const FETCH_TIMEOUT_MS = 5000

async function getLocalAuthorityForCoords(lat, lng) {
  const baseUrl = config.get('postcodesApiUrl')
  const url = `${baseUrl}postcodes?lon=${lng}&lat=${lat}&radius=2000&wideSearch=true`

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
  if (!result) {
    return null
  }

  return result.admin_district || null
}

export { getLocalAuthorityForCoords }
