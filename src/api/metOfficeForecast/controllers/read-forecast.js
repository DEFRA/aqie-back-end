/* eslint-disable prettier/prettier */
import { config } from '~/src/config/index'
import { createLogger } from '~/src/helpers/logging/logger.js'
import connectSftpThroughProxy from '~/src/api/metOfficeForecast/controllers/connectSftpViaProxy.js'

const logger = createLogger()

const metOfficeForecastReadController = {
  handler: async (request, h) => {
    const allowOriginUrl = config.get('allowOriginUrl')
    // const sftp = new SFTPClient()
    // const privateKeyBase64 = config.get('sftpPrivateKey')
    // // Decode the private key
    // const decodedPrivateKey = Buffer.from(privateKeyBase64, 'base64').toString(
    //   'utf-8'
    // )
    // const configuration = {
    //   host: 'sftp22.sftp-defra-gov-uk.quatrix.it',
    //   port: 22,
    //   username: 'q2031671',
    //   privateKey: decodedPrivateKey
    // }

    const { filename } = request.params
    logger.info(`filename:: ${filename}`)
    const remoteDir = '/Incoming Shares/AQIE/MetOffice/'

    try {
      logger.info('Before Connection')
      const sftp = await connectSftpThroughProxy()
      logger.info('After Connection')
      const fileList = await sftp.list(remoteDir)
      logger.info(
        'Files in directory:',
        fileList.map((f) => f.name)
      )
      // Filter file by exact name
      const match = fileList.find((files) => files.name === filename)
      logger.info('Match found:', match)

      if (!match) {
        await sftp.end()
        return h
          .response({
            success: false,
            message: `File ${filename} not found`
          })
          .code(404)
      }
      // If found, get the file content Download file content into buffer
      const fileBuffer = await sftp.get(`${remoteDir}${filename}`)
      await sftp.end()

      return h
        .response(fileBuffer.toString())
        .type('application/xml') // or 'text/xml'
        .code(200)
        .header('Access-Control-Allow-Origin', allowOriginUrl)
    } catch (err) {
      logger.error('Error reading file:', err)
      return h.response({ success: false, error: err.message }).code(500)
    }
  }
}

export { metOfficeForecastReadController }
