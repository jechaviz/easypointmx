<template>
  <div>
    <!-- HERO -->
    <section class="hero">
      <hero-network :points="points" />
      <div class="hero-shade"></div>
      <div class="container hero-in">
        <div class="hero-copy">
          <span class="pill"><i class="dot"></i> Red de {{ points.length || '…' }} puntos activos</span>
          <h1 class="h1">Tu ciudad,<br /><span class="grad">a un punto</span> de distancia.</h1>
          <p class="lead">Recibe paquetes, envía con DHL y Estafeta, paga servicios y <b>reserva excursiones apartando desde {{ EP.fmt.money(minDeposit) }}</b>, en el punto Easypoint más cercano.</p>
          <div class="row wrap" style="gap:12px;margin-top:8px">
            <a :href="EP.href('/excursiones')" class="btn btn-primary btn-lg">Ver excursiones <ep-ico name="arrow" :size="20" /></a>
            <a :href="EP.href('/puntos')" class="btn btn-lg btn-ghost-dark"><ep-ico name="pin" :size="20" /> Puntos cerca de mí</a>
          </div>
          <ul class="proof">
            <li><ep-ico name="shield" :size="18" /> Tu abono nunca se pierde: se vuelve crédito</li>
            <li><ep-ico name="qr" :size="18" /> Voucher con QR</li>
            <li><ep-ico name="cash" :size="18" /> Paga en línea o en efectivo</li>
          </ul>
        </div>

        <div class="quick glass">
          <div class="seg" role="tablist" aria-label="Acciones rápidas">
            <button v-for="t in tabs" :key="t.k" :class="{ on: tab === t.k }" @click="tab = t.k" role="tab" :aria-selected="tab === t.k">{{ t.l }}</button>
          </div>
          <form @submit.prevent="go" class="stack" style="--gap:12px;margin-top:16px">
            <template v-if="tab === 'track'">
              <div class="field"><label for="q1">Número de rastreo</label><input id="q1" class="input" v-model.trim="q.track" placeholder="Ej. EPK7M2QX" autocomplete="off" /></div>
              <button class="btn btn-primary btn-block">Rastrear paquete</button>
            </template>
            <template v-else-if="tab === 'voucher'">
              <div class="field"><label for="q2">Folio o teléfono de tu reserva</label><input id="q2" class="input" v-model.trim="q.voucher" placeholder="EP-BK-XXXXXX o 10 dígitos" autocomplete="off" /></div>
              <button class="btn btn-primary btn-block">Ver mi voucher</button>
            </template>
            <template v-else>
              <div class="grid g2" style="--gap:10px">
                <div class="field"><label for="q3">Peso (kg)</label><input id="q3" class="input" type="number" min="0.5" step="0.5" v-model="q.kg" /></div>
                <div class="field"><label for="q4">Paquetería</label><select id="q4" class="select" v-model="q.carrier"><option value="estafeta">Estafeta</option><option value="dhl">DHL</option></select></div>
              </div>
              <button class="btn btn-primary btn-block">Cotizar envío</button>
            </template>
          </form>
          <p class="tiny muted" style="margin-top:10px">Sin crear cuenta. Tus datos solo se usan para tu trámite.</p>
        </div>
      </div>
    </section>

    <!-- QUÉ HACEMOS -->
    <section class="section">
      <div class="container">
        <div class="center stack" v-reveal>
          <span class="kicker">Todo en un punto</span>
          <h2 class="h2">Un mismo lugar para cuatro cosas que haces siempre</h2>
        </div>
        <div class="grid g4 mt-4" style="--gap:18px">
          <a v-for="(f, i) in features" :key="f.t" :href="EP.href(f.to)" class="card card-hover feat" v-reveal :style="{ transitionDelay: i * 70 + 'ms' }">
            <span class="fi"><ep-ico :name="f.i" :size="28" /></span>
            <h3 class="h3">{{ f.t }}</h3>
            <p class="small muted">{{ f.d }}</p>
            <span class="link small">{{ f.cta }} →</span>
          </a>
        </div>
      </div>
    </section>

    <!-- EXCURSIONES DESTACADAS -->
    <section class="section alt">
      <div class="container">
        <div class="row between wrap" v-reveal>
          <div class="stack" style="--gap:8px"><span class="kicker">Experiencias</span><h2 class="h2">Aparta hoy, viaja cuando quieras</h2></div>
          <a :href="EP.href('/excursiones')" class="btn btn-ghost">Ver todas <ep-ico name="arrow" :size="18" /></a>
        </div>
        <div class="grid auto-grid mt-4" style="--min:300px;--gap:20px">
          <exc-card v-for="e in featured" :key="e.id" :e="e" v-reveal />
          <template v-if="!excursions.length"><div class="skeleton" style="height:340px" v-for="n in 3" :key="n"></div></template>
        </div>
      </div>
    </section>

    <!-- CÓMO FLUYE TU DINERO -->
    <section class="section">
      <div class="container-sm center stack" v-reveal><span class="kicker">Confianza</span><h2 class="h2">Cómo viaja tu dinero, paso a paso</h2><p class="lead" style="margin-inline:auto">Cada peso tiene dueño y registro en cada mano. Por eso podemos prometerte algo simple: <b>no pierdes lo que abonas</b>.</p></div>
      <div class="container mt-4" v-reveal><pipeline-flow /></div>
      <div class="container mt-4">
        <div class="grid g3" style="--gap:16px">
          <div class="card card-pad" v-reveal><ep-ico name="refresh" :size="26" /><h3 class="h3 mt-1">Crédito, no pérdida</h3><p class="small muted mt-1">Si no completas el pago o la salida se cancela, lo abonado se convierte en crédito vigente {{ cfg('policy.credit_validity_months', 12) }} meses.</p></div>
          <div class="card card-pad" v-reveal><ep-ico name="shield" :size="26" /><h3 class="h3 mt-1">Easypoint Protege</h3><p class="small muted mt-1">Por {{ cfg('pricing.protect_pct', 6) }}% extra cambias de fecha gratis y, si cancelas con 7+ días, te regresamos {{ cfg('policy.protect_refund_pct', 80) }}% a tu tarjeta.</p></div>
          <div class="card card-pad" v-reveal><ep-ico name="message" :size="26" /><h3 class="h3 mt-1">Quejas en privado</h3><p class="small muted mt-1">Si algo sale mal, lo atendemos antes de que sea un problema: respuesta en {{ cfg('support.sla_first_response_h', 2) }} horas y compensación en crédito.</p></div>
        </div>
      </div>
    </section>

    <!-- PARA QUIÉN -->
    <section class="section alt">
      <div class="container">
        <AudiencePaths :audiences="audiences" heading="Hay un lugar para ti en la red" subheading="Viajes, envíos o un negocio que quiere crecer: todo empieza en un punto." />
      </div>
    </section>

    <!-- CLUB + REFERIDOS -->
    <section class="section">
      <div class="container">
        <div class="club" v-reveal>
          <div class="stack">
            <span class="kicker" style="color:#d9f99d">Easypoint Club</span>
            <h2 class="h2" style="color:#fff">Viaja más, paga menos.</h2>
            <p style="color:#cbd5e1;max-width:48ch">Por {{ EP.fmt.money(cfg('club.price_month', 99)) }} al mes: {{ cfg('club.cashback_pct', 5) }}% de cashback en crédito en cada viaje, descuento de socio, cambios de fecha gratis y prioridad en salidas llenas.</p>
            <div class="row wrap" style="gap:10px"><a :href="EP.href('/club')" class="btn btn-primary">Unirme al Club</a><a :href="EP.href('/club#invita')" class="btn btn-ghost-dark">Invita y gana {{ EP.fmt.money(cfg('referral.reward_referrer', 100)) }}</a></div>
          </div>
          <div class="club-card" aria-hidden="true">
            <div class="cc-top"><b>easypoint</b><span>CLUB</span></div>
            <div class="cc-num num">•••• 0100</div>
            <div class="cc-bot"><span>Socio desde hoy</span><span class="num">{{ cfg('club.cashback_pct', 5) }}% back</span></div>
          </div>
        </div>
      </div>
    </section>

    <!-- MAPA -->
    <section class="section alt">
      <div class="container">
        <div class="row between wrap" v-reveal><div class="stack" style="--gap:8px"><span class="kicker">Cerca de ti</span><h2 class="h2">La red crece contigo</h2></div><a :href="EP.href('/puntos')" class="btn btn-ghost">Ver mapa completo</a></div>
        <div class="mt-3" v-reveal><ep-map :points="mapPoints" height="380px" /></div>
      </div>
    </section>

    <!-- RESEÑAS REALES -->
    <section class="section" v-if="reviews.length">
      <div class="container"><Testimonials :items="reviews" heading="Lo que dicen quienes ya viajaron" /></div>
    </section>

    <!-- NEGOCIOS -->
    <section class="section">
      <div class="container">
        <div class="center stack" v-reveal><span class="kicker">Para negocios</span><h2 class="h2">Convierte tu local en un punto que paga</h2></div>
        <div class="grid g3 mt-4" style="--gap:18px">
          <a v-for="b in biz" :key="b.t" :href="EP.href(b.to)" class="card card-hover card-pad stack" v-reveal><span class="fi"><ep-ico :name="b.i" :size="26" /></span><h3 class="h3">{{ b.t }}</h3><p class="small muted">{{ b.d }}</p><span class="link small">{{ b.cta }} →</span></a>
        </div>
      </div>
    </section>

    <!-- FAQ -->
    <section class="section alt">
      <div class="container-sm"><FAQ :items="faq" heading="Preguntas frecuentes" /></div>
    </section>

    <section class="section">
      <div class="container center stack" v-reveal>
        <h2 class="h2">Tu próxima salida empieza con {{ EP.fmt.money(minDeposit) }}</h2>
        <div class="row wrap" style="justify-content:center;gap:12px"><a :href="EP.href('/excursiones')" class="btn btn-primary btn-lg">Reservar ahora</a><a :href="EP.href('/ayuda')" class="btn btn-ghost btn-lg">Tengo dudas</a></div>
      </div>
    </section>
  </div>
