/* global describe, it, expect */

const {
  forgetTrackedSpool,
  getTrackedSpoolKey,
  hasTrackedSpool,
  pruneTrackedSpools,
  rememberTrackedSpool,
} = require('../../../react/utils/spoolAckTracker')

describe('spoolAckTracker', () => {
  it('normalizes spool ids before tracking them', () => {
    expect(getTrackedSpoolKey('/spools/123')).toBe('123')
    expect(getTrackedSpoolKey(' spool-456 ')).toBe('456')
    expect(getTrackedSpoolKey(null)).toBe('')
  })

  it('tracks and forgets printed spools by normalized id', () => {
    const registry = new Map()

    rememberTrackedSpool(registry, '/spools/77', {printedAt: 123})

    expect(hasTrackedSpool(registry, 77)).toBe(true)
    expect(registry.get('77')).toEqual({printedAt: 123})

    forgetTrackedSpool(registry, '77')

    expect(hasTrackedSpool(registry, '/spools/77')).toBe(false)
  })

  it('prunes spools that are no longer open', () => {
    const registry = new Map()

    rememberTrackedSpool(registry, 10, {printedAt: 1})
    rememberTrackedSpool(registry, 20, {printedAt: 2})
    pruneTrackedSpools(registry, ['/spools/20', '/spools/30'])

    expect(Array.from(registry.keys())).toEqual(['20'])
  })
})
