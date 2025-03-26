export default class Translate {
  constructor(defaultCompany, currentCompany, translateActions) {
    const config = JSON.parse(localStorage.getItem('config') || '{}');
    this.translates = this.getTranslates();
    this.language = config.language || 'pt-br';
    this.defaultCompany = defaultCompany;
    this.currentCompany = currentCompany;
    this.translateActions = translateActions;
  }

  t(store, type, key) {
    if (!this.language) return this.formatMessage(key);

    return this.findMessage(
      this.translates,
      store,
      type,
      key,
      this.formatMessage(key),
    );
  }
  async discoveryAll(stores) {
    return new Promise(resolve => {
      Promise.all([
        stores.forEach(store => {
          this.discoveryStoreTranslate(store);
        }),
      ]).then(() => {
        resolve(this.translates);
      });
    });
  }
  async discoveryStoreTranslate(store) {
    return new Promise(resolve => {
      const translates = this.getTranslates();
      if (translates[this.language][store]) {
        resolve(translates);
        return;
      }

      Promise.all([
        this.fetchTranslates(store, this.defaultCompany),
        this.fetchTranslates(store, this.currentCompany),
      ]).then(() => {
        resolve(this.translates);
      });
    });
  }

  fetchTranslates(store, company) {
    return this.translateActions
      .getItems({
        store: store,
        'language.language': this.language,
        people: '/people/' + company.id,
      })
      .then(storeTranslates => {
        storeTranslates.forEach(element => {
          return this.findMessage(
            this.translates,
            element.store,
            element.type,
            element.key,
          );
        });
        this.setTranslates(this.translates);
      });
  }

  findMessage(find, store, type, key, message = null) {
    if (!find[this.language]) find[this.language] = {};
    if (!find[this.language][store]) find[this.language][store] = {};
    if (!find[this.language][store][type])
      find[this.language][store][type] = {};
    if (!find[this.language][store][type][key]) {
      //Adicionar para persistir?
      find[this.language][store][type][key] = message;
    }
    return find[this.language][store][type][key];
  }

  formatMessage(key) {
    if (key === undefined) return '';
    return key
      .replace(/([a-z])([A-Z])/g, '$1_$2')
      .replace(/_/g, ' ')
      .replace(/-/g, ' ')
      .replace(/^\w/, c => c.toUpperCase());
  }

  getTranslates() {
    return JSON.parse(localStorage.getItem('translates') || '{}');
  }
  setTranslates(translates) {
    localStorage.setItem('translates', JSON.stringify(translates));
  }
}
