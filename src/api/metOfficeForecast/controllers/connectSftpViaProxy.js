import { Client } from 'ssh2'
import { config } from '../../../config/index.js'
import { Buffer } from 'node:buffer'
import { createLogger } from '../../../helpers/logging/logger.js'
import { URL } from 'node:url'
import http from 'node:http'
import https from 'node:https'
import {
  PROXY_PORT,
  HTTP_OK
} from '../../pollutants/helpers/common/constants.js'

const logger = createLogger()

function openSftpSession(conn, resolve, reject) {
  return (sftpErr, sftp) => {
    if (sftpErr) {
      logger.error(`Failed to initialize SFTP: ${JSON.stringify(sftpErr)}`)
      reject(sftpErr)
      return
    }
    resolve({ sftp, conn })
  }
}

export async function connectSftpThroughProxy() {
  const proxyUrl = new URL(config.get('httpProxyNew'))
  const proxyHost = proxyUrl.hostname
  const proxyPort = proxyUrl.port || PROXY_PORT
  logger.info(`port::: ${proxyPort}`)
  const sftpHost = 'sftp22.sftp-defra-gov-uk.quatrix.it'
  const sftpPort = 22

  logger.info(
    `[Proxy Debug] CONNECTING to ${sftpHost}:${sftpPort} via proxyurl ${proxyUrl} ${proxyHost}:${proxyPort}`
  )

  const proxyOptions = {
    host: proxyHost,
    port: proxyPort,
    method: 'CONNECT',
    path: `${sftpHost}:${sftpPort}`,
    headers: {
      Host: `${sftpHost}:${sftpPort}`
    }
  }

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
      if (res.statusCode !== HTTP_OK) {
        reject(
          new Error(
            `Proxy CONNECT failed: ${JSON.stringify(res)} : ${res.statusCode}`
          )
        )
        return
      }

      logger.info('[Proxy Debug] Tunnel established — starting SSH connection')

      const conn = new Client()
      conn
        .on('ready', () => {
          logger.info('SFTP connection established successfully via proxy')
          conn.sftp(openSftpSession(conn, resolve, reject))
        })
        .on('error', (err) => {
          logger.error(
            `Failed to establish SFTP connection: ${JSON.stringify(err)}`
          )
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
