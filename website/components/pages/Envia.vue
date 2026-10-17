<template>
  <div>
    <section class="top"><div class="container stack" style="--gap:12px"><span class="kicker">Envíos</span><h1 class="h1" style="font-size:clamp(2.2rem,5vw,3.6rem)">Envía con DHL y Estafeta, <span class="grad">sin filas</span></h1><p class="lead">Cotiza al instante con tarifa de convenio, compara opciones y lleva tu paquete al punto Easypoint más cercano. Ahí mismo se genera tu guía.</p></div></section>
    <section class="container layout">
      <form class="card card-pad stack" style="--gap:16px" @submit.prevent="quoteAll">
        <h2 class="h3">Tu paquete</h2>
        <div class="grid g2" style="--gap:12px">
          <div class="field"><label for="w">Peso (kg)</label><input id="w" class="input" type="number" min="0.5" step="0.5" v-model.number="f.weight_kg" /></div>
          <div class="field"><label for="v">Valor declarado (MXN)</label><input id="v" class="input" type="number" min="0" step="100" v-model.number="f.declared_value" placeholder="Opcional, para seguro" /></div>
        </div>
        <div class="grid g3" style="--gap:10px">
          <div class="field"><label for="l">Largo (cm)</label><input id="l" class="input" type="number" min="0" v-model.number="f.length_cm" /></div>
          <div class="field"><label for="a">Ancho (cm)</label><input id="a" class="input" type="number" min="0" v-model.number="f.width_cm" /></div>
          <div class="field"><label for="h">Alto (cm)</label><input id="h" class="input" type="number" min="0" v-model.number="f.height_cm" /></div>
        </div>
        <div class="grid g2" style="--gap:12px">
          <div class="field"><label for="o">CP origen</label><input id="o" class="input" inputmode="numeric" maxlength="5" v-model.trim="f.origin_cp" placeholder="76000" /></div>
          <div class="field"><label for="d">CP destino</label><input id="d" class="input" inputmode="numeric" maxlength="5" v-model.trim="f.dest_cp" placeholder="64000" /></div>
        </div>
        <div class="field"><label>¿Qué te importa más?</label><div class="seg"><button type="button" v-for="p in prios" :key="p.k" :class="{ on: prio === p.k }" @click="prio = p.k">{{ p.l }}</button></div></div>
        <button class="btn btn-primary btn-lg" :class="{ 'is-loading': busy }"><span v-if="busy" class="spin"></span> Comparar opciones</button>
      </form>

      <div class="stack" style="--gap:14px">
        <ep-empty v-if="!ranked.length" icon="📦" title="Cotiza en segundos">Captura el peso y los códigos postales para ver las opciones de DHL y Estafeta ordenadas para ti.</ep-empty>
        <article v-for="o in ranked" :key="o.key" class="card opt" :class="{ best: o.rank === 1 }">
          <div class="row between wrap">
            <div class="row" style="gap:12px"><span class="logo" :class="o.carrier">{{ o.carrier === 'dhl' ? 'DHL' : 'EST' }}</span>
              <div><b>{{ o.carrier === 'dhl' ? 'DHL' : 'Estafeta' }} · {{ o.service === 'express' ? 'Express' : 'Estándar' }}</b><div class="small muted">Entrega en {{ o.leadDays }} {{ o.leadDays === 1 ? 'día' : 'días' }} hábiles · {{ o.zone }}</div></div></div>
            <div class="right"><div class="price num">{{ EP.fmt.money(o.price) }}</div><div class="tiny muted" v-if="o.insurance_fee">+ {{ EP.fmt.money(o.insurance_fee) }} seguro</div></div>
          </div>
          <div class="row between wrap" style="margin-top:10px"><span class="badge b-brand" v-if="o.rank === 1">★ Mejor para ti</span><span class="tiny muted">Puntuación {{ o.score }}/100 · peso cobrable {{ o.billable_kg }} kg</span></div>
        </article>
        <div v-if="ranked.length" class="card card-pad stack" style="--gap:10px">
          <h3 class="h3">Lo siguiente</h3>
          <ol class="steps"><li>Empaca y rotula tu paquete.</li><li>Llévalo al punto Easypoint más cercano con los datos del destinatario.</li><li>Paga ahí (efectivo o tarjeta) y recibe tu guía y número de rastreo.</li></ol>
          <div class="row wrap" style="gap:10px"><a :href="EP.href('/puntos')" class="btn btn-dark"><ep-ico name="pin" :size="18" /> Elegir mi punto</a><a v-if="waUrl" :href="waUrl" target="_blank" rel="noopener" class="btn btn-ghost"><ep-ico name="message" :size="18" /> Avisar por WhatsApp</a></div>
        </div>
      </div>
    </section>
  </div>
