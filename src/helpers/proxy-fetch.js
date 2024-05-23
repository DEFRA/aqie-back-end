import { config } from '~/src/config'
import { ProxyAgent, fetch as undiciFetch } from 'undici'
import { createLogger } from '~/src/helpers/logging/logger'

const logger = createLogger()

const nonProxyFetch = (url, opts) => {
  return undiciFetch(url, {
    ...opts
  })
}

const proxyFetch = (url, opts) => {
  const httpsProxy = config.get('httpsProxy')
  if (!httpsProxy) {
    return nonProxyFetch(url, opts)
  } else {
    const startTime = Date.now()

    const res = undiciFetch(url, {
      ...opts,
      dispatcher: new ProxyAgent({
        uri: httpsProxy,
        keepAliveTimeout: 100,
        keepAliveMaxTimeout: 100
      })
    })
      .then((result) => {
        const endTime = Date.now()
        logger.info(
          `Call to ${url} completed ${endTime - startTime}ms - ${result.status}`
        )
        return result
      })
      .catch((error) => {
        const endTime = Date.now()
        logger.info(`Call to ${url} rejected ${endTime - startTime}ms` - error)
        throw error
      })

    return res
  }
}

export { proxyFetch }
