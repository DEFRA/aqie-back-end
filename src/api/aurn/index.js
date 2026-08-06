import { aurnDataController } from './controller.js'

const aurnData = {
  plugin: {
    name: 'aurnData',
    register: async (server) => {
      server.route({
        method: 'GET',
        path: '/aurnData',
        ...aurnDataController
      })
    }
  }
}

export { aurnData }
