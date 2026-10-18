<template>
  <div class="lg">
    <section class="art"><div class="art-in"><img :src="logo" width="52" height="52" alt="" /><h1 class="h1" style="color:#fff;font-size:clamp(2.2rem,4.4vw,3.6rem)">Tu trabajo,<br /><span class="grad">en un solo lugar.</span></h1>
      <p style="color:#cbd5e1;max-width:40ch">Cobra abonos, recolecta efectivo, gestiona tus salidas y atiende a tus clientes. Cada rol ve sólo lo que necesita.</p>
      <ul class="roles"><li v-for="r in roles" :key="r"><ep-ico name="check" :size="16" /> {{ r }}</li></ul></div></section>
    <section class="form">
      <form class="stack" style="--gap:16px;width:min(400px,100%)" @submit.prevent="submit">
        <div><span class="kicker">Panel de trabajo</span><h2 class="h2" style="margin-top:6px">Inicia sesión</h2></div>
        <div class="field"><label for="e">Correo</label><input id="e" class="input" type="email" v-model.trim="email" autocomplete="username" autofocus /></div>
        <div class="field"><label for="p">Contraseña</label><input id="p" class="input" type="password" v-model="pass" autocomplete="current-password" /></div>
        <div class="error" v-if="error">{{ error }}</div>
        <button class="btn btn-primary btn-lg btn-block" :class="{ 'is-loading': busy }"><span v-if="busy" class="spin"></span> Entrar</button>
        <button type="button" class="btn btn-ghost btn-sm" @click="forgot">Olvidé mi contraseña</button>
        <div class="demo stack" style="--gap:8px" v-if="setup.demo_available || !setup.has_admin">
          <a v-if="!setup.has_admin" :href="EP.href('/setup')" class="btn btn-primary btn-block">Configurar mi negocio</a>
          <a v-if="setup.demo_available" :href="EP.root + 'demo/'" class="link small">¿Quieres explorar primero? Entra a la demostración →</a></div>
        <a :href="EP.root + 'website/'" class="link small">← Ir al sitio público</a>
      </form>
    </section>
  </div>
</template>
<script>
export default {
  data() {
    return { EP, logo: EP.root + 'website/icon.svg', email: '', pass: '', busy: false, error: '', setup: { has_admin: true, demo_available: false },
      roles: ['Punto: cobra abonos y vende servicios', 'Chofer: ruta optimizada de recolección', 'Proveedor: manifiesto y liquidaciones', 'Equipo: tickets, aspirantes y economía']
    };
  },
  async mounted() {
    if (EP.demo.active) { this.setup = { has_admin: true, demo_available: false }; return; }
    try { this.setup = await EP.get('/setup/status', { auth: false }); } catch (_) {}
    if (!this.setup.has_admin) EP.go('/setup', true);
  },
  methods: {
    async submit() {
      this.error = ''; if (!this.email || !this.pass) { this.error = 'Escribe tu correo y contraseña.'; return; }
      this.busy = true;
      try { await EP.login(this.email, this.pass); EP.go('/'); } catch (e) { this.error = e.message; } finally { this.busy = false; }
    },
    async forgot() {
      const em = await EP.prompt('Te enviaremos un enlace para elegir una contraseña nueva.', { title: 'Recuperar acceso', value: this.email, type: 'email', placeholder: 'tucorreo@ejemplo.com', ok: 'Enviar enlace' });
      if (em) { try { await EP.post('/auth/reset-request', { email: em }); EP.toast('Si el correo existe, recibirás el enlace en minutos.', 'ok', 6000); } catch (e) { EP.err(e); } }
    }
  }
};
</script>
<style scoped>
.lg { min-height: 100vh; display: grid; grid-template-columns: 1.05fr .95fr; }
.art { position: relative; display: grid; align-items: center; padding: 48px; background: radial-gradient(900px 500px at 80% 0%, rgba(132,204,22,.32), transparent 60%), radial-gradient(700px 400px at 0% 100%, rgba(14,165,164,.25), transparent 60%), #070b14; overflow: hidden; }
.art::before { content: ''; position: absolute; inset: 0; background-image: radial-gradient(rgba(163,230,53,.18) 1.2px, transparent 1.2px); background-size: 34px 34px; mask-image: radial-gradient(circle at 70% 40%, #000, transparent 70%); }
.art-in { position: relative; display: grid; gap: 22px; } .roles { list-style: none; padding: 0; margin: 0; display: grid; gap: 8px; color: #94a3b8; font-size: .92rem; } .roles li { display: flex; gap: 8px; align-items: center; } .roles svg { color: var(--brand); }
.form { display: grid; place-items: center; padding: 32px 20px; }
.demo { padding: 12px; border: 1px dashed var(--line-2); border-radius: var(--r-sm); }
@media (max-width: 860px) { .lg { grid-template-columns: 1fr; } .art { padding: 28px 22px; } .roles { display: none; } }
</style>
