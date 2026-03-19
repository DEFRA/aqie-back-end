import tunnel from 'tunnel'
import { Client } from 'ssh2'
import { config } from '../../../config/index.js'
import { createLogger } from '../../../helpers/logging/logger.js'

const logger = createLogger()

function openSftpSession(conn, resolve, reject) {
  return (sftpErr, sftp) => {
    if (sftpErr) {
      logger.error('[SFTP Error]', sftpErr)
      reject(sftpErr)
      return
    }
    logger.info('[SFTP] Connection established')
    resolve({ sftp, conn })
  }
}

export async function connectSftpViaProxyTunnel() {
  const proxyUrl = config.get('httpProxy') // Must be http://proxy.dev.cdp-int.defra.cloud:80
  const sftpHost = 'sftp22.sftp-server-gov-uk.quatrix.it'
  const sftpPort = 22

  const proxyHost = new URL(proxyUrl).hostname
  const proxyPort = Number.parseInt(new URL(proxyUrl).port || '80', 10)

  logger.info(
    `[Proxy] Connecting to ${sftpHost}:${sftpPort} via ${proxyHost}:${proxyPort}`
  )

  const agent = tunnel.httpsOverHttp({
    proxy: {
      host: proxyHost,
      port: proxyPort
    }
  })

  return new Promise((resolve, reject) => {
    // Create CONNECT tunnel to SFTP server via Squid
    agent.createSocket({ host: sftpHost, port: sftpPort }, (err, socket) => {
      if (err) {
        logger.error('[Tunnel Error]', err)
        reject(new Error('Failed to create tunnel socket'))
        return
      }
      const privateKey = Buffer.from(
        config.get('sftpPrivateKey'),
        'base64'
      ).toString('utf-8')

      const conn = new Client()

      conn
        .on('ready', () => {
          logger.info('[SSH] Ready. Opening SFTP...')
          conn.sftp(openSftpSession(conn, resolve, reject))
        })
        .on('error', reject)
        .connect({
          sock: socket,
          username: 'q2031671',
          privateKey
        })
    })
  })
}
