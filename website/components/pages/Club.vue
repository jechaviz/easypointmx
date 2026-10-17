<template>
  <div>
    <section class="hero"><div class="container hero-in">
      <div class="stack" style="--gap:16px"><span class="kicker" style="color:#d9f99d">Easypoint Club</span>
        <h1 class="h1" style="color:#fff;font-size:clamp(2.4rem,5.5vw,4.2rem)">Viaja más,<br /><span class="grad">paga menos.</span></h1>
        <p style="color:#cbd5e1;font-size:1.15rem;max-width:46ch">{{ EP.fmt.money(price) }} al mes. {{ cb }}% de cashback en crédito en cada viaje, descuento de socio, cambio de fecha gratis y más.</p>
        <div class="row wrap" style="gap:10px"><a href="#unirme" class="btn btn-primary btn-lg" @click.prevent="scroll('unirme')">Unirme ahora</a><a href="#invita" class="btn btn-lg" style="border:1.5px solid rgba(255,255,255,.3);color:#fff" @click.prevent="scroll('invita')">Invita y gana</a></div></div>
      <div class="club-card" aria-hidden="true"><div class="cc-top"><b>easypoint</b><span>CLUB</span></div><div class="cc-num num">•••• 0100</div><div class="cc-bot"><span>{{ cb }}% cashback</span><span>Desde hoy</span></div></div>
    </div></section>

    <section class="section"><div class="container">
      <div class="grid g4" style="--gap:16px"><div class="card card-pad stack" style="--gap:6px" v-for="b in benefits" :key="b.t" v-reveal><span class="fi"><ep-ico :name="b.i" :size="24" /></span><b>{{ b.t }}</b><span class="small muted">{{ b.d }}</span></div></div>
      <div class="card card-pad mt-4" v-reveal><h2 class="h3">¿Cuánto me ahorro?</h2>
        <div class="grid g3 mt-2" style="--gap:16px;align-items:end">
          <div class="field"><label>Viajes al año: <b>{{ trips }}</b></label><input type="range" min="1" max="12" v-model.number="trips" /></div>
          <div class="field"><label>Gasto por viaje: <b>{{ EP.fmt.money(spend) }}</b></label><input type="range" min="500" max="4000" step="100" v-model.number="spend" /></div>
          <div><div class="tiny muted">Ahorro neto estimado al año</div><div class="h2 num grad">{{ EP.fmt.money(net) }}</div><div class="tiny muted">{{ EP.fmt.money(trips * spend * cb / 100) }} de cashback + descuentos − {{ EP.fmt.money(price * 12) }} de membresía</div></div>
        </div></div></div></section>

    <section class="section alt" id="unirme"><div class="container-sm"><div class="card card-pad stack" style="--gap:14px">
      <template v-if="!joined"><h2 class="h2">Únete al Club</h2><p class="muted">Tu membresía se activa al instante y vence en {{ EP.config['club.duration_days'] || 30 }} días (renovable).</p>
        <ep-form :fields="fields" v-model="form" :busy="busy" submit-label="Activar mi membresía" @submit="join" /></template>
      <div v-else class="center stack"><div class="ok-badge"><ep-ico name="check" :size="34" :stroke="3" /></div><h2 class="h2">{{ joined.pending ? 'Casi listo' : '¡Bienvenido al Club!' }}</h2>
        <p v-if="!joined.pending">Tu membresía está activa hasta <b>{{ EP.fmt.dateLong(joined.until) }}</b>. Se aplica automáticamente cuando reserves con tu teléfono.</p>
        <p v-else>Confirma tu pago de {{ EP.fmt.money(joined.price) }} con referencia <b class="tag-mono">{{ joined.reference }}</b>; activaremos tu membresía en cuanto lo validemos.</p>
        <a :href="EP.href('/excursiones')" class="btn btn-primary">Ver excursiones</a></div>
    </div></div></section>

    <section class="section" id="invita"><div class="container-sm center stack" v-reveal><span class="kicker">Referidos</span><h2 class="h2">Invita a un amigo y ganan los dos</h2>
      <p class="lead" style="margin-inline:auto">Comparte tu código de referido (lo ves en tu voucher). Cuando tu amigo complete su primer viaje, <b>tú recibes {{ EP.fmt.money(EP.config['referral.reward_referrer'] || 100) }} y él {{ EP.fmt.money(EP.config['referral.reward_referee'] || 100) }}</b> en crédito.</p>
      <a :href="EP.href('/voucher')" class="btn btn-dark" style="margin-inline:auto">Ver mi código</a></div></section>
  </div>
