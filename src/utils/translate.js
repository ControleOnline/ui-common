export default class Translate {
  constructor(companies, defaultCompany, currentCompany, stores, translateActions) {
    this.translates = JSON.parse(localStorage.getItem("translates") || "{}");

    this.language =
      JSON.parse(localStorage.getItem("config") || "{}").language || "pt-br";

    this.defaultCompany = defaultCompany;
    this.currentCompany = currentCompany;
    this.translateActions = translateActions;
    this.companies = companies;
    this.stores = stores;
  }

  persistMissingTranslate(store, type, key, translate) {
    if (!store || !type || !key || !this.defaultCompany?.id) return;

    // verifica se tenho acesso ao defaultCompany
    if (
      !Array.isArray(this.companies) ||
      !this.companies.some((company) => company.id === this.defaultCompany.id)
    )
      return;

    const payload = {
      key,
      language: "/languages/1",
      people: "/people/" + this.defaultCompany.id,
      store,
      translate,
      type,
    };

    this.translateActions.addToQueue(() => {
      return this.translateActions.save(payload).then(() => {
        this.findMessage(store, type, key, translate);
        localStorage.setItem("translates", JSON.stringify(this.translates));
      });
    });

    this.translateActions.initQueue();
  }

  t(store, type, key) {
    let translate =
      this.translates?.[this.language]?.[store]?.[type]?.[key];

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
    if (!this.translates || !this.translates[this.language])
      await this.discoveryStoreTranslate(this.stores);

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
    if (!company?.id) return Promise.resolve();

    return this.translateActions
      .getItems({
        store: store,
        "language.language": this.language,
        people: "/people/" + company.id,
        itemsPerPage: 50000,
      })
      .then((storeTranslates) => {
        const currentTranslates = this.translates;

        if (company === this.defaultCompany) {
          storeTranslates.forEach((element) => {
            this.findMessage(
              element.store,
              element.type,
              element.key,
              element.translate || this.formatMessage(element.key)
            );
          });
        } else if (company === this.currentCompany) {
          storeTranslates.forEach((element) => {
            const existingMessage =
              currentTranslates?.[this.language]?.[store]?.[element.type]?.[
              element.key
              ];

            const newMessage =
              element.translate || this.formatMessage(element.key);

            if (existingMessage !== newMessage) {
              this.findMessage(
                element.store,
                element.type,
                element.key,
                newMessage
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