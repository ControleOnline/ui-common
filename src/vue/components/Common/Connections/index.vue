<template>
  <DefaultTable :configs="configs" />
</template>

<script>
import { mapGetters, mapActions } from "vuex";
import CreateConnection from "./CreateConnection";

export default {
  components: { CreateConnection },
  props: {
    currentPerson: {
      required: true,
    },
  },
  data() {
    return {};
  },
  computed: {
    ...mapGetters({
      myCompany: "people/currentCompany",
      defaultCompany: "people/defaultCompany",
      companies: "people/companies",
    }),
    configs() {
      return {
        externalFilters: false,
        store: "connections",
        status: ["connections"],
        companyParam: "people",
        add: false,
        delete: false,
        filters: true,
        selection: false,
        search: true,
        components: {
          headerActions: [
            {
              component: this.$components.DefaultButtonDialog,
              configs: {
                component: CreateConnection,
                store: "connections",
                label: "connections",
                icon: "add",
              },
            },
          ],
        },
      };
    },
  },
  created() {},
  methods: {
    ...mapActions({}),
    init() {},
  },
};
</script>
<style scoped></style>
