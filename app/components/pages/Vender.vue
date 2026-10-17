<template>
  <div class="stack" style="--gap:18px">
    <div class="seg" role="tablist"><button v-for="t in tabs" :key="t.k" :class="{ on: tab === t.k }" role="tab" :aria-selected="tab === t.k" @click="tab = t.k">{{ t.l }}</button></div>

    <!-- SERVICIO -->
    <section v-if="tab === 'servicio'" class="grid" style="grid-template-columns:1.2fr .8fr;gap:20px;align-items:start" id="vs">
      <div class="stack" style="--gap:12px">
        <div class="pill-tabs"><button class="chip" :class="{ on: !cat }" @click="cat = ''">Todos</button><button class="chip" v-for="c in cats" :key="c" :class="{ on: cat === c }" @click="cat = c">{{ c }}</button></div>
        <div class="grid auto-grid" style="--min:200px;--gap:10px">
          <button v-for="s in shown" :key="s.id" class="card card-hover svc" :class="{ on: sel && sel.id === s.id }" @click="pick(s)"><b>{{ s.name }}</b><span class="tiny muted">{{ s.unit }}</span><span class="chip" style="width:fit-content">Comisión {{ s.commission_type === 'fixed' ? EP.fmt.money(s.commission_amount) : s.commission_rate + '%' }}</span></button>
        </div>
      </div>
      <form class="card card-pad stack" style="--gap:12px;position:sticky;top:90px" @submit.prevent="sell" v-if="sel">
        <h3 class="h3">{{ sel.name }}</h3>
        <div class="field"><label for="am">Monto cobrado (MXN)</label><input id="am" class="input" type="number" min="1" step="1" v-model.number="f.amount" style="font-size:1.5rem;font-weight:800;height:56px" /></div>
        <div class="row between small"><span class="muted">Tu comisión</span><b class="num" style="color:var(--brand-3)">{{ EP.fmt.money2(commission) }}</b></div>
        <div class="grid g2" style="--gap:10px"><div class="field"><label for="cn">Cliente</label><input id="cn" class="input" v-model.trim="f.customer_name" /></div><div class="field"><label for="cp">WhatsApp</label><input id="cp" class="input" type="tel" v-model.trim="f.customer_phone" /></div></div>
        <div class="field"><label for="nt">Notas</label><input id="nt" class="input" v-model.trim="f.notes" placeholder="Referencia, folio…" /></div>
        <button class="btn btn-primary btn-lg" :class="{ 'is-loading': busy }" :disabled="!f.amount">Registrar venta</button>
      </form>
      <div class="card card-pad muted center" v-else>Elige un servicio para registrar la venta.</div>
    </section>

    <!-- GUÍA -->
    <section v-if="tab === 'guia'" class="grid" style="grid-template-columns:1.2fr .8fr;gap:20px;align-items:start" id="vg">
      <form class="card card-pad stack" style="--gap:12px" @submit.prevent="quoteGuide">
        <h3 class="h3">Datos del envío</h3>
        <div class="grid g2" style="--gap:10px"><div class="field"><label>Paquetería</label><select class="select" v-model="g.carrier"><option value="estafeta">Estafeta</option><option value="dhl">DHL</option></select></div><div class="field"><label>Servicio</label><select class="select" v-model="g.service"><option value="standard">Estándar</option><option value="express">Express</option></select></div></div>
        <div class="grid g4" style="--gap:10px"><div class="field"><label>Peso kg</label><input class="input" type="number" step="0.5" min="0.5" v-model.number="g.weight_kg" /></div><div class="field"><label>Largo</label><input class="input" type="number" v-model.number="g.length_cm" /></div><div class="field"><label>Ancho</label><input class="input" type="number" v-model.number="g.width_cm" /></div><div class="field"><label>Alto</label><input class="input" type="number" v-model.number="g.height_cm" /></div></div>
        <div class="grid g2" style="--gap:10px"><div class="field"><label>CP origen</label><input class="input" v-model.trim="g.origin_cp" maxlength="5" /></div><div class="field"><label>CP destino</label><input class="input" v-model.trim="g.dest_cp" maxlength="5" /></div></div>
        <div class="grid g2" style="--gap:10px"><div class="field"><label>Remitente</label><input class="input" v-model.trim="g.sender_name" /></div><div class="field"><label>Destinatario</label><input class="input" v-model.trim="g.recipient_name" /></div><div class="field"><label>Tel. remitente</label><input class="input" type="tel" v-model.trim="g.sender_phone" /></div><div class="field"><label>Tel. destinatario</label><input class="input" type="tel" v-model.trim="g.recipient_phone" /></div></div>
        <div class="field"><label>Dirección destino</label><input class="input" v-model.trim="g.dest_address" /></div>
        <div class="grid g2" style="--gap:10px;align-items:end"><div class="field"><label>Valor declarado (MXN)</label><input class="input" type="number" min="0" v-model.number="g.declared_value" /></div><label class="check"><input type="checkbox" v-model="g.insured" :disabled="!g.declared_value" /><span>Asegurar el envío</span></label></div>
        <button class="btn btn-ghost">Calcular precio</button>
      </form>
      <aside class="card card-pad stack" style="--gap:12px;position:sticky;top:90px"><h3 class="h3">Cotización</h3>
        <div v-if="gq"><div class="h1 num" style="font-size:2.6rem">{{ EP.fmt.money(gq.price + (g.insured ? gq.insurance_fee : 0)) }}</div><div class="small muted">Peso cobrable {{ gq.billable_kg }} kg · zona {{ gq.zone }}<br /><span v-if="g.insured">Seguro {{ EP.fmt.money(gq.insurance_fee) }} · </span>Tu comisión {{ EP.fmt.money(gq.commission) }}</div>
          <button class="btn btn-primary btn-lg btn-block mt-2" :class="{ 'is-loading': busy }" @click="sellGuide">Cobrar y registrar guía</button><p class="tiny muted mt-1">Cobra en efectivo; queda retenido hasta la recolección. Después captura el número de guía del transportista.</p></div>
        <div v-else class="muted small">Captura los datos y calcula el precio de convenio.</div>
        <div class="callout small" v-if="doneGuide"><ep-ico name="check" :size="18" /><div><b>Guía #{{ doneGuide.id }} registrada.</b> <button class="link" style="background:none;border:0;padding:0" @click="EP.go('/paquetes?tab=guias')">Capturar número de guía →</button></div></div>
      </aside>
    </section>

    <!-- PAQUETE -->
    <section v-if="tab === 'paquete'" class="card card-pad stack" style="--gap:12px;max-width:560px">
      <h3 class="h3">Recibir un paquete en tu punto</h3>
      <div class="field"><label>Número de rastreo</label><div class="row"><input class="input grow" v-model.trim="p.tracking_id" placeholder="Escanea o escribe" /><button type="button" class="btn btn-ghost" @click="scan = true"><ep-ico name="camera" :size="20" /></button></div></div>
      <div class="grid g2" style="--gap:10px"><div class="field"><label>Destinatario</label><input class="input" v-model.trim="p.recipient_name" /></div><div class="field"><label>WhatsApp</label><input class="input" type="tel" v-model.trim="p.recipient_phone" /></div></div>
      <div class="field"><label>Correo (opcional)</label><input class="input" type="email" v-model.trim="p.recipient_email" /></div>
      <button class="btn btn-primary btn-lg" :class="{ 'is-loading': busy }" @click="receive">Registrar recepción</button>
      <p class="tiny muted">Avisamos al destinatario por WhatsApp o correo para que pase por su paquete.</p>
    </section>
    <scanner :open="scan" @close="scan = false" @code="(c) => { p.tracking_id = c; scan = false; }" />
  </div>
