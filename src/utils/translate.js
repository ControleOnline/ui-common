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
    const peopleId = this.defaultCompany?.id || this.currentCompany?.id;
    const languageId = this.getActiveLanguageId();
    if (!store || !type || !key || !peopleId) return;

    // ALEMAC // 2026/03/04 // gravação da tradução das palavras que não existem no banco
    return this.translateActions.save({
      key,
      // ALEMAC/ 2026/03/04 // de acordo com a linguagem escolhida pelo usuário
      language: "/languages/" + languageId,
      people: "/people/" + peopleId,
      store,
      translate: translate,
      type,
    }).then(() => {
      if (!this.translates[this.language]) this.translates[this.language] = {};
    });
  }

  parseLanguageId(value) {
    if (value == null) return null;
    if (typeof value === "number") return value;
    if (typeof value === "string") {
      const match = value.match(/\d+/);
      return match ? Number(match[0]) : null;
    }
    if (typeof value === "object") {
      return (
        this.parseLanguageId(value.id) ||
        this.parseLanguageId(value["@id"]) ||
        this.parseLanguageId(value.value)
      );
    }
    return null;
  }

  getActiveLanguageId() {
    const config = JSON.parse(localStorage.getItem("config") || "{}");
    const session = JSON.parse(localStorage.getItem("session") || "{}");

    return (
      this.parseLanguageId(config.languageId) ||
      this.parseLanguageId(config.language_id) ||
      this.parseLanguageId(config.language) ||
      this.parseLanguageId(session.languageId) ||
      this.parseLanguageId(session.language_id) ||
      this.parseLanguageId(session.language) ||
      1
    );
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
    if (!this.translates || !this.translates[this.language])
      await Promise.all(
        this.stores.map((store) => this.discoveryStoreTranslate(store)),
      );

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