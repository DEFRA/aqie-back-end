import { createLogger } from '~/src/helpers/logging/logger'
import { schedule } from 'node-cron'
import { config } from '~/src/config'
import {
  fetchForecast,
  saveForecasts
} from '~/src/helpers/forecast/fetch-forecast'
const logger = createLogger()

// Populate the DB in this template on startup of the API.
// This is an example to show developers an API with a DB, with data in it and endpoints that query the db.
const forecastScheduler = {
  plugin: {
    name: 'Forecast Scheduler',
    register: async (server) => {
      // Pre-populate the data so we dont have to wait an hour
      await fetchAndSaveForecasts(server)

      // Start the scheduler
      logger.info('starting forecast Scheduler')
      schedule(config.get('forecastSchedule'), async () => {
        await fetchAndSaveForecasts(server)
      })
      logger.info('forecast Scheduler done!')
    }
  }
}

async function fetchAndSaveForecasts(server) {
  const forecasts = await fetchForecast()
  await saveForecasts(server, forecasts)
}

export { forecastScheduler }
