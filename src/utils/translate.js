const TRANSLATES_STORAGE_KEY = "translates";

export default class Translate {
  constructor(companies, defaultCompany, currentCompany, stores, translateStore) {
    this.translates = this.loadStorageObject(TRANSLATES_STORAGE_KEY);

    this.language = this.normalizeLanguageCode(
      JSON.parse(localStorage.getItem("config") || "{}").language
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
    this.pendingPersistRequests = new Map();
    this.t = this.t.bind(this);
    if (typeof this.translateActions?.setPendingMessages === "function") {
      this.translateActions.setPendingMessages({});
    }
    this.syncCachedMessagesToStore();
    this.hydrateDiscoveredStores();
  }

  loadStorageObject(key) {
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

  getLanguageBucket(language = this.language, createIfMissing = false) {
    const normalizedLanguage = this.normalizeLanguageCode(language);
    if (!normalizedLanguage) return null;

    if (!this.translates[normalizedLanguage] && createIfMissing) {
      this.translates[normalizedLanguage] = {};
    }

    return this.translates[normalizedLanguage] || null;
  }

  getCompanyBucket(companyId, createIfMissing = false, language = this.language) {
    const normalizedCompanyId = this.normalizeId(companyId);
    if (!normalizedCompanyId) return null;

    const languageBucket = this.getLanguageBucket(language, createIfMissing);
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

  getStoreBucket(companyId, store, createIfMissing = false, language = this.language) {
    if (!store) return null;

    if (companyId) {
      const companyBucket = this.getCompanyBucket(companyId, createIfMissing, language);
      if (!companyBucket) return null;

      if (createIfMissing && !companyBucket[store]) {
        companyBucket[store] = {};
      }

      return companyBucket[store] || null;
    }

    const languageBucket = this.getLanguageBucket(language, createIfMissing);
    if (!languageBucket) return null;

    if (createIfMissing && !languageBucket[store]) {
      languageBucket[store] = {};
    }

    return languageBucket[store] || null;
  }

  normalizeId(value) {
    if (value == null) return null;

    const match = String(value).match(/\d+/);
    return match?.[0] || null;
  }

  normalizeLanguageCode(value) {
    if (typeof value !== "string") return "";

    return value.trim().replace(/_/g, "-").toLowerCase();
  }

  getCompaniesToCache() {
    const candidates = [
      this.defaultCompany,
      this.currentCompany,
    ].filter((company) => company?.id);

    const unique = [];
    const seen = new Set();

    candidates.forEach((company) => {
      const companyId = this.normalizeId(company.id);
      if (!companyId || seen.has(companyId)) return;

      seen.add(companyId);
      unique.push(company);
    });

    return unique;
  }

  getStoreList() {
    if (Array.isArray(this.stores)) {
      return this.stores.filter(Boolean);
    }

    return this.stores ? [this.stores] : [];
  }

  getPendingMessages() {
    const messages = this.translateStore?.getters?.pendingMessages;
    if (!messages || typeof messages !== "object" || Array.isArray(messages)) {
      return {};
    }

    return messages;
  }

  getPendingLanguageBucket(language = this.language) {
    const pendingMessages = this.getPendingMessages();
    const normalizedLanguage = this.normalizeLanguageCode(language);
    if (!normalizedLanguage) return null;

    return pendingMessages[normalizedLanguage] || null;
  }

  getPendingCompanyBucket(companyId, language = this.language) {
    const normalizedCompanyId = this.normalizeId(companyId);
    if (!normalizedCompanyId) return null;

    const languageBucket = this.getPendingLanguageBucket(language);
    if (!languageBucket) return null;

    const companiesBucket = languageBucket.companies;
    if (!companiesBucket || typeof companiesBucket !== "object") {
      return null;
    }

    return companiesBucket[normalizedCompanyId] || null;
  }

  getPendingStoreBucket(companyId, store, language = this.language) {
    const normalizedStore = String(store || "").trim();
    if (!normalizedStore) return null;

    const companyBucket = this.getPendingCompanyBucket(companyId, language);
    if (!companyBucket) return null;

    return companyBucket[normalizedStore] || null;
  }

  hasPendingTranslate(store, type, key) {
    const pendingStoreBucket = this.getPendingStoreBucket(
      this.defaultCompany?.id,
      store,
      this.language,
    );

    return Boolean(pendingStoreBucket?.[type]?.[key]);
  }

  getStoreDiscoveryToken(store) {
    return [
      this.language,
      String(store || ""),
    ].join("::");
  }

  canDiscoverStore() {
    return typeof this.translateActions?.getItems === "function";
  }

  hasCachedBootstrapStore(store) {
    if (!store) return false;

    const companies = this.getCompaniesToCache();
    if (companies.length === 0) return false;

    return companies.every((company) => this.getStoreBucket(company.id, store) != null);
  }

  hydrateDiscoveredStores() {
    this.bootstrapStores.forEach((store) => {
      if (this.hasCachedBootstrapStore(store)) {
        this.markStoreDiscovered(store);
      }
    });
  }

  hasDiscoveredStore(store) {
    if (!store) return false;

    return this.discoveredStores.has(this.getStoreDiscoveryToken(store));
  }

  markStoreDiscovered(store) {
    if (!store) return;

    this.discoveredStores.add(this.getStoreDiscoveryToken(store));
  }

  ensureStoreDiscovered(store) {
    if (!store || !this.canDiscoverStore()) {
      return Promise.resolve(this.translates);
    }

    if (this.hasDiscoveredStore(store)) {
      return Promise.resolve(this.translates);
    }

    const token = this.getStoreDiscoveryToken(store);
    if (this.pendingStoreDiscoveries.has(token)) {
      return this.pendingStoreDiscoveries.get(token);
    }

    const discoveryPromise = Promise.resolve()
      .then(() => this.discoveryStoreTranslate(store))
      .finally(() => {
        this.pendingStoreDiscoveries.delete(token);
      });

    this.pendingStoreDiscoveries.set(token, discoveryPromise);

    return discoveryPromise;
  }

  notifyTranslationsUpdated() {
    const globalObject =
      typeof global !== "undefined" ? global : globalThis;

    if (typeof globalObject?.refreshTranslationsUI === "function") {
      globalObject.refreshTranslationsUI();
    }
  }

  syncCachedMessagesToStore() {
    if (typeof this.translateActions?.setMessages !== "function") {
      return;
    }

    this.translateActions.setMessages({
      ...this.translates,
    });
  }

  getPersistRequestToken(store, type, key) {
    return [
      this.language,
      this.normalizeId(this.defaultCompany?.id),
      String(store || "").trim(),
      String(type || "").trim(),
      String(key || "").trim(),
    ].join("::");
  }

  resolveReferenceId(value) {
    if (!value) return null;

    if (typeof value === "object") {
      return this.normalizeId(value.id || value["@id"] || value.people || value.language);
    }

    return this.normalizeId(value);
  }

  cacheTranslateRecord(record, fallbackCompanyId = null, fallbackLanguage = this.language) {
    const companyId = this.resolveReferenceId(record?.people) || this.normalizeId(fallbackCompanyId);
    const language =
      this.normalizeLanguageCode(record?.language?.language || record?.language?.locale || fallbackLanguage) ||
      this.language;
    const store = String(record?.store || "").trim();
    const type = String(record?.type || "").trim();
    const key = String(record?.key || "").trim();
    const message = record?.translate ?? this.formatMessage(key);

    if (!companyId || !store || !type || !key) {
      return false;
    }

    const previousMessage = this.getStoreBucket(companyId, store, false, language)?.[type]?.[key];
    this.findMessage(store, type, key, message, companyId, language);

    return previousMessage !== message;
  }

  getMessageFromBuckets(store, type, key) {
    const companyIds = [
      this.currentCompany?.id,
      this.defaultCompany?.id,
    ]
      .map((value) => this.normalizeId(value))
      .filter(Boolean);

    for (const companyId of companyIds) {
      const companyMessage =
        this.getStoreBucket(companyId, store)?.[type]?.[key];

      if (companyMessage) {
        return companyMessage;
      }
    }

    return this.getStoreBucket(null, store)?.[type]?.[key];
  }

  persistMissingTranslate(store, type, key, translate) {
    if (!store || !type || !key || !this.defaultCompany?.id) return;

    // verifica se tenho acesso ao defaultCompany
    const defaultCompanyId = this.normalizeId(this.defaultCompany?.id);
    if (
      !Array.isArray(this.companies) ||
      !this.companies.some((company) => this.normalizeId(company?.id) === defaultCompanyId)
    )
      return;

    if (this.hasPendingTranslate(store, type, key)) {
      return;
    }

    const requestToken = this.getPersistRequestToken(store, type, key);
    if (this.pendingPersistRequests.has(requestToken)) {
      return;
    }

    if (
      typeof this.translateActions?.queueMissingTranslate !== "function" ||
      typeof this.translateActions?.save !== "function"
    ) {
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

    const request = Promise.resolve(
      this.translateActions.save({
        people: "/people/" + defaultCompanyId,
        language: this.language,
        store,
        type,
        key,
        translate,
        revised: false,
      })
    )
      .then((result) => {
        const changed = this.cacheTranslateRecord(result, defaultCompanyId, this.language);
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
  }

  removePendingTranslate(store, type, key) {
    if (!store || !type || !key || !this.defaultCompany?.id) return;

    if (typeof this.translateActions?.removePendingTranslate !== "function") {
      return;
    }

    this.translateActions.removePendingTranslate({
      language: this.language,
      companyId: this.defaultCompany.id,
      store,
      type,
      key,
    });
  }

  t(store, type, key) {
    const translate = this.getMessageFromBuckets(store, type, key);
    const fallbackTranslate = this.formatMessage(key);
    const shouldDiscoverStore =
      this.canDiscoverStore() && !this.hasDiscoveredStore(store);

    if (shouldDiscoverStore) {
      this.ensureStoreDiscovered(store)
        .then(() => {
          const discoveredTranslate = this.getMessageFromBuckets(store, type, key);

          if (discoveredTranslate) {
            return;
          }

          this.persistMissingTranslate(store, type, key, fallbackTranslate);
        })
        .catch(() => {});
    }

    if (!translate) {
      if (!shouldDiscoverStore) {
        this.persistMissingTranslate(store, type, key, fallbackTranslate);
      }

      return fallbackTranslate;
    }

    return translate;
  }

  reload() {
    this.clear();
    return this.discoveryAll({ force: true });
  }

  clear() {
    this.translates = {};
    this.discoveredStores.clear();
    this.pendingStoreDiscoveries.clear();
    this.pendingPersistRequests.clear();
    if (typeof this.translateActions?.setPendingMessages === "function") {
      this.translateActions.setPendingMessages({});
    }
    this.persist();
  }

  shouldFetchStoreForCompany(store, company, force = false) {
    if (force) return true;

    const companyId = this.normalizeId(company?.id);
    if (!companyId || !store) return false;

    const storeBucket = this.getStoreBucket(companyId, store, false, this.language);
    return storeBucket == null;
  }

  async discoveryAll(options = {}) {
    const companies = this.getCompaniesToCache();

    for (const company of companies) {
      for (const store of this.getStoreList()) {
        await this.discoveryStoreTranslate(store, {
          ...options,
          companies: [company],
        });
      }
    }

    return this.translates;
  }

  async discoveryStoreTranslate(store, options = {}) {
    if (!store) return this.translates;

    const force = options.force === true;
    if (!force && this.hasDiscoveredStore(store)) {
      return this.translates;
    }

    const companies = Array.isArray(options.companies) && options.companies.length > 0
      ? options.companies
      : this.getCompaniesToCache();
    if (companies.length === 0) {
      this.markStoreDiscovered(store);
      return this.translates;
    }

    let hasChanges = false;
    for (const company of companies) {
      const changed = await this.fetchTranslates(store, company, { force });
      hasChanges = changed || hasChanges;
    }

    if (this.hasCachedBootstrapStore(store)) {
      this.markStoreDiscovered(store);
    }

    if (hasChanges) {
      this.persist();
      this.notifyTranslationsUpdated();
    }

    return this.translates;
  }

  async fetchTranslates(store, company, options = {}) {
    if (!company?.id) return false;

    const force = options.force === true;
    if (!this.shouldFetchStoreForCompany(store, company, force)) {
      return false;
    }

    const params = {
      store: store,
      "language.language": this.language,
      people: "/people/" + company.id,
    };

    const storeTranslates = [];
    let page = 1;
    let firstPageSize = null;
    const maxPages = 1000;

    while (page <= maxPages) {
      const pageItems = await this.translateActions.getItems({
        ...params,
        page,
      });

      if (!Array.isArray(pageItems) || pageItems.length === 0) break;

      storeTranslates.push(...pageItems);
      if (firstPageSize == null) firstPageSize = pageItems.length;
      if (pageItems.length < firstPageSize) break;

      page += 1;
    }

    const companyId = this.normalizeId(company?.id);
    const storeBucket = this.getStoreBucket(companyId, store, true);
    let changed = false;

    if (storeBucket) {
      if (Object.keys(storeBucket).length > 0) {
        changed = true;
      }
      Object.keys(storeBucket).forEach((type) => {
        delete storeBucket[type];
      });
    }

    storeTranslates.forEach((element) => {
      changed = this.cacheTranslateRecord(
        {
          ...element,
          people: element.people || companyId,
        },
        companyId,
        this.language,
      ) || changed;
      this.removePendingTranslate(element.store, element.type, element.key);
    });

    return changed || storeTranslates.length === 0;
  }

  persist() {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem("translates", JSON.stringify(this.translates));
    }

    this.syncCachedMessagesToStore();
  }

  findMessage(store, type, key, message, companyId = null, language = this.language) {
    const storeBucket = this.getStoreBucket(companyId, store, true, language);
    if (!storeBucket) {
      return this.formatMessage(key);
    }

    if (!storeBucket[type]) {
      storeBucket[type] = {};
    }

    if (message !== null)
      storeBucket[type][key] = message;

    return storeBucket[type][key] || this.formatMessage(key);
  }

  formatMessage(key) {
    if (!key) return "";

    return key
      .replace(/([a-z])([A-Z])/g, "$1_$2")
      .replace(/_/g, " ")
      .replace(/-/g, " ")
      .replace(/^\w/, (c) => c.toUpperCase());
  }
}
