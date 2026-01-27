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
    path: '/sftp/files',
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

      try {
        await sftp.connect(config)

        const remoteDir = '/Incoming Shares/AQIE/MetOffice/'
        const fileList = await sftp.list(remoteDir)

        await sftp.end()

        return h.response({
          success: true,
          files: fileList
        })
      } catch (err) {
        console.error('SFTP Connection Failed:', err)
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
