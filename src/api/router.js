import { forecasts, historicalForecasts } from '~/src/api/forecast'
import { measurements, historicalMeasurements } from '~/src/api/pollutants'
import { health } from '~/src/api/health'

const router = {
  plugin: {
    name: 'Router',
    register: async (server) => {
      await server.register([
        forecasts,
        historicalForecasts,
        measurements,
        historicalMeasurements,
        health
      ])
    }
  }
}

export { router }
