/* eslint-disable prettier/prettier */
import { pollutantsController } from '~/src/api/pollutants/controllers'

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
