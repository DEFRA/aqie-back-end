import tls from 'node:tls'

import { getTrustStoreCerts } from './get-trust-store-certs.js'

const secureContext = {
  plugin: {
    name: 'secure-context',
    register: async (server) => {
      const originalCreateSecureContext = tls.createSecureContext

      tls.createSecureContext = (options = {}) => {
        const trustStoreCerts = getTrustStoreCerts(process.env)

        if (!trustStoreCerts.length) {
          server.logger.info('Could not find any TRUSTSTORE_ certificates')
        }

        const ctx = originalCreateSecureContext(options)

        trustStoreCerts.forEach((cert) => {
          ctx.context.addCACert(cert)
        })

        return ctx
      }

      server.decorate('server', 'secureContext', tls.createSecureContext())
    }
  }
}

export { secureContext }
