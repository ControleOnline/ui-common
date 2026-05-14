import {resolveSystemErrorMessage} from './systemErrorMessage'

export const DEFAULT_SYSTEM_ERROR_DEDUPE_WINDOW_MS = 1200

const listeners = new Set()
const pendingPayloads = []

let lastFingerprint = ''
let lastPublishedAt = 0

const resolveDedupeWindow = options => {
  const value = Number(options?.dedupeWindowMs)
  if (Number.isFinite(value) && value >= 0) {
    return value
  }

  return DEFAULT_SYSTEM_ERROR_DEDUPE_WINDOW_MS
}

export const getSystemErrorFingerprint = (error, options = {}) => {
  const message = resolveSystemErrorMessage(error)

  if (!message) {
    return ''
  }

  return JSON.stringify({
    message,
    position: String(options?.position || ''),
    providerKey: String(options?.providerKey || ''),
  })
}

const shouldSkipDuplicate = (fingerprint, options = {}) => {
  if (!fingerprint || options?.dedupe === false) {
    return false
  }

  const now = Date.now()
  const dedupeWindowMs = resolveDedupeWindow(options)

  if (
    lastFingerprint === fingerprint &&
    now - lastPublishedAt < dedupeWindowMs
  ) {
    return true
  }

  lastFingerprint = fingerprint
  lastPublishedAt = now
  return false
}

const emitPayload = payload => {
  if (listeners.size === 0) {
    pendingPayloads.push(payload)
    return true
  }

  listeners.forEach(listener => listener(payload))
  return true
}

export const publishSystemError = (error, options = {}) => {
  const message = resolveSystemErrorMessage(error)

  if (!message) {
    return false
  }

  const fingerprint =
    options?.dedupeKey || getSystemErrorFingerprint(message, options)

  if (shouldSkipDuplicate(fingerprint, options)) {
    return false
  }

  return emitPayload({
    error,
    message,
    options,
  })
}

export const subscribeSystemErrors = listener => {
  if (typeof listener !== 'function') {
    return () => {}
  }

  listeners.add(listener)

  if (pendingPayloads.length > 0) {
    const queuedPayloads = pendingPayloads.splice(0, pendingPayloads.length)
    queuedPayloads.forEach(payload => listener(payload))
  }

  return () => {
    listeners.delete(listener)
  }
}

export const resetSystemErrorChannel = () => {
  listeners.clear()
  pendingPayloads.length = 0
  lastFingerprint = ''
  lastPublishedAt = 0
}

export default publishSystemError
