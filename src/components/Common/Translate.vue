<template></template>
<script>
import { mapActions, mapGetters } from "vuex";
import Config from "@controleonline/ui-common/src/utils/config";
const config = new Config();
export default {
  computed: {
    ...mapGetters({
      defaultCompany: "people/defaultCompany",
    }),
    messages() {
      return this.$i18n.getLocaleMessage(this.getLanguage());
    },
    persistMessages() {
      return this.$translate.persistMessages || {};
    },
    stores() {
      return this.$translate.stores;
    },
    localMessages() {
      return this.$copyObject(this.messages) || {};
    },
  },
  data() {
    return {
      loaded: { [this.getLanguage()]: {} },
    };
  },
  methods: {
    ...mapActions({
      getItems: "translate/getItems",
    }),
    getLanguage() {
      let lang = config.getConfig("language");
      return lang == undefined ? this.$i18n.locale : lang;
    },
    getTranslate(locale, store) {
      this.loaded[locale][store] = true;

      this.getItems({ "language.language": locale, store }).then((data) => {
        if (
          typeof data === "object" &&
          data !== null &&
          Object.keys(data).length > 0
        ) {
          data.forEach((translate, i) => {
            if (!this.localMessages[translate.store])
              this.localMessages[translate.store] = {};
            if (!this.localMessages[translate.store][translate.type])
              this.localMessages[translate.store][translate.type] = {};

            this.localMessages[translate.store][translate.type][translate.key] =
              translate.translate;

            if (!this.persistMessages[locale])
              this.persistMessages[locale] = {};
            if (!this.persistMessages[locale][translate.store])
              this.persistMessages[locale][translate.store] = {};
            if (!this.persistMessages[locale][translate.store][translate.type])
              this.persistMessages[locale][translate.store][translate.type] =
                {};
            if (
              !this.persistMessages[locale][translate.store][translate.type][
                translate.key
              ]
            )
              this.persistMessages[locale][translate.store][translate.type][
                translate.key
              ] = {};

            delete this.persistMessages[locale][translate.store][
              translate.type
            ][translate.key];
          });
          this.$i18n.setLocaleMessage(locale, this.localMessages);
        }
      });
    },
  },
  created() {},
  watch: {
    stores: {
      handler: function (stores) {
        if (!this.loaded[this.getLanguage()])
          this.loaded[this.getLanguage()] = [];
        Object.values(stores[this.getLanguage()] || []).forEach((store) => {
          if (!this.loaded[this.getLanguage()][store])
            this.getTranslate(this.getLanguage(), store);
        });
      },
      deep: true,
    },
    persistMessages: {
      handler: function (persistMessages) {
        console.log(this.$copyObject(persistMessages));
      },
      deep: true,
    },
  },
};
</script>
