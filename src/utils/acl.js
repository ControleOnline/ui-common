import { api } from "@controleonline/ui-common/src/api";

import { LocalStorage } from "quasar";

export default class acl {
  constructor(router) {
    this.router = router;
  }

  getPermissions() {
    let storedUser = LocalStorage.getItem("session") || {};
    return storedUser.actions ? storedUser.actions[this.router.name] : {};
  }

  fetchPermission() {
    let storedUser = LocalStorage.getItem("session");
    let route = storedUser.route;
    if (!storedUser.actions) storedUser.actions = {};

    if (storedUser.mycompany && route)
      return api
        .fetch(`/actions/people`, {
          params: { myCompany: storedUser.mycompany, route: route },
        })
        .then((result) => {
          storedUser.actions[route] = result.response
            ? result.response.data
            : {};
          LocalStorage.set("session", storedUser);
        });
  }

  hasPermission(permission) {
    let permissions = this.getPermissions();
    if (Object.values(permissions).indexOf(permission) > -1) {
      return true;
    }
    return false;
  }
}
