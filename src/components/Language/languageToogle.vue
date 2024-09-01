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
      langOptions: [
        { value: "en-us", label: "English" },
        { value: "pt-br", label: "Português" },
      ],
    };
  },
  methods: {
    getLanguage() {
      let lang = this.config.getConfig("language");
      return lang == undefined ? this.$i18n.locale : lang;
    },
  },

  created() {
    this.lang = this.getLanguage();
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
