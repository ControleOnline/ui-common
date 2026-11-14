const {describe, expect, it} = global

jest.mock('@store', () => ({
  getAllStores: () => ({theme: {getters: {colors: {negative: '#C10015', warning: '#F2C037'}}}}),
}), {virtual: true})

const {
  buildErrorToastStyles,
  buildWarningToastStyles,
  mergeToastStyles,
  withErrorToastStyles,
  withWarningToastStyles,
} = require('../../../react/utils/toastPresentation')

describe('toastPresentation', () => {
  it('derives toast accents from the theme negative/warning variables, no fixed RGB (#1484)', () => {
    expect(buildErrorToastStyles({negative: '#C10015'})).toEqual({
      pressable: {borderColor: '#C10015', borderWidth: 1},
      indicator: {backgroundColor: '#C10015'},
    })
    expect(buildWarningToastStyles({warning: '#F2C037'})).toEqual({
      indicator: {backgroundColor: '#F2C037'},
    })
    expect(buildErrorToastStyles({})).toEqual({})
    expect(buildWarningToastStyles({})).toEqual({})
  })

  it('merges toast style groups without dropping prior sections', () => {
    expect(
      mergeToastStyles(
        {
          pressable: {backgroundColor: '#FFFFFF'},
          indicator: {backgroundColor: '#000000'},
        },
        {
          pressable: {borderWidth: 2},
          text: {color: '#111827'},
        },
      ),
    ).toEqual({
      pressable: {
        backgroundColor: '#FFFFFF',
        borderWidth: 2,
      },
      indicator: {
        backgroundColor: '#000000',
      },
      text: {
        color: '#111827',
      },
    })
  })

  it('decorates error and warning toast options with theme-driven styles', () => {
    expect(withErrorToastStyles({styles: {pressable: {paddingHorizontal: 8}}})).toEqual({
      styles: {
        pressable: {
          borderColor: '#C10015',
          borderWidth: 1,
          paddingHorizontal: 8,
        },
        indicator: {
          backgroundColor: '#C10015',
        },
      },
    })

    expect(withWarningToastStyles({styles: {text: {fontWeight: '700'}}})).toEqual({
      styles: {
        indicator: {
          backgroundColor: '#F2C037',
        },
        text: {
          fontWeight: '700',
        },
      },
    })
  })
})
