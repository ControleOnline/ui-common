const normalizeTrackedSpoolId = value => {
  if (value === null || value === undefined) {
    return ''
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? String(value) : ''
  }

  const normalizedValue = String(value).replace(/\D+/g, '').trim()
  return normalizedValue
}

export const getTrackedSpoolKey = value => normalizeTrackedSpoolId(value)

export const hasTrackedSpool = (registry, spoolId) => {
  const spoolKey = getTrackedSpoolKey(spoolId)
  return Boolean(spoolKey && registry instanceof Map && registry.has(spoolKey))
}

export const rememberTrackedSpool = (
  registry,
  spoolId,
  metadata = {},
) => {
  if (!(registry instanceof Map)) {
    return registry
  }

  const spoolKey = getTrackedSpoolKey(spoolId)
  if (!spoolKey) {
    return registry
  }

  registry.set(spoolKey, {
    printedAt:
      typeof metadata?.printedAt === 'number' && Number.isFinite(metadata.printedAt)
        ? metadata.printedAt
        : Date.now(),
  })

  return registry
}

export const forgetTrackedSpool = (registry, spoolId) => {
  if (!(registry instanceof Map)) {
    return registry
  }

  const spoolKey = getTrackedSpoolKey(spoolId)
  if (!spoolKey) {
    return registry
  }

  registry.delete(spoolKey)
  return registry
}

export const pruneTrackedSpools = (registry, openSpoolIds = []) => {
  if (!(registry instanceof Map)) {
    return registry
  }

  const openSpoolKeys = new Set(
    (Array.isArray(openSpoolIds) ? openSpoolIds : [])
      .map(getTrackedSpoolKey)
      .filter(Boolean),
  )

  Array.from(registry.keys()).forEach(spoolKey => {
    if (!openSpoolKeys.has(spoolKey)) {
      registry.delete(spoolKey)
    }
  })

  return registry
}
