export async function discoveryAll(translate, options = {}) {
  const stores = translate.getStoreList();
  for (const store of stores) {
    await translate.discoveryStoreTranslate(store, options);
  }
  return translate.translates;
}

export async function discoveryStoreTranslate(translate, store, options = {}) {
  if (!store || !translate.canDiscoverStore()) {
    return translate.translates;
  }

  const companies = translate.getResolveCompaniesToCache();
  if (companies.length === 0) {
    return translate.translates;
  }

  let hasChanges = false;
  const force = options.force === true;

  for (const company of companies) {
    const changed = await translate.fetchTranslates(store, company, {
      ...options,
      force,
      clearPending: false,
    });
    hasChanges = changed || hasChanges;
  }

  const requests = translate.getQueuedTranslateGroupsForStore(store);
  if (requests.length > 0) {
    requests.forEach((request) => {
      (request.keys || []).forEach((key) => {
        translate.removePendingTranslate(request.store, request.type, key);
      });
    });
  }

  if (translate.hasCachedBootstrapStore(store)) {
    translate.markStoreDiscovered(store);
  }

  if (hasChanges) {
    translate.persist();
    translate.notifyTranslationsUpdated();
  }

  return translate.translates;
}

export async function fetchTranslates(translate, store, company, options = {}) {
  if (!company?.id) return false;

  const force = options.force === true;
  if (!translate.shouldFetchStoreForCompany(store, company, force)) {
    return false;
  }

  return translate.resolveStoreTranslates(store, company, options);
}

export async function resolveStoreTranslates(translate, store, company, options = {}) {
  const companyId = translate.normalizeId(company?.id);
  if (!companyId) return false;

  const requests = Array.isArray(options.requests)
    ? options.requests
    : translate.getQueuedTranslateGroupsForStore(store);
  if (requests.length === 0) {
    return false;
  }

  const response = await translate.translateActions.resolveQueuedMessages({
    people: "/people/" + companyId,
    language: translate.language,
    requests,
  });

  const resolvedItems = Array.isArray(response)
    ? response
    : response?.member || response?.["hydra:member"] || [];

  let changed = false;
  const clearPending = options.clearPending !== false;
  resolvedItems.forEach((item) => {
    changed =
      translate.cacheTranslateRecord(item, companyId, translate.language) ||
      changed;
    if (clearPending) {
      translate.removePendingTranslate(item.store, item.type, item.key);
    }
  });

  return changed;
}
