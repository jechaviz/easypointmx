<template>
  <section class="ui-gallery">
    <div class="ui-gallery__head" v-if="heading || subheading">
      <p v-if="kicker" class="ui-gallery__kicker">{{ kicker }}</p>
      <h2 v-if="heading" class="ui-gallery__heading">{{ heading }}</h2>
      <p v-if="subheading" class="ui-gallery__sub">{{ subheading }}</p>
    </div>

    <div
      v-if="items.length"
      class="ui-gallery__grid"
      :style="{ '--ui-gallery-cols': columns }"
    >
      <button
        v-for="(item, i) in items"
        :key="item.src + '-' + i"
        type="button"
        class="ui-gallery__cell"
        :style="cellStyle(item)"
        :aria-label="item.title || item.caption || ('Open image ' + (i + 1))"
        @click="openAt(i)"
      >
        <img
          class="ui-gallery__img"
          :src="item.src"
          :alt="item.title || item.caption || ''"
          loading="lazy"
        />
        <span class="ui-gallery__overlay">
          <span v-if="item.tag" class="ui-gallery__tag">{{ item.tag }}</span>
          <span v-if="item.title" class="ui-gallery__title">{{ item.title }}</span>
          <span class="ui-gallery__zoom" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="20" height="20">
              <circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" stroke-width="2"/>
              <path d="M16 16l5 5M11 8v6M8 11h6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
          </span>
        </span>
      </button>
    </div>

    <p v-else class="ui-gallery__empty">No images to display yet.</p>

    <Lightbox
      :items="items"
      :open="lightboxOpen"
      :start-index="activeIndex"
      :label="heading || 'Image gallery'"
      @close="lightboxOpen = false"
    />
  </section>
</template>

<script>
const load = p => Vue.defineAsyncComponent(() => window['vue3-sfc-loader'].loadModule(p, window.sfcOptions));

export default {
  name: 'Gallery',
  components: {
    Lightbox: load('/src/lib/Lightbox.vue')
  },
  props: {
    items: { type: Array, default: () => [] },
    heading: { type: String, default: '' },
    subheading: { type: String, default: '' },
    kicker: { type: String, default: '' },
    columns: { type: Number, default: 3 }
  },
  data() {
    return {
      lightboxOpen: false,
      activeIndex: 0
    };
  },
  methods: {
    openAt(i) {
      this.activeIndex = i;
      this.lightboxOpen = true;
    },
    cellStyle(item) {
      // Aspect ratio drives a justified/masonry feel; defaults to 4:3 when unknown.
      const w = Number(item.w) || 4;
      const h = Number(item.h) || 3;
      return { '--ui-cell-ratio': (w / h).toFixed(4) };
    }
  }
};
</script>

<style scoped>
.ui-gallery {
  font-family: inherit;
  color: var(--text-color, #f8fafc);
}

.ui-gallery__head {
  text-align: center;
  margin-bottom: 2.5rem;
}

.ui-gallery__kicker {
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.2em;
  font-weight: 700;
  color: var(--accent-color, #38bdf8);
  margin: 0 0 0.75rem;
}

.ui-gallery__heading {
  font-size: clamp(1.6rem, 3vw, 2.4rem);
  font-weight: 800;
  letter-spacing: -0.02em;
  margin: 0 0 0.75rem;
}

.ui-gallery__sub {
  max-width: 620px;
  margin: 0 auto;
  font-size: 1.05rem;
  line-height: 1.6;
  color: var(--muted-color, rgba(248, 250, 252, 0.7));
}

.ui-gallery__grid {
  display: grid;
  grid-template-columns: repeat(var(--ui-gallery-cols, 3), 1fr);
  gap: 1rem;
}

.ui-gallery__cell {
  position: relative;
  display: block;
  padding: 0;
  margin: 0;
  border: 1px solid var(--border-color, rgba(255, 255, 255, 0.12));
  border-radius: 14px;
  overflow: hidden;
  cursor: pointer;
  background: var(--bg-alt-color, #0f172a);
  aspect-ratio: var(--ui-cell-ratio, 1.3333);
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), border-color 0.3s ease, box-shadow 0.3s ease;
}

.ui-gallery__cell:hover,
.ui-gallery__cell:focus-visible {
  transform: translateY(-4px);
  border-color: var(--accent-color, #38bdf8);
  box-shadow: 0 18px 40px rgba(0, 0, 0, 0.35);
  outline: none;
}

.ui-gallery__img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  transition: transform 0.45s cubic-bezier(0.4, 0, 0.2, 1);
}

.ui-gallery__cell:hover .ui-gallery__img {
  transform: scale(1.06);
}

.ui-gallery__overlay {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  gap: 0.35rem;
  padding: 1rem;
  text-align: left;
  color: #fff;
  background: linear-gradient(to top, rgba(3, 7, 18, 0.82) 0%, rgba(3, 7, 18, 0.05) 55%, transparent 100%);
  opacity: 0;
  transition: opacity 0.3s ease;
}

.ui-gallery__cell:hover .ui-gallery__overlay,
.ui-gallery__cell:focus-visible .ui-gallery__overlay {
  opacity: 1;
}

.ui-gallery__tag {
  font-size: 0.65rem;
  text-transform: uppercase;
  letter-spacing: 0.15em;
  font-weight: 700;
  color: var(--accent-color, #38bdf8);
}

.ui-gallery__title {
  font-size: 0.95rem;
  font-weight: 700;
  line-height: 1.3;
}

.ui-gallery__zoom {
  position: absolute;
  top: 0.75rem;
  right: 0.75rem;
  width: 38px;
  height: 38px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.14);
  border: 1px solid rgba(255, 255, 255, 0.25);
  color: #fff;
}

.ui-gallery__empty {
  text-align: center;
  color: var(--muted-color, rgba(248, 250, 252, 0.6));
  padding: 2rem 0;
}

@media (max-width: 900px) {
  .ui-gallery__grid { grid-template-columns: repeat(2, 1fr); }
}

@media (max-width: 560px) {
  .ui-gallery__grid { grid-template-columns: 1fr; }
}

@media (prefers-reduced-motion: reduce) {
  .ui-gallery__cell,
  .ui-gallery__img,
  .ui-gallery__overlay { transition: none; }
  .ui-gallery__cell:hover { transform: none; }
  .ui-gallery__cell:hover .ui-gallery__img { transform: none; }
}
</style>
