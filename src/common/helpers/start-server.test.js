import hapi from '@hapi/hapi'

// Suppress unhandled MongoDB shutdown errors in Vitest
process.on('unhandledRejection', (reason) => {
  if (
    reason &&
    reason.codeName === 'InterruptedAtShutdown' &&
    reason.errmsg === 'interrupted at shutdown'
  ) {
    // Suppress this known error
    return
  }
  // Otherwise, throw so Vitest can report
  throw reason
})

const mockLoggerInfo = vi.fn()
const mockLoggerError = vi.fn()

const mockHapiLoggerInfo = vi.fn()
const mockHapiLoggerError = vi.fn()

vi.mock('hapi-pino', () => ({
  default: {
    register: (server) => {
      server.decorate('server', 'logger', {
        info: mockHapiLoggerInfo,
        error: mockHapiLoggerError
      })
    },
    name: 'mock-hapi-pino'
  }
}))
vi.mock('./logging/logger.js', () => ({
  createLogger: () => ({
    info: (...args) => mockLoggerInfo(...args),
    error: (...args) => mockLoggerError(...args)
  })
}))

describe('#startServer', () => {
  const PROCESS_ENV = process.env
  let createServerSpy
  let hapiServerSpy
  let startServerImport
  let createServerImport

  beforeAll(async () => {
    process.env = { ...PROCESS_ENV }
    process.env.PORT = '3098' // Set to obscure port to avoid conflicts

    createServerImport = await import('../../api/server.js')
    startServerImport = await import('./start-server.js')

    createServerSpy = vi.spyOn(createServerImport, 'createServer')
    hapiServerSpy = vi.spyOn(hapi, 'server')
  })

  afterAll(() => {
    process.env = PROCESS_ENV
  })

  describe('When server starts', () => {
    let server

    afterAll(async () => {
      await server.stop({ timeout: 0 })
    })

    test('Should start up server as expected', async () => {
      server = await startServerImport.startServer()

      expect(createServerSpy).toHaveBeenCalled()
      expect(hapiServerSpy).toHaveBeenCalled()
      expect(mockHapiLoggerInfo).toHaveBeenNthCalledWith(
        1,
        'Setting up mongodb'
      )
      expect(mockHapiLoggerInfo).toHaveBeenNthCalledWith(
        2,
        'mongodb connected to aqie-back-end'
      )
      expect(mockHapiLoggerInfo).toHaveBeenNthCalledWith(
        3,
        'Server started successfully'
      )
      expect(mockHapiLoggerInfo).toHaveBeenNthCalledWith(
        4,
        'Access your backend on http://localhost:3098'
      )
    })
  })

  describe('When server start fails', () => {
    beforeAll(() => {
      createServerSpy.mockRejectedValue(new Error('Server failed to start'))
    })

    test('Should log failed startup message', async () => {
      await startServerImport.startServer()

      expect(mockLoggerInfo).toHaveBeenCalledWith('Server failed to start :(')
      expect(mockLoggerError).toHaveBeenCalledWith(
        Error('Server failed to start')
      )
    })
  })
})