</template>
<script>
export default {
  data() {
    return { EP, busy: false, opts: [], prio: 'balanced', f: { weight_kg: Number(EP.route.query.kg) || 1, declared_value: 0, length_cm: 0, width_cm: 0, height_cm: 0, origin_cp: '76000', dest_cp: '' },
      prios: [{ k: 'cheap', l: 'Más barato' }, { k: 'balanced', l: 'Balanceado' }, { k: 'fast', l: 'Más rápido' }] };
  },
  computed: {
    weights() { return { cheap: { price: 75, quality: 10, delivery: 5, risk: 10, esg: 0 }, balanced: { price: 40, quality: 25, delivery: 20, risk: 15, esg: 0 }, fast: { price: 15, quality: 20, delivery: 55, risk: 10, esg: 0 } }[this.prio]; },
    ranked() {
      if (!this.opts.length || !window.ProcurementCommon) return this.opts;
      return ProcurementCommon.rankQuotes(this.opts, this.weights);
    },
    waUrl() {
      const n = EP.config['brand.whatsapp']; const b = this.ranked[0];
      return n && b ? EP.wa(n, `Hola Easypoint, quiero enviar ${this.f.weight_kg} kg con ${b.carrier.toUpperCase()} ${b.service} (CP ${this.f.origin_cp} → ${this.f.dest_cp}). Cotización: ${EP.fmt.money(b.price)}.`) : '';
    }
  },
  mounted() { if (EP.route.query.kg) this.f.weight_kg = Number(EP.route.query.kg); },
  methods: {
    async quoteAll() {
      if (!this.f.dest_cp || this.f.dest_cp.length < 5) { EP.toast('Captura el CP de destino (5 dígitos)', 'bad'); return; }
      this.busy = true;
      try {
        const combos = [['estafeta', 'standard', 4, 82, 12], ['estafeta', 'express', 2, 84, 10], ['dhl', 'standard', 3, 92, 7], ['dhl', 'express', 1, 94, 5]];
        const res = await Promise.all(combos.map(([carrier, service]) => EP.post('/public/guides/quote', { ...this.f, carrier, service })));
        this.opts = res.map((r, i) => ({ key: combos[i][0] + combos[i][1], carrier: r.carrier, service: r.service, price: r.price + r.insurance_fee, insurance_fee: r.insurance_fee, billable_kg: r.billable_kg, zone: r.zone === 'local' ? 'zona local' : 'nacional', leadDays: combos[i][2], quality: combos[i][3], risk: combos[i][4], esg: 50 }));
      } catch (e) { EP.err(e); } finally { this.busy = false; }
    }
  }
};
</script>
<style scoped>
.top { padding: 56px 0 24px; background: radial-gradient(800px 260px at 15% 0%, color-mix(in srgb, var(--accent) 22%, transparent), transparent 65%); }
.layout { display: grid; grid-template-columns: 420px 1fr; gap: 28px; align-items: start; padding: 20px 0 80px; }
.opt { padding: 18px 20px; transition: transform .2s var(--ease), box-shadow .2s; } .opt:hover { transform: translateY(-3px); box-shadow: var(--shadow-2); } .opt.best { border: 2px solid var(--brand); box-shadow: 0 10px 30px color-mix(in srgb, var(--brand) 25%, transparent); }
.logo { width: 46px; height: 46px; border-radius: 14px; display: grid; place-items: center; font-weight: 900; font-size: .8rem; letter-spacing: .04em; } .logo.dhl { background: #ffcc00; color: #d40511; } .logo.estafeta { background: #e11d48; color: #fff; }
.price { font-size: 1.7rem; font-weight: 900; letter-spacing: -.03em; } .steps { margin: 0; padding-left: 20px; display: grid; gap: 6px; } .steps li::marker { color: var(--brand-2); font-weight: 800; }
@media (max-width: 960px) { .layout { grid-template-columns: 1fr; } }
</style>
