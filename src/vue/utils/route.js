import { route } from "quasar/wrappers";
import {
  createRouter,
  createMemoryHistory,
  createWebHistory,
  createWebHashHistory,
} from "vue-router";
import routes from "src/router/routes";

export default route(function ({ store, ssrContext }) {
  const createHistory = process.env.SERVER
    ? createMemoryHistory
    : process.env.VUE_ROUTER_MODE === "history"
    ? createWebHistory
    : createWebHashHistory;

  const Router = createRouter({
    scrollBehavior: () => ({ left: 0, top: 0 }),
    routes,
    history: createHistory(
      process.env.MODE === "ssr" ? void 0 : process.env.VUE_ROUTER_BASE
    ),
  });

  async function autoLogin() {
    let session = JSON.parse(localStorage.getItem("session")) || {};
    store.dispatch("auth/logIn", session);
    return await store.dispatch("auth/isLogged");
  }

  Router.beforeEach(async (to, from, next) => {
    autoLogin();
    const isLoginPage = from.name == "LoginIndex";
    const isLogged = await store.dispatch("auth/isLogged");

    if (to.name == undefined) return next({ name: "HomeIndex" });

    if (isLoginPage && isLogged && to.query.redirect) next(to.query.redirect);

    if (!to.meta?.isPublic && !isLogged && !isLoginPage)
      return next({ name: "LoginIndex", query: { redirect: to.fullPath } });

    if (!isLogged && isLoginPage) return next(false);

    return next();
  });

  return Router;
});
