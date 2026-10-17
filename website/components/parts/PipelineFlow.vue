<template>
  <div class="flow">
    <div class="line" aria-hidden="true"><i class="token"></i></div>
    <ol class="steps">
      <li v-for="(s, i) in steps" :key="s.t" :class="{ on: i === cur }" @mouseenter="cur = i" @click="cur = i" tabindex="0" @focus="cur = i">
        <span class="ic"><ep-ico :name="s.i" :size="26" /></span>
        <b>{{ s.t }}</b>
        <span class="tiny muted">{{ s.s }}</span>
      </li>
    </ol>
    <div class="explain card card-pad" aria-live="polite">
      <div class="kicker">{{ steps[cur].t }}</div>
      <p style="margin-top:6px">{{ steps[cur].d }}</p>
    </div>
  </div>
</template>
<script>
export default {
  data() {
    return {
      cur: 0,
      steps: [
        { i: 'user', t: 'Tú', s: 'apartas o pagas', d: 'Apartas tu lugar con un abono (desde $100 en muchas experiencias) en línea o en efectivo en tu punto. Ves tu saldo y tu voucher con QR en todo momento.' },
        { i: 'store', t: 'Tu punto', s: 'recibe y registra', d: 'El negocio de tu barrio registra tu abono al instante. Tú recibes confirmación y él gana una comisión por cada operación.' },
        { i: 'truck', t: 'Chofer', s: 'recolecta', d: 'Los choferes pasan por los puntos con una ruta optimizada: recogen el efectivo neto de la comisión y lo registran. Hay límites de efectivo y alertas automáticas.' },
        { i: 'shield', t: 'Easypoint', s: 'custodia', d: 'Tu dinero queda en custodia hasta que la experiencia se realiza. Si algo cambia, lo abonado no se pierde: se convierte en crédito para otra salida.' },
        { i: 'mountain', t: 'Proveedor', s: 'cobra al completar', d: 'Cuando la salida se marca como completada, liquidamos al proveedor su parte en un par de días. Todos ganan cuando la experiencia sale bien.' }
      ]
    };
  },
  mounted() { this._t = setInterval(() => { if (!this.hold) this.cur = (this.cur + 1) % this.steps.length; }, 3800); },
  beforeUnmount() { clearInterval(this._t); }
};
</script>
<style scoped>
.flow { position: relative; }
.steps { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(5, 1fr); gap: 12px; position: relative; z-index: 1; }
.steps li { display: grid; justify-items: center; text-align: center; gap: 4px; padding: 10px 6px; border-radius: var(--r); cursor: pointer; transition: background .2s, transform .2s var(--ease); outline-offset: 2px; }
.steps li:hover { transform: translateY(-3px); }
.steps li.on { background: var(--surface); box-shadow: var(--shadow-2); }
.ic { width: 62px; height: 62px; border-radius: 20px; display: grid; place-items: center; background: var(--bg-2); color: var(--ink-2); transition: all .3s var(--ease); }
.on .ic { background: var(--brand); color: var(--on-brand); transform: scale(1.1) rotate(-4deg); box-shadow: 0 10px 24px color-mix(in srgb, var(--brand) 50%, transparent); }
.line { position: absolute; left: 10%; right: 10%; top: 41px; height: 3px; background: repeating-linear-gradient(90deg, var(--line-2) 0 8px, transparent 8px 16px); z-index: 0; }
.token { position: absolute; top: -7px; width: 16px; height: 16px; border-radius: 50%; background: radial-gradient(circle at 35% 30%, #fde68a, #f59e0b); box-shadow: 0 0 18px #f59e0b; animation: run 7.5s linear infinite; }
@keyframes run { 0% { left: 0; opacity: 0 } 6% { opacity: 1 } 94% { opacity: 1 } 100% { left: calc(100% - 16px); opacity: 0 } }
.explain { margin-top: 22px; min-height: 108px; }
@media (max-width: 720px) { .steps { grid-template-columns: repeat(5, minmax(86px, 1fr)); overflow-x: auto; } .line { display: none; } }
</style>
