<template>
  <div class="grid" style="grid-template-columns:minmax(0,1fr) minmax(0,1.1fr);gap:22px;align-items:start" id="cb">
    <section class="card card-pad stack" style="--gap:16px">
      <h2 class="h3">Abono en efectivo</h2>
      <form class="row" style="gap:8px" @submit.prevent="find">
        <input class="input grow" v-model.trim="code" placeholder="Folio EP-BK-…" autocomplete="off" aria-label="Folio" autofocus />
        <button type="button" class="btn btn-ghost" @click="scan = true" aria-label="Escanear QR"><ep-ico name="camera" :size="20" /></button>
        <button class="btn btn-primary" :class="{ 'is-loading': busy }">Buscar</button>
      </form>
      <div class="error" v-if="error">{{ error }}</div>

      <div v-if="b" class="stack" style="--gap:14px">
        <div class="bk">
          <div class="row between wrap"><div><div class="tiny muted">Cliente</div><b>{{ b.customer_name }}</b><div class="tiny muted">{{ EP.fmt.phone(b.customer_phone) }}</div></div><ep-badge :status="b.stage" /></div>
          <div class="small" style="margin-top:8px">{{ b.excursion_name }} · {{ EP.fmt.date(b.excursion_date) }} · {{ b.people }} pers.</div>
          <div class="grid g3 mt-2" style="--gap:8px"><div class="mini"><span>Total</span><b class="num">{{ EP.fmt.money(b.total) }}</b></div><div class="mini"><span>Pagado</span><b class="num">{{ EP.fmt.money(b.amount_paid) }}</b></div><div class="mini hi"><span>Saldo</span><b class="num">{{ EP.fmt.money(b.balance) }}</b></div></div>
        </div>
        <div v-if="b.balance > 0 && b.status !== 'cancelled'" class="stack" style="--gap:12px">
          <div class="field"><label for="am">Monto recibido</label><input id="am" class="input" type="number" min="1" :max="b.balance" step="1" v-model.number="amount" style="font-size:1.6rem;font-weight:800;height:60px" /></div>
          <div class="row wrap" style="gap:8px"><button class="chip" v-for="c in chips" :key="c.l" @click="amount = c.v">{{ c.l }}</button></div>
          <div class="callout small" v-if="b.wallet_balance > 0"><ep-ico name="wallet" :size="18" /><div>El cliente tiene <b>{{ EP.fmt.money(b.wallet_balance) }}</b> de crédito. <button class="link" style="background:none;border:0;padding:0" @click="useCredit">Aplicarlo ahora</button></div></div>
          <button class="btn btn-primary btn-lg" :class="{ 'is-loading': busy }" :disabled="!amount || amount > b.balance" @click="register"><ep-ico name="check" :size="20" /> Registrar {{ EP.fmt.money(amount || 0) }}</button>
          <p class="tiny muted">El efectivo queda retenido en tu punto hasta que pase el chofer. Tu comisión se calcula al recolectar.</p>
        </div>
        <div v-else class="callout"><ep-ico name="check" :size="20" /><div><b>Sin saldo por cobrar.</b> Esta reserva está {{ b.status === 'cancelled' ? 'cancelada' : 'liquidada' }}.</div></div>
      </div>

      <div v-if="receipt" class="receipt stack" style="--gap:4px"><b>✓ Abono registrado</b><span class="small">{{ receipt }}</span></div>
    </section>

    <section class="stack" style="--gap:12px"><h2 class="h3">Mis abonos de hoy</h2>
      <ep-table ref="tbl" resource="payments" :params="{ kind: 'excursion', from: today }" :columns="cols" :search="false" :page-size="12" empty-text="Aún no has registrado abonos hoy." />
    </section>
    <scanner :open="scan" @close="scan = false" @code="onCode" />
  </div>
</template>
<script>
export default {
  components: { Scanner: EP.comp('./components/parts/Scanner.vue') },
  data() { return { EP, code: EP.route.query.code || '', b: null, amount: 0, busy: false, error: '', receipt: '', scan: false, today: EP.today(),
    cols: [{ key: 'created_at', label: 'Hora', fmt: 'dt' }, { key: 'label', label: 'Reserva' }, { key: 'amount', label: 'Monto', fmt: 'money', align: 'right' }, { key: 'status', label: 'Estado', fmt: 'status' }] }; },
  computed: { chips() { const x = this.b; if (!x) return []; const r = [{ l: 'Todo ' + EP.fmt.money(x.balance), v: x.balance }]; if (x.balance >= 200) r.unshift({ l: '50%', v: Math.round(x.balance / 2) }); [100, 200, 500].filter((n) => n < x.balance).forEach((n) => r.unshift({ l: '$' + n, v: n })); return r.slice(0, 5); } },
  mounted() { if (this.code) this.find(); },
  methods: {
    onCode(c) { this.code = c; this.scan = false; this.find(); },
    async find() {
      if (!this.code) return; this.busy = true; this.error = ''; this.b = null; this.receipt = '';
      try { this.b = await EP.get('/ops/booking?code=' + encodeURIComponent(this.code)); this.amount = this.b.balance; } catch (e) { this.error = e.message; } finally { this.busy = false; }
    },
    async register() {
      this.busy = true;
      try {
        const r = await EP.post('/ops/cash-payment', { code: this.b.code, amount: this.amount });
        this.receipt = `${this.b.customer_name}: ${EP.fmt.money(this.amount)} · saldo ${EP.fmt.money(r.balance)} · ${EP.status(r.payment_status).text}`;
        EP.toast('Abono registrado ✓', 'ok'); this.b = null; this.code = ''; this.$refs.tbl.reload();
      } catch (e) { EP.err(e); } finally { this.busy = false; }
    },
    async useCredit() {
      try { const r = await EP.post('/ops/wallet/apply', { code: this.b.code }); EP.toast(r.applied ? 'Crédito aplicado: ' + EP.fmt.money(r.applied) : 'Sin crédito aplicable', r.applied ? 'ok' : ''); await this.find(); } catch (e) { EP.err(e); }
    }
  }
};
</script>
<style scoped>
.bk { padding: 14px 16px; border-radius: var(--r); background: var(--surface-2); border: 1px solid var(--line); }
.mini { padding: 10px; border-radius: 12px; background: var(--surface); border: 1px solid var(--line); display: grid; } .mini span { font-size: .7rem; color: var(--muted); text-transform: uppercase; letter-spacing: .06em; } .mini b { font-size: 1.15rem; } .mini.hi { background: var(--brand-soft); border-color: transparent; }
.callout { display: flex; gap: 12px; padding: 12px 14px; border-radius: var(--r-sm); background: var(--brand-soft); }
.receipt { padding: 14px 16px; border-radius: var(--r); background: var(--ok-soft); color: var(--ok); }
@media (max-width: 960px) { #cb { grid-template-columns: 1fr !important; } }
</style>
