<template>
  <a :href="EP.href('/excursion/' + e.id)" class="card card-hover exc" :aria-label="e.name">
    <ep-cover :seed="e.id" :tags="e.tags" :name="e.name" :image="e.image_url" ratio="16 / 11" style="border-radius:var(--r) var(--r) 0 0">
      <div class="top">
        <span class="chip glass" v-if="e.featured"><ep-ico name="sparkles" :size="13" /> Favorita</span>
        <span class="chip glass" v-if="low"><ep-ico name="zap" :size="13" /> Últimos {{ low }} lugares</span>
      </div>
      <div class="bot">
        <span class="chip glass">{{ e.destination }}</span>
        <span class="chip glass" v-if="e.rating_count"><ep-ico name="star" :size="13" /> {{ Number(e.rating_avg).toFixed(1) }}</span>
      </div>
    </ep-cover>
    <div class="body">
      <h3 class="h3">{{ e.name }}</h3>
      <div class="row small muted" style="gap:14px"><span><ep-ico name="clock" :size="14" /> {{ e.duration }}</span><span v-if="next"><ep-ico name="calendar" :size="14" /> {{ EP.fmt.date(next.date) }}</span></div>
      <div class="row between" style="margin-top:12px">
        <div><div class="tiny muted">desde</div><div class="price num">{{ EP.fmt.money(e.price) }}<span class="tiny muted"> / persona</span></div></div>
        <div class="apart" v-if="e.deposit_amount"><ep-ico name="wallet" :size="14" /> Aparta con {{ EP.fmt.money(e.deposit_amount) }}</div>
      </div>
    </div>
  </a>
</template>
<script>
export default {
  props: { e: { type: Object, required: true } },
  data() { return { EP }; },
  computed: {
    next() { return (this.e.departures || []).find((d) => !d.soldOut) || null; },
    low() { const d = this.next; return d && d.remaining != null && d.remaining > 0 && d.remaining <= 4 ? d.remaining : 0; }
  }
};
</script>
<style scoped>
.exc { display: block; overflow: hidden; }
.top, .bot { position: absolute; left: 12px; right: 12px; display: flex; gap: 6px; flex-wrap: wrap; }
.top { top: 12px; } .bot { bottom: 12px; justify-content: space-between; }
.chip.glass { color: #fff; background: rgba(8, 12, 22, .45); border-color: rgba(255,255,255,.2); backdrop-filter: blur(10px); }
.body { padding: 16px 18px 18px; display: grid; gap: 6px; }
.price { font-size: 1.5rem; font-weight: 900; letter-spacing: -.03em; }
.apart { font-size: .78rem; font-weight: 700; color: var(--brand-3); background: var(--brand-soft); padding: 6px 10px; border-radius: 999px; }
</style>
