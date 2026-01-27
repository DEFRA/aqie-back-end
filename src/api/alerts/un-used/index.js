import { alertsController } from '~/src/api/alerts/alert-controller.js'

const alerts = {
  plugin: {
    name: 'alerts',
    register: async (server) => {
      server.route([
        {
          method: 'POST',
          path: '/register-alerts',
          ...alertsController
        }
      ])
    }
  }
}

export { alerts }
