import SFTPClient from 'ssh2-sftp-client'
import { config } from '~/src/config/index'

const metOfficeForecastReadController = {
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

    const { filename } = request.params
    console.log(`filename:: ${filename}`)
    const remoteDir = '/Incoming Shares/AQIE/MetOffice/'

    try {
      await sftp.connect(configuration)

      const fileList = await sftp.list(remoteDir)
      console.log(
        'Files in directory:',
        fileList.map((f) => f.name)
      )
      // Filter file by exact name
      const match = fileList.find((files) => files.name === filename)
      console.log('Match found:', match)

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
      console.error('Error reading file:', err)
      return h.response({ success: false, error: err.message }).code(500)
    }
  }
}

export { metOfficeForecastReadController }
