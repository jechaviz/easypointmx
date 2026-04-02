<template>
  <div class="min-h-screen relative flex items-center justify-center overflow-hidden bg-slate-950">
    <div class="absolute inset-0 pointer-events-none">
      <div class="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-brand-500 blur-[120px] opacity-[0.03] animate-pulse"></div>
      <div class="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full bg-blue-700 blur-[140px] opacity-[0.03]"></div>
      <div class="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(132,204,22,0.02),transparent_70%)]"></div>
    </div>

    <div class="relative z-10 w-full max-w-md px-8 animate-fade-in py-8">
      <a :href="websiteHref" class="block text-center mb-8 group transition-all">
        <div class="inline-flex items-center justify-center w-14 h-14 rounded-[1.25rem] bg-slate-900 border border-slate-800 shadow-2xl mb-4 group-hover:scale-105 transition-transform relative overflow-hidden">
          <div class="absolute inset-0 bg-brand-500 opacity-10 blur-xl"></div>
          <i class="bi bi-box-fill text-2xl text-brand-400 relative z-10"></i>
        </div>
        <h1 class="text-2xl font-black text-white tracking-tighter">Easy<span class="text-brand-400">point</span></h1>
        <p class="text-[8px] text-slate-500 font-bold uppercase tracking-[0.4em] mt-1.5">Logistics Excellence</p>
      </a>

      <div class="bg-slate-900/40 backdrop-blur-2xl border border-slate-800 rounded-[2rem] p-8 shadow-[0_32px_100px_-20px_rgba(0,0,0,0.8)] space-y-6 relative overflow-hidden group">
        <div class="absolute -top-24 -left-24 w-48 h-48 bg-brand-500/5 blur-[60px] rounded-full pointer-events-none"></div>

        <div v-if="loadingSettings" class="text-center py-2 h-[40px] flex items-center justify-center">
          <div class="w-4 h-4 border-2 border-brand-500/30 border-t-brand-500 rounded-full animate-spin"></div>
        </div>

        <div v-else-if="testModeEnabled" class="flex flex-col gap-2.5">
          <div class="flex items-center justify-between">
            <span class="text-amber-500 text-[8px] font-black uppercase tracking-[0.2em]">Elige usuario demo</span>
            <i class="bi bi-lightning-charge-fill text-amber-500 text-[9px]"></i>
          </div>
          <select
            @change="fillDemo($event.target.value)"
            class="w-full bg-slate-950 border border-slate-800 text-amber-500 text-[10px] font-bold rounded-xl px-4 py-2 focus:outline-none focus:border-amber-500/50 transition-colors"
          >
            <option value="">-- Selecciona un acceso demo --</option>
            <option value="admin@demo.mx|easypoint123">Admin demo</option>
            <option value="roberto@punto.mx|Punto2024!">Local: Roberto Operador</option>
            <option value="maria@yopmail.com|Punto2024!">Local: La Papeleria</option>
            <option value="driver@easypoint.mx|Punto2024!">Repartidor</option>
            <option value="carlos@sales.mx|Punto2024!">Ventas</option>
          </select>
        </div>

        <form v-if="mode === 'login'" @submit.prevent="handleLogin" class="space-y-4">
          <div class="space-y-1.5">
            <label class="block text-[8px] font-black text-slate-600 uppercase tracking-widest pl-1">Usuario</label>
            <div class="relative group">
              <div class="absolute inset-y-0 left-0 flex items-center pl-4 text-slate-500 group-focus-within:text-brand-400 transition-colors pointer-events-none">
                <i class="bi bi-shield-person text-sm"></i>
              </div>
              <input
                type="email"
                v-model="email"
                required
                autocomplete="email"
                class="w-full bg-slate-950 border border-slate-800 text-white rounded-xl pl-11 pr-4 py-3 text-xs focus:outline-none focus:border-brand-500/50 focus:ring-4 focus:ring-brand-500/5 transition-all placeholder:text-slate-800"
                placeholder="nombre@easypoint.mx"
                :disabled="locked"
              >
            </div>
          </div>

          <div class="space-y-1.5">
            <label class="block text-[8px] font-black text-slate-600 uppercase tracking-widest pl-1">Contraseña</label>
            <div class="relative group">
              <div class="absolute inset-y-0 left-0 flex items-center pl-4 text-slate-500 group-focus-within:text-brand-400 transition-colors pointer-events-none">
                <i class="bi bi-key-fill text-sm"></i>
              </div>
              <input
                :type="showPwd ? 'text' : 'password'"
                v-model="password"
                required
                autocomplete="current-password"
                class="w-full bg-slate-950 border border-slate-800 text-white rounded-xl pl-11 pr-12 py-3 text-xs focus:outline-none focus:border-brand-500/50 focus:ring-4 focus:ring-brand-500/5 transition-all placeholder:text-slate-800"
                placeholder="••••••••"
                :disabled="locked"
              >
              <button type="button" @click="showPwd = !showPwd" class="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-500 hover:text-white transition-colors">
                <i class="bi text-xs" :class="showPwd ? 'bi-eye-slash-fill' : 'bi-eye-fill'"></i>
              </button>
            </div>
          </div>

          <div v-if="locked" class="text-red-400 text-xs flex items-center gap-2 bg-red-900/20 border border-red-900/40 rounded-lg px-3 py-2">
            <i class="bi bi-shield-lock-fill"></i> Espera {{ lockCountdown }}s antes de continuar.
          </div>
          <div v-else-if="errorMsg" class="text-red-400 text-xs flex items-center gap-2 bg-red-900/20 border border-red-900/40 rounded-lg px-3 py-2">
            <i class="bi bi-exclamation-triangle-fill"></i> {{ errorMsg }}
          </div>

          <div class="flex items-center justify-between gap-3">
            <label class="flex items-center gap-2 text-slate-400 text-xs cursor-pointer select-none">
              <input type="checkbox" v-model="rememberMe" class="accent-brand-500">
              Mantener sesion
            </label>
            <div class="flex items-center gap-3">
              <button type="button" @click="switchMode('register')" class="text-[10px] text-slate-400 hover:text-white font-bold uppercase tracking-wider">
                Crear cuenta
              </button>
              <button type="button" @click="switchMode('reset')" class="text-[10px] text-brand-400 hover:text-brand-300 font-bold uppercase tracking-wider">
                Olvide mi contraseña
              </button>
            </div>
          </div>

          <button
            :disabled="loading || locked"
            class="w-full bg-brand-500 text-slate-900 font-black py-3 rounded-xl hover:bg-brand-400 transition-all disabled:opacity-40 flex items-center justify-center gap-2 text-sm shadow-lg shadow-brand-500/20"
          >
            <i v-if="loading" class="bi bi-arrow-repeat animate-spin"></i>
            <i v-else class="bi bi-box-arrow-in-right"></i>
            {{ loading ? 'Verificando...' : 'Iniciar sesion' }}
          </button>
        </form>

        <div v-else-if="mode === 'reset'" class="space-y-3">
          <p class="text-slate-400 text-xs">Ingresa tu correo y recibiras un enlace de recuperacion.</p>
          <div v-if="!resetSent" class="flex gap-2">
            <input
              type="email"
              v-model="resetEmail"
              class="flex-1 bg-slate-900/60 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-brand-500 placeholder:text-slate-600"
              placeholder="tu@correo.com"
            >
            <button @click="handleReset" :disabled="resetLoading" class="bg-brand-500 text-slate-900 font-black px-4 py-2 rounded-xl text-xs hover:bg-brand-400 disabled:opacity-40">
              <i v-if="resetLoading" class="bi bi-arrow-repeat animate-spin"></i>
              <span v-else>Enviar</span>
            </button>
          </div>
          <p v-if="resetMessage" class="text-red-400 text-[10px]">{{ resetMessage }}</p>
          <p v-if="resetSent" class="text-green-400 text-xs font-bold flex items-center gap-2"><i class="bi bi-check-circle-fill"></i> Enlace enviado. Revisa tu bandeja.</p>
          <button @click="switchMode('login')" class="text-slate-500 text-[10px] hover:text-slate-300">← Volver al login</button>
        </div>

        <div v-else class="space-y-4">
          <div v-if="registerSuccess" class="text-center py-6 animate-fade-in">
            <div class="w-16 h-16 rounded-full bg-brand-500/10 text-brand-400 flex items-center justify-center text-3xl mx-auto mb-4">
              <i class="bi bi-person-check-fill"></i>
            </div>
            <h3 class="text-white font-black text-lg mb-2">Solicitud enviada</h3>
            <p class="text-slate-400 text-xs leading-relaxed">
              Tu cuenta quedo pendiente de aprobacion por un admin. Cuando se active, ya podras iniciar sesion.
            </p>
          </div>

          <form v-else @submit.prevent="handleRegister" class="space-y-4">
            <p class="text-slate-400 text-xs leading-relaxed">
              Solicita acceso como <strong class="text-white">Local</strong>, <strong class="text-white">Repartidor</strong> o <strong class="text-white">Ventas</strong>. Tu cuenta quedara pendiente hasta que un admin la apruebe.
            </p>

            <div class="space-y-1.5">
              <label class="block text-[8px] font-black text-slate-600 uppercase tracking-widest pl-1">Nombre completo</label>
              <div class="relative group">
                <div class="absolute inset-y-0 left-0 flex items-center pl-4 text-slate-500 group-focus-within:text-brand-400 transition-colors pointer-events-none">
                  <i class="bi bi-person-vcard-fill text-sm"></i>
                </div>
                <input
                  type="text"
                  v-model="registerForm.full_name"
                  required
                  class="w-full bg-slate-950 border border-slate-800 text-white rounded-xl pl-11 pr-4 py-3 text-xs focus:outline-none focus:border-brand-500/50 focus:ring-4 focus:ring-brand-500/5 transition-all placeholder:text-slate-800"
                  placeholder="Tu nombre y apellido"
                >
              </div>
            </div>

            <div class="space-y-1.5">
              <label class="block text-[8px] font-black text-slate-600 uppercase tracking-widest pl-1">Correo</label>
              <div class="relative group">
                <div class="absolute inset-y-0 left-0 flex items-center pl-4 text-slate-500 group-focus-within:text-brand-400 transition-colors pointer-events-none">
                  <i class="bi bi-envelope-fill text-sm"></i>
                </div>
                <input
                  type="email"
                  v-model="registerForm.email"
                  required
                  autocomplete="email"
                  class="w-full bg-slate-950 border border-slate-800 text-white rounded-xl pl-11 pr-4 py-3 text-xs focus:outline-none focus:border-brand-500/50 focus:ring-4 focus:ring-brand-500/5 transition-all placeholder:text-slate-800"
                  placeholder="nombre@easypoint.mx"
                >
              </div>
            </div>

            <div class="space-y-1.5">
              <label class="block text-[8px] font-black text-slate-600 uppercase tracking-widest pl-1">Rol solicitado</label>
              <select
                v-model="registerForm.role"
                class="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-4 py-3 text-xs focus:outline-none focus:border-brand-500/50 focus:ring-4 focus:ring-brand-500/5 transition-all"
              >
                <option value="operator">Local</option>
                <option value="driver">Repartidor</option>
                <option value="sales">Ventas</option>
              </select>
            </div>

            <div class="space-y-1.5">
              <label class="block text-[8px] font-black text-slate-600 uppercase tracking-widest pl-1">Contraseña</label>
              <div class="relative group">
                <div class="absolute inset-y-0 left-0 flex items-center pl-4 text-slate-500 group-focus-within:text-brand-400 transition-colors pointer-events-none">
                  <i class="bi bi-key-fill text-sm"></i>
                </div>
                <input
                  :type="showRegisterPwd ? 'text' : 'password'"
                  v-model="registerForm.password"
                  required
                  autocomplete="new-password"
                  class="w-full bg-slate-950 border border-slate-800 text-white rounded-xl pl-11 pr-12 py-3 text-xs focus:outline-none focus:border-brand-500/50 focus:ring-4 focus:ring-brand-500/5 transition-all placeholder:text-slate-800"
                  placeholder="Crea una contraseña segura"
                >
                <button type="button" @click="showRegisterPwd = !showRegisterPwd" class="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-500 hover:text-white transition-colors">
                  <i class="bi text-xs" :class="showRegisterPwd ? 'bi-eye-slash-fill' : 'bi-eye-fill'"></i>
                </button>
              </div>
              <div class="mt-2 flex gap-1">
                <div
                  v-for="i in 4"
                  :key="'reg-bar-' + i"
                  class="flex-1 h-1 rounded-full transition-all duration-300"
                  :class="registerPwdStrength >= i ? registerPwdBarColor : 'bg-slate-700'"
                ></div>
              </div>
              <p class="text-[10px] mt-1 font-bold" :class="registerPwdStrengthLabel.color">{{ registerPwdStrengthLabel.text }}</p>
            </div>

            <div class="space-y-1.5">
              <label class="block text-[8px] font-black text-slate-600 uppercase tracking-widest pl-1">Confirmar contraseña</label>
              <div class="relative group">
                <div class="absolute inset-y-0 left-0 flex items-center pl-4 text-slate-500 group-focus-within:text-brand-400 transition-colors pointer-events-none">
                  <i class="bi bi-shield-lock-fill text-sm"></i>
                </div>
                <input
                  :type="showRegisterPwdConfirm ? 'text' : 'password'"
                  v-model="registerForm.passwordConfirm"
                  required
                  autocomplete="new-password"
                  class="w-full bg-slate-950 border border-slate-800 text-white rounded-xl pl-11 pr-12 py-3 text-xs focus:outline-none focus:border-brand-500/50 focus:ring-4 focus:ring-brand-500/5 transition-all placeholder:text-slate-800"
                  placeholder="Repite tu contraseña"
                >
                <button type="button" @click="showRegisterPwdConfirm = !showRegisterPwdConfirm" class="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-500 hover:text-white transition-colors">
                  <i class="bi text-xs" :class="showRegisterPwdConfirm ? 'bi-eye-slash-fill' : 'bi-eye-fill'"></i>
                </button>
              </div>
            </div>

            <ul class="space-y-1">
              <li
                v-for="rule in registerPwdRules"
                :key="rule.label"
                class="flex items-center gap-2 text-[10px] transition-colors"
                :class="rule.ok ? 'text-green-400' : 'text-slate-600'"
              >
                <i class="bi flex-shrink-0" :class="rule.ok ? 'bi-check-circle-fill' : 'bi-circle'"></i>
                {{ rule.label }}
              </li>
            </ul>

            <div v-if="registerError" class="text-red-400 text-xs flex items-center gap-2 bg-red-900/20 border border-red-900/40 rounded-lg px-3 py-2">
              <i class="bi bi-exclamation-triangle-fill"></i> {{ registerError }}
            </div>

            <button
              :disabled="registerLoading"
              class="w-full bg-brand-500 text-slate-900 font-black py-3 rounded-xl hover:bg-brand-400 transition-all disabled:opacity-40 flex items-center justify-center gap-2 text-sm shadow-lg shadow-brand-500/20"
            >
              <i v-if="registerLoading" class="bi bi-arrow-repeat animate-spin"></i>
              <i v-else class="bi bi-person-plus-fill"></i>
              {{ registerLoading ? 'Enviando solicitud...' : 'Solicitar acceso' }}
            </button>
          </form>

          <button @click="switchMode('login')" class="text-slate-500 text-[10px] hover:text-slate-300">← Volver al login</button>
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
const APP_BASE_SEGMENT = '/app';

