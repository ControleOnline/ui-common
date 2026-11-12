import {getAllStores} from '@store'

const TOAST_STYLE_KEYS = ['pressable', 'view', 'text', 'indicator']

const isPlainObject = value =>
  value && typeof value === 'object' && !Array.isArray(value)

// Toast accents come from the theme (`negative` / `warning`), never from fixed RGB (#1484).
const themeColors = () => {
  try {
    return getAllStores()?.theme?.getters?.colors || {}
  } catch (error) {
    return {}
  }
}

export const buildErrorToastStyles = (colors = themeColors()) =>
  colors.negative
    ? {
        pressable: {borderColor: colors.negative, borderWidth: 1},
        indicator: {backgroundColor: colors.negative},
      }
    : {}

export const buildWarningToastStyles = (colors = themeColors()) =>
  colors.warning ? {indicator: {backgroundColor: colors.warning}} : {}

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
  styles: mergeToastStyles(buildErrorToastStyles(), options?.styles),
})

export const withWarningToastStyles = (options = {}) => ({
  ...options,
  styles: mergeToastStyles(buildWarningToastStyles(), options?.styles),
})

export default withErrorToastStyles
