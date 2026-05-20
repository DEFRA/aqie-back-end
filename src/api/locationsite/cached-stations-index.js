import { cachedStationsController } from './cached-stations-controller.js'

const monitoringStations = {
  plugin: {
    name: 'monitoringStations',
    register: async (server) => {
      server.route({
        method: 'GET',
        path: '/monitoringStations',
        ...cachedStationsController
      })
    }
  }
}

export { monitoringStations }
