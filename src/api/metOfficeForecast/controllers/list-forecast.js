import { config } from '../../../config/index.js'
import { createLogger } from '../../../helpers/logging/logger.js'
import { connectSftpThroughProxy } from './connectSftpViaProxy.js'

const logger = createLogger()

const metOfficeForecastListController = {
  handler: async (request, h) => {
    const allowOriginUrl = config.get('allowOriginUrl')
    // const sftp = new SFTPClient()
    // const privateKeyBase64 = config.get('sftpPrivateKey')
    // // Decode it
    // const decodedPrivateKey = Buffer.from(privateKeyBase64, 'base64').toString(
    //   'utf-8'
    // )
    // const configuration = {
    //   host: 'sftp22.sftp-defra-gov-uk.quatrix.it',
    //   port: 22,
    //   username: 'q2031671',
    //   privateKey: decodedPrivateKey
    //   // If key has a passphrase:
    //   // passphrase: 'passphrase',
    // }
    try {
      logger.info('Before Connection')
      const remoteDir = '/Incoming Shares/AQIE/MetOffice/'
      logger.info(`Remote directory: ${remoteDir}`)
      // Ensure remoteDir is a valid string
      if (typeof remoteDir !== 'string' || remoteDir.trim() === '') {
        throw new Error('Invalid remote directory path')
      }
      const { sftp, conn } = await connectSftpThroughProxy()
      logger.info('After Connection')

      const files = await new Promise((resolve, reject) => {
        sftp.readdir(remoteDir, (err, list) => {
          if (err) return reject(err)
          resolve(list.map((file) => file.filename))
        })
      })

      await conn.end()

      return h
        .response({
          success: true,
          files
        })
        .code(200)
        .header('Access-Control-Allow-Origin', allowOriginUrl)
    } catch (error) {
      logger.error(`Error Message listing file: ${error.message}`)
      logger.error(`'Error listing file:' ${error}`)
      logger.error(`'JSON Error listing file:' ${JSON.stringify(error)}`)
      return h.response({ success: false, error }).code(500)
    }
  }
}

export { metOfficeForecastListController }
