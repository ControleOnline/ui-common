import {
  formatMessage,
  isNonEmptyMessage,
  normalizeId,
  normalizeLanguageCode,
  resolveReferenceId,
} from "./translateNormalize.js";
import {
  TRANSLATES_STORAGE_KEY,
  collectCompaniesToCache,
  getCompanyBucket as readCompanyBucket,
  getLanguageBucket as readLanguageBucket,
  getStoreBucket as readStoreBucket,
  loadStorageObject,
  writeMessageToBucket,
} from "./translateStorage.js";
import {
  getPendingMessages as readPendingMessages,
  getQueuedTranslateGroups as readQueuedGroups,
  getQueuedTranslateGroupsForStore as readQueuedGroupsForStore,
  hasPendingTranslate as readHasPendingTranslate,
} from "./translatePending.js";
import {
  discoveryAll as runDiscoveryAll,
  discoveryStoreTranslate as runDiscoveryStoreTranslate,
  fetchTranslates as runFetchTranslates,
  resolveStoreTranslates as runResolveStoreTranslates,
} from "./translateDiscovery.js";

export default class Translate {
  constructor(companies, defaultCompany, currentCompany, stores, translateStore) {
    this.translates = loadStorageObject(TRANSLATES_STORAGE_KEY);

    this.language =
      normalizeLanguageCode(
        JSON.parse(localStorage.getItem("config") || "{}").language,
      ) || "pt-br";

    this.defaultCompany = defaultCompany;
    this.currentCompany = currentCompany;
    this.translateStore = translateStore || {};
    this.translateActions = this.translateStore?.actions || {};
    this.companies = companies;
    this.stores = stores;
    this.bootstrapStores = new Set(this.getStoreList());
    this.discoveredStores = new Set();
    this.pendingStoreDiscoveries = new Map();
    this.pendingMissingTranslateSchedules = new Set();
    this.pendingTranslateResolutionPromise = null;
    this.pendingPersistRequests = new Map();
    this.t = this.t.bind(this);
    if (typeof this.translateActions?.setPendingMessages === "function") {
      this.translateActions.setPendingMessages({});
    }
    this.syncCachedMessagesToStore();
    this.hydrateDiscoveredStores();
  }

  normalizeId(value) {
    return normalizeId(value);
  }

  normalizeLanguageCode(value) {
    return normalizeLanguageCode(value);
  }

  formatMessage(key) {
    return formatMessage(key);
  }

  resolveReferenceId(value) {
    if (value == null) return null;
    if (typeof value === "object") {
      return this.normalizeId(
        value.id || value["@id"] || value.people || value.language,
      );
    }
    return this.normalizeId(value);
  }

  getLanguageBucket(language = this.language, createIfMissing = false) {
    return readLanguageBucket(this.translates, language, createIfMissing);
  }

  getCompanyBucket(companyId, createIfMissing = false, language = this.language) {
    return readCompanyBucket(
      this.translates,
      companyId,
      createIfMissing,
      language,
    );
  }

  getStoreBucket(companyId, store, createIfMissing = false, language = this.language) {
    return readStoreBucket(
      this.translates,
      companyId,
      store,
      createIfMissing,
      language,
    );
  }

  getCompaniesToCache() {
    return collectCompaniesToCache(this.defaultCompany, this.currentCompany);
  }

  // Always load current + main company so runtime resolution can apply
  // current company -> main company -> global fallback (getMessageFromBuckets).
  getResolveCompaniesToCache() {
    return this.getCompaniesToCache();
  }

  getStoreList() {
    if (Array.isArray(this.stores)) {
      return this.stores.filter(Boolean);
    }
    return this.stores ? [this.stores] : [];
  }

  getPendingMessages() {
    return readPendingMessages(this.translateStore);
  }

  hasPendingTranslate(store, type, key) {
    return readHasPendingTranslate(
      this.translateStore,
      this.defaultCompany?.id,
      store,
      type,
      key,
      this.language,
    );
  }

  getStoreDiscoveryToken(store) {
    return `discover:${store}:${this.language}`;
  }

  canDiscoverStore() {
    return typeof this.translateActions?.resolveQueuedMessages === "function";
  }

  hasCachedBootstrapStore(store) {
    const companies = this.getCompaniesToCache();
    if (companies.length === 0) return false;
    return companies.every(
      (company) => this.getStoreBucket(company.id, store) != null,
    );
  }

  hydrateDiscoveredStores() {
    this.getStoreList().forEach((store) => {
      if (this.hasCachedBootstrapStore(store)) {
        this.markStoreDiscovered(store);
      }
    });
  }

