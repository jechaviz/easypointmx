<template>
  <div class="stack" style="--gap:16px">
    <div class="grid auto-grid" style="--min:170px;--gap:12px" v-if="seg.length"><button v-for="s in seg" :key="s.k" class="kpi segbtn" :data-tone="s.tone" :class="{ on: filter === s.k }" @click="filter = filter === s.k ? '' : s.k"><div class="l">{{ s.l }}</div><div class="v num">{{ s.n }}</div><div class="h">{{ s.h }}</div></button></div>
    <ep-table ref="t" resource="customers" :params="filter ? { segment: filter } : {}" :columns="cols" clickable @row-click="cur = $event" export-name="clientes" search-placeholder="Nombre, teléfono, correo, código…">
      <template #cell-name="{ row }"><div class="row" style="gap:10px"><span class="av">{{ EP.fmt.initials(row.name) }}</span><div><b>{{ row.name || '—' }}</b><div class="tiny muted">{{ EP.fmt.phone(row.phone) }}</div></div></div></template>
      <template #cell-tier="{ row }"><span class="chip" :class="{ on: row.tier === 'club' }">{{ row.tier === 'club' ? 'Club' : 'Base' }}</span></template>
      <template #cell-segment="{ row }"><ep-badge :status="row.segment" /></template>
    </ep-table>
    <ep-modal :open="!!cur" :title="cur ? cur.name || cur.phone : ''" @close="cur = null">
      <div v-if="cur" class="stack"><div class="grid g2" style="--gap:10px"><div class="mini"><span>Viajes</span><b>{{ cur.trips }}</b></div><div class="mini"><span>Gasto total</span><b class="num">{{ EP.fmt.money(cur.lifetime_spend) }}</b></div><div class="mini"><span>Código</span><b class="tag-mono">{{ cur.referral_code }}</b></div><div class="mini"><span>Última visita</span><b>{{ EP.fmt.ago(cur.last_seen) }}</b></div></div>
        <div class="small muted">Fuente: {{ cur.source || '—' }} · referido por {{ cur.referred_by || 'nadie' }} · {{ cur.tier === 'club' ? 'Club hasta ' + cur.club_until : 'Sin membresía' }}</div>
        <div class="row wrap" style="gap:8px"><a class="btn btn-soft" target="_blank" rel="noopener" :href="EP.wa(cur.phone, 'Hola ' + (cur.name || '') + ', somos de Easypoint 🎒')"><ep-ico name="message" :size="18" /> WhatsApp</a><a v-if="cur.email" class="btn btn-ghost" :href="'mailto:' + cur.email"><ep-ico name="mail" :size="18" /> Correo</a></div></div>
    </ep-modal>
  </div>
</template>
<script>
export default {
  data() { return { EP, filter: '', cur: null, seg: [], cols: [{ key: 'name', label: 'Cliente' }, { key: 'trips', label: 'Viajes', fmt: 'num', align: 'right' }, { key: 'lifetime_spend', label: 'Gasto', fmt: 'money', align: 'right' }, { key: 'tier', label: 'Plan' }, { key: 'segment', label: 'Segmento' }, { key: 'last_seen', label: 'Visto', fmt: 'ago' }] }; },
  async mounted() {
    try {
      const all = (await EP.get('/r/customers?limit=500')).items; const c = (k) => all.filter((x) => x.segment === k).length;
      this.seg = [{ k: 'nuevo', l: 'Nuevos', n: c('nuevo'), h: 'sin viaje aún', tone: 'info' }, { k: 'primer_viaje', l: 'Primer viaje', n: c('primer_viaje'), h: 'a convertir en recurrentes', tone: 'ok' }, { k: 'recurrente', l: 'Recurrentes', n: c('recurrente'), h: '2+ viajes', tone: 'ok' }, { k: 'vip', l: 'VIP', n: c('vip'), h: '3+ viajes o $8k+', tone: 'ok' }, { k: 'dormido', l: 'Dormidos', n: c('dormido'), h: 'recuperación automática', tone: 'warn' }, { k: 'en_riesgo', l: 'En riesgo', n: c('en_riesgo'), h: 'recurrentes inactivos', tone: 'bad' }];
    } catch (_) {}
  }
};
</script>
<style scoped>
.segbtn { text-align: left; cursor: pointer; transition: transform .15s, box-shadow .15s; } .segbtn:hover { transform: translateY(-2px); } .segbtn.on { box-shadow: 0 0 0 3px color-mix(in srgb, var(--brand) 40%, transparent); }
.av { width: 34px; height: 34px; border-radius: 50%; background: var(--brand-soft); color: var(--brand-3); display: grid; place-items: center; font-weight: 800; font-size: .78rem; }
.mini { padding: 10px; border-radius: 12px; background: var(--surface-2); border: 1px solid var(--line); display: grid; } .mini span { font-size: .7rem; color: var(--muted); text-transform: uppercase; } .mini b { font-size: 1.1rem; }
</style>
