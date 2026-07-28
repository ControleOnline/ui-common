const {describe, expect, it} = global

const {resolveAppDomain} = require('../../../utils/appDomain')

describe('resolveAppDomain', () => {
  it('ignores invalid configured domain values and uses the runtime host', () => {
    const previousLocation = Object.getOwnPropertyDescriptor(global, 'location')

    try {
      Object.defineProperty(global, 'location', {
        configurable: true,
        value: {host: 'erp.jaguncos.com.br'},
      })

      expect(resolveAppDomain('undefined')).toBe('erp.jaguncos.com.br')
      expect(resolveAppDomain('null')).toBe('erp.jaguncos.com.br')
      expect(resolveAppDomain('false')).toBe('erp.jaguncos.com.br')
    } finally {
      if (previousLocation) {
        Object.defineProperty(global, 'location', previousLocation)
      }
    }
  })
})
