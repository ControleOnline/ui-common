export default class Translate {
  constructor(companies, defaultCompany, currentCompany, stores, translateActions) {
    this.translates = JSON.parse(localStorage.getItem("translates") || "{}");

    this.language = this.normalizeLanguageCode(
      JSON.parse(localStorage.getItem("config") || "{}").language
    ) || "pt-br";

    this.defaultCompany = defaultCompany;
    this.currentCompany = currentCompany;
    this.translateActions = translateActions;
    this.companies = companies;
    this.stores = stores;
    this.bootstrapStores = new Set(this.getStoreList());
    this.discoveredStores = new Set();
    this.pendingStoreDiscoveries = new Map();
    this.pendingMissingTranslations = new Set();
    this.t = this.t.bind(this);
    this.hydrateDiscoveredStores();
  }

  getLanguageBucket(createIfMissing = false) {
    if (!this.translates[this.language] && createIfMissing) {
      this.translates[this.language] = {};
    }

    return this.translates[this.language] || null;
  }

  getCompanyBucket(companyId, createIfMissing = false) {
    const normalizedCompanyId = this.normalizeId(companyId);
    if (!normalizedCompanyId) return null;

    const languageBucket = this.getLanguageBucket(createIfMissing);
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

  getStoreBucket(companyId, store, createIfMissing = false) {
    if (!store) return null;

    if (companyId) {
      const companyBucket = this.getCompanyBucket(companyId, createIfMissing);
      if (!companyBucket) return null;

      if (createIfMissing && !companyBucket[store]) {
        companyBucket[store] = {};
      }

      return companyBucket[store] || null;
    }

    const languageBucket = this.getLanguageBucket(createIfMissing);
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
      this.currentCompany,
      this.defaultCompany,
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
    if (!store || !this.bootstrapStores.has(store)) return false;

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

  getMissingTranslateToken(store, type, key) {
    return [
      this.language,
      this.normalizeId(this.defaultCompany?.id) || "",
      String(store || ""),
      String(type || ""),
      String(key || ""),
    ].join("::");
  }

  persistMissingTranslate(store, type, key, translate) {
    if (!store || !type || !key || !this.defaultCompany?.id) return;
    if (
      typeof this.translateActions?.addToQueue !== "function" ||
      typeof this.translateActions?.initQueue !== "function" ||
      typeof this.translateActions?.save !== "function"
    )
      return;

    // verifica se tenho acesso ao defaultCompany
    if (
      !Array.isArray(this.companies) ||
      !this.companies.some((company) => company.id === this.defaultCompany.id)
    )
      return;

    const pendingToken = this.getMissingTranslateToken(store, type, key);
    if (this.pendingMissingTranslations.has(pendingToken)) return;

    this.pendingMissingTranslations.add(pendingToken);

    // Persist missing translations in the same runtime language being rendered.
    const payload = {
      people: "/people/" + this.defaultCompany.id,
      language: this.language,
      store,
      type,
      key,
      translate,
    };

    setTimeout(() => {
      try {
        this.translateActions.addToQueue(() => {
          return Promise.resolve()
            .then(() => this.translateActions.save(payload))
            .then(() => {
              this.findMessage(store, type, key, translate);
              this.persist();
            })
            .finally(() => {
              this.pendingMissingTranslations.delete(pendingToken);
            });
        });

        this.translateActions.initQueue();
      } catch (e) {
        this.pendingMissingTranslations.delete(pendingToken);
      }
    }, 0);
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
            if (discoveredTranslate !== translate) {
              this.notifyTranslationsUpdated();
            }

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
    this.discoveryAll();
  }

  clear() {
    this.translates = {};
    this.persist();
  }

  async discoveryAll() {
    for (const store of this.getStoreList()) {
      await this.discoveryStoreTranslate(store);
    }

    return this.translates;
  }

  async discoveryStoreTranslate(store) {
    if (!store) return this.translates;

    if (this.hasDiscoveredStore(store)) {
      return this.translates;
    }

    const companies = this.getCompaniesToCache();
    if (companies.length === 0) {
      this.markStoreDiscovered(store);
      return this.translates;
    }

    for (const company of companies) {
      await this.fetchTranslates(store, company);
    }

    this.markStoreDiscovered(store);

    return this.translates;
  }

  async fetchTranslates(store, company) {
    if (!company?.id) return Promise.resolve();

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

    if (storeBucket) {
      Object.keys(storeBucket).forEach((type) => {
        delete storeBucket[type];
      });
    }

    storeTranslates.forEach((element) => {
      this.findMessage(
        element.store,
        element.type,
        element.key,
        element.translate || this.formatMessage(element.key),
        companyId
      );
    });

    this.persist();
  }

  persist() {
    localStorage.setItem("translates", JSON.stringify(this.translates));
  }

  findMessage(store, type, key, message, companyId = null) {
    const storeBucket = this.getStoreBucket(companyId, store, true);
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
