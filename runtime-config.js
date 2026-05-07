// Public runtime config shared by the website and the operator app.
// Load order:
// 1. runtime-config.js
// 2. runtime-config.generated.js
// 3. runtime-config.local.js
window.EASYPOINT_RUNTIME_CONFIG = Object.assign(
  {
    pocketBaseUrl: window.location.origin
  },
  window.EASYPOINT_RUNTIME_CONFIG || {}
);
