import { api } from "@controleonline/ui-common/src/api";

export default class Translate {
  constructor(defaultCompany, currentCompany, stores, translateActions) {
    this.translates = JSON.parse(localStorage.getItem("translates") || "{}");
    this.language =
      JSON.parse(localStorage.getItem("config") || "{}").language || "pt-br";
    this.defaultCompany = defaultCompany;
    this.currentCompany = currentCompany;
    this.translateActions = translateActions;
    this.stores = stores;
    this.persistedMessages = {};
    this.languageIri = null;
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

    try {
      const languages = await api.fetch("languages", {
        params: { language: this.language, itemsPerPage: 1 },
      });
      const language = languages?.member?.[0];

      if (language?.id) {
        this.languageIri = "/languages/" + language.id;
      } else if (language?.["@id"]) {
        this.languageIri = language["@id"];
      } else {
        this.languageIri = "/languages/" + this.language;
      }
    } catch (e) {
      this.languageIri = "/languages/" + this.language;
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
    this.clear();
    this.discoveryAll();
  }

  clear() {
    this.translates = {};
    localStorage.setItem("translates", "{}");
  }

  async discoveryAll() {
    await Promise.all(
      this.stores.map((store) => this.discoveryStoreTranslate(store)),
    );
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
