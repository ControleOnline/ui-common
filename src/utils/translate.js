export default class Translate {
  constructor(defaultCompany, currentCompany, stores, translateActions) {
    this.translates = JSON.parse(localStorage.getItem("translates") || "{}");
    this.language =
      JSON.parse(localStorage.getItem("config") || "{}").language || "pt-br";
    this.defaultCompany = defaultCompany;
    this.currentCompany = currentCompany;
    this.translateActions = translateActions;
    this.stores = stores;
  }

  persistMissingTranslate(store, type, key, translate) {
    if (!store || !type || !key || !this.defaultCompany?.id) return;

    return;

    return this.translateActions.save({
      key,
      language: "/language/1",
      people: "/people/" + this.defaultCompany.id,
      store,
      translate: translate,
      type,
    }).then(() => {
      if (!this.translates[this.language]) this.translates[this.language] = {};
    });
  }

  t(store, type, key) {

    let translate = this.translates[this.language]?.[store]?.[type]?.[key];

    if (!translate) {
      translate = this.formatMessage(key);
      this.persistMissingTranslate(store, type, key, translate);
    }

    return translate;
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
    if (!this.translates || !this.translates[this.language]) {
      for (const store of this.stores) {
        await this.discoveryStoreTranslate(store);
      }
    }

    return this.translates;
  }

  async discoveryStoreTranslate(store) {
    if (!this.translates[this.language]) this.translates[this.language] = {};
    if (this.translates[this.language][store]) return this.translates;

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