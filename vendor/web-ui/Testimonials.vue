<template>
  <section class="ui-testimonials">
    <div v-if="heading" class="ui-testimonials__head">
      <h2 class="ui-testimonials__heading">{{ heading }}</h2>
    </div>

    <div class="ui-testimonials__grid">
      <figure
        v-for="(item, i) in normalized"
        :key="item.name + '-' + i"
        class="ui-testimonials__card"
      >
        <span class="ui-testimonials__mark" aria-hidden="true">&#8220;</span>
        <blockquote class="ui-testimonials__quote">{{ item.quote }}</blockquote>
        <figcaption v-if="item.name || item.role" class="ui-testimonials__by">
          <span class="ui-testimonials__avatar" aria-hidden="true">{{ initials(item.name) }}</span>
          <span class="ui-testimonials__who">
            <strong v-if="item.name" class="ui-testimonials__name">{{ item.name }}</strong>
            <span v-if="item.role" class="ui-testimonials__role">{{ item.role }}</span>
          </span>
        </figcaption>
      </figure>
    </div>
  </section>
</template>

<script>
export default {
  name: 'Testimonials',
  props: {
    items: { type: Array, default: () => [] },
    heading: { type: String, default: '' }
  },
  computed: {
    normalized() {
      if (!Array.isArray(this.items)) return [];
      return this.items.map(it => ({
        quote: it.quote || '',
        name: it.name || '',
        role: it.role || ''
      }));
    }
  },
  methods: {
    initials(name) {
      const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
      if (!parts.length) return '—';
      const first = parts[0].charAt(0);
      const last = parts.length > 1 ? parts[parts.length - 1].charAt(0) : '';
      return (first + last).toUpperCase();
    }
  }
};
</script>

<style scoped>
.ui-testimonials {
  font-family: inherit;
  color: var(--text-color, #f8fafc);
}

.ui-testimonials__head {
  text-align: center;
  margin-bottom: 2.5rem;
}

.ui-testimonials__heading {
  font-size: clamp(1.5rem, 3vw, 2.2rem);
  font-weight: 800;
  margin: 0;
  letter-spacing: -0.02em;
}

.ui-testimonials__grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1.5rem;
}

.ui-testimonials__card {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  background: var(--bg-alt-color, rgba(255, 255, 255, 0.03));
  border: 1px solid var(--border-color, rgba(255, 255, 255, 0.12));
  border-radius: 16px;
  padding: 2rem 1.75rem 1.75rem;
  margin: 0;
  overflow: hidden;
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), border-color 0.3s ease;
}

.ui-testimonials__card:hover {
  transform: translateY(-4px);
  border-color: var(--accent-color, #38bdf8);
}

.ui-testimonials__mark {
  position: absolute;
  top: 0.4rem;
  left: 1.25rem;
  font-size: 4rem;
  line-height: 1;
  font-family: Georgia, 'Times New Roman', serif;
  color: var(--accent-color, #38bdf8);
  opacity: 0.22;
  pointer-events: none;
}

.ui-testimonials__quote {
  position: relative;
  z-index: 1;
  font-size: 1.05rem;
  line-height: 1.6;
  margin: 0;
  flex: 1 1 auto;
}

.ui-testimonials__by {
  display: flex;
  align-items: center;
  gap: 0.85rem;
}

.ui-testimonials__avatar {
  flex: 0 0 auto;
  width: 42px;
  height: 42px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  font-size: 0.85rem;
  font-weight: 700;
  background: var(--accent-color, #38bdf8);
  color: #03070f;
}

.ui-testimonials__who {
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
}

.ui-testimonials__name {
  font-size: 0.98rem;
  font-weight: 700;
}

.ui-testimonials__role {
  font-size: 0.8rem;
  color: var(--muted-color, rgba(248, 250, 252, 0.65));
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

@media (max-width: 560px) {
  .ui-testimonials__grid { grid-template-columns: 1fr; }
}

@media (prefers-reduced-motion: reduce) {
  .ui-testimonials__card { transition: none; }
  .ui-testimonials__card:hover { transform: none; }
}
</style>