</template>
<script>
export default {
  components: { Scanner: EP.comp('./components/parts/Scanner.vue') },
  data() {
    return { EP, tab: 'servicio', tabs: [{ k: 'servicio', l: 'Servicio' }, { k: 'guia', l: 'Guía de envío' }, { k: 'paquete', l: 'Recibir paquete' }], services: [], cat: '', sel: null, busy: false, scan: false, gq: null, doneGuide: null,
      f: { amount: 0, customer_name: '', customer_phone: '', notes: '' }, g: { carrier: 'estafeta', service: 'standard', weight_kg: 1, length_cm: 0, width_cm: 0, height_cm: 0, origin_cp: '76000', dest_cp: '', sender_name: '', sender_phone: '', recipient_name: '', recipient_phone: '', dest_address: '', declared_value: 0, insured: false }, p: { tracking_id: '', recipient_name: '', recipient_phone: '', recipient_email: '' } };
  },
  computed: {
    cats() { return [...new Set(this.services.map((s) => s.category))]; }, shown() { return this.services.filter((s) => !this.cat || s.category === this.cat); },
    commission() { const s = this.sel; if (!s) return 0; const c = s.commission_type === 'fixed' ? Number(s.commission_amount) : (this.f.amount || 0) * Number(s.commission_rate) / 100; return Math.min(c, this.f.amount || 0); }
  },
  async mounted() { try { this.services = (await EP.get('/r/services?limit=100')).items.filter((s) => s.active); } catch (e) { EP.err(e); } },
  methods: {
    pick(s) { this.sel = s; this.f.amount = 0; },
    async sell() { this.busy = true; try { const r = await EP.post('/ops/service-order', { service_id: this.sel.id, ...this.f }); EP.toast(`Venta registrada · tu comisión ${EP.fmt.money2(r.commission)}`, 'ok'); this.sel = null; this.f = { amount: 0, customer_name: '', customer_phone: '', notes: '' }; } catch (e) { EP.err(e); } finally { this.busy = false; } },
    async quoteGuide() { if (!this.g.dest_cp) { EP.toast('Captura el CP de destino', 'bad'); return; } try { this.gq = await EP.post('/public/guides/quote', this.g, { auth: false }); } catch (e) { EP.err(e); } },
    async sellGuide() { this.busy = true; try { this.doneGuide = await EP.post('/ops/guide', { ...this.g, insured: this.g.insured ? 1 : 0, paid: 1 }); EP.toast('Guía cobrada ✓', 'ok'); } catch (e) { EP.err(e); } finally { this.busy = false; } },
    async receive() { this.busy = true; try { await EP.post('/ops/shipment', this.p); EP.toast('Paquete registrado y destinatario avisado', 'ok'); this.p = { tracking_id: '', recipient_name: '', recipient_phone: '', recipient_email: '' }; } catch (e) { EP.err(e); } finally { this.busy = false; } }
  }
};
</script>
<style scoped>
.svc { padding: 14px; text-align: left; display: grid; gap: 6px; align-content: start; } .svc.on { border-color: var(--brand-2); box-shadow: 0 0 0 3px color-mix(in srgb, var(--brand) 30%, transparent); }
.callout { display: flex; gap: 12px; padding: 12px 14px; border-radius: var(--r-sm); background: var(--brand-soft); }
@media (max-width: 960px) { #vs, #vg { grid-template-columns: 1fr !important; } }
</style>
