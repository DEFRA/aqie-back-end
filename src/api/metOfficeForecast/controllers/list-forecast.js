/* eslint-disable prettier/prettier */
import { config } from '~/src/config/index'
import { createLogger } from '~/src/helpers/logging/logger.js'
import connectSftpThroughProxy from '~/src/api/metOfficeForecast/controllers/connectSftpViaProxy.js'

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
      const sftp = await connectSftpThroughProxy()
      logger.info('After Connection')
      const fileList = await sftp.list(remoteDir)
      await sftp.end()

      return h
        .response({
          success: true,
          files: fileList
        })
        .code(200)
        .header('Access-Control-Allow-Origin', allowOriginUrl)
    } catch (err) {
      logger.error('Error listing file:', err)
      return h.response({ success: false, error: err.message }).code(500)
    }
  }
}

export { metOfficeForecastListController }
