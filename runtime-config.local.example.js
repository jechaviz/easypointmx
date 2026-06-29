window.EASYPOINT_RUNTIME_CONFIG = Object.assign(
  {},
  window.EASYPOINT_RUNTIME_CONFIG || {},
  {
    pocketBaseUrl: 'http://127.0.0.1:3041',
    // Permite el login demo (DEMO_USERS / DEMO_PWDS) como fallback sin backend.
    // Si se omite: solo activo en localhost y *.github.io. En produccion dejalo en false.
    allowDemoAuth: true
  }
);
