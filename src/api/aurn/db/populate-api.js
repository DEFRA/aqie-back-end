import { createLogger } from '../../../helpers/logging/logger.js'
import { fetchAurnMeasurements } from '../fetch-aurn-measurements.js'

const logger = createLogger()

/**
 * Reads active station IDs from the monitoringStations collection, fetches
 * the latest AURN measurements from Ricardo, calculates DAQI per station,
 * and upserts into the aurnMeasurements MongoDB collection.
 *
 * @param {object} server - Hapi server instance with a db property.
 */
async function populateAurnMeasurementsApi(server) {
  const stations = await server.db
    .collection('monitoringStations')
    .find(
      { stationStatus: 'current' },
      { projection: { _id: 0, localSiteID: 1 } }
    )
    .toArray()

  const stationIds = stations.map((s) => s.localSiteID).filter(Boolean)

  if (!stationIds.length) {
    logger.info(
      'No active stations in monitoringStations cache — skipping AURN update'
    )
    return
  }

  logger.info(`AURN: found ${stationIds.length} active stations to update`)

  const measurements = await fetchAurnMeasurements(stationIds)

  if (!measurements.length) {
    logger.info('No AURN measurements returned from Ricardo — skipping update')
    return
  }

  await server.db.collection('aurnMeasurements').bulkWrite(
    measurements.map((m) => ({
      replaceOne: {
        filter: { localSiteID: m.localSiteID },
        replacement: m,
        upsert: true
      }
    }))
  )

  logger.info(`aurnMeasurements updated: ${measurements.length} stations`)
}

export { populateAurnMeasurementsApi }
