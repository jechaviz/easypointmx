<template>
  <div class="stack" style="--gap:18px">
    <div class="callout small"><ep-ico name="sparkles" :size="18" /><div>Planificador de campañas (growth-kit): genera un calendario multicanal con <b>enlaces medibles (UTM) por publicación</b>. No publica nada solo: tú revisas y exportas a CSV, calendario (.ics) o Markdown.</div></div>
    <div class="grid" style="grid-template-columns:380px 1fr;gap:20px;align-items:start" id="cp">
      <form class="card card-pad stack" style="--gap:12px" @submit.prevent="build">
        <div class="field"><label>Objetivo</label><div class="seg" style="flex-wrap:wrap"><button type="button" v-for="o in objectives" :key="o.k" :class="{ on: obj === o.k }" @click="pickObj(o)">{{ o.l }}</button></div></div>
        <div class="field"><label>Público</label><input class="input" v-model.trim="f.audience" /></div>
        <div class="field"><label>Oferta</label><input class="input" v-model.trim="f.offer" /></div>
        <div class="field"><label>Enlace de destino</label><input class="input" v-model.trim="f.url" /></div>
        <div class="grid g3" style="--gap:10px"><div class="field"><label>Semanas</label><input class="input" type="number" min="1" max="12" v-model.number="f.weeks" /></div><div class="field"><label>Posts/semana</label><input class="input" type="number" min="1" max="7" v-model.number="f.postsPerWeek" /></div><div class="field"><label>Inicio</label><input class="input" type="date" v-model="f.startDate" /></div></div>
        <div class="field"><label>Canales</label><div class="row wrap" style="gap:6px"><button type="button" class="chip" v-for="(c, k) in channels" :key="k" :class="{ on: f.channels.includes(k) }" @click="toggle(k)">{{ c.label }}</button></div></div>
        <div class="field"><label>WhatsApp (para difusión)</label><input class="input" v-model.trim="f.whatsapp" placeholder="5214421000000" /></div>
        <div class="error" v-if="error">{{ error }}</div>
        <button class="btn btn-primary" :class="{ 'is-loading': busy }">Generar plan</button>
      </form>
      <section class="stack" style="--gap:12px">
        <ep-empty v-if="!plan" icon="🗓️" title="Aún no hay plan">Elige objetivo, canales y semanas, y genera el calendario.</ep-empty>
        <template v-else>
          <div class="row between wrap"><div><b class="h3">{{ summary }}</b><div class="small muted"><span :style="{ color: issues.length ? 'var(--bad)' : 'var(--ok)' }">{{ issues.length ? issues.length + ' observaciones' : '✓ Plan limpio: sin duplicados, límites respetados y todos los enlaces medibles' }}</span></div></div>
            <div class="row wrap" style="gap:8px"><button class="btn btn-ghost btn-sm" @click="dl('csv')">⬇ CSV</button><button class="btn btn-ghost btn-sm" @click="dl('ics')">⬇ Calendario</button><button class="btn btn-ghost btn-sm" @click="dl('md')">⬇ Markdown</button></div></div>
          <div class="grid auto-grid" style="--min:300px;--gap:10px"><article class="card card-pad stack" style="--gap:6px" v-for="p in plan.posts.slice(0, 24)" :key="p.id"><div class="row between"><span class="chip">{{ channels[p.channel].label }}</span><span class="tiny muted">{{ p.date }} {{ p.time }}</span></div><div class="row wrap tiny" style="gap:6px"><span class="badge b-brand">{{ phase(p.phase) }}</span><span class="badge b-mute">{{ pillar(p.pillar) }}</span></div><p class="small" style="white-space:pre-line">{{ p.copy }}</p><div class="row" style="gap:6px"><button class="btn btn-ghost btn-sm" @click="EP.copy(p.copy)">Copiar texto</button><a class="btn btn-ghost btn-sm" v-if="p.channel === 'whatsapp'" :href="p.link" target="_blank" rel="noopener">Abrir</a></div></article></div>
          <p class="tiny muted" v-if="note">{{ note }}</p>
        </template>
      </section>
    </div>
  </div>
</template>
<script>
export default {
  data() {
    const base = location.origin + EP.root + 'website/';
    return { EP, busy: false, error: '', plan: null, issues: [], obj: 'excursiones', objectives: [
      { k: 'excursiones', l: 'Llenar excursiones', audience: 'viajeros de Querétaro que quieren escapadas de fin de semana', offer: 'reservar excursiones apartando con un abono pequeño', url: base + '#/excursiones' },
      { k: 'puntos', l: 'Afiliar puntos', audience: 'dueños de papelerías, tiendas y cafeterías', offer: 'convertir su local en un punto Easypoint que gana comisión', url: base + '#/afiliate' },
      { k: 'club', l: 'Vender Club', audience: 'viajeros frecuentes', offer: 'ahorrar con cashback y descuentos del Easypoint Club', url: base + '#/club' },
      { k: 'envios', l: 'Envíos', audience: 'emprendedores que envían paquetes', offer: 'enviar con DHL y Estafeta sin filas desde un punto Easypoint', url: base + '#/envia' }], channels: {},
      f: { brand: 'Easypoint', audience: '', offer: '', url: '', weeks: 4, postsPerWeek: 3, startDate: new Date(Date.now() + 864e5).toISOString().slice(0, 10), channels: ['whatsapp', 'facebook', 'instagram'], lang: 'es', whatsapp: String(EP.config['brand.whatsapp'] || ''), campaign: 'easypoint' } };
  },
  computed: { summary() { return this.plan ? EP.gk.describePlan(this.plan) : ''; }, note() { return this.plan ? EP.gk.previewNote(this.plan, 24) : ''; } },
  created() { this.channels = EP.gk ? EP.gk.CHANNELS : {}; this.pickObj(this.objectives[0]); },
  methods: {
    pickObj(o) { this.obj = o.k; this.f.audience = o.audience; this.f.offer = o.offer; this.f.url = o.url; this.f.campaign = 'easypoint-' + o.k; },
    toggle(k) { const i = this.f.channels.indexOf(k); if (i >= 0) this.f.channels.splice(i, 1); else this.f.channels.push(k); },
    phase(p) { return EP.gk.PHASE_LABELS.es[p]; }, pillar(p) { return EP.gk.PILLAR_LABELS.es[p]; },
    build() { this.error = ''; this.busy = true; try { this.plan = EP.gk.buildCampaignPlan({ ...this.f, tagline: 'Tu ciudad, a un punto de distancia' }); this.issues = EP.gk.validatePlan(this.plan); } catch (e) { this.error = e.message; this.plan = null; } this.busy = false; },
    dl(kind) {
      const m = { csv: [EP.gk.toCsv(this.plan), 'text/csv', 'csv'], ics: [EP.gk.toIcs(this.plan), 'text/calendar', 'ics'], md: [EP.gk.toMarkdown(this.plan), 'text/markdown', 'md'] }[kind];
      const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([kind === 'csv' ? '﻿' + m[0] : m[0]], { type: m[1] + ';charset=utf-8' })); a.download = `campana-${this.f.campaign}.${m[2]}`; a.click();
    }
  }
};
</script>
<style scoped>.callout { display: flex; gap: 12px; padding: 12px 14px; border-radius: var(--r-sm); background: var(--brand-soft); } @media (max-width: 960px) { #cp { grid-template-columns: 1fr !important; } }</style>
