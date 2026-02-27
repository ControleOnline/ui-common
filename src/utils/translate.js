import { api } from "@controleonline/ui-common/src/api";

export default class Translate {
  constructor(defaultCompany, currentCompany, stores = [], translateActions) {
    this.defaultCompany = defaultCompany;
    this.currentCompany = currentCompany;
    this.language = this.getLanguageFromConfig();
    this.translates = this.readFromStorage();
    this.translateActions = translateActions;
    this.stores = stores;
    this.persistedMessages = {};
    this.languageIri = null;
  }

  getLanguageFromConfig() {
    try {
      return JSON.parse(localStorage.getItem("config") || "{}").language || "pt-BR";
    } catch (e) {
      return "pt-BR";
    }
  }

  normalizeLanguageCode(value) {
    return String(value || "")
      .trim()
      .replace("_", "-")
      .toLowerCase();
  }

  getStorageKey() {
    return [
      "translates",
      this.language,
      this.defaultCompany?.id || "default",
      this.currentCompany?.id || "current",
    ].join(":");
  }

  readFromStorage() {
    try {
      const value =
        localStorage.getItem(this.getStorageKey?.() || "translates") ||
        localStorage.getItem("translates") ||
        "{}";
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch (e) {
      return {};
    }
  }

  writeToStorage() {
    const payload = JSON.stringify(this.translates || {});
    localStorage.setItem(this.getStorageKey(), payload);
    localStorage.setItem("translates", payload);
  }

  hasCache() {
    return (
      !!this.translates?.[this.language] &&
      Object.keys(this.translates[this.language]).length > 0
    );
  }

  t(store, type, key) {
    const currentMessage = this.translates[this.language]?.[store]?.[type]?.[key];

    if (!currentMessage) {
      this.persistMissingTranslate(store, type, key);
    }

    return (
      currentMessage ||
      this.formatMessage(key)
    );

  }

  getPersistKey(store, type, key) {
    return [this.language, store, type, key].join("::");
  }

  async getLanguageIri() {
    if (this.languageIri) return this.languageIri;

    const normalized = this.normalizeLanguageCode(this.language);
    const fallbackLanguageByCode = {
      "pt-br": "/languages/1",
      "en-us": "/languages/2",
    };

    try {
      const languages = await api.fetch("languages", {
        params: { itemsPerPage: 500 },
      });
      const rows = languages?.member || languages?.["hydra:member"] || [];
      const language = rows.find((item) => {
        const candidate = this.normalizeLanguageCode(item?.language);
        return candidate === normalized;
      });

      if (language?.id) {
        this.languageIri = "/languages/" + language.id;
      } else if (language?.["@id"]) {
        this.languageIri = language["@id"];
      } else {
        this.languageIri = fallbackLanguageByCode[normalized] || "/languages/1";
      }
    } catch (e) {
      this.languageIri = fallbackLanguageByCode[normalized] || "/languages/1";
    }

    return this.languageIri;
  }

  persistMissingTranslate(store, type, key) {
    if (!store || !type || !key || !this.defaultCompany?.id) return;

    const persistKey = this.getPersistKey(store, type, key);
    if (this.persistedMessages[persistKey]) return;
    this.persistedMessages[persistKey] = true;

    // ALEMAC // 16/02/2026 // atualização da tradução
    this.getLanguageIri()
      .then((languageIri) =>
        this.translateActions
          .getItems({
            store,
            type,
            key,
            "language.language": this.language,
            people: "/people/" + this.defaultCompany.id,
            itemsPerPage: 1,
          })
          .then((items) => {
            if (Array.isArray(items) && items.length > 0) return;

            return this.translateActions.save({
              key,
              language: languageIri,
              people: "/people/" + this.defaultCompany.id,
              store,
              translate: this.formatMessage(key),
              type,
            });
          })
      )
      .catch(() => {});
  }

  reload() {
    this.language = this.getLanguageFromConfig();
    this.clear();
    return this.discoveryAll();
  }

  clear() {
    this.translates = {};
    localStorage.removeItem(this.getStorageKey());
    localStorage.setItem("translates", "{}");
  }

  async discoveryAll() {
    await this.fetchAllTranslates(this.defaultCompany, false);
    await this.fetchAllTranslates(this.currentCompany, true);
    this.writeToStorage();
    return this.translates;
  }

  async discoveryStoreTranslate(store) {
    if (!this.translates[this.language]) this.translates[this.language] = {};

    await this.fetchTranslates(store, this.defaultCompany);
    await this.fetchTranslates(store, this.currentCompany);
    return this.translates;
  }

  fetchTranslates(store, company) {
    return this.translateActions
      .getItems({
        store: store,
        "language.language": this.language,
        people: "/people/" + company.id,
        itemsPerPage: 500,
      })
      .then((storeTranslates) => {
        const currentTranslates = this.translates;

        if (company === this.defaultCompany) {
          storeTranslates.forEach((element) => {
            this.findMessage(
              element.store,
              element.type,
              element.key,
              element.translate || this.formatMessage(element.key),
            );
          });
        } else if (company === this.currentCompany) {
          storeTranslates.forEach((element) => {
            const existingMessage =
              currentTranslates[this.language]?.[store]?.[element.type]?.[
                element.key
              ];
            const newMessage =
              element.translate || this.formatMessage(element.key);
            if (existingMessage !== newMessage) {
              this.findMessage(
                element.store,
                element.type,
                element.key,
                newMessage,
              );
            }
          });
        }

        localStorage.setItem("translates", JSON.stringify(this.translates));
      });
  }

  async fetchAllTranslates(company, override = false) {
    if (!company?.id) return;
    if (!this.translates[this.language]) this.translates[this.language] = {};

    let page = 1;
    const itemsPerPage = 500;
    let keepLoading = true;

    while (keepLoading) {
      const data = await api.fetch("translates", {
        params: {
          "language.language": this.language,
          people: "/people/" + company.id,
          itemsPerPage,
          page,
        },
      });

      const rows = data?.member || data?.["hydra:member"] || [];

      rows.forEach((element) => {
        if (!element?.store || !element?.type || !element?.key) return;

        const newMessage = element.translate || this.formatMessage(element.key);
        const existingMessage =
          this.translates[this.language]?.[element.store]?.[element.type]?.[
            element.key
          ];

        if (!override && existingMessage) return;
        if (override && existingMessage === newMessage) return;

        this.findMessage(element.store, element.type, element.key, newMessage);
      });

      keepLoading = rows.length === itemsPerPage;
      page += 1;
    }
  }

  findMessage(store, type, key, message) {
    if (!this.translates[this.language]) this.translates[this.language] = {};
    if (!this.translates[this.language][store])
      this.translates[this.language][store] = {};
    if (!this.translates[this.language][store][type])
      this.translates[this.language][store][type] = {};
    if (message !== null)
      this.translates[this.language][store][type][key] = message;
    return (
      this.translates[this.language][store][type][key] ||
      this.formatMessage(key)
    );
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
