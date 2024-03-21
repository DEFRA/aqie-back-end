/* eslint-disable no-console */
/* eslint-disable prettier/prettier */
import { proxyFetch } from '~/src/helpers/proxy-fetch'
import { XMLParser } from 'fast-xml-parser'
import { createLogger } from '~/src/helpers/logging/logger'
import { config } from '~/src/config'
import reduce from "awaity/reduce";

const logger = createLogger()

const fetchPollutants = async () => {
  const url = config.get('pollutantstUrl')
 const urlExtra = config.get('pollutantstUrlExtra')
  let featureOfInterest = ''
  const startTimeStamp = '2024-03-13T00:01:00.000Z' 
  const endTimeStamp = '2024-03-14T10:00:00.00'     
  const timestamp = `${startTimeStamp}/${endTimeStamp}`
  let res = []
  let measurementsInit = []
  const measurements = await reduce(
    [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18],
    async (measurements, id) => {
      try {
        res = await proxyFetch(url + id, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        });
        measurementsInit = await res.json();
      } catch (error) {
        console.log(error)
      }
      // let resNO2
      let measurement = []
      measurementsInit.forEach((site) => {
        site.parameter_ids.forEach(async (siteId) => {
          if (siteId.parameter_id === "NO2") {
            featureOfInterest = siteId.feature_of_interest[0].featureOfInterset
          }
          if (siteId.parameter_id === "GE10") {
            featureOfInterest = siteId.feature_of_interest[0].featureOfInterset
          }
          if (siteId.parameter_id === "SO2") {
            featureOfInterest = siteId.feature_of_interest[0].featureOfInterset
          }
          if (siteId.parameter_id === "O3") {
            featureOfInterest = siteId.feature_of_interest[0].featureOfInterset
          }
        })
      })
      try {
        const res = await proxyFetch(`${urlExtra}${timestamp}&featureOfInterest=${featureOfInterest}`)
        const parser = new XMLParser()
        measurement = parser.parse(await res.text())
      } catch (error) {
        console.log(error)
      }

      // measurement
      //   .map((i) => {
      //     try {
      //       return measurements
      //     } catch (e) {
      //       logger.warn(`Pollutants Parser error: ${e}`)
      //       return null
      //     }
      //   })
      //   .filter((i) => i !== null)
      return {
        ...measurements,
        [id]: measurement,
      }
    },
    []
  )

  return measurements
  
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

export { fetchPollutants, savePollutants }
