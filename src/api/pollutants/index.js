import { pollutantsController } from './controllers/index.js'

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

export { measurements }