  hasDiscoveredStore(store) {
    return this.discoveredStores.has(store);
  }

  markStoreDiscovered(store) {
    if (store) this.discoveredStores.add(store);
  }

  ensureStoreDiscovered(store) {
    if (!store || this.hasDiscoveredStore(store) || !this.canDiscoverStore()) {
      return Promise.resolve(this.translates);
    }

    if (this.pendingStoreDiscoveries.has(store)) {
      return this.pendingStoreDiscoveries.get(store);
    }

    const discoveryPromise = this.discoveryStoreTranslate(store)
      .catch(() => this.translates)
      .finally(() => {
        this.pendingStoreDiscoveries.delete(store);
      });

    this.pendingStoreDiscoveries.set(store, discoveryPromise);
    return discoveryPromise;
  }

  notifyTranslationsUpdated() {
    if (typeof this.translateActions?.setMessages === "function") {
      this.translateActions.setMessages(this.translates);
    }
  }

  syncCachedMessagesToStore() {
    if (typeof this.translateActions?.setMessages === "function") {
      this.translateActions.setMessages(this.translates);
    }
  }

  getPersistRequestToken(store, type, key) {
    return `${this.language}:${this.normalizeId(this.defaultCompany?.id)}:${store}:${type}:${key}`;
  }

  cacheTranslateRecord(record, fallbackCompanyId = null, fallbackLanguage = this.language) {
    const companyId =
      this.resolveReferenceId(record?.people) || this.normalizeId(fallbackCompanyId);
    const language =
      this.normalizeLanguageCode(
        record?.language?.language || record?.language?.locale || fallbackLanguage,
      ) || this.language;
    const store = String(record?.store || "").trim();
    const type = String(record?.type || "").trim();
    const key = String(record?.key || "").trim();
    const message = record?.translate ?? this.formatMessage(key);

    if (!companyId || !store || !type || !key) {
      return false;
    }

    const previousMessage = this.getStoreBucket(companyId, store, false, language)?.[
      type
    ]?.[key];
    this.findMessage(store, type, key, message, companyId, language);

    return previousMessage !== message;
  }

  getMessageFromBuckets(store, type, key) {
    const companyIds = [this.currentCompany?.id, this.defaultCompany?.id]
      .map((value) => this.normalizeId(value))
      .filter(Boolean);

    // Prefer current company, then main/default company, then language-global bucket.
    // Empty/whitespace values do not count as a hit so fallback can still apply.
    for (const companyId of companyIds) {
      const companyMessage = this.getStoreBucket(companyId, store)?.[type]?.[key];
      if (isNonEmptyMessage(companyMessage)) {
        return companyMessage;
      }
    }

    const globalMessage = this.getStoreBucket(null, store)?.[type]?.[key];
    if (isNonEmptyMessage(globalMessage)) {
      return globalMessage;
    }

    return globalMessage;
  }

  persistMissingTranslate(store, type, key, translate) {
    if (!store || !type || !key || !this.defaultCompany?.id) return;

    const defaultCompanyId = this.normalizeId(this.defaultCompany?.id);
    if (
      !Array.isArray(this.companies) ||
      !this.companies.some(
        (company) => this.normalizeId(company?.id) === defaultCompanyId,
      )
    ) {
      return;
    }

    if (this.hasPendingTranslate(store, type, key)) {
      return;
    }

    if (typeof this.translateActions?.queueMissingTranslate !== "function") {
      return;
    }

    this.translateActions.queueMissingTranslate({
      language: this.language,
      companyId: this.defaultCompany.id,
      store,
      type,
      key,
      translate,
    });

    if (typeof this.translateActions?.resolveQueuedMessages === "function") {
      return this.scheduleQueuedTranslateResolution();
    }

    const requestToken = this.getPersistRequestToken(store, type, key);
    if (this.pendingPersistRequests.has(requestToken)) {
      return this.pendingPersistRequests.get(requestToken);
    }

    if (typeof this.translateActions?.save !== "function") {
      return;
    }

    const request = Promise.resolve(
      this.translateActions.save({
        people: "/people/" + defaultCompanyId,
        language: this.language,
        store,
        type,
        key,
        translate,
        revised: false,
      }),
    )
      .then((result) => {
        const changed = this.cacheTranslateRecord(
          result,
          defaultCompanyId,
          this.language,
        );
        this.removePendingTranslate(store, type, key);
        this.persist();
        if (changed) {
          this.notifyTranslationsUpdated();
        }
        return result;
      })
      .catch(() => {})
      .finally(() => {
        this.pendingPersistRequests.delete(requestToken);
      });

    this.pendingPersistRequests.set(requestToken, request);
    return request;
  }

