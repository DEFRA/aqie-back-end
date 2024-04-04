import { forecast, historicalForecasts } from '~/src/api/forecast'
import { measurements, historicalMeasurements } from '~/src/api/pollutants'

const router = {
  plugin: {
    name: 'Router',
    register: async (server) => {
      await server.register([
        forecast,
        historicalForecasts,
        measurements,
        historicalMeasurements
      ])
    }
  }
}

export { router }