function getRepoBasePath(pathname = window.location.pathname) {
  const idx = pathname.indexOf(APP_BASE_SEGMENT);
  return idx >= 0 ? pathname.slice(0, idx) : '';
}

function buildPasswordRules(password) {
  const p = password || '';
  return [
    { label: 'Al menos 8 caracteres', ok: p.length >= 8 },
    { label: 'Una letra mayuscula (A-Z)', ok: /[A-Z]/.test(p) },
    { label: 'Un numero (0-9)', ok: /[0-9]/.test(p) },
    { label: 'Un caracter especial (!@#$...)', ok: /[^A-Za-z0-9]/.test(p) }
  ];
}

function strengthLabel(level) {
  return [
    { text: '', color: '' },
    { text: 'Muy debil', color: 'text-red-500' },
    { text: 'Debil', color: 'text-amber-500' },
    { text: 'Buena', color: 'text-yellow-400' },
    { text: 'Fuerte', color: 'text-brand-400' }
  ][level];
}

export default {
  inject: ['login', 'registerUser'],
  data() {
    return {
      websiteHref: `${getRepoBasePath()}/website/`,
      mode: 'login',
      email: '',
      password: '',
      showPwd: false,
      rememberMe: true,
      loading: false,
      errorMsg: '',
      attempts: 0,
      locked: false,
      lockCountdown: 0,
      lockTimer: null,
      resetEmail: '',
      resetLoading: false,
      resetMessage: '',
      resetSent: false,
      registerForm: {
        full_name: '',
        email: '',
        role: 'operator',
        password: '',
        passwordConfirm: ''
      },
      showRegisterPwd: false,
      showRegisterPwdConfirm: false,
      registerLoading: false,
      registerError: '',
      registerSuccess: false,
      testModeEnabled: true,
      loadingSettings: false
    };
  },
  computed: {
    registerPwdRules() {
      return buildPasswordRules(this.registerForm.password);
    },
    registerPwdStrength() {
      return this.registerPwdRules.filter(rule => rule.ok).length;
    },
    registerPwdBarColor() {
      return ['', 'bg-red-500', 'bg-amber-500', 'bg-yellow-400', 'bg-brand-500'][this.registerPwdStrength];
    },
    registerPwdStrengthLabel() {
      return strengthLabel(this.registerPwdStrength);
    },
    registerPwdValid() {
      return this.registerPwdRules.every(rule => rule.ok);
    }
  },
  mounted() {
    this.fetchSettings();
  },
  methods: {
    switchMode(nextMode) {
      this.mode = nextMode;
      this.errorMsg = '';
      this.resetMessage = '';
      if (nextMode !== 'reset') {
        this.resetEmail = '';
        this.resetSent = false;
        this.resetLoading = false;
      }
      if (nextMode !== 'register') {
        this.resetRegisterForm();
      } else {
        this.registerError = '';
      }
    },
    resetRegisterForm() {
      this.registerForm = {
        full_name: '',
        email: '',
        role: 'operator',
        password: '',
        passwordConfirm: ''
      };
      this.showRegisterPwd = false;
      this.showRegisterPwdConfirm = false;
      this.registerLoading = false;
      this.registerError = '';
      this.registerSuccess = false;
    },
    async fetchSettings() {
      try {
        const res = await fetch(`${PB}/api/collections/system_settings/records`);
        const data = await res.json();
        if (data.items && data.items.length > 0) {
          this.testModeEnabled = data.items[0].test_mode === true;
        } else {
          this.testModeEnabled = true;
        }
      } catch (_) {
        this.testModeEnabled = true;
      } finally {
        this.loadingSettings = false;
      }
    },
    fillDemo(value) {
      if (!value) return;
      const [email, pwd] = value.split('|');
      this.switchMode('login');
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
      } catch (e) {
        const message = e?.message || 'No se pudo iniciar sesion.';
        if (/pendiente de aprobaci[oó]n/i.test(message)) {
          this.errorMsg = message;
          return;
        }
        this.attempts++;
        if (this.attempts >= MAX_ATTEMPTS) {
          this.startLockout();
        } else {
          this.errorMsg = `${message} (intento ${this.attempts}/${MAX_ATTEMPTS})`;
        }
      } finally {
        this.loading = false;
      }
    },
    startLockout() {
      this.locked = true;
      this.lockCountdown = LOCKOUT_SECONDS;
      this.errorMsg = '';
      this.lockTimer = setInterval(() => {
        if (--this.lockCountdown <= 0) {
          clearInterval(this.lockTimer);
          this.locked = false;
          this.attempts = 0;
        }
      }, 1000);
    },
    async handleReset() {
      if (!this.resetEmail) return;
      this.resetLoading = true;
      this.resetMessage = '';
      try {
        const res = await fetch(`${PB}/api/collections/users/request-password-reset`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: this.resetEmail })
        });
        if (res.ok || res.status === 204) {
          this.resetSent = true;
        } else {
          this.resetMessage = 'Ocurrio un error. Intenta mas tarde.';
        }
      } catch {
        this.resetMessage = 'No se pudo conectar al servidor.';
      } finally {
        this.resetLoading = false;
      }
    },
    async handleRegister() {
      this.registerError = '';
      if (!this.registerForm.full_name.trim()) {
        this.registerError = 'Ingresa tu nombre completo.';
        return;
      }
      if (!this.registerPwdValid) {
        this.registerError = 'La contraseña no cumple con los requisitos de seguridad.';
        return;
      }
      if (this.registerForm.password !== this.registerForm.passwordConfirm) {
        this.registerError = 'Las contraseñas no coinciden.';
        return;
      }

      this.registerLoading = true;
      try {
        await this.registerUser({
          full_name: this.registerForm.full_name,
          email: this.registerForm.email,
          password: this.registerForm.password,
          role: this.registerForm.role
        });
        this.registerSuccess = true;
        this.registerForm.password = '';
        this.registerForm.passwordConfirm = '';
      } catch (e) {
        this.registerError = e?.message || 'No se pudo completar el registro.';
      } finally {
        this.registerLoading = false;
      }
    }
  },
  beforeUnmount() {
    if (this.lockTimer) clearInterval(this.lockTimer);
  }
};
</script>
