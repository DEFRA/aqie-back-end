import { forecastsController } from '~/src/api/forecast/controllers'

const forecast = {
  plugin: {
    name: 'forecasts',
    register: async (server) => {
      server.route([
        {
          method: 'GET',
          path: '/forecasts',
          ...forecastsController
        }
      ])
    }
  }
}

const historicalForecasts = {
  plugin: {
    name: 'historicalForecasts',
    register: async (server) => {
      server.route([
        {
          method: 'GET',
          path: '/historicalForecasts',
          ...forecastsController
        }
      ])
    }
  }
}

export { forecast, historicalForecasts }
