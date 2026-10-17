<template>
  <div class="stack" style="--gap:16px">
    <div class="row between wrap"><div class="seg"><button v-for="t in tabs" :key="t.k" :class="{ on: st === t.k }" @click="st = t.k; load()">{{ t.l }} <span class="chip" style="margin-left:4px">{{ counts[t.k] || 0 }}</span></button></div>
      <p class="small muted">Ordenados por calidad de la solicitud. Los vencidos (SLA {{ EP.config['ops.application_sla_h'] || 24 }} h) salen primero.</p></div>
    <div class="grid auto-grid" style="--min:340px;--gap:14px">
      <article v-for="a in list" :key="a.id" class="card card-pad stack" style="--gap:10px">
        <div class="row between"><div><b class="h3">{{ a.business_name }}</b><div class="small muted">{{ a.contact_name }} · {{ EP.fmt.phone(a.contact_phone) }}</div></div><div class="score" :class="a.score >= 70 ? 'hi' : a.score >= 40 ? 'mid' : 'lo'" :title="'Calidad de la solicitud'">{{ a.score }}</div></div>
        <div class="small">{{ a.address || 'Sin dirección' }}</div>
        <div class="small muted" v-if="a.description">{{ a.description }}</div>
        <div class="row wrap tiny" style="gap:6px"><span class="chip">{{ { point: 'Punto', proveedor: 'Proveedor' }[a.kind] || a.kind }}</span><span class="chip" v-if="a.horarios">{{ a.horarios }}</span><span class="chip" :class="{ 'b-bad': late(a) }" v-if="a.status === 'pending'">SLA {{ EP.fmt.ago(a.sla_due) }}</span><span class="chip" v-if="a.utm">UTM</span></div>
        <div class="row wrap" style="gap:8px" v-if="a.status === 'pending'"><a class="btn btn-soft btn-sm" target="_blank" rel="noopener" :href="EP.wa(a.whatsapp || a.contact_phone, 'Hola, recibimos la solicitud de ' + a.business_name + ' para ser punto Easypoint. ¿Platicamos?')"><ep-ico name="message" :size="16" /> Contactar</a><button class="btn btn-primary btn-sm" @click="approve(a)">Aprobar</button><button class="btn btn-ghost btn-sm" @click="reject(a)">Rechazar</button></div>
        <div class="tiny muted" v-else>{{ a.status === 'approved' ? 'Aprobada · punto #' + a.point_id : 'Rechazada' }}</div>
      </article>
    </div>
    <ep-empty v-if="!list.length && !loading" icon="🏪" title="Sin solicitudes aquí">Cuando alguien solicite ser punto, aparecerá en esta lista.</ep-empty>
    <ep-modal :open="!!result" title="Punto creado" @close="result = null"><div v-if="result" class="stack"><p>Se creó el punto y su cuenta de operador.</p><div class="card card-pad" v-if="result.temp_password"><div class="tiny muted">Contraseña temporal (se muestra una sola vez)</div><div class="row between"><b class="tag-mono" style="font-size:1.2rem">{{ result.temp_password }}</b><button class="btn btn-ghost btn-sm" @click="EP.copy(result.temp_password)">Copiar</button></div></div><p class="small muted" v-else>No se creó usuario porque no había correo válido.</p></div><template #footer><button class="btn btn-primary" @click="result = null">Listo</button></template></ep-modal>
  </div>
</template>
<script>
export default {
  data() { return { EP, st: 'pending', list: [], counts: {}, loading: true, result: null, tabs: [{ k: 'pending', l: 'Por contactar' }, { k: 'approved', l: 'Aprobadas' }, { k: 'rejected', l: 'Rechazadas' }] }; },
  mounted() { this.load(); },
  methods: {
    late(a) { return a.sla_due && new Date(a.sla_due.replace(' ', 'T') + 'Z') < new Date(); },
    async load() { this.loading = true; try { const r = await EP.get('/r/applications?limit=200&status=' + this.st); this.list = r.items.sort((a, b) => (this.late(b) - this.late(a)) || b.score - a.score); this.counts[this.st] = r.total; for (const t of this.tabs) if (t.k !== this.st) EP.get('/r/applications?limit=1&status=' + t.k).then((x) => { this.counts[t.k] = x.total; }); } catch (e) { EP.err(e); } this.loading = false; },
    async approve(a) { if (!(await EP.confirm(`Se creará el punto "${a.business_name}" y su usuario operador.`, { ok: 'Aprobar y crear' }))) return; try { this.result = await EP.post(`/admin/applications/${a.id}/approve`); this.load(); } catch (e) { EP.err(e); } },
    async reject(a) { const n = await EP.prompt('Motivo (se guarda como nota interna)', { title: 'Rechazar solicitud', ok: 'Rechazar' }); if (n === null) return; try { await EP.post(`/admin/applications/${a.id}/reject`, { note: n }); this.load(); } catch (e) { EP.err(e); } }
  }
};
</script>
<style scoped>
.score { width: 46px; height: 46px; border-radius: 50%; display: grid; place-items: center; font-weight: 900; border: 3px solid var(--line-2); } .score.hi { border-color: var(--ok); color: var(--ok); } .score.mid { border-color: var(--warn); color: #b45309; } .score.lo { border-color: var(--bad); color: var(--bad); }
</style>
