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

    // ALEMAC // 10/03/2026 // dedupe…
    // Evita repetir save da mesma chave ausente no mesmo ciclo de execução.
    this.missingTranslateSaveAttempts = new Set();

    // ALEMAC // 10/03/2026 //
    // Fila para persistir traducoes faltantes fora do ciclo de render.
    this.missingTranslateQueue = new Map();
    this.missingTranslateFlushScheduled = false;
  }

  getMissingTranslateCacheKey(store, type, key) {
    return [this.language, this.defaultCompany?.id, store, type, key].join("|");
  }

  // ALEMAC // 10/03/2026 //
  // Enfileira persistencia para evitar side-effect durante render.
  queueMissingTranslatePersist(store, type, key, translate) {
    const cacheKey = this.getMissingTranslateCacheKey(store, type, key);
    if (this.missingTranslateSaveAttempts.has(cacheKey)) return;

    this.missingTranslateSaveAttempts.add(cacheKey);
    this.missingTranslateQueue.set(cacheKey, { store, type, key, translate });
    this.scheduleMissingTranslateFlush();
  }

  // ALEMAC // 10/03/2026 //
  // Agenda flush assincrono para rodar apos o render atual.
  scheduleMissingTranslateFlush() {
    if (this.missingTranslateFlushScheduled) return;
    this.missingTranslateFlushScheduled = true;

    setTimeout(() => {
      this.missingTranslateFlushScheduled = false;
      this.flushMissingTranslateQueue();
    }, 0);
  }

  // ALEMAC // 10/03/2026 //
  // Processa fila de traducoes faltantes de forma agrupada.
  flushMissingTranslateQueue() {
    if (!this.missingTranslateQueue.size) return;

    const queued = Array.from(this.missingTranslateQueue.values());
    this.missingTranslateQueue.clear();

    queued.forEach(({ store, type, key, translate }) => {
      this.persistMissingTranslate(store, type, key, translate);
    });
  }

  // ALEMAC // 10/03/2026 //
  // Descobre o people_id do usuario logado a partir da sessao local.
  getLoggedUserPeopleId() {
    try {
      const session = JSON.parse(localStorage.getItem("session") || "{}");
      const candidates = [
        session?.people,
        session?.user?.people,
        session?.user?.people?.id,
        session?.person,
      ];

      for (const candidate of candidates) {
        const parsed = Number(String(candidate || "").replace(/\D/g, ""));
        if (parsed > 0) return parsed;
      }
    } catch (e) {
      return null;
    }

    return null;
  }

  getLoggedUserId() {
    try {
      const session = JSON.parse(localStorage.getItem("session") || "{}");
      const candidates = [session?.user?.id, session?.id, session?.user_id];

      for (const candidate of candidates) {
        const parsed = Number(String(candidate || "").replace(/\D/g, ""));
        if (parsed > 0) return parsed;
      }
    } catch (e) {
      return null;
    }

    return null;
  }

  // ALEMAC // 10/03/2026 //
  // Save permitido apenas para empresa ativa e diferente do people do usuario logado.
  canSaveMissingTranslate(targetPeopleId) {
    const targetId = Number(targetPeopleId);
    if (!targetId) return false;

    const currentCompanyId = Number(this.currentCompany?.id);
    const loggedUserPeopleId = Number(this.getLoggedUserPeopleId());

    if (!currentCompanyId || currentCompanyId !== targetId) return false;
    if (loggedUserPeopleId && currentCompanyId === loggedUserPeopleId)
      return false;

    return true;
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
      this.queueMissingTranslatePersist(store, type, key, translate);
    }

    return translate;
  }

  reload() {
    this.clear();

    // ALEMAC // 10/03/2026 // carrega numa única query 
    // todas as traduções do usuário, ao invés de carregar por store, 
    // para evitar múltiplas chamadas à API e melhorar a performance.
    //this.discoveryAll();
    this.discoveryAllAtOnce();

  }

  clear() {
    this.translates = {};
    this.missingTranslateSaveAttempts.clear();
    this.missingTranslateQueue.clear();
    this.missingTranslateFlushScheduled = false;
    localStorage.setItem("translates", "{}");
  }

  // Método para descobrir todas as traduções de uma vez
  async discoveryAll() {
    if (!this.translates || !this.translates[this.language]) {
      for (const store of this.stores) {
        await this.discoveryStoreTranslate(store);
      }
    }

    return this.translates;
  }


  // Método para descobrir traduções de um store específico
  async discoveryStoreTranslate(store) {
    if (!this.translates[this.language]) this.translates[this.language] = {};
    if (this.translates[this.language][store]) return this.translates;

    await this.fetchTranslates(store, this.defaultCompany);
    await this.fetchTranslates(store, this.currentCompany);
    return this.translates;
  }

  fetchTranslates(store, company) {
    if (!company?.id) return Promise.resolve([]);

    const params = {
      "language.language": this.language,
      people: "/people/" + company.id,
      itemsPerPage: 1500,
    };

    if (store) {
      params.store = store;
    }

    return this.translateActions
      .getItems(params)
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
              currentTranslates[this.language]?.[element.store || store]?.[element.type]?.[
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
