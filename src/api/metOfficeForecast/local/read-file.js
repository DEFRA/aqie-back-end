import hapi from '@hapi/hapi'
import SFTPClient from 'ssh2-sftp-client'
import fs from 'fs'

const init = async () => {
  const server = hapi.server({
    port: 3002,
    host: 'localhost'
  })

  // Route to test SFTP connection and list files
  server.route({
    method: 'GET',
    path: '/sftp/files/{filename}',
    handler: async (request, h) => {
      const sftp = new SFTPClient()

      const config = {
        host: 'sftp22.sftp-defra-gov-uk.quatrix.it',
        port: 22,
        username: 'q2031671',
        privateKey: fs.readFileSync('C:/Users/486272/.ssh/met_office_rsa_v1')
        // If your key has a passphrase:
        // passphrase: 'your_passphrase',
      }

      /**
       * filename xml = MetOfficeDefraAQSites_20250504.xml
       * filename gunzip = 202505051800_u1096_ng_aqum_dafc.nc.gz
       * filename text = "EMARC_AirQualityForecast_2025-05-26-0443.TXT"
       */
      const { filename } = request.params
      console.log(`filename:: ${filename}`)
      const remoteDir = '/Incoming Shares/AQIE/MetOffice/'

      try {
        await sftp.connect(config)

        const fileList = await sftp.list(remoteDir)
        console.log(
          '📂 Files in directory:',
          fileList.map((f) => f.name)
        )
        // Filter file by exact name
        const match = fileList.find((files) => files.name === filename)
        console.log('🔍 Match found:', match)

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

        return h.response(fileBuffer.toString()).type('text/plain') // or 'text/xml'
      } catch (err) {
        console.error('Error reading file:', err)
        return h.response({ success: false, error: err.message }).code(500)
      }
    }
  })

  await server.start()
  console.log('Server running on %s', server.info.uri)
}

process.on('unhandledRejection', (err) => {
  console.error(err)
  process.exit(1)
})

init()
