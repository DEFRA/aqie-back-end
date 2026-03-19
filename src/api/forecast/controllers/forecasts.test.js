import { vi, describe, test, expect } from 'vitest'

import { forecastsController } from './forecasts.js'
import { getForecasts } from '../helpers/get-forecasts.js'

vi.mock('../helpers/get-forecasts.js', () => ({
  getForecasts: vi.fn().mockResolvedValue([{ name: 'Site A', forecast: [] }])
}))

vi.mock('../../../config/index.js', () => ({
  config: { get: vi.fn().mockReturnValue('http://localhost:3000') }
}))

describe('forecastsController', () => {
  const mockH = {
    response: vi.fn().mockReturnThis(),
    code: vi.fn().mockReturnThis(),
    header: vi.fn().mockReturnThis()
  }

  test('returns forecasts with 200 status and CORS header', async () => {
    const mockRequest = { db: {} }

    await forecastsController.handler(mockRequest, mockH)

    expect(mockH.response).toHaveBeenCalledWith({
      message: 'success',
      forecasts: [{ name: 'Site A', forecast: [] }]
    })
    expect(mockH.code).toHaveBeenCalledWith(200)
    expect(mockH.header).toHaveBeenCalledWith(
      'Access-Control-Allow-Origin',
      'http://localhost:3000'
    )
  })

  test('calls getForecasts with the request db', async () => {
    const mockDb = { collection: vi.fn() }
    const mockRequest = { db: mockDb }

    await forecastsController.handler(mockRequest, mockH)

    expect(getForecasts).toHaveBeenCalledWith(mockDb)
  })
})
