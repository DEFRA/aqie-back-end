import { vi, describe, test, expect } from 'vitest'

import { metOfficeForecastRead, metOfficeForecastList } from './index.js'

vi.mock('./controllers/index.js', () => ({
  metOfficeForecastReadController: { handler: vi.fn() },
  metOfficeForecastListController: { handler: vi.fn() }
}))

describe('metOfficeForecast plugins', () => {
  describe('metOfficeForecastRead', () => {
    test('plugin has correct name', () => {
      expect(metOfficeForecastRead.plugin.name).toBe('metOfficeForecastRead')
    })

    test('registers a GET route for /sftp/file/{filename}', async () => {
      const mockServer = { route: vi.fn() }

      await metOfficeForecastRead.plugin.register(mockServer)

      expect(mockServer.route).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'GET',
          path: '/sftp/file/{filename}'
        })
      )
    })
  })

  describe('metOfficeForecastList', () => {
    test('plugin has correct name', () => {
      expect(metOfficeForecastList.plugin.name).toBe('metOfficeForecastList')
    })

    test('registers a GET route for /sftp/files', async () => {
      const mockServer = { route: vi.fn() }

      await metOfficeForecastList.plugin.register(mockServer)

      expect(mockServer.route).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ method: 'GET', path: '/sftp/files' })
        ])
      )
    })
  })
})
