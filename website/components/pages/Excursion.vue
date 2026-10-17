<template>
  <div v-if="loading" class="container section"><div class="skeleton" style="height:420px"></div></div>
  <div v-else-if="!e" class="container section"><ep-empty icon="🧭" title="No encontramos esta excursión">Quizá ya no está disponible. <a class="link" :href="EP.href('/excursiones')">Ver todas</a></ep-empty></div>
  <div v-else>
    <!-- portada -->
    <section class="cover-hero">
      <ep-cover :seed="e.id" :tags="e.tags" :name="e.name" :image="e.image_url" ratio="auto" class="bg" />
      <div class="shade"></div>
      <div class="container inner">
        <a :href="EP.href('/excursiones')" class="back"><ep-ico name="back" :size="16" /> Excursiones</a>
        <div class="stack" style="--gap:10px">
          <div class="row wrap" style="gap:8px"><span class="chip glassy">{{ e.destination }}</span><span class="chip glassy" v-if="e.rating_count"><ep-ico name="star" :size="13" /> {{ Number(e.rating_avg).toFixed(1) }} ({{ e.rating_count }})</span><span class="chip glassy" v-if="e.provider_name">por {{ e.provider_name }}</span></div>
          <h1 class="h1" style="font-size:clamp(2rem,5vw,3.6rem);color:#fff">{{ e.name }}</h1>
        </div>
      </div>
    </section>

    <div class="container layout">
      <!-- detalle -->
      <div class="stack" style="--gap:28px">
        <div class="grid g3" style="--gap:12px">
          <div class="card card-pad"><div class="tiny muted">Duración</div><div class="bold"><ep-ico name="clock" :size="16" /> {{ e.duration || '—' }}</div></div>
          <div class="card card-pad"><div class="tiny muted">Salida</div><div class="bold"><ep-ico name="flag" :size="16" /> {{ e.departure_time || 'Por confirmar' }}</div></div>
          <div class="card card-pad"><div class="tiny muted">Punto de encuentro</div><div class="bold small"><ep-ico name="pin" :size="16" /> {{ e.meeting_point || 'Te lo enviamos con tu voucher' }}</div></div>
        </div>
        <div class="stack" style="--gap:10px"><h2 class="h3">La experiencia</h2><p style="white-space:pre-line">{{ e.description }}</p>
          <div class="row wrap" style="gap:8px"><span class="chip" v-for="t in tags" :key="t">#{{ t }}</span></div></div>
        <div class="callout"><ep-ico name="shield" :size="22" /><div><b>Tu dinero está protegido.</b>
          <p class="small" style="margin-top:4px">{{ e.policy || 'Apartas con un abono. Si no completas tu pago, lo abonado se convierte en crédito Easypoint.' }}</p></div></div>
        <div class="stack" style="--gap:10px"><h2 class="h3">¿Cómo funciona?</h2>
          <ol class="how">
            <li><b>Elige fecha y personas</b> y aparta con {{ EP.fmt.money(e.deposit_amount || quote.total || 0) }} {{ e.deposit_amount ? 'por persona' : '' }}.</li>
            <li><b>Recibe tu voucher con QR</b> por pantalla, correo y WhatsApp.</li>
            <li><b>Liquida a tu ritmo</b>, en línea o en efectivo en cualquier punto, antes de {{ cfg('policy.payment_deadline_days', 3) }} días de la salida.</li>
            <li><b>Presenta tu QR</b> al guía y disfruta. Si algo cambia, tu abono se vuelve crédito.</li>
          </ol></div>
      </div>

      <!-- reserva -->
      <aside class="book card" id="reservar" aria-label="Reservar">
        <div v-if="!done" class="stack" style="--gap:16px">
          <div class="row between"><div><span class="tiny muted">desde</span><div class="price num">{{ EP.fmt.money(e.price) }}<small class="muted"> /persona</small></div></div>
            <span class="badge b-warn" v-if="selDep && selDep.remaining != null && selDep.remaining <= 4">Quedan {{ selDep.remaining }}</span></div>

          <div class="field"><label>Elige tu fecha</label>
            <div v-if="!e.departures.length" class="small muted">Por ahora no hay salidas abiertas. <a class="link" :href="wa" target="_blank">Avísame cuando haya</a></div>
            <div class="dates" role="radiogroup" aria-label="Fechas disponibles">
              <button v-for="d in e.departures" :key="d.id" type="button" class="date" :class="{ on: date === d.date, off: d.soldOut }" :disabled="d.soldOut" role="radio" :aria-checked="date === d.date" @click="date = d.date">
                <span class="dd num">{{ day(d.date) }}</span><span class="dm">{{ mon(d.date) }}</span><span class="dw">{{ wk(d.date) }}</span>
                <span class="dr" v-if="d.soldOut">Agotada</span><span class="dr" v-else-if="d.remaining != null && d.remaining <= 4">{{ d.remaining }} lugares</span>
              </button>
            </div></div>

          <div class="row between"><div><div class="bold">Personas</div><div class="tiny muted">Máx. {{ maxPeople }}</div></div><ep-stepper v-model="people" :min="1" :max="maxPeople" label="Personas" /></div>

          <div class="field"><label for="promo">Código promocional</label>
            <div class="row"><input id="promo" class="input" v-model.trim="promo" placeholder="BIENVENIDO100" @keyup.enter="refresh" /><button type="button" class="btn btn-ghost" @click="refresh">Aplicar</button></div>
            <div class="help" v-if="promo && quote.adjustments.some(a => a.kind === 'promo_code')">✓ Código aplicado</div></div>

          <label class="check protect" :class="{ on: protect }"><input type="checkbox" v-model="protect" /><span><b>Easypoint Protege</b> <span class="muted">+{{ EP.fmt.money(protectFee) }}</span><br /><span class="small muted">Cambia de fecha gratis y, si cancelas con 7+ días, recibes {{ cfg('policy.protect_refund_pct', 80) }}% de vuelta.</span></span></label>

          <div class="breakdown" v-if="quote.total">
            <div class="row between"><span>{{ people }} × {{ EP.fmt.money(quote.unit_price) }}</span><span class="num">{{ EP.fmt.money(quote.list_total) }}</span></div>
            <div class="row between" v-for="a in quote.adjustments.filter(x => x.kind !== 'cap')" :key="a.label"><span :class="a.amount < 0 ? 'ok' : ''">{{ a.label }}</span><span class="num" :class="a.amount < 0 ? 'ok' : ''">{{ a.amount < 0 ? '−' : '+' }}{{ EP.fmt.money(Math.abs(a.amount)) }}</span></div>
            <div class="row between" v-if="quote.protect_fee"><span>Easypoint Protege</span><span class="num">+{{ EP.fmt.money(quote.protect_fee) }}</span></div>
            <div class="row between total"><b>Total</b><b class="num">{{ EP.fmt.money(quote.total) }}</b></div>
            <div class="row between" v-if="quote.deposit && quote.deposit < quote.total"><span class="small muted">Aparta hoy con</span><b class="num brand">{{ EP.fmt.money(quote.deposit) }}</b></div>
          </div>

          <div class="callout small" v-if="quote.days_to != null && quote.days_to >= 0 && quote.days_to <= cutoffDays"><ep-ico name="alert" :size="18" /><div><b>Salida muy próxima.</b> Te damos {{ cfg('policy.last_minute_grace_hours', 12) }} horas para liquidar; si no, tu abono pasa a crédito.</div></div>
          <form class="stack" style="--gap:12px" @submit.prevent="reserve" novalidate>
            <div class="field"><label for="n">Nombre completo *</label><input id="n" class="input" v-model.trim="f.name" autocomplete="name" /><div class="error" v-if="err.name">{{ err.name }}</div></div>
            <div class="grid g2" style="--gap:10px">
              <div class="field"><label for="p">WhatsApp *</label><input id="p" class="input" type="tel" inputmode="tel" v-model.trim="f.phone" autocomplete="tel" placeholder="10 dígitos" /><div class="error" v-if="err.phone">{{ err.phone }}</div></div>
              <div class="field"><label for="m">Correo</label><input id="m" class="input" type="email" v-model.trim="f.email" autocomplete="email" /></div>
            </div>
            <details class="more"><summary>Opciones: recordatorios de pago y código de referido</summary>
              <div class="stack" style="--gap:10px;margin-top:10px">
                <label class="check"><input type="checkbox" v-model="f.remind" /><span>Quiero recordatorios de mis abonos</span></label>
                <div class="grid g2" style="--gap:10px" v-if="f.remind">
                  <div class="field"><label>Cada</label><select class="select" v-model="f.cadence"><option value="weekly">Semana</option><option value="biweekly">Quincena</option></select></div>
                  <div class="field"><label>Por</label><select class="select" v-model="f.channel"><option value="both">WhatsApp y correo</option><option value="whatsapp">WhatsApp</option><option value="email">Correo</option></select></div>
                </div>
                <div class="field"><label for="rc">Código de un amigo</label><input id="rc" class="input" v-model.trim="f.ref" placeholder="Opcional" @blur="checkRef" /><div class="help" v-if="refMsg">{{ refMsg }}</div></div>
              </div></details>
            <label class="check"><input type="checkbox" v-model="f.accept" /><span class="small">Entiendo que <b>no hay reembolsos en efectivo</b>: si no completo mi pago, lo abonado se convierte en crédito Easypoint. <a class="link" :href="EP.href('/legal/credito')" target="_blank">Ver política</a></span></label>
            <div class="error" v-if="err.accept">{{ err.accept }}</div>
            <div class="error" v-if="err.api">{{ err.api }}</div>
            <button class="btn btn-primary btn-lg btn-block" :class="{ 'is-loading': busy }" :disabled="!date"><span v-if="busy" class="spin"></span> {{ date ? 'Reservar y apartar' : 'Elige una fecha' }}</button>
          </form>
        </div>

        <!-- confirmación -->
        <div v-else class="stack center" style="--gap:14px">
          <div class="ok-badge"><ep-ico name="check" :size="34" :stroke="3" /></div>
          <h2 class="h3">¡Lugar apartado!</h2>
          <p class="muted small">Folio <b class="tag-mono">{{ done.booking.code }}</b> · {{ EP.fmt.dateLong(done.booking.excursion_date) }}</p>
          <div style="display:grid;place-items:center"><ep-qr :text="done.voucher_url" :size="170" /></div>
          <div class="breakdown" style="text-align:left">
            <div class="row between"><span>Total</span><b class="num">{{ EP.fmt.money(done.booking.total) }}</b></div>
            <div class="row between" v-if="done.applied_credit"><span class="ok">Crédito aplicado</span><b class="num ok">−{{ EP.fmt.money(done.applied_credit) }}</b></div>
            <div class="row between"><span>Saldo</span><b class="num">{{ EP.fmt.money(done.booking.balance) }}</b></div>
          </div>
          <div v-if="payNote" class="callout small" style="text-align:left">{{ payNote }}</div>
          <button v-if="done.booking.balance > 0 && !paid" class="btn btn-primary btn-block" :class="{ 'is-loading': busy }" @click="payDeposit"><span v-if="busy" class="spin"></span> Pagar apartado {{ EP.fmt.money(depositDue) }}</button>
          <a class="btn btn-dark btn-block" :href="done.voucher_url"><ep-ico name="qr" :size="18" /> Abrir mi voucher</a>
          <div class="row wrap" style="justify-content:center;gap:8px"><button class="btn btn-ghost btn-sm" @click="ics"><ep-ico name="calendar" :size="16" /> Agregar al calendario</button><a class="btn btn-ghost btn-sm" :href="waShare" target="_blank" rel="noopener"><ep-ico name="message" :size="16" /> Compartir</a></div>
          <p class="tiny muted">También abonas en efectivo en cualquier punto con tu folio.</p>
        </div>
      </aside>
    </div>
  </div>
