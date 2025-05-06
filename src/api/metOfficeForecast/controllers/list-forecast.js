/* eslint-disable prettier/prettier */
import { config } from '~/src/config'
import { createLogger } from '~/src/helpers/logging/logger.js'
import { connectSftpThroughProxy } from '~/src/api/metOfficeForecast/controllers/connectSftpViaProxy.js'

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
      const {sftp, conn} = await connectSftpThroughProxy()
      logger.info('After Connection')
      const fileList = await new Promise((resolve, reject) => {
        sftp.readdir(remoteDir, (err, list) => {
          if (err) return reject(err);
            resolve(list.map(file => file.filename));
        });
      });
 
      conn.end();

      return h
        .response({
          success: true,
          files: fileList
        })
        .code(200)
        .header('Access-Control-Allow-Origin', allowOriginUrl)
    } catch (error) {
      logger.error(`Error listing file: ${error.message}`)
      logger.error(`'Error listing file:' ${error}`)
      logger.error(`'Error listing file:' ${JSON.stringify(error)}`)
      return h.response({ success: false, error: error.message }).code(500)
    }
  }
}

export { metOfficeForecastListController }
