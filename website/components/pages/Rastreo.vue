<template>
  <div class="container section" style="max-width:820px">
    <div class="stack" style="--gap:10px"><span class="kicker">Rastreo</span><h1 class="h2">¿Dónde está mi paquete?</h1><p class="lead">Escribe tu número de rastreo. Si el paquete ya está en un punto Easypoint te decimos cuál y su horario.</p></div>
    <form class="card card-pad row wrap mt-3" style="gap:12px" @submit.prevent="search">
      <div class="field grow" style="min-width:220px"><label for="c">Número de rastreo</label><input id="c" class="input" v-model.trim="code" placeholder="Ej. EPK7M2QX" autocomplete="off" /></div>
      <button class="btn btn-primary" style="align-self:end" :class="{ 'is-loading': busy }">Rastrear</button>
    </form>
    <div class="mt-3" v-if="s">
      <article class="card card-pad stack" style="--gap:18px">
        <div class="row between wrap"><div><div class="tiny muted">Paquete</div><div class="h3 tag-mono" style="background:none;padding:0">{{ s.tracking_id }}</div></div><ep-badge :status="s.status" /></div>
        <ol class="track">
          <li v-for="(st, i) in steps" :key="st.k" :class="{ done: i <= idx, cur: i === idx }"><span class="n"><ep-ico :name="st.i" :size="18" /></span><div><b>{{ st.l }}</b><div class="tiny muted">{{ st.d }}</div></div></li>
        </ol>
        <div class="callout" v-if="s.status === 'at_point' && s.point_name"><ep-ico name="pin" :size="22" /><div><b>Recógelo en {{ s.point_name }}</b><div class="small">{{ s.point_address }}</div><div class="small muted" v-if="s.point_hours">Horario: {{ s.point_hours }}</div><a v-if="s.point_maps" :href="s.point_maps" target="_blank" rel="noopener" class="link small">Cómo llegar →</a></div></div>
        <div class="tiny muted">Actualizado {{ EP.fmt.ago(s.updated_at) }}</div>
      </article>
      <form class="card card-pad row wrap mt-2" style="gap:12px" @submit.prevent="alertMe" v-if="s.status !== 'delivered'">
        <div class="grow stack" style="--gap:2px"><b>Avísame cuando cambie</b><span class="small muted">Te mandamos un correo en cada movimiento.</span></div>
        <input class="input" style="max-width:260px" type="email" v-model.trim="email" placeholder="tucorreo@ejemplo.com" aria-label="Correo para alertas" /><button class="btn btn-dark">Activar alerta</button>
      </form>
    </div>
    <ep-empty v-else-if="searched && !busy" icon="🔎" title="No encontramos ese número">Revisa que esté completo. Si lo compraste hace poco, puede tardar unas horas en registrarse. <a class="link" :href="EP.href('/ayuda')">Escríbenos</a>.</ep-empty>
  </div>
</template>
<script>
export default {
  data() { return { EP, code: EP.route.query.code || '', s: null, busy: false, searched: false, email: '',
    steps: [{ k: 'pending', l: 'Registrado', i: 'file', d: 'Easypoint ya tiene tu envío' }, { k: 'in_transit', l: 'En camino', i: 'truck', d: 'Va rumbo a tu punto' }, { k: 'at_point', l: 'Listo para recoger', i: 'store', d: 'Ya está en tu punto' }, { k: 'delivered', l: 'Entregado', i: 'check', d: 'Lo recibiste' }] }; },
  computed: { idx() { return this.s ? Math.max(0, this.steps.findIndex((x) => x.k === this.s.status)) : 0; } },
  mounted() { if (this.code) this.search(); },
  methods: {
    async search() {
      if (!this.code) return; this.busy = true; this.s = null; this.searched = true;
      try { this.s = await EP.get('/public/track/' + encodeURIComponent(this.code), { auth: false }); } catch (e) { if (e.status !== 404) EP.err(e); } finally { this.busy = false; }
    },
    async alertMe() { try { await EP.post('/public/track', { tracking_id: this.s.tracking_id, email: this.email }); EP.toast('Listo, te avisaremos por correo', 'ok'); this.email = ''; } catch (e) { EP.err(e); } }
  }
};
</script>
<style scoped>
.track { list-style: none; margin: 0; padding: 0; display: grid; gap: 4px; } .track li { display: flex; gap: 14px; align-items: center; padding: 10px 0; opacity: .5; position: relative; } .track li.done { opacity: 1; }
.track li:not(:last-child)::after { content: ''; position: absolute; left: 19px; top: 46px; bottom: -8px; width: 2px; background: var(--line-2); } .track li.done:not(.cur):not(:last-child)::after { background: var(--brand-2); }
.n { width: 40px; height: 40px; border-radius: 50%; display: grid; place-items: center; background: var(--bg-2); flex: none; } .done .n { background: var(--brand); color: var(--on-brand); } .cur .n { box-shadow: 0 0 0 6px color-mix(in srgb, var(--brand) 30%, transparent); }
.callout { display: flex; gap: 14px; padding: 16px; border-radius: var(--r); background: var(--brand-soft); } .callout svg { color: var(--brand-3); flex: none; }
</style>
