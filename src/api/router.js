import { forecasts, historicalForecasts } from '~/src/api/forecast'
import { measurements, historicalMeasurements } from '~/src/api/pollutants'

const router = {
  plugin: {
    name: 'Router',
    register: async (server) => {
      await server.register([
        forecasts,
        historicalForecasts,
        measurements,
        historicalMeasurements
      ])
    }
  }
}

export { router }
