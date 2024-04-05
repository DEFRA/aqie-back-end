import {
  forecastsController,
  historicalForecastsController
} from '~/src/api/forecast/controllers'

const forecasts = {
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
          ...historicalForecastsController
        }
      ])
    }
  }
}

export { forecasts, historicalForecasts }
