import SFTPClient from 'ssh2-sftp-client'
import { config } from '~/src/config/index'

const metOfficeForecastListController = {
  handler: async (request, h) => {
    const allowOriginUrl = config.get('allowOriginUrl')
    const sftp = new SFTPClient()
    const configuration = {
      host: 'sftp22.sftp-defra-gov-uk.quatrix.it',
      port: 22,
      username: 'q2031671',
      privateKey: config.get('sftpPrivateKey')
      // If key has a passphrase:
      // passphrase: 'passphrase',
    }
    try {
      await sftp.connect(configuration)

      const remoteDir = '/Incoming Shares/AQIE/MetOffice/'
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
      console.error('Error listing file:', err)
      return h.response({ success: false, error: err.message }).code(500)
    }
  }
}

export { metOfficeForecastListController }