  removePendingTranslate(store, type, key) {
    if (typeof this.translateActions?.removePendingTranslate !== "function") {
      return;
    }

    this.translateActions.removePendingTranslate({
      language: this.language,
      companyId: this.defaultCompany?.id,
      store,
      type,
      key,
    });
  }

  getQueuedTranslateGroups() {
    return readQueuedGroups(
      this.translateStore,
      this.defaultCompany?.id,
      this.language,
    );
  }

  getQueuedTranslateGroupsForStore(store) {
    return readQueuedGroupsForStore(
      this.translateStore,
      this.defaultCompany?.id,
      store,
      this.language,
    );
  }

  scheduleQueuedTranslateResolution() {
    if (this.pendingTranslateResolutionPromise) {
      return this.pendingTranslateResolutionPromise;
    }

    this.pendingTranslateResolutionPromise = new Promise((resolve) => {
      setTimeout(resolve, 0);
    })
      .then(() => this.resolveQueuedTranslations())
      .catch(() => this.translates)
      .finally(() => {
        this.pendingTranslateResolutionPromise = null;
      });

    return this.pendingTranslateResolutionPromise;
  }

  async resolveQueuedTranslations() {
    if (typeof this.translateActions?.resolveQueuedMessages !== "function") {
      return this.translates;
    }

    const requests = this.getQueuedTranslateGroups();
    if (requests.length === 0) {
      return this.translates;
    }

    // Resolve against every company we keep in cache (current + main) so fallback
    // translations from the main company are available at runtime.
    const companies = this.getCompaniesToCache();
    if (companies.length === 0) {
      return this.translates;
    }

    let changed = false;
    const allResolvedItems = [];

    for (const company of companies) {
      const companyId = this.normalizeId(company?.id);
      if (!companyId) continue;

      const response = await this.translateActions.resolveQueuedMessages({
        people: "/people/" + companyId,
        language: this.language,
        requests,
      });

      const resolvedItems = Array.isArray(response)
        ? response
        : response?.member || response?.["hydra:member"] || [];

      resolvedItems.forEach((item) => {
        changed =
          this.cacheTranslateRecord(item, companyId, this.language) || changed;
        this.removePendingTranslate(item.store, item.type, item.key);
        allResolvedItems.push(item);
      });
    }

    if (changed) {
      this.persist();
      this.notifyTranslationsUpdated();
    }

    return allResolvedItems;
  }

  t(store, type, key) {
    const translate = this.getMessageFromBuckets(store, type, key);
    const fallbackTranslate = this.formatMessage(key);

    if (!translate) {
      const scheduleKey = `${store}:${type}:${key}`;
      if (!this.pendingMissingTranslateSchedules.has(scheduleKey)) {
        this.pendingMissingTranslateSchedules.add(scheduleKey);
        setTimeout(() => {
          this.pendingMissingTranslateSchedules.delete(scheduleKey);
          this.persistMissingTranslate(store, type, key, fallbackTranslate);
        }, 0);
      }

      this.ensureStoreDiscovered(store);
      return fallbackTranslate;
    }

    return translate;
  }

  reload() {
    this.translates = loadStorageObject(TRANSLATES_STORAGE_KEY);
    this.syncCachedMessagesToStore();
  }

  clear() {
    this.translates = {};
    this.discoveredStores.clear();
    this.pendingStoreDiscoveries.clear();
    this.persist();
  }

  shouldFetchStoreForCompany(store, company, force = false) {
    if (force) return true;
    if (!company?.id || !store) return false;
    return this.getStoreBucket(company.id, store) == null;
  }

  async discoveryAll(options = {}) {
    return runDiscoveryAll(this, options);
  }

  async discoveryStoreTranslate(store, options = {}) {
    return runDiscoveryStoreTranslate(this, store, options);
  }

  async fetchTranslates(store, company, options = {}) {
    return runFetchTranslates(this, store, company, options);
  }

  async resolveStoreTranslates(store, company, options = {}) {
    return runResolveStoreTranslates(this, store, company, options);
  }

  persist() {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem("translates", JSON.stringify(this.translates));
    }
    this.syncCachedMessagesToStore();
  }

  findMessage(store, type, key, message, companyId = null, language = this.language) {
    const written = writeMessageToBucket(
      this.translates,
      store,
      type,
      key,
      message,
      companyId,
      language,
    );
    if (written == null) {
      return this.formatMessage(key);
    }
    return written || this.formatMessage(key);
  }
}
