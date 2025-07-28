import { siteController } from './controller.js'

const monitoringStationInfo = {
  plugin: {
    name: 'site',
    register: async (server) => {
      server.route({
        method: 'GET',
        path: '/monitoringStationInfo',
        ...siteController
      })
    }
  }
}

export { monitoringStationInfo }