</template>
<script>
export default {
  data() {
    return {
      EP, loading: true, e: null, date: '', people: 2, promo: '', protect: false,
      quote: { total: 0, adjustments: [], deposit: 0 }, f: { name: '', phone: '', email: '', remind: true, cadence: 'biweekly', channel: 'both', ref: '', accept: false },
      err: {}, busy: false, done: null, paid: false, payNote: '', refMsg: ''
    };
  },
  computed: {
    maxPeople() { const r = this.selDep && this.selDep.remaining; return r != null ? Math.max(1, Math.min(40, r)) : 40; },
    cutoffDays() { return Number(this.e && this.e.cutoff_days) || Number(EP.config['policy.payment_deadline_days'] || 3); },
    selDep() { return this.e && this.e.departures.find((d) => d.date === this.date); },
    tags() { return String((this.e && this.e.tags) || '').split(',').map((s) => s.trim()).filter(Boolean); },
    protectFee() { return Math.max(Number(EP.config['pricing.protect_min'] || 30), Math.round(this.people * Number(this.e ? this.e.price : 0) * Number(EP.config['pricing.protect_pct'] || 6)) / 100); },
    wa() { const n = EP.config['brand.whatsapp']; return n ? EP.wa(n, 'Hola, quiero que me avisen de nuevas salidas de ' + (this.e && this.e.name)) : '#'; },
    waShare() { return EP.wa('', '') && this.done ? 'https://wa.me/?text=' + encodeURIComponent('Aparté ' + this.e.name + ' con Easypoint 🎉 ' + EP.root + 'website/#/excursion/' + this.e.id) : '#'; },
    depositDue() { return this.done ? Math.min(this.done.booking.balance, (Number(this.e.deposit_amount) || this.done.booking.balance) * this.done.booking.people) : 0; }
  },
  watch: { date() { this.clampPeople(); this.refresh(); }, people() { this.refresh(); }, protect() { this.refresh(); } },
  async mounted() {
    try {
      const all = await EP.get('/public/excursions');
      this.e = all.find((x) => String(x.id) === String(EP.view.params.id)) || null;
      if (this.e) {
        const first = this.e.departures.find((d) => !d.soldOut);
        this.date = EP.route.query.date || (first && first.date) || '';
        this.promo = EP.route.query.promo || ''; this.f.ref = EP.route.query.ref || '';
        if (this.f.ref) this.checkRef();
        document.title = this.e.name + ' · Easypoint';
      }
    } catch (x) { EP.err(x); }
    this.loading = false;
  },
  methods: {
    cfg(k, d) { return EP.config[k] ?? d; },
    day(d) { return new Date(d + 'T00:00:00').getDate(); },
    mon(d) { return new Date(d + 'T00:00:00').toLocaleDateString('es-MX', { month: 'short' }); },
    wk(d) { return new Date(d + 'T00:00:00').toLocaleDateString('es-MX', { weekday: 'short' }); },
    clampPeople() { if (this.people > this.maxPeople) this.people = this.maxPeople; },
    async refresh() {
      if (!this.e || !this.date) return;
      clearTimeout(this._q);
      this._q = setTimeout(async () => {
        try { this.quote = await EP.get('/public/quote' + EP.qs({ excursion: this.e.id, date: this.date, people: this.people, promo: this.promo, protect: this.protect ? 1 : 0, phone: this.f.phone }), { auth: false }); } catch (x) { /* silencioso */ }
      }, 120);
    },
    async checkRef() {
      if (!this.f.ref) { this.refMsg = ''; return; }
      try { const r = await EP.get('/public/referral?code=' + encodeURIComponent(this.f.ref)); this.refMsg = r.valid ? `✓ Código de ${r.from}: ambos reciben ${EP.fmt.money(r.reward)} al completar tu primer viaje.` : 'Ese código no existe.'; } catch (_) {}
    },
    validate() {
      const x = {};
      if (this.f.name.length < 2) x.name = 'Escribe tu nombre.';
      if (this.f.phone.replace(/\D/g, '').length < 10) x.phone = 'Captura 10 dígitos.';
      if (!this.f.accept) x.accept = 'Necesitamos que aceptes la política de crédito.';
      this.err = x; return !Object.keys(x).length;
    },
    async reserve() {
      if (!this.validate()) return;
      this.busy = true; this.err.api = '';
      try {
        const r = await EP.post('/public/bookings', {
          excursion_id: this.e.id, date: this.date, people: this.people, promo_code: this.promo, protect: this.protect ? 1 : 0,
          customer_name: this.f.name, customer_phone: this.f.phone, customer_email: this.f.email,
          reminder_optin: this.f.remind ? 1 : 0, reminder_cadence: this.f.cadence, reminder_channel: this.f.channel,
          referral_code: this.f.ref, utm: EP.utm()
        });
        this.done = r; this.remember(r);
        window.scrollTo({ top: document.getElementById('reservar').offsetTop - 90, behavior: 'smooth' });
      } catch (x) { this.err.api = x.message; EP.err(x); } finally { this.busy = false; }
    },
    remember(r) {
      try {
        const st = WebCommon.createVersionedStorage('ep-my-bookings', 1);
        const cur = (st.read().value || []).filter((b) => b.code !== r.booking.code);
        cur.unshift({ code: r.booking.code, token: r.booking.token, name: this.e.name, date: r.booking.excursion_date });
        st.write(cur.slice(0, 12));
      } catch (_) {}
    },
    async payDeposit() {
      this.busy = true;
      try {
        const r = await EP.post('/public/voucher/pay', { code: this.done.booking.code, amount: this.depositDue });
        if (r.mode === 'gateway') { location.href = r.checkout_url; return; }
        if (r.mode === 'manual_confirm') { this.payNote = `Transferencia por confirmar. Referencia ${r.reference}. ${r.instructions}`; return; }
        this.paid = true; this.done.booking.amount_paid = r.amount_paid; this.done.booking.balance = r.balance;
        this.payNote = '✓ Pago recibido. Tu lugar está confirmado.'; EP.toast('Pago recibido', 'ok');
      } catch (x) { EP.err(x); } finally { this.busy = false; }
    },
    ics() {
      const d = this.done.booking.excursion_date.replace(/-/g, '');
      const t = new Date(this.done.booking.excursion_date + 'T00:00:00'); t.setDate(t.getDate() + 1);
      const end = t.toISOString().slice(0, 10).replace(/-/g, '');
      const txt = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Easypoint//ES', 'BEGIN:VEVENT', 'UID:' + this.done.booking.code + '@easypoint', 'DTSTAMP:' + new Date().toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z', 'DTSTART;VALUE=DATE:' + d, 'DTEND;VALUE=DATE:' + end, 'SUMMARY:' + this.e.name, 'DESCRIPTION:Voucher ' + this.done.booking.code + ' ' + this.done.voucher_url, 'LOCATION:' + (this.e.meeting_point || this.e.destination), 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
      const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([txt], { type: 'text/calendar' })); a.download = 'easypoint-' + this.done.booking.code + '.ics'; a.click();
    }
  }
};
</script>
<style scoped>
.cover-hero { position: relative; min-height: 340px; display: grid; align-items: end; color: #fff; margin-top: -68px; padding-top: 68px; }
.cover-hero .bg { position: absolute; inset: 0; border-radius: 0; }
.shade { position: absolute; inset: 0; background: linear-gradient(180deg, rgba(5,9,18,.35), rgba(5,9,18,.15) 40%, rgba(5,9,18,.78)); }
.inner { position: relative; padding: 32px 0 36px; display: grid; gap: 22px; }
.back { display: inline-flex; gap: 6px; align-items: center; font-weight: 700; font-size: .85rem; opacity: .9; width: fit-content; padding: 6px 12px; border-radius: 999px; background: rgba(8,12,22,.4); backdrop-filter: blur(8px); }
.glassy { color: #fff; background: rgba(8,12,22,.45); border-color: rgba(255,255,255,.2); backdrop-filter: blur(10px); }
.layout { display: grid; grid-template-columns: 1fr 420px; gap: 40px; align-items: start; padding: 36px 0 80px; }
.book { position: sticky; top: 84px; padding: 22px; }
.price { font-size: 2rem; font-weight: 900; letter-spacing: -.03em; }
.callout { display: flex; gap: 14px; padding: 16px 18px; border-radius: var(--r); background: var(--brand-soft); color: var(--ink); border: 1px solid color-mix(in srgb, var(--brand) 35%, transparent); } .callout svg { color: var(--brand-3); flex: none; margin-top: 2px; }
.how { margin: 0; padding-left: 20px; display: grid; gap: 10px; } .how li::marker { color: var(--brand-2); font-weight: 800; }
.dates { display: grid; grid-template-columns: repeat(auto-fill, minmax(78px, 1fr)); gap: 8px; max-height: 232px; overflow: auto; padding: 2px; }
.date { display: grid; justify-items: center; padding: 8px 4px; border-radius: 14px; border: 1.5px solid var(--line-2); background: var(--surface); transition: all .15s; line-height: 1.15; }
.date:hover:not(:disabled) { border-color: var(--brand-2); transform: translateY(-2px); }
.date.on { background: var(--ink); color: var(--bg); border-color: var(--ink); box-shadow: var(--shadow-2); }
.date.off { opacity: .4; text-decoration: line-through; }
.dd { font-size: 1.4rem; font-weight: 900; } .dm, .dw { font-size: .72rem; text-transform: uppercase; letter-spacing: .06em; opacity: .75; } .dr { font-size: .64rem; font-weight: 800; color: var(--warn); margin-top: 2px; } .date.on .dr { color: #fde68a; }
.protect { padding: 12px 14px; border-radius: var(--r); border: 1.5px dashed var(--line-2); transition: all .15s; } .protect.on { border-style: solid; border-color: var(--brand-2); background: var(--brand-soft); }
.breakdown { display: grid; gap: 8px; padding: 14px 16px; border-radius: var(--r); background: var(--surface-2); border: 1px solid var(--line); font-size: .92rem; }
.breakdown .total { padding-top: 8px; border-top: 1px dashed var(--line-2); font-size: 1.1rem; } .ok { color: var(--ok); } .brand { color: var(--brand-3); }
.more summary { cursor: pointer; font-size: .85rem; font-weight: 700; color: var(--brand-3); }
.ok-badge { width: 76px; height: 76px; border-radius: 50%; margin: 0 auto; display: grid; place-items: center; background: var(--brand); color: var(--on-brand); animation: pop .5s var(--ease); box-shadow: 0 0 0 10px color-mix(in srgb, var(--brand) 25%, transparent); }
@media (max-width: 960px) { .layout { grid-template-columns: 1fr; } .book { position: static; } }
</style>
