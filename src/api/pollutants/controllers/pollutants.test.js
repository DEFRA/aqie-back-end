import { vi, describe, test, expect } from 'vitest'

import { pollutantsController } from './pollutants.js'
import { getPollutants } from '../helpers/get-pollutants.js'

vi.mock('../helpers/get-pollutants.js', () => ({
  getPollutants: vi.fn().mockResolvedValue([{ name: 'Site A', pollutants: {} }])
}))

vi.mock('../../../config/index.js', () => ({
  config: { get: vi.fn().mockReturnValue('http://localhost:3000') }
}))

describe('pollutantsController', () => {
  const mockH = {
    response: vi.fn().mockReturnThis(),
    code: vi.fn().mockReturnThis(),
    header: vi.fn().mockReturnThis()
  }

  test('returns measurements with 200 status and CORS header', async () => {
    const mockRequest = { db: {} }

    await pollutantsController.handler(mockRequest, mockH)

    expect(mockH.response).toHaveBeenCalledWith({
      message: 'success',
      measurements: [{ name: 'Site A', pollutants: {} }]
    })
    expect(mockH.code).toHaveBeenCalledWith(200)
    expect(mockH.header).toHaveBeenCalledWith(
      'Access-Control-Allow-Origin',
      'http://localhost:3000'
    )
  })

  test('calls getPollutants with the request db', async () => {
    const mockDb = { collection: vi.fn() }
    const mockRequest = { db: mockDb }

    await pollutantsController.handler(mockRequest, mockH)

    expect(getPollutants).toHaveBeenCalledWith(mockDb)
  })
})
