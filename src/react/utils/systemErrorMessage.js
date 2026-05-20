const normalizeText = value => String(value || '').trim()

const resolveMessageList = items =>
  (Array.isArray(items) ? items : [])
    .map(item =>
      normalizeText(
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
  const resolveNestedMessage = value => {
    const nestedCandidates = [
      value?.response?.data,
      value?.data,
      value?.response,
      value?.cause,
    ]

    for (const candidate of nestedCandidates) {
      if (!candidate || candidate === value) {
        continue
      }

      const nestedMessage = resolveSystemErrorMessage(candidate)
      if (nestedMessage) {
        return nestedMessage
      }
    }

    return ''
  }

  if (error === undefined || error === null) {
    return ''
  }

  if (typeof error === 'string') {
    return error.trim()
  }

  if (Array.isArray(error)) {
    return resolveMessageList(error)
  }

  if (Array.isArray(error?.message)) {
    return resolveMessageList(error.message)
  }

  if (Array.isArray(error?.violations)) {
    return resolveMessageList(error.violations)
  }

  const nestedMessage = resolveNestedMessage(error)
  if (nestedMessage) {
    return nestedMessage
  }

  return normalizeText(
    error?.detail ||
      error?.description ||
      error?.['hydra:description'] ||
      error?.['hydra:title'] ||
      error?.errmsg ||
      error?.error ||
      error?.message ||
      error?.title,
  )
}

export default resolveSystemErrorMessage
