import * as actions from "@controleonline/ui-default/src/store/default/actions";
import * as getters from "@controleonline/ui-default/src/store/default/getters";
import mutations from "@controleonline/ui-default/src/store/default/mutations";

export default {
  namespaced: true,
  state: {
 item:{},
items:[],
    resourceEndpoint: "extra_data",
    isLoading: false,
    error: "",
    
    totalItems: 0,messages:[], message:{},
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
        name: "typeValue",
        align: "left",
        label: "typeValue",
        sum: false,
        format: function (value) {
          return value;
        },
      },
      {
        externalFilter: false,
        sortable: true,
        name: "fieldType",
        align: "left",
        label: "fieldType",
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
      },
      {
        externalFilter: false,
        sortable: true,
        name: "fieldConfigs",
        align: "left",
        label: "fieldConfigs",
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
