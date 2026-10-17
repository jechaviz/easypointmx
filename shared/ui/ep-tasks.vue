<template>
  <div class="stack" style="--gap:10px">
    <ep-empty v-if="!tasks.length" icon="✅" title="Todo al día">No tienes tareas pendientes. El motor te avisará cuando haya algo que hacer.</ep-empty>
    <article v-for="t in tasks" :key="t.id" class="task card" :data-p="t.priority">
      <div class="grow">
        <div class="row wrap" style="gap:8px">
          <ep-badge :status="t.priority" />
          <span class="tiny muted" v-if="t.due_at">vence {{ EP.fmt.ago(t.due_at) }}</span>
        </div>
        <div class="bold mt-1">{{ t.title }}</div>
        <div class="small muted" v-if="t.detail">{{ t.detail }}</div>
      </div>
      <div class="row wrap" style="gap:8px">
        <a v-if="t.action === 'whatsapp' && t.payload" class="btn btn-soft btn-sm" :href="t.payload" target="_blank" rel="noopener">💬 WhatsApp</a>
        <button v-else-if="t.action && actions[t.action]" class="btn btn-primary btn-sm" @click="$emit('action', t)">{{ actions[t.action] }}</button>
        <button class="btn btn-ghost btn-sm" @click="done(t)" :aria-label="'Marcar hecha: ' + t.title">Hecho</button>
      </div>
    </article>
  </div>
</template>
<script>
export default {
  props: { tasks: { type: Array, default: () => [] } },
  emits: ['action', 'changed'],
  data() {
    return {
      EP,
      actions: { collect_cash: 'Recolectar', close_corte: 'Cerrar corte', open_manifest: 'Ver manifiesto', complete_departure: 'Marcar completada', open_ticket: 'Abrir ticket', pay_settlement: 'Pagar', generate_guide: 'Generar guía', departure_risk: 'Decidir', flash_promo: 'Crear promo', confirm_transfer: 'Confirmar', confirm_club: 'Confirmar' }
    };
  },
  methods: {
    async done(t) {
      try { await EP.put('/tasks/' + t.id, { status: 'done' }); this.$emit('changed'); } catch (e) { EP.err(e); }
    }
  }
};
</script>
<style scoped>
.task { padding: 14px 16px; display: flex; gap: 14px; align-items: center; border-left: 4px solid var(--line-2); flex-wrap: wrap; }
.task[data-p="urgent"] { border-left-color: var(--bad); } .task[data-p="high"] { border-left-color: var(--warn); } .task[data-p="normal"] { border-left-color: var(--info); }
</style>
