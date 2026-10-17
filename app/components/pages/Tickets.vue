<template>
  <div class="stack" style="--gap:16px">
    <div class="row between wrap"><div class="seg"><button v-for="t in tabs" :key="t.k" :class="{ on: st === t.k }" @click="st = t.k; load()">{{ t.l }}</button></div><span class="small muted">SLA primera respuesta {{ EP.config['support.sla_first_response_h'] || 2 }} h · compensación máx. para soporte {{ EP.fmt.money(cap) }}</span></div>
    <ep-table ref="t" resource="tickets" :params="params" :columns="cols" clickable @row-click="open" :filters="[{ key: 'priority', label: 'Prioridad', options: ['urgent', 'high', 'normal'] }, { key: 'kind', label: 'Tipo', options: ['complaint', 'question', 'refund_request', 'other'] }]" export-name="tickets" search-placeholder="Folio, cliente, mensaje…">
      <template #cell-code="{ row }"><b class="tag-mono">{{ row.code }}</b></template>
      <template #cell-priority="{ row }"><ep-badge :status="row.priority || 'normal'" /></template>
      <template #cell-status="{ row }"><ep-badge :status="row.status" /></template>
      <template #cell-sla_due="{ row }"><span :style="{ color: breached(row) ? 'var(--bad)' : '' }" class="small">{{ row.status === 'resolved' ? '—' : EP.fmt.ago(row.sla_due) }}</span></template>
    </ep-table>
    <ep-modal :open="!!cur" :title="cur ? cur.code + ' · ' + cur.customer_name : ''" wide @close="cur = null">
      <div v-if="cur" class="grid" style="grid-template-columns:1.1fr .9fr;gap:22px" id="td">
        <div class="stack" style="--gap:12px"><div class="row wrap" style="gap:8px"><ep-badge :status="cur.priority || 'normal'" /><ep-badge :status="cur.status" /><span class="chip">{{ cur.kind }}</span></div>
          <blockquote class="msg">{{ cur.message }}</blockquote>
          <div class="small muted">Ref: {{ cur.subject_ref || '—' }} · {{ EP.fmt.phone(cur.customer_phone) }} {{ cur.customer_email }} · {{ EP.fmt.ago(cur.created_at) }}</div>
          <div class="row wrap" style="gap:8px"><a v-if="cur.customer_phone" class="btn btn-soft btn-sm" target="_blank" rel="noopener" :href="EP.wa(cur.customer_phone, 'Hola ' + (cur.customer_name || '') + ', te escribimos de Easypoint sobre tu caso ' + cur.code)" @click="respond"><ep-ico name="message" :size="16" /> Responder por WhatsApp</a><a v-if="cur.customer_email" class="btn btn-ghost btn-sm" :href="'mailto:' + cur.customer_email" @click="respond"><ep-ico name="mail" :size="16" /> Correo</a><a v-if="cur.subject_ref" class="btn btn-ghost btn-sm" :href="EP.root + 'website/#/voucher?code=' + cur.subject_ref" target="_blank" rel="noopener">Ver reserva</a></div></div>
        <div class="stack" style="--gap:12px" v-if="cur.status !== 'resolved'"><h3 class="h3">Resolver</h3>
          <div class="field"><label>¿Cómo se resolvió? *</label><textarea class="textarea" v-model="res.text" placeholder="Qué hicimos y qué le dijimos al cliente"></textarea></div>
          <div class="field"><label>Compensación en crédito (MXN)</label><input class="input" type="number" min="0" :max="isAdmin ? null : cap" v-model.number="res.comp" /><div class="help">El crédito se abona al monedero del cliente. {{ isAdmin ? '' : 'Más de ' + EP.fmt.money(cap) + ' requiere administrador.' }}</div></div>
          <div class="row wrap" style="gap:6px"><button class="chip" v-for="c in [0, 100, 200, 300]" :key="c" @click="res.comp = c">{{ c ? '$' + c : 'Sin compensación' }}</button></div>
          <button class="btn btn-primary" :disabled="res.text.length < 3" :class="{ 'is-loading': busy }" @click="resolve">Resolver y avisar al cliente</button></div>
        <div class="stack" style="--gap:8px" v-else><h3 class="h3">Resolución</h3><p>{{ cur.resolution }}</p><div class="small muted">Compensación: {{ EP.fmt.money(cur.compensation) }}</div></div>
      </div>
    </ep-modal>
  </div>
</template>
<script>
export default {
  data() { return { EP, st: 'open', cur: null, busy: false, cap: 300, res: { text: '', comp: 0 }, tabs: [{ k: 'open', l: 'Abiertos' }, { k: 'escalated', l: 'Fuera de SLA' }, { k: 'resolved', l: 'Resueltos' }, { k: '', l: 'Todos' }],
    cols: [{ key: 'code', label: 'Folio' }, { key: 'customer_name', label: 'Cliente' }, { key: 'subject_ref', label: 'Ref.' }, { key: 'priority', label: 'Prioridad' }, { key: 'status', label: 'Estado' }, { key: 'sla_due', label: 'SLA' }] }; },
  computed: { isAdmin() { return EP.session.user.role === 'admin'; }, params() { return this.st === 'open' ? { status: 'open,in_progress' } : this.st ? { status: this.st } : {}; } },
  async mounted() { if (EP.route.query.id) { try { this.open(await EP.get('/r/tickets/' + EP.route.query.id)); } catch (_) {} } },
  methods: {
    load() { this.$refs.t && this.$refs.t.reload(); }, breached(r) { return r.status !== 'resolved' && r.sla_due && new Date(r.sla_due.replace(' ', 'T') + 'Z') < new Date(); },
    open(r) { this.cur = r; this.res = { text: '', comp: 0 }; },
    async respond() { try { await EP.post(`/admin/tickets/${this.cur.id}/respond`); } catch (_) {} },
    async resolve() { this.busy = true; try { await EP.post(`/admin/tickets/${this.cur.id}/resolve`, { resolution: this.res.text, compensation: this.res.comp || 0 }); EP.toast('Caso resuelto y cliente avisado', 'ok'); this.cur = null; this.load(); } catch (e) { EP.err(e); } finally { this.busy = false; } }
  }
};
</script>
<style scoped>
.msg { margin: 0; padding: 14px 16px; border-left: 4px solid var(--brand-2); background: var(--surface-2); border-radius: 0 var(--r-sm) var(--r-sm) 0; }
@media (max-width: 860px) { #td { grid-template-columns: 1fr !important; } }
</style>
