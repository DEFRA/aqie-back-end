import { config } from '../../../config/index.js'
import { createLogger } from '../../../helpers/logging/logger.js'
import { connectSftpThroughProxy } from './connectSftpViaProxy.js'
import {
  HTTP_OK,
  HTTP_INTERNAL_SERVER_ERROR
} from '../../pollutants/helpers/common/constants.js'

const logger = createLogger()

const metOfficeForecastListController = {
  handler: async (_request, h) => {
    const allowOriginUrl = config.get('allowOriginUrl')
    try {
      logger.info('Before Connection')
      const remoteDir = '/Incoming Shares/AQIE/MetOffice/'
      logger.info(`Remote directory: ${remoteDir}`)
      if (typeof remoteDir !== 'string' || remoteDir.trim() === '') {
        throw new Error('Invalid remote directory path')
      }
      const { sftp, conn } = await connectSftpThroughProxy()
      logger.info('After Connection')

      const files = await new Promise((resolve, reject) => {
        sftp.readdir(remoteDir, (err, list) => {
          if (err) {
            reject(err)
            return
          }
          resolve(list.map((file) => file.filename))
        })
      })

      await conn.end()

      return h
        .response({
          success: true,
          files
        })
        .code(HTTP_OK)
        .header('Access-Control-Allow-Origin', allowOriginUrl)
    } catch (error) {
      logger.error(`Error Message listing file: ${error.message}`)
      logger.error(`'Error listing file:' ${error}`)
      logger.error(`'JSON Error listing file:' ${JSON.stringify(error)}`)
      return h
        .response({ success: false, error })
        .code(HTTP_INTERNAL_SERVER_ERROR)
    }
  }
}

export { metOfficeForecastListController }
