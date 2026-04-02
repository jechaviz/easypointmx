// Public client-side config for web push.
// To enable: set enabled=true and your OneSignal App ID.
window.EASYPOINT_PUSH_CONFIG = Object.assign(
  {
    enabled: false,
    oneSignalAppId: '',
    serviceWorkerPath: 'OneSignalSDKWorker.js',
    serviceWorkerScope: '',
    defaultTitle: 'Easypoint',
    defaultUrl: ''
  },
  window.EASYPOINT_PUSH_CONFIG || {}
);
