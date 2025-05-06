// import SFTPClient from 'ssh2-sftp-client'
import { Client } from 'ssh2'
// import { ProxyAgent } from 'undici'
import { config } from '~/src/config'
import { Buffer } from 'buffer'
import { createLogger } from '~/src/helpers/logging/logger.js'
// import fs from 'fs'
// import { HttpsProxyAgent } from 'https-proxy-agent'
import tunnel from 'tunnel'
import { URL } from 'url'

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
  return new Promise((resolve, reject) => {
    try {
      const proxyHost = new URL(config.get('httpProxy')).hostname
      const proxyPort = parseInt(new URL(config.get('httpProxy')).port || '80')
      const sftpHost = 'sftp22.sftp-server-gov-uk.quatrix.it'
      const sftpPort = 22
      logger.info(`[Proxy Debug] Using proxy ${proxyHost}:${proxyPort}`)
      logger.info(
        `[Proxy Debug] Attempting to create tunnel to ${sftpHost}:${sftpPort}`
      )
      const tunneler = tunnel.httpsOverHttp({
        proxy: {
          host: proxyHost,
          port: proxyPort
        }
      })
      const timeout = setTimeout(() => {
        logger.error(
          '[Tunnel Timeout] SFTP proxy connection timed out after 30s'
        )
        reject(new Error('Tunnel connection timed out'))
      }, 30000) // 30 seconds

      tunneler.createSocket(
        { host: sftpHost, port: sftpPort },
        (err, socket) => {
          clearTimeout(timeout) // clear on success/error
          if (err) {
            logger.error(`'[Tunnel Error]', ${err}`)
            return reject(err)
          }

          logger.info('[Tunnel] Socket created, starting SSH connection...')

          const privateKeyBase64 = config.get('sftpPrivateKey')
          const privateKey = Buffer.from(privateKeyBase64, 'base64').toString(
            'utf-8'
          )

          const conn = new Client()

          conn
            .on('ready', () => {
              logger.info('[SSH] Connection ready, initializing SFTP...')
              conn.sftp((err, sftp) => {
                if (err) {
                  logger.error(`'[SFTP Error]', ${err}`)
                  return reject(err)
                }
                logger.info('[SFTP] SFTP session established.')
                resolve({ sftp, conn })
              })
            })
            .on('error', (err) => {
              logger.error(`'[SSH Error]', ${err}`)
              reject(err)
            })
            .on('close', () => {
              logger.info(`'[SSH] Connection closed'`)
            })
            .connect({
              sock: socket,
              username: 'q2031671',
              privateKey
            })
        }
      )
    } catch (e) {
      logger.error(`'[Fatal Error]' , ${e}`)
      reject(e)
    }
  })
}
