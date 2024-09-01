import { i18n } from "boot/i18n";
import { computed } from "vue";

const currentLocale = computed(() => i18n.global.locale);

export default class Translate {
  persistMessages = {};

  translate(store, key, type) {
    return this.getMessage(store, type, key);
  }

  setMessage(store, type, key, message) {
    let locale = currentLocale.value;
    let messages = i18n.global.getLocaleMessage(locale);

    if (!messages[store]) messages[store] = {};
    if (!messages[store][type]) messages[store][type] = {};
    if (messages[store][type][key]) return;

    messages[store][type][key] = message;
    i18n.global.setLocaleMessage(locale, messages);

    return this.setPersistMessage(locale, store, type, key, message);
  }
  setPersistMessage(locale, store, type, key, message) {
    if (!this.persistMessages[locale]) this.persistMessages[locale] = {};
    if (!this.persistMessages[locale][store])
      this.persistMessages[locale][store] = {};
    if (!this.persistMessages[locale][store][type])
      this.persistMessages[locale][store][type] = {};
    this.persistMessages[locale][store][type][key] = message;

    return message;
  }
  getMessage(store, type, key) {
    if (i18n.global.te(store + "." + type + "." + key))
      return i18n.global.t(store + "." + type + "." + key);
    else if (i18n.global.te("default." + type + "." + key))
      return i18n.global.t("default." + type + "." + key);

    return this.setMessage(
      store,
      type,
      key,
      this.getEmptyMessage(store, type, key)
    );
  }

  getEmptyMessage(store, type, key) {
    return i18n.global.t(store + "." + type + "." + key);
  }
}
