import * as actions from "@controleonline/ui-default/src/store/default/actions";
import * as getters from "@controleonline/ui-default/src/store/default/getters";
import mutations from "@controleonline/ui-default/src/store/default/mutations";


export default {
  namespaced: true,
  state: {
    item: {},
    items: [],
    resourceEndpoint: "statuses",
    isLoading: false,
    error: "",
    totalItems: 0, messages: [], message: {},
    filters: {},
    columns: [
      {
        editable: false,
        isIdentity: true,
        sortable: true,
        name: "id",
        align: "left",
        label: "id",
        sum: false,
        format: function (value) {
          return "#" + value;
        },
      },
      {
        translate: true,
        externalFilter: false,
        sortable: true,
        name: "status",
        align: "left",
        label: "status",
        sum: false,
        format: function (value) {
          return value;
        },
      },
      {
        sortable: true,
        name: "color",
        align: "left",
        label: "color",
        inputType: "color",
        format: function (value) {
          return value;
        },
      },
      {
        translate: true,
        sortable: true,
        name: "realStatus",
        align: "left",
        label: "realStatus",
        format: function (value) {
          return value;
        },
      }
    ],
  },
  actions: actions,
  getters,
  mutations,
};
