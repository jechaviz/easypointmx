<template>
  <div class="stack" style="--gap:16px">
    <div class="row between wrap"><div class="seg"><button :class="{ on: view === 'board' }" @click="view = 'board'"><ep-ico name="grid" :size="14" /> Tablero</button><button :class="{ on: view === 'table' }" @click="view = 'table'"><ep-ico name="list" :size="14" /> Tabla</button></div>
      <div class="row" style="gap:8px" v-if="view === 'board'"><input class="input" style="width:240px" type="search" v-model.trim="q" placeholder="Filtrar tablero…" aria-label="Filtrar" /><button class="btn btn-ghost btn-sm" @click="load"><ep-ico name="refresh" :size="16" /></button></div></div>

    <div v-if="view === 'board'" class="board">
      <section v-for="c in cols" :key="c.k" class="col"><header><b>{{ c.l }}</b><span class="chip">{{ by(c.k).length }}</span><span class="tiny muted num">{{ EP.fmt.money(sum(c.k)) }}</span></header>
        <div class="cards"><article v-for="b in by(c.k)" :key="b.id" class="card bcard" @click="show(b)" tabindex="0" @keyup.enter="show(b)">
          <b class="small">{{ b.customer_name }}</b><div class="tiny muted">{{ b.excursion_name }}</div>
          <div class="row between tiny" style="margin-top:6px"><span>{{ EP.fmt.date(b.excursion_date) }}</span><span class="num bold">{{ EP.fmt.money(b.amount_paid) }}/{{ EP.fmt.money(b.total) }}</span></div>
          <div class="progress" style="height:5px;margin-top:6px"><i :style="{ width: Math.min(100, b.total ? b.amount_paid / b.total * 100 : 0) + '%' }"></i></div></article>
          <div v-if="!by(c.k).length" class="tiny muted center" style="padding:14px">—</div></div></section>
    </div>

    <ep-table v-else resource="bookings" :columns="tcols" clickable @row-click="show" export-name="reservas" search-placeholder="Folio, nombre, teléfono…"
      :filters="[{ key: 'stage', label: 'Etapa', options: cols.map((c) => ({ value: c.k, label: c.l })) }, { key: 'status', label: 'Estado', options: ['new', 'confirmed', 'completed', 'cancelled'] }]">
      <template #cell-code="{ row }"><b class="tag-mono">{{ row.code }}</b></template>
      <template #cell-stage="{ row }"><ep-badge :status="row.stage" /></template>
    </ep-table>

    <ep-modal :open="!!cur" :title="cur ? cur.code : ''" wide @close="cur = null">
      <div v-if="cur" class="grid" style="grid-template-columns:1.2fr .8fr;gap:22px" id="rd">
        <div class="stack" style="--gap:14px"><div class="row between wrap"><div><b class="h3">{{ cur.customer_name }}</b><div class="small muted">{{ EP.fmt.phone(cur.customer_phone) }} · {{ cur.customer_email }}</div></div><ep-badge :status="cur.stage" /></div>
          <div class="card card-pad stack" style="--gap:6px"><b>{{ cur.excursion_name }}</b><span class="small muted">{{ EP.fmt.dateLong(cur.excursion_date) }} · {{ cur.people }} personas</span>
            <div class="grid g3 mt-1" style="--gap:8px"><div class="mini"><span>Total</span><b class="num">{{ EP.fmt.money(cur.total) }}</b></div><div class="mini"><span>Pagado</span><b class="num">{{ EP.fmt.money(cur.amount_paid) }}</b></div><div class="mini hi"><span>Saldo</span><b class="num">{{ EP.fmt.money(cur.balance) }}</b></div></div>
            <div class="row wrap small" style="gap:8px;margin-top:6px"><span class="chip" v-if="cur.protect"><ep-ico name="shield" :size="12" /> Protege</span><span class="chip" v-if="cur.promo_code">Promo {{ cur.promo_code }}</span><span class="chip" v-if="cur.referral_code_used">Ref. {{ cur.referral_code_used }}</span><span class="chip" v-if="cur.discount > 0">Desc. {{ EP.fmt.money(cur.discount) }}</span><span class="chip" v-if="cur.rating">★ {{ cur.rating }}</span></div></div>
          <div class="row wrap" style="gap:8px"><a v-if="cur.customer_phone" class="btn btn-soft btn-sm" target="_blank" rel="noopener" :href="EP.wa(cur.customer_phone, 'Hola ' + cur.customer_name + ', te escribimos de Easypoint sobre tu reserva ' + cur.code)"><ep-ico name="message" :size="16" /> WhatsApp</a><a class="btn btn-ghost btn-sm" :href="EP.root + 'website/#/voucher?code=' + cur.code" target="_blank" rel="noopener">Ver voucher</a>
            <button class="btn btn-ghost btn-sm" v-if="cur.review_text" @click="EP.toast(cur.review_text, '', 8000)">Ver reseña</button></div>
        </div>
        <div class="stack" style="--gap:8px"><h3 class="h3">Línea de tiempo</h3><ol class="tl"><li v-for="e in events" :key="e.id"><b>{{ EP.status(e.to_state).text }}</b><span class="tiny muted">{{ EP.fmt.dt(e.created_at) }} · {{ e.actor }}</span><span class="tiny" v-if="e.note">{{ e.note }}</span></li></ol><div v-if="!events.length" class="small muted">Sin movimientos.</div></div>
      </div>
    </ep-modal>
  </div>
