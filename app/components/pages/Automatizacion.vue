<template>
  <div class="stack" style="--gap:18px">
    <section class="card card-pad row between wrap" style="gap:14px"><div class="stack" style="--gap:4px;max-width:62ch"><h2 class="h3">Motor de automatización</h2><p class="small muted">Corre solo cada minuto (cron del servidor): vence reservas a crédito, manda recordatorios, genera tareas por rol, vigila efectivo, SLA y riesgo. Es idempotente: ejecutarlo a mano nunca duplica nada.</p></div>
      <button class="btn btn-primary btn-lg" :class="{ 'is-loading': ticking }" @click="tick"><ep-ico name="zap" :size="20" /> Ejecutar ahora</button></section>
    <section v-if="last" class="card card-pad stack" style="--gap:8px"><b>Última ejecución manual · {{ last.at }}</b><div class="row wrap" style="gap:8px"><span class="chip" v-for="(v, k) in last.counts" :key="k">{{ k }}: <b>{{ v }}</b></span><span class="muted small" v-if="!Object.keys(last.counts).length">Sin novedades: todo estaba al día.</span></div></section>

    <section class="stack" style="--gap:12px"><div class="row between wrap"><h2 class="h3">Parámetros del negocio</h2><div class="row" style="gap:8px"><span class="small muted" v-if="dirty">{{ dirty }} cambios sin guardar</span><button class="btn btn-primary" :disabled="!dirty" :class="{ 'is-loading': busy }" @click="save">Guardar cambios</button></div></div>
      <div class="pill-tabs"><button class="chip" v-for="g in groups" :key="g" :class="{ on: grp === g }" @click="grp = g">{{ names[g] || g }}</button></div>
      <div class="grid auto-grid" style="--min:320px;--gap:12px"><div class="card card-pad stack" style="--gap:6px" v-for="r in shown" :key="r.ckey">
        <label :for="'c' + r.ckey" class="bold small">{{ r.label }}</label>
        <label v-if="isBool(r)" class="check"><input type="checkbox" :id="'c' + r.ckey" :checked="val(r) === 'true'" @change="set(r, $event.target.checked ? 'true' : 'false')" /><span>{{ val(r) === 'true' ? 'Activado' : 'Desactivado' }}</span></label>
        <select v-else-if="r.ckey === 'payments.mode'" class="select" :id="'c' + r.ckey" :value="val(r)" @change="set(r, $event.target.value)"><option v-if="EP.demo.active" value="demo">demo (pago simulado)</option><option v-else value="">sin cobro en línea</option><option value="gateway">gateway (Mercado Pago)</option><option value="manual_confirm">transferencia con confirmación</option></select>
        <input v-else class="input" :id="'c' + r.ckey" :value="val(r)" @input="set(r, $event.target.value)" />
        <code class="tiny muted">{{ r.ckey }}</code></div></div></section>

    <section class="stack" style="--gap:10px"><h2 class="h3">Tareas diferidas</h2><ep-table resource="jobs" :columns="jc" :page-size="8" empty-text="Sin tareas diferidas." /></section>
  </div>
</template>
<script>
const NAMES = { policy: 'Políticas', pricing: 'Precios', club: 'Club', referral: 'Referidos', cash: 'Efectivo', support: 'Soporte', settlement: 'Liquidaciones', payments: 'Pagos', growth: 'Crecimiento', ops: 'Operación', guides: 'Guías', econ: 'Economía', brand: 'Marca' };
export default {
  data() { return { EP, names: NAMES, rows: [], edits: {}, grp: 'policy', ticking: false, busy: false, last: null, jc: [{ key: 'created_at', label: 'Creada', fmt: 'ago' }, { key: 'kind', label: 'Tipo' }, { key: 'run_at', label: 'Corre', fmt: 'dt' }, { key: 'status', label: 'Estado' }, { key: 'attempts', label: 'Intentos', fmt: 'num' }, { key: 'last_error', label: 'Error' }] }; },
  computed: { groups() { return [...new Set(this.rows.map((r) => r.grp))]; }, shown() { return this.rows.filter((r) => r.grp === this.grp); }, dirty() { return Object.keys(this.edits).length; } },
  mounted() { this.load(); },
  methods: {
    async load() { try { this.rows = (await EP.get('/admin/config')).items; this.edits = {}; } catch (e) { EP.err(e); } },
    val(r) { return r.ckey in this.edits ? this.edits[r.ckey] : r.cvalue; }, isBool(r) { return r.cvalue === 'true' || r.cvalue === 'false'; },
    set(r, v) { if (v === r.cvalue) delete this.edits[r.ckey]; else this.edits[r.ckey] = v; this.edits = { ...this.edits }; },
    async save() { this.busy = true; try { await EP.post('/admin/config', this.edits); EP.toast('Parámetros guardados', 'ok'); await this.load(); } catch (e) { EP.err(e); } finally { this.busy = false; } },
    async tick() { this.ticking = true; try { this.last = await EP.post('/admin/tick'); EP.toast('Motor ejecutado', 'ok'); } catch (e) { EP.err(e); } finally { this.ticking = false; } }
  }
};
</script>
