<template></template>
<script>
import { mapActions, mapGetters } from "vuex";

export default {
  computed: {
    ...mapGetters({
      defaultCompany: "people/defaultCompany",
    }),
  },
  created() {
    setTimeout(() => {
      console.log(this.$tt.persistMessages);
    }, 5000);
  },
};
</script>
