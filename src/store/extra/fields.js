import * as actions from "@controleonline/ui-default/src/store/default/actions";
import * as getters from "@controleonline/ui-default/src/store/default/getters";
import mutations from "@controleonline/ui-default/src/store/default/mutations";

export default {
  namespaced: true,
  state: {
 item:{},
items:[],
filters:{},
    resourceEndpoint: "extra_fields",
    isLoading: false,
    error: "",
    violations: null,
    totalItems: 0,
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
        sum: false,
        format: function (value) {
          return value;
        },
      },
      {
        externalFilter: false,
        sortable: true,
        name: "type",
        align: "left",
        label: "type",
        sum: false,
        list: [
          { value: "text", label: "text" },
          { value: "select", label: "select" },
          { value: "date-range", label: "date-range" },
        ],
        format: function (value) {
          return value;
        },
      },
      {
        externalFilter: false,
        sortable: true,
        name: "required",
        align: "left",
        label: "required",
        sum: false,
        format: function (value) {
          return value;
        },
        saveFormat: function (value) {
          return false;
        },
      },
      {
        externalFilter: false,
        sortable: true,
        name: "configs",
        align: "left",
        label: "configs",
        sum: false,
        format: function (value) {
          return value;
        },
      },
    ],
  },
  actions: actions,
  getters,
  mutations,
};
