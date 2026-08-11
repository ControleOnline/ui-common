const {describe, expect, it} = global

const {resolveAppDomain} = require('../../../utils/appDomain')

describe('resolveAppDomain', () => {
  const withLocation = (host, fn) => {
    const previousLocation = Object.getOwnPropertyDescriptor(global, 'location')
    try {
      Object.defineProperty(global, 'location', {
        configurable: true,
        value: {host},
      })
      fn()
    } finally {
      if (previousLocation) {
        Object.defineProperty(global, 'location', previousLocation)
      } else {
        delete global.location
      }
    }
  }

  it('ignores invalid configured domain values and uses the runtime host', () => {
    withLocation('erp.exemplo.com.br', () => {
      expect(resolveAppDomain('undefined')).toBe('erp.exemplo.com.br')
      expect(resolveAppDomain('null')).toBe('erp.exemplo.com.br')
      expect(resolveAppDomain('false')).toBe('erp.exemplo.com.br')
    })
  })

  it('prefers window.location.host over configured DOMAIN (multi-tenant web)', () => {
    withLocation('erpjaguncos.com.br', () => {
      expect(resolveAppDomain('https://app.controleonline.com')).toBe(
        'erpjaguncos.com.br',
      )
      expect(resolveAppDomain('app.controleonline.com')).toBe(
        'erpjaguncos.com.br',
      )
    })
  })

  it('uses configured domain when there is no runtime location (native)', () => {
    const previousLocation = Object.getOwnPropertyDescriptor(global, 'location')
    try {
      Object.defineProperty(global, 'location', {
        configurable: true,
        value: undefined,
      })
      // resolveRuntimeHost returns '' when location is undefined
      expect(resolveAppDomain('https://app.controleonline.com')).toBe(
        'app.controleonline.com',
      )
      expect(resolveAppDomain('app.controleonline.com')).toBe(
        'app.controleonline.com',
      )
    } finally {
      if (previousLocation) {
        Object.defineProperty(global, 'location', previousLocation)
      }
    }
  })
})
