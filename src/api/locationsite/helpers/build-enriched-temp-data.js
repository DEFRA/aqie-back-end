// Helper to build enrichedTempData for Ricardo API site controller
import { enrichSitesWithPollutants } from './pollutant-helpers.js'

async function buildEnrichedTempData({
  dataAll,
  ricardoApiSiteIdUrl,
  accessToken,
  logger,
  catchProxyFetchError
}) {
  // Set startDateTime and endDateTime dynamically for current date, but static times
  const now = new Date()
  const yyyy = now.getFullYear()
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const dd = String(now.getDate()).padStart(2, '0')
  const startDateTime = `${yyyy}-${mm}-${dd} 00:00:00`
  const endDateTime = `${yyyy}-${mm}-${dd} 23:59:00`

  const optionsSiteId = {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    }
  }
  let tempData = []
  if (Array.isArray(dataAll.member) && dataAll.member.length > 0) {
    let members = dataAll.member
    const totalItems =
      typeof global.requestQuery === 'object' &&
      global.requestQuery.totalItems !== undefined &&
      global.requestQuery.totalItems !== null
        ? global.requestQuery.totalItems
        : undefined
    if (totalItems !== undefined && totalItems !== null) {
      members = members.slice(0, Number(totalItems))
    }
    tempData = members.map((item) => ({
      name: item.siteName,
      area: item.governmentRegion,
      localSiteID: item.siteId,
      areaType: `${item.siteType} ${item.areaType}`,
      location: {
        type: 'Point',
        coordinates: [item.latitude, item.longitude]
      }
    }))
  }
  logger.info(`tempData: ${JSON.stringify(tempData)}`)

  const enrichedTempData = await enrichSitesWithPollutants(
    tempData,
    ricardoApiSiteIdUrl,
    optionsSiteId,
    startDateTime,
    endDateTime,
    logger,
    catchProxyFetchError
  )
  return enrichedTempData
}

export { buildEnrichedTempData }
