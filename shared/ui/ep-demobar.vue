<template>
  <div v-if="EP.demo.active" class="demobar" role="status">
    <span class="tag">DEMO</span>
    <span class="txt">Datos ficticios · pagos simulados · aislado del negocio real</span>
    <button class="btn btn-sm btn-ghost" :class="{ 'is-loading': busy }" @click="reset" title="Vuelve a sembrar los datos de ejemplo">Reiniciar</button>
    <a class="btn btn-sm btn-ghost" :href="EP.root + 'demo/'">Cuentas</a>
    <button class="btn btn-sm btn-dark" @click="out">Salir</button>
  </div>
</template>
<script>
export default {
  data() { return { EP, busy: false }; },
  methods: {
    async reset() {
      if (!(await EP.confirm('Se borran los movimientos de la demostración y se regeneran los datos de ejemplo. ¿Continuar?', { ok: 'Reiniciar demo', danger: true }))) return;
      this.busy = true;
      try { await EP.demoReset(); EP.toast('Demostración reiniciada', 'ok'); location.href = EP.root + 'demo/'; } catch (e) { EP.err(e); } finally { this.busy = false; }
    },
    async out() { if (await EP.confirm('¿Salir de la demostración?', { ok: 'Salir' })) EP.demoExit(); }
  }
};
</script>
<style>
.demobar { position: fixed; z-index: 90; left: 50%; bottom: 14px; transform: translateX(-50%); display: flex; align-items: center; gap: 8px; max-width: calc(100vw - 20px); padding: 6px 8px 6px 12px; border-radius: 99px; background: color-mix(in srgb, var(--surface) 92%, transparent); backdrop-filter: blur(14px); border: 1px solid var(--line-2); box-shadow: var(--shadow-3); font-size: .78rem; }
.demobar .tag { background: var(--brand); color: var(--on-brand); font-weight: 900; letter-spacing: .08em; border-radius: 99px; padding: 2px 9px; font-size: .68rem; }
.demobar .txt { color: var(--ink-2); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
@media (max-width: 860px) { .demobar { bottom: 78px; } .demobar .txt { display: none; } }
</style>
