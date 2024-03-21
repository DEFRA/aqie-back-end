import { health } from '~/src/api/health'
import { example } from '~/src/api/example'
import { forecast } from '~/src/api/forecast'
import { pollutants } from '~/src/api/pollutants'

const router = {
  plugin: {
    name: 'Router',
    register: async (server) => {
      await server.register([health, example, forecast, pollutants])
    }
  }
}

export { router }
