import { createLogger } from '../../helpers/logging/logger.js'
import { catchProxyFetchError } from './helpers/catch-proxy-fetch-error.js'
import { config } from '../../config/index.js'
const logger = createLogger()

const refreshOAuthToken = async (request) => {
  const accessToken = await fetchOAuthToken()
  request.yar.clear('savedAccessToken')
  request.yar.set('savedAccessToken', accessToken)
  return accessToken
}

async function fetchOAuthToken() {
  const ricardoApiLoginUrl = config.get('ricardoApiLoginUrl')
  const ricardoApiEmail = config.get('ricardoApiEmail')
  const ricardoApiPassword = config.get('ricardoApiPassword')

  const optionsOAuthRicardo = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      email: ricardoApiEmail,
      password: ricardoApiPassword
    })
  }

  try {
    const [statusCodeToken, dataToken] = await catchProxyFetchError(
      ricardoApiLoginUrl,
      optionsOAuthRicardo
    )
    if (statusCodeToken !== 200) {
      throw new Error(
        `Error fetching OAuth token via Postman API: ${statusCodeToken}`
      )
    }

    const accessToken = dataToken.token // Adjust according to the actual token key in the response
    logger.info('OAuth token fetched successfully via Postman API.')
    return accessToken
  } catch (error) {
    logger.error(`Error fetching OAuth token via Postman API: ${error.message}`)
    return null
  } finally {
    logger.info('Completed fetchOAuthTokenNewRicardoAPI execution')
  }
}

const siteController = {
  handler: async (request, h) => {
    const ricardoApiAllDataUrl = config.get('ricardoApiAllDataUrl')
    const ricardoApiSiteIdUrl = config.get('ricardoApiSiteIdUrl')

    const savedAccessToken = request.yar.get('savedAccessToken')
    const accessToken = savedAccessToken || (await refreshOAuthToken(request))
    if (!accessToken) {
      return h.response({ error: 'Failed to fetch access token' }).code(500)
    }
    logger.info('Access token fetched successfully')
    const optionsOAuthRicardo = {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    }
    const page = 1
    const networks = 4
    const withClosed = false
    const withPollutants = true
    const startDate = new Date().toISOString().split('T')[0] // Format as YYYY-MM-DD
    const distance = 62 // Example distance in miles
    const longitude = 0.439548
    const latitude = 51.518167
    const paramsValues = `page=${page}&networks[]=${networks}&with-closed=${withClosed}&with-pollutants=${withPollutants}&start-date=${startDate}&latitude=${latitude}&longitude=${longitude}&distance=${distance}`
    const [statusCodeDataAll, dataAll] = await catchProxyFetchError(
      `${ricardoApiAllDataUrl}${paramsValues}`,
      optionsOAuthRicardo
    )
    logger.info(
      `Data fetched successfully from Ricardo API: ${statusCodeDataAll}`
    )
    logger.info(`Data All: ${JSON.stringify(dataAll)}`)

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
      tempData = dataAll.member.slice(0, 3).map((item) => ({
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
    // Pollutant names to extract (as they appear in the API response)
    const pollutantNames = [
      'Nitrogen dioxide',
      'Ozone',
      'PM10',
      'PM2.5',
      'Sulphur dioxide'
    ]

    // Iterate over tempData, fetch pollutants for each site, and attach to tempData
    const enrichedTempData = []
    for (const site of tempData) {
      const pollutants = {}
      let siteData = null
      if (site.localSiteID) {
        ;[, siteData] = await catchProxyFetchError(
          `${ricardoApiSiteIdUrl}station-id=${site.localSiteID}&start-date-time=${startDateTime}&end-date-time=${endDateTime}`,
          optionsSiteId
        )
        logger.info(
          `Site ID ${site.localSiteID} data: ${JSON.stringify(siteData)}`
        )
        if (Array.isArray(siteData?.member)) {
          for (const pollutant of pollutantNames) {
            const found = siteData.member.find((m) => {
              if (!m.pollutantName) return false
              // Normalize both names for comparison
              const normalize = (s) =>
                s
                  .replace(/<sub>(.*?)<\/sub>/g, (_, sub) => sub)
                  .replace(/\s/g, '')
                  .toLowerCase()
              return normalize(m.pollutantName).startsWith(normalize(pollutant))
            })
            if (found) {
              pollutants[pollutant] = {
                value: found.value,
                unit: found.unit,
                startDate: found.startDateTime,
                endDate: found.endDateTime,
                time: {
                  date: found.endDateTime
                }
              }
            }
          }
        }
      }
      enrichedTempData.push({
        ...site,
        pollutants: Object.keys(pollutants).length > 0 ? pollutants : undefined
      })
    }

    return h
      .response({
        message: `Monitoring Stations Info for ${enrichedTempData[0].name} - ${enrichedTempData[1].name} - ${enrichedTempData[2].name}`,
        sites: enrichedTempData
      })
      .code(200)
  }
}

export { siteController }

// 1. Call first API to get site ID (replace with your real API URL)
// const siteRes = await fetch(`https://example.com/get-site?longitude=${longitude}&latitude=${latitude}`)
// if (!siteRes.ok) {
//   return h.response({ error: 'Failed to fetch site ID' }).code(502)
// }
// const siteData = await siteRes.json()
// const siteId = siteData.siteId
// if (!siteId) {
//   return h.response({ error: 'Site ID not found' }).code(404)
// }

// // 2. Call second API to get final data (replace with your real API URL)
// const finalRes = await fetch(`https://example.com/get-data?siteId=${siteId}`)
// if (!finalRes.ok) {
//   return h.response({ error: 'Failed to fetch final data' }).code(502)
// }
// const finalData = await finalRes.json()

// return h.response(finalData).code(200)
