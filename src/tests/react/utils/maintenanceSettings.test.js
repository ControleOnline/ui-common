const {jest} = require('@jest/globals')

const {
  MAINTENANCE_ROUTINE_ITEMS,
  normalizeMaintenanceRoutines,
} = require('../../../react/utils/maintenanceSettings')

const {describe, expect, it, beforeEach} = global

describe('maintenanceSettings', () => {
  beforeEach(() => {
    global.t = {
      t: jest.fn((store, type, key) => `${store}:${type}:${key}`),
    }
  })

  it('resolves customer-facing labels through the translation helper', () => {
    const cleanupLogsRoutine = MAINTENANCE_ROUTINE_ITEMS.find(
      item => item.key === 'cleanup_logs',
    )
    const overdueOpportunitiesRoutine = MAINTENANCE_ROUTINE_ITEMS.find(
      item => item.key === 'open_overdue_opportunities',
    )

    expect(cleanupLogsRoutine.title).toBe('configs:label:cleanup_logs')
    expect(cleanupLogsRoutine.description).toBe(
      'configs:message:cleanup_logs_description',
    )
    expect(overdueOpportunitiesRoutine.title).toBe(
      'configs:label:open_overdue_opportunities',
    )
    expect(overdueOpportunitiesRoutine.description).toBe(
      'configs:message:open_overdue_opportunities_description',
    )
  })

  it('keeps the new routine enabled with the default cron expression', () => {
    const normalized = normalizeMaintenanceRoutines({})

    expect(normalized.open_overdue_opportunities).toEqual({
      enabled: true,
      cronExpression: '* * * * *',
    })
  })
})
