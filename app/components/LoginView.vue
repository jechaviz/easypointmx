<template>
  <div class="min-h-screen relative flex items-center justify-center overflow-hidden bg-slate-950">
    <!-- Premium Background Effects -->
    <div class="absolute inset-0 pointer-events-none">
      <div class="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-brand-500 blur-[120px] opacity-[0.03] animate-pulse"></div>
      <div class="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full bg-blue-700 blur-[140px] opacity-[0.03]"></div>
      <div class="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(132,204,22,0.02),transparent_70%)]"></div>
    </div>

    <div class="relative z-10 w-full max-w-md px-8 animate-fade-in py-8">

      <!-- Logo (Elite Styling - Compact) -->
      <a href="/easypoint/website/" class="block text-center mb-8 group transition-all">
        <div class="inline-flex items-center justify-center w-14 h-14 rounded-[1.25rem] bg-slate-900 border border-slate-800 shadow-2xl mb-4 group-hover:scale-105 transition-transform relative overflow-hidden">
           <div class="absolute inset-0 bg-brand-500 opacity-10 blur-xl"></div>
           <i class="bi bi-box-fill text-2xl text-brand-400 relative z-10"></i>
        </div>
        <h1 class="text-2xl font-black text-white tracking-tighter">Easy<span class="text-brand-400">point</span></h1>
        <p class="text-[8px] text-slate-500 font-bold uppercase tracking-[0.4em] mt-1.5">Logistics Excellence</p>
      </a>

      <!-- Form Card (Premium Glass - Compact) -->
      <div class="bg-slate-900/40 backdrop-blur-2xl border border-slate-800 rounded-[2rem] p-8 shadow-[0_32px_100px_-20px_rgba(0,0,0,0.8)] space-y-6 relative overflow-hidden group">
        <div class="absolute -top-24 -left-24 w-48 h-48 bg-brand-500/5 blur-[60px] rounded-full pointer-events-none"></div>

        <!-- Test selector (Premium Redesign - Compact) -->
        <div v-if="loadingSettings" class="text-center py-2 h-[40px] flex items-center justify-center">
          <div class="w-4 h-4 border-2 border-brand-500/30 border-t-brand-500 rounded-full animate-spin"></div>
        </div>
        <div v-else-if="testModeEnabled" class="flex flex-col gap-2.5">
          <div class="flex items-center justify-between">
            <span class="text-amber-500 text-[8px] font-black uppercase tracking-[0.2em]">Entorno de Pruebas</span>
            <i class="bi bi-lightning-charge-fill text-amber-500 text-[9px]"></i>
          </div>
          <select @change="fillDemo($event.target.value)"
            class="w-full bg-slate-950 border border-slate-800 text-amber-500 text-[10px] font-bold rounded-xl px-4 py-2 focus:outline-none focus:border-amber-500/50 transition-colors">
            <option value="">— Auto-completar —</option>
            <option value="admin@demo.mx|easypoint123">🛡️ Admin (Acceso Total)</option>
            <option value="roberto@punto.mx|Punto2024!">📦 Local: Roberto Operador</option>
            <option value="maria@yopmail.com|Punto2024!">📦 Local: La Papelería</option>
            <option value="driver@easypoint.mx|Punto2024!">🚚 Repartidor</option>
            <option value="carlos@sales.mx|Punto2024!">🚀 Ventas (Acquisition)</option>
          </select>
        </div>

        <form @submit.prevent="handleLogin" class="space-y-4">
          <!-- Email (Premium - Compact) -->
          <div class="space-y-1.5">
            <label class="block text-[8px] font-black text-slate-600 uppercase tracking-widest pl-1">Identidad de Acceso</label>
            <div class="relative group">
              <div class="absolute inset-y-0 left-0 flex items-center pl-4 text-slate-500 group-focus-within:text-brand-400 transition-colors pointer-events-none"><i class="bi bi-shield-person text-sm"></i></div>
              <input type="email" v-model="email" required autocomplete="email"
                class="w-full bg-slate-950 border border-slate-800 text-white rounded-xl pl-11 pr-4 py-3 text-xs focus:outline-none focus:border-brand-500/50 focus:ring-4 focus:ring-brand-500/5 transition-all placeholder:text-slate-800"
                placeholder="nombre@easypoint.mx" :disabled="locked">
            </div>
          </div>

          <!-- Password (Premium - Compact) -->
          <div class="space-y-1.5">
            <label class="block text-[8px] font-black text-slate-600 uppercase tracking-widest pl-1">Clave de Seguridad</label>
            <div class="relative group">
              <div class="absolute inset-y-0 left-0 flex items-center pl-4 text-slate-500 group-focus-within:text-brand-400 transition-colors pointer-events-none"><i class="bi bi-key-fill text-sm"></i></div>
              <input :type="showPwd ? 'text' : 'password'" v-model="password" required autocomplete="current-password"
                class="w-full bg-slate-950 border border-slate-800 text-white rounded-xl pl-11 pr-12 py-3 text-xs focus:outline-none focus:border-brand-500/50 focus:ring-4 focus:ring-brand-500/5 transition-all placeholder:text-slate-800"
                placeholder="••••••••" :disabled="locked">
              <button type="button" @click="showPwd = !showPwd" class="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-500 hover:text-white transition-colors">
                <i class="bi text-xs" :class="showPwd ? 'bi-eye-slash-fill' : 'bi-eye-fill'"></i>
              </button>
            </div>
          </div>

          <!-- Rate limit -->
          <div v-if="locked" class="text-red-400 text-xs flex items-center gap-2 bg-red-900/20 border border-red-900/40 rounded-lg px-3 py-2">
            <i class="bi bi-shield-lock-fill"></i> Espera {{ lockCountdown }}s antes de continuar.
          </div>
          <div v-else-if="errorMsg" class="text-red-400 text-xs flex items-center gap-2 bg-red-900/20 border border-red-900/40 rounded-lg px-3 py-2">
            <i class="bi bi-exclamation-triangle-fill"></i> {{ errorMsg }}
          </div>

          <div class="flex items-center justify-between">
            <label class="flex items-center gap-2 text-slate-400 text-xs cursor-pointer select-none">
              <input type="checkbox" v-model="rememberMe" class="accent-brand-500">
              Mantener sesión
            </label>
            <button type="button" @click="mode = 'reset'; resetMessage = ''; resetSent = false"
              class="text-[10px] text-brand-400 hover:text-brand-300 font-bold uppercase tracking-wider">
              ¿Olvidaste tu contraseña?
            </button>
          </div>

          <button :disabled="loading || locked"
            class="w-full bg-brand-500 text-slate-900 font-black py-3 rounded-xl hover:bg-brand-400 transition-all disabled:opacity-40 flex items-center justify-center gap-2 text-sm shadow-lg shadow-brand-500/20">
            <i v-if="loading" class="bi bi-arrow-repeat animate-spin"></i>
            <i v-else class="bi bi-box-arrow-in-right"></i>
            {{ loading ? 'Verificando...' : 'Iniciar Sesión' }}
          </button>
        </form>

        <!-- Forgot password inline -->
        <div v-if="mode === 'reset'" class="border-t border-slate-700 pt-4 space-y-3">
          <p class="text-slate-400 text-xs">Ingresa tu correo y recibirás un enlace de recuperación.</p>
          <div v-if="!resetSent" class="flex gap-2">
            <input type="email" v-model="resetEmail" class="flex-1 bg-slate-900/60 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-brand-500 placeholder:text-slate-600" placeholder="tu@correo.com">
            <button @click="handleReset" :disabled="resetLoading" class="bg-brand-500 text-slate-900 font-black px-4 py-2 rounded-xl text-xs hover:bg-brand-400 disabled:opacity-40">
              <i v-if="resetLoading" class="bi bi-arrow-repeat animate-spin"></i>
              <span v-else>Enviar</span>
            </button>
          </div>
          <p v-if="resetMessage" class="text-red-400 text-[10px]">{{ resetMessage }}</p>
          <p v-if="resetSent" class="text-green-400 text-xs font-bold flex items-center gap-2"><i class="bi bi-check-circle-fill"></i> ¡Enlace enviado! Revisa tu bandeja.</p>
          <button v-if="resetSent" @click="mode = 'login'" class="text-slate-500 text-[10px] hover:text-slate-300">← Volver al login</button>
        </div>

      </div>

      <p class="text-center mt-4 text-slate-700 text-[10px]">Easypoint.mx © 2026 · v3.0</p>
    </div>
  </div>
