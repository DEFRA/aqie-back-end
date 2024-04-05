/* eslint-disable prettier/prettier */
import {
  pollutantsController,
  historicalPollutantsController
} from '~/src/api/pollutants/controllers'

const measurements = {
  plugin: {
    name: 'measurements',
    register: async (server) => {
      server.route([
        {
          method: 'GET',
          path: '/measurements',
          ...pollutantsController
        }
      ])
    }
  }
}

const historicalMeasurements = {
  plugin: {
    name: 'historicalMeasurements',
    register: async (server) => {
      server.route([
        {
          method: 'GET',
          path: '/historicalMeasurements',
          ...historicalPollutantsController
        }
      ])
    }
  }
}

export { measurements, historicalMeasurements }
