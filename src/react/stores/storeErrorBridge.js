import {publishSystemError} from '@controleonline/ui-common/src/react/utils/systemErrorChannel'
import {resolveSystemErrorMessage} from '@controleonline/ui-common/src/react/utils/systemErrorMessage'

export const shouldSkipStoreErrorMutation = options =>
  options?.skipSystemError === true

export const isStoreErrorMutation = (mutationType, error, options = {}) => {
  if (shouldSkipStoreErrorMutation(options)) {
    return false
  }

  return (
    String(mutationType || '').endsWith('SET_ERROR') &&
    !!resolveSystemErrorMessage(error)
  )
}

export const bridgeStoreError = ({
  storeName,
  mutationType,
  error,
  options = {},
}) => {
  if (!isStoreErrorMutation(mutationType, error, options)) {
    return false
  }

  return publishSystemError(error, {
    source: 'store',
    storeName: String(storeName || ''),
    mutationType: String(mutationType || ''),
    ...options,
  })
}

export default bridgeStoreError
