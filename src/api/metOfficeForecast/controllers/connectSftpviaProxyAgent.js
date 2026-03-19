import { proxyFetch } from '../../../helpers/proxy-fetch.js'
import SFTPClient from 'ssh2-sftp-client'
import { config } from '../../../config/index.js'
import { Buffer } from 'node:buffer'
import { createLogger } from '../../../helpers/logging/logger.js'

const logger = createLogger()

export async function connectSftpViaProxyAgent() {
  const sftp = new SFTPClient()
  const proxyUrl = config.get('httpProxy')

  const sftpHost = 'sftp22.sftp-defra-gov-uk.quatrix.it'
  const sftpPort = 22

  if (!proxyUrl) {
    throw new Error('No proxy configured in httpProxy config value.')
  }

  logger.info(`Connecting to ${sftpHost}:${sftpPort} via proxy ${proxyUrl}`)
  try {
    const response = await proxyFetch(`${proxyUrl}`, {
      method: 'CONNECT',
      headers: {
        Host: `${sftpHost}:${sftpPort}`
      }
    })
    const socket = response.socket

    logger.info(`Socket created: ${socket}`)

    const privateKeyBase64 = config.get('sftpPrivateKey')
    const privateKeyDecoded = Buffer.from(privateKeyBase64, 'base64').toString(
      'utf-8'
    )
    logger.info(`Private key decoded`)
    const connectionConfig = {
      sock: socket,
      username: 'q2031671',
      privateKey: privateKeyDecoded
    }

    logger.info('Establishing SFTP connection over tunneled socket...')

    await sftp.connect(connectionConfig)

    logger.info('SFTP connection established successfully via proxy')
    return { sftp, conn: sftp }
  } catch (error) {
    logger.error(
      `Failed to create socket or establish SFTP connection: ${error}`
    )
    throw error
  }
}
