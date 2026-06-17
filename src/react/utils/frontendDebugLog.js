import {api} from '@controleonline/ui-common/src/api'

const normalizeContext = value =>
  value && typeof value === 'object' && !Array.isArray(value) ? value : {}

export const sendFrontendDebugLog = async ({
  channel = 'frontend-debug',
  class: entityClass = '',
  context = {},
  entityRow = null,
  level = 'info',
  message = 'Frontend debug log',
  row = null,
} = {}) => {
  if (typeof __DEV__ !== 'undefined' && !__DEV__) {
    return null
  }

  const normalizedContext = {
    ...normalizeContext(context),
    href:
      typeof window !== 'undefined' && window?.location?.href
        ? window.location.href
        : '',
  }

  try {
    const response = await api.fetch('/logs/frontend-debug', {
      method: 'POST',
      body: {
        channel,
        level,
        message,
        context: normalizedContext,
        entityClass,
        entityRow: entityRow ?? row,
      },
    })

    return response
  } catch {
    return null
  }
}
// TODO(store-first): quando este arquivo for mexido, mover a leitura para stores, remover api.fetch e evitar repassar dados em objetos quando o store ja resolver isso.
