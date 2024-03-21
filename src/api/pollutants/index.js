/* eslint-disable prettier/prettier */
import { pollutantsController } from '~/src/api/pollutants/controllers'

const pollutants = {
  plugin: {
    name: 'pollutants',
    register: async (server) => {
      server.route([
        {
          method: 'GET',
          path: '/pollutants',
          ...pollutantsController
        }
      ])
    }
  }
}

export { pollutants }