</template>

<script>
const PB = 'http://127.0.0.1:8090';
const MAX_ATTEMPTS = 5;
const LOCKOUT_SECONDS = 30;

export default {
  inject: ['login'],
  data() {
    return {
      mode: 'login',
      email: '', password: '', showPwd: false, rememberMe: true,
      loading: false, errorMsg: '',
      attempts: 0, locked: false, lockCountdown: 0, lockTimer: null,
      resetEmail: '', resetLoading: false, resetMessage: '', resetSent: false,
      testModeEnabled: true, loadingSettings: false
    }
  },
  mounted() {
    this.fetchSettings();
  },
  methods: {
    async fetchSettings() {
      try {
        const res = await fetch(`${PB}/api/collections/system_settings/records`);
        const data = await res.json();
        if (data.items && data.items.length > 0) {
          this.testModeEnabled = data.items[0].test_mode === true;
        } else {
          // No settings record — default to showing the selector
          this.testModeEnabled = true;
        }
      } catch (e) {
        // Fallback: always show selector (demo environment)
        this.testModeEnabled = true;
      } finally {
        this.loadingSettings = false;
      }
    },
    fillDemo(value) {
      if (!value) return;
      const [email, pwd] = value.split('|');
      this.email = email;
      this.password = pwd;
    },
    async handleLogin() {
      if (this.locked) return;
      this.loading = true;
      this.errorMsg = '';
      try {
        await this.login(this.email, this.password, this.rememberMe);
        this.attempts = 0;
      } catch(e) {
        this.attempts++;
        if (this.attempts >= MAX_ATTEMPTS) {
          this.startLockout();
        } else {
          this.errorMsg = `${e.message} (intento ${this.attempts}/${MAX_ATTEMPTS})`;
        }
      } finally {
        this.loading = false;
      }
    },
    startLockout() {
      this.locked = true; this.lockCountdown = LOCKOUT_SECONDS; this.errorMsg = '';
      this.lockTimer = setInterval(() => {
        if (--this.lockCountdown <= 0) { clearInterval(this.lockTimer); this.locked = false; this.attempts = 0; }
      }, 1000);
    },
    async handleReset() {
      if (!this.resetEmail) return;
      this.resetLoading = true; this.resetMessage = '';
      try {
        const res = await fetch(`${PB}/api/collections/users/request-password-reset`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: this.resetEmail })
        });
        if (res.ok || res.status === 204) { this.resetSent = true; }
        else { this.resetMessage = 'Ocurrió un error. Intenta más tarde.'; }
      } catch { this.resetMessage = 'No se pudo conectar al servidor.'; }
      finally { this.resetLoading = false; }
    }
  },
  beforeUnmount() { if (this.lockTimer) clearInterval(this.lockTimer); }
}
</script>
