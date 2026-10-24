# Homepage ADMIN/MANAGER — app-community#1056

Soft appearance is opt-in for HomePage only. Existing menu routes/parameters, permissions, stores and translations are preserved. App-provided homepage colors and components are used only in this appearance. Default consumers retain their current behavior.

Source: https://github.com/ControleOnline/app-community/issues/1056
Local evidence: 40 homepage tests and 34 runtime footer/zoom tests passed. No production authorization.

## Web login translation bootstrap

Keep the navigation tree mounted while translations initialize. Hide the shell and disable pointer/accessibility interaction until the existing translation readiness contract succeeds. Unmounting navigation during login resets its route and repeatedly mounts/registers the bottom bar, causing React maximum update depth. No route, permission, translation source, theme or zoom changes. Native behavior is unchanged.

Regression evidence: app-community homepage bootstrapNavigation.test.js reproduced maximum update depth before the fix, then passed after it. 44 tests across 9 homepage suites passed. Runtime Dev reproduced the unfixed bug; new runtime verification is required after consuming ui-common 1.2.95.
