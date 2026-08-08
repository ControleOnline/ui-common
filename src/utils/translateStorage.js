import {normalizeId, normalizeLanguageCode} from "./translateNormalize.js";

export const TRANSLATES_STORAGE_KEY = "translates";

export function loadStorageObject(key) {
  if (typeof localStorage === "undefined") {
    return {};
  }

  try {
    const value = localStorage.getItem(key);
    if (!value) return {};

    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function getLanguageBucket(translates, language, createIfMissing = false) {
  const normalizedLanguage = normalizeLanguageCode(language);
  if (!normalizedLanguage) return null;

  if (!translates[normalizedLanguage] && createIfMissing) {
    translates[normalizedLanguage] = {};
  }

  return translates[normalizedLanguage] || null;
}

export function getCompanyBucket(
  translates,
  companyId,
  createIfMissing = false,
  language,
) {
  const normalizedCompanyId = normalizeId(companyId);
  if (!normalizedCompanyId) return null;

  const languageBucket = getLanguageBucket(translates, language, createIfMissing);
  if (!languageBucket) return null;

  if (!languageBucket.companies && createIfMissing) {
    languageBucket.companies = {};
  }

  if (
    createIfMissing &&
    languageBucket.companies &&
    !languageBucket.companies[normalizedCompanyId]
  ) {
    languageBucket.companies[normalizedCompanyId] = {};
  }

  return languageBucket.companies?.[normalizedCompanyId] || null;
}

export function getStoreBucket(
  translates,
  companyId,
  store,
  createIfMissing = false,
  language,
) {
  if (!store) return null;

  if (companyId) {
    const companyBucket = getCompanyBucket(
      translates,
      companyId,
      createIfMissing,
      language,
    );
    if (!companyBucket) return null;

    if (createIfMissing && !companyBucket[store]) {
      companyBucket[store] = {};
    }

    return companyBucket[store] || null;
  }

  const languageBucket = getLanguageBucket(translates, language, createIfMissing);
  if (!languageBucket) return null;

  if (createIfMissing && !languageBucket[store]) {
    languageBucket[store] = {};
  }

  return languageBucket[store] || null;
}

export function collectCompaniesToCache(defaultCompany, currentCompany) {
  const candidates = [defaultCompany, currentCompany].filter(
    (company) => company?.id,
  );

  const unique = [];
  const seen = new Set();

  candidates.forEach((company) => {
    const companyId = normalizeId(company.id);
    if (!companyId || seen.has(companyId)) return;

    seen.add(companyId);
    unique.push(company);
  });

  return unique;
}

export function writeMessageToBucket(
  translates,
  store,
  type,
  key,
  message,
  companyId = null,
  language,
) {
  const storeBucket = getStoreBucket(
    translates,
    companyId,
    store,
    true,
    language,
  );
  if (!storeBucket) {
    return null;
  }

  if (!storeBucket[type]) {
    storeBucket[type] = {};
  }

  if (message !== null) {
    storeBucket[type][key] = message;
  }

  return storeBucket[type][key];
}
