import {normalizeId, normalizeLanguageCode} from "./translateNormalize.js";

export function getPendingMessages(translateStore) {
  const messages = translateStore?.getters?.pendingMessages;
  if (!messages || typeof messages !== "object" || Array.isArray(messages)) {
    return {};
  }
  return messages;
}

export function getPendingLanguageBucket(translateStore, language) {
  const pending = getPendingMessages(translateStore);
  const normalizedLanguage = String(language || "").trim().toLowerCase();
  if (!normalizedLanguage) return null;
  return pending?.[normalizedLanguage] || null;
}

export function getPendingCompanyBucket(translateStore, companyId, language) {
  const normalizedCompanyId = normalizeId(companyId);
  if (!normalizedCompanyId) return null;

  const languageBucket = getPendingLanguageBucket(translateStore, language);
  return languageBucket?.companies?.[normalizedCompanyId] || null;
}

export function getPendingStoreBucket(translateStore, companyId, store, language) {
  if (!store) return null;

  const companyBucket = getPendingCompanyBucket(
    translateStore,
    companyId,
    language,
  );
  if (!companyBucket) return null;

  return companyBucket[store] || null;
}

export function hasPendingTranslate(
  translateStore,
  mainCompanyId,
  store,
  type,
  key,
  language,
) {
  const storeBucket = getPendingStoreBucket(
    translateStore,
    mainCompanyId,
    store,
    language,
  );
  return Boolean(storeBucket?.[type]?.[key]);
}

export function getQueuedTranslateGroups(translateStore, mainCompanyId, language) {
  const companyBucket = getPendingCompanyBucket(
    translateStore,
    mainCompanyId,
    language,
  );
  if (!companyBucket) {
    return [];
  }

  const groups = [];
  Object.entries(companyBucket).forEach(([store, storeBucket]) => {
    if (!storeBucket || typeof storeBucket !== "object") return;

    Object.entries(storeBucket).forEach(([type, keys]) => {
      if (!keys || typeof keys !== "object") return;
      const keyList = Object.keys(keys).filter(Boolean);
      if (keyList.length === 0) return;
      groups.push({store, type, keys: keyList});
    });
  });

  return groups;
}

export function getQueuedTranslateGroupsForStore(
  translateStore,
  mainCompanyId,
  store,
  language,
) {
  return getQueuedTranslateGroups(
    translateStore,
    mainCompanyId,
    language,
  ).filter((group) => group.store === store);
}

const isPlainObject = (value) =>
  value != null && typeof value === "object" && !Array.isArray(value);

// Adds many pending translates with a SINGLE immutable update. Returns the same
// reference when nothing changed so callers can skip the store commit.
export function addPendingTranslates(
  pendingMessages,
  language,
  companyId,
  entries,
) {
  const normalizedLanguage = normalizeLanguageCode(language);
  const normalizedCompanyId = normalizeId(companyId);
  const base = isPlainObject(pendingMessages) ? pendingMessages : {};

  if (!normalizedLanguage || !normalizedCompanyId || !entries?.length) {
    return base;
  }

  let changed = false;
  const languageBucket = {...(base[normalizedLanguage] || {})};
  const companies = {...(languageBucket.companies || {})};
  const companyBucket = {...(companies[normalizedCompanyId] || {})};

  entries.forEach(({store, type, key, translate}) => {
    const normalizedStore = String(store || "").trim();
    const normalizedType = String(type || "").trim();
    const normalizedKey = String(key || "").trim();
    const value = String(translate || "").trim();
    if (!normalizedStore || !normalizedType || !normalizedKey) return;

    const storeBucket = companyBucket[normalizedStore] || {};
    const typeBucket = storeBucket[normalizedType] || {};
    if (typeBucket[normalizedKey] === value) return;

    companyBucket[normalizedStore] = {
      ...storeBucket,
      [normalizedType]: {...typeBucket, [normalizedKey]: value},
    };
    changed = true;
  });

  if (!changed) return base;

  companies[normalizedCompanyId] = companyBucket;
  languageBucket.companies = companies;
  return {...base, [normalizedLanguage]: languageBucket};
}

// Removes many pending translates with a SINGLE immutable update.
export function removePendingTranslates(
  pendingMessages,
  language,
  companyId,
  entries,
) {
  const normalizedLanguage = normalizeLanguageCode(language);
  const normalizedCompanyId = normalizeId(companyId);
  const base = isPlainObject(pendingMessages) ? pendingMessages : {};
  const currentCompany =
    base[normalizedLanguage]?.companies?.[normalizedCompanyId];

  if (!currentCompany || !entries?.length) return base;

  let changed = false;
  const companyBucket = {...currentCompany};

  entries.forEach(({store, type, key}) => {
    const normalizedStore = String(store || "").trim();
    const normalizedType = String(type || "").trim();
    const normalizedKey = String(key || "").trim();
    const typeBucket = companyBucket[normalizedStore]?.[normalizedType];
    if (
      !typeBucket ||
      !Object.prototype.hasOwnProperty.call(typeBucket, normalizedKey)
    ) {
      return;
    }

    const nextType = {...typeBucket};
    delete nextType[normalizedKey];
    const nextStore = {...companyBucket[normalizedStore]};
    if (Object.keys(nextType).length > 0) {
      nextStore[normalizedType] = nextType;
    } else {
      delete nextStore[normalizedType];
    }
    if (Object.keys(nextStore).length > 0) {
      companyBucket[normalizedStore] = nextStore;
    } else {
      delete companyBucket[normalizedStore];
    }
    changed = true;
  });

  if (!changed) return base;

  const companies = {...base[normalizedLanguage].companies};
  if (Object.keys(companyBucket).length > 0) {
    companies[normalizedCompanyId] = companyBucket;
  } else {
    delete companies[normalizedCompanyId];
  }

  const languageBucket = {...base[normalizedLanguage]};
  if (Object.keys(companies).length > 0) {
    languageBucket.companies = companies;
  } else {
    delete languageBucket.companies;
  }

  const next = {...base};
  if (Object.keys(languageBucket).length > 0) {
    next[normalizedLanguage] = languageBucket;
  } else {
    delete next[normalizedLanguage];
  }
  return next;
}
