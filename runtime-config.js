// Configuración pública compartida por el sitio y la app. Orden de carga:
//  1. runtime-config.js   2. runtime-config.generated.js (servidor de desarrollo)   3. runtime-config.local.js
window.EASYPOINT_RUNTIME_CONFIG = Object.assign(
  {
    assetVersion: '2.0.0',
    contactWhatsapp: '',
    onesignalAppId: ''
  },
  window.EASYPOINT_RUNTIME_CONFIG || {}
);
