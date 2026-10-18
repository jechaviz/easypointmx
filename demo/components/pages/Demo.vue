<template>
  <div class="dm">
    <section class="art">
      <div class="art-in">
        <img :src="EP.root + 'website/icon.svg'" width="52" height="52" alt="" />
        <span class="kicker" style="color:#a3e635">Entorno de demostración</span>
        <h1 class="h1" style="color:#fff;font-size:clamp(2.1rem,4.2vw,3.4rem)">Prueba Easypoint<br /><span class="grad">sin tocar nada real.</span></h1>
        <ul class="pts">
          <li><ep-ico name="shield-check" :size="18" /> <span><b>Aislada:</b> otra base de datos. Lo que hagas aquí no existe en el negocio real.</span></li>
          <li><ep-ico name="cash" :size="18" /> <span><b>Pagos simulados:</b> reserva, abona, cancela y reprograma sin mover dinero.</span></li>
          <li><ep-ico name="users" :size="18" /> <span><b>Todos los roles:</b> entra como administrador, punto, chofer, proveedor, ventas o soporte.</span></li>
          <li><ep-ico name="zap" :size="18" /> <span><b>Reiniciable:</b> con un clic regresa a los datos de ejemplo.</span></li>
        </ul>
      </div>
    </section>

    <section class="side">
      <div class="stack" style="--gap:16px;width:min(480px,100%)">
        <template v-if="!EP.demo.active">
          <form class="stack" style="--gap:14px" @submit.prevent="enter">
            <div><span class="kicker">Acceso restringido</span><h2 class="h2" style="margin-top:6px">Contraseña de la demostración</h2><p class="muted small mt-1">Te la dio quien te invitó a probar Easypoint.</p></div>
            <div class="field"><label for="pw">Contraseña</label><input id="pw" class="input" type="password" v-model="pw" autocomplete="off" autofocus /></div>
            <div class="error" v-if="error">{{ error }}</div>
            <button class="btn btn-primary btn-lg btn-block" :class="{ 'is-loading': busy }"><span v-if="busy" class="spin"></span> Entrar a la demo</button>
            <a :href="EP.root + 'website/'" class="link small">← Ir al sitio</a>
          </form>
        </template>
        <template v-else>
          <div><span class="kicker">Demostración activa</span><h2 class="h2" style="margin-top:6px">¿Con qué rol quieres entrar?</h2><p class="muted small mt-1">Cada rol ve su propio "Hoy" con lo que tiene pendiente.</p></div>
          <div class="grid" style="grid-template-columns:repeat(auto-fill,minmax(210px,1fr));--gap:10px">
            <button v-for="r in roles" :key="r.email" class="role card card-pad" :class="{ 'is-loading': going === r.email }" @click="go(r)">
              <ep-ico :name="r.icon" :size="22" /><b>{{ r.label }}</b><span class="tiny muted">{{ r.hint }}</span>
            </button>
          </div>
          <div class="row wrap" style="gap:8px">
            <a class="btn btn-soft" :href="EP.root + 'website/'"><ep-ico name="globe" :size="16" /> Ver el sitio público como cliente</a>
          </div>
          <details class="muted small" v-if="EP.demo.password"><summary>Credenciales de las cuentas</summary>
            <div class="mt-1">Contraseña común: <code>{{ EP.demo.password }}</code></div>
            <ul class="mt-1"><li v-for="a in EP.demo.accounts" :key="a.email"><code>{{ a.email }}</code> · {{ a.label }}</li></ul>
          </details>
        </template>
      </div>
    </section>
  </div>
</template>
<script>
const META = {
  'admin@easypoint.mx': ['shield-check', 'Administrador', 'Economía, efectivo, riesgo, automatización'],
  'punto@easypoint.mx': ['pin', 'Punto (papelería)', 'Cobra abonos, vende y recibe paquetes'],
  'chofer@easypoint.mx': ['route', 'Chofer', 'Ruta de recolección del día'],
  'proveedor@easypoint.mx': ['mountain', 'Proveedor', 'Salidas, manifiesto y liquidaciones'],
  'ventas@easypoint.mx': ['store', 'Ventas', 'Aspirantes y campañas'],
  'soporte@easypoint.mx': ['message', 'Soporte', 'Tickets con SLA']
};
export default {
  data() { return { EP, pw: '', busy: false, error: '', going: '' }; },
  computed: { roles() { return EP.demo.accounts.map((a) => { const m = META[a.email] || ['user', a.label, '']; return { email: a.email, icon: m[0], label: m[1], hint: m[2] }; }); } },
  methods: {
    async enter() {
      this.error = ''; if (!this.pw) { this.error = 'Escribe la contraseña.'; return; }
      this.busy = true;
      try { await EP.demoEnter(this.pw); this.pw = ''; } catch (e) { this.error = e.message; } finally { this.busy = false; }
    },
    async go(r) {
      this.going = r.email;
      try { await EP.demoAs(r.email); location.href = EP.root + 'app/'; } catch (e) { EP.err(e); this.going = ''; }
    }
  }
};
</script>
<style scoped>
.dm { min-height: 100vh; display: grid; grid-template-columns: 1.05fr .95fr; }
.art { position: relative; display: grid; align-items: center; padding: 48px; background: radial-gradient(900px 500px at 80% 0%, rgba(132,204,22,.32), transparent 60%), radial-gradient(700px 400px at 0% 100%, rgba(14,165,164,.25), transparent 60%), #070b14; overflow: hidden; }
.art::before { content: ''; position: absolute; inset: 0; background-image: radial-gradient(rgba(163,230,53,.18) 1.2px, transparent 1.2px); background-size: 34px 34px; mask-image: radial-gradient(circle at 70% 40%, #000, transparent 70%); }
.art-in { position: relative; display: grid; gap: 22px; }
.pts { list-style: none; padding: 0; margin: 0; display: grid; gap: 12px; color: #cbd5e1; font-size: .95rem; max-width: 46ch; } .pts li { display: flex; gap: 10px; align-items: flex-start; } .pts svg { color: var(--brand); flex: none; margin-top: 2px; } .pts b { color: #fff; }
.side { display: grid; place-items: center; padding: 32px 20px 90px; }
.role { display: grid; gap: 4px; text-align: left; cursor: pointer; border: 1px solid var(--line); transition: transform .15s, border-color .15s; } .role:hover { transform: translateY(-2px); border-color: var(--brand); } .role svg { color: var(--brand-3); margin-bottom: 4px; }
code { background: var(--bg-2); padding: 1px 6px; border-radius: 6px; }
@media (max-width: 860px) { .dm { grid-template-columns: 1fr; } .art { padding: 28px 22px; } }
</style>
