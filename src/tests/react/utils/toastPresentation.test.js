const {describe, expect, it} = global

const {
  TOAST_ERROR_STYLES,
  TOAST_WARNING_STYLES,
  mergeToastStyles,
  withErrorToastStyles,
  withWarningToastStyles,
} = require('../../../react/utils/toastPresentation')

describe('toastPresentation', () => {
  it('keeps the shared error toast on a light, high-contrast panel', () => {
    expect(TOAST_ERROR_STYLES.pressable).toMatchObject({
      backgroundColor: '#FFF7F7',
      borderColor: '#FECACA',
      borderWidth: 1,
    })
    expect(TOAST_ERROR_STYLES.indicator).toMatchObject({
      backgroundColor: '#DC2626',
    })
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

  it('decorates error and warning toast options with the shared styles', () => {
    expect(withErrorToastStyles({styles: {pressable: {paddingHorizontal: 8}}})).toEqual({
      styles: {
        pressable: {
          backgroundColor: '#FFF7F7',
          borderColor: '#FECACA',
          borderWidth: 1,
          paddingHorizontal: 8,
        },
        indicator: {
          backgroundColor: '#DC2626',
        },
      },
    })

    expect(withWarningToastStyles({styles: {text: {fontWeight: '700'}}})).toEqual({
      styles: {
        indicator: {
          backgroundColor: TOAST_WARNING_STYLES.indicator.backgroundColor,
        },
        text: {
          fontWeight: '700',
        },
      },
    })
  })
})
