export const installLocalStorage = (config = {language: 'pt-br'}) => {
  const storage = {};

  global.localStorage = {
    getItem(key) {
      return Object.prototype.hasOwnProperty.call(storage, key)
        ? storage[key]
        : null;
    },
    setItem(key, value) {
      storage[key] = String(value);
    },
    removeItem(key) {
      delete storage[key];
    },
  };

  localStorage.setItem('config', JSON.stringify(config));
  localStorage.setItem('translates', JSON.stringify({}));
  delete global.refreshTranslationsUI;
};

export const flushAsync = async () => {
  await Promise.resolve();
  await new Promise(resolve => setTimeout(resolve, 0));
  await new Promise(resolve => setTimeout(resolve, 0));
};

const normalizeLanguage = value =>
  String(value || '')
    .trim()
    .replace(/_/g, '-')
    .toLowerCase();

const normalizeId = value =>
  String(value || '')
    .replace(/\D+/g, '')
    .trim();

export const createPendingTranslateStore = ({getItems, save, resolveQueuedMessages} = {}) => {
  const store = {
    getters: {
      messages: {},
      pendingMessages: {},
    },
    actions: {},
  };

  const translateActions = {
    getItems: getItems || (async () => []),
    save: save || (async payload => payload),
    ...(resolveQueuedMessages
      ? {
          resolveQueuedMessages,
        }
      : {}),
    setMessages: nextMessages => {
      store.getters.messages = nextMessages;
      return nextMessages;
    },
    setPendingMessages: nextMessages => {
      store.getters.pendingMessages = nextMessages;
      return nextMessages;
    },
    queueMissingTranslate: ({language, companyId, store: storeName, type, key, translate}) => {
      const normalizedLanguage = normalizeLanguage(language);
      const normalizedCompanyId = normalizeId(companyId);
      const pendingMessages = store.getters.pendingMessages;

      if (!pendingMessages[normalizedLanguage]) {
        pendingMessages[normalizedLanguage] = {};
      }

      if (!pendingMessages[normalizedLanguage].companies) {
        pendingMessages[normalizedLanguage].companies = {};
      }

      if (!pendingMessages[normalizedLanguage].companies[normalizedCompanyId]) {
        pendingMessages[normalizedLanguage].companies[normalizedCompanyId] = {};
      }

      if (!pendingMessages[normalizedLanguage].companies[normalizedCompanyId][storeName]) {
        pendingMessages[normalizedLanguage].companies[normalizedCompanyId][storeName] = {};
      }

      if (
        !pendingMessages[normalizedLanguage].companies[normalizedCompanyId][storeName][type]
      ) {
        pendingMessages[normalizedLanguage].companies[normalizedCompanyId][storeName][type] =
          {};
      }

      pendingMessages[normalizedLanguage].companies[normalizedCompanyId][storeName][type][
        key
      ] = translate;

      return pendingMessages;
    },
    removePendingTranslate: ({language, companyId, store: storeName, type, key}) => {
      const normalizedLanguage = normalizeLanguage(language);
      const normalizedCompanyId = normalizeId(companyId);
      const pendingMessages = store.getters.pendingMessages;
      const languageBucket = pendingMessages[normalizedLanguage];
      const companyBucket = languageBucket?.companies?.[normalizedCompanyId];
      const storeBucket = companyBucket?.[storeName];
      const typeBucket = storeBucket?.[type];

      if (!typeBucket || !Object.prototype.hasOwnProperty.call(typeBucket, key)) {
        return pendingMessages;
      }

      delete typeBucket[key];

      if (Object.keys(typeBucket).length === 0) {
        delete storeBucket[type];
      }

      if (Object.keys(storeBucket).length === 0) {
        delete companyBucket[storeName];
      }

      if (Object.keys(companyBucket).length === 0) {
        delete languageBucket.companies[normalizedCompanyId];
      }

      if (Object.keys(languageBucket.companies || {}).length === 0) {
        delete languageBucket.companies;
      }

      if (Object.keys(languageBucket).length === 0) {
        delete pendingMessages[normalizedLanguage];
      }

      return pendingMessages;
    },
  };

  store.actions = translateActions;

  return {
    getters: store.getters,
    actions: store.actions,
    get messages() {
      return store.getters.messages;
    },
    get pendingMessages() {
      return store.getters.pendingMessages;
    },
    translateActions,
  };
};

