import { createLogger } from '../../helpers/logging/logger.js'
import { schedule } from 'node-cron'
import { config } from '../../config/index.js'
import { fetchForecast, saveForecasts } from './fetch-forecast.js'
import { lock, unlock } from '../../helpers/db/lock.js'

const logger = createLogger()

// Populate the DB in this template on startup of the API.
// This is an example to show developers an API with a DB, with data in it and endpoints that query the db.
const forecastScheduler = {
  plugin: {
    name: 'Forecast Scheduler',
    register: async (server) => {
      // Run the initial fetch once the server is listening. Awaiting it here would delay
      // server.start(), so CDP's /health check fails and the container gets replaced.
      server.events.once('start', () => {
        fetchAndSaveForecasts(server).catch((err) => {
          logger.error('Error running initial forecasts fetch', err)
        })
      })
      logger.info('starting forecasts Scheduler')
      schedule(config.get('forecastSchedule'), async () => {
        await fetchAndSaveForecasts(server)
      })
      logger.info('forecasts Scheduler done! Running every day at 5:00am')
    }
  }
}

async function fetchAndSaveForecasts(server) {
  if (await lock(server.db, 'forecasts')) {
    try {
      const forecasts = await fetchForecast()
      await saveForecasts(server, forecasts)
      logger.info('saveForecasts done!')
    } catch (err) {
      logger.error('Error fetching and saving forecasts', err)
    } finally {
      await unlock(server.db, 'forecasts')
    }
  }
  logger.info('forecast save bypassed!')
}

export { forecastScheduler }
