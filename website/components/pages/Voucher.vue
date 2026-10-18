<template>
  <div class="container section" style="max-width:920px">
    <div class="stack" style="--gap:10px"><span class="kicker">Mi voucher</span><h1 class="h2">Tu reserva, siempre a la mano</h1></div>

    <!-- búsqueda -->
    <form class="card card-pad row wrap mt-3" style="gap:12px" @submit.prevent="lookup">
      <div class="field grow" style="min-width:240px"><label for="c">Folio o teléfono</label><input id="c" class="input" v-model.trim="q" placeholder="EP-BK-XXXXXX o tu teléfono de 10 dígitos" autocomplete="off" /></div>
      <button class="btn btn-primary" style="align-self:end" :class="{ 'is-loading': busy }">Buscar</button>
    </form>
    <div class="error mt-1" v-if="error">{{ error }}</div>

    <div v-if="saved.length && !items.length" class="mt-3 stack" style="--gap:8px"><b class="small muted">En este dispositivo</b>
      <div class="row wrap" style="gap:8px"><button class="chip" v-for="s in saved" :key="s.code" @click="open(s)">{{ s.name }} · {{ EP.fmt.date(s.date) }}</button></div></div>

    <!-- resultados -->
    <div v-for="b in items" :key="b.code" class="mt-3">
      <article class="card ticket">
        <div class="tk-main stack" style="--gap:14px">
          <div class="row between wrap"><div><div class="tiny muted">Folio</div><div class="h3 tag-mono" style="background:none;padding:0">{{ b.code }}</div></div><ep-badge :status="b.stage" /></div>
          <h2 class="h3">{{ b.excursion_name }}</h2>
          <div class="grid g2 small" style="--gap:10px">
            <div><div class="tiny muted">Fecha</div><b>{{ EP.fmt.dateLong(b.excursion_date) }}</b><div class="tiny muted" v-if="b.days_to >= 0">en {{ b.days_to }} días</div></div>
            <div><div class="tiny muted">Pasajeros</div><b>{{ b.people }} · {{ b.customer_name }}</b></div>
            <div><div class="tiny muted">Punto de encuentro</div><b>{{ b.meeting_point || 'Se confirma por WhatsApp' }}</b></div>
            <div><div class="tiny muted">Salida</div><b>{{ b.departure_time || '—' }}</b></div>
          </div>
          <div>
            <div class="row between small"><span>Pagado <b class="num">{{ EP.fmt.money(b.amount_paid) }}</b> de <b class="num">{{ EP.fmt.money(b.total) }}</b></span><span class="num" :class="b.balance > 0 ? 'warn' : 'ok'">{{ b.balance > 0 ? 'Saldo ' + EP.fmt.money(b.balance) : 'Liquidado ✓' }}</span></div>
            <div class="progress mt-1"><i :style="{ width: Math.min(100, b.total ? b.amount_paid / b.total * 100 : 0) + '%' }"></i></div>
          </div>
          <div class="callout small" v-if="b.balance > 0 && b.days_to >= 0"><ep-ico name="alert" :size="18" /><div>Liquida antes de <b>{{ EP.fmt.date(deadline(b)) }}</b> para conservar tu lugar. Si no, tu abono pasa a crédito y no lo pierdes.</div></div>
          <div class="row wrap" style="gap:8px" v-if="b.owner">
            <button class="btn btn-primary" v-if="b.balance > 0 && b.status !== 'cancelled'" @click="payOpen(b)"><ep-ico name="cash" :size="18" /> Abonar o liquidar</button>
            <button class="btn btn-ghost" v-if="b.can_reschedule" @click="reschedOpen(b)"><ep-ico name="calendar" :size="18" /> Cambiar fecha</button>
            <button class="btn btn-ghost" v-if="b.can_cancel" @click="cancel(b)"><ep-ico name="x" :size="18" /> Cancelar</button>
            <button class="btn btn-soft" v-if="b.can_review" @click="reviewOpen(b)"><ep-ico name="star" :size="18" /> Calificar</button>
          </div>
          <div class="small muted" v-else>Para pagar o modificar, abre el enlace que te enviamos o busca con tu teléfono.</div>
        </div>
        <div class="tk-side stack center" style="--gap:10px;align-content:center">
          <ep-qr :text="qrText(b)" :size="168" />
          <div class="tiny muted">Muestra este QR al abordar</div>
          <div class="row" style="justify-content:center;gap:6px"><span class="chip" v-if="b.protect"><ep-ico name="shield" :size="13" /> Protege</span><span class="chip" v-if="b.checked_in"><ep-ico name="check" :size="13" /> Abordó</span></div>
        </div>
      </article>

      <div class="grid g2 mt-2" style="--gap:16px" v-if="b.owner">
        <div class="card card-pad stack" style="--gap:10px"><h3 class="h3">Historial</h3>
          <ol class="tl"><li v-for="t in b.timeline" :key="t.created_at + t.to_state"><span>{{ label(t.to_state) }}</span><span class="tiny muted">{{ EP.fmt.dt(t.created_at) }}</span></li></ol>
          <div v-if="!b.timeline.length" class="small muted">Sin movimientos todavía.</div></div>
        <div class="card card-pad stack" style="--gap:10px">
          <h3 class="h3"><ep-ico name="wallet" :size="20" /> Mi crédito</h3>
          <div class="price num">{{ EP.fmt.money(b.wallet_balance) }}</div>
          <p class="small muted">Se aplica automáticamente a tu siguiente reserva. Vigencia {{ EP.config['policy.credit_validity_months'] || 12 }} meses.</p>
          <div class="divider"></div>
          <b>Invita y gana {{ EP.fmt.money(EP.config['referral.reward_referrer'] || 100) }}</b>
          <div class="row"><span class="tag-mono" style="font-size:1.1rem">{{ b.referral_code }}</span><button class="btn btn-ghost btn-sm" @click="EP.copy(refLink(b))">Copiar enlace</button></div>
          <ep-share :url="refLink(b)" text="Reserva tus excursiones con Easypoint y ganamos crédito los dos" title="Easypoint" />
        </div>
      </div>
    </div>

    <!-- modales -->
    <ep-modal :open="m.pay" title="Abonar a tu reserva" @close="m.pay = false">
      <div class="stack" v-if="cur"><div class="breakdown2"><div class="row between"><span>Saldo</span><b class="num">{{ EP.fmt.money(cur.balance) }}</b></div></div>
        <div class="field"><label>Monto</label><input class="input" type="number" min="1" :max="cur.balance" step="1" v-model.number="amount" /></div>
        <div class="row wrap" style="gap:8px"><button class="chip" @click="amount = Math.min(cur.balance, Math.round(cur.balance / 2))">50%</button><button class="chip" @click="amount = cur.balance">Todo</button></div>
        <p class="small muted">También puedes abonar en efectivo en cualquier punto con tu folio.</p></div>
      <template #footer><button class="btn btn-ghost" @click="m.pay = false">Cancelar</button><button class="btn btn-primary" :class="{ 'is-loading': busy }" @click="pay">Pagar {{ EP.fmt.money(amount) }}</button></template>
    </ep-modal>
    <ep-modal :open="m.resched" title="Cambiar fecha" @close="m.resched = false">
      <div class="stack" v-if="cur"><p class="small muted">{{ cur.protect ? 'Con Easypoint Protege el cambio es gratis.' : 'El primer cambio es gratis; después tiene un costo de ' + EP.fmt.money(EP.config['policy.reschedule_fee'] || 150) + '.' }}</p>
        <div class="dates"><button v-for="d in deps" :key="d.id" class="date" :class="{ on: newDate === d.date }" :disabled="d.soldOut || d.date === cur.excursion_date" @click="newDate = d.date"><span class="dd num">{{ new Date(d.date + 'T00:00:00').getDate() }}</span><span class="dm">{{ new Date(d.date + 'T00:00:00').toLocaleDateString('es-MX', { month: 'short' }) }}</span></button></div></div>
      <template #footer><button class="btn btn-ghost" @click="m.resched = false">Cerrar</button><button class="btn btn-primary" :disabled="!newDate" :class="{ 'is-loading': busy }" @click="resched">Confirmar cambio</button></template>
    </ep-modal>
    <ep-modal :open="m.review" title="¿Cómo te fue?" @close="m.review = false">
      <div class="stack"><div class="row" style="gap:6px;justify-content:center"><button v-for="n in 5" :key="n" class="star" :class="{ on: n <= rating }" @click="rating = n" :aria-label="n + ' estrellas'">★</button></div>
        <div class="field"><label>Cuéntanos (opcional)</label><textarea class="textarea" v-model="text"></textarea></div></div>
      <template #footer><button class="btn btn-primary" :disabled="!rating" :class="{ 'is-loading': busy }" @click="review">Enviar</button></template>
    </ep-modal>
  </div>
