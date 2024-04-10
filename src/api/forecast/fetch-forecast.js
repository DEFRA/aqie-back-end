import { proxyFetch } from '~/src/helpers/proxy-fetch'
import { XMLParser } from 'fast-xml-parser'
import { createLogger } from '~/src/helpers/logging/logger'
import { config } from '~/src/config'
import { parseForecast } from '~/src/api/forecast/parse-forecast'

const logger = createLogger()

const fetchForecast = async () => {
  const url = config.get('forecastUrl')
  const response = await proxyFetch(url, {
    method: 'get',
    headers: { 'Content-Type': 'text/xml' }
  })

  const parser = new XMLParser()
  const body = parser.parse(await response.text())
  // TODO: handle xml parser failures & http response codes
  return body.rss.channel.item
    .map((i) => {
      try {
        return parseForecast(i)
      } catch (e) {
        logger.warn(`Forecast Parser error: ${e}`)
        return null
      }
    })
    .filter((i) => i !== null)
}

const saveForecasts = async (server, forecasts) => {
  await server.db.collection('historicalForecasts').deleteMany({})
  await server.db.collection('forecasts').deleteMany({})
  logger.info(`updating ${forecasts.length} forecasts`)
  // await server.db
  //   .collection('forecasts')
  //   .bulkWrite(forecasts.map(toBulkReplace))
  // logger.info('forecasts update done')
  // await server.db.collection('historicalForecasts').insertMany(forecasts)
  // logger.info('historical forecasts update done')
}

/**
 * Wrap the item we want to update in a MongoDB replace command
 */
// function toBulkReplace(item) {
//   return {
//     replaceOne: {
//       filter: { name: item.name },
//       replacement: item,
//       upsert: true
//     }
//   }
// }

export { fetchForecast, saveForecasts }
