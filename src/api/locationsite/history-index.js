import { monitoringStationHistoryController } from './history-controller.js'

const monitoringStationHistory = {
  plugin: {
    name: 'monitoringStationHistory',
    register: async (server) => {
      server.route({
        method: 'GET',
        path: '/monitoringStationHistory',
        ...monitoringStationHistoryController
      })
    }
  }
}

export { monitoringStationHistory }
