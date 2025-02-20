export default class Auth {
  constructor(store, router) {
    this.store = store;
    this.router = router;
  }

  logout(noReload = false) {
    this.store.dispatch("auth/logOut");
    if (!noReload) location.reload();
  }
  toLogin() {
    this.$router.push({
      name: "LoginIndex",
    });
  }
  isLogged() {
    return this.user !== null && this.user.api_key;
  }
  user() {
    return this.store.getters["auth/user"];
  }
}