</template>
<script>
export default {
  data() { return { EP, q: EP.route.query.code || '', items: [], busy: false, error: '', saved: [], cur: null, m: { pay: false, resched: false, review: false }, amount: 0, deps: [], newDate: '', rating: 0, text: '', token: EP.route.query.t || '' }; },
  async mounted() {
    try { this.saved = WebCommon.createVersionedStorage('ep-my-bookings', 1).read().value || []; } catch (_) {}
    if (this.q) await this.lookup();
    if (EP.route.query.review && this.items[0] && this.items[0].can_review) this.reviewOpen(this.items[0]);
  },
  methods: {
    label(s) { return EP.status(s).text; },
    deadline(b) { const d = new Date(b.excursion_date + 'T00:00:00'); d.setDate(d.getDate() - Number(EP.config['policy.payment_deadline_days'] || 3)); return d.toISOString().slice(0, 10); },
    qrText(b) { return location.origin + EP.root + 'website/#/voucher?code=' + b.code; },
    refLink(b) { return location.origin + EP.root + 'website/#/excursiones?ref=' + b.referral_code; },
    open(s) { this.q = s.code; this.token = s.token; this.lookup(); },
    async lookup() {
      if (!this.q) return;
      this.busy = true; this.error = '';
      try {
        const isCode = /^EP-/i.test(this.q);
        const r = await EP.get('/public/voucher' + EP.qs(isCode ? { code: this.q, t: this.token } : { phone: this.q.replace(/\D/g, '') }), { auth: false });
        this.items = r.items;
      } catch (e) { this.items = []; this.error = e.message; } finally { this.busy = false; }
    },
    payOpen(b) { this.cur = b; this.amount = Math.min(b.balance, Math.max(1, Math.round((Number(b.deposit) || b.balance)))); this.m.pay = true; },
    async pay() {
      this.busy = true;
      try {
        const r = await EP.post('/public/voucher/pay', { code: this.cur.code, amount: this.amount });
        if (r.mode === 'gateway') { location.href = r.checkout_url; return; }
        if (r.mode === 'manual_confirm') { EP.toast('Transferencia por confirmar · ref ' + r.reference + (r.clabe ? ' · ' + r.bank + ' CLABE ' + r.clabe : ''), 'ok', 12000); this.m.pay = false; return; }
        EP.toast('Pago recibido ✓', 'ok'); this.m.pay = false; await this.lookup();
      } catch (e) { EP.err(e); } finally { this.busy = false; }
    },
    async reschedOpen(b) {
      this.cur = b; this.newDate = '';
      try { const all = await EP.get('/public/excursions'); const x = all.find((e) => e.id === b.excursion_id); this.deps = x ? x.departures : []; } catch (_) {}
      this.m.resched = true;
    },
    async resched() {
      this.busy = true;
      try { const r = await EP.post('/public/voucher/reschedule', { code: this.cur.code, token: this.token || this.cur.token, date: this.newDate }); EP.toast(r.fee ? 'Fecha cambiada · cargo ' + EP.fmt.money(r.fee) : 'Fecha cambiada ✓', 'ok'); this.m.resched = false; await this.lookup(); }
      catch (e) { EP.err(e); } finally { this.busy = false; }
    },
    async cancel(b) {
      const ok = await EP.confirm('Si cancelas, lo que has abonado se convierte en crédito Easypoint (no hay reembolso en efectivo' + (b.protect ? ', salvo el que cubre Protege con 7+ días' : '') + '). ¿Cancelar la reserva?', { title: 'Cancelar reserva', ok: 'Sí, cancelar', danger: true });
      if (!ok) return;
      try { const r = await EP.post('/public/voucher/cancel', { code: b.code, token: this.token || b.token }); EP.toast(r.message, 'ok', 7000); await this.lookup(); } catch (e) { EP.err(e); }
    },
    reviewOpen(b) { this.cur = b; this.rating = 0; this.text = ''; this.m.review = true; },
    async review() {
      this.busy = true;
      try { const r = await EP.post('/public/voucher/review', { code: this.cur.code, token: this.token || this.cur.token, rating: this.rating, text: this.text }); this.m.review = false; EP.toast(r.public_review_prompt ? '¡Gracias! Te regalamos crédito por tu reseña.' : 'Gracias, tu comentario llegó directo a nuestro equipo.', 'ok', 6000); if (r.public_review_prompt && r.review_url) window.open(r.review_url, '_blank'); await this.lookup(); }
      catch (e) { EP.err(e); } finally { this.busy = false; }
    }
  }
};
</script>
<style scoped>
.ticket { display: grid; grid-template-columns: 1fr 230px; overflow: hidden; }
.tk-main { padding: 24px; } .tk-side { padding: 24px; border-left: 2px dashed var(--line-2); background: var(--surface-2); position: relative; }
.tk-side::before, .tk-side::after { content: ''; position: absolute; left: -12px; width: 22px; height: 22px; border-radius: 50%; background: var(--bg); } .tk-side::before { top: -11px; } .tk-side::after { bottom: -11px; }
.price { font-size: 2rem; font-weight: 900; } .warn { color: #b45309; } .ok { color: var(--ok); }
.callout { display: flex; gap: 12px; padding: 12px 14px; border-radius: var(--r-sm); background: var(--warn-soft); }
.tl { margin: 0; padding: 0; list-style: none; display: grid; gap: 10px; } .tl li { display: flex; justify-content: space-between; gap: 10px; padding-left: 16px; position: relative; font-size: .9rem; } .tl li::before { content: ''; position: absolute; left: 0; top: .55em; width: 8px; height: 8px; border-radius: 50%; background: var(--brand-2); }
.dates { display: grid; grid-template-columns: repeat(auto-fill, minmax(70px, 1fr)); gap: 8px; max-height: 260px; overflow: auto; } .date { display: grid; justify-items: center; padding: 8px; border-radius: 12px; border: 1.5px solid var(--line-2); background: var(--surface); } .date.on { background: var(--ink); color: var(--bg); } .date:disabled { opacity: .35; } .dd { font-size: 1.3rem; font-weight: 900; } .dm { font-size: .7rem; text-transform: uppercase; }
.star { font-size: 2.2rem; background: none; border: 0; color: var(--line-2); transition: transform .12s; } .star.on { color: #f59e0b; } .star:hover { transform: scale(1.2); }
.breakdown2 { padding: 12px 14px; border-radius: var(--r-sm); background: var(--surface-2); border: 1px solid var(--line); }
@media (max-width: 700px) { .ticket { grid-template-columns: 1fr; } .tk-side { border-left: 0; border-top: 2px dashed var(--line-2); } .tk-side::before, .tk-side::after { display: none; } }
</style>
