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

export { forecast }
