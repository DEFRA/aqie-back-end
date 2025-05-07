import { ProxyAgent } from 'undici'
import SFTPClient from 'ssh2-sftp-client'
import { config } from '~/src/config' // Adjust import path
import { Buffer } from 'buffer'
import { createLogger } from '~/src/helpers/logging/logger.js' // Adjust import path
// import { URL } from 'url'

const logger = createLogger()

export async function connectSftpViaProxyAgent() {
  const sftp = new SFTPClient()
  const proxyUrl = config.get('httpProxy') // This should map to HTTP_PROXY env var
  //   const proxyHost = new URL(config.get('httpProxy')).hostname;
  //   const proxyPort = parseInt(new URL(config.get('httpProxy')).port || '80');

  const sftpHost = 'sftp22.sftp-server-gov-uk.quatrix.it'
  const sftpPort = 22

  if (!proxyUrl) {
    throw new Error('No proxy configured in httpProxy config value.')
  }

  logger.info(`Connecting to ${sftpHost}:${sftpPort} via proxy ${proxyUrl}`)

  const proxyAgent = new ProxyAgent(proxyUrl)

  logger.info(`new proxy agent`)
  // 1. Create CONNECT tunnel to SFTP server via Squid
  //   const { socket } = await proxyAgent.connect({
  //     origin: `http://${sftpHost}:${sftpPort}`
  //   });
  const { socket } = await proxyAgent.connect({
    host: sftpHost,
    port: sftpPort
  })
  logger.info(`socket :: ${socket}`)

  // 2. Decode private key from base64 env variable
  const privateKey = Buffer.from(
    config.get('sftpPrivateKey'),
    'base64'
  ).toString('utf-8')
  // const privateKey = fs.readFileSync('C:/Users/486272/.ssh/met_office_rsa_v1')
  logger.info(`privateKey:: ${privateKey}`)
  const connectionConfig = {
    sock: socket, // pass the tunneled socket
    username: 'q2031671',
    privateKey
  }

  logger.info('Establishing SFTP connection over tunneled socket...')

  // 3. Connect via SFTP
  await sftp.connect(connectionConfig)

  logger.info('SFTP connection established successfully via proxy')
  return sftp
}