</template>
<script>
export default {
  components: { HeroNetwork: EP.comp('./components/parts/HeroNetwork.vue'), ExcCard: EP.comp('./components/parts/ExcCard.vue'), PipelineFlow: EP.comp('./components/parts/PipelineFlow.vue') },
  data() {
    return {
      EP, points: [], excursions: [], reviews: [], tab: 'track', q: { track: '', voucher: '', kg: 1, carrier: 'estafeta' },
      tabs: [{ k: 'track', l: 'Rastrear' }, { k: 'ship', l: 'Cotizar envío' }, { k: 'voucher', l: 'Mi voucher' }],
      features: [
        { i: 'package', t: 'Recibe paquetes', d: 'Compra en línea y recoge en el punto que te queda de camino, con alerta cuando llegue.', cta: 'Rastrear', to: '/rastreo' },
        { i: 'send', t: 'Envía con DHL y Estafeta', d: 'Cotiza al instante con tarifa de convenio y genera tu guía en el punto, sin filas.', cta: 'Cotizar', to: '/envia' },
        { i: 'zap', t: 'Servicios y pagos', d: 'Luz, recargas, seguros, boletos, impresiones y más, con atención humana.', cta: 'Ver servicios', to: '/servicios' },
        { i: 'mountain', t: 'Excursiones con apartado', d: 'Reserva con un abono pequeño, paga a tu ritmo y recibe tu voucher con QR.', cta: 'Explorar', to: '/excursiones' }
      ],
      audiences: [
        { icon: 'compass', label: 'Quiero viajar', hook: 'Viajeros', blurb: 'Elige tu salida, aparta con un abono y paga en abonos o en efectivo.', cta: 'Ver excursiones', href: '#/excursiones' },
        { icon: 'gift', label: 'Quiero enviar o recibir', hook: 'Paquetes', blurb: 'Cotiza guías, rastrea y recoge en tu punto con aviso por WhatsApp.', cta: 'Enviar un paquete', href: '#/envia' },
        { icon: 'hands', label: 'Tengo un local', hook: 'Puntos', blurb: 'Gana comisión por cada paquete, guía y servicio que operes. Nosotros te damos la tecnología.', cta: 'Ser punto Easypoint', href: '#/afiliate' }
      ],
      biz: [
        { i: 'store', t: 'Sé un punto', d: 'Tu local recibe paquetes, vende guías y servicios, y cobra comisión desde el primer día. Alta en minutos.', cta: 'Afiliar mi local', to: '/afiliate' },
        { i: 'mountain', t: 'Publica tus experiencias', d: 'Llena tus salidas con apartado, manifiesto digital, check-in por QR y pago en 2 días al completar.', cta: 'Soy proveedor', to: '/afiliate?t=proveedor' },
        { i: 'layers', t: 'E-commerce y API', d: 'Entrega tus pedidos en puntos Easypoint. Plugins para Shopify y WooCommerce, y API para tu plataforma.', cta: 'Ver integración', to: '/afiliate?t=ecommerce' }
      ],
      faq: [
        { q: '¿Qué pasa con mi dinero si no puedo ir?', a: 'No lo pierdes. Si no completas el pago o la salida cambia, lo abonado se convierte en crédito Easypoint vigente 12 meses para otra experiencia. Con Easypoint Protege además puedes cancelar con 7 o más días y recuperar el 80% a tu forma de pago.' },
        { q: '¿Puedo pagar en efectivo?', a: 'Sí. Abona en cualquier punto Easypoint con tu folio de reserva; el sistema registra tu abono al instante y se refleja en tu voucher.' },
        { q: '¿Cuánto tengo que apartar?', a: 'Cada excursión define su apartado (por ejemplo $400 por persona). El resto lo pagas en abonos antes de la fecha límite, que te recordamos por WhatsApp o correo.' },
        { q: '¿Cómo recibo mi voucher?', a: 'Al reservar te damos tu folio y un enlace con tu voucher y código QR. Lo puedes abrir desde cualquier celular, sin cuenta.' },
        { q: '¿Qué pasa si hay mal clima o la salida se cancela?', a: 'Si el proveedor cancela, convertimos todo lo abonado en crédito y le sumamos un bono. Si es por clima, queda como crédito completo para que elijas nueva fecha.' },
        { q: '¿Cómo rastreo mi paquete?', a: 'Con tu número de rastreo en la sección Rastrea. Si dejas tu correo te avisamos cuando esté listo en tu punto.' }
      ]
    };
  },
  computed: {
    featured() { return this.excursions.slice(0, 3); },
    minDeposit() { const d = this.excursions.map((e) => Number(e.deposit_amount) || 0).filter(Boolean); return d.length ? Math.min(...d) : 100; },
    mapPoints() { return this.points.map((p, i) => ({ id: p.id, lat: p.lat, lng: p.lng, title: p.name, html: p.address, num: i + 1 })); }
  },
  async mounted() {
    const [p, e, r] = await Promise.allSettled([EP.get('/public/points'), EP.get('/public/excursions'), EP.get('/public/reviews')]);
    if (p.status === 'fulfilled') this.points = p.value;
    if (e.status === 'fulfilled') this.excursions = e.value;
    if (r.status === 'fulfilled') this.reviews = r.value.map((x) => ({ quote: x.quote, name: x.name, role: x.excursion }));
  },
  methods: {
    cfg(k, d) { return EP.config[k] ?? d; },
    go() {
      if (this.tab === 'track') EP.go('/rastreo' + EP.qs({ code: this.q.track }));
      else if (this.tab === 'voucher') EP.go('/voucher' + EP.qs({ code: this.q.voucher }));
      else EP.go('/envia' + EP.qs({ kg: this.q.kg, carrier: this.q.carrier }));
    }
  }
};
</script>
<style scoped>
.hero { position: relative; min-height: min(92vh, 860px); display: grid; align-items: center; color: #fff; background: radial-gradient(1200px 600px at 80% -10%, #14351a 0%, transparent 60%), radial-gradient(900px 500px at 0% 100%, #0b2a3a 0%, transparent 55%), #070b14; overflow: hidden; margin-top: -68px; padding: 120px 0 72px; }
.hero-shade { position: absolute; inset: 0; background: linear-gradient(90deg, #070b14 0%, rgba(7,11,20,.88) 34%, rgba(7,11,20,.0) 70%); pointer-events: none; }
.hero-in { position: relative; display: grid; grid-template-columns: 1.15fr .85fr; gap: 40px; align-items: center; }
.hero-copy { display: grid; gap: 22px; }
.hero .h1 { color: #fff; } .hero .lead { color: #cbd5e1; }
.pill { display: inline-flex; align-items: center; gap: 10px; width: fit-content; padding: 7px 14px; border-radius: 999px; background: rgba(163,230,53,.1); border: 1px solid rgba(163,230,53,.3); color: #d9f99d; font-weight: 700; font-size: .82rem; }
.btn-ghost-dark { border-color: rgba(255,255,255,.28); color: #fff; } .btn-ghost-dark:hover { background: rgba(255,255,255,.1); border-color: #fff; }
.proof { list-style: none; padding: 0; margin: 6px 0 0; display: flex; gap: 18px 24px; flex-wrap: wrap; color: #94a3b8; font-size: .88rem; }
.proof li { display: flex; align-items: center; gap: 8px; } .proof svg { color: var(--brand); }
.quick { border-radius: var(--r-lg); padding: 22px; background: rgba(15,22,38,.72); border-color: rgba(255,255,255,.14); color: #fff; box-shadow: var(--shadow-3); }
.quick .seg { background: rgba(255,255,255,.08); width: 100%; } .quick .seg button { flex: 1; color: #94a3b8; } .quick .seg button.on { background: var(--brand); color: var(--on-brand); }
.quick .field > label { color: #cbd5e1; } .quick .input, .quick .select { background: rgba(255,255,255,.08); border-color: rgba(255,255,255,.18); color: #fff; } .quick .select option { color: #000; }
.quick .muted { color: #94a3b8; }
.alt { background: var(--bg-2); }
.feat { padding: 24px; display: grid; gap: 10px; align-content: start; }
.fi { width: 56px; height: 56px; border-radius: 18px; display: grid; place-items: center; background: var(--brand-soft); color: var(--brand-3); }
.club { display: grid; grid-template-columns: 1.2fr .8fr; gap: 32px; align-items: center; padding: clamp(28px, 5vw, 56px); border-radius: var(--r-xl); background: radial-gradient(700px 300px at 90% 0%, rgba(132,204,22,.35), transparent 60%), linear-gradient(135deg, #0b1220, #14281a); overflow: hidden; }
.club-card { aspect-ratio: 1.6; max-width: 340px; justify-self: center; width: 100%; border-radius: 22px; padding: 22px; display: grid; align-content: space-between; color: #0b1d03; background: linear-gradient(135deg, #bef264, #84cc16 55%, #4d7c0f); box-shadow: 0 30px 60px rgba(0,0,0,.45); transform: rotate(-5deg); transition: transform .5s var(--ease); }
.club:hover .club-card { transform: rotate(0) scale(1.04); }
.cc-top, .cc-bot { display: flex; justify-content: space-between; font-weight: 800; } .cc-top span { letter-spacing: .3em; font-size: .7rem; } .cc-num { font-size: 1.4rem; letter-spacing: .14em; font-weight: 700; } .cc-bot { font-size: .8rem; }
@media (max-width: 900px) { .hero-in { grid-template-columns: 1fr; } .hero-shade { background: linear-gradient(180deg, rgba(7,11,20,.55), #070b14 90%); } .club { grid-template-columns: 1fr; } }
</style>
