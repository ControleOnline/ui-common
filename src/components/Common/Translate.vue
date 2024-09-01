<template></template>
<script>
import { computed, reactive } from "vue";

import { mapActions, mapGetters } from "vuex";
import { i18n } from "boot/i18n";

export default {
  computed: {
    ...mapGetters({
      defaultCompany: "people/defaultCompany",
    }),
    messages() {
      return this.$i18n.getLocaleMessage(this.$i18n.locale);
    },
    persistMessages() {
      return this.$translate.persistMessages;
    },
    stores() {
      return reactive(this.$translate.stores);
    },
    locale() {
      return this.$i18n.locale;
    },
  },
  data() {
    return {
      loaded: { [this.$i18n.locale]: {} },
    };
  },
  methods: {
    ...mapActions({
      getItems: "translate/getItems",
    }),
    getTranslate(locale, store) {
      this.loaded[locale][store] = true;
      let localMessages = this.messages;
      let remoteMessages = {};

      this.getItems({ locale, store }).then((result) => {
        remoteMessages = {
          people: {
            tab: { details: "fffff" },
          },
        };
        this.$i18n.setLocaleMessage(locale, { ...localMessages, ...remoteMessages });
      });
    },
  },
  created() {},
  watch: {
    stores: {
      handler: function (stores) {
        Object.values(stores[this.locale]).forEach((store) => {
          if (!this.loaded[this.locale][store])
            this.getTranslate(this.locale, store);
        });
      },
      deep: true,
    },
  },
};
</script>
