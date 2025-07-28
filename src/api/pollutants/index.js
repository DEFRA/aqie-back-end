import {
  pollutantsController,
  historicalPollutantsController
} from './controllers/index.js'

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