</template>
<script>
export default {
  data() { return { EP, view: 'board', rows: [], q: '', cur: null, events: [],
    cols: [{ k: 'reservado', l: 'Reservado' }, { k: 'abonado', l: 'Abonado' }, { k: 'pagado', l: 'Pagado' }, { k: 'abordado', l: 'Abordó' }, { k: 'completado', l: 'Completado' }, { k: 'credito', l: 'A crédito' }],
    tcols: [{ key: 'code', label: 'Folio' }, { key: 'customer_name', label: 'Cliente' }, { key: 'excursion_name', label: 'Excursión' }, { key: 'excursion_date', label: 'Fecha', fmt: 'date' }, { key: 'total', label: 'Total', fmt: 'money', align: 'right' }, { key: 'balance', label: 'Saldo', fmt: 'money', align: 'right' }, { key: 'stage', label: 'Etapa' }] }; },
  mounted() { this.load(); },
  methods: {
    async load() { try { this.rows = (await EP.get('/r/bookings?limit=400&sort=-id')).items; } catch (e) { EP.err(e); } },
    by(k) { const q = this.q.toLowerCase(); return this.rows.filter((b) => b.stage === k && (!q || (b.customer_name + b.code + b.excursion_name).toLowerCase().includes(q))); },
    sum(k) { return this.by(k).reduce((a, b) => a + Number(b.total), 0); },
    async show(b) { this.cur = b; this.events = []; try { this.events = (await EP.get('/r/events?entity=booking&entity_id=' + b.id + '&sort=id&limit=100')).items; } catch (_) {} }
  }
};
</script>
<style scoped>
.board { display: grid; grid-auto-flow: column; grid-auto-columns: minmax(250px, 1fr); gap: 14px; overflow-x: auto; padding-bottom: 8px; align-items: start; }
.col { background: var(--bg-2); border-radius: var(--r); padding: 12px; min-height: 200px; } .col header { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; } .col header .num { margin-left: auto; }
.cards { display: grid; gap: 10px; max-height: 68vh; overflow: auto; }
.bcard { padding: 12px; cursor: pointer; transition: transform .15s, box-shadow .15s; } .bcard:hover { transform: translateY(-2px); box-shadow: var(--shadow-2); }
.mini { padding: 10px; border-radius: 12px; background: var(--surface-2); border: 1px solid var(--line); display: grid; } .mini span { font-size: .7rem; color: var(--muted); text-transform: uppercase; } .mini b { font-size: 1.1rem; } .mini.hi { background: var(--brand-soft); border-color: transparent; }
.tl { list-style: none; margin: 0; padding: 0; display: grid; gap: 12px; } .tl li { display: grid; padding-left: 16px; position: relative; } .tl li::before { content: ''; position: absolute; left: 0; top: .5em; width: 8px; height: 8px; border-radius: 50%; background: var(--brand-2); }
@media (max-width: 860px) { #rd { grid-template-columns: 1fr !important; } }
</style>
