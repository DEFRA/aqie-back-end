import { forecastsController } from './controllers/index.js'

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

export { forecasts }
