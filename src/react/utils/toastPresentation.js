const TOAST_STYLE_KEYS = ['pressable', 'view', 'text', 'indicator']

const isPlainObject = value =>
  value && typeof value === 'object' && !Array.isArray(value)

export const TOAST_ERROR_STYLES = {
  pressable: {
    backgroundColor: '#FFF7F7',
    borderColor: '#FECACA',
    borderWidth: 1,
  },
  indicator: {
    backgroundColor: '#DC2626',
  },
}

export const TOAST_WARNING_STYLES = {
  indicator: {
    backgroundColor: '#e67e22',
  },
}

export const mergeToastStyles = (...styleSets) =>
  styleSets.reduce((mergedStyles, currentStyleSet) => {
    if (!isPlainObject(currentStyleSet)) {
      return mergedStyles
    }

    TOAST_STYLE_KEYS.forEach(styleKey => {
      if (!isPlainObject(currentStyleSet[styleKey])) {
        return
      }

      mergedStyles[styleKey] = {
        ...(mergedStyles[styleKey] || {}),
        ...currentStyleSet[styleKey],
      }
    })

    return mergedStyles
  }, {})

export const withErrorToastStyles = (options = {}) => ({
  ...options,
  styles: mergeToastStyles(TOAST_ERROR_STYLES, options?.styles),
})

export const withWarningToastStyles = (options = {}) => ({
  ...options,
  styles: mergeToastStyles(TOAST_WARNING_STYLES, options?.styles),
})

export default withErrorToastStyles
