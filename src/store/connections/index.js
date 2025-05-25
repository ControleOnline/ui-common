import * as actions from "@controleonline/ui-default/src/store/default/actions";
import * as getters from "@controleonline/ui-default/src/store/default/getters";
import mutations from "@controleonline/ui-default/src/store/default/mutations";
import * as customActions from "./customActions";

export default {
  namespaced: true,
  state: {
    item: {},
    items: [],
    resourceEndpoint: "connections",
    isLoading: false,
    reload: false,
    error: "",
    totalItems: 0,
    messages: [],
    message: {},
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
        externalFilter: false,
        sortable: true,
        name: "name",
        align: "left",
        label: "name",
        format: function (value) {
          return value;
        },
      },
      {
        sortable: true,
        editable: false,
        name: "channel",
        align: "left",
        label: "channel",
        format: function (value) {
          return value;
        },
      },
      {
        editable: false,
        externalFilter: false,
        sortable: true,
        name: "status",
        align: "left",
        label: "status",
        list: "status/getItems",
        searchParam: "status",
        format: function (value) {
          return value?.status;
        },
        saveFormat: function (value) {
          return value ? "/statuses/" + (value.value || value) : null;
        },
      },
      {
        name:"connection"
      }
    ],
    print: [],
  },
  actions: { ...actions, ...customActions },
  getters,
  mutations,
};
