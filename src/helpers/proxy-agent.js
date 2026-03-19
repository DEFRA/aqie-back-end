import { config } from '../config/index.js'
import { HttpsProxyAgent } from 'https-proxy-agent'
import { URL } from 'node:url'

const proxyAgent = () => {
  const httpsProxy = config.get('httpsProxy')

  if (httpsProxy) {
    const proxyUrl = new URL(httpsProxy)
    return {
      url: proxyUrl,
      agent: new HttpsProxyAgent(proxyUrl)
    }
  }
  return null
}

export { proxyAgent }
