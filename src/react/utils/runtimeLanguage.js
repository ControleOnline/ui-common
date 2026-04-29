function normalizeLanguageCode(value) {
  if (typeof value !== 'string') {
    return ''
  }

  return value.trim().replace(/_/g, '-').toLowerCase()
}

function resolveCompanyLanguageCode(company) {
  const candidates = [
    company?.language?.language,
    company?.language?.locale,
    company?.language?.code,
    company?.locale,
    company?.languageCode,
    typeof company?.language === 'string' ? company.language : '',
    company?.configs?.language,
  ]

  for (const candidate of candidates) {
    const normalized = normalizeLanguageCode(candidate)
    if (normalized) {
      return normalized
    }
  }

  return ''
}

function resolveConfiguredLanguage({
  currentCompany,
  defaultCompany,
  currentConfig,
  sessionData,
  fallback = 'pt-br',
} = {}) {
  return (
    resolveCompanyLanguageCode(currentCompany) ||
    resolveCompanyLanguageCode(defaultCompany) ||
    normalizeLanguageCode(currentConfig?.language) ||
    normalizeLanguageCode(sessionData?.language) ||
    fallback
  )
}

module.exports = {
  normalizeLanguageCode,
  resolveCompanyLanguageCode,
  resolveConfiguredLanguage,
}
