<template>
  <div class="stack" style="--gap:16px">
    <div class="row between wrap"><div class="seg"><button v-for="t in tabs" :key="t.k" :class="{ on: st === t.k }" @click="st = t.k; load()">{{ t.l }} <span class="chip" style="margin-left:4px" v-if="counts[t.k] != null">{{ counts[t.k] }}</span></button></div>
      <button v-if="st === 'manual' && items.length" class="btn btn-primary" @click="next"><ep-ico name="message" :size="18" /> Enviar siguiente ({{ items.length }})</button></div>
    <div class="callout small"><ep-ico name="zap" :size="18" /><div>El motor genera estos mensajes solo (recordatorios, avisos de crédito, reseñas…). Cuando no hay API de WhatsApp conectada, quedan aquí para enviarse con <b>un clic</b>: se abre el chat con el texto listo.</div></div>
    <div class="grid auto-grid" style="--min:340px;--gap:12px" v-if="st === 'manual'">
      <article v-for="m in items" :key="m.id" class="card card-pad stack" style="--gap:8px"><div class="row between"><b>{{ m.to_name || EP.fmt.phone(m.recipient) }}</b><span class="chip">{{ label(m.template) }}</span></div><div class="small muted">{{ EP.fmt.phone(m.recipient) }} · {{ EP.fmt.ago(m.created_at) }}</div><p class="small msg">{{ m.body }}</p>
        <div class="row" style="gap:8px"><a class="btn btn-soft btn-sm" :href="m.link" target="_blank" rel="noopener" @click="mark(m)"><ep-ico name="message" :size="16" /> Enviar por WhatsApp</a><button class="btn btn-ghost btn-sm" @click="mark(m, 'skipped')">Descartar</button></div></article>
    </div>
    <ep-table v-else ref="t" resource="outbox" :params="{ status: st }" :columns="cols" export-name="bandeja" search-placeholder="Destinatario, plantilla, asunto…"><template #cell-status="{ row }"><ep-badge :status="row.status" /></template><template #cell-channel="{ row }"><span class="chip">{{ row.channel }}</span></template></ep-table>
    <ep-empty v-if="st === 'manual' && !items.length && !loading" icon="📭" title="Bandeja vacía">No hay mensajes por enviar a mano.</ep-empty>
  </div>
</template>
<script>
const L = { booking_received: 'Reserva', nudge_unpaid: 'Empujón', final_reminder: 'Último aviso', expired_to_credit: 'Vencida→crédito', voucher_ready: 'Víspera', review_request: 'Reseña', referral_reward: 'Premio', credit_expiring: 'Crédito por vencer', credit_expired: 'Crédito vencido', winback: 'Recuperación', departure_cancelled: 'Salida cancelada', ticket_received: 'Ticket', ticket_resolved: 'Resuelto', club_welcome: 'Club', raw: 'Aviso' };
export default {
  data() { return { EP, st: 'manual', items: [], counts: {}, loading: true, tabs: [{ k: 'manual', l: 'Por enviar' }, { k: 'queued', l: 'En cola' }, { k: 'sent', l: 'Enviados' }, { k: 'failed', l: 'Fallidos' }, { k: 'skipped', l: 'Omitidos' }],
    cols: [{ key: 'created_at', label: 'Fecha', fmt: 'dt' }, { key: 'channel', label: 'Canal' }, { key: 'recipient', label: 'Destino' }, { key: 'template', label: 'Plantilla' }, { key: 'subject', label: 'Asunto' }, { key: 'status', label: 'Estado' }] }; },
  mounted() { this.load(); },
  methods: {
    label(t) { return L[t] || t; },
    async load() { this.loading = true; try { if (this.st === 'manual') { const r = await EP.get('/r/outbox?status=manual&limit=100&sort=id'); this.items = r.items; this.counts.manual = r.total; } for (const t of this.tabs) if (t.k !== this.st) EP.get('/r/outbox?limit=1&status=' + t.k).then((x) => { this.counts[t.k] = x.total; }); } catch (e) { EP.err(e); } this.loading = false; },
    async mark(m, st = 'sent') { try { await EP.put('/r/outbox/' + m.id, { status: st }); this.items = this.items.filter((x) => x.id !== m.id); this.counts.manual = Math.max(0, (this.counts.manual || 1) - 1); } catch (e) { EP.err(e); } },
    next() { const m = this.items[0]; if (m) { window.open(m.link, '_blank'); this.mark(m); } }
  }
};
</script>
<style scoped>
.callout { display: flex; gap: 12px; padding: 12px 14px; border-radius: var(--r-sm); background: var(--brand-soft); } .msg { padding: 10px 12px; background: var(--surface-2); border-radius: 12px; white-space: pre-wrap; }
</style>
