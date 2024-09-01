<template>
  <q-select
    v-model="lang"
    :options="langOptions"
    label="Language"
    dense
    borderless
    emit-value
    map-options
    options-dense
  />
</template>

<script>
import Config from "@controleonline/ui-common/src/utils/config";
import Language from "@controleonline/ui-common/src/utils/language";
import { mapActions, mapGetters } from "vuex";

export default {
  components: {
    Config,
    Language,
  },

  data() {
    return {
      config: new Config(),
      language: new Language(this.$i18n),
      lang: null,
      langOptions: [],
    };
  },
  methods: {
    getLanguages() {
      let languages = [];
      this.languages.forEach((language) => {
        languages.push({
          value: language.language,
          label: this.$tt("language", "input", language.language),
        });
      });
      return languages;
    },
    getLanguage() {
      let lang = this.config.getConfig("language");
      return lang == undefined ? this.$i18n.locale : lang;
    },
  },

  created() {
    this.lang = this.getLanguage();
    this.langOptions = this.getLanguages();
  },
  computed: {
    ...mapGetters({
      languages: "language/items",
    }),
  },
  watch: {
    lang(lang) {
      this.config.setConfig("language", lang);
      if (lang) {
        this.$i18n.locale = lang;
        this.$i18n.messages[lang] = this.language.getMessages(lang);
      }
    },
  },
};
</script>
