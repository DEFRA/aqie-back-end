// import SFTPClient from 'ssh2-sftp-client'
import { Client } from 'ssh2'
// import { ProxyAgent } from 'undici'
import { config } from '~/src/config'
import { Buffer } from 'buffer'
import { createLogger } from '~/src/helpers/logging/logger.js'
// import fs from 'fs'
// import { HttpsProxyAgent } from 'https-proxy-agent'
// import tunnel from 'tunnel'
import { URL } from 'url'
import http from 'http'
import https from 'https'
const logger = createLogger()
/**
 * Creates an SFTP client via CDP proxy and returns a connected SFTP instance.
 */
// export async function connectSftpThroughProxy() {
//   const sftp = new SFTPClient()
//   const proxyUrl = config.get('httpsProxy') // This should map to HTTP_PROXY env var
//   logger.info(`PROXY URL - ${proxyUrl}`)
//   const sftpHost = 'sftp22.sftp-server-gov-uk.quatrix.it'
//   const sftpPort = 22

//   if (!proxyUrl) {
//     throw new Error('No proxy configured in httpProxy config value.')
//   }

//   logger.info(`Connecting to ${sftpHost}:${sftpPort} via proxy ${proxyUrl}`)

//   const proxyAgent = new ProxyAgent(proxyUrl)
//   // 1. Create CONNECT tunnel to SFTP server via Squid
//   const { socket } = await proxyAgent.connect({
//     origin: `${sftpHost}:${sftpPort}`
//   })
//   logger.info(`SOCKET - ${socket}`)
//   // 2. Decode private key from base64 env variable
//   const privateKey = Buffer.from(
//     fs.readFileSync('C:/Users/486272/.ssh/private_key_base64'),
//     'base64'
//   ).toString('utf-8')

//   console.log(`${privateKey}`)
//   const connectionConfig = {
//     sock: socket, // pass the tunneled socket
//     username: 'q2031671',
//     privateKey: privateKey
//   }

//   logger.info('Establishing SFTP connection over tunneled socket...')

//   // 3. Connect via SFTP
//   await sftp.connect(connectionConfig)

//   logger.info('SFTP connection established successfully via proxy')
//   return sftp
// }

export async function connectSftpThroughProxy() {
  const proxyUrl = new URL(config.get('httpProxyNew')) // http://proxy.dev.cdp-int.defra.cloud:80
  const proxyHost = proxyUrl.hostname
  const proxyPort =
    proxyUrl.port || (proxyUrl.protocol === 'https:' ? 3128 : 3128)
  logger.info(`port::: ${proxyPort}`)
  const sftpHost = 'sftp22.sftp-defra-gov-uk.quatrix.it'
  const sftpPort = 22

  logger.info(
    `[Proxy Debug] CONNECTING to ${sftpHost}:${sftpPort} via proxyurl ${proxyUrl} ${proxyHost}:${proxyPort}`
  )

  // const proxyUsername = config.get('squidProxyUsername')
  // const proxyPassword = config.get('squidProxyPassword')

  // const proxyAuthHeader =
  //   'Basic ' +
  //   Buffer.from(`${proxyUsername}:${proxyPassword}`).toString('base64')
  // logger.info(`PROXY AUTH: ${proxyAuthHeader}`)
  const proxyOptions = {
    host: proxyHost,
    port: proxyPort,
    method: 'CONNECT',
    path: `${sftpHost}:${sftpPort}`,
    headers: {
      Host: `${sftpHost}:${sftpPort}`
      // 'Proxy-Authorization': proxyAuthHeader
    },
    rejectUnauthorized: false // Disable certificate validation
    // servername: proxyHost // this ensures the TLS cert matches the expected domain
  }

  // const privateKey = fs.readFileSync('C:/Users/486272/.ssh/met_office_rsa_v1')
  const privateKeyBase64 = config.get('sftpPrivateKey')
  const privateKey = Buffer.from(privateKeyBase64, 'base64').toString('utf-8')

  const proxyModule = proxyUrl.protocol.startsWith('https') ? https : http
  logger.info(`proxyModule::: ${JSON.stringify(proxyModule)}`)

  return new Promise((resolve, reject) => {
    logger.info(`inside Promise`)
    logger.info(`privateKey:: ${privateKey}`)
    const req = proxyModule.request(proxyOptions)
    logger.info(`REQUEST:: ${JSON.stringify(req)}`)
    req.on('connect', (res, socket) => {
      logger.info(`SOCKET:: ${JSON.stringify(socket)}`)
      logger.info(`RESPONSE:: ${JSON.stringify(res)}`)
      if (res.statusCode !== 200) {
        return reject(
          new Error(`Proxy CONNECT failed: ${res} : ${res.statusCode}`)
        )
      }

      logger.info('[Proxy Debug] Tunnel established — starting SSH connection')

      const conn = new Client()
      conn
        .on('ready', () => {
          logger.info('SFTP connection established successfully via proxy')
          resolve({ sftp: conn.sftp(), conn })
        })
        .on('error', (err) => {
          logger.error(`Failed to establish SFTP connection: ${err}`)
          reject(err)
        })
        .connect({
          sock: socket,
          host: sftpHost,
          port: sftpPort,
          username: 'q2031671',
          privateKey
        })
    })
    req.on('error', (err) => {
      logger.error(
        `Failed to create socket or establish SFTP connection: ${JSON.stringify(err)}`
      )
      reject(err)
    })
    req.end()
  })
}
