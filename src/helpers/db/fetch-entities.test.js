import { describe, test, expect } from 'vitest'
import { fetchEntities } from './fetch-entities.js'

describe('fetchEntities', () => {
  test('returns an array of entities', async () => {
    const result = await fetchEntities()

    expect(Array.isArray(result)).toBe(true)
    expect(result.length).toBeGreaterThan(0)
  })

  test('each entity has required fields', async () => {
    const result = await fetchEntities()

    result.forEach((entity) => {
      expect(entity).toHaveProperty('entityId')
      expect(entity).toHaveProperty('name')
      expect(entity).toHaveProperty('description')
      expect(entity).toHaveProperty('condition')
      expect(entity).toHaveProperty('createdAt')
    })
  })

  test('returns Tractor and Bike entities', async () => {
    const result = await fetchEntities()

    const names = result.map((e) => e.name)
    expect(names).toContain('Tractor')
    expect(names).toContain('Bike')
  })
})
