<template>
  <div class="stack" style="--gap:18px">
    <div class="row wrap between" style="gap:12px">
      <div class="row wrap" style="gap:10px"><select v-if="isAdmin" class="select" style="width:auto" v-model="pid" @change="load" aria-label="Proveedor"><option v-for="p in provs" :key="p.id" :value="p.id">{{ p.name }}</option></select>
        <div class="seg"><button :class="{ on: view === 'next' }" @click="view = 'next'">Próximas</button><button :class="{ on: view === 'past' }" @click="view = 'past'">Pasadas</button></div></div>
      <button class="btn btn-primary" @click="addOpen = true"><ep-ico name="plus" :size="18" /> Agregar fechas</button>
    </div>

    <div class="grid auto-grid" style="--min:340px;--gap:16px" v-if="shown.length">
      <article v-for="d in shown" :key="d.id" class="card card-pad stack dep" style="--gap:12px">
        <div class="row between"><div><div class="tiny muted">{{ EP.fmt.dateLong(d.date) }}</div><b class="h3">{{ d.excursion_name }}</b></div><ep-badge :status="d.status === 'completed' ? 'done' : d.date < today ? 'urgent' : 'active'" :text="d.status === 'completed' ? 'Completada' : d.date < today ? 'Por cerrar' : d.date === today ? 'Hoy' : 'Programada'" /></div>
        <div><div class="row between small"><span>{{ d.seats }} {{ d.capacity ? 'de ' + d.capacity : '' }} lugares</span><span class="muted" v-if="d.min_people">mín. {{ d.min_people }}</span></div>
          <div class="progress mt-1" style="position:relative"><i :style="{ width: d.capacity ? Math.min(100, d.seats / d.capacity * 100) + '%' : '0%' }"></i><span v-if="d.min_people && d.capacity" class="mark" :style="{ left: d.min_people / d.capacity * 100 + '%' }"></span></div></div>
        <div class="grid g2 small" style="--gap:8px"><div class="mini"><span>Cobrado</span><b class="num">{{ EP.fmt.money(d.collected) }}</b></div><div class="mini"><span>Por cobrar</span><b class="num">{{ EP.fmt.money(d.pending) }}</b></div></div>
        <div class="row wrap" style="gap:8px"><button class="btn btn-dark btn-sm" @click="manifest(d)"><ep-ico name="list" :size="16" /> Manifiesto</button>
          <button class="btn btn-primary btn-sm" v-if="d.status !== 'completed' && d.date <= today" @click="complete(d)"><ep-ico name="check" :size="16" /> Completar</button>
          <button class="btn btn-ghost btn-sm" v-if="d.status !== 'completed' && d.date >= today" @click="cancelDep(d)"><ep-ico name="x" :size="16" /> Cancelar</button>
          <a class="btn btn-soft btn-sm" target="_blank" rel="noopener" :href="share(d)"><ep-ico name="message" :size="16" /> Promover</a></div>
      </article>
    </div>
    <ep-empty v-else-if="!loading" icon="📅" :title="view === 'next' ? 'Sin salidas próximas' : 'Sin salidas pasadas'">Agrega fechas a tus excursiones para recibir reservas.</ep-empty>

    <ep-modal :open="!!man" :title="man ? man.name + ' · ' + EP.fmt.date(man.date) : ''" wide @close="man = null">
      <div v-if="man" class="stack" style="--gap:14px">
        <div class="grid g4" style="--gap:10px"><div class="mini"><span>Pasajeros</span><b>{{ man.sum.seats }}</b></div><div class="mini"><span>Abordaron</span><b>{{ man.sum.boarded }}</b></div><div class="mini"><span>Cobrado</span><b class="num">{{ EP.fmt.money(man.sum.paid) }}</b></div><div class="mini hi"><span>Por cobrar</span><b class="num">{{ EP.fmt.money(man.sum.balance) }}</b></div></div>
        <form class="row" style="gap:8px" @submit.prevent="checkin(code)"><input class="input grow" v-model.trim="code" placeholder="Folio o escanea el QR…" aria-label="Folio" /><button type="button" class="btn btn-ghost" @click="scan = true"><ep-ico name="camera" :size="20" /></button><button class="btn btn-primary">Abordar</button></form>
        <div class="table-wrap"><table class="table"><thead><tr><th>Pasajero</th><th>Pers.</th><th class="right">Pagado</th><th class="right">Saldo</th><th>Estado</th><th></th></tr></thead><tbody>
          <tr v-for="p in man.rows" :key="p.code"><td><b>{{ p.customer_name }}</b><div class="tiny muted">{{ EP.fmt.phone(p.customer_phone) }} · {{ p.code }}</div></td><td>{{ p.people }}</td><td class="right num">{{ EP.fmt.money(p.amount_paid) }}</td><td class="right num" :style="{ color: p.balance > 0 ? 'var(--bad)' : '' }">{{ EP.fmt.money(p.balance) }}</td>
            <td><ep-badge :status="p.checked_in ? 'abordado' : p.payment_status === 'paid' ? 'pagado' : 'abonado'" /></td>
            <td class="right"><button class="btn btn-soft btn-sm" v-if="!p.checked_in" @click="checkin(p.code)">Abordar</button><a v-if="p.customer_phone" class="btn btn-ghost btn-sm" target="_blank" rel="noopener" :href="EP.wa(p.customer_phone, 'Hola ' + p.customer_name + ', te esperamos en ' + man.name)">WA</a></td></tr>
          <tr v-if="!man.rows.length"><td colspan="6"><ep-empty icon="🧳">Aún no hay pasajeros.</ep-empty></td></tr></tbody></table></div>
      </div>
      <template #footer v-if="man"><button class="btn btn-ghost" @click="csv">⬇ CSV</button><button class="btn btn-primary" v-if="man.date <= today && !man.done" @click="complete(man.dep)">Completar salida</button></template>
    </ep-modal>

    <ep-modal :open="addOpen" title="Agregar fechas de salida" @close="addOpen = false">
      <div class="stack"><div class="field"><label>Excursión</label><select class="select" v-model="add.exc"><option v-for="e in exc" :key="e.id" :value="e.id">{{ e.name }}</option></select></div>
        <div class="field"><label>Fechas</label><div class="row"><input class="input" type="date" v-model="add.d" :min="today" /><button class="btn btn-ghost" @click.prevent="addDate">Agregar</button></div>
          <div class="row wrap" style="gap:6px;margin-top:8px"><span class="chip" v-for="x in add.dates" :key="x">{{ EP.fmt.date(x) }} <button style="background:none;border:0" @click="add.dates = add.dates.filter((y) => y !== x)" aria-label="Quitar">✕</button></span></div></div>
        <div class="field"><label>O repite cada semana (mismo día) durante</label><select class="select" v-model.number="add.weeks"><option :value="0">No repetir</option><option v-for="n in [4, 8, 12, 26]" :key="n" :value="n">{{ n }} semanas</option></select></div></div>
      <template #footer><button class="btn btn-ghost" @click="addOpen = false">Cancelar</button><button class="btn btn-primary" :disabled="!add.exc || (!add.dates.length)" @click="saveDates">Publicar fechas</button></template>
    </ep-modal>
    <scanner :open="scan" @close="scan = false" @code="(c) => { scan = false; checkin(c); }" />
  </div>
