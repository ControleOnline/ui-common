import { mapPasswordErrorMessage } from './passwordPolicy'

const normalizeText = value => String(value || '').trim()

const resolveMessageList = items =>
  (Array.isArray(items) ? items : [])
    .map(item =>
      normalizeText(
        item?.['hydra:description'] ||
          item?.['hydra:title'] ||
          item?.message ||
          item?.title ||
          item?.detail ||
          item?.description ||
          item,
      ),
    )
    .filter(Boolean)
    .join('\n')
    .trim()

export const resolveSystemErrorMessage = error => {
  if (error === undefined || error === null) {
    return ''
  }

  if (typeof error === 'string') {
    return mapPasswordErrorMessage(error.trim())
  }

  if (Array.isArray(error)) {
    return mapPasswordErrorMessage(resolveMessageList(error))
  }

  if (Array.isArray(error?.message)) {
    return mapPasswordErrorMessage(resolveMessageList(error.message))
  }

  if (Array.isArray(error?.violations)) {
    return mapPasswordErrorMessage(resolveMessageList(error.violations))
  }

  if (error?.response?.data) {
    const responseMessage = resolveSystemErrorMessage(error.response.data)
    if (responseMessage) {
      return responseMessage
    }
  }

  if (error?.body) {
    const bodyMessage = resolveSystemErrorMessage(error.body)
    if (bodyMessage) {
      return bodyMessage
    }
  }

  return mapPasswordErrorMessage(
    normalizeText(
      error?.['hydra:description'] ||
        error?.['hydra:title'] ||
        error?.detail ||
        error?.description ||
        error?.errmsg ||
        error?.error ||
        error?.message ||
        error?.title,
    ),
  )
}

export { resolveSystemErrorMessage }
export default resolveSystemErrorMessage
