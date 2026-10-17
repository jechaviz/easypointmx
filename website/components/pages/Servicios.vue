<template>
  <div>
    <section class="top"><div class="container stack" style="--gap:12px"><span class="kicker">Servicios</span><h1 class="h1" style="font-size:clamp(2.2rem,5vw,3.6rem)">Tu punto hace mucho más que paquetes</h1>
      <p class="lead">Pagos, recargas, seguros, boletos, impresiones y servicios para negocios, con atención humana a la vuelta de tu casa.</p></div></section>
    <section class="container">
      <div class="pill-tabs"><button class="chip" :class="{ on: !cat }" @click="cat = ''">Todos</button><button v-for="c in cats" :key="c" class="chip" :class="{ on: cat === c }" @click="cat = c">{{ label(c) }}</button></div>
      <div class="grid auto-grid mt-3" style="--min:280px;--gap:16px">
        <article v-for="s in shown" :key="s.id" class="card card-hover card-pad stack" style="--gap:8px"><span class="fi"><ep-ico :name="icon(s)" :size="24" /></span><b class="h3">{{ s.name }}</b><p class="small muted">{{ s.description }}</p><span class="chip" style="width:fit-content">{{ label(s.category) }}</span></article>
      </div>
      <ep-empty v-if="!shown.length && !loading" icon="🧩" title="Pronto habrá más">Estamos sumando servicios a la red.</ep-empty>
    </section>
    <section class="section"><div class="container"><div class="card card-pad row between wrap" style="gap:18px;background:linear-gradient(120deg,var(--brand-soft),var(--surface))"><div class="stack" style="--gap:4px"><b class="h3">Cada servicio es ingreso para tu local</b><span class="muted">Como punto Easypoint ganas comisión por cada venta, sin inventario ni inversión.</span></div><a :href="EP.href('/afiliate')" class="btn btn-dark">Quiero ser punto</a></div></div></section>
  </div>
</template>
<script>
export default {
  data() {
    return { EP, loading: true, items: [], cat: '', L: { pagos: 'Pagos', recargas: 'Recargas', seguros: 'Seguros', boletos: 'Boletos', impresion: 'Impresión', sim: 'SIM', devoluciones: 'Devoluciones', remesas: 'Remesas', certificados: 'Certificados', publicidad: 'Publicidad', marketplace: 'Marketplace', farmacia: 'Farmacia', locker: 'Locker', reciclaje: 'Reciclaje', productos_locales: 'Productos locales', b2b: 'Para negocios', otros: 'Otros' },
      I: { receipt: 'cash', phone: 'phone', 'shield-check': 'shield', 'ticket-perforated': 'ticket', printer: 'file', sim: 'phone', 'arrow-return-left': 'refresh', 'cash-stack': 'cash', 'patch-check': 'check', megaphone: 'message', 'box-seam': 'package', capsule: 'heart', safe2: 'lock', 'bag-heart': 'gift', 'file-earmark-text': 'file', 'credit-card-2-back': 'wallet', globe: 'globe' } };
  },
  computed: { cats() { return [...new Set(this.items.map((s) => s.category))]; }, shown() { return this.items.filter((s) => !this.cat || s.category === this.cat); } },
  async mounted() { try { this.items = await EP.get('/public/services'); } catch (e) { EP.err(e); } this.loading = false; },
  methods: { label(c) { return this.L[c] || EP.fmt.cap(c); }, icon(s) { return this.I[s.icon] || 'sparkles'; } }
};
</script>
<style scoped>
.top { padding: 56px 0 24px; background: radial-gradient(800px 260px at 15% 0%, color-mix(in srgb, var(--info) 18%, transparent), transparent 65%); }
.fi { width: 48px; height: 48px; border-radius: 16px; display: grid; place-items: center; background: var(--brand-soft); color: var(--brand-3); }
</style>
