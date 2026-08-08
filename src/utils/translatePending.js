import {normalizeId} from "./translateNormalize.js";

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
  defaultCompanyId,
  store,
  type,
  key,
  language,
) {
  const storeBucket = getPendingStoreBucket(
    translateStore,
    defaultCompanyId,
    store,
    language,
  );
  return Boolean(storeBucket?.[type]?.[key]);
}

export function getQueuedTranslateGroups(translateStore, defaultCompanyId, language) {
  const companyBucket = getPendingCompanyBucket(
    translateStore,
    defaultCompanyId,
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
  defaultCompanyId,
  store,
  language,
) {
  return getQueuedTranslateGroups(
    translateStore,
    defaultCompanyId,
    language,
  ).filter((group) => group.store === store);
}