</template>
<script>
export default {
  components: { Scanner: EP.comp('./components/parts/Scanner.vue') },
  data() { return { EP, today: EP.today(), loading: true, d: null, provs: [], pid: 0, view: 'next', man: null, code: '', scan: false, addOpen: false, add: { exc: 0, d: '', dates: [], weeks: 0 } }; },
  computed: {
    isAdmin() { return EP.session.user.role === 'admin'; }, exc() { return this.d ? this.d.excursions : []; },
    all() { return (this.d ? this.d.departures : []).map((x) => ({ ...x, seats: Number(x.seats), capacity: Number(x.capacity), min_people: Number(x.min_people) })); },
    shown() { return this.all.filter((x) => this.view === 'next' ? (x.date >= this.today && x.status !== 'completed') : (x.date < this.today || x.status === 'completed')).sort((a, b) => this.view === 'next' ? a.date.localeCompare(b.date) : b.date.localeCompare(a.date)); }
  },
  async mounted() {
    if (this.isAdmin) { try { this.provs = (await EP.get('/r/providers?limit=200')).items; this.pid = this.provs[0] ? this.provs[0].id : 0; } catch (_) {} }
    await this.load();
    if (EP.route.query.exc && EP.route.query.date) { const d = this.all.find((x) => String(x.excursion_id) === EP.route.query.exc && x.date === EP.route.query.date); if (d) this.manifest(d); }
  },
  methods: {
    share(d) { return EP.wa('', '') && 'https://wa.me/?text=' + encodeURIComponent(`Quedan lugares para ${d.excursion_name} el ${EP.fmt.dateLong(d.date)} 🎒 Aparta con Easypoint: ${location.origin}${EP.root}website/#/excursion/${d.excursion_id}`); },
    async load() { this.loading = true; try { this.d = await EP.get('/provider/dashboard' + (this.isAdmin ? '?provider_id=' + this.pid : '')); if (this.d.excursions[0] && !this.add.exc) this.add.exc = this.d.excursions[0].id; } catch (e) { EP.err(e); this.d = null; } this.loading = false; },
    async manifest(d) {
      try { const r = await EP.get(`/provider/manifest?excursion_id=${d.excursion_id}&date=${d.date}`); this.man = { rows: r.passengers, sum: r.summary, name: d.excursion_name, date: d.date, dep: d, done: d.status === 'completed' }; } catch (e) { EP.err(e); }
    },
    async checkin(c) {
      if (!c) return;
      try { const r = await EP.post('/provider/checkin', { code: c }); EP.toast(`✓ ${r.name} (${r.people})` + (r.collect_balance ? ' · cobra saldo ' + EP.fmt.money(r.balance) : ''), r.collect_balance ? '' : 'ok', 5000); this.code = ''; await this.manifest(this.man.dep); } catch (e) { EP.err(e); }
    },
    async complete(d) {
      if (!(await EP.confirm('Se marcarán como completadas las reservas pagadas y generaremos tu liquidación (se paga en ' + (EP.config['settlement.payout_days'] || 2) + ' días).', { title: 'Completar salida', ok: 'Completar' }))) return;
      try { const r = await EP.post('/provider/complete', { excursion_id: d.excursion_id, date: d.date }); EP.toast(r.folio ? `Liquidación ${r.folio}: ${EP.fmt.money(r.net)} (fee ${EP.fmt.money(r.fee)})` : (r.note || 'Hecho'), 'ok', 7000); this.man = null; await this.load(); } catch (e) { EP.err(e); }
    },
    async cancelDep(d) {
      const why = await EP.prompt('Motivo: proveedor, clima o cupo_minimo. Los clientes reciben su abono como crédito (con bono si es por el proveedor).', { title: 'Cancelar salida', value: 'clima' });
      if (!why) return;
      try { const r = await EP.post('/provider/cancel-departure', { excursion_id: d.excursion_id, date: d.date, reason: why }); EP.toast(`Salida cancelada · ${r.bookings} reservas → ${EP.fmt.money(r.credited)} en crédito`, 'ok', 7000); await this.load(); } catch (e) { EP.err(e); }
    },
    csv() { EP.csv(this.man.rows.map((p) => ({ folio: p.code, nombre: p.customer_name, telefono: p.customer_phone, personas: p.people, pagado: p.amount_paid, saldo: p.balance, abordo: p.checked_in ? 'sí' : 'no' })), 'manifiesto-' + this.man.date + '.csv'); },
    addDate() { if (this.add.d && !this.add.dates.includes(this.add.d)) { this.add.dates.push(this.add.d); this.add.dates.sort(); } this.add.d = ''; },
    async saveDates() {
      let dates = [...this.add.dates];
      if (this.add.weeks) { const base = new Date(dates[0] + 'T00:00:00'); for (let i = 1; i <= this.add.weeks; i++) { const x = new Date(base); x.setDate(x.getDate() + 7 * i); dates.push(x.toISOString().slice(0, 10)); } }
      try { const r = await EP.post('/provider/dates', { excursion_id: this.add.exc, dates: dates.join(',') }); EP.toast(r.processed + ' fechas publicadas', 'ok'); this.addOpen = false; this.add.dates = []; await this.load(); } catch (e) { EP.err(e); }
    }
  }
};
</script>
<style scoped>
.mini { padding: 10px; border-radius: 12px; background: var(--surface-2); border: 1px solid var(--line); display: grid; } .mini span { font-size: .7rem; color: var(--muted); text-transform: uppercase; letter-spacing: .05em; } .mini b { font-size: 1.2rem; } .mini.hi { background: var(--brand-soft); border-color: transparent; }
.mark { position: absolute; top: -3px; width: 2px; height: 14px; background: var(--ink); border-radius: 2px; }
</style>
