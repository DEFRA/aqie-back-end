import { createLogger } from '~/src/helpers/logging/logger'
import { schedule } from 'node-cron'
import { config } from '~/src/config'
import { fetchForecast, saveForecasts } from '~/src/api/forecast/fetch-forecast'
import { lock, unlock } from '~/src/helpers/db/lock'

const logger = createLogger()

// Populate the DB in this template on startup of the API.
// This is an example to show developers an API with a DB, with data in it and endpoints that query the db.
const forecastScheduler = {
  plugin: {
    name: 'Forecast Scheduler',
    register: async (server) => {
      // Start the scheduler
      // await fetchAndSaveForecasts(server)
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
