/* eslint-disable prettier/prettier */
import { proxyFetch } from '~/src/helpers/proxy-fetch'
import { XMLParser } from 'fast-xml-parser'
import { createLogger } from '~/src/helpers/logging/logger'
import { config } from '~/src/config'

const logger = createLogger()

const fetchForecast = async () => {
  const url = config.get('pollutantstUrl')
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
        return body
      } catch (e) {
        logger.warn(`Pollutants Parser error: ${e}`)
        return null
      }
    })
    .filter((i) => i !== null)
}

const savePollutants = async (server, pollutants) => {
  logger.info(`updating ${pollutants.length} pollutants`)
  await server.db
    .collection('measurements')
    .bulkWrite(pollutants.map(toBulkReplace))
  logger.info('pollutants update done')
}

/**
 * Wrap the item we want to update in a MongoDB replace command
 */
function toBulkReplace(item) {
  return {
    replaceOne: {
      filter: { name: item.name },
      replacement: item,
      upsert: true
    }
  }
}

export { fetchForecast, savePollutants }
