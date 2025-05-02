import SFTPClient from 'ssh2-sftp-client'
import { ProxyAgent } from 'undici'
import { config } from '../../config/index.js'
import { Buffer } from 'buffer'
import { createLogger } from '../helpers/logging/logger.js'

const logger = createLogger()

export async function connectSftpThroughProxy() {
  const sftp = new SFTPClient()
  const proxyUrl = config.get('httpsProxy') // This should map to HTTP_PROXY env var
  logger.info('PROXY URL - ', proxyUrl)
  const sftpHost = 'sftp22.sftp-server-gov-uk.quatrix.it'
  const sftpPort = 22

  if (!proxyUrl) {
    throw new Error('No proxy configured in httpProxy config value.')
  }

  logger.info(`Connecting to ${sftpHost}:${sftpPort} via proxy ${proxyUrl}`)

  const proxyAgent = new ProxyAgent(proxyUrl)

  // 1. Create CONNECT tunnel to SFTP server via Squid
  const { socket } = await proxyAgent.connect({
    origin: `https://${sftpHost}:${sftpPort}`
  })
  logger.info(`SOCKET - ${socket}`)
  // 2. Decode private key from base64 env variable
  const privateKey = Buffer.from(
    config.get('sftpPrivateKey'),
    'base64'
  ).toString('utf-8')

  const connectionConfig = {
    sock: socket, // pass the tunneled socket
    username: 'q2031671',
    privateKey: privateKey
  }

  logger.info('Establishing SFTP connection over tunneled socket...')

  // 3. Connect via SFTP
  await sftp.connect(connectionConfig)

  logger.info('SFTP connection established successfully via proxy')
  return sftp
}
