<template>
  <section class="ui-timeline">
    <div v-if="heading" class="ui-timeline__head">
      <h2 class="ui-timeline__heading">{{ heading }}</h2>
    </div>

    <ol class="ui-timeline__list">
      <li
        v-for="(item, i) in normalized"
        :key="item.year + '-' + i"
        class="ui-timeline__item"
      >
        <span class="ui-timeline__dot" aria-hidden="true"></span>
        <div class="ui-timeline__content">
          <span v-if="item.year" class="ui-timeline__year">{{ item.year }}</span>
          <h3 v-if="item.title" class="ui-timeline__title">{{ item.title }}</h3>
          <p v-if="item.note" class="ui-timeline__note">{{ item.note }}</p>
        </div>
      </li>
    </ol>
  </section>
</template>

<script>
export default {
  name: 'Timeline',
  props: {
    items: { type: Array, default: () => [] },
    heading: { type: String, default: '' }
  },
  computed: {
    normalized() {
      if (!Array.isArray(this.items)) return [];
      return this.items.map(it => ({
        year: it.year != null ? String(it.year) : '',
        title: it.title || '',
        note: it.note || ''
      }));
    }
  }
};
</script>

<style scoped>
.ui-timeline {
  font-family: inherit;
  color: var(--text-color, #f8fafc);
}

.ui-timeline__head {
  text-align: center;
  margin-bottom: 2.5rem;
}

.ui-timeline__heading {
  font-size: clamp(1.5rem, 3vw, 2.2rem);
  font-weight: 800;
  margin: 0;
  letter-spacing: -0.02em;
}

.ui-timeline__list {
  list-style: none;
  margin: 0 auto;
  padding: 0;
  max-width: 760px;
  position: relative;
}

/* the vertical spine */
.ui-timeline__list::before {
  content: '';
  position: absolute;
  top: 6px;
  bottom: 6px;
  left: 11px;
  width: 2px;
  background: var(--border-color, rgba(255, 255, 255, 0.18));
}

.ui-timeline__item {
  position: relative;
  padding: 0 0 2rem 3rem;
}

.ui-timeline__item:last-child {
  padding-bottom: 0;
}

.ui-timeline__dot {
  position: absolute;
  left: 4px;
  top: 4px;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: var(--bg-color, #03070f);
  border: 3px solid var(--accent-color, #38bdf8);
  box-shadow: 0 0 0 4px var(--bg-alt-color, rgba(255, 255, 255, 0.04));
}

.ui-timeline__content {
  background: var(--bg-alt-color, rgba(255, 255, 255, 0.03));
  border: 1px solid var(--border-color, rgba(255, 255, 255, 0.12));
  border-radius: 14px;
  padding: 1.25rem 1.5rem;
  transition: border-color 0.3s ease, transform 0.3s ease;
}

.ui-timeline__item:hover .ui-timeline__content {
  border-color: var(--accent-color, #38bdf8);
  transform: translateX(3px);
}

.ui-timeline__year {
  display: inline-block;
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--accent-color, #38bdf8);
  margin-bottom: 0.35rem;
}

.ui-timeline__title {
  font-size: 1.15rem;
  font-weight: 700;
  margin: 0 0 0.35rem;
  letter-spacing: -0.01em;
}

.ui-timeline__note {
  font-size: 0.95rem;
  line-height: 1.55;
  margin: 0;
  color: var(--muted-color, rgba(248, 250, 252, 0.72));
}

@media (max-width: 560px) {
  .ui-timeline__item { padding-left: 2.5rem; }
}

@media (prefers-reduced-motion: reduce) {
  .ui-timeline__content { transition: none; }
  .ui-timeline__item:hover .ui-timeline__content { transform: none; }
}
</style>
