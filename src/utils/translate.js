import { i18n } from "boot/i18n";
import { computed, reactive } from "vue";

const locale = computed(() => i18n.global.locale).value;

export default class Translate {
  persistMessages = reactive({});
  stores = reactive({[locale]:[]});

  translate(store, type, key) {
   if (!this.stores[locale].includes(store)) this.stores[locale].push(store);
    return this.getMessage(store, type, key);
  }

  setMessage(store, type, key, message) {
    let messages = i18n.global.getLocaleMessage(locale);

    if (!messages[store]) messages[store] = {};
    if (!messages[store][type]) messages[store][type] = {};
    if (messages[store][type][key]) return;

    messages[store][type][key] = message;
    i18n.global.setLocaleMessage(locale, messages);

    return this.setPersistMessage(store, type, key, message);
  }
  
  setPersistMessage(store, type, key, message) {
    if (!this.persistMessages[locale]) this.persistMessages[locale] = {};
    if (!this.persistMessages[locale][store])
      this.persistMessages[locale][store] = {};
    if (!this.persistMessages[locale][store][type])
      this.persistMessages[locale][store][type] = {};
    this.persistMessages[locale][store][type][key] = message;

    return message;
  }

  getMessage(store, type, key) {
    if (i18n.global.te(store + "." + type + "." + key, locale))
      return i18n.global.t(store + "." + type + "." + key);
    else if (i18n.global.te("default." + type + "." + key, locale))
      return i18n.global.t("default." + type + "." + key);

    this.setMessage(store, type, key, this.formatMessage(key));
    return this.getEmptyMessage(store, type, key);
  }

  formatMessage(key) {
    if (key === undefined) return "";
    return key
      .replace(/([a-z])([A-Z])/g, "$1_$2")
      .replace(/_/g, " ")
      .replace(/^\w/, (c) => c.toUpperCase());
  }

  getEmptyMessage(store, type, key) {
    return i18n.global.t(store + "." + type + "." + key);
  }
}
