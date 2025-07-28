import { proxyFetch } from '../../../helpers/proxy-fetch.js'
import SFTPClient from 'ssh2-sftp-client'
import { config } from '../../../config/index.js'
import { Buffer } from 'buffer'
import { createLogger } from '../../../helpers/logging/logger.js'
// import { URL } from 'url'
// import fs from 'fs';
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
    // 1. Create CONNECT tunnel to SFTP server via Squid
    const response = await proxyFetch(`${proxyUrl}`, {
      method: 'CONNECT',
      headers: {
        Host: `${sftpHost}:${sftpPort}`
      }
    })
    const socket = response.socket

    logger.info(`Socket created: ${socket}`)

    // 2. Read and Decode private key from base64 from the file
    const privateKeyBase64 = config.get('sftpPrivateKey')
    const privateKeyDecoded = Buffer.from(privateKeyBase64, 'base64').toString(
      'utf-8'
    )
    logger.info(`Private key decoded`)
    // const privateKeyBase64 = fs.readFileSync('C:/Users/486272/.ssh/private_key_base64', 'utf-8');
    const connectionConfig = {
      sock: socket, // pass the tunneled socket
      username: 'q2031671',
      privateKey: privateKeyDecoded
    }

    logger.info('Establishing SFTP connection over tunneled socket...')

    // 3. Connect via SFTP
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