</template>
<script>
export default {
  data() {
    return { EP, trips: 4, spend: 1500, busy: false, joined: null, form: { name: '', phone: '', email: '' },
      fields: [{ key: 'name', label: 'Nombre', required: true, autocomplete: 'name' }, { key: 'phone', label: 'WhatsApp', type: 'tel', required: true, autocomplete: 'tel' }, { key: 'email', label: 'Correo (opcional)', type: 'email', wide: true }],
      benefits: [{ i: 'wallet', t: 'Cashback en crédito', d: 'Un porcentaje de cada viaje regresa a tu monedero para el siguiente.' }, { i: 'percent', t: 'Descuento de socio', d: 'Precios preferentes en salidas seleccionadas.' }, { i: 'calendar', t: 'Cambios gratis', d: 'Mueve tu fecha sin costo cuando lo necesites.' }, { i: 'zap', t: 'Prioridad', d: 'Te avisamos primero cuando se libera un lugar.' }] };
  },
  computed: { price() { return Number(EP.config['club.price_month'] || 99); }, cb() { return Number(EP.config['club.cashback_pct'] || 5); }, net() { const memb = this.price * 12; const back = this.trips * this.spend * this.cb / 100; const disc = this.trips * this.spend * 0.03; return Math.max(0, Math.round(back + disc - memb)); } },
  methods: {
    scroll(id) { document.getElementById(id).scrollIntoView({ behavior: 'smooth' }); },
    async join(f) { this.busy = true; try { this.joined = await EP.post('/public/club', f, { auth: false }); } catch (e) { EP.err(e); } finally { this.busy = false; } }
  }
};
</script>
<style scoped>
.hero { background: radial-gradient(900px 400px at 85% 0%, rgba(132,204,22,.35), transparent 60%), #070b14; margin-top: -68px; padding: 140px 0 80px; color: #fff; overflow: hidden; }
.hero-in { display: grid; grid-template-columns: 1.2fr .8fr; gap: 40px; align-items: center; }
.club-card { aspect-ratio: 1.6; max-width: 360px; width: 100%; justify-self: center; border-radius: 24px; padding: 24px; display: grid; align-content: space-between; color: #0b1d03; background: linear-gradient(135deg, #bef264, #84cc16 55%, #4d7c0f); box-shadow: 0 40px 80px rgba(0,0,0,.5); transform: rotate(-6deg); animation: float 6s ease-in-out infinite; }
@keyframes float { 50% { transform: rotate(-3deg) translateY(-10px); } }
.cc-top, .cc-bot { display: flex; justify-content: space-between; font-weight: 800; } .cc-top span { letter-spacing: .3em; font-size: .72rem; } .cc-num { font-size: 1.5rem; letter-spacing: .14em; font-weight: 700; }
.fi { width: 48px; height: 48px; border-radius: 16px; display: grid; place-items: center; background: var(--brand-soft); color: var(--brand-3); }
.alt { background: var(--bg-2); } input[type=range] { accent-color: var(--brand-2); width: 100%; }
.ok-badge { width: 76px; height: 76px; border-radius: 50%; margin: 0 auto; display: grid; place-items: center; background: var(--brand); color: var(--on-brand); }
@media (max-width: 860px) { .hero-in { grid-template-columns: 1fr; } }
</style>
